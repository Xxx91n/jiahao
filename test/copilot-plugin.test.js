'use strict';
// test/copilot-plugin.test.js - #78: what the shipped Copilot CLI bundle looks
// like to the host. The bytes are spawned from a temp materialization of the
// generator output, so the suite exercises what the host runs without reading
// (or writing) the workspace. Structure (manifest, hook map, vendored closure)
// is test/plugin-bundles.test.js's job for every row; this file pins the two
// shapes Copilot actually consumes: the sessionStart injection envelope and the
// agentStop block decision.
//
// Copilot's dialect: `additionalContext` on stdout for sessionStart, and
// `{decision:"block", reason}` for agentStop - the decision field blocks, the
// exit code does not (exit 2 is only a warning outside preToolUse).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');

const generated = buildAdapters();
const GENERATED_PREFIX = 'adapters/copilot/';

describe('bundled Copilot CLI hooks (live spawn, temp config dir)', () => {
  let bundleDir;
  beforeAll(() => {
    bundleDir = materializeBundle(generated, GENERATED_PREFIX);
  });
  afterAll(() => {
    if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
  });

  // detectHost() reads COPILOT_PLUGIN_DATA; the host sets it for plugin hooks
  // (alongside PLUGIN_ROOT), so the spawn sees the same marker a real session does.
  function copilotEnv(configDir) {
    const env = hostEnv(configDir, bundleDir);
    env.COPILOT_PLUGIN_DATA = bundleDir;
    return env;
  }

  function runBundled(script, opts) {
    return spawnHook(path.join(bundleDir, 'hooks', script), {
      stdin: opts.stdin, env: copilotEnv(opts.configDir),
    });
  }

  function configDir(profile) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-copilot-'));
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), profile, 'utf8');
    return dir;
  }

  test('agentStop blocks through the decision field when the evidence chain is empty', () => {
    const dir = configDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir,
      stdin: JSON.stringify({ stop_hook_active: false, session_id: 'probe', stopReason: 'complete' }),
    });
    // Exit 2 is a warning on this host, never the block signal; pinned so the
    // suite states what the host reads rather than implying the code blocks.
    expectExit(res, 2);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
    // Copilot parses one JSON line from stdout.
    expect(String(res.stdout).trim().indexOf('\n')).toBe(-1);
  });

  test('sessionStart injects the verifier profile through the flat additionalContext envelope', () => {
    const dir = configDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, stdin: '{}' });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(typeof out.additionalContext).toBe('string');
    expect(out.additionalContext).toContain('Jiahao');
    expect(out.additionalContext).toContain('verification ladder');
    // Copilot's flat shape, not Claude's hookSpecificOutput wrapper.
    expect(out.hookSpecificOutput).toBeUndefined();
    expect(String(res.stdout).trim().indexOf('\n')).toBe(-1);
  });
});
