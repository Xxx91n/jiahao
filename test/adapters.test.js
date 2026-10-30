const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, execFileSync, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

// #66: the generation path the suite uses writes a temp directory. The
// committed artifacts are compared by --check below; nothing here rewrites
// adapters/ or skills/.
function materializeToTemp() {
  const { writeAll } = require('../scripts/build-adapters');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-gen-'));
  try {
    const count = writeAll(dir);
    return { dir: dir, count: count };
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}

function countFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, entry) =>
    n + (entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1), 0);
}

test('build-adapters generates the retained exits', () => {
  const { buildAdapters } = require('../scripts/build-adapters');
  const emitted = Object.keys(buildAdapters());
  const { dir, count } = materializeToTemp();
  try {
    const expected = [
      'adapters/claude-code/README.md',
      'adapters/codebuddy/.claude-plugin/plugin.json',
      'adapters/codebuddy/hooks/hooks.json',
      'adapters/codebuddy/rules/jiahao-verifier.md',
      'adapters/codebuddy/rules/jiahao-generator.md',
      'adapters/copilot/plugin.json',
      'adapters/copilot/hooks/hooks.json',
      'adapters/copilot/skills/jiahao/SKILL.md',
      'skills/jiahao/SKILL.md',
    ];
    expected.forEach(rel => {
      expect(fs.existsSync(path.join(dir, rel))).toBe(true);
    });
    // Everything the generator produced reached the target - not just the six
    // exits above - so a writeAll that skips a file is red here.
    emitted.forEach(rel => {
      expect(fs.existsSync(path.join(dir, rel))).toBe(true);
    });
    expect(count).toBe(emitted.length);
    expect(countFiles(dir)).toBe(count);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the rules-version skill carries both profiles', () => {
  const { SKILL_DIR, buildAdapters } = require('../scripts/build-adapters');
  const content = buildAdapters()[SKILL_DIR + '/SKILL.md'];
  expect(content).toContain('## Generator Profile');
  expect(content).toContain('## Verifier Profile');
  expect(content).toContain('## Boundaries');
});

test('retired adapters are neither emitted nor present', () => {
  const { buildAdapters, RETIRED_HOSTS } = require('../scripts/build-adapters');
  const emitted = Object.keys(buildAdapters());
  // One list, in the generator (check-drift reads the same one). The floor is
  // what stops the list from being silently emptied instead of honoured.
  // copilot returned as a real bundle in #78 (codex returns in #77); the
  // remaining names are still refused by check-drift.
  expect(RETIRED_HOSTS.length).toBeGreaterThanOrEqual(8);
  for (const name of RETIRED_HOSTS) {
    expect(emitted.some(rel => rel.startsWith('adapters/' + name + '/'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'adapters', name))).toBe(false);
  }
});

test('build-adapters --check is green and accounts for every tracked generated file', () => {
  const out = execSync('node scripts/build-adapters.js --check', { cwd: root, encoding: 'utf8', timeout: 15000 });
  expect(out).toContain('regen-diff clean');
  const tracked = execSync('git ls-files -z -- adapters skills .claude-plugin', { cwd: root, encoding: 'utf8', timeout: 15000 })
    .split('\0').filter(Boolean).length;
  const m = out.match(/All (\d+) tracked generated files accounted for: (\d+) generated \+ (\d+) allowlisted/);
  expect(m).not.toBeNull();
  expect(Number(m[2]) + Number(m[3])).toBe(Number(m[1]));
  expect(Number(m[1])).toBe(tracked);
});

test('the generator emits the rules-version skill file', () => {
  const { buildAdapters } = require('../scripts/build-adapters');
  expect(Object.keys(buildAdapters())).toContain('skills/jiahao/SKILL.md');
});

// Literal roots, not the production constant: an emitted path outside every
// audited directory would be invisible to the tracked-set audit, and a test that
// reads the audit's own list cannot see that happen.
test('every generated path falls inside a directory the audit enumerates', () => {
  const { buildAdapters } = require('../scripts/build-adapters');
  const outside = Object.keys(buildAdapters())
    .filter(rel => !rel.startsWith('adapters/') && !rel.startsWith('skills/') && !rel.startsWith('.claude-plugin/'));
  expect(outside).toEqual([]);
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
  const allowlist = {
    'adapters/gone.js': 'why',
    'adapters/blank.js': '   ',
    'adapters/nully.js': null,
    'adapters/undef.js': undefined,
    'adapters/a.md': 'why',
  };
  const tracked = ['adapters/a.md', 'adapters/blank.js', 'adapters/nully.js', 'adapters/undef.js'];
  expect(auditTrackedSet({ 'adapters/a.md': 'x' }, tracked, allowlist)).toEqual([
    { kind: 'staleAllowlist', rel: 'adapters/gone.js' },
    { kind: 'allowlistReason', rel: 'adapters/blank.js' },
    { kind: 'allowlistReason', rel: 'adapters/nully.js' },
    { kind: 'allowlistReason', rel: 'adapters/undef.js' },
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

// Track a path in the throwaway index without putting a file in the working
// tree: the audit reads the index, and a probe on disk would race tests that
// package or read adapters/.
function stageOrphan(env, rel) {
  const blob = execFileSync('git', ['rev-parse', 'HEAD:src/SKILL.md'], { cwd: root, encoding: 'utf8' }).trim();
  execFileSync('git', ['update-index', '--add', '--cacheinfo', '100644,' + blob + ',' + rel], {
    cwd: root, env, encoding: 'utf8', timeout: 15000,
  });
}

function runCheck(env) {
  return spawnSync(process.execPath, ['scripts/build-adapters.js', '--check'], {
    cwd: root, env, encoding: 'utf8', timeout: 15000,
  });
}

test('--check goes red naming both sides of a tracked-set gap', () => {
  withTempIndex((env) => {
    stageOrphan(env, 'adapters/zz-orphan-probe.txt');
    execFileSync('git', ['rm', '--cached', '--quiet', '--', 'adapters/claude-code/README.md'], {
      cwd: root, env, encoding: 'utf8', timeout: 15000,
    });
    const res = runCheck(env);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('ORPHAN: adapters/zz-orphan-probe.txt');
    expect(res.stderr).toContain('UNTRACKED: adapters/claude-code/README.md');
  });
});

test('--check audits the skill directory in both directions', () => {
  withTempIndex((env) => {
    stageOrphan(env, 'skills/zz-orphan-probe/SKILL.md');
    execFileSync('git', ['rm', '--cached', '--quiet', '--', 'skills/jiahao/SKILL.md'], {
      cwd: root, env, encoding: 'utf8', timeout: 15000,
    });
    const res = runCheck(env);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('ORPHAN: skills/zz-orphan-probe/SKILL.md');
    expect(res.stderr).toContain('UNTRACKED: skills/jiahao/SKILL.md');
  });
});

// The marketplace manifest is as generated as the plugin dirs it points at.
// Without its directory in the audit root, deleting it from the index would
// leave --check green with the marketplace file gone from the tracked set.
test('--check audits the root marketplace manifest in both directions', () => {
  withTempIndex((env) => {
    stageOrphan(env, '.claude-plugin/zz-orphan-probe.json');
    execFileSync('git', ['rm', '--cached', '--quiet', '--', '.claude-plugin/marketplace.json'], {
      cwd: root, env, encoding: 'utf8', timeout: 15000,
    });
    const res = runCheck(env);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('ORPHAN: .claude-plugin/zz-orphan-probe.json');
    expect(res.stderr).toContain('UNTRACKED: .claude-plugin/marketplace.json');
  });
});

test('--check names a non-ASCII orphan instead of dropping it from the audit', () => {
  // Default core.quotePath would emit this path octal-escaped, hiding it
  // behind the `adapters/` prefix filter.
  const orphanRel = 'adapters/孤儿-探针.txt';
  withTempIndex((env) => {
    stageOrphan(env, orphanRel);
    const res = runCheck(env);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('ORPHAN: ' + orphanRel);
  });
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

test('check-drift passes on the committed tree', () => {
  // No build first: the gate reads the workspace as committed, which is what
  // the release gate depends on (its `drift` step runs before npm test).
  execSync('node scripts/check-drift.js', { cwd: root, encoding: 'utf8', timeout: 15000 });
  // exit 0 = pass
});

// #66: the suites that used to rerun the generator now write temp directories
// only. Proof: plant a hand edit in a workspace artifact, run those suites in a
// child jest process, and the edit is still there afterwards.
//
// The child runs only the two former offenders next to this file: nesting the
// whole suite put two copies of hooks.test.js's evidence chain in flight and
// flaked (measured once in five full runs), and adapters.test.js cannot spawn
// itself without recursing. The write-mode scan below covers every suite,
// including this one.
//
// The marker sits on the Claude Code README because no other suite reads that
// file's bytes: packaging packs the tree but asserts paths, and the --check
// tests that do read workspace bytes are above, in this file.
test('a hand edit in a workspace artifact survives the generation suites', () => {
  const rel = 'adapters/claude-code/README.md';
  const abs = path.join(root, rel);
  const original = fs.readFileSync(abs, 'utf8');
  const marker = String.fromCharCode(10) + '<!-- hand edit sentinel: npm test must not rewrite this file -->' + String.fromCharCode(10);
  // The child re-runs suites whose temp roots are fixed names under os.tmpdir()
  // (dual-profile, and every suite that reuses them); sharing the outer root
  // would let two copies fight over one config dir. Point it elsewhere.
  const childTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-child-'));
  fs.writeFileSync(abs, original + marker, 'utf8');
  try {
    const env = Object.assign({}, process.env, { TMPDIR: childTmp, TMP: childTmp, TEMP: childTmp });
    delete env.JEST_WORKER_ID;
    const res = spawnSync(process.execPath, [
      require.resolve('jest/bin/jest'), '--silent', '--runTestsByPath',
      'test/dual-profile.test.js', 'test/codebuddy-adapter.test.js',
    ], { cwd: root, env: env, encoding: 'utf8', timeout: 120000 });
    if (res.status !== 0) {
      throw new Error('child jest failed (status ' + res.status + (res.error ? ', ' + res.error.message : '') + '):' +
        String.fromCharCode(10) + String((res.stderr || '') + (res.stdout || '')).slice(-4000));
    }
    expect(fs.readFileSync(abs, 'utf8')).toBe(original + marker);
  } finally {
    fs.writeFileSync(abs, original, 'utf8');
    fs.rmSync(childTmp, { recursive: true, force: true });
  }
}, 120000);

// The sentinel proves those suites stay scoped; this says it for every suite in
// the directory, including this one. Write mode is the generator file without
// --check, or writeAll with no target. Requiring the module is fine.
const WRITE_MODE = /\bbuild-adapters\.js\b/;
const WRITE_ALL_NO_TARGET = /\bwriteAll\(\s*\)/;

function testSources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) return testSources(abs);
    return entry.isFile() && /\.js$/.test(entry.name) ? [abs] : [];
  });
}

test('no test runs the generator in write mode', () => {
  const files = testSources(path.join(root, 'test'));
  // A scan that walked nothing would report no offenders and prove nothing.
  expect(files.length).toBeGreaterThanOrEqual(15);
  const offenders = [];
  for (const file of files) {
    fs.readFileSync(file, 'utf8').split(String.fromCharCode(10)).forEach((line, i) => {
      const writes = (WRITE_MODE.test(line) && !/--check/.test(line)) || WRITE_ALL_NO_TARGET.test(line);
      if (writes) offenders.push(path.relative(root, file) + ':' + (i + 1) + ' ' + line.trim());
    });
  }
  expect(offenders).toEqual([]);
});
