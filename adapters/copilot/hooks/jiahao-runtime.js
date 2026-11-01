// jiahao-runtime.js — host detection + per-host output shape
// Mirrors ponytail-runtime.js writeHookOutput pattern.

// The platform names this module can answer for. Kept next to the branches
// below so a name a config template passes can never be a name with no shape.
const PLATFORMS = ['claude', 'codex', 'copilot', 'qoder', 'codebuddy', 'antigravity', 'zcode', 'workbuddy'];

// Host detection, in two steps:
//   1. An explicit platform name as the hook's first argument. The host config
//      that spawns the script is what passes it (Codex: `... jiahao-verdict-gate.js
//      codex`); that is host-owned data and beats an environment variable
//      inherited from another agent on the same machine. Every script here is an
//      entrypoint spawned for one event, so the argument is read from the
//      process, not from a caller.
//   2. The environment probe, for hosts whose config cannot pass an argument.
function detectHost() {
  const explicit = process.argv[2];
  if (PLATFORMS.includes(explicit)) return explicit;
  if (process.env.PLUGIN_DATA) return 'codex';
  if (process.env.COPILOT_PLUGIN_DATA) return 'copilot';
  // Qoder Desktop hands a hook subprocess QODER_PROJECT_DIR and
  // QODER_CONFIG_DIR but no QODER_SESSION_ID (#109), so this branch only fires
  // on builds that do; the adapter map passes `qoder` as argv instead.
  if (process.env.QODER_SESSION_ID) return 'qoder';
  // No environment branch for WorkBuddy, deliberately. Its desktop sets
  // WORKBUDDY_* and CODEBUDDY_HOST for every child process, so a session started
  // from a WorkBuddy terminal - or a test suite running on that machine - would
  // answer 'workbuddy' no matter which host actually spawned the hook. The
  // adapter map passes `workbuddy` as argv instead (#110), the same way Qoder's
  // does.
  // CodeBuddy sets CODEBUDDY_PLUGIN_ROOT (preferred) and recognizes
  // CLAUDE_PLUGIN_ROOT verbatim; a Claude Code session never sets the
  // codebuddy var, so precedence is safe (grill-t30).
  if (process.env.CODEBUDDY_PLUGIN_ROOT) return 'codebuddy';
  // ZCode sets both the CLAUDE_* compat vars and its own ZCODE_* family
  // (#108 probe, 2026-10-31, ZCode 3.16.2): a config-tier install there
  // carries no argv, so its own session id is the marker. Checked before the
  // claude default because a ZCode session also sets CLAUDE_SESSION_ID.
  if (process.env.ZCODE_SESSION_ID) return 'zcode';
  return 'claude'; // native Claude Code (default)
}

// Read-only tool names, per host family. The guard is a modification guard:
// reading the injected rules is how a verifier works, not a bypass (#71 item 3).
// The names are host dialect, so they live here with the payload/output shapes
// rather than in the judgment script. Shell/exec tools are deliberately absent
// even when their command happens to be read-only - only tools that cannot
// write are listed.
const READ_ONLY_TOOLS = Object.freeze([
  'read', 'view', 'glob', 'grep', 'ls', 'list_directory', 'list_dir',
  'notebookread', 'read_file', 'search_files', 'file_search', 'grep_search',
]);

function isReadOnlyTool(toolName) {
  return READ_ONLY_TOOLS.indexOf(String(toolName || '').toLowerCase()) !== -1;
}

// Field names differ per host: the Claude-shaped payloads carry session_id and
// agent_type, Copilot CLI's camelCase events carry sessionId and agentName (with
// agentType only when known). Normalizing at the stdin boundary gives every hook
// one shape for those identity fields, and keeps the spelling of a host's
// payload in this adapter file instead of spreading host names through the
// judgment logic. Other payload fields are read in their host-neutral form and
// are not renamed here.
function normalizePayload(parsed) {
  const p = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  const sessionId = p.session_id || p.sessionId || p.conversationId || null;
  const agentType = p.agent_type || p.agentType || p.agentName || '';
  const stopHookActive = p.stop_hook_active === true || (typeof p.executionNum === 'number' && p.executionNum > 0);
  return Object.assign({}, p, { session_id: sessionId, agent_type: agentType, stop_hook_active: stopHookActive });
}

