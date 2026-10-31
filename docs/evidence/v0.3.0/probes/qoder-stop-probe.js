// Throwaway Qoder Desktop Stop hook for #109. Evidence artifact, not shipped.
//
// It answers three things and nothing else:
//   1. does a config-registered command hook fire on Stop in this host, and what
//      payload does it receive (every call is appended to ../qoder-hook-calls.jsonl);
//   2. which channel the host reads a block from - exit 2 + stderr, or
//      exit 0 + {decision:"block"} on stdout (JIAHAO_QODER_PROBE_MODE);
//   3. whether the host sets stop_hook_active on the re-entry turn.
//
// Guard rails, because this hook is armed in a live desktop app:
//   - it only ever blocks when the turn's last assistant message contains the
//     marker below, so no other session on the machine can be affected;
//   - it caps blocks per session (JIAHAO_QODER_PROBE_CAP, default 3) and then
//     lets the turn end, so an always-block run cannot run away.
//
// Config it expects (project scope, one of .qoder / .qoder-cn):
//   { "hooks": { "Stop": [ { "hooks": [ { "type": "command",
//       "command": "node \"<abs path to this file>\" qoder" } ] } ] } }

const fs = require('fs');
const os = require('os');
const path = require('path');

const MARKER = 'JIAHAO109-CLAIM-DONE';
const LOG_PATH = process.env.JIAHAO_QODER_PROBE_LOG
  || path.join(__dirname, '..', 'qoder-hook-calls.jsonl');
const STATE_DIR = path.join(os.tmpdir(), 'jiahao-109-probe-state');
// Qoder's settings-scope hook schema has no env field, so the mode flips by
// rewriting this file instead of the host config. Env still wins for offline use.
const MODE_FILE = path.join(STATE_DIR, 'mode.txt');
const [fileMode, fileCap] = (() => {
  try {
    const [a, b] = fs.readFileSync(MODE_FILE, 'utf8').trim().split(/\s+/);
    return [a || null, b || null];
  } catch {
    return [null, null];
  }
})();
const MODE = process.env.JIAHAO_QODER_PROBE_MODE || fileMode || 'observe';
const CAP = Number.parseInt(
  process.env.JIAHAO_QODER_PROBE_CAP || fileCap || '3', 10,
);

// Env the host is expected to hand a hook subprocess; recording which of these
// exist is what tells us whether hooks/jiahao-runtime.js's QODER_SESSION_ID
// detection is true on this host.
const ENV_PROBE = [
  'QODER_SESSION_ID', 'QODER_PROJECT_DIR', 'QODER_CONFIG_DIR',
  'QODER_USER_CONFIG_DIR', 'QODER_PLUGIN_ROOT', 'QODER_PLUGIN_DATA',
];

function appendLine(obj) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n');
}

function blockCount(sessionId) {
  const file = path.join(STATE_DIR, `blocks-${String(sessionId || 'anon')}.count`);
  let n = 0;
  try {
    n = Number.parseInt(fs.readFileSync(file, 'utf8').trim(), 10) || 0;
  } catch {
    n = 0;
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(file, String(n + 1));
  return n + 1;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    parseError = err.message;
  }

  const event = parsed && parsed.hook_event_name;
  const lastMessage = (parsed && typeof parsed.last_assistant_message === 'string')
    ? parsed.last_assistant_message : '';
  const markerMatched = lastMessage.includes(MARKER);

  let action = 'pass';
  if (event === 'Stop' && markerMatched) {
    const seen = blockCount(parsed.session_id);
    if (seen > CAP) {
      action = 'cap-reached-pass';
    } else if (MODE === 'exit2') {
      action = 'block-exit2';
    } else if (MODE === 'jsonblock') {
      action = 'block-json';
    }
  }

  appendLine({
    at: new Date().toISOString(),
    argv: process.argv.slice(2),
    mode: MODE,
    cap: CAP,
    action,
    parse_error: parseError,
    payload: parsed,
    stdin_chars: input.length,
    env_present: ENV_PROBE.filter((k) => process.env[k] !== undefined),
    env_values: ENV_PROBE.reduce((acc, k) => {
      if (process.env[k] !== undefined) acc[k] = process.env[k];
      return acc;
    }, {}),
  });

  if (action === 'block-exit2') {
    process.stderr.write(`${MARKER} claimed without a verification receipt; hook #109 blocked this turn end.\n`);
    process.exitCode = 2;
    return;
  }
  if (action === 'block-json') {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `${MARKER} claimed without a verification receipt; hook #109 blocked this turn end.`,
    }) + '\n');
    process.exitCode = 0;
    return;
  }
  process.exitCode = 0;
});
