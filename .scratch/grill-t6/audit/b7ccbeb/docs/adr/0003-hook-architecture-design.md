# Hook Architecture Design

## Context

ADR-0001 established jiahao as a prompt-as-mental-model skill distribution.
ADR-0002 defined the iron laws content. The open question: how does jiahao
inject the iron laws into second-party verifier agents at the right lifecycle
moment?

Atomcode research (24 sources, 11+ web_fetch reads) surveyed ponytail's hook
architecture, Claude Code's 31 lifecycle events, Codex hooks, VS Code Agent
Hooks, OpenAI Agents SDK, and LangGraph. Key findings:

- Ponytail uses 3 hooks (SessionStart, SubagentStart, UserPromptSubmit) with
  plain stdout injection for SessionStart and JSON for SubagentStart.
- SessionStart context does NOT propagate to subagents (ponytail issue #252) —
  SubagentStart hook is mandatory for verifier subagents.
- Stop hook with decision:block semantics is the mechanistic implementation of
  anti-false-completion (prove-it's verify.sh pattern).
- Multi-host output shapes differ: Claude plain stdout vs Codex JSON vs Copilot
  {additionalContext} vs Qoder (no SessionStart, inject on UserPromptSubmit).
- Windows stdin hang requires 1s timeout guard (ponytail #443).

## Decision

Adopt a 4-event hook architecture mirroring ponytail's 3-event pattern, plus a
Stop/SubagentStop verdict gate:

1. **SessionStart** — full iron laws injection + flag file persistence
2. **SubagentStart** — inject into verifier subagents (agent_type matcher:
   verify|review|critic|check; fail-open)
3. **UserPromptSubmit** — mode tracking (/jiahao lite|full|ultra|off) +
   anti-drift reminder
4. **Stop/SubagentStop** — verdict gate: block if no evidence in
   .jiahao-evidence file; respect stop_hook_active (8-cap guard)

Scripts:
- jiahao-activate.js (SessionStart)
- jiahao-subagent.js (SubagentStart)
- jiahao-mode-tracker.js (UserPromptSubmit)
- jiahao-verdict-gate.js (Stop)
- jiahao-runtime.js (host detection + per-host output shape)

NOT used: PreToolUse/PostToolUse (security/formatting domain, not jiahao's
behavioral discipline scope — ponytail doesn't use them either).

## Consequences

- The Stop hook is the mechanistic anti-false-completion gate: it prevents the
  verifier agent from "completing" without evidence. This is jiahao's core
  structural defense against False Completion Syndrome.
- Multi-host support via runtime.js writeHookOutput: same logic, different JSON
  shapes per host (Claude/Codex/Copilot/Qoder).
- The evidence file (.jiahao-evidence) is the bridge between the iron laws
  (which demand evidence) and the verdict gate (which blocks without it).
- Windows stdin hang guard (1s timeout + unref) is mandatory per ponytail #443.
- SubagentStart uses fail-open: if agent_type cannot be determined, inject
  anyway (better to over-inject than miss a verifier subagent).
