'use strict';
// Spawn a hook the way a host does: `node <script>` with the payload on stdin
// and an argv array, so there is no shell string to interpolate.
//
// A failed spawn must name what failed. Before #84 a guard that stayed silent
// surfaced only as "Unexpected end of JSON input" - no command, no payload, no
// stdout/stderr - and cost three red CI runs to locate on PR #83. Every
// assertion helper here reports the same fields when it throws.

const { spawnSync } = require('child_process');

function describe(res) {
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
  const res = spawnSync(process.execPath, [script], {
    input: o.stdin === undefined ? '{}' : o.stdin,
    env: o.env || process.env,
    cwd: o.cwd,
    encoding: 'utf8',
    timeout: o.timeoutMs || 15000,
  });
  res.commandLine = 'node ' + script;
  return res;
}

// Status alone is a weak explanation: a killed or timed-out spawn has a null
// status and the reason is on the streams. Report all of it.
function expectExit(res, code) {
  if (res.status !== code) {
    throw new Error('expected exit ' + code + ', got ' + res.status + ': ' + describe(res));
  }
  return res;
}

function parseJson(res) {
  try {
    return JSON.parse(String(res.stdout).trim());
  } catch (e) {
    throw new Error('stdout is not JSON (' + e.message + '): ' + describe(res));
  }
}

module.exports = { spawnHook, expectExit, parseJson, describe };
