# Qoder Adapter (international CLI)

Merge settings.json into your project `.qoder/settings.json` (or install
user-level at `~/.qoder/settings.json`) and copy the hook scripts
(hooks/*.js of this package) to `.qoder/hooks/`. The contract is homologous
to Claude Code: `hookSpecificOutput.hookEventName` + `additionalContext`,
exit 2 blocks on Stop/UserPromptSubmit (docs.qoder.com/cli/hooks and
cli/hooks-reference, verified 2026-08).

Event mapping: SessionStart (matcher startup|resume; non-blocking) ->
jiahao-activate.js; SubagentStart -> jiahao-subagent.js; UserPromptSubmit ->
jiahao-mode-tracker.js; Stop/SubagentStop -> jiahao-verdict-gate.js
(exit-2 blocking verifier gate).

Honest notes:
- SessionStart IS supported (matcher startup/resume/clear); the old runtime
  comment "Qoder has no SessionStart" was wrong and has been corrected.
- SessionEnd is not registered because it was not verified in the official
  event list at research time; the next session's first hook reconcile
  remains the sweep baseline (ADR-0024 D3).
- CN fork (Lingma / Qoder CN): 5 events only, no SessionStart, Stop cannot
  block, config under `~/.lingma/` — this adapter targets the international
  CLI. Do not assume parity.
