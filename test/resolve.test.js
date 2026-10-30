// test/resolve.test.js — #85: the write side of human adjudication.
//
// gatingRecords() releases everything up to the last `verdict:'pass'` human
// verdict, and that is the ONLY release path for a record with no session_id.
// The reader landed with #75; these cases pin that `jiahao resolve` can
// actually write the record it tells the operator to write.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const INSTALL = path.join(root, 'scripts', 'install.js');
const GATE = path.join(root, 'hooks', 'jiahao-verdict-gate.js');

const { createEvidenceLog, createRecord } = require(path.join(root, 'src', 'evidence-log'));
// the fail-path prefix enum has one fact source; the assertions read it rather
// than restating the literals.
const { PREFIXES } = require(path.join(root, 'src', 'shared', 'prefix-vocab'));

const PASS_ARGS = ['--verdict', 'pass', '--reason', 're-ran rung 1: no hook was killed, the run finished', '--reviewer', 'alice'];

// every fixture owns its config dir; remove them once the file is done
const dirs = [];
afterAll(() => {
  for (const dir of dirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
});

function configDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-resolve-'));
  dirs.push(dir);
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier\n', 'utf8');
  return dir;
}

// What a killed hook leaves behind: nothing suspicious in the claim text, only
// a degraded view of it — and no session_id, so no session-scoped rule can
// retire it. Adjudication is its only exit.
function seedStaleRecord(dir) {
  const rec = createRecord('sentinel-reconcile', 'sentinel', 'suspect',
    'hook killed before sentinel.end: jiahao-verdict-gate at phase stdin', null, null, {
      detector: {
        suspicious: false, matched_phrases: [], severity: null, coverage: 'partial',
        degradation: { kind: 'timeout', detail: { hook: 'jiahao-verdict-gate', phase: 'stdin' } },
      },
    });
  createEvidenceLog(dir).append([rec]);
  return rec;
}

function chainOf(dir) { return createEvidenceLog(dir).readAll() || []; }

function resolve(dir, args) {
  const res = spawnSync(process.execPath, [INSTALL, 'resolve'].concat(args), {
    cwd: root,
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: dir }),
    timeout: 15000,
  });
  return { status: res.status, stdout: String(res.stdout || ''), stderr: String(res.stderr || '') };
}

function stop(dir, payload) {
  const res = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: dir }),
    timeout: 15000,
  });
  return { status: res.status, stdout: String(res.stdout || ''), stderr: String(res.stderr || '') };
}

test('#85: resolve releases the stale record the gate had no other way to clear', () => {
  const dir = configDir();
  seedStaleRecord(dir);

  const blocked = stop(dir, { stop_hook_active: false });
  expect(blocked.status).toBe(2);
  expect(JSON.parse(blocked.stdout).reason).toMatch(/partial coverage/);

  const r = resolve(dir, PASS_ARGS);
  expect(r.status).toBe(0);

  expect(stop(dir, { stop_hook_active: false }).status).toBe(0);
  // the release is on the append-only chain, so it holds for the next Stop too
  expect(stop(dir, { stop_hook_active: false }).status).toBe(0);
});

test('#85: the receipt names the appended record, its seq, and its event_hash', () => {
  const dir = configDir();
  seedStaleRecord(dir);

  const r = resolve(dir, PASS_ARGS);
  expect(r.status).toBe(0);

  const chain = chainOf(dir);
  expect(chain).toHaveLength(2);
  const hv = chain[1];
  expect(hv.kind).toBe('human_verdict');
  expect(hv.verdict).toBe('pass');
  expect(hv.reviewer_id).toBe('alice');
  expect(hv.reason).toBe('re-ran rung 1: no hook was killed, the run finished');
  // no session_id: the verdict has to release whichever conversation hits the
  // stale record, including a host that sends no session at all.
  expect(hv.session_id).toBeUndefined();
  expect(hv.prev_hash).toBe(chain[0].event_hash);

  // the recorded shape is the one test/evidence-log.test.js pins; every field
  // is present, null included, so a reader or a later migration never has to
  // guess whether a missing key meant "not stated" or "writer forgot it".
  expect(Object.keys(hv).sort()).toEqual([
    'corrected_output', 'event_hash', 'kind', 'overturn', 'prev_hash', 'reason',
    'reviewer_id', 'second_reviewer', 'timestamp', 'verdict',
  ]);
  expect(hv.corrected_output).toBeNull();
  expect(hv.second_reviewer).toBeNull();
  expect(hv.overturn).toBeNull();
  expect(Number.isNaN(Date.parse(hv.timestamp))).toBe(false);

  expect(r.stdout).toContain(hv.event_hash);
  expect(r.stdout).toContain('seq 1 (chain length 2)');
});

test('#85: appending never rewrites what was already on the chain', () => {
  const dir = configDir();
  seedStaleRecord(dir);
  const before = chainOf(dir);

  expect(resolve(dir, PASS_ARGS).status).toBe(0);

  const after = chainOf(dir);
  expect(after).toHaveLength(before.length + 1);
  expect(after.slice(0, before.length)).toEqual(before);
  expect(createEvidenceLog(dir).verifyTail().valid).toBe(true);
});

test('#85: an empty reason is a usage error and writes no record', () => {
  const dir = configDir();
  seedStaleRecord(dir);
  const before = chainOf(dir);

  for (const args of [
    ['--verdict', 'pass', '--reason', '   ', '--reviewer', 'alice'],
    ['--verdict', 'pass', '--reviewer', 'alice'],
  ]) {
    const r = resolve(dir, args);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain(PREFIXES.usage);
    expect(r.stderr).toContain('--reason');
  }
  expect(chainOf(dir)).toEqual(before);
});

