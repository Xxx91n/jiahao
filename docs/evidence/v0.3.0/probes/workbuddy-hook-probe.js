'use strict';
// workbuddy-hook-probe.js - throwaway hook for the #110 WorkBuddy probe.
//
// Evidence artifact, not part of any distributed bundle. It records what the
// host actually hands a hook subprocess and, in `block-once` mode, answers the
// turn-end block the way a Claude-shaped gate would. Nothing here is a verdict:
// the point is to watch the host's own channel, not to enforce jiahao.
//
// Usage (the hook command in settings.json spells this out):
//   node <abs path>/workbuddy-hook-probe.js <mode> <log path> [marker path]
//     mode = log          record the payload, print nothing, exit 0
//            block-once   record, then block the first invocation only
//            block-always  record, then block every invocation (loop-guard probe)
//
// One JSONL line per invocation. The marker file makes `block-once` survive a
// host that re-runs the hook: the second call sees the marker and passes, which
// is the same shape as a gate that honours `stop_hook_active`.

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const mode = argv[0] || 'log';
const logPath = argv[1] || path.join(require('os').tmpdir(), 'workbuddy-hook-calls.jsonl');
const markerPath = argv[2] || logPath + '.marker';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

// Written before stdin is touched: a hook the host spawned but never fed is a
// different fact from a hook the host never spawned, and one line separates
// them when the run is read back.
function noteSpawn() {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify({
      at: new Date().toISOString(),
      mode: mode,
      phase: 'spawned',
      pid: process.pid,
      argv: process.argv.slice(1),
    }) + '\n', 'utf8');
  } catch (e) {
    // best effort
  }
}

function parse(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

// Only the variables that could carry host identity; values are kept verbatim
// because the point of the record is what the host really set.
function envSubset() {
  const keys = Object.keys(process.env).filter((key) =>
    /^(WORKBUDDY|CODEBUDDY|CLAUDE)_/.test(key) || /PLUGIN_(ROOT|DATA)$/.test(key));
  const out = {};
  for (const key of keys.sort()) out[key] = process.env[key];
  return out;
}

noteSpawn();
const raw = readStdin();
const payload = parse(raw);
const event = payload.hook_event_name || payload.hookEventName || '';
const stopHookActive = payload.stop_hook_active === true;

let decision = 'none';
if (mode === 'block-once') {
  if (stopHookActive) {
    decision = 'pass (stop_hook_active)';
  } else if (fs.existsSync(markerPath)) {
    decision = 'pass (marker present)';
  } else {
    fs.writeFileSync(markerPath, String(process.pid), 'utf8');
    decision = 'block';
  }
} else if (mode === 'block-always') {
  decision = 'block';
}

const record = {
  at: new Date().toISOString(),
  mode: mode,
  event: event,
  session_id: payload.session_id || payload.sessionId || null,
  cwd: payload.cwd || null,
  stop_hook_active: stopHookActive,
  last_assistant_message: typeof payload.last_assistant_message === 'string'
    ? payload.last_assistant_message.slice(0, 400) : null,
  transcript_path: payload.transcript_path || null,
  raw_stdin_bytes: Buffer.byteLength(raw, 'utf8'),
  // The payload verbatim (bounded): the record's job is to show what the host
  // actually sent, not a summary of it.
  raw_stdin: raw.slice(0, 4000),
  decision: decision,
  argv: process.argv.slice(1),
  env: envSubset(),
};

try {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(record) + '\n', 'utf8');
} catch (e) {
  // A hook that cannot log must still not break the host session.
}

if (decision === 'block') {
  const reason = 'JIAHAO-WORKBUDDY-PROBE: turn-end block observed on this host; '
    + 'this is a probe hook, not the jiahao gate.';
  process.stdout.write(JSON.stringify({ decision: 'block', reason: reason }) + '\n');
}
process.exitCode = 0;
