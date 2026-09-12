'use strict';

// test/adr-0060-wiring.test.js -- ADR-0060 wiring assertions (ADR-0031 D1:
// every wiring-touching ADR ships its own executable wiring test).
// Covers D-A (sampling-plan power min_n), D-B (indeterminate conformity),
// D-C (conditional certification axis + fail-closed expiry),
// D-D (CAPA / spec limit not loosened), D-E (sign-off guard by conformity).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const reverify = require('../scripts/reverify');
const instrument = require('../src/instrument-identity');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const ADR = path.join(ROOT, 'docs', 'adr', '0060-judge-conformity-sampling-power-indeterminate-state-and-conditional-certification.md');
const ADR39 = path.join(ROOT, 'docs', 'adr', '0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md');
const LEDGER = path.join(ROOT, 'bench', 'polygraph', 'reverify-ledger.json');

function metrics(n, overrides) {
  return { invocations: n, need_override: n, overrides_accepted: overrides, override_rate: overrides / n, fail_soft: 0, stale: 0, per_entry: [] };
}

const CLI_ENV = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: os.tmpdir() });
function cli(args) { return spawnSync(process.execPath, ['scripts/instrument.js'].concat(args), { cwd: ROOT, encoding: 'utf8', env: CLI_ENV }); }

describe('ADR-0060 document + distribution anchors', () => {
  test('the ADR records all five decisions and the min_n anchor', () => {
    const t = fs.readFileSync(ADR, 'utf8');
    for (const id of ['D-A', 'D-B', 'D-C', 'D-D', 'D-E']) expect(t).toContain('### ' + id);
    expect(t).toContain('min_n');
    expect(t).toContain('indeterminate');
    expect(t).toContain('certification_mode');
    expect(t).toContain('90 days by default');
  });

  test('ADR-0039 D3 recompute is recorded; CONTEXT.md stays in the tarball (D1 unchanged)', () => {
    const adr39 = fs.readFileSync(ADR39, 'utf8');
    expect(adr39).toContain('out.size < 253,999 bytes');
    expect(pkg.files).toContain('CONTEXT.md');
    expect(pkg.files).not.toContain('jiahao-mcp/');
  });

  test('the three ADR-0060 deferred work items are registered', () => {
    for (const id of ['defer-0032', 'defer-0033', 'defer-0034']) {
      const e = registry.entries.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e.source_adr).toContain('0060');
      expect(e.status).toBe('pending-evaluation');
    }
  });
});

describe('ADR-0060 D-A/D-B: sampling-plan power and indeterminate conformity', () => {
  const rule = reverify.defaultDecisionRule(0.1);

  test('min_n is pre-registered and the spec limit is NOT loosened (D-D)', () => {
    expect(rule.min_n).toBe(100);
    expect(rule.version).toBe('0060.1');
    expect(rule.spec_limit).toBe(0.1);
  });

  test('below min_n the statement is indeterminate, never fail', () => {
    const r = reverify.evaluateConformity(3 / 22, [0.029055851, 0.349122097], rule, 22);
    expect(r.result).toBe('indeterminate');
    expect(r.min_n).toBe(100);
    expect(r.n).toBe(22);
  });

  test('an unknown sample size fails closed (no silent bypass of D-A)', () => {
    expect(reverify.evaluateConformity(0.05, [0.02, 0.08], rule).result).toBe('indeterminate');
  });

  test('at/above min_n the guarded acceptance statement applies unchanged', () => {
    expect(reverify.evaluateConformity(0.05, [0.02, 0.08], rule, 100).result).toBe('pass');
    expect(reverify.evaluateConformity(0.09, [0.02, 0.08], rule, 100).result).toBe('conditional');
    expect(reverify.evaluateConformity(0.2, [0.02, 0.08], rule, 100).result).toBe('fail');
  });

  test('conclude maps indeterminate only when no hard finding is present', () => {
    expect(reverify.conclude(metrics(22, 3), 22, null, 'indeterminate').conclusion).toBe('indeterminate');
    expect(reverify.conclude(Object.assign(metrics(22, 3), { fail_soft: 1 }), 22, null, 'indeterminate').conclusion).toBe('fail');
  });

  test('the run key covers the rule version (a rule change appends a row)', () => {
    const m = metrics(22, 3);
    const a = reverify.runKey(m, '2026-09-12T00:00:00.000Z', { version: '0049.1' });
    const b = reverify.runKey(m, '2026-09-12T00:00:00.000Z', { version: '0060.1' });
    expect(a).not.toBe(b);
  });
});

