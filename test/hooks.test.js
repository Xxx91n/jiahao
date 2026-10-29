const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TMP = require('os').tmpdir().replace(/\\/g, '/') + '/jiahao-hooks-test';

const hooksDir = path.join(__dirname, '..', 'hooks');
const { createRecord: createEvidence } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
const { detect } = require(path.join(__dirname, '..', 'src', 'detector.js'));

// Clean slate before each hooks test to prevent profile/flag leakage
beforeEach(() => {
  fs.mkdirSync(TMP, { recursive: true });
  ['.jiahao-profile', '.jiahao-active', '.jiahao-evidence'].forEach(f => {
    try { fs.unlinkSync(TMP + '/' + f); } catch (e) {}
  });
});

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
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  try {
    const output = execSync('node hooks/jiahao-activate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 15000,
    });
    expect(output).toContain('Jiahao');
    expect(output).toContain('verification ladder');
  } finally {
    process.chdir(origDir);
  }
});

test('mode-tracker responds to /jiahao full command', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  try {
    const input = JSON.stringify({ prompt: '/jiahao full' });
    const output = execSync('echo \'' + input + '\' | node hooks/jiahao-mode-tracker.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 15000,
      shell: 'bash',
    });
    expect(output).toContain('JIAHAO MODE');
  } finally {
    process.chdir(origDir);
  }
});

test('verdict-gate blocks without evidence', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e) {}
  try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e) {}
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    const output = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 15000,
      shell: 'bash',
    });
    const parsed = JSON.parse(output);
    expect(parsed.decision).toBe('block');
  } catch (e) {
    expect(e.status).toBe(2);
  } finally {
    process.chdir(origDir);
  }
});

test('verdict-gate passes with evidence', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([rec]), 'utf8');
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 15000,
      shell: 'bash',
    });
  } catch (e) {
    throw new Error('verdict-gate should pass with evidence, got exit ' + e.status);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e) {}
    process.chdir(origDir);
  }
});

test('verdict-gate blocks with empty JSON array evidence', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-evidence', '[]', 'utf8');
  try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e) {}
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    const output = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 15000,
      shell: 'bash',
    });
    const parsed = JSON.parse(output);
    expect(parsed.decision).toBe('block');
  } catch (e) {
    expect(e.status).toBe(2);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e) {}
    process.chdir(origDir);
  }
});

test('verdict-gate blocks with plain text evidence (not JSON)', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-evidence', 'test passed', 'utf8');
  try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e) {}
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    const output = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 15000,
      shell: 'bash',
    });
    const parsed = JSON.parse(output);
    expect(parsed.decision).toBe('block');
  } catch (e) {
    expect(e.status).toBe(2);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e) {}
    process.chdir(origDir);
  }
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
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e) {}
  try {
    const input = JSON.stringify({ stop_hook_active: true });
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 15000,
      shell: 'bash',
    });
  } catch (e) {
    throw new Error('verdict-gate should pass with stop_hook_active=true, got exit ' + e.status);
  } finally {
    process.chdir(origDir);
  }
});

test('D4: verdict-gate with evidence is idempotent (file NOT consumed, second fire also passes)', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  const recD4 = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([recD4]), 'utf8');
  const input = JSON.stringify({ stop_hook_active: false });
  try {
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
    });
    // file must still exist after the hook accepted the stop.
    expect(fs.existsSync(TMP + '/.jiahao-evidence')).toBe(true);
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
    });
    expect(fs.existsSync(TMP + '/.jiahao-evidence')).toBe(true);
  } catch (e) {
    throw new Error('D4 idempotency broken: ' + (e.message || e.status));
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e_) {}
    process.chdir(origDir);
  }
});

test('D2: generator profile never blocks on high-severity suspicion (advisory only)', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-profile', 'generator', 'utf8');
  const det = detect('搞定了');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([rec]), 'utf8');
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    const out = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
    });
    const parsed = JSON.parse(out);
    expect(parsed.decision).toBe('allow');
    expect(parsed.systemMessage).toMatch(/JIAHAO ADVISORY \(high\)/);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e_) {}
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e_) {}
    process.chdir(origDir);
  }
});

test('D2: verifier profile blocks on high-severity suspicion', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-profile', 'verifier', 'utf8');
  const det = detect('搞定了');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([rec]), 'utf8');
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    throw new Error('verifier profile should have blocked');
  } catch (e) {
    expect(e.status).toBe(2);
    const parsed = JSON.parse((e.stdout || '').toString());
    expect(parsed.decision).toBe('block');
    expect(parsed.reason).toMatch(/high severity/);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e_) {}
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e_) {}
    process.chdir(origDir);
  }
});

test('D2: verifier profile low-severity suspicion = advisory, not block', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-profile', 'verifier', 'utf8');
  const det = detect('应该没问题');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([rec]), 'utf8');
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    const out = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
    });
    const parsed = JSON.parse(out);
    expect(parsed.decision).toBe('allow');
    expect(parsed.systemMessage).toMatch(/JIAHAO ADVISORY \(low\)/);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e_) {}
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e_) {}
    process.chdir(origDir);
  }
});

