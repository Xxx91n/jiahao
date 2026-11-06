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
  expect(['claude', 'codex', 'copilot', 'qoder', 'codebuddy', 'zcode']).toContain(host);
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

// #108 audit (CodeRabbit round 2): an enforce-mode pairer record with an
// undetermined state classifies nothing (adapter failure / pairItem
// exception), so it must not stand in for evidence the way a shadow record
// never could - a chain holding only it means "no evidence" and the
// verifier blocks.
test('an undetermined enforce-mode pairer record does not satisfy the no-evidence check', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const rec = createEvidence('pl-0', 'pairer-lane', 'observed',
    'pairer-lane[enforce] undetermined — adapter: transcript unadaptable', null, null, {
      detector: {
        suspicious: false, matched_phrases: [], severity: null,
        source: 'pairer-instrument', shadow: false,
        pairer: { state: 'undetermined' },
      },
    });
  fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
  });
  expectExit(res, 2);
  const parsed = parseJson(res);
  expect(parsed.decision).toBe('block');
  expect(parsed.reason).toMatch(/no evidence/i);
});

// #71 item 15 (adjudicated): an enforce-mode pairer record that DID determine
// a state is verification evidence - it satisfies Case A. A shadow record with
// the same state is still telemetry and leaves the chain "no evidence".
test('a determined enforce-mode pairer record satisfies Case A, a shadow one does not', () => {
  function runWith(shadow) {
    const dir = freshDir('jiahao-hooks-test-');
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    const rec = createEvidence('pl-1', 'pairer-lane', 'observed',
      'pairer-lane[' + (shadow ? 'shadow' : 'enforce') + '] consistent', null, null, {
        detector: {
          suspicious: false, matched_phrases: [], severity: null,
          source: 'pairer-instrument', shadow: shadow,
          pairer: { state: 'consistent' },
        },
      });
    fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([rec]), 'utf8');
    return runHook('jiahao-verdict-gate.js', {
      dir: dir, stdin: JSON.stringify({ stop_hook_active: false }),
    });
  }

  const enforce = runWith(false);
  expectExit(enforce, 0);
  expect(String(enforce.stdout)).not.toContain('no evidence');

  const shadow = runWith(true);
  expectExit(shadow, 2);
  expect(parseJson(shadow).reason).toMatch(/no evidence/i);
});

// #108 audit (CodeRabbit round 2): readProfile() hardened at the source -
// a directory (or unreadable file) at .jiahao-profile returns the documented
// default instead of killing the hook at top level.
test('readProfile falls back to the verifier default when the profile path is unreadable', () => {
  const dir = freshDir('jiahao-profile-test-');
  fs.mkdirSync(path.join(dir, '.jiahao-profile')); // a directory where the file should be
  const { readProfile } = require(path.join(hooksDir, 'jiahao-profile.js'));
  const prev = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = dir;
  try {
    expect(readProfile()).toBe('verifier');
  } finally {
    if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prev;
  }
});

// #119 finding 1: the fallback must not be silent — a read failure leaves
// its payload on stderr so an operator can tell a defaulted profile from a
// misconfigured one (#84's fail-path convention). EISDIR is the measured
// shape (a directory where the flag file should be).
test('finding 1: readProfile leaves the failure payload on stderr when the profile path is unreadable', () => {
  const dir = freshDir('jiahao-profile-test-');
  fs.mkdirSync(path.join(dir, '.jiahao-profile')); // a directory where the file should be
  const { readProfile } = require(path.join(hooksDir, 'jiahao-profile.js'));
  const prev = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = dir;
  const errWrites = [];
  const origWrite = process.stderr.write;
  process.stderr.write = (chunk) => { errWrites.push(String(chunk)); return true; };
  try {
    expect(readProfile()).toBe('verifier');
  } finally {
    process.stderr.write = origWrite;
    if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prev;
  }
  const joined = errWrites.join('');
  expect(joined).toContain('[config]:');
  expect(joined).toContain('.jiahao-profile');
});

