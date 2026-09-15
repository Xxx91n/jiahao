# Skill Distribution Adapter Pattern

## Context

ADR-0001 established jiahao as a prompt-as-mental-model skill distribution.
Ponytail (DietrichGebert/ponytail) proved the pattern: single source of truth
(SKILL.md) + per-host thin adapters + CI drift-prevention script. The adapters
range from hook-level (full injection + commands) to instruction-level (static
rules file only).

## Decision

Adopt ponytail's three-tier adapter strategy:

1. **Hook tier** (Claude Code, Codex): full hook injection via
   hooks/jiahao-hooks.json + per-host hook config. Same scripts, different
   config path and output format (handled by jiahao-runtime.js).
2. **Instruction tier** (Cursor, Windsurf, Cline, Copilot, generic AGENTS.md):
   pre-generated native rules files containing the SKILL.md body. No hooks, no
   commands — always-on rules only.
3. **MCP tier** (future): jiahao-mcp server exposing rules via MCP protocol.
   Deferred until core distribution is stable.

Build system:
- scripts/build-adapters.js: generates adapter files from src/SKILL.md
- scripts/check-drift.js: CI guard verifying adapters are in sync with source

## Consequences

- src/SKILL.md is the single source of truth; all adapters derive from it.
- Adapter files are generated, not hand-maintained — editing SKILL.md then
  running build-adapters.js regenerates all adapters.
- check-drift.js runs in CI to prevent stale adapters.
- The instruction tier has no hook-based Stop verdict gate — it relies on the
  model reading and following the iron laws (soft constraint, same as ponytail's
  instruction-tier adapters).
- Adding a new host: add an entry to build-adapters.js, run build, commit.
