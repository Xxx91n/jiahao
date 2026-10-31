'use strict';
// test/workbuddy-adapter.test.js - #110: what the shipped WorkBuddy bundle does
// when the host runs it.
//
// The structural contract lives in test/plugin-bundles.test.js and runs for
// every row of the host table; this file pins the WorkBuddy-specific facts:
//   1. the template uses the product's own manifest directory and the platform
//      name that selects WorkBuddy's envelope,
//   2. a settings-tier hook (no plugin root, both CODEBUDDY_* and WORKBUDDY_*
//      variables present) is still recognised as WorkBuddy, while a bare
//      CodeBuddy environment is not,
//   3. the turn-end entry reaches the bundled verdict gate with the exit code
//      and envelope the gate emits.
//
// The live turn-end block was probed in #110 (2026-10-31, WorkBuddy AI 5.9.4)
// and is recorded in docs/evidence/v0.3.0/; this file pins what the shipped
// bundle must keep emitting, not the host's behaviour.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');
const { spawnHook, expectExit, parseJson, hostEnv } = require('./helpers/spawned-hook');

const GENERATED_PREFIX = 'adapters/workbuddy/';
const PLATFORM = 'workbuddy';
const generated = buildAdapters();
let bundleDir;

beforeAll(() => {
  bundleDir = materializeBundle(generated, GENERATED_PREFIX);
});

afterAll(() => {
  if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

function mkConfigDir(profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-workbuddy-'));
  fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), profile, 'utf8');
  return dir;
}

function runBundled(script, opts) {
  return spawnHook(path.join(bundleDir, 'hooks', script), {
    stdin: opts.stdin,
    args: opts.args,
    env: opts.env || hostEnv(opts.configDir, bundleDir),
  });
}