// The read-no-longer-goes-through existsSync (CodeRabbit PR #129 round 1:
// existsSync swallowed every stat failure, e.g. a symlink to an inaccessible
// target), so the two arms of the contract need pinning separately: ENOENT
// is the documented absent-file default and stays silent, any other read
// error warns. (A dangling-symlink fixture is not portable on Windows —
// symlinkSync needs privileges there — so the arms are pinned with the
// shapes every host can produce: absent file and a directory in the way.)
test('finding 1: an absent profile file is the documented default and stays silent', () => {
  const dir = freshDir('jiahao-profile-test-');
  const { readProfile } = require(path.join(hooksDir, 'jiahao-profile.js'));
  const prev = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = dir;
  const errWrites = [];
  const origWrite = process.stderr.write;
  process.stderr.write = (chunk) => { errWrites.push(String(chunk)); return true; };
  try {
    expect(readProfile()).toBe('verifier');
  } finally {
    process.stderr.write = origWrite;
    if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prev;
  }
  expect(errWrites).toEqual([]);
});

// #108 audit (CodeRabbit round 2): the guard's fail-soft contract holds when
// the profile source misbehaves - a protected target with an unreadable
// profile denies (the documented default), it does not exit nonzero.
test('pretool-guard denies a protected target and exits 0 with an unreadable profile', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.mkdirSync(path.join(dir, '.jiahao-profile'));
  const input = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: path.join(repoRoot, 'hooks', 'jiahao-verdict-gate.js') },
  });
  const res = runHook('jiahao-pretool-guard.js', { dir: dir, stdin: input });
  expectExit(res, 0);
  const parsed = parseJson(res);
  expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny');
});

// #71 item 3: the guard is a modification guard. Reading the injected rules
// is how a verifier works; only a call that can change the apparatus is a
// bypass.
test('pretool-guard lets a read-only tool read a protected target', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const input = JSON.stringify({
    tool_name: 'Read',
    tool_input: { file_path: path.join(repoRoot, 'hooks', 'jiahao-verdict-gate.js') },
  });
  const res = runHook('jiahao-pretool-guard.js', { dir: dir, stdin: input });
  expectExit(res, 0);
  expect(String(res.stdout).trim()).toBe(''); // no deny envelope
});

test('pretool-guard lets a read-only tool reach a protected directory', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const res = runHook('jiahao-pretool-guard.js', {
    dir: dir,
    stdin: JSON.stringify({ tool_name: 'Grep', tool_input: { path: path.join(repoRoot, 'hooks') } }),
  });
  expectExit(res, 0);
  expect(String(res.stdout).trim()).toBe('');
});

test('pretool-guard still denies a shell command that writes a protected file', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const res = runHook('jiahao-pretool-guard.js', {
    dir: dir,
    stdin: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm hooks/jiahao-verdict-gate.js' } }),
  });
  expectExit(res, 0);
  expect(parseJson(res).hookSpecificOutput.permissionDecision).toBe('deny');
});

// #71 item 4: a subagent gets ONE ruleset. Injecting the whole SKILL.md handed
// it both profiles' mutually exclusive rules.
test('subagent injection carries only the verifier section for a verifier subagent', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'generator', 'utf8');
  const res = runHook('jiahao-subagent.js', { dir: dir, stdin: JSON.stringify({ agent_type: 'review' }) });
  expectExit(res, 0);
  const ctx = parseJson(res).hookSpecificOutput.additionalContext;
  expect(ctx).toContain('## Verifier Profile');
  expect(ctx).not.toContain('## Generator Profile');
});

test('subagent injection inherits the parent profile when the agent type is unknown', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'generator', 'utf8');
  // No agent_type: the hook fails open and injects, using the parent's profile.
  const res = runHook('jiahao-subagent.js', { dir: dir, stdin: '{}' });
  expectExit(res, 0);
  const ctx = parseJson(res).hookSpecificOutput.additionalContext;
  expect(ctx).toContain('## Generator Profile');
  expect(ctx).not.toContain('## Verifier Profile');
});

