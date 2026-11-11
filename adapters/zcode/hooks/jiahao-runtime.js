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
  // (#108 probe, 2026-10-31, ZCode 3.16.2): an install driven by the config file there
  // carries no argv, so its own session id is the marker. Checked before the
  // claude default because a ZCode session also sets CLAUDE_SESSION_ID.
  if (process.env.ZCODE_SESSION_ID) return 'zcode';
  return 'claude'; // native Claude Code (default)
}

// Read-only tool names, per host family. The guard is a modification guard:
// reading the injected rules is how a verifier works, not a bypass (#71 item 3).
// The names are host-specific, so they live here with the payload/output shapes
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
  // #124: the verdict gate's claim gate reads this turn's own words; hosts
  // that spell the field camelCase (same config family as sessionId /
  // agentName above) fold onto the snake_case name the gate reads. The first
  // non-empty spelling wins (round 2: an empty snake_case field must not
  // mask a valid camelCase one); an empty string is a claim source the gate
  // skips anyway, so the fallback only ever widens what the gate can read.
  let lastAssistantMessage = null;
  for (const v of [p.last_assistant_message, p.lastAssistantMessage]) {
    if (typeof v === 'string' && v.trim()) { lastAssistantMessage = v; break; }
  }
  if (lastAssistantMessage === null && typeof p.last_assistant_message === 'string') {
    lastAssistantMessage = p.last_assistant_message; // preserve the raw field
  }
  return Object.assign({}, p, {
    session_id: sessionId, agent_type: agentType, stop_hook_active: stopHookActive,
    last_assistant_message: lastAssistantMessage,
  });
}

// Characters an injection may carry. The largest shipped profile is the
// generator one: 10872 characters of rules, 10910 once the status line is
// appended, as measured on src/SKILL.md at 0.4.0 (#170). It has to fit whole -
// the old 10000 cap sliced that text in the middle of `**Long answers say one
// thing per line.**`, so the injected text stopped mid-word and the rule was
// gone. Whether a host handed that text to a model was never probed; this
// module only sees its own output.
// 12000 leaves about a tenth of headroom before the next rules edit starts
// cutting again.
//
// No host-side limit was measured for additionalContext / systemMessage on any
// of the eight hosts, so this number is jiahao's own choice, not a host
// constraint (#170). A host that truncates on its own would still cut; what this
// can control is that jiahao never cuts silently - every cut states where it
// landed and how much it dropped.
//
// #170 offered three ways to fix the truncation and said to pick one. Raising
// the cap is this module's answer for today's text. The cut handling below is
// not a second fix for the same defect - it is what keeps a future overflow
// from going back to the old silent hard slice, which is the part the ticket
// also asked for as an assertion. The cap alone would restore that behaviour the
// moment the profile passes 12000 again.
//
// Exported because the tests and docs/evidence measure against it; nothing
// outside this module changes it.
const INJECTION_CAP = 12000;

// How a cut over the cap is placed. One object rather than loose constants:
// these values only mean anything together.
const CUT_POLICY = Object.freeze({
  // Room kept free so the notice cannot push the result back over the cap.
  noticeRoom: 200,
  // How far behind the budget a break may sit. Without a limit, one lone early
  // newline in an otherwise unbroken text would cut almost everything away.
  backoffReach: 1200,
});

// Where a cut can land, in preference order: a paragraph break, a line break,
// then a gap between words. Preference, not distance: the first kind with an
// occurrence inside the reach wins, so a line break can beat a nearer word gap.
// The kind is kept so the notice can always name it.
//
// There is no sentence-end kind on purpose. `lastIndexOf('. ')` cannot tell a
// sentence end from `U.S. ` or `Dr. `, and a cut placed there and reported as a
// clean sentence end would be a false claim about the text the model receives.
// A guarantee this code cannot keep is not offered.
const CUT_PLACES = [
  { kind: 'paragraph break', find: (t, b) => t.lastIndexOf('\n\n', b) },
  { kind: 'line break', find: (t, b) => t.lastIndexOf('\n', b) },
  { kind: 'word gap', find: (t, b) => t.lastIndexOf(' ', b) },
];

// Where to cut a text that is over budget: the first place kind with an
// occurrence within backoffReach behind the budget, or null when none is close
// enough. A place further back is rejected - dropping that much text to land
// cleanly is the worse trade.
function cutPoint(text, budget) {
  for (const place of CUT_PLACES) {
    const at = place.find(text, budget);
    if (at > 0 && budget - at <= CUT_POLICY.backoffReach) return { at, kind: place.kind };
  }
  return null;
}

// Fit an injection into the cap. The result is never longer than the cap, and
// the notice always says where the cut landed and how much was dropped. Each
// kind is a statement about lines, not about words: a paragraph break keeps
// whole paragraphs, a line break keeps whole lines, a word gap keeps whole
// words, and the fallback cuts inside one. A line break does not prove a word
// ends there either - a word split across lines is cut by both - so nothing
// here claims a word is never split, and none of it promises a whole sentence.
// A line break in hard-wrapped prose can land mid-sentence too.
function fitInjection(text) {
  if (text.length <= INJECTION_CAP) return text;
  const budget = INJECTION_CAP - CUT_POLICY.noticeRoom;
  const cut = cutPoint(text, budget);
  const kept = cut ? text.slice(0, cut.at) : text.slice(0, budget);
  const where = cut
    ? ' at a ' + cut.kind
    : ', mid-word: no break within '
      + CUT_POLICY.backoffReach + ' characters before the cut';
  return kept + '\n[jiahao] the injected rules were shortened to stay under '
    + INJECTION_CAP + ' characters' + where + '; '
    + (text.length - kept.length) + ' characters did not fit.\n';
}

// Write hook output in the format the current host expects.
function writeHookOutput(text, event) {
  const host = detectHost();
  const trimmed = fitInjection(text);

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

module.exports = { detectHost, writeHookOutput, writeBlockOutput, normalizePayload, isReadOnlyTool, PLATFORMS, INJECTION_CAP };
