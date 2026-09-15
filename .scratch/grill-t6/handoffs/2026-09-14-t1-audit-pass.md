# Handoff — grill-t6 T-1 round AUDIT-PASSED closeout (2026-09-14)

## State at handoff

- Branch stack landed on GitButler workspace: grill-t6-doc-round (qxs/b7ccbeb) -> grill-t6-t1-round (szy/ac31dac -> repair yro/014f3a3 -> audit-fix kpt/8887728).
- Audit verdict: PASS (second pass; first pass sent back one blocking finding F-1 public-tier test kill, closed by repair; one residual artifact defect R-1, closed by kpt).
- Full evidence: .scratch/grill-t6/reports/2026-09-14-audit-t1.md (initial audit + RE-AUDIT appendix); .scratch/grill-t6/reports/2026-09-14-report.md (implementation report incl. repair table).
- Verified at closeout: jest 56/56 suites 780/780 exit 0; public tier 56/56 with 7 reasoned skips; gate:all exit 0 (27 entries, 4 pre-existing ci-mode UNVERIFIABLE); pack 226,282 B/98 files < 230,000 cap; install --dry-run exit 0; rung_ladder + export_manifest reproduce byte-identically on the pinned corpus (trials.jsonl: 155 parsed-identical rows, CRLF/LF cosmetics only).

## Next grill direction: T-6 CONFIRMATORY round (ADR-0064 D-B)

1. Adopt the settled rung-2 candidate: G2 top survivor char-3|count|lr|C1.0|df2 (score 0.9723); second survivor word-1|count|lr|C1.0|df2 (0.9243). Evidence: bench/research/out/survivors.json + the Rung-2 table in out/attribution-report.md (restored by kpt).
2. Move bench/research/sklearn-port.js + g6-manifest.json into src/ as the product port; G6 gate (g6_gates in thresholds.json) stays the equivalence contract — tier (b) rel-L2 is diagnostic-advisory per the ADR-0064 repair-round ruling; (a) token multiset + (c) logit block.
3. Run the confirmatory T-6 bench against the pinned corpus (994bdeb3, 396 items). Success criterion = the pre-registered MDE stop-loss gate (D-A: d_MDE=0.084663 frozen, survivor floor 0.563863), NOT absolute target values.
4. Devin truth collection NOW unlocks (rung-1 settled): scripts/collect-devin-corpus.js drop -> validate -> snapshot; never feed rung statistics; item-level disjointness (devin- prefix, no pb- prefix, no private/gold20 id collision) is gated.
5. defer-0040 disposition at the next documentation-round evaluation (review 2026-12-14).
6. Report honesty obligations carried forward: trigger-mask control is NOT HEALTHY (+0.1093 — label-correlated lexical artifacts in the public corpus); closing channel carries ~0.28 of recall@FP0; both must be restated in any confirmatory claim. Attribution report's "Usable definition" section is the pre-registered settlement contract.

## Hard rules that still bind

- All writes via but; no raw git mutations; no push/PR/tag/release without explicit ask.
- Thresholds move only via same-commit ADR (ADR-0027 D2); confirmatory surface is frozen (freeze hash now covers private_corpus too).
- d_MDE stays frozen at 0.084663 for this round (re-freezing = new round).
- Public-tier tests skip only through test/helpers/skip.js (verified by repair: fullT pattern in adr-0064-t1-wiring).
- Trend anchor advisory warns once, never blocks (streak 1 of K=2).

## Open nits carried to doc round (non-blocking)

- check-corpus-classes.js privIds block keeps a dead try/catch around requireCorpus (process.exit is not throwable) — unreachable in shipped flows; clean up when convenient.
- PV-3 historical nit: doc-round self-report 738 vs implied 742 (verified via 780 now = 742 + 38 wiring tests) — a stale figure in a commit message, no action required beyond awareness.

## Suggested skills for the next round

- $implement for the adoption line; tdd at the port seam; $code-review before commit; $handoff to close.
- atomcode-research only if new external literature is needed.

## Environment

- python 3.11 + sklearn 1.9.1 (research lane); m2cgen 0.10.0 available if the estimator layer is ever regenerated.
- Pinned corpus clone: %TEMP%jiahao-polygraph-994bdeb.../data. If temp is cleaned, re-clone at pinned ref 994bdeb3e75bb5c2ffac4f35a3eca9bac02c6356.
