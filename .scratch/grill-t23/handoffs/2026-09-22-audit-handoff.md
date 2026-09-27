# grill-t23 audit handoff - PASS WITH FINDINGS (2026-09-22)

Audit report: `D:/Aworker/jiahao/.scratch/grill-t23/reports/2026-09-22-audit.md`
Audit evidence (never-commit): `D:/Aworker/jiahao/.scratch/grill-t23/audit-evidence/` - 14 verbatim captures.
Auditee branch: `grill-t23-docs` (base `688e113`, tip `9b27a5e`), local-only, never pushed.

## Verdict

PASS WITH FINDINGS. Every substantive claim re-verified live and verbatim: gate:all exit 0 (4 capability-absent disclosed), 77 suites / 1307 tests / 0 skipped, pack 340,290 < amended cap 380,000, liveness full-chain exit 0, all governance checks in sync, ADR-0082 channel conformant end-to-end, gh metadata live, zero R1 diff, no push.

## Dispositions owed at the next round's T-0 (the T4-C nit set)

| id | class | repair |
| --- | --- | --- |
| T4-C-1 | evidence freshness | re-capture `run-test-gate.txt`, `round-facts.txt`, `rewrite-map.txt` post-fixpoint (Disclosed Re-Capture channel), or amend the 3 table rows to name the run-1 red + cite audit re-run |
| T4-C-2 | never-commit scope | `.scratch/grill-t23/ref-assets/` is tracked despite the task-book label; untrack it (bytes stay) or amend the label via ledger record - disclose either way |
| T4-C-3 | consent sweep | dated backfill naming `defer-0066`; registry note marking the C1-escape instance resolved-in-t23-harness |
| T4-C-4 | C-7 formality | add the tick-2/2 lookback line with the correct count (25 captures + 1 fixture + 1 sheet) |
| T4-C-5 | spec section 8 | add the per-finding disposition table for T3-C-1/2/3 (all three = fixed) |
| T4-C-6 | ADR-0079 D6 | disclose the `8effaaf` same-commit deviation (mirror rode the re-pin commit), or amend D6 if combined sync+repin is accepted |
| T4-C-7 | carve-out comments | add the inline disclosure comment to `.github/ISSUE_TEMPLATE/config.yml` |
| T4-C-8 | evidence bar | verbatim `gh repo view` capture leg for the external-metadata claim |
| T4-C-9 | record hygiene | `51a66d3` message-vs-diff mismatch; commit-map id/sha mixing; `battery_as_of` absent from map; tri-source headroom figures; unmarked display-form `$` lines |

All are documentation-surface repairs; none blocks the round's substance.

## Carry-forward / standing

- `defer-0068` (ADR-0082 second_reviewer countersign): this audit is the independent review of the channel; the registered slot wants the countersign recorded - discharge at next round T-0 citing this report.
- Social preview: manual upload by user (`docs/assets/brand/social-preview.png`, guide in `docs/assets/README.md`).
- Burn-rate advisory: 4 consecutive carve-out rounds - prefer R3 surfaces next.
- GitButler hazards (now proven twice): index desync (`git reset -q HEAD` before porcelain-based legs) + `A`-pool sweep on id-filtered commits (explicit allowlist before any `but commit`). Round handoff documents the recipe.

## Suggested next grill direction (for the user's grill session)

1. **Disposition round first (precedent)**: grill-t24 opens by absorbing this audit + disposing T4-C-1..C-9 - all R3/documentation surface, no cap pressure (headroom 39,710 B).
2. **Candidate grill themes after disposition**:
   - *Evidence-freshness discipline*: the "committed artifact froze at run-1 red" class - worth an ADR clause or a capture-battery fixpoint rule (legs must be re-captured after the last regen fixpoint, or the table must name run-N provenance).
   - *Never-commit scope formalization*: the regex class vs. labeled-paths mismatch (ref-assets slipped through the gap) - one ledger decision closes it.
   - *defer-0066 instance burn-down*: two of four instances effectively touched this round; a harness-consolidation round could close the row.
   - *GitButler-interop governance*: index desync + id-filter sweep hazards now have receipts - a `but`-usage ADR (allowlist discipline) would codify the lessons.
3. If the user wants a product-facing round instead: the front face is complete; remaining external item is only the manual social-preview upload.

## Suggested skills for the next session

- `handoff` (this file's convention), `code-review` pre-commit, `gitbutler` (`but`) for all VCS writes - with the allowlist lesson applied
- `tdd` if any wiring pins are added during disposition repairs
- `neat-freak`/`domain-modeling` at closeout per convention