// #71 item 12: a factory throw used to kill the hook before any judgment -
// a silent fail-open gate. It must now reach the normal block envelope.
test('verdict-gate blocks through the host envelope when the evidence log cannot initialize', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  const preload = path.join(__dirname, 'helpers', 'fail-evidence-log-init.js').split(path.sep).join('/');
  // JSON.stringify quotes the path: NODE_OPTIONS is parsed as a shell-like
  // string, so an unquoted checkout path with a space would split.
  const env = Object.assign(hostEnv(dir), {
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--require=' + JSON.stringify(preload)]
      .filter(Boolean).join(' '),
  });
  const res = spawnHook(path.join(hooksDir, 'jiahao-verdict-gate.js'), {
    stdin: JSON.stringify({ stop_hook_active: false }), env: env, cwd: repoRoot,
  });
  expectExit(res, 2);
  const parsed = parseJson(res);
  expect(parsed.decision).toBe('block');
  expect(parsed.reason).toMatch(/could not initialize/);
});

test('verdict-gate init failure stays advisory in the generator profile (D2)', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'generator', 'utf8');
  const preload = path.join(__dirname, 'helpers', 'fail-evidence-log-init.js').split(path.sep).join('/');
  // JSON.stringify quotes the path: NODE_OPTIONS is parsed as a shell-like
  // string, so an unquoted checkout path with a space would split.
  const env = Object.assign(hostEnv(dir), {
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--require=' + JSON.stringify(preload)]
      .filter(Boolean).join(' '),
  });
  const res = spawnHook(path.join(hooksDir, 'jiahao-verdict-gate.js'), {
    stdin: JSON.stringify({ stop_hook_active: false }), env: env, cwd: repoRoot,
  });
  expectExit(res, 0);
  const parsed = parseJson(res);
  expect(parsed.decision).toBeUndefined();
  expect(parsed.systemMessage).toMatch(/could not initialize/);
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

// #108 audit (CodeRabbit round 5): with no CLAUDE_CONFIG_DIR, no HOME and no
// host root (#116), the config dir resolves to os.homedir() (USERPROFILE on
// Windows) — /tmp is neither the documented flag location nor guaranteed to
// exist.
test('configDir falls back to os.homedir(), never /tmp', () => {
  const { configDir } = require(path.join(repoRoot, 'src', 'shared', 'paths.js'));
  const os = require('os');
  const saved = {
    cc: process.env.CLAUDE_CONFIG_DIR,
    home: process.env.HOME,
    qoder: process.env.QODER_CONFIG_DIR,
    codebuddy: process.env.CODEBUDDY_CONFIG_DIR,
    workbuddy: process.env.WORKBUDDY_CONFIG_DIR,
  };
  delete process.env.CLAUDE_CONFIG_DIR;
  delete process.env.HOME;
  delete process.env.QODER_CONFIG_DIR;
  delete process.env.CODEBUDDY_CONFIG_DIR;
  delete process.env.WORKBUDDY_CONFIG_DIR;
  try {
    expect(configDir()).toBe(os.homedir());
    expect(configDir()).not.toBe('/tmp');
  } finally {
    if (saved.cc === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = saved.cc;
    if (saved.home === undefined) delete process.env.HOME;
    else process.env.HOME = saved.home;
    if (saved.qoder === undefined) delete process.env.QODER_CONFIG_DIR;
    else process.env.QODER_CONFIG_DIR = saved.qoder;
    if (saved.codebuddy === undefined) delete process.env.CODEBUDDY_CONFIG_DIR;
    else process.env.CODEBUDDY_CONFIG_DIR = saved.codebuddy;
    if (saved.workbuddy === undefined) delete process.env.WORKBUDDY_CONFIG_DIR;
    else process.env.WORKBUDDY_CONFIG_DIR = saved.workbuddy;
  }
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
  expect(parsed.decision).toBeUndefined(); // #71 item 5: allow = absent decision
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
  expect(parsed.decision).toBeUndefined(); // #71 item 5: allow = absent decision
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

// ---- #124: the claim gate — Case A only tightens a turn that CLAIMS done ----
// Case A used to block every verifier Stop with an empty session evidence
// chain, so a pure Q&A or read-only status report could not end without a
// human `jiahao resolve`. The gate now reads this turn's own words first.
// The red property is structural: reverting the gate to unconditional Case A
// blocking turns the allow assertions in the tests below (no-claim, the
// transcript quiet close, the reentry first stop) into exit-2 failures.

// A Claude-Code-shaped transcript: one user turn opener, one assistant
// closing. The closing text is the lane's claim side for hosts that carry no
// last_assistant_message field.
function transcriptFixture(closingText) {
  const dir = freshDir('jiahao-transcript-124-');
  const file = path.join(dir, 'session.jsonl');
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'user', message: { role: 'user', content: '看看当前的配置目录在哪' } }),
    JSON.stringify({ type: 'assistant', message: { id: 'msg_124', role: 'assistant', content: [{ type: 'text', text: closingText }] } }),
  ].join('\n'), 'utf8');
  return file;
}

