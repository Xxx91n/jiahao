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
const { spawnSync } = require('child_process');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');

const generated = buildAdapters();
const BUNDLE = 'adapters/claude-code/';

describe('bundled Claude Code hooks (live spawn, temp config dir)', () => {
  let bundleDir;
  beforeAll(() => {
    bundleDir = materializeBundle(generated, BUNDLE);
  });
  afterAll(() => {
    if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
  });

  function runBundled(script, opts) {
    const env = Object.assign({}, process.env);
    for (const k of ['PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'QODER_SESSION_ID', 'CODEBUDDY_PLUGIN_ROOT']) delete env[k];
    env.CLAUDE_CONFIG_DIR = opts.configDir;
    env.CLAUDE_PLUGIN_ROOT = bundleDir;
    return spawnSync(process.execPath, [path.join(bundleDir, 'hooks', script)], {
      input: opts.stdin === undefined ? '{}' : opts.stdin,
      env: env, encoding: 'utf8', timeout: 15000,
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
    expect(res.status).toBe(2);
    const out = JSON.parse(res.stdout.trim());
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
  });

  test('SessionStart injects the verifier profile from the bundled SKILL.md', () => {
    const dir = configDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, stdin: '{}' });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Jiahao');
    expect(res.stdout).toContain('verification ladder');
  });
});
