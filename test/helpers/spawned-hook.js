'use strict';
// Spawn a hook the way a host does: `node <script>` with the payload on stdin
// and an argv array, so there is no shell string to interpolate.
//
// A failed spawn must name what failed. Before #84 a guard that stayed silent
// surfaced only as "Unexpected end of JSON input" - no command, no payload, no
// stdout/stderr - and cost three red CI runs to locate on PR #83. Every
// assertion helper here reports the same fields when it throws.

const { spawnSync } = require('child_process');

function describeSpawn(res) {
  return JSON.stringify({
    command: res.commandLine,
    status: res.status,
    signal: res.signal,
    error: res.error ? res.error.message : null,
    stdout: res.stdout,
    stderr: res.stderr,
  });
}

function spawnHook(script, opts) {
  const o = opts || {};
  // argv after the script: a host config that passes its platform name (Codex
  // does) is spawned exactly as the template writes it, so the envelope test
  // exercises the real path instead of a hand-set env variable.
  const args = [script].concat(o.args || []);
  const res = spawnSync(process.execPath, args, {
    input: o.stdin === undefined ? '{}' : o.stdin,
    env: o.env || process.env,
    cwd: o.cwd,
    encoding: 'utf8',
    timeout: o.timeoutMs || 15000,
  });
  res.commandLine = 'node ' + args.join(' ');
  return res;
}

// Status alone is a weak explanation: a killed or timed-out spawn has a null
// status and the reason is on the streams. Report all of it.
function expectExit(res, code) {
  if (res.status !== code) {
    throw new Error('expected exit ' + code + ', got ' + res.status + ': ' + describeSpawn(res));
  }
  return res;
}

function parseJson(res) {
  try {
    return JSON.parse(String(res.stdout).trim());
  } catch (e) {
    throw new Error('stdout is not JSON (' + e.message + '): ' + describeSpawn(res));
  }
}

// Hooks read host context from the environment, and the test process may itself
// run under a host. Scrub every host marker so the spawn sees one host only,
// pin the config dir, and set the absolute plugin root the hook runs from.
function hostEnv(configDir, pluginRoot) {
  const env = Object.assign({}, process.env);
  for (const k of ['PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'QODER_SESSION_ID',
    'CLAUDE_PLUGIN_ROOT', 'CODEBUDDY_PLUGIN_ROOT']) delete env[k];
  env.CLAUDE_CONFIG_DIR = configDir;
  if (pluginRoot !== undefined) env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  return env;
}

module.exports = { spawnHook, expectExit, parseJson, describeSpawn, hostEnv };
