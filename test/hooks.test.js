const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const hooksDir = path.join(repoRoot, 'hooks');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');
const { createRecord: createEvidence } = require(path.join(repoRoot, 'src', 'evidence-log.js'));
const { detect } = require(path.join(repoRoot, 'src', 'detector.js'));

// One fresh directory per test (#84 / #86 A). This file used to share a single
// fixed TMP: two overlapping runs - another worktree's agent, a sharded job -
// read and rewrote each other's evidence chain mid-assertion, flipping a block
// into a pass. Every case now gets its own mkdtemp dir, so no path here is
// reachable by a concurrent run.
let tempDirs;
beforeEach(() => {
  tempDirs = [];
});
afterEach(() => {
  for (const dir of tempDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
});

function freshDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runHook(script, opts) {
  const o = opts || {};
  const dir = o.dir || freshDir('jiahao-hooks-test-');
  return spawnHook(path.join(hooksDir, script), {
    stdin: o.stdin,
    env: hostEnv(dir),
    cwd: repoRoot,
  });
}

test('all 5 hook files exist', () => {
  ['jiahao-runtime.js', 'jiahao-activate.js', 'jiahao-subagent.js',
   'jiahao-mode-tracker.js', 'jiahao-verdict-gate.js'].forEach(f => {
    expect(fs.existsSync(path.join(hooksDir, f))).toBe(true);
  });
});

test('jiahao-hooks.json is valid JSON with 4 events', () => {
  const config = JSON.parse(fs.readFileSync(path.join(hooksDir, 'jiahao-hooks.json'), 'utf8'));
  expect(config.hooks.SessionStart).toBeDefined();
  expect(config.hooks.SubagentStart).toBeDefined();
  expect(config.hooks.UserPromptSubmit).toBeDefined();
  expect(config.hooks.Stop).toBeDefined();
});

test('D5: SubagentStop is registered next to Stop (parity)', () => {
  const config = JSON.parse(fs.readFileSync(path.join(hooksDir, 'jiahao-hooks.json'), 'utf8'));
  expect(config.hooks.SubagentStop).toBeDefined();
  // Both events must invoke the same hook script
  const stopCmd = config.hooks.Stop[0].hooks[0].command;
  const subCmd = config.hooks.SubagentStop[0].hooks[0].command;
  expect(stopCmd).toBe(subCmd);
  expect(stopCmd).toContain('jiahao-verdict-gate.js');
});

test('runtime detectHost returns a string', () => {
  const { detectHost } = require(path.join(hooksDir, 'jiahao-runtime.js'));
  const host = detectHost();
  expect(typeof host).toBe('string');
  expect(['claude', 'codex', 'copilot', 'qoder', 'codebuddy']).toContain(host);
});

test('runtime writeHookOutput respects 10k cap', () => {
  const { writeHookOutput } = require(path.join(hooksDir, 'jiahao-runtime.js'));
  const long = 'x'.repeat(20000);
  const orig = console.log;
  let captured = '';
  console.log = (s) => { captured = s; };
  writeHookOutput(long, 'SessionStart');
  console.log = orig;
  expect(captured.length).toBeLessThanOrEqual(10000);
});

test('activate script runs and outputs SKILL.md content', () => {
  const res = runHook('jiahao-activate.js');
  expectExit(res, 0);
  expect(res.stdout).toContain('Jiahao');
  expect(res.stdout).toContain('verification ladder');
});

test('mode-tracker responds to /jiahao full command', () => {
  const input = JSON.stringify({ prompt: '/jiahao full' });
  const res = runHook('jiahao-mode-tracker.js', { stdin: input });
  expectExit(res, 0);
  expect(res.stdout).toContain('JIAHAO MODE');
});

// CodeRabbit on PR #93: `.unref()` does not cancel the guard timer, so a process
// kept alive by a pending stdout write could still be force-exited at 1s with the
// envelope queued. The preload holds the loop past the guard and prints only if
// it survived - clearing the guard when stdin ends is what lets that line appear.
test('the stdin hang guard is cleared once stdin ends', () => {
  const preload = path.join(__dirname, 'helpers', 'slow-stdin.js').split(path.sep).join('/');
  // Every stdin-reading hook gets the same treatment: a regression in one must
  // not stay green because only its sibling was pinned.
  // Each payload reaches that hook's output path, so the process stays alive
  // instead of taking an early exit that prints nothing.
  const cases = [
    { script: 'jiahao-instructions-assert.js', code: 0, stdin: '{}' },
    { script: 'jiahao-mode-tracker.js', code: 0, stdin: JSON.stringify({ prompt: '/jiahao full' }) },
    { script: 'jiahao-subagent.js', code: 0, stdin: '{}' },
    {
      script: 'jiahao-pretool-guard.js', code: 0,
      stdin: JSON.stringify({
        tool_name: 'Edit',
        tool_input: { file_path: path.join(repoRoot, 'adapters', 'codebuddy', 'rules', 'jiahao-verifier.md') },
      }),
      pluginRoot: repoRoot,
    },
    { script: 'jiahao-verdict-gate.js', code: 2, stdin: JSON.stringify({ stop_hook_active: false }) },
  ];
  for (const c of cases) {
    const dir = freshDir('jiahao-hooks-test-');
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    const env = hostEnv(dir, c.pluginRoot);
    // JSON.stringify quotes the path: NODE_OPTIONS is parsed as a shell-like
    // string, so an unquoted checkout path with a space would split (#93).
    env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--require=' + JSON.stringify(preload)]
      .filter(Boolean).join(' ');
    const res = spawnHook(path.join(hooksDir, c.script), {
      stdin: c.stdin, env: env, cwd: repoRoot,
    });
    expectExit(res, c.code);
    expect(res.stdout).toContain('PRELOAD-ALIVE');
  }
}, 30000);

test('verdict-gate blocks without evidence', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 2);
  expect(parseJson(res).decision).toBe('block');
});

