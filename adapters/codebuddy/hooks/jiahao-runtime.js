// jiahao-runtime.js — host detection + per-host output shape
// Mirrors ponytail-runtime.js writeHookOutput pattern.

function detectHost() {
  if (process.env.PLUGIN_DATA) return 'codex';
  if (process.env.COPILOT_PLUGIN_DATA) return 'copilot';
  if (process.env.QODER_SESSION_ID) return 'qoder';
  // CodeBuddy sets CODEBUDDY_PLUGIN_ROOT (preferred) and recognizes
  // CLAUDE_PLUGIN_ROOT verbatim; a Claude Code session never sets the
  // codebuddy var, so precedence is safe (grill-t30, ADR-0087).
  if (process.env.CODEBUDDY_PLUGIN_ROOT) return 'codebuddy';
  return 'claude'; // native Claude Code (default)
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
    // (docs.qoder.com/cli/hooks-reference, verified 2026-08; ADR-0028 D5)
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

module.exports = { detectHost, writeHookOutput };
