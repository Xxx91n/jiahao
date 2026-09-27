# grill-t24 round handoff - Declared-vs-Actual Drift landed (2026-09-23)

Branch: `grill-t24-docs` (base `c526de3`, tip = closing fixpoint),
local-only, NOT pushed. Round report:
`D:/Aworker/jiahao/.scratch/grill-t24/reports/2026-09-23-report.md`.

## Landed

- ADR-0083 `docs/adr/0083-declared-vs-actual-drift-clauses.md` - four
  clauses + D-E audit-window inheritance + the non-anchoring-commit
  convergence rule.
- `docs/governance/never-commit.json` - the single-source registry
  (nc-001..009, active/deprecated lifecycle, deprecate-not-delete).
- `test/adr-0083-wiring.test.js` - registry schema + seed probes +
  tracked-tree leg (closed LEGACY grandfather set) + captured-at-head
  shape + ordering invariant + ci.yml glob-equal/lower-bound/known-file +
  defer-0069 + trend row + coverage leg + CONTEXT umbrella term.
- `.github/workflows/ci.yml` - declared carve-out parity bump with inline
  disclosure comment.
- `AGENTS.md` governance bullets; `defer-0069`; `grill-t24-doc-round` trend
  row; README + zh-CN count/index sync (D6 rhythm preserved).
- Evidence `.scratch/grill-t24/evidence/` - every capture carries the
  `captured-at-head` header (first live firing of D-A).

## Verification posture

See the report's evidence table; every claim names a rerunnable leg.
The facts canon (`round-facts.json`) is the number source of truth;
`report_commit: null` by design.

## Carry-forwards for the next round

- `defer-0069`: first live firing of the three audit-window check lines -
  the next audit names all three + verdicts, then discharges.
- `defer-0068`: quarterly tide (2026-12-15) second-reviewer slot.
- `defer-0066` instances 1-3 open (capture-harness hardening).
- Re-anchor any new round's coverage-base pin to ITS base (per-round state).
- GitButler recipe: `git reset -q HEAD` before porcelain legs; explicit
  path-id allowlists on every `but commit`; `git show --name-only` after.
- Never-commit paths: consult `docs/governance/never-commit.json` (the
  registry), never a hand-rolled label.

## Suggested next grill direction

1. Absorb the t24 audit (dispose T5-C findings at T-0 by precedent).
2. defer-0066 instance burn-down or the registry's first deprecate-cycle
   exercise are natural documentation-round themes.

## Suggested skills for the next session

- `handoff`, `gitbutler` (`but` writes only), `tdd` on wiring changes
- `code-review` pre-commit; `neat-freak`/`domain-modeling` at closeout

