const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TMP = require('os').tmpdir().replace(/\\/g, '/') + '/jiahao-hooks-test';

const hooksDir = path.join(__dirname, '..', 'hooks');
const { createEvidence } = require(path.join(__dirname, '..', 'src', 'gate.js'));
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
  expect(['claude', 'codex', 'copilot', 'qoder']).toContain(host);
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
      timeout: 5000,
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
      timeout: 5000,
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
      timeout: 5000,
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
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([{gate_id: 'det-0', status: 'passed'}]), 'utf8');
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 5000,
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
      timeout: 5000,
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
      timeout: 5000,
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

test('jiahao-paths module exports flagPath and evidencePath', () => {
  const { flagPath, evidencePath } = require(path.join(hooksDir, 'jiahao-paths.js'));
  expect(typeof flagPath).toBe('function');
  expect(typeof evidencePath).toBe('function');
  expect(flagPath()).toContain('.jiahao-active');
  expect(evidencePath()).toContain('.jiahao-evidence');
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
      timeout: 5000,
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
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify([{gate_id: 'det-0', status: 'passed'}]), 'utf8');
  const input = JSON.stringify({ stop_hook_active: false });
  try {
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 5000, shell: 'bash',
    });
    // ADR-0012 D4: file must still exist after the hook accepted the stop.
    expect(fs.existsSync(TMP + '/.jiahao-evidence')).toBe(true);
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 5000, shell: 'bash',
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
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 5000, shell: 'bash',
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
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 5000, shell: 'bash',
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
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 5000, shell: 'bash',
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
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 5000, shell: 'bash',
    });
  } catch (e) {
    throw new Error('verifier profile should pass with clean evidence, got ' + e.status);
  } finally {
    try { fs.unlinkSync(TMP + '/.jiahao-profile'); } catch (e_) {}
    try { fs.unlinkSync(TMP + '/.jiahao-evidence'); } catch (e_) {}
    process.chdir(origDir);
  }
});
