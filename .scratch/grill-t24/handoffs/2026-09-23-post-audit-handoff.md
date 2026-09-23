# grill-t24 post-audit handoff — audit PASS WITH FINDINGS (2026-09-23)

Audit report (authoritative — do not duplicate its tables):
`D:/Aworker/jiahao/.scratch/grill-t24/reports/2026-09-23-audit.md`
Round report: `D:/Aworker/jiahao/.scratch/grill-t24/reports/2026-09-23-report.md`
Branch `grill-t24-docs`, base `c526de3`, durable tip `28cb29a`, local-only, never pushed.

## Audit verdict

**PASS WITH FINDINGS.** All three ADR-0083 D-E mandatory scope lines pass
mechanically (evidence-freshness ordering vs anchor `9efe7b6`; never-commit
registry coverage nc-001..009; per-commit `git show --name-only` conformance
over 23 durable commits). Hard acceptance rerun green on the committed tree
(78/1325/0, gate:all exit 0, pack 341,056 B, liveness chain incl. MCP
initialize). defer-0069's unfreeze condition is met — discharge it at the next
bookkeeping pass.

## T5-C findings for next-round T-0 disposition (per precedent)

- T5-C-1 (medium): consent sweep dropped standing rows defer-0060/0064/0065 —
  dated backfill in the report (same repair shape as t23's defer-0066 fix).
- T5-C-2: three unmarked display-form `$` lines (never-commit-sweep,
  compile-yaml, compile-node-check) — T4-C-9 recurrence; mark them in the
  report's evidence table.
- T5-C-3: report must actually state "sixth consecutive carve-out round" —
  ADR-0083 D-F already claims it is disclosed.
- T5-C-4: re-point the C-7 enumeration citation (the cited legs enumerate
  untracked paths, not the committed set).
- T5-C-5: cosmetic cluster — stale 76/77 test titles asserting 78, GOAL.md
  "Grilling in progress", commit 0ef7239's "nc-007" mislabel (actual nc-004),
  check-ci-jobs EXIT 1 glossed as "real parse OK".

## URGENT — worktree state before any next-round work

The main worktree `D:/Aworker/jiahao` currently holds **24 polluted evidence
files** (uncommitted): a post-closeout capture run executed under **bun**
(execPath inheritance), producing red bytes — gate-all bun panic, jest 78/78
fail, npm-cli path miss — all stamped `captured-at-head: 28cb29a`. The durable
commits are intact. Before the next round: restore the evidence dir to the
committed bytes (`git checkout`/discard of those uncommitted writes) or
re-capture under node; do NOT commit the red set. Side effect while polluted:
`rewrite-map --check` and `round-facts --check` go red (headers are doc
citations) — clears when the tree is clean. Capture harness needs a node
runtime pin or a non-node refusal — candidate instance for defer-0066.

## Next grill direction (per audit + standing advisories)

1. T-0: absorb this audit + the round report pair; dispose T5-C-1..C-5.
2. Natural themes: defer-0066 burn-down (capture-harness hardening — now with
   the execPath-portability instance), the never-commit registry's first
   deprecate-cycle exercise, or an R1/R3 runtime round (burn-rate advisory
   stands at six consecutive carve-out rounds).
3. Next task book must reference never-commit labels by registry id (nc-NNN),
   never freehand paths (ADR-0083 D-B.2, now in force).

## Suggested skills for the next session

- `grill-with-docs` / `grilling` — if T5-C dispositions or the next round
  object need user adjudication
- `implement` + `tdd` — any wiring-suite or harness change
- `but` (gitbutler) — all VCS writes; D-C allowlist + post-commit
  `git show --name-only` are now codified obligations, dogfood them
- `code-review` — pre-commit; `neat-freak` — closeout fact-surface hygiene
- `handoff` — next transition doc
