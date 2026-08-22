// test/dual-profile.test.js — ADR-0010 dual-profile tests

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const TMP = require('os').tmpdir().replace(/\\/g, '/') + '/jiahao-dual-profile-test';

const skillPath = path.join(root, 'src', 'SKILL.md');

beforeAll(() => { fs.mkdirSync(TMP, { recursive: true }); });

test('SKILL.md has both profile sections', () => {
  const content = fs.readFileSync(skillPath, 'utf8');
  expect(content).toContain('## Generator Profile');
  expect(content).toContain('## Verifier Profile');
  expect(content).toContain('## Boundaries');
});

test('generator profile does NOT contain verifier-only terms', () => {
  const content = fs.readFileSync(skillPath, 'utf8');
  const genIdx = content.indexOf('## Generator Profile');
  const verIdx = content.indexOf('## Verifier Profile');
  const bndIdx = content.indexOf('## Boundaries');
  if (genIdx === -1 || verIdx === -1 || bndIdx === -1) return;
  const genSection = content.substring(genIdx, verIdx);
  expect(genSection).not.toContain('verification ladder');
  expect(genSection).not.toContain('second-party verifier');
  expect(genSection).not.toContain('The judge cannot be the author');
  expect(genSection).not.toContain('LLM critic');
});

test('verifier profile contains all required terms', () => {
  const content = fs.readFileSync(skillPath, 'utf8');
  const verIdx = content.indexOf('## Verifier Profile');
  const bndIdx = content.indexOf('## Boundaries');
  if (verIdx === -1 || bndIdx === -1) return;
  const verSection = content.substring(verIdx, bndIdx);
  expect(verSection).toContain('verification ladder');
  expect(verSection).toContain('The judge cannot be the author');
  expect(verSection).toContain('NOT VERIFIED');
  expect(verSection).toContain('anti-false-completion');
});

test('generator adapter has surface signal rules', () => {
  const genAdapter = fs.readFileSync(
    path.join(root, 'adapters', 'instruction-tier', 'AGENTS-generator.md'), 'utf8');
  expect(genAdapter).toContain('No evidence, no completion claim');
  expect(genAdapter).toContain('state changes');
  expect(genAdapter).toContain('calling a tool');
  expect(genAdapter).toContain('## Boundaries');
});

test('generator adapter does NOT contain verifier tools', () => {
  const genAdapter = fs.readFileSync(
    path.join(root, 'adapters', 'instruction-tier', 'AGENTS-generator.md'), 'utf8');
  const verdictWords = ['verification ladder', 'second-party verifier',
    'The judge cannot be the author', 'hash chain', 'confidence calibration',
    'independent LLM critic'];
  verdictWords.forEach(w => expect(genAdapter).not.toContain(w));
});

test('build-adapters generator output produces both profiles', () => {
  execSync('node scripts/build-adapters.js', { cwd: root, encoding: 'utf8', timeout: 5000 });
  expect(fs.existsSync(path.join(root, 'adapters', 'cursor', 'jiahao-generator.mdc'))).toBe(true);
  expect(fs.existsSync(path.join(root, 'adapters', 'windsurf', 'jiahao-generator.md'))).toBe(true);
  expect(fs.existsSync(path.join(root, 'adapters', 'cline', 'jiahao-generator.md'))).toBe(true);
  expect(fs.existsSync(path.join(root, 'adapters', 'instruction-tier', 'AGENTS-generator.md'))).toBe(true);
  // Verifier adapters remain unchanged
  expect(fs.existsSync(path.join(root, 'adapters', 'cursor', 'jiahao.mdc'))).toBe(true);
  expect(fs.existsSync(path.join(root, 'adapters', 'instruction-tier', 'AGENTS.md'))).toBe(true);
});

test('activate hook uses generator profile when flag set', () => {
  // Write generator flag
  fs.writeFileSync(path.join(TMP, '.jiahao-profile'), 'generator', 'utf8');
  fs.writeFileSync(path.join(TMP, '.jiahao-active'), 'full', 'utf8');
  try { fs.unlinkSync(path.join(TMP, '.jiahao-evidence')); } catch(e) {}

  const origDir = process.cwd();
  process.chdir(root);
  try {
    const output = execSync('node hooks/jiahao-activate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 5000,
    });
    // Generator profile should NOT contain verification ladder content
    expect(output).not.toContain('deterministic machine check');
    expect(output).not.toContain('second-party verifier');
    // Should contain generator rules
    expect(output).toContain('No evidence, no completion claim');
  } finally {
    process.chdir(origDir);
    try { fs.unlinkSync(path.join(TMP, '.jiahao-profile')); } catch(e) {}
    try { fs.unlinkSync(path.join(TMP, '.jiahao-active')); } catch(e) {}
  }
});

test('verdict-gate advisory mode for generator profile', () => {
  fs.writeFileSync(path.join(TMP, '.jiahao-profile'), 'generator', 'utf8');
  fs.writeFileSync(path.join(TMP, '.jiahao-active'), 'full', 'utf8');
  try { fs.unlinkSync(path.join(TMP, '.jiahao-evidence')); } catch(e) {}

  const origDir = process.cwd();
  process.chdir(root);
  try {
    const input = JSON.stringify({ stop_hook_active: false });
    execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: TMP },
      timeout: 5000,
      shell: 'bash',
    });
    // Generator mode: allow, not block
    expect(true).toBe(true); // no error thrown = allow
  } finally {
    process.chdir(origDir);
    try { fs.unlinkSync(path.join(TMP, '.jiahao-profile')); } catch(e) {}
    try { fs.unlinkSync(path.join(TMP, '.jiahao-active')); } catch(e) {}
  }
});

// Cleanup temp files after all tests
afterAll(() => {
  ['.jiahao-profile', '.jiahao-active', '.jiahao-evidence'].forEach(f => {
    try { fs.unlinkSync(path.join(TMP, f)); } catch(e) {}
  });
});