// the gate arbiter: negation scoped to its clause, ambiguous words need a
// completion context. Unit-level here; the hook-level tests below cover the
// decision wiring. The claims list is the no-under-block side (a miss here
// lets an unverified completion through), the prose list the precision side.
test('#124: claimsCompletion arbitrates claims without under-blocking', () => {
  const { claimsCompletion, hasSuccessClaim } = require(path.join(repoRoot, 'src', 'success-claim.js'));
  const claims = [
    '任务完成，已验证。',
    '任务完成，已验证，not flaky。', // unrelated negation does not suppress
    'All tests pass; this is not a flaky suite.',
    'The build is done — not blocked by the proxy.',
    'The change is done but not tested.', // the claim side is still a claim
    'The fix works as expected.',
    '全部验证通过',
    '测试通过',
    '测试已通过。',
    '测试已经通过。',
    '单测全部通过。',
    '回归测试已通过。',
    '构建已通过。',
    '已通过。',
    '已验证。',
    '全部通过',
    '系统可用了。',
    '搞定',
  ];
  for (const c of claims) expect(claimsCompletion(c)).toBe(true);
  const prose = [
    '这个配置通过 .jiahao-profile 读取，先到这里。',
    '这条命令可用，参数是 --profile。',
    'It works by reading the profile file at the config root.',
    'The passing rate in the benchmark is documented in bench/.',
    'not done',
    'not yet done',
    '我把当前的配置目录和空日志整理给你了，先到这里。',
    '当前配置目录在 C:/x，日志是空的。',
  ];
  for (const c of prose) expect(claimsCompletion(c)).toBe(false);
  // status reports in the disclosure direction stay non-claims (round 2:
  // the English-only disclosure list missed CJK negation)
  expect(claimsCompletion('还没完成，还在看。')).toBe(false);
  expect(claimsCompletion('尚未完成，明天继续。')).toBe(false);
  // the triage signal keeps its original sentence-level contract (H8 twins)
  expect(hasSuccessClaim('任务完成，已验证，not flaky。')).toBe(false);
});

test('#124: a no-claim turn in verifier profile is allowed with an advisory', () => {
  const gate = gateFixture();
  const res = gate.stop({
    stop_hook_active: false,
    last_assistant_message: '我把当前的配置目录和空日志整理给你了，先到这里。',
  });
  expectExit(res, 0);
  const parsed = parseJson(res);
  expect(parsed.decision).toBeUndefined(); // #71 item 5: allow = absent decision
  expect(parsed.systemMessage).toMatch(/no completion claim/i);
});

test('#124: a completion claim without evidence still blocks (no regression)', () => {
  const gate = gateFixture();
  const res = gate.stop({
    stop_hook_active: false,
    last_assistant_message: '任务完成，已验证。',
  });
  expectExit(res, 2);
  const parsed = parseJson(res);
  expect(parsed.decision).toBe('block');
  expect(parsed.reason).toMatch(/no evidence/i);
});