test('verdict-gate passes with evidence', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 0);
});

test('verdict-gate blocks with empty JSON array evidence', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), '[]', 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 2);
  expect(parseJson(res).decision).toBe('block');
});

test('verdict-gate blocks with plain text evidence (not JSON)', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), 'test passed', 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 2);
  expect(parseJson(res).decision).toBe('block');
});

test('shared paths module exports flagPath and evidencePath', () => {
  const { flagPath, evidencePath, evidenceKeysPath } = require(path.join(__dirname, '..', 'src', 'shared', 'paths.js'));
  expect(typeof flagPath).toBe('function');
  expect(typeof evidencePath).toBe('function');
  expect(typeof evidenceKeysPath).toBe('function');
  expect(flagPath()).toContain('.jiahao-active');
  expect(evidencePath()).toContain('.jiahao-evidence');
  expect(evidenceKeysPath()).toContain('.jiahao-evidence.keys');
});

test('verdict-gate respects stop_hook_active', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: true }),
  });
  expectExit(res, 0);
});

test('D4: verdict-gate with evidence is idempotent (file NOT consumed, second fire also passes)', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const recD4 = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([recD4]), 'utf8');
  const input = JSON.stringify({ stop_hook_active: false });
  expectExit(runHook('jiahao-verdict-gate.js', { dir: dir, stdin: input }), 0);
  // file must still exist after the hook accepted the stop.
  expect(fs.existsSync(path.join(dir, '.jiahao-evidence'))).toBe(true);
  expectExit(runHook('jiahao-verdict-gate.js', { dir: dir, stdin: input }), 0);
  expect(fs.existsSync(path.join(dir, '.jiahao-evidence'))).toBe(true);
});

test('D2: generator profile never blocks on high-severity suspicion (advisory only)', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'generator', 'utf8');
  const det = detect('搞定了');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 0);
  const parsed = parseJson(res);
  expect(parsed.decision).toBe('allow');
  expect(parsed.systemMessage).toMatch(/JIAHAO ADVISORY \(high\)/);
});

test('D2: verifier profile blocks on high-severity suspicion', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
  const det = detect('搞定了');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 2);
  const parsed = parseJson(res);
  expect(parsed.decision).toBe('block');
  expect(parsed.reason).toMatch(/high severity/);
});

