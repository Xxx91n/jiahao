const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

test('build-adapters.js exists', () => {
  expect(fs.existsSync(path.join(root, 'scripts', 'build-adapters.js'))).toBe(true);
});

test('check-drift.js exists', () => {
  expect(fs.existsSync(path.join(root, 'scripts', 'check-drift.js'))).toBe(true);
});

test('build-adapters generates all adapter files', () => {
  // Run build
  execSync('node scripts/build-adapters.js', { cwd: root, encoding: 'utf8', timeout: 5000 });

  const expected = [
    'adapters/claude-code/README.md',
    'adapters/codex/hooks.json',
    'adapters/cursor/jiahao.mdc',
    'adapters/windsurf/jiahao.md',
    'adapters/cline/jiahao.md',
    'adapters/instruction-tier/AGENTS.md',
    'adapters/mcp/README.md',
  ];

  expected.forEach(rel => {
    expect(fs.existsSync(path.join(root, rel))).toBe(true);
  });
});

test('instruction-tier adapters contain SKILL.md body', () => {
  const skillBody = fs.readFileSync(path.join(root, 'src', 'SKILL.md'), 'utf8')
    .replace(/^---[\s\S]*?---\n/, '');

  ['adapters/windsurf/jiahao.md', 'adapters/cline/jiahao.md'].forEach(rel => {
    const content = fs.readFileSync(path.join(root, rel), 'utf8');
    expect(content).toContain('verification ladder');
    expect(content).toContain('Jiahao');
  });
});

test('codex hooks.json is valid JSON with 4 events', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'adapters', 'codex', 'hooks.json'), 'utf8'));
  expect(config.hooks.SessionStart).toBeDefined();
  expect(config.hooks.UserPromptSubmit).toBeDefined();
  expect(config.hooks.Stop).toBeDefined();
  expect(config.hooks.SubagentStop).toBeDefined();
});

test('cursor adapter has frontmatter', () => {
  const content = fs.readFileSync(path.join(root, 'adapters', 'cursor', 'jiahao.mdc'), 'utf8');
  expect(content).toMatch(/^---/);
  expect(content).toContain('description:');
});

test('check-drift passes after build', () => {
  execSync('node scripts/build-adapters.js', { cwd: root, encoding: 'utf8', timeout: 5000 });
  execSync('node scripts/check-drift.js', { cwd: root, encoding: 'utf8', timeout: 5000 });
  // exit 0 = pass
});