describe('ADR-0060 D-C/D-E: conditional certification axis', () => {
  function quarantinedState() {
    const s = instrument.loadState(ROOT);
    const genesis = s.history[0];
    const auth = {
      schema_version: 1, state: 'authoritative',
      authoritative_identity_digest: genesis.identity_digest,
      quarantined_identity_digest: null, history: [genesis],
    };
    return instrument.transition(auth, { type: 'identity-change', identity_digest: 'a'.repeat(64) });
  }
  const signoffArgs = {
    type: 'conditional_signoff', identity_digest: 'a'.repeat(64),
    reviewer_id: 'reviewer-a', attestation_type: 'certify',
    reverify_ledger_hash: 'b'.repeat(64), bias_probe_hash: 'c'.repeat(64),
    expires_at: '2026-12-11', capa_ref: 'CAPA-0060-judge-flip-rate',
  };

  test('conditional sign-off keeps the two-state contract and records the second axis', () => {
    const c = instrument.transition(quarantinedState(), signoffArgs);
    expect(c.state).toBe('authoritative');
    expect(c.certification_mode).toBe('conditional');
    expect(c.conditional_expires_at).toBe('2026-12-11');
    expect(c.conditional_capa_ref).toBe('CAPA-0060-judge-flip-rate');
    expect(instrument.verifyState(c).valid).toBe(true);
  });

  test('the expiry is fail-closed', () => {
    const c = instrument.transition(quarantinedState(), signoffArgs);
    expect(instrument.effectiveState(c, null, Date.parse('2026-10-01T00:00:00Z'))).toBe('authoritative');
    expect(instrument.effectiveState(c, null, Date.parse('2027-01-01T00:00:00Z'))).toBe('quarantined');
  });

  test('a conditional sign-off without an expiry or CAPA is refused', () => {
    const q = quarantinedState();
    const noExpiry = Object.assign({}, signoffArgs); delete noExpiry.expires_at;
    expect(function () { instrument.transition(q, noExpiry); }).toThrow(/expires_at/);
    const noCapa = Object.assign({}, signoffArgs); delete noCapa.capa_ref;
    expect(function () { instrument.transition(q, noCapa); }).toThrow(/capa_ref/);
  });

  test('the live CLI refuses a certify sign-off on a non-pass ledger tail (D-E)', () => {
    const led = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    const tail = led[led.length - 1];
    expect(tail.conformity).not.toBe('pass');
    const r = cli(['--signoff', '--reviewer', 'r', '--attestation', 'certify', '--reverify-ledger-hash', tail.event_hash, '--bias-probe-hash', 'c'.repeat(64)]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('pass conformity');
  });

  test('ADR-0060 D-D: an open-ended conditional window is refused', () => {
    const r = cli(['--conditional-signoff', '--reviewer', 'r', '--attestation', 'certify', '--reverify-ledger-hash', 'b'.repeat(64), '--bias-probe-hash', 'c'.repeat(64), '--expires-at', '2099-01-01', '--capa-ref', 'CAPA-X']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('exceeds the 90-day conditional window');
  });

  test('the live CLI refuses a conditional sign-off without --capa-ref', () => {
    const r = cli(['--conditional-signoff', '--reviewer', 'r', '--attestation', 'certify', '--reverify-ledger-hash', 'b'.repeat(64), '--bias-probe-hash', 'c'.repeat(64)]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('[usage]:');
  });

  test('the live --check passes while the conditional certification is unexpired', () => {
    const r = cli(['--check']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('certification: conditional');
  });
});
