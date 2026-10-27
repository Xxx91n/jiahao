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

test('build-adapters --check is green and accounts for every tracked adapter', () => {
  const out = execSync('node scripts/build-adapters.js --check', { cwd: root, encoding: 'utf8', timeout: 15000 });
  expect(out).toContain('regen-diff clean');
  const tracked = execSync('git ls-files -z -- adapters', { cwd: root, encoding: 'utf8', timeout: 15000 })
    .split('\0').filter(Boolean).length;
  const m = out.match(/All (\d+) tracked adapter files accounted for: (\d+) generated \+ (\d+) allowlisted/);
  expect(m).not.toBeNull();
  expect(Number(m[2]) + Number(m[3])).toBe(Number(m[1]));
  expect(Number(m[1])).toBe(tracked);
});

test('auditTrackedSet names tracked files the generator does not produce', () => {
  const { auditTrackedSet } = require('../scripts/build-adapters');
  const problems = auditTrackedSet({ 'adapters/a.md': 'x' }, ['adapters/a.md', 'adapters/stray.js'], {});
  expect(problems).toEqual([{ kind: 'orphan', rel: 'adapters/stray.js' }]);
});

test('auditTrackedSet honours the declared exception list', () => {
  const { auditTrackedSet } = require('../scripts/build-adapters');
  const allowlist = { 'adapters/declared.js': 'kept on purpose' };
  expect(auditTrackedSet({}, ['adapters/declared.js'], allowlist)).toEqual([]);
});

test('auditTrackedSet reports generated files missing from the tracked set', () => {
  const { auditTrackedSet } = require('../scripts/build-adapters');
  expect(auditTrackedSet({ 'adapters/a.md': 'x' }, [], {}))
    .toEqual([{ kind: 'untracked', rel: 'adapters/a.md' }]);
});

test('auditTrackedSet reports stale, redundant, and unjustified allowlist entries', () => {
  const { auditTrackedSet } = require('../scripts/build-adapters');
  const allowlist = { 'adapters/gone.js': 'why', 'adapters/blank.js': '   ', 'adapters/a.md': 'why' };
  expect(auditTrackedSet({ 'adapters/a.md': 'x' }, ['adapters/a.md', 'adapters/blank.js'], allowlist)).toEqual([
    { kind: 'staleAllowlist', rel: 'adapters/gone.js' },
    { kind: 'allowlistReason', rel: 'adapters/blank.js' },
    { kind: 'redundantAllowlist', rel: 'adapters/a.md' },
  ]);
});

// A throwaway copy of the index so probes never touch the real one.
function withTempIndex(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-index-'));
  const indexFile = path.join(tmp, 'index');
  const realIndex = path.resolve(root, execSync('git rev-parse --git-path index', { cwd: root, encoding: 'utf8' }).trim());
  fs.copyFileSync(realIndex, indexFile);
  const env = Object.assign({}, process.env, { GIT_INDEX_FILE: indexFile });
  try {
    return fn(env);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function runCheck(env) {
  return spawnSync(process.execPath, ['scripts/build-adapters.js', '--check'], {
    cwd: root, env, encoding: 'utf8', timeout: 15000,
  });
}

test('--check goes red naming both sides of a tracked-set gap', () => {
  const orphanRel = 'adapters/zz-orphan-probe.txt';
  const orphanAbs = path.join(root, orphanRel);
  fs.writeFileSync(orphanAbs, 'probe\n');
  try {
    withTempIndex((env) => {
      execSync('git add -- ' + orphanRel, { cwd: root, env, encoding: 'utf8', timeout: 15000 });
      execSync('git rm --cached --quiet -- adapters/claude-code/README.md', {
        cwd: root, env, encoding: 'utf8', timeout: 15000,
      });
      const res = runCheck(env);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain('ORPHAN: ' + orphanRel);
      expect(res.stderr).toContain('UNTRACKED: adapters/claude-code/README.md');
    });
  } finally {
    fs.unlinkSync(orphanAbs);
  }
});

test('--check fails closed when git is unavailable', () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-path-'));
  try {
    const res = runCheck(Object.assign({}, process.env, { PATH: emptyDir }));
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('cannot list tracked files');
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
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