test('D2: verifier profile low-severity suspicion = advisory, not block', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
  const det = detect('应该没问题');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 0);
  const parsed = parseJson(res);
  expect(parsed.decision).toBe('allow');
  expect(parsed.systemMessage).toMatch(/JIAHAO ADVISORY \(low\)/);
});

test('D2: verifier profile with clean evidence (no detector field) passes silently', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 0);
});

// recordHash covers prev_hash — the tail-truncate-relink hole
// (delete middle record, repoint next.prev_hash, event_hash still verifies
// under the old formula) is closed when the hash body includes prev_hash.
test('recordHash hashes the prev_hash field', () => {
  const { recordHash } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
  const a = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  const b1 = createEvidence('det-1', 'deterministic', 'passed', 'ok', 0.9, a.event_hash);
  const b2 = createEvidence('det-1', 'deterministic', 'passed', 'ok', 0.9, 'f'.repeat(64));
  expect(recordHash(a)).toBe(a.event_hash);
  expect(recordHash(b1)).toBe(b1.event_hash);
  expect(recordHash(b2)).toBe(b2.event_hash);
  expect(b1.event_hash).not.toBe(b2.event_hash); // prev_hash changes the hash
});

// composite idempotency key = SHA256(session|turn|tool_seq).
test('idempotency key is deterministic composite', () => {
  const { idempotencyKey } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
  const k1 = idempotencyKey('s1', 't1', 'det-0');
  const k2 = idempotencyKey('s1', 't1', 'det-0');
  const k3 = idempotencyKey('s1', 't1', 'det-1');
  expect(k1).toBe(k2);
  expect(k1).not.toBe(k3);
  expect(k1).toMatch(/^[0-9a-f]{64}$/);
});

// verdict-gate BLOCKS when the on-disk chain is tampered.
test('verdict-gate blocks on broken chain (verifier)', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  rec.prev_hash = 'f'.repeat(64); // tamper: repoint genesis prev_hash
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 2);
  expect(parseJson(res).reason).toMatch(/CHAIN CORRUPTION/);
});

test('verifier gate surfaces pending escalation count (advisory, exit 0)', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'on\n', 'utf8');
  const det = createEvidence('det-0', 'deterministic', 'passed', 'tests ok', 0.5, null);
  const llm = createEvidence('llm-0', 'llm-critic', 'inconclusive', 'critic timed out', null, det.event_hash);
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([det, llm]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', { dir: dir, stdin: JSON.stringify({}) });
  expectExit(res, 0);
  expect(res.stdout).toContain('Pending escalations: 1');
  expect(res.stdout).toContain('jiahao resolve');
});

// ---- #75: the severity/coverage scan is a decision about THIS turn ----
// Before this, the scan covered the whole append-only chain, so one stale
// record - a killed hook's sentinel-reconcile coverage:partial, or an enforce
// pairer-lane high severity - gated every later Stop, and human adjudication
// could not release it.

const { recordHash } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));

// Each case runs against its own config dir. The shared TMP this file used to
// have is what let two overlapping runs clobber the chain mid-assertion, which
// turns a block into a pass.
function gateFixture() {
  const dir = freshDir('jiahao-gate-75-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
  return {
    chain: function (records) {
      fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify(records), 'utf8');
    },
    stop: function (payload) {
      // argv array and the payload on stdin: no shell string to interpolate,
      // and a block (exit 2) is a normal result rather than a throw.
      return spawnHook(path.join(hooksDir, 'jiahao-verdict-gate.js'), {
        stdin: JSON.stringify(payload),
        env: hostEnv(dir),
        cwd: repoRoot,
      });
    },
  };
}

function highSeverityRecord(prevHash, sessionId) {
  const extras = { detector: detect('搞定了') };
  if (sessionId) extras.session_id = sessionId;
  return createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, prevHash, extras);
}

// What a killed hook actually leaves behind: nothing suspicious in the claim
// text, only a degraded view of it.
function partialCoverageRecord(prevHash, sessionId) {
  const extras = {
    detector: {
      suspicious: false, matched_phrases: [], severity: null, coverage: 'partial',
      degradation: { kind: 'timeout', detail: { hook: 'jiahao-verdict-gate', phase: 'stdin' } },
    },
  };
  if (sessionId) extras.session_id = sessionId;
  return createEvidence('sentinel-reconcile', 'sentinel', 'suspect',
    'hook killed before sentinel.end: jiahao-verdict-gate at phase stdin', null, prevHash, extras);
}

