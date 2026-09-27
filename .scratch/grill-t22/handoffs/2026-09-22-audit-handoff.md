# grill-t22 audit handoff - second-party round audit complete (PASS WITH FINDINGS, 3 nits)

For the grill-t23 session (round-open: audit absorb + disposition, then the round's own question). Authoritative audit record: `D:/Aworker/jiahao/.scratch/grill-t22/reports/2026-09-22-audit.md`; verbatim re-run evidence (uncommitted, never-commit class): `D:/Aworker/jiahao/.scratch/grill-t22/audit-evidence/` - 24 captures + 1 fixture + 2 harness scripts (`capture.cjs` = verbatim battery transform minus mutating legs; `claim-sites.cjs` = 47 grep-able claim checks; added legs coverage-old-base + g6 side-effect watch). The round record audited: `D:/Aworker/jiahao/.scratch/grill-t22/reports/2026-09-22-report.md` + facts canon + ledger closeout. This file is the map, not the content.

## State verified (independent re-run, not the round's own evidence)

- Hard acceptance green at HEAD: gate:all exit 0 (35 gates, 4 ci-mode-unverifiable matching not_run); 76 suites / 1,300 tests / 0 fail; pack 339,408 < 340,000; liveness pack->extract->install->init->MCP all exit 0; anchors 18; rewrite-map 2,051 in sync; registry 61; instrument authoritative; clean-tree CLEAN (my audit tree classified never-commit by the widened regex); g6 replay untouched by my run.
- All four audit-r2 dispositions CONFIRMED live: R2-C-1 (pack under cap, markers on both stale claims, defer-0067 armed, cap untouched); R2-C-2 (marker on t21 report :73); R2-C-3 (keyed FAIL exit 1, no stack - proven by my verbatim badref leg); R2-C-4 (defer-0051 + ADR-0071 reconciled, annotate-not-supersede form).
- ADR-0081 machinery teeth proven in BOTH base directions: the committed b93a5df-anchored leg exits 0; my added dc6d21b stale-base leg exits 1 with keyed FAILs naming the t21-window R2 files (D-A pairing rule bites against cross-round conflation).
- Canon internally consistent AND live-true; committed gate-all.txt's 1,928 citations vs canon 2,051 is the disclosed post-handoff regen ordering, not drift.

## Findings owed (disposition candidates, by class - all nit, none blocking)

- **T3-C-1 (record/precision)**: ADR-0081 D-E :40 says "the round's two R2 touches" but the t22 row registers THREE gtd.files (thresholds.json omitted from the enumeration); the same sentence's "pack-surface compression is R3" conflicts with :39 (the pass trimmed the R2 thresholds.json). Row + report correct; ADR prose wrong. Fix: enumerate three + scope the R3 sentence - in-round prose fix, no machinery change.
- **T3-C-2 (process conformance)**: the closeout consent sweep names defer-0004/0058/0066/0067 but omits chartered lines defer-0060 (standing - and itself compressed this round), defer-0064, defer-0065 (both pending-evaluation), the sunset counter (consecutive_zeros=1 unchanged, no named line), and the never-commit set (substance covered, no named line). States verified stable; literal-incomplete vs spec section 6 / T-3.3. Fix: dated amend-in-place backfill of the named lines, or rejected-with-rationale.
- **T3-C-3 (style)**: .scratch/grill-t22/recapture-clean-tree.cjs dropped the 'use strict' every sibling carries. Zero behavioral impact. Fix: one-line restore on next harness touch - candidate defer-0066 instance.

## Carry-forwards / constraints for the next round

- **defer-0067 is ARMED AND IN-BAND**: headroom = 340,000 - 339,408 = 592 B, below the 2,048 B trigger. Per its acceptance, NO surface-growing commit may land before the pre-registered cap-amendment channel resolves (ADR-0062 D-A policy-before-value + ADR-0071 precedent) or headroom is restored above the band. **Suggested grill-t23 question**: run the cap-amendment round itself (policy ADR first, then pinned-protocol re-measure -> value, second_reviewer countersign), or a compression round if the measure does not justify amendment.
- Audit deliverables stay UNTRACKED for the t23 setup commit to absorb (a8974cd / 9984e8e precedent); audit-evidence joins the never-commit set (the committed regex audit\d*-evidence already covers it).
- C-7 lookback tick two of two owed at t23: committed prose must hold split-form evidence counts; note this report writes "24 captures + 1 fixture" while the t22 round report itself used non-numeric split + enumeration (judgment item - next round may ratify or Disclosed-Repair).
- --coverage-base for t23 pairs with the t22 round base: the t22 charter's parent (b93a5df...) stays the base while the t22 row is latest; once t23's own row lands the base re-anchors at t23's round base (ADR-0081 D-A).
- Consent sweep at t23 closeout should name the full chartered line set incl. defer-0060/0064/0065, sunset counter, never-commit set.
- Never push; GitButler-only writes; evidence $ lines name verbatim argv or marked display-form; committed docs via fs.writeFileSync + byte-check only.

## Suggested skills for the next session

- `$implement` (grill/engineering) for the t23 round; `$handoff` (grill/productivity) for its closeout.
- `$tdd` for any wiring-pin additions; `code-review` before each commit.
- `but` (GitButler) for all VCS writes; `$atomcode-research` only for contested dispositions.
- If the cap-amendment round opens: follow ADR-0062 D-A + ADR-0071 exactly and close defer-0067 by trigger.
