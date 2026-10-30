'use strict';
// test/claude-code-plugin.test.js - behavior of the shipped Claude Code bundle:
// the bytes are spawned from a temp materialization of the generator output, so
// the suite exercises what the host runs without reading (or writing) the
// workspace. #76 moved the structural assertions to test/plugin-bundles.test.js,
// which runs them for every row of the host table.
//
// What this file still pins is Claude-Code-specific: the turn-end block and the
// SessionStart injection, on the bundled copies.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');

const generated = buildAdapters();
// The generator map's key, not a directory - same #84 rename as the codebuddy
// suite, so no reference can silently join a path onto it again.
const GENERATED_PREFIX = 'adapters/claude-code/';

describe('bundled Claude Code hooks (live spawn, temp config dir)', () => {
  let bundleDir;
  beforeAll(() => {
    bundleDir = materializeBundle(generated, GENERATED_PREFIX);
  });
  afterAll(() => {
    if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
  });

  function runBundled(script, opts) {
    return spawnHook(path.join(bundleDir, 'hooks', script), {
      stdin: opts.stdin, env: hostEnv(opts.configDir, bundleDir),
    });
  }

  function configDir(profile) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-cc-'));
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), profile, 'utf8');
    return dir;
  }

  test('a completion claim with an empty evidence chain is blocked (exit 2)', () => {
    const dir = configDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, stdin: JSON.stringify({ stop_hook_active: false, session_id: 'probe' }),
    });
    expectExit(res, 2);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
  });

  test('SessionStart injects the verifier profile from the bundled SKILL.md', () => {
    const dir = configDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, stdin: '{}' });
    expectExit(res, 0);
    expect(res.stdout).toContain('Jiahao');
    expect(res.stdout).toContain('verification ladder');
  });
});
