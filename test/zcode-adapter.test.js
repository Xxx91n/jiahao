'use strict';
// test/zcode-adapter.test.js - #108: what the shipped ZCode bundle does when
// the host runs it.
//
// The bytes are spawned from a temp materialization of the generator output,
// so the suite exercises what ZCode runs without reading (or writing) the
// workspace. The structural contract lives in test/plugin-bundles.test.js and
// runs for every row of the host table; this file pins the ZCode-specific
// facts:
//   1. the event set is ZCode's own seven-event subset (no SubagentStart /
//      SubagentStop / SessionEnd, so no sweep), and the turn-end entry passes
//      the platform name that selects the ZCode envelope, and
//   2. the bundled Stop gate blocks an empty evidence chain with the exit
//      code and envelope the live probe verified (#108, 2026-10-31,
//      ZCode 3.16.2): {decision:"block"} on stdout at exit 0.
//
// The live block itself is recorded in docs/evidence/v0.3.0/, not claimed by
// this test.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');

const GENERATED_PREFIX = 'adapters/zcode/';
const PLATFORM = 'zcode';
const generated = buildAdapters();
let bundleDir;

beforeAll(() => {
  bundleDir = materializeBundle(generated, GENERATED_PREFIX);
});

afterAll(() => {
  if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

function mkConfigDir(profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-zcode-'));
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
  const cfg = JSON.parse(generated[GENERATED_PREFIX + 'hooks/hooks.json']);
  // The host's documented event names, written down here rather than read
  // back from the row that generated the template: comparing the file with
  // its own source would pass even if both drifted off the host's names.
  // ZCode supports exactly seven events; the three Claude-only ones below are
  // what this bundle must NOT register (a copied PascalCase map with them is
  // a config the host rejects outright).
  const ZCODE_EVENTS = ['SessionStart', 'UserPromptSubmit', 'Stop', 'PreToolUse'];
  const UNSUPPORTED_EVENTS = ['SubagentStart', 'SubagentStop', 'SessionEnd'];

  test('registers the host\'s own event names, including the turn-end event', () => {
    expect(Object.keys(cfg.hooks)).toEqual(ZCODE_EVENTS);
    for (const unsupported of UNSUPPORTED_EVENTS) {
      expect(Object.keys(cfg.hooks)).not.toContain(unsupported);
    }
    const stop = cfg.hooks.Stop[0].hooks;
    expect(stop.length).toBe(1);
    expect(stop[0].command).toContain('${ZCODE_PLUGIN_ROOT}/hooks/jiahao-verdict-gate.js');
    expect(stop[0].command.endsWith(' ' + PLATFORM)).toBe(true);
    for (const event of Object.keys(cfg.hooks)) {
      const hook = cfg.hooks[event][0].hooks[0];
      expect(hook.command.endsWith(' ' + PLATFORM)).toBe(true);
    }
  });

  test('the template carries no decision logic: only a script and the platform name', () => {
    expect(Object.keys(cfg).sort()).toEqual(['description', 'hooks']);
    for (const event of Object.keys(cfg.hooks)) {
      const group = cfg.hooks[event][0];
      expect(Object.keys(group).sort()).toEqual(['hooks']);
      const hook = group.hooks[0];
      expect(Object.keys(hook).sort()).toEqual(['command', 'timeout', 'type']);
      expect(hook.type).toBe('command');
    }
  });
});

describe('evidence pointer', () => {
  // #102: the wrapper that recorded the hook's own exit code has to be
  // reachable from the bundle a reader installs, and the pointer has to name a
  // file that exists. The link is absolute because the evidence directory is
  // frozen and does not ship.
  test('the README points at the probe wrapper and the evidence checklist', () => {
    const readme = generated[GENERATED_PREFIX + 'README.md'];
    expect(readme).toContain('docs/evidence/v0.3.0/probes/codex-hook-wrapper.js');
    expect(readme).toContain('docs/agents/evidence-review.md');
    expect(fs.existsSync(path.join(__dirname, '..', 'docs', 'evidence', 'v0.3.0', 'probes', 'codex-hook-wrapper.js'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '..', 'docs', 'agents', 'evidence-review.md'))).toBe(true);
  });
});

describe('self-marketplace shelf', () => {
  // ZCode's install command only resolves plugin@marketplace names (a direct
  // directory install is refused), and a marketplace is whatever directory the
  // user points at. The shelf rides inside the bundle with `source: "."`, so
  // `marketplace add <this dir>` plus `plugins install jiahao@jiahao-zcode`
  // installs exactly these bytes (probed 2026-10-31, ZCode 3.16.2 / CLI
  // 0.17.0). Adding the repository root instead resolves the Claude-Code
  // bundle - the README warns against it.
  const shelf = JSON.parse(generated[GENERATED_PREFIX + 'marketplace.json']);

  test('names one plugin and points the source at the bundle directory itself', () => {
    expect(shelf.name).toBe('jiahao-zcode');
    expect(shelf.plugins.length).toBe(1);
    expect(shelf.plugins[0].name).toBe('jiahao');
    expect(shelf.plugins[0].source).toBe('.');
  });
});

describe('ZCode output envelope (spawned hook, temp config dir)', () => {
  test('SessionStart answers with the ZCode envelope selected by the platform argument', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, args: [PLATFORM], stdin: '{}' });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(typeof out.hookSpecificOutput.additionalContext).toBe('string');
    expect(out.hookSpecificOutput.additionalContext).toContain('verification ladder');
    // The host output schema is strict ("any extra key fails validation"),
    // so the ZCode branch carries no systemMessage copy - unlike Codex.
    expect(Object.keys(out).sort()).toEqual(['hookSpecificOutput']);
  }, 20000);

  test('UserPromptSubmit answers with the ZCode envelope and the event name it was run for', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-mode-tracker.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ prompt: '/jiahao full' }),
    });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(out.hookSpecificOutput.additionalContext).toContain('JIAHAO MODE');
  }, 20000);

  test('the bundled Stop gate runs from the turn-end entry and blocks an empty chain (decision field, exit 0)', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ stop_hook_active: false, session_id: 'probe' }),
    });
    // ZCode 3.16.2 honored the decision field on exit 0 in the live probe
    // (#108, 2026-10-31); the gate therefore exits 0 for this host.
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
    // The ZCode branch adds no stderr copy: the decision field on stdout and
    // the zero exit are the whole channel.
    expect(String(res.stderr)).toBe('');
  }, 20000);

  test('detectHost() picks ZCode from its environment marker without an argv platform', () => {
    // A config-tier install carries no argv. The probe (#108) saw
    // ZCODE_SESSION_ID in the hook subprocess environment, next to the
    // CLAUDE_* compat vars; the Claude SessionStart branch would print the
    // plain body, so the JSON envelope below proves the env probe fired.
    const dir = mkConfigDir('verifier');
    const env = hostEnv(dir, bundleDir);
    env.ZCODE_SESSION_ID = 'session_probe';
    const res = spawnHook(path.join(bundleDir, 'hooks', 'jiahao-activate.js'), {
      stdin: '{}',
      args: [],
      env: env,
    });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(Object.keys(out).sort()).toEqual(['hookSpecificOutput']);
    expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
  }, 20000);
});
