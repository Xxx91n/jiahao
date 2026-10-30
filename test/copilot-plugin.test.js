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
const { createRecord: createEvidence } = require('../src/evidence-log');

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

  // detectHost() keys the Copilot branch on COPILOT_PLUGIN_DATA. Whether the
  // host really sets it is declared-unverified (#80); this spawn proves the
  // branch the host is documented to reach, not the marker itself.
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

  // CodeRabbit on PR #95: the camelCase events carry `sessionId`, not
  // `session_id`. Without the normalization in hooks/jiahao-runtime.js the #75
  // scoping silently read null here and every turn counted every session's
  // records - the exact protection this host was supposed to inherit.
  test('the camelCase sessionId scopes agentStop evidence like session_id does', () => {
    const dir = configDir('verifier');
    const foreign = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { session_id: 'session-old' });
    fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([foreign]), 'utf8');
    const other = runBundled('jiahao-verdict-gate.js', {
      configDir: dir,
      stdin: JSON.stringify({ stop_hook_active: false, sessionId: 'session-new', stopReason: 'complete' }),
    });
    expectExit(other, 2);
    expect(parseJson(other).reason).toContain('no evidence');

    const own = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { session_id: 'session-new' });
    fs.writeFileSync(path.join(dir, '.jiahao-evidence'), JSON.stringify([own]), 'utf8');
    const mine = runBundled('jiahao-verdict-gate.js', {
      configDir: dir,
      stdin: JSON.stringify({ stop_hook_active: false, sessionId: 'session-new', stopReason: 'complete' }),
    });
    expectExit(mine, 0);
  });

  // CodeRabbit on PR #95: subagentStart's reliable field is `agentName`
  // (`agentType` only arrives when known), so the matcher read empty and
  // injected the full ruleset into every subagent.
  test('subagentStart reads the camelCase agentName for the matcher', () => {
    const dir = configDir('verifier');
    const writer = runBundled('jiahao-subagent.js', {
      configDir: dir, stdin: JSON.stringify({ agentName: 'docs-writer', sessionId: 'probe' }),
    });
    expectExit(writer, 0);
    expect(String(writer.stdout).trim()).toBe('');

    const reviewer = runBundled('jiahao-subagent.js', {
      configDir: dir, stdin: JSON.stringify({ agentName: 'reviewer', sessionId: 'probe' }),
    });
    expectExit(reviewer, 0);
    expect(reviewer.stdout).toContain('verification ladder');
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
