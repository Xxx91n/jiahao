'use strict';
// test/qoder-adapter.test.js - #109: what the shipped Qoder Desktop bundle does
// when the host runs it.
//
// test/plugin-bundles.test.js covers the structural contract for every row of
// the host table. This file pins the three Qoder-specific facts the live probe
// established, so a regeneration cannot quietly change the surface the probe
// measured:
//   1. the hook map registers only the events #109 exercised, and every command
//      passes the platform name `qoder` (the host gives a hook subprocess no
//      QODER_SESSION_ID, so an argv-less command would answer with the Claude
//      envelope instead);
//   2. the injection events answer with the hookSpecificOutput envelope;
//   3. the turn-end entry blocks with the decision field AND exit 2, which is
//      the channel the host was watched honoring on Qoder CN Desktop 0.4.11.
//
// The live run is recorded in docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md;
// nothing here claims a host behavior beyond what that file supports.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');

const GENERATED_PREFIX = 'adapters/qoder/';
const PLATFORM = 'qoder';
const generated = buildAdapters();
let bundleDir;

beforeAll(() => {
  bundleDir = materializeBundle(generated, GENERATED_PREFIX);
});

afterAll(() => {
  if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

function mkConfigDir(profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-qoder-'));
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

describe('hook map', () => {
  const cfg = JSON.parse(generated[GENERATED_PREFIX + 'hooks/hooks.json']);
  // Written down from the #109 probe rather than read back from the row that
  // generated the file: SessionEnd, PreToolUse and SubagentStop exist on this
  // host but nothing was watched blocking through them.
  const QODER_EVENTS = ['SessionStart', 'UserPromptSubmit', 'Stop'];

  test('registers the probed events and nothing the probe left untouched', () => {
    expect(Object.keys(cfg.hooks).sort()).toEqual(QODER_EVENTS.slice().sort());
    expect(cfg.hooks).not.toHaveProperty('SessionEnd');
    expect(cfg.hooks).not.toHaveProperty('PreToolUse');
    expect(cfg.hooks).not.toHaveProperty('SubagentStop');
  });

  test('every command resolves inside the bundle and carries the platform name', () => {
    for (const event of Object.keys(cfg.hooks)) {
      const hook = cfg.hooks[event][0].hooks[0];
      expect(hook.type).toBe('command');
      expect(hook.command).toContain('${QODER_PLUGIN_ROOT}/hooks/');
      // Without this argv the hook cannot tell Qoder from Claude Code on the
      // environment alone, and the envelope would come from the wrong branch.
      expect(hook.command.endsWith(' ' + PLATFORM)).toBe(true);
    }
    const stop = cfg.hooks.Stop[0].hooks;
    expect(stop).toHaveLength(1);
    expect(stop[0].command).toContain('jiahao-verdict-gate.js');
  });

  test('the template carries no decision logic: only a script and the platform name', () => {
    expect(Object.keys(cfg).sort()).toEqual(['description', 'hooks']);
    for (const event of Object.keys(cfg.hooks)) {
      const group = cfg.hooks[event][0];
      expect(Object.keys(group).sort()).toEqual(['hooks']);
      const hook = group.hooks[0];
      expect(Object.keys(hook).sort()).toEqual(['command', 'timeout', 'type']);
    }
  });
});

describe('plugin manifest', () => {
  const manifest = JSON.parse(generated[GENERATED_PREFIX + '.qoder-plugin/plugin.json']);

  test('is the shape the host reads from its own bundled plugin', () => {
    expect(Object.keys(manifest).sort()).toEqual(['description', 'displayName', 'name', 'version']);
    expect(manifest.name).toBe('jiahao');
    expect(manifest.version).toBe(JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version);
    // The host auto-discovers hooks/hooks.json; naming it here would register
    // the map twice, which is what the row's autoDiscovered list records.
    expect(manifest.hooks).toBeUndefined();
  });
});

describe('evidence pointer', () => {
  test('the README points at the probe record, the probe script, and the checklist', () => {
    const readme = generated[GENERATED_PREFIX + 'README.md'];
    for (const needle of ['qoder-hook-probe-2026-10-31.md', 'qoder-hook-calls.jsonl',
      'docs/agents/evidence-review.md']) {
      expect(readme).toContain(needle);
    }
    expect(fs.existsSync(path.join(__dirname, '..', 'docs/evidence/v0.3.0',
      'qoder-hook-probe-2026-10-31.md'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '..', 'docs/evidence/v0.3.0',
      'probes/qoder-stop-probe.js'))).toBe(true);
  });
});

describe('Qoder output envelope (spawned hook, temp config dir)', () => {
  test('SessionStart answers with the hookSpecificOutput envelope selected by the platform argument', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, args: [PLATFORM], stdin: '{}' });
    expectExit(res, 0);
    const out = parseJson(res);
    // A Codex answer would carry systemMessage; a Claude SessionStart answer
    // would print the plain body. Neither is what this host reads.
    expect(Object.keys(out).sort()).toEqual(['hookSpecificOutput']);
    expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(out.hookSpecificOutput.additionalContext).toContain('verification ladder');
  }, 20000);

  test('UserPromptSubmit answers with the same envelope and its own event name', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-mode-tracker.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ prompt: '/jiahao full' }),
    });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(out.hookSpecificOutput.additionalContext).toContain('JIAHAO MODE');
  }, 20000);

  test('the bundled Stop gate blocks an empty chain on exit 2 with the decision field', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, args: [PLATFORM],
      stdin: JSON.stringify({ stop_hook_active: false, session_id: 'probe' }),
    });
    // Qoder CN Desktop 0.4.11 continued the turn on both channels (#109), so the
    // Claude-shaped exit 2 is kept and the decision field travels with it.
    expectExit(res, 2);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
  }, 20000);

  test('a re-entry with stop_hook_active does not block, so the loop guard holds', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, args: [PLATFORM],
      stdin: JSON.stringify({ stop_hook_active: true, session_id: 'probe' }),
    });
    expectExit(res, 0);
    expect(String(res.stdout)).toBe('');
  }, 20000);
});
