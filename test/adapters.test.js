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
      'adapters/codex/.codex-plugin/plugin.json',
      'adapters/codex/hooks/hooks.json',
      '.agents/plugins/marketplace.json',
      'adapters/qoder/README.md',
      'adapters/qoder/rules/jiahao.md',
      // #109: Qoder Desktop became a plugin row, so its two wiring files join
      // the retained-exit list a dropped scaffold would disappear from.
      'adapters/qoder/.qoder-plugin/plugin.json',
      'adapters/qoder/hooks/hooks.json',
      'skills/jiahao/SKILL.md',
    ];
    expected.forEach(rel => {
      expect(fs.existsSync(path.join(dir, rel))).toBe(true);
    });
    // Everything the generator produced reached the target - not just the
    // exits listed above - so a writeAll that skips a file is red here.
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
  const { buildAdapters, RETIRED_HOSTS, HOSTS } = require('../scripts/build-adapters');
  const emitted = Object.keys(buildAdapters());
  // One list, in the generator (check-drift reads the same one). The floor is
  // what stops the list from being silently emptied instead of honoured.
  // codex left in #77, copilot in #78, and qoder in #79, so seven names remain. The loop proves none of them is emitted or present; check-drift
  // refuses a directory for any listed name, and "check-drift passes on the
  // committed tree" below runs it.
  expect(RETIRED_HOSTS.length).toBeGreaterThanOrEqual(7);
  for (const name of RETIRED_HOSTS) {
    expect(emitted.some(rel => rel.startsWith('adapters/' + name + '/'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'adapters', name))).toBe(false);
  }
  // A host row and a retirement entry cannot name the same host: that would mean
  // #62's convergence is fighting the generator.
  const retiredAndShipped = HOSTS.filter(host => RETIRED_HOSTS.includes(host.name)).map(host => host.name);
  expect(retiredAndShipped).toEqual([]);
});

