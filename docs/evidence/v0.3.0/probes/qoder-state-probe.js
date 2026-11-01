// Qoder state-location probe for #116. Evidence artifact, not shipped.
//
// The ticket asks for the shipped gate's state location, not for a claim about
// it. This hook is registered in a project-scope `.qoder/settings.json`, so the
// host spawns it exactly as it spawns the bundle's own hooks; it then
//
//   1. records which of the environment names #116 talks about the host
//      actually hands a hook (`QODER_CONFIG_DIR`, `CLAUDE_CONFIG_DIR`, `HOME`,
//      `USERPROFILE` - names only; no values except the config root, which is
//      not a secret),
//   2. resolves the state paths with the repository's real
//      `src/shared/paths.js` (`require`, not a copy of the order),
//   3. spawns the generated bundle's Stop gate with the same stdin and
//      environment, and records the gate's exit code and whether a chain
//      directory appeared under the resolved config root,
//   4. always exits 0, so a probe run can never hold a turn open.
//
// One JSON line per invocation, appended to ../qoder-state-probe.jsonl.
//
// Config it expects (project scope):
//   { "hooks": { "Stop": [ { "hooks": [ { "type": "command",
//       "command": "node \"<abs path to this file>\" qoder" } ] } ] } }

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const LOG_PATH = process.env.JIAHAO_QODER_STATE_PROBE_LOG
  || path.join(__dirname, '..', 'qoder-state-probe.jsonl');
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const GATE = path.join(REPO_ROOT, 'adapters', 'qoder', 'hooks', 'jiahao-verdict-gate.js');
const ENV_NAMES = [
  'QODER_CONFIG_DIR', 'QODER_PROJECT_DIR', 'QODER_SESSION_ID',
  'CLAUDE_CONFIG_DIR', 'HOME', 'USERPROFILE', 'TEMP', 'TMP',
];

function appendLine(obj) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n');
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload = null;
  try { payload = JSON.parse(input); } catch (e) { payload = null; }

  const present = ENV_NAMES.filter((k) => typeof process.env[k] === 'string' && process.env[k] !== '');
  const paths = require(path.join(REPO_ROOT, 'src', 'shared', 'paths.js'));
  const resolved = {
    configDir: paths.configDir(),
    flagPath: paths.flagPath(),
    profilePath: paths.profilePath(),
    evidencePath: paths.evidencePath(),
  };

  // A name->size snapshot, not a name list: the gate appends to the active
  // segment, so a turn that grows the chain usually leaves the file COUNT
  // unchanged. Comparing counts reported a false negative for exactly the
  // signal this probe exists to record (CodeRabbit #127).
  function snapshot(dir) {
    const out = {};
    if (!fs.existsSync(dir)) return out;
    for (const name of fs.readdirSync(dir)) {
      try { out[name] = fs.statSync(path.join(dir, name)).size; }
      catch (e) { out[name] = null; } // vanished mid-read: still a difference
    }
    return out;
  }

  const evidenceBefore = snapshot(resolved.evidencePath);

  const gate = spawnSync(process.execPath, [GATE, 'qoder'], {
    input: input,
    encoding: 'utf8',
    env: process.env,
    timeout: 10000,
  });

  const evidenceAfter = snapshot(resolved.evidencePath);
  const grew = JSON.stringify(evidenceAfter) !== JSON.stringify(evidenceBefore);

  appendLine({
    at: new Date().toISOString(),
    event: payload && (payload.hook_event_name || payload.hookEventName) || null,
    session_id: payload && (payload.session_id || payload.sessionId) || null,
    env_present: present,
    env_values: { QODER_CONFIG_DIR: process.env.QODER_CONFIG_DIR || null },
    resolved: resolved,
    gate: {
      exit_code: gate.status,
      stdout_head: String(gate.stdout || '').slice(0, 120),
      evidence_segments_before: evidenceBefore,
      evidence_segments_after: evidenceAfter,
      evidence_grew: grew,
    },
  });

  // Never hold the turn: this probe observes, the gate above already answered.
  process.exit(0);
});