test('#85: a verdict with no reviewer or an unknown value is a usage error', () => {
  const dir = configDir();
  seedStaleRecord(dir);
  const before = chainOf(dir);

  for (const args of [
    ['--verdict', 'pass', '--reason', 'a stated reason'],
    ['--verdict', 'maybe', '--reason', 'a stated reason', '--reviewer', 'alice'],
    ['--verdict', 'pass', '--reason', 'a stated reason', '--reviewer', 'alice', '--bogus', 'x'],
  ]) {
    const r = resolve(dir, args);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain(PREFIXES.usage);
  }
  expect(chainOf(dir)).toEqual(before);
});

test('#85: fail and inconclusive are recorded but release nothing', () => {
  for (const verdict of ['fail', 'inconclusive']) {
    const dir = configDir();
    seedStaleRecord(dir);

    const r = resolve(dir, ['--verdict', verdict, '--reason', 'the hook never finished; the claim is unsupported', '--reviewer', 'alice']);
    expect(r.status).toBe(0);
    expect(chainOf(dir)).toHaveLength(2);
    expect(chainOf(dir)[1].verdict).toBe(verdict);

    // neither verdict agrees the claim holds: the turn still has to be
    // re-verified, so the stale record keeps gating.
    expect(stop(dir, { stop_hook_active: false }).status).toBe(2);
  }
});

test('#85: --flag=value is accepted and a repeated flag is refused', () => {
  const dir = configDir();
  seedStaleRecord(dir);

  const r = resolve(dir, ['--verdict=pass', '--reason=re-ran rung 1: the run finished', '--reviewer=alice']);
  expect(r.status).toBe(0);
  expect(chainOf(dir).map(rec => rec.reason).filter(Boolean)).toEqual(['re-ran rung 1: the run finished']);

  // two verdicts in one invocation is a typo, not a decision: refuse rather
  // than pick one.
  const dup = resolve(dir, ['--verdict', 'pass', '--verdict', 'fail', '--reason', 'x', '--reviewer', 'alice']);
  expect(dup.status).not.toBe(0);
  expect(dup.stderr).toContain(PREFIXES.usage);
});

test('#85: an unreadable config fails with a prefix, not a bare message', () => {
  const dir = configDir();
  seedStaleRecord(dir);
  const segment = path.join(dir, '.jiahao-evidence', '00000000000000000000.jsonl');
  const before = fs.readFileSync(segment, 'utf8');
  // A corrupt anchor config makes evidence-log throw before it can append. The
  // installer's own catch prints a bare e.message, so run() has to name the
  // failure class itself — otherwise `jiahao resolve` loses the prefix exactly
  // on the command the hooks advertise.
  fs.writeFileSync(path.join(dir, '.jiahao-anchor.json'), 'not json', 'utf8');

  const r = resolve(dir, PASS_ARGS);
  expect(r.status).not.toBe(0);
  expect(r.stderr).toContain(PREFIXES.config);
  expect(r.stderr).toContain('no human_verdict was confirmed');
  expect(fs.readFileSync(segment, 'utf8')).toBe(before);

  // validation is pure and runs first: a typo stays a usage error even when the
  // store cannot be opened, so a config fault never masks an operator mistake.
  const typo = resolve(dir, ['--verdict', 'maybe', '--reason', 'x', '--reviewer', 'alice']);
  expect(typo.status).not.toBe(0);
  expect(typo.stderr).toContain(PREFIXES.usage);
});

test('#85: the failure prefix separates operable states from internal bugs', () => {
  const { failurePrefix } = require(path.join(root, 'scripts', 'resolve'));
  const { WITNESS_HARD_STOP_CODE } = require(path.join(root, 'src', 'evidence-log'));

  const config = new Error('cannot parse anchor config');
  config.name = 'ConfigLoadError';
  expect(failurePrefix(config)).toBe(PREFIXES.config);
  // the witness hard stop tells the operator to run the rebuild command: that is
  // an operable state, not an internal bug.
  const witness = new Error('witness unavailable past the hard deadline');
  witness.code = WITNESS_HARD_STOP_CODE;
  expect(failurePrefix(witness)).toBe(PREFIXES.config);
  expect(failurePrefix(new Error('boom'))).toBe(PREFIXES.internal);
});

test('#85: a store that refuses the write is reported, not assumed written', () => {
  const dir = configDir();
  // A legacy chain broken at genesis: migration is refused for the verifier
  // profile, so commit() drops the append. The CLI must say so and leave the
  // existing file exactly as it found it.
  const broken = [{ gate_id: 'det-0', status: 'passed', prev_hash: 'f'.repeat(64), event_hash: '0'.repeat(64) }];
  const storePath = path.join(dir, '.jiahao-evidence');
  fs.writeFileSync(storePath, JSON.stringify(broken), 'utf8');

  const r = resolve(dir, PASS_ARGS);
  expect(r.status).not.toBe(0);
  expect(r.stderr).toContain(PREFIXES.config);
  expect(r.stderr).toContain('no human_verdict on the chain I can read');
  // the failure receipt names what the store holds, so "did anything land?" is
  // answerable without trusting the exit code
  expect(r.stderr).toContain('chain tail: seq 0 (chain length 1) event_hash ' + '0'.repeat(64));
  expect(r.stdout).not.toContain('event_hash');
  expect(JSON.parse(fs.readFileSync(storePath, 'utf8'))).toEqual(broken);
});
