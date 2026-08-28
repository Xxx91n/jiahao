# opencode Adapter (instruction tier, advisory-only)

opencode has no lifecycle hooks and no exit-2 contract (issue #12472 open;
#14551 closed as not-planned), so jiahao runs advisory-only here.

Two injection channels:
1. AGENTS.md (primary; V1 and V2): paste the profile content into your
   project-root AGENTS.md or `~/.config/opencode/AGENTS.md` (both are
   merged by opencode).
2. opencode.json `instructions` (V1 only; accepted but NOT loaded in the V2
   beta): place jiahao-verifier.md next to the provided opencode.json, which
   references it via `"instructions": ["jiahao-verifier.md"]`.

Claude Code compatibility paths (~/.claude/skills) also work.
