# GOAL — grill-t7 v2-planning round (anti-loss anchor, updated 2026-09-15)

Current phase: V2 THREE-STAGE EXECUTION — doc round -> collection round ->
freeze+adjudication round (D-016). Task book: handoffs/next-round.md.
Authority: decision-ledger.md D-012..D-016 (D-001..D-011 stay current as
constraints/precedents). Spec restatement: spec-devin-v2.md.
Settled v1 verdict: indeterminate k=3/12 (burned; never revisited; v1 corpus
stays ground-truth only, never conformity-cited).

## Task spine (order binding)
1. R-1 DOC ROUND COMMIT FIRST: bench/research/devin-corpus-v2/ plan.json +
   eval-plan.json + docs/adr/0068-*.md + wiring seeds + claim-template v2 slot
   + deferred tally row + README ADR index + anchors. Structured contamination
   registry inside the plan ({parameter,value,v1_informed,basis} per row).
   NO v2 collection before this commit lands.
2. R-2 COLLECTION: first parameterize collect-devin-corpus.js / devin-oot.js
   for --snapshot-dir (v1 paths stay default). Then session-side drops into
   devin-corpus-v2/incoming/ -> validate -> snapshot devin-corpus@v2.
   Deterministic stopping function; total attempt cap; mining-rate,
   session_id, batch_id, honest success/failure registered per item.
3. R-3 FREEZE+ADJUDICATE: labels still blind -> derive integer tables from
   landed n via scripts/reverify.js clopperPearson95 -> freeze commit ->
   unlock -> devin-oot v2 single shot -> out/devin-oot-v2-report.{md,json}
   -> claim line x3 homes verbatim -> replay gate -> anchors + registry rows.

## Hard rules
- but for all VCS writes; dedicated branch per round; no push/PR.
- Frozen surfaces: thresholds.json / mde-freeze.json / v1 manifest+items /
  v1 eval-plan.json / v1 report artifacts. Moves only via same-commit ADR.
- v2 plan registers BEFORE any v2 item lands; carries designed-after-v1
  disclosure + structured contamination registry.
- Integer tables freeze before label unlock; single-shot burn on v2 exactly
  as v1 (re-test = devin-corpus@v3 under its own pre-data registration).
- devin corpora never cited by conformity claims; v2 fact line + bound
  limitation verbatim in README / claim-template / v2 report.
- Probe channel: categorical-only into CAPA record; quantitative probe
  output never enters v3 plan; probes never enter any verdict chain.
- Report honesty: every claim carries a rerunnable command + observed output.
