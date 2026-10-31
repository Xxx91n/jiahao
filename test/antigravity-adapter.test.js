'use strict';
// test/antigravity-adapter.test.js - #111: what the shipped Antigravity bundle
// does when the host runs it.
//
// The bytes are spawned from a temp materialization of the generator output, so
// the suite exercises what Antigravity runs without reading (or writing) the
// workspace. The structural contract lives in test/plugin-bundles.test.js and
// runs for every row of the host table; this file pins the Antigravity-specific
// facts:
//   1. the platform name the config template passes selects Antigravity's output
//      envelope (injectSteps for SessionStart), and
//   2. the turn-end entry actually reaches the bundled verdict gate, with the
//      exit code and envelope the gate emits (exit 0, decision block).
//
// The live block was probed in #111 (2026-10-31, Antigravity 1.2.12); this file
// pins the envelope the shipped bundle must keep emitting.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle, assertAbsolutePluginRoot } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');

const GENERATED_PREFIX = 'adapters/antigravity/';
const PLATFORM = 'antigravity';
const generated = buildAdapters();
let bundleDir;

beforeAll(() => {
  bundleDir = materializeBundle(generated, GENERATED_PREFIX);
  assertAbsolutePluginRoot(bundleDir);
});

afterAll(() => {
  if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

function mkConfigDir(profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-antigravity-'));
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), profile, 'utf8');
  return dir;
}

function runBundled(script, opts) {
  return spawnHook(path.join(bundleDir, 'hooks', script), {
    stdin: opts.stdin,
    args: opts.args,
    env: hostEnv(opts.configDir, bundleDir),
  });
}

describe('configuration template', () => {
  const cfg = JSON.parse(generated[GENERATED_PREFIX + 'hooks.json']);
  const ANTIGRAVITY_EVENTS = ['SessionStart', 'Stop', 'SessionEnd'];

  test('registers the host\'s own event names, including the turn-end event', () => {
    expect(Object.keys(cfg.hooks)).toEqual(ANTIGRAVITY_EVENTS);
    expect(Object.keys(cfg.hooks)).toContain('Stop');
    const stop = cfg.hooks.Stop;
    expect(stop.length).toBe(1);
    expect(stop[0].command).toBe('node hooks/jiahao-verdict-gate.js ' + PLATFORM);
    for (const event of Object.keys(cfg.hooks)) {
      const hook = cfg.hooks[event][0];
      expect(hook.command.endsWith(' ' + PLATFORM)).toBe(true);
    }
  });

  test('the template carries no decision logic: only a script and the platform name', () => {
    expect(Object.keys(cfg)).toEqual(['hooks']);
    for (const event of Object.keys(cfg.hooks)) {
      const hook = cfg.hooks[event][0];
      expect(Object.keys(hook).sort()).toEqual(['command', 'timeout', 'type']);
      expect(hook.type).toBe('command');
    }
  });
});

describe('evidence pointer', () => {
  test('the README points at the probe wrapper and the evidence checklist', () => {
    const readme = generated[GENERATED_PREFIX + 'README.md'];
    expect(readme).toContain('docs/evidence/v0.3.0/probes/antigravity-hook-wrapper.js');
    expect(readme).toContain('docs/agents/evidence-review.md');
    expect(fs.existsSync(path.join(__dirname, '..', 'docs', 'evidence', 'v0.3.0', 'probes', 'antigravity-hook-wrapper.js'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '..', 'docs', 'agents', 'evidence-review.md'))).toBe(true);
  });
});

describe('Antigravity output envelope (spawned hook, temp config dir)', () => {
  test('SessionStart answers with the injectSteps envelope selected by the platform argument', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, args: [PLATFORM], stdin: '{}' });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(Array.isArray(out.injectSteps)).toBe(true);
    expect(out.injectSteps.length).toBe(1);
    const step = out.injectSteps[0];
    expect(typeof step.systemMessage.systemMessage).toBe('string');
    expect(step.systemMessage.systemMessage).toContain('verification ladder');
  }, 20000);

  test('the bundled Stop gate runs from the turn-end entry and blocks an empty chain (decision field, exit 0)', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ executionNum: 0, conversationId: 'probe' }),
    });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
  }, 20000);

  test('the bundled Stop gate allows turn completion when executionNum > 0 (stop_hook_active mapped from executionNum)', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ executionNum: 1, conversationId: 'probe' }),
    });
    expectExit(res, 0);
    expect(res.stdout.trim()).toBe('');
  }, 20000);

  test('conversationId normalizes to session_id for cross-session scoping', () => {
    const { normalizePayload } = require('../hooks/jiahao-runtime');
    const norm = normalizePayload({ conversationId: 'conv-xyz', executionNum: 0 });
    expect(norm.session_id).toBe('conv-xyz');
    expect(norm.stop_hook_active).toBe(false);
    const normActive = normalizePayload({ conversationId: 'conv-xyz', executionNum: 1 });
    expect(normActive.stop_hook_active).toBe(true);
  });
});
