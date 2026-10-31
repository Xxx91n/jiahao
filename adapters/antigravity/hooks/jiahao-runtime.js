// jiahao-runtime.js — host detection + per-host output shape
// Mirrors ponytail-runtime.js writeHookOutput pattern.

// The platform names this module can answer for. Kept next to the branches
// below so a name a config template passes can never be a name with no shape.
const PLATFORMS = ['claude', 'codex', 'copilot', 'qoder', 'codebuddy', 'antigravity'];

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
  if (process.env.QODER_SESSION_ID) return 'qoder';
  // CodeBuddy sets CODEBUDDY_PLUGIN_ROOT (preferred) and recognizes
  // CLAUDE_PLUGIN_ROOT verbatim; a Claude Code session never sets the
  // codebuddy var, so precedence is safe (grill-t30).
  if (process.env.CODEBUDDY_PLUGIN_ROOT) return 'codebuddy';
  return 'claude'; // native Claude Code (default)
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
    // Qoder HAS SessionStart (matcher startup/resume/clear, non-blocking);
    // hookSpecificOutput.hookEventName contract is homologous to Claude Code
    // (docs.qoder.com/cli/hooks-reference, verified 2026-08)
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: trimmed,
      },
    }));
  } else if (host === 'codebuddy') {
    // CodeBuddy: the live-verified envelope on the Claude-Code-compatible
    // path is hookSpecificOutput JSON for every event (settings-path hooks
    // probed on CodeBuddy Code CLI 2.151.0) - SessionStart included.
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
// 1.0.105, and Antigravity 1.2.12 (win32, #80/#111) only continued the turn on
// exit 0; Claude-shaped hosts block on exit 2. The Codex stderr copy is a log aid
// on its exit-0 path, not the block channel.
const BLOCK_EXIT_CODES = Object.freeze({ codex: 0, copilot: 0, antigravity: 0, claude: 2, codebuddy: 2 });

function writeBlockOutput(reason) {
  console.log(JSON.stringify({ decision: 'block', reason: reason }));
  const host = detectHost();
  if (host === 'codex') console.error(reason);
  // Unknown hosts keep the Claude exit-2 channel rather than silently passing.
  process.exitCode = BLOCK_EXIT_CODES[host] ?? 2;
}

module.exports = { detectHost, writeHookOutput, writeBlockOutput, normalizePayload, PLATFORMS };