// Write hook output in the format the current host expects.
function writeHookOutput(text, event) {
  const host = detectHost();
  const trimmed = text.slice(0, 10000); // 10k char injection cap

  if (host === 'codex') {
    console.log(JSON.stringify({
      systemMessage: 'JIAHAO',
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: trimmed,
      },
    }));
  } else if (host === 'copilot') {
    // Copilot flat output: additionalContext (multi-event since CLI 1.0.11, #2142)
    console.log(JSON.stringify({ additionalContext: trimmed }));
  } else if (host === 'qoder') {
    // Qoder CN Desktop 0.4.11 answers this envelope: the shipped worker runtime
    // per-branch zod schema requires hookSpecificOutput.hookEventName, lines
    // quoted in docs/evidence/v0.3.0/qoder-runtime-hook-schema.txt. File
    // evidence from the installed build - no injection was watched landing in a
    // real Qoder turn (#109).
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: trimmed,
      },
    }));
  } else if (host === 'codebuddy' || host === 'workbuddy') {
    // CodeBuddy: the live-verified envelope on the Claude-Code-compatible
    // path is hookSpecificOutput JSON for every event (settings-path hooks
    // probed on CodeBuddy Code CLI 2.151.0) - SessionStart included.
    // WorkBuddy runs the same agent CLI (@genie/agent-cli 2.165.0) and accepts
    // the same shape; its own live probe covered the Stop channel, not the
    // injection envelope (#110), so this branch is shared rather than copied.
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: trimmed,
      },
    }));
  } else if (host === 'zcode') {
    // ZCode: strict output schema, "any extra key fails validation" (product
    // hooks doc, read 2026-10-31), so no systemMessage copy rides along. The
    // payload names the event both as hook_event_name and hookEventName; the
    // output keeps the Claude-shaped hookSpecificOutput envelope.
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: trimmed,
      },
    }));
  } else if (host === 'antigravity') {
    if (event === 'SessionStart') {
      console.log(JSON.stringify({
        injectSteps: [
          {
            systemMessage: {
              systemMessage: trimmed,
            },
          },
        ],
      }));
    } else {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: event,
          additionalContext: trimmed,
        },
      }));
    }
  } else {
    // Native Claude Code: SessionStart = plain stdout, SubagentStart = JSON
    if (event === 'SessionStart') {
      console.log(trimmed);
    } else {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: event,
          additionalContext: trimmed,
        },
      }));
    }
  }
}

// Exit code that carries a block decision. Codex 0.163.0, Copilot CLI
// 1.0.105 (#80, 2026-10-30), Antigravity 1.2.12 (#111) and ZCode 3.16.2
// (#108, 2026-10-31) continued the turn on exit 0 only - there, exit 2 did not
// block. Claude-shaped hosts block on exit 2, and Qoder CN Desktop 0.4.11
// (#109, 2026-10-31) sits with them: it continued the turn on exit 2 with the
// reason on stderr AND on exit 0 with the decision field, so it keeps the Claude
// code. WorkBuddy AI 5.9.4 (#110, 2026-10-31) is the opposite: it continued only
// on exit 0 + {decision:"block"}; exit 2 was not probed there. The Codex stderr
// copy is a log aid on its exit-0 path, not the block channel.
const BLOCK_EXIT_CODES = Object.freeze({
  codex: 0, copilot: 0, antigravity: 0, zcode: 0, workbuddy: 0, qoder: 2, claude: 2, codebuddy: 2,
});

function writeBlockOutput(reason) {
  console.log(JSON.stringify({ decision: 'block', reason: reason }));
  const host = detectHost();
  if (host === 'codex') console.error(reason);
  // Unknown hosts keep the Claude exit-2 channel rather than silently passing.
  process.exitCode = BLOCK_EXIT_CODES[host] ?? 2;
}

module.exports = { detectHost, writeHookOutput, writeBlockOutput, normalizePayload, isReadOnlyTool, PLATFORMS };