test('build-adapters --check is green and accounts for every tracked generated file', () => {
  const out = execSync('node scripts/build-adapters.js --check', { cwd: root, encoding: 'utf8', timeout: 15000 });
  expect(out).toContain('regen-diff clean');
  const tracked = execSync('git ls-files -z -- adapters skills .claude-plugin .agents', { cwd: root, encoding: 'utf8', timeout: 15000 })
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

describe('Qoder Desktop exit (#79 rules file, #109 turn-end gate)', () => {
  const { buildAdapters } = require('../scripts/build-adapters');
  const generated = buildAdapters();
  const PREFIX = 'adapters/qoder/';
  const bodyOf = (text) => text.replace(/^---[\s\S]*?---\n/, '');

  test('the Desktop plugin upgrade keeps the IDE/CLI rule exit in the same directory', () => {
    // #109's DoD names both halves: an A-tier bundle for Desktop AND the
    // preserved rules exit. The bundle's own shape is asserted by
    // test/plugin-bundles.test.js and test/qoder-adapter.test.js; this pins the
    // half that could silently disappear when `manifest: null` became a manifest.
    const emitted = Object.keys(generated).filter((rel) => rel.startsWith(PREFIX));
    expect(emitted).toContain(PREFIX + 'rules/jiahao.md');
    expect(emitted).toContain(PREFIX + '.qoder-plugin/plugin.json');
    expect(emitted).not.toContain(PREFIX + '.mcp.json');
  });

  test('the rule body is the rules-version body', () => {
    expect(bodyOf(generated[PREFIX + 'rules/jiahao.md']))
      .toBe(bodyOf(generated['skills/jiahao/SKILL.md']));
  });

  test('the Desktop path is the standard skill directory, not the IDE rule file', () => {
    // #106: Qoder Desktop reads the rules version's skill, while the adapter
    // rule file stays on the IDE/CLI project-rules path. Pin the shape each
    // side consumes so the README cannot point Desktop at the wrong artifact.
    const shippedSkill = generated['skills/jiahao/SKILL.md'];
    expect(shippedSkill).toMatch(/^---\nname: jiahao\n/);
    expect(shippedSkill).not.toContain('alwaysApply');
    expect(generated[PREFIX + 'rules/jiahao.md']).toContain('alwaysApply: true');
  });

  test('the install manual claims A only for the build that was measured', () => {
    const readme = generated[PREFIX + 'README.md'];
    expect(readme).toContain('Qoder CN Desktop 0.4.11');
    expect(readme).toContain('Qoder international Desktop 0.4.11');
    expect(readme).toContain('Qoder IDE/CLI');
    // The block claim is allowed now, but only with its evidence beside it.
    const desktopStart = readme.indexOf('## What was observed on Qoder CN Desktop');
    expect(desktopStart).toBeGreaterThanOrEqual(0);
    const observed = readme.slice(desktopStart, readme.indexOf('## Declared-unverified'));
    expect(observed).toContain('qoder-hook-calls.jsonl');
    expect(observed).toContain('stop_hook_active');
    // The unprobed surfaces keep the #79 discipline: a claim they were watched
    // firing would be the "会拦" mistake the tier contract forbids.
    const unverified = readme.slice(readme.indexOf('## Declared-unverified'),
      readme.indexOf('## Qoder Desktop - plugin'));
    for (const phrase of ['plugin registration surface', 'QODER_PLUGIN_ROOT', 'QODER_SESSION_ID']) {
      expect(unverified).toContain(phrase);
    }
    // Neither the skill directory nor the IDE rule file may read as a hook.
    const ideStart = readme.indexOf('## Qoder IDE/CLI');
    const rulesSection = readme.slice(ideStart, readme.indexOf('## Verification status'));
    expect(rulesSection).toContain('registers nothing');
    expect(rulesSection).not.toMatch(/Stop hook|verdict gate/i);
    expect(readme).toContain('npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy');
    expect(readme).toContain('~/.qoder-cn/skills/jiahao/SKILL.md');
  });

  test('the install evidence file carries the numbers the docs cite', () => {
    const evidence = fs.readFileSync(
      path.join(root, 'docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md'), 'utf8');
    const runAStart = evidence.indexOf('## Run A');
    const runBStart = evidence.indexOf('## Run B');
    const intlStart = evidence.indexOf('## International');
    expect(runAStart).toBeGreaterThanOrEqual(0);
    expect(runBStart).toBeGreaterThan(runAStart);
    expect(intlStart).toBeGreaterThan(runBStart);
    const runA = evidence.slice(runAStart, runBStart);
    const runB = evidence.slice(runBStart, intlStart);
    expect(runA).toContain('npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy');
    expect(runA).toContain('# exit 0');
    expect(runA).toContain('1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9');
    expect(runB).toContain('0.4.11');
    expect(runB).toMatch(/reported in Run B/i);
  });

  test('both READMEs rate Desktop by build and keep the IDE rules path claim-free', () => {
    const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    const zh = fs.readFileSync(path.join(root, 'README-zh-CN.md'), 'utf8');
    expect(en).toContain('adapters/qoder/');
    expect(en).toMatch(/no enforcement/i);
    expect(en).toMatch(/declared-unverified|not live-probed/i);
    expect(en).not.toMatch(/codex, copilot, qoder/i);
    expect(zh).toContain('adapters/qoder/');
    expect(zh).toContain('只加载规则');
    expect(zh).toContain('没有强制');
    expect(zh).toMatch(/declared-unverified|尚未真机验证/i);
    expect(zh).not.toMatch(/codex、copilot、qoder/i);
    // The blocking-claim guard applies to the Qoder IDE/CLI path and to the
    // international Desktop, not to the one Desktop build that was measured.
    const enQoder = en.slice(en.indexOf('#### Qoder'), en.indexOf('### Plugin version'));
    const zhQoder = zh.slice(zh.indexOf('#### Qoder'), zh.indexOf('### 插件版'));
    const blocking = /\bwill block\b|\bblocks?\b|\bstops?\b|\bprevents?\b|会拦|拦截/i;
    // #106: the rules version's skill directory stays the no-hook recipe, and
    // `~/.qoder/rules` was the specific wrong path from v0.3.0.
    for (const section of [enQoder, zhQoder]) {
      expect(section).toContain('-a qoder-cn');
      expect(section).toContain('~/.qoder-cn/skills/jiahao/SKILL.md');
      expect(section).toContain('.qoder/rules/');
      expect(section).not.toContain('~/.qoder/rules');
    }
    const enSplit = enQoder.indexOf('**Qoder IDE/CLI**');
    const zhSplit = zhQoder.indexOf('**Qoder IDE/CLI**');
    expect(enSplit).toBeGreaterThan(0);
    expect(zhSplit).toBeGreaterThan(0);
    for (const section of [enQoder.slice(enSplit), zhQoder.slice(zhSplit)]) {
      expect(section).not.toMatch(blocking);
    }
    // #109: the Desktop half may say the gate blocks, but only with the run
    // record named beside it and the untested build called out.
    const enDesktop = enQoder.slice(0, enSplit);
    const zhDesktop = zhQoder.slice(0, zhSplit);
    for (const [section, evidence] of [[enDesktop, 'qoder-hook-probe-2026-10-31.md'],
      [zhDesktop, 'qoder-hook-probe-2026-10-31.md']]) {
      expect(section).toContain('npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy');
      expect(section).toContain('qoder-desktop-install-2026-10-31.md');
      expect(section).toContain(evidence);
    }
    expect(enDesktop).toMatch(/Qoder CN Desktop 0\.4\.11/i);
    expect(zhDesktop).toMatch(/Qoder CN Desktop 0\.4\.11/i);
    for (const section of [enDesktop, zhDesktop]) {
      expect(section).toMatch(/international|国际版/i);
      expect(section).toMatch(/not live-probed|declared-unverified|尚未真机验证/);
    }
  });

  test('the #109 numbers the README cites are in the artifacts, not just the prose', () => {
    const dir = path.join(root, 'docs/evidence/v0.3.0');
    const calls = fs.readFileSync(path.join(dir, 'qoder-hook-calls.jsonl'), 'utf8')
      .trim().split('\n').map((l) => JSON.parse(l));
    const blocksBy = (sid) => calls.filter((c) =>
      c.payload.session_id.startsWith(sid) && c.action.startsWith('block-')).length;
    // Written from the runs, so editing the log without editing the record goes red.
    expect(blocksBy('97d52e4d')).toBe(1);   // exit 0 + flat decision
    expect(blocksBy('53e7f9c2')).toBe(6);   // same channel, capped at 6
    expect(blocksBy('2f2199e1')).toBe(3);   // exit 2 + stderr
    expect(calls.length).toBe(15);   // 14 from the three runs + the env-only call
    // The re-entry flag the gate relies on, counted where it was recorded.
    expect(calls.filter((c) => c.payload.stop_hook_active).length).toBe(10);
    // The host fed every block back into the conversation: same counts.
    const injected = fs.readFileSync(path.join(dir, 'qoder-transcript-block-lines.jsonl'), 'utf8')
      .trim().split('\n').map((l) => JSON.parse(l));
    expect(injected).toHaveLength(10);
    for (const sid of ['97d52e4d', '53e7f9c2', '2f2199e1']) {
      expect(injected.filter((l) => l.sessionId.startsWith(sid)).length).toBe(blocksBy(sid));
    }
    // And the prose cites those files rather than restating their contents.
    const record = fs.readFileSync(path.join(dir, 'qoder-hook-probe-2026-10-31.md'), 'utf8');
    for (const needle of ['qoder-hook-calls.jsonl', 'stop_hook_active', 'exit 2',
      '.qoder/settings.json', 'qoder-runtime-hook-schema.txt']) {
      expect(record).toContain(needle);
    }
    // The negative half: the variant nobody watched is named, and stays C.
    expect(record).toMatch(/international/i);
    expect(record).toMatch(/never watched|not probed|was not observed/i);
  });
});

// Literal roots, not the production constant: an emitted path outside every
// audited directory would be invisible to the tracked-set audit, and a test that
// reads the audit's own list cannot see that happen.
test('every generated path falls inside a directory the audit enumerates', () => {
  const { buildAdapters } = require('../scripts/build-adapters');
  const outside = Object.keys(buildAdapters())
    .filter(rel => !rel.startsWith('adapters/') && !rel.startsWith('skills/')
      && !rel.startsWith('.claude-plugin/') && !rel.startsWith('.agents/'));
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

// #77: the Codex marketplace is a second shelf for the same repository, and it
// is generated too. Auditing only `.claude-plugin/` would let its deletion pass.
test('--check audits the Codex marketplace manifest in both directions', () => {
  withTempIndex((env) => {
    stageOrphan(env, '.agents/plugins/zz-orphan-probe.json');
    execFileSync('git', ['rm', '--cached', '--quiet', '--', '.agents/plugins/marketplace.json'], {
      cwd: root, env, encoding: 'utf8', timeout: 15000,
    });
    const res = runCheck(env);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('ORPHAN: .agents/plugins/zz-orphan-probe.json');
    expect(res.stderr).toContain('UNTRACKED: .agents/plugins/marketplace.json');
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
