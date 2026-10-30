'use strict';
// test/codebuddy-adapter.test.js - behavior of the shipped CodeBuddy bundle
// (grill-t30 D-002): the live semantics a contract matrix cannot see
// (InstructionsLoaded telemetry, the Stop gate, the PreToolUse deny envelope).
//
// The bundle is materialized from the in-memory generator output, never read
// from adapters/: #76 moved the structural assertions to
// test/plugin-bundles.test.js and removed the last workspace reads here.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle, assertAbsolutePluginRoot } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, describeSpawn, hostEnv } = require('./helpers/spawned-hook');

// A key into the generator's map, NOT a directory (#84). The old name read like
// a path, so path.join() onto it silently produced a relative path that
// resolved against the test process's cwd - a merge with #75 had zero textual
// conflicts and turned this suite red for three CI runs.
const GENERATED_PREFIX = 'adapters/codebuddy/';
const generated = buildAdapters();
let bundleDir;

beforeAll(() => {
  bundleDir = materializeBundle(generated, GENERATED_PREFIX);
});

afterAll(() => {
  if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

function mkConfigDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-cb-'));
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full');
  for (const name of Object.keys(files || {})) {
    fs.writeFileSync(path.join(dir, name), files[name], 'utf8');
  }
  return dir;
}

function runBundleHook(script, opts) {
  const o = opts || {};
  const pluginRoot = o.pluginRoot === undefined ? bundleDir : o.pluginRoot;
  // Structure, not convention: a relative root makes every containment
  // assertion measure the wrong thing while still passing. The default is the
  // materialized directory the hook is spawned from, and it is checked too.
  assertAbsolutePluginRoot(pluginRoot);
  return spawnHook(path.join(bundleDir, 'hooks', script), {
    stdin: o.stdin, env: hostEnv(o.configDir, pluginRoot),
  });
}

describe('hook behavior (bundle copies, live spawn)', () => {
  test('InstructionsLoaded asserts rules presence + sha256 into the telemetry log', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const res = runBundleHook('jiahao-instructions-assert.js', { configDir: dir, pluginRoot: bundleDir });
    expectExit(res, 0);
    const log = fs.readFileSync(path.join(dir, '.jiahao-instructions.jsonl'), 'utf8');
    const rec = JSON.parse(log.trim().split('\n').pop());
    expect(rec.event).toBe('InstructionsLoaded');
    expect(rec.results.length).toBe(2);
    for (const r of rec.results) {
      expect(r.present).toBe(true);
      expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(r.alwaysApply).toBe(true);
    }
  });

  test('InstructionsLoaded records absent rules honestly when the root lacks them', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-cb-root-'));
    const res = runBundleHook('jiahao-instructions-assert.js', { configDir: dir, pluginRoot: emptyRoot });
    expectExit(res, 0);
    const rec = JSON.parse(fs.readFileSync(path.join(dir, '.jiahao-instructions.jsonl'), 'utf8').trim().split('\n').pop());
    expect(rec.results.every((r) => r.present === false)).toBe(true);
  });

  // The bundle is what the host runs, so the Stop gate is spawned from it.
  // Regression: calibration.js loads the instrument-identity pin at require()
  // time; a bundle missing that file crashed (exit 1) instead of gating.
  test('bundled Stop gate blocks an empty evidence chain (exit 2)', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const res = runBundleHook('jiahao-verdict-gate.js', {
      configDir: dir, pluginRoot: bundleDir,
      stdin: JSON.stringify({ stop_hook_active: false, session_id: 'probe' }),
    });
    expectExit(res, 2);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
  });

  test('PreToolUse denies an enforcement-surface edit under verifier profile (envelope, exit 0)', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const res = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'adapters/codebuddy/rules/jiahao-verifier.md' } }),
    });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    const rec = JSON.parse(fs.readFileSync(path.join(dir, '.jiahao-pretool.jsonl'), 'utf8').trim().split('\n').pop());
    expect(rec.decision).toBe('deny');
  });

  test('PreToolUse denies command-payload bypass shapes (audit B-4 regression)', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const shapes = [
      'rm rules/jiahao-verifier.md',
      'rm C:/x/plugin/rules/jiahao-verifier.md extra',
      'cat .jiahao-pretool.jsonl',
      'rm -rf hooks/jiahao-pretool-guard.js',
      // #75: none of these are name fragments any more - containment under the
      // bundle root is what protects them, so they are pinned by the host's own
      // absolute spelling (the reading a real tool_input carries). bundleDir, not
      // GENERATED_PREFIX: a key into the generator's map ('adapters/codebuddy/'),
      // and joining onto it silently produces a relative path that resolves
      // wherever the test process happens to sit - which is how this assertion
      // went red in a merge with no textual conflict.
      'rm ' + path.join(bundleDir, 'hooks', 'hooks.json'),
      'rm ' + path.join(bundleDir, '.mcp.json'),
      'move ' + path.join(bundleDir, '.claude-plugin', 'plugin.json') + ' out.json',
      'rm ' + path.join(bundleDir, 'src', 'SKILL.md'),
      'rm ' + path.join(bundleDir, 'src', 'shared', 'paths.js'),
    ];
    for (const command of shapes) {
      const res = runBundleHook('jiahao-pretool-guard.js', {
        configDir: dir, pluginRoot: bundleDir,
        stdin: JSON.stringify({ tool_name: 'Bash', tool_input: { command: command } }),
      });
      // Name the shape when the guard stays silent. An empty stdout here means a
      // tool call that should have been denied went through, and JSON.parse's
      // "Unexpected end of JSON input" says nothing about which payload did it.
      if (res.status !== 0 || !String(res.stdout).trim()) {
        throw new Error('shape not denied: ' + JSON.stringify({ payload: command }) +
          ' — ' + describeSpawn(res));
      }
      expect(parseJson(res).hookSpecificOutput.permissionDecision).toBe('deny');
    }
    // non-protected payloads still pass silently
    const benign = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm rules/other.md && cat README.md' } }),
    });
    expectExit(benign, 0);
    expect(benign.stdout.trim()).toBe('');
  });

  // #75: `.mcp.json`, `hooks/hooks.json` and `.claude-plugin/plugin.json` are
  // ordinary filenames in any user project. They belong to the enforcement
  // surface only INSIDE the plugin root, so a bare or elsewhere-anchored
  // occurrence must pass silently and must not be counted as a bypass attempt.
  test('PreToolUse leaves a user project\'s own same-named files alone (#75)', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    // A scratch user project, not this repo: the repo root is itself a plugin
    // source, so its own .claude-plugin/ is apparatus by another route and the
    // assertion would not be about a stranger's project.
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-user-project-'));
    const ownFiles = ['.mcp.json', path.join('hooks', 'hooks.json'), path.join('.claude-plugin', 'plugin.json')]
      .map((rel) => path.join(project, rel));
    for (const abs of ownFiles) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, '{}', 'utf8');
    }
    const commands = [
      'rm .mcp.json',
      'del hooks\\hooks.json',
      'move .claude-plugin/plugin.json out.json',
    ].concat(ownFiles.map((p) => 'rm ' + p));
    for (const command of commands) {
      const res = runBundleHook('jiahao-pretool-guard.js', {
        configDir: dir, pluginRoot: bundleDir,
        stdin: JSON.stringify({ tool_name: 'Bash', tool_input: { command: command } }),
      });
      expectExit(res, 0);
      expect(res.stdout.trim()).toBe('');
    }
    for (const file_path of ownFiles) {
      const res = runBundleHook('jiahao-pretool-guard.js', {
        configDir: dir, pluginRoot: bundleDir,
        stdin: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file_path } }),
      });
      expectExit(res, 0);
      expect(res.stdout.trim()).toBe('');
    }
    // nothing was recorded either: a non-attempt is not telemetry
    expect(fs.existsSync(path.join(dir, '.jiahao-pretool.jsonl'))).toBe(false);
  });

  // The host sends an absolute file_path; a directory name with a space inside it
  // must not switch containment off (CodeRabbit Major on PR #83).
  test('PreToolUse denies a spaced absolute path inside the plugin root', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const spaced = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao spaced-'));
    const hookMap = path.join(spaced, 'hooks', 'hooks.json');
    fs.mkdirSync(path.dirname(hookMap), { recursive: true });
    fs.writeFileSync(hookMap, '{}', 'utf8');
    const res = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: spaced,
      stdin: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: hookMap } }),
    });
    expectExit(res, 0);
    expect(parseJson(res).hookSpecificOutput.permissionDecision).toBe('deny');

    const outside = path.join(spaced, '..', 'John Doe project', '.mcp.json');
    const benign = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: spaced,
      stdin: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: outside } }),
    });
    expect(benign.stdout.trim()).toBe('');
  });

  test('PreToolUse is silent on ordinary tool calls and under generator profile', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const benign = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'src/foo.js' } }),
    });
    expectExit(benign, 0);
    expect(benign.stdout.trim()).toBe('');

    const dirG = mkConfigDir({ '.jiahao-profile': 'generator' });
    const gen = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dirG, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '.codebuddy/rules/jiahao-verifier.md' } }),
    });
    expectExit(gen, 0);
    expect(gen.stdout.trim()).toBe(''); // observe-recorded, never denied
    const rec = JSON.parse(fs.readFileSync(path.join(dirG, '.jiahao-pretool.jsonl'), 'utf8').trim().split('\n').pop());
    expect(rec.decision).toBe('observe');
  });

  test('both new hooks are fail-soft on empty and garbage stdin', () => {
    for (const s of ['jiahao-instructions-assert.js', 'jiahao-pretool-guard.js']) {
      const a = runBundleHook(s, { configDir: mkConfigDir(), stdin: '' });
      const b = runBundleHook(s, { configDir: mkConfigDir(), stdin: 'not json{{{' });
      expectExit(a, 0);
      expectExit(b, 0);
    }
  });

  // #84: the structure assertion that makes the rename enforceable. A relative
  // root used to be accepted and silently joined, so the containment assertions
  // measured a path relative to whichever cwd the suite ran in. This one has to
  // fail if the check is removed: runBundleHook must refuse the key, not spawn.
  test('runBundleHook refuses a relative pluginRoot (the map key is not a path)', () => {
    expect(() => runBundleHook('jiahao-pretool-guard.js', {
      configDir: mkConfigDir(), pluginRoot: GENERATED_PREFIX,
    })).toThrow(/absolute/);
  });
});