describe('configuration template', () => {
  const cfg = JSON.parse(generated[GENERATED_PREFIX + 'hooks/hooks.json']);
  // The event set is written down here rather than read back from the row that
  // generated the template: comparing the file with its own source would pass
  // even if both drifted. SubagentStop is absent on purpose - the probe showed
  // its decision is not continued (#110).
  const WORKBUDDY_EVENTS = ['SessionStart', 'UserPromptSubmit', 'Stop', 'PreToolUse', 'SessionEnd'];

  test('registers the host\'s own event names, including the turn-end event', () => {
    expect(Object.keys(cfg.hooks)).toEqual(WORKBUDDY_EVENTS);
    const stop = cfg.hooks.Stop[0].hooks;
    expect(stop.length).toBe(1);
    expect(stop[0].command).toContain('${CODEBUDDY_PLUGIN_ROOT}/hooks/jiahao-verdict-gate.js');
    for (const event of Object.keys(cfg.hooks)) {
      const hook = cfg.hooks[event][0].hooks[0];
      expect(hook.command.endsWith(' ' + PLATFORM)).toBe(true);
      expect(hook.command).not.toContain('${CLAUDE_PLUGIN_ROOT}');
    }
  });

  test('SubagentStop is not wired, because the probe showed its block is not continued', () => {
    expect(Object.keys(cfg.hooks)).not.toContain('SubagentStop');
    const readme = generated[GENERATED_PREFIX + 'README.md'];
    expect(readme).toContain('SubagentStop');
    expect(readme).toMatch(/not\s+\*\*not\*\*|not\*\* wired|deliberately/);
  });

  test('the manifest is the product-native directory and names the hook map', () => {
    const manifestRel = GENERATED_PREFIX + '.workbuddy-plugin/plugin.json';
    const manifest = JSON.parse(generated[manifestRel]);
    expect(manifest.hooks).toBe('hooks/hooks.json');
    expect(manifest.defaultEnabled).toBe(false);
    // The other two directories the shared loader accepts must not be emitted
    // for this row: a second manifest is a second thing to keep in step.
    const manifests = Object.keys(generated)
      .filter((rel) => rel.startsWith(GENERATED_PREFIX) && /plugin\.json$/.test(rel));
    expect(manifests).toEqual([manifestRel]);
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

describe('host detection', () => {
  const { detectHost } = require('../hooks/jiahao-runtime');

  function withEnv(changes, fn) {
    const keys = Object.keys(changes);
    const saved = {};
    for (const k of keys) saved[k] = process.env[k];
    try {
      for (const k of keys) {
        if (changes[k] === undefined) delete process.env[k];
        else process.env[k] = changes[k];
      }
      return fn();
    } finally {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  }

  test('the platform argument selects workbuddy with no environment help at all', () => {
    const savedArgv = process.argv;
    try {
      process.argv = [savedArgv[0], savedArgv[1], PLATFORM];
      withEnv({ WORKBUDDY_APP_VERSION: undefined, CODEBUDDY_PLUGIN_ROOT: undefined }, () => {
        expect(detectHost()).toBe('workbuddy');
      });
    } finally {
      process.argv = savedArgv;
    }
  });

  test('ambient WORKBUDDY_* variables alone do not switch the host', () => {
    // The desktop sets these for every child process, so trusting them would
    // misattribute a Claude Code session started from a WorkBuddy terminal -
    // and a test suite running on that machine. Measured: with the branch in
    // place, test/hooks.test.js read the WorkBuddy envelope and went red.
    const savedArgv = process.argv;
    try {
      process.argv = [savedArgv[0], savedArgv[1]];
      withEnv({ WORKBUDDY_APP_VERSION: '5.9.4', CODEBUDDY_HOST: 'workbuddy-desktop', CODEBUDDY_PLUGIN_ROOT: undefined }, () => {
        expect(detectHost()).toBe('claude');
      });
    } finally {
      process.argv = savedArgv;
    }
  });

  test('a bare CodeBuddy environment still answers codebuddy', () => {
    const savedArgv = process.argv;
    try {
      process.argv = [savedArgv[0], savedArgv[1]];
      withEnv({ WORKBUDDY_APP_VERSION: undefined, CODEBUDDY_PLUGIN_ROOT: 'C:/plugins/jiahao' }, () => {
        expect(detectHost()).toBe('codebuddy');
      });
    } finally {
      process.argv = savedArgv;
    }
  });
});

describe('WorkBuddy output envelope (spawned hook, temp config dir)', () => {
  test('SessionStart answers with the hookSpecificOutput envelope selected by the platform argument', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, args: [PLATFORM], stdin: '{}' });
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(typeof out.hookSpecificOutput.additionalContext).toBe('string');
    expect(out.hookSpecificOutput.additionalContext).toContain('verification ladder');
    // A Claude Code SessionStart prints the plain body instead of this JSON, so
    // the shape above is the WorkBuddy branch and not the default.
    expect(Object.keys(out)).toEqual(['hookSpecificOutput']);
  }, 20000);

  test('UserPromptSubmit answers with the event name it was run for', () => {
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
    // WorkBuddy AI 5.9.4 continued a live turn only after a Stop hook printed
    // the decision and exited 0 (#110, 2026-10-31); exit 2 was not probed there.
    expectExit(res, 0);
    const out = parseJson(res);
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
  }, 20000);

  test('the gate passes a continuation the host marks with stop_hook_active', () => {
    const dir = mkConfigDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, args: [PLATFORM], stdin: JSON.stringify({ stop_hook_active: true, session_id: 'probe' }),
    });
    expectExit(res, 0);
    const out = JSON.parse(String(res.stdout).trim() || '{}');
    expect(out.decision).toBeUndefined();
  }, 20000);
});

describe('tier disclosure', () => {
  const readme = generated[GENERATED_PREFIX + 'README.md'];

  test('the README separates the two variants and makes the A claim for one build only', () => {
    expect(readme).toContain('WorkBuddy AI');
    expect(readme).toContain('5.9.4');
    expect(readme).toContain('5.9.3');
    expect(readme).toContain('~/.workbuddy-ai');
    expect(readme).toContain('~/.workbuddy');
    expect(readme).toContain('www.workbuddy.ai');
    expect(readme).toContain('www.workbuddy.cn');
    // The domestic build has no live block, so the document must not claim one
    // for it.
    const domestic = readme.slice(readme.indexOf('The domestic 5.9.3 build'));
    expect(domestic).toMatch(/no blocking claim/i);
  });

  test('the README names the surface that was probed and the one that was not', () => {
    expect(readme).toContain('.codebuddy/settings.json');
    expect(readme).toContain('declared-unverified');
    expect(readme).toContain('not probed');
    // The project directory name is the trap this ticket found: the twin under
    // .workbuddy/ did not fire.
    expect(readme).toMatch(/not `\.workbuddy`|\.codebuddy`, not `\.workbuddy`/);
  });

  test('the README points at the probe artifact, and that file exists', () => {
    const probe = path.join(__dirname, '..', 'docs', 'evidence', 'v0.3.0', 'probes', 'workbuddy-stop-probe.js');
    expect(fs.existsSync(probe)).toBe(true);
    expect(readme).toContain('docs/evidence/v0.3.0/probes/workbuddy-stop-probe.js');
    expect(readme).toContain('workbuddy-hook-probe-2026-10-31.md');
  });
});
