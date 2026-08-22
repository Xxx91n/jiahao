// jiahao-runtime.js — host detection + per-host output shape
// Mirrors ponytail-runtime.js writeHookOutput pattern.

function detectHost() {
  if (process.env.PLUGIN_DATA) return 'codex';
  if (process.env.COPILOT_PLUGIN_DATA) return 'copilot';
  if (process.env.QODER_SESSION_ID) return 'qoder';
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
    // Copilot only accepts SessionStart output
    console.log(JSON.stringify({ additionalContext: trimmed }));
  } else if (host === 'qoder') {
    // Qoder has no SessionStart; injection happens on UserPromptSubmit
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
