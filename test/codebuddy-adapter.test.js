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
const { spawnSync } = require('child_process');

const { buildAdapters } = require('../scripts/build-adapters');
const { materializeBundle } = require('./helpers/generated-bundle');

const BUNDLE = 'adapters/codebuddy/';
const generated = buildAdapters();
let bundleDir;

beforeAll(() => {
  bundleDir = materializeBundle(generated, BUNDLE);
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
  const env = Object.assign({}, process.env);
  delete env.PLUGIN_DATA;
  delete env.COPILOT_PLUGIN_DATA;
  delete env.QODER_SESSION_ID;
  delete env.CLAUDE_PLUGIN_ROOT;
  delete env.CODEBUDDY_PLUGIN_ROOT;
  env.CLAUDE_CONFIG_DIR = o.configDir;
  if (o.pluginRoot !== undefined) env.CLAUDE_PLUGIN_ROOT = o.pluginRoot;
  return spawnSync(process.execPath, [path.join(bundleDir, 'hooks', script)], {
    input: o.stdin === undefined ? '{}' : o.stdin,
    env: env, encoding: 'utf8', timeout: 15000,
  });
}

describe('hook behavior (bundle copies, live spawn)', () => {
  test('InstructionsLoaded asserts rules presence + sha256 into the telemetry log', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const res = runBundleHook('jiahao-instructions-assert.js', { configDir: dir, pluginRoot: bundleDir });
    expect(res.status).toBe(0);
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
    expect(res.status).toBe(0);
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
    expect(res.status).toBe(2);
    const out = JSON.parse(res.stdout.trim());
    expect(out.decision).toBe('block');
  });

  test('PreToolUse denies an enforcement-surface edit under verifier profile (envelope, exit 0)', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const res = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'adapters/codebuddy/rules/jiahao-verifier.md' } }),
    });
    expect(res.status).toBe(0);
    const out = JSON.parse(res.stdout.trim());
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    const rec = JSON.parse(fs.readFileSync(path.join(dir, '.jiahao-pretool.jsonl'), 'utf8').trim().split('\n').pop());
    expect(rec.decision).toBe('deny');
  });

  test('PreToolUse denies command-payload bypass shapes (audit B-4 regression)', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const shapes = [
      'rm rules/jiahao-verifier.md',
      'rm .mcp.json',
      'del hooks\\hooks.json',
      'rm C:/x/plugin/rules/jiahao-verifier.md extra',
      'cat .jiahao-pretool.jsonl',
      'rm -rf hooks/jiahao-pretool-guard.js',
      'move .claude-plugin/plugin.json out.json',
    ];
    for (const command of shapes) {
      const res = runBundleHook('jiahao-pretool-guard.js', {
        configDir: dir, pluginRoot: bundleDir,
        stdin: JSON.stringify({ tool_name: 'Bash', tool_input: { command: command } }),
      });
      expect(res.status).toBe(0);
      const out = JSON.parse(res.stdout.trim());
      expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
    }
    // non-protected payloads still pass silently
    const benign = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm rules/other.md && cat README.md' } }),
    });
    expect(benign.stdout.trim()).toBe('');
  });

  test('PreToolUse is silent on ordinary tool calls and under generator profile', () => {
    const dir = mkConfigDir({ '.jiahao-profile': 'verifier' });
    const benign = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dir, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'src/foo.js' } }),
    });
    expect(benign.status).toBe(0);
    expect(benign.stdout.trim()).toBe('');

    const dirG = mkConfigDir({ '.jiahao-profile': 'generator' });
    const gen = runBundleHook('jiahao-pretool-guard.js', {
      configDir: dirG, pluginRoot: bundleDir,
      stdin: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '.codebuddy/rules/jiahao-verifier.md' } }),
    });
    expect(gen.status).toBe(0);
    expect(gen.stdout.trim()).toBe(''); // observe-recorded, never denied
    const rec = JSON.parse(fs.readFileSync(path.join(dirG, '.jiahao-pretool.jsonl'), 'utf8').trim().split('\n').pop());
    expect(rec.decision).toBe('observe');
  });

  test('both new hooks are fail-soft on empty and garbage stdin', () => {
    for (const s of ['jiahao-instructions-assert.js', 'jiahao-pretool-guard.js']) {
      const a = runBundleHook(s, { configDir: mkConfigDir(), stdin: '' });
      const b = runBundleHook(s, { configDir: mkConfigDir(), stdin: 'not json{{{' });
      expect(a.status).toBe(0);
      expect(b.status).toBe(0);
    }
  });
});
