'use strict';

// test/adr-0046-wiring.test.js -- ADR-0046 P0 implementation-round wiring lock.
// The gate must compile, pass the real pin, and fail the resolve-then-pin
// mismatch path through the executable CLI.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const instrument = require('../src/instrument-identity');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function makeTree(tamper) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0046-'));
  for (const rel of [
    'docs/gates.json',
    'scripts/instrument.js',
    'src/evidence-log.js',
    'src/file-lock.js',
    'src/instrument-identity.js',
    'src/instrument-identity.json',
    'src/instrument-state.json',
    'src/reverify-schedule.js',
    'scripts/reverify.js',
    'src/shared/capability.js',
    'src/shared/prefix-vocab.js',
    'src/shared/paths.js',
    'src/SKILL.md',
  ]) {
    const target = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), target);
  }
  fs.mkdirSync(path.join(tmp, '.git'), { recursive: true });
  if (tamper) fs.appendFileSync(path.join(tmp, 'src', 'SKILL.md'), '\n<!-- instrument drift tamper -->\n', 'utf8');
  return tmp;
}

describe('ADR-0046 identity pin', () => {
  test('the real source resolves to the committed immutable triple', () => {
    const pin = instrument.loadPin(ROOT);
    const resolved = instrument.resolveInstrumentIdentity(ROOT);
    expect(instrument.verifyPin(resolved, pin).ok).toBe(true);
    expect(resolved.rules_version).toBe('critic-v1');
    expect(resolved.triple_hash).toHaveLength(64);
  });

  test('each identity axis mismatch is named and fails closed', () => {
    const pin = instrument.loadPin(ROOT);
    const resolved = instrument.resolveInstrumentIdentity(ROOT);
    const bad = Object.assign({}, resolved, { rules_digest: '0'.repeat(64) });
    expect(instrument.verifyPin(bad, pin).mismatches).toContain('rules');
  });

  test('inference config mismatch is named', () => {
    const pin = instrument.loadPin(ROOT);
    const resolved = instrument.resolveInstrumentIdentity(ROOT);
    const bad = Object.assign({}, resolved, { inference_config_hash: '0'.repeat(64) });
    expect(instrument.verifyPin(bad, pin).mismatches).toContain('inference-config');
  });
});

describe('ADR-0046 quarantine state machine', () => {
  test('the committed state chain is valid and starts authoritative', () => {
    const state = instrument.loadState(ROOT);
    expect(instrument.verifyState(state).valid).toBe(true);
    expect(state.state).toBe('authoritative');
  });

  test('identity-change, sign-off, and rollback follow the two-state contract', () => {
    const state = instrument.loadState(ROOT);
    const q = instrument.transition(state, {
      type: 'identity-change',
      identity_digest: 'a'.repeat(64),
    });
    expect(q.state).toBe('quarantined');
    expect(instrument.verifyState(q).valid).toBe(true);

    const approved = instrument.transition(q, {
      type: 'signoff',
      identity_digest: 'a'.repeat(64),
      reviewer_id: 'reviewer-a',
      reverify_ledger_hash: 'b'.repeat(64),
      bias_probe_hash: 'c'.repeat(64),
    });
    expect(approved.state).toBe('authoritative');
    expect(approved.authoritative_identity_digest).toBe('a'.repeat(64));

    const q2 = instrument.transition(approved, {
      type: 'identity-change',
      identity_digest: 'd'.repeat(64),
    });
    const rolled = instrument.transition(q2, { type: 'rollback' });
    expect(rolled.state).toBe('authoritative');
    expect(rolled.authoritative_identity_digest).toBe('a'.repeat(64));
    expect(instrument.verifyState(rolled).valid).toBe(true);
  });

  test('sign-off refuses a fingerprint that does not match quarantine', () => {
    const state = instrument.loadState(ROOT);
    const q = instrument.transition(state, { type: 'identity-change', identity_digest: 'e'.repeat(64) });
    expect(() => instrument.transition(q, {
      type: 'signoff',
      identity_digest: 'f'.repeat(64),
      reviewer_id: 'reviewer-a',
      reverify_ledger_hash: 'b'.repeat(64),
      bias_probe_hash: 'c'.repeat(64),
    })).toThrow(/fingerprint/);
  });
});

describe('ADR-0046 executable wiring', () => {
  test('instrument-identity is a confirmatory functional gate at order 105', () => {
    const e = registry.entries.find(x => x.name === 'instrument-identity');
    expect(e).toBeTruthy();
    expect(e.order).toBe(105);
    expect(e.tier).toBe('confirmatory');
    expect(e.command).toBe('node scripts/instrument.js --check');
    expect(e.requires).toEqual(['repo-tree']);
    expect(typeof e.source_adr).toBe('string');
    expect(e.source_adr.length).toBeGreaterThan(0);
    expect(pkg.scripts['instrument:gate']).toBe('node scripts/instrument.js --check');
  });

  test('the real repo passes the live CLI', () => {
    const r = spawnSync(process.execPath, ['scripts/instrument.js', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: path.join(os.tmpdir(), 'jh-0046-real') }),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('identity pinned and authoritative');
  });

  test('tampered source fails resolve-then-pin through the live CLI', () => {
    const tmp = makeTree(true);
    const r = spawnSync(process.execPath, ['scripts/instrument.js', '--check'], {
      cwd: tmp,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: tmp }),
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('resolve-then-pin mismatch');
  });

  test('quarantine records a pin-mismatching identity instead of deadlocking', () => {
    const tmp = makeTree(true);
    const r = spawnSync(process.execPath, ['scripts/instrument.js', '--quarantine'], {
      cwd: tmp,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: tmp }),
    });
    expect(r.status).toBe(0);
    const state = JSON.parse(fs.readFileSync(path.join(tmp, 'src', 'instrument-state.json'), 'utf8'));
    expect(state.state).toBe('quarantined');
    expect(instrument.verifyState(state).valid).toBe(true);
  });

  test('signoff without required arguments emits the usage prefix', () => {
    const r = spawnSync(process.execPath, ['scripts/instrument.js', '--signoff'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: path.join(os.tmpdir(), 'jh-0046-real') }),
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('[usage]:');
  });
});