function humanVerdict(prevHash, verdict, sessionId) {
  const rec = {
    kind: 'human_verdict', reviewer_id: 'alice', verdict,
    reason: verdict === 'pass'
      ? 're-ran rung 1 against the migration; the claim holds'
      : 'diff shows the migration is still missing',
    corrected_output: null, second_reviewer: null, overturn: false,
    timestamp: new Date().toISOString(), prev_hash: prevHash,
  };
  if (sessionId) rec.session_id = sessionId;
  rec.event_hash = recordHash(rec);
  return rec;
}

test('#75: an adjudication recorded under another session still releases what it cleared', () => {
  const gate = gateFixture();
  const stale = partialCoverageRecord(null);
  // a reviewer working in their own conversation clears the escalation the
  // agent hit in a different one - the release must be readable from anywhere,
  // or scoping the scan has only produced a new permanent block.
  const pass = humanVerdict(stale.event_hash, 'pass', 'session-reviewer');
  gate.chain([stale, pass]);
  expectExit(gate.stop({ stop_hook_active: false, session_id: 'session-current' }), 0);
});

test('#75: another session records do not vouch for this session', () => {
  const gate = gateFixture();
  // The machine has been used: a clean, fully verified turn from an earlier
  // conversation sits on the chain. That is not this turn's evidence.
  gate.chain([createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { session_id: 'session-old' })]);
  const res = gate.stop({ stop_hook_active: false, session_id: 'session-new' });
  expectExit(res, 2);
  expect(parseJson(res).reason).toMatch(/no evidence/);
});

test('#75: a high-severity record from another session does not gate this Stop', () => {
  const gate = gateFixture();
  const own = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { session_id: 'session-new' });
  gate.chain([own, highSeverityRecord(own.event_hash, 'session-old')]);
  expectExit(gate.stop({ stop_hook_active: false, session_id: 'session-new' }), 0);
});

test('#75: a partial-coverage record from another session does not gate this Stop', () => {
  const gate = gateFixture();
  const own = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { session_id: 'session-new' });
  gate.chain([own, partialCoverageRecord(own.event_hash, 'session-old')]);
  expectExit(gate.stop({ stop_hook_active: false, session_id: 'session-new' }), 0);
});

test('#75: the same records still gate inside their own session', () => {
  const gate = gateFixture();
  gate.chain([highSeverityRecord(null, 'session-a')]);
  const high = gate.stop({ stop_hook_active: false, session_id: 'session-a' });
  expectExit(high, 2);
  expect(parseJson(high).reason).toMatch(/high severity/);

  gate.chain([partialCoverageRecord(null, 'session-b')]);
  const partial = gate.stop({ stop_hook_active: false, session_id: 'session-b' });
  expectExit(partial, 2);
  expect(parseJson(partial).reason).toMatch(/partial coverage/);
});

test('#75: a passed human verdict releases a stale coverage record', () => {
  const gate = gateFixture();
  const stale = partialCoverageRecord(null);
  gate.chain([stale]);
  // unattributed records stay in scope - a host that sends no session_id gets
  // no free pass, and adjudication is their only release.
  expectExit(gate.stop({ stop_hook_active: false }), 2);

  const pass = humanVerdict(stale.event_hash, 'pass');
  gate.chain([stale, pass]);
  expectExit(gate.stop({ stop_hook_active: false }), 0);
  // released for good: the adjudication lives on the append-only chain, so the
  // next Stop sees the same answer.
  expectExit(gate.stop({ stop_hook_active: false }), 0);
});

test('#75: a passed human verdict releases a stale severity record, a failed one does not', () => {
  const gate = gateFixture();
  const stale = highSeverityRecord(null);
  const fail = humanVerdict(stale.event_hash, 'fail');
  gate.chain([stale, fail]);
  expectExit(gate.stop({ stop_hook_active: false }), 2);

  const pass = humanVerdict(fail.event_hash, 'pass');
  gate.chain([stale, fail, pass]);
  expectExit(gate.stop({ stop_hook_active: false }), 0);
});
