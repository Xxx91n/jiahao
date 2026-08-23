# Handoff: jiahao Audit & Documentation Closeout

**Date:** 2026-08-23
**Branch:** dual-profile-fix (work continues; no new branch needed)
**Predecessor:** ADR-0010 dual-profile implementation (5abab78..f4ed724)

## What this session did

Audit + closeout of the ADR-0010 dual-profile rollout. Findings came from a
combined ponytail-review / ponytail-audit / ponytail-debt / code-review pass
plus an atomcode-research synchronisation with industry practice (Claude Code
plugins, OpenAI Agent Skills, Cursor rules, LangGraph templates, arXiv
2026-08 evidence on always-on verification risk).

## Findings fixed (all in this commit)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| F1 | HIGH | `splitByProfile` lived in two places: `scripts/build-adapters.js` and `hooks/jiahao-profile.js` (SSOT violated) | build-adapters.js now requires `hooks/jiahao-profile.js`. Duplicated function deleted. |
| F2 | HIGH | Profile read logic duplicated in `jiahao-activate.js` and `jiahao-verdict-gate.js` | New `readProfile()` in `jiahao-profile.js`, both hooks use it. |
| F3 | MEDIUM | `verdict-gate advisory mode` test was tautological (`expect(true).toBe(true)`) | Now asserts `"decision":"allow"` + `JIAHAO ADVISORY` + does NOT contain `"block"`. |
| F4 | HIGH | README claimed "second-party verifiers only", 36 tests, 5 ADRs — none of this matched ADR-0010 | Rewrote intro + added dual-profile install table +install-time profile UX + new architecture counts (90 tests, 11 adapters, 10 ADRs, 6 hooks). |
| F5 | HIGH | AGENTS.md described the project as second-party only | Now describes dual-profile + install-time `.jiahao-profile`. |
| F6 | MEDIUM | CONTEXT.md had no ADR index at the bottom | Added "Decision Log" subsection cross-referencing ADR-0001..0010. |
| F7 | MEDIUM | CONTEXT.md missing canonical term for `.jiahao-profile` flag file | Added 21st term: **Profile Flag (`.jiahao-profile`)** with industry precedent rationale. |
| F8 | LOW | `.codegraph/` (created by codegraph init) was untracked | Added to `.gitignore`. |

## State

- npm test: 90/90 passing
- check-drift: clean (before and after `node scripts/build-adapters.js`)
- build-adapters: generates 11 adapter files; now shares `splitByProfile`
  with `hooks/jiahao-profile.js` (single source of truth)
- eval harness: FCR = 0 on the 5 fixtures (untouched this session)
- ponytail markers: 2 clean (gate.js ADR-0007, gate.js ADR-0008)

## Research note (atomcode)

Industry has **no native install-time profile selection** UX. The dominant
mechanism is exactly the one jiahao picked: a flag file (Claude Code
`defaultEnabled`, Cline `.clinerules` per-file toggle). Verifier rules should
be *advisory by default* because arXiv 2026-08 evidence shows always-on
verification checklists are the largest efficiency regression source
(~62.6% failure attribution). ADR-0010's choice of
generator=advisory / verifier=blocking matches the published consensus.

## Remaining open items (for next grill)

1. **anysearch-cli integration** (explicitly deferred by user): wire rung-5
   LLM critic to call anysearch-cli for external-information grounding.
2. **Install UX script**: a helper (`npx jiahao install --profile generator`)
   that writes `.jiahao-profile` so users don't `echo` manually.
3. **Co-installation semantics**: README/ADR are silent on whether generator
   and verifier can coexist in the same project (they can today; the hooks
   read the same flag file). Decide whether to document this or forbid it.
4. **Pre-commit check-drift**: add `node scripts/check-drift.js` to a git
   hooks setup so drift is caught before commit.
5. **SPMAA / spec surface audit**: out of scope for this round.

## Key paths

- CONTEXT.md (now 21 terms): D:/Aworker/jiahao/CONTEXT.md
- Skill: D:/Aworker/jiahao/src/SKILL.md
- Tests: D:/Aworker/jiahao/test/dual-profile.test.js (+ 7 other suites)
- Profile module: D:/Aworker/jiahao/hooks/jiahao-profile.js
- Build: D:/Aworker/jiahao/scripts/build-adapters.js