test('D2: verifier profile with clean evidence (no detector field) passes silently', () => {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-profile', 'verifier', 'utf8');
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([rec]), 'utf8');
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
    });
  } catch (e) {
    throw new Error('verifier profile should pass with clean evidence, got ' + e.status);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e_) {}
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e_) {}
    process.chdir(origDir);
  }
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
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-profile', 'verifier', 'utf8');
  const { createRecord: createEvidence } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
  const rec = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null);
  rec.prev_hash = 'f'.repeat(64); // tamper: repoint genesis prev_hash
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([rec]), 'utf8');
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
    });
    throw new Error('verdict-gate should have blocked on broken chain');
  } catch (e) {
    expect(e.status).toBe(2);
    const parsed = JSON.parse((e.stdout || '').toString());
    expect(parsed.reason).toMatch(/CHAIN CORRUPTION/);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e_) {}
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e_) {}
    process.chdir(origDir);
  }
});


test('verifier gate surfaces pending escalation count (advisory, exit 0)', () => {
  fs.writeFileSync(TMP + '/.jiahao-profile', 'verifier\n', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-active', 'on\n', 'utf8');
  const det = createEvidence('det-0', 'deterministic', 'passed', 'tests ok', 0.5, null);
  const llm = createEvidence('llm-0', 'llm-critic', 'inconclusive', 'critic timed out', null, det.event_hash);
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([det, llm]), 'utf8');

  const input = JSON.stringify({});
  const output = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
    encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
  });
  expect(output).toContain('Pending escalations: 1');
  expect(output).toContain('jiahao resolve');
});

// ---- #75: the severity/coverage scan is a decision about THIS turn ----
// Before this, the scan covered the whole append-only chain, so one stale
// record - a killed hook's sentinel-reconcile coverage:partial, or an enforce
// pairer-lane high severity - gated every later Stop, and human adjudication
// could not release it.

const { recordHash } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));

function runVerdictGate(payload) {
  const origDir = process.cwd();
  process.chdir(path.join(__dirname, '..'));
  try {
    const stdout = execSync('echo \'' + JSON.stringify(payload) + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 15000, shell: 'bash',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { status: 0, stdout };
  } catch (e) {
    return { status: e.status, stdout: (e.stdout || '').toString() };
  } finally {
    process.chdir(origDir);
  }
}

function verifierOn() {
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-profile', 'verifier', 'utf8');
}

function writeChain(records) {
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify(records), 'utf8');
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

function humanVerdict(prevHash, verdict) {
  const rec = {
    kind: 'human_verdict', reviewer_id: 'alice', verdict,
    reason: verdict === 'pass'
      ? 're-ran rung 1 against the migration; the claim holds'
      : 'diff shows the migration is still missing',
    corrected_output: null, second_reviewer: null, overturn: false,
    timestamp: new Date().toISOString(), prev_hash: prevHash,
  };
  rec.event_hash = recordHash(rec);
  return rec;
}

test('#75: a high-severity record from another session does not gate this Stop', () => {
  verifierOn();
  writeChain([highSeverityRecord(null, 'session-old')]);
  expect(runVerdictGate({ stop_hook_active: false, session_id: 'session-new' }).status).toBe(0);
});

test('#75: a partial-coverage record from another session does not gate this Stop', () => {
  verifierOn();
  writeChain([partialCoverageRecord(null, 'session-old')]);
  expect(runVerdictGate({ stop_hook_active: false, session_id: 'session-new' }).status).toBe(0);
});

test('#75: the same records still gate inside their own session', () => {
  verifierOn();
  writeChain([highSeverityRecord(null, 'session-a')]);
  const high = runVerdictGate({ stop_hook_active: false, session_id: 'session-a' });
  expect(high.status).toBe(2);
  expect(JSON.parse(high.stdout).reason).toMatch(/high severity/);

  writeChain([partialCoverageRecord(null, 'session-b')]);
  const partial = runVerdictGate({ stop_hook_active: false, session_id: 'session-b' });
  expect(partial.status).toBe(2);
  expect(JSON.parse(partial.stdout).reason).toMatch(/partial coverage/);
});

test('#75: a passed human verdict releases a stale coverage record', () => {
  verifierOn();
  const stale = partialCoverageRecord(null);
  writeChain([stale]);
  // unattributed records stay in scope - a host that sends no session_id gets
  // no free pass, and adjudication is their only release.
  expect(runVerdictGate({ stop_hook_active: false }).status).toBe(2);

  const pass = humanVerdict(stale.event_hash, 'pass');
  writeChain([stale, pass]);
  expect(runVerdictGate({ stop_hook_active: false }).status).toBe(0);
  // released for good: the adjudication lives on the append-only chain, so the
  // next Stop sees the same answer.
  expect(runVerdictGate({ stop_hook_active: false }).status).toBe(0);
});

test('#75: a passed human verdict releases a stale severity record, a failed one does not', () => {
  verifierOn();
  const stale = highSeverityRecord(null);
  const fail = humanVerdict(stale.event_hash, 'fail');
  writeChain([stale, fail]);
  expect(runVerdictGate({ stop_hook_active: false }).status).toBe(2);

  const pass = humanVerdict(fail.event_hash, 'pass');
  writeChain([stale, fail, pass]);
  expect(runVerdictGate({ stop_hook_active: false }).status).toBe(0);
});