test('#124: the claim rides the transcript when the host sends no last_assistant_message', () => {
  const gate = gateFixture();
  // Claude Code carries no last_assistant_message field; the lane's adapted
  // closing is this turn's claim source instead.
  const claiming = gate.stop({
    stop_hook_active: false, session_id: 'session-124',
    transcript_path: transcriptFixture('任务完成，已验证。'),
  });
  expectExit(claiming, 2);
  expect(parseJson(claiming).decision).toBe('block');

  const quiet = gate.stop({
    stop_hook_active: false, session_id: 'session-124',
    transcript_path: transcriptFixture('当前配置目录在 C:\\x，日志是空的。'),
  });
  expectExit(quiet, 0);
  expect(parseJson(quiet).systemMessage).toMatch(/no completion claim/i);
});

test('#124: a camelCase lastAssistantMessage is read the same way', () => {
  const gate = gateFixture();
  const res = gate.stop({
    stop_hook_active: false,
    lastAssistantMessage: '我把当前的配置目录和空日志整理给你了，先到这里。',
  });
  expectExit(res, 0);
  expect(parseJson(res).systemMessage).toMatch(/no completion claim/i);
});

test('#124: no claim source at all keeps the fail-closed Case A block', () => {
  const gate = gateFixture();
  // No last_assistant_message (any spelling), no transcript: the gate cannot
  // know whether the turn claimed something, so it must not hand out a pass.
  const res = gate.stop({
    stop_hook_active: false,
    last_assistant_message: '   \n\t', // whitespace-only reads as absent
  });
  expectExit(res, 2);
  expect(parseJson(res).reason).toMatch(/no evidence/i);
});

// Round-1 review (CodeRabbit + both review axes): the no-claim allow is a
// CASE A decision only. With session evidence on the chain, Case B still
// judges the turn — a claim-free message can never waive a pending
// high-severity or partial-coverage block.
test('#124: a no-claim message does not waive a high-severity block', () => {
  const gate = gateFixture();
  gate.chain([highSeverityRecord(null)]);
  const res = gate.stop({
    stop_hook_active: false,
    last_assistant_message: '我把当前的配置目录和空日志整理给你了，先到这里。',
  });
  expectExit(res, 2);
  expect(parseJson(res).reason).toMatch(/high severity/);
});

test('#124: a no-claim message does not waive a partial-coverage escalation', () => {
  const gate = gateFixture();
  gate.chain([partialCoverageRecord(null)]);
  const res = gate.stop({
    stop_hook_active: false,
    last_assistant_message: '我把当前的配置目录和空日志整理给你了，先到这里。',
  });
  expectExit(res, 2);
  expect(parseJson(res).reason).toMatch(/partial coverage/);
});

test('#124: generator profile gets the no-claim advisory and never blocks', () => {
  const dir = freshDir('jiahao-hooks-test-');
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'generator', 'utf8');
  const res = runHook('jiahao-verdict-gate.js', {
    dir: dir,
    stdin: JSON.stringify({ stop_hook_active: false, last_assistant_message: '现状报告：配置在 X，日志为空。' }),
  });
  expectExit(res, 0);
  const parsed = parseJson(res);
  expect(parsed.decision).toBeUndefined();
  expect(parsed.systemMessage).toMatch(/no completion claim/i);
});

test('#124: stop_hook_active reentry after the new decisions', () => {
  const gate = gateFixture();
  const payload = { stop_hook_active: false, last_assistant_message: '现状报告：配置在 X，日志为空。' };
  // First stop: judged by the claim gate and allowed. The re-entry assertion
  // below pins the host's stop_hook_active early return, which sits before
  // every judgment including the claim gate.
  expectExit(gate.stop(payload), 0);
  const reentry = gate.stop(Object.assign({}, payload, { stop_hook_active: true }));
  expectExit(reentry, 0);

  const claiming = { stop_hook_active: false, last_assistant_message: '任务完成，已验证。' };
  expectExit(gate.stop(claiming), 2); // claim without evidence blocks
  const claimedReentry = gate.stop(Object.assign({}, claiming, { stop_hook_active: true }));
  expectExit(claimedReentry, 0); // host already forced pass once
});
