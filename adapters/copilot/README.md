# GitHub Copilot CLI Adapter

Repo-level hook config for GitHub Copilot CLI: copy hooks.json to
`.github/hooks/jiahao.json` and the hook scripts (hooks/*.js from this
package) to `.github/jiahao/hooks/`. Flat schema `{version: 1, hooks:
{event: [entry]}}` per the official hooks reference.

Event mapping:
- sessionStart -> jiahao-activate.js (additionalContext injection)
- userPromptSubmitted -> jiahao-mode-tracker.js (mode commands + reminder;
  attested injection path)
- subagentStart -> jiahao-subagent.js
- agentStop -> jiahao-verdict-gate.js (block forces continuation; the CLI
  force-ends after 8 consecutive blocks)
- sessionEnd -> jiahao-sweep.js (sentinel sweep)

Known degradations (verified against copilot-cli issues, 2026-08):
- #1730 (open): repo-level `.github/hooks/` sessionStart may not fire;
  userPromptSubmitted is the attested injection path.
- #2142: sessionStart additionalContext was dropped until CLI 1.0.11.
- Copilot exit codes default to warn/fail-open outside
  preToolUse/permissionRequest; the agentStop block follows the CLI's own
  continuation semantics, not Claude's exit-2 stderr convention (ADR-0028
  R6: differences are recorded, not shimmed).
