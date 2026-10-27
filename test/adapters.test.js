const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

test('build-adapters generates all adapter files', () => {
  // Run build
  execSync('node scripts/build-adapters.js', { cwd: root, encoding: 'utf8', timeout: 15000 });

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
  expect(config.hooks.SubagentStart).toBeDefined();
});

test('cursor adapter has frontmatter', () => {
  const content = fs.readFileSync(path.join(root, 'adapters', 'cursor', 'jiahao.mdc'), 'utf8');
  expect(content).toMatch(/^---/);
  expect(content).toContain('description:');
});

test('build-adapters --check is green on the committed tree', () => {
  const out = execSync('node scripts/build-adapters.js --check', { cwd: root, encoding: 'utf8', timeout: 10000 });
  expect(out).toContain('regen-diff clean');
});

test('--check success output equals the tracked count: generated + allowlisted', () => {
  const out = execSync('node scripts/build-adapters.js --check', { cwd: root, encoding: 'utf8', timeout: 10000 });
  const tracked = execSync('git ls-files -- adapters', { cwd: root, encoding: 'utf8', timeout: 10000 })
    .trim().split('\n').filter(Boolean).length;
  const m = out.match(/All (\d+) tracked adapter files accounted for: (\d+) generated \+ (\d+) allowlisted/);
  expect(m).not.toBeNull();
  expect(Number(m[2]) + Number(m[3])).toBe(Number(m[1]));
  expect(Number(m[1])).toBe(tracked);
});

test('findOrphans names tracked files the generator does not produce', () => {
  const { findOrphans } = require('../scripts/build-adapters');
  const expected = { 'adapters/a.md': 'x' };
  const orphans = findOrphans(expected, ['adapters/a.md', 'adapters/stray.js'], {});
  expect(orphans).toEqual(['adapters/stray.js']);
});

test('findOrphans honours the declared exception list', () => {
  const { findOrphans } = require('../scripts/build-adapters');
  const allowlist = { 'adapters/declared.js': 'kept on purpose' };
  expect(findOrphans({}, ['adapters/declared.js'], allowlist)).toEqual([]);
});

test('--check goes red and names a tracked file the generator does not produce', () => {
  // Stage the probe in a throwaway index so the real one is never touched.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-index-'));
  const indexFile = path.join(tmp, 'index');
  const realIndex = path.resolve(root, execSync('git rev-parse --git-path index', { cwd: root, encoding: 'utf8' }).trim());
  fs.copyFileSync(realIndex, indexFile);
  const orphanRel = 'adapters/zz-orphan-probe.txt';
  const orphanAbs = path.join(root, orphanRel);
  const env = Object.assign({}, process.env, { GIT_INDEX_FILE: indexFile });
  fs.writeFileSync(orphanAbs, 'probe\n');
  try {
    execSync('git add -- ' + orphanRel, { cwd: root, env, encoding: 'utf8', timeout: 15000 });
    const res = spawnSync(process.execPath, ['scripts/build-adapters.js', '--check'], {
      cwd: root, env, encoding: 'utf8', timeout: 15000,
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('ORPHAN: ' + orphanRel);
  } finally {
    fs.unlinkSync(orphanAbs);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('unifiedDiff emits unified hunks with -/+ lines', () => {
  const { unifiedDiff } = require('../scripts/build-adapters');
  const diff = unifiedDiff('x.md', 'a\nb\nc\n', 'a\nB\nc\n');
  expect(diff).toContain('--- a/x.md');
  expect(diff).toContain('+++ b/x.md');
  expect(diff).toContain('@@ -1,4 +1,4 @@');
  expect(diff).toContain('-b');
  expect(diff).toContain('+B');
});

test('checkAll reports a missing adapter file', () => {
  const { buildAdapters } = require('../scripts/build-adapters');
  const expected = Object.keys(buildAdapters());
  expect(expected.length).toBeGreaterThan(0);
  expected.forEach(rel => {
    expect(fs.existsSync(path.join(root, rel))).toBe(true);
  });
});

test('check-drift passes after build', () => {
  execSync('node scripts/build-adapters.js', { cwd: root, encoding: 'utf8', timeout: 15000 });
  execSync('node scripts/check-drift.js', { cwd: root, encoding: 'utf8', timeout: 15000 });
  // exit 0 = pass
});
