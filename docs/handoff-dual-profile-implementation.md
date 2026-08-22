# Handoff: jiahao Dual-Profile Implementation Complete

**Date:** 2026-08-23
**Commit range:** 5abab78..6e2f8a5 (6 commits)
**State:** 90/90 tests passing, check-drift clean, eval harness green

## What was implemented

ADR-0010 Option D — dual-profile role-tagged distribution.

### 1. SKILL.md (src/SKILL.md)

Single source of truth, split into tagged sections:
```
## Generator Profile    — 3 rules, ~15 lines, surface-signal attack
## Verifier Profile     — full discipline, ~99 lines
## Boundaries           — shared, both profiles embed
```

### 2. build-adapters.js

`splitByProfile()` splits SKILL.md by section headings. Generates 11 adapter
files: 4 instruction-tier pairs (cursor/windsurf/cline/instruction-tier, each
with `jiahao.md` + `jiahao-generator.md`) + 3 hook-tier + 1 MCP.

### 3. check-drift.js

Profile purity assertions: generator adapters must NOT contain verifier-only
terms (verification ladder, second-party verifier, LLM critic, etc.).

### 4. hooks

`jiahao-paths.js`: added `profilePath()` returning `.jiahao-profile` flag path
`jiahao-profile.js`: shared splitByProfile/loadProfileSections module
`jiahao-activate.js`: reads `.jiahao-profile`, selects generator/verifier rules
`jiahao-verdict-gate.js`: generator = advisory mode (exit 0, don't block);
  verifier = blocking mode (exit 2 + block JSON)

### 5. jiahao-mcp/index.js

`registerPrompt` + `registerTool` accept `profile: 'generator' | 'verifier'`
parameter. Loads profile section via `loadProfileSections()`.

### 6. Tests

- `test/dual-profile.test.js`: 8 tests — section presence, purity, adapters,
  build output, activate hook, verdict-gate advisory
- `test/hooks.test.js`: beforeEach cleanup prevents parallel flag leakage

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| npm test 90/90 green | ✅ |
| check-drift passes | ✅ |
| eval harness FCR = 0 | ✅ (5/5 fixtures) |
| dual-profile SKILL.md sections | ✅ |
| profile purity in generator adapters | ✅ |
| hook-tier unchanged (codex/claude-code) | ✅ |
| MCP adapter updated | ✅ |

## Key design decisions baked in

- Profile selected at install time via `.jiahao-profile` flag, NOT runtime
- Generator profile = surface signals only (no verification ladder, no LLM critic)
- Verifier profile = full discipline (all 7 iron laws, 6-rung ladder, bias guards)
- Shared `## Boundaries` section duplicated into both profiles
- build-time splitting (Option C), not runtime parsing (Option A rejected)

## Remaining (not this session)

- anysearch-cli integration (verifier profile LLM critic rung 5, SAFE pattern)
  — deferred, tracked in CONTEXT.md
- Profile selection UX in installation scripts — future grill
- Calibration/verdict-gate integration with profile — future grill

## Key paths

- SKILL.md: D:/Aworker/jiahao/src/SKILL.md
- ADR-0010: D:/Aworker/jiahao/docs/adr/0010-dual-profile-role-tagged-distribution.md
- Profile module: D:/Aworker/jiahao/hooks/jiahao-profile.js
- Tests: D:/Aworker/jiahao/test/dual-profile.test.js
