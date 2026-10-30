'use strict';
// test/codex-adapter.test.js - #77: what the shipped Codex bundle does when the
// host runs it.
//
// The bytes are spawned from a temp materialization of the generator output, so
// the suite exercises what Codex runs without reading (or writing) the
// workspace. The structural contract lives in test/plugin-bundles.test.js and
// runs for every row of the host table; this file pins the two Codex-specific
// facts:
//   1. the platform name the config template passes selects Codex's output
//      envelope (the branch hooks/jiahao-runtime.js already had), and
//   2. the turn-end entry actually reaches the bundled verdict gate, with the
//      exit code and envelope the gate emits.
//
// The live block was probed in #80 (2026-10-30, codex-cli 0.163.0); this file
// pins the envelope the shipped bundle must keep emitting.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');

const GENERATED_PREFIX = 'adapters/codex/';
const PLATFORM = 'codex';
const generated = buildAdapters();
let bundleDir;

beforeAll(() => {
  bundleDir = materializeBundle(generated, GENERATED_PREFIX);
});

afterAll(() => {
  if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

function mkConfigDir(profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-codex-'));
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
  // The host's documented event names, written down here rather than read back
  // from the row that generated the template: comparing the file with its own
  // source would pass even if both drifted off the host's names. That Stop is
  // the turn-end event is documented; the live block is recorded in
  // docs/evidence/v0.3.0/, not claimed by this test.
  const CODEX_EVENTS = ['SessionStart', 'SubagentStart', 'UserPromptSubmit', 'Stop', 'SubagentStop', 'SessionEnd'];

  test('registers the host\'s own event names, including the turn-end event', () => {
    expect(Object.keys(cfg.hooks)).toEqual(CODEX_EVENTS);
    expect(Object.keys(cfg.hooks)).toContain('Stop');
    const stop = cfg.hooks.Stop[0].hooks;
    expect(stop.length).toBe(1);
    expect(stop[0].command).toContain('${PLUGIN_ROOT}/hooks/jiahao-verdict-gate.js');
    expect(stop[0].command.endsWith(' ' + PLATFORM)).toBe(true);
    for (const event of Object.keys(cfg.hooks)) {
      const hook = cfg.hooks[event][0].hooks[0];
      expect(hook.command.endsWith(' ' + PLATFORM)).toBe(true);
    }
  });

  test('the template carries no decision logic: only a script and the platform name', () => {
    // Structure, not a word blacklist: the file may hold nothing but a
    // description and the hook map, and each entry only type/command/timeout.
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

describe('Codex output envelope (spawned hook, temp config dir)', () => {
  test('SessionStart answers with the Codex envelope selected by the platform argument', () => {
    // No PLUGIN_DATA in the environment: hostEnv scrubs it. The only thing that
    // can make this Codex is the platform name the template passes, which is
    // exactly what the test is pinning.
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, args: [PLATFORM], stdin: '{}' });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.systemMessage).toBe('JIAHAO');
    expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(typeof out.hookSpecificOutput.additionalContext).toBe('string');
    expect(out.hookSpecificOutput.additionalContext).toContain('verification ladder');
    // A Claude Code SessionStart prints the plain body, not this JSON, so the
    // shape above is the Codex branch and not the default.
    expect(Object.keys(out).sort()).toEqual(['hookSpecificOutput', 'systemMessage']);
  }, 20000);

  test('UserPromptSubmit answers with the Codex envelope and the event name it was run for', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-mode-tracker.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ prompt: '/jiahao full' }),
    });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.systemMessage).toBe('JIAHAO');
    expect(out.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(out.hookSpecificOutput.additionalContext).toContain('JIAHAO MODE');
  }, 20000);

  test('the bundled Stop gate runs from the turn-end entry and blocks an empty chain (decision field, exit 0)', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ stop_hook_active: false, session_id: 'probe' }),
    });
    // Codex 0.163.0 honors the decision field on exit 0; exit 2 + stderr ended
    // the turn without a continuation in the live probe (#80, 2026-10-30).
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
    // The stderr copy is kept for host logs; it is not the blocking channel.
    expect(String(res.stderr)).toContain('no evidence');
  }, 20000);
});
