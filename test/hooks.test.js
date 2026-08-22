const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TMP = require('os').tmpdir().replace(/\\/g, '/');

const hooksDir = path.join(__dirname, '..', 'hooks');

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
