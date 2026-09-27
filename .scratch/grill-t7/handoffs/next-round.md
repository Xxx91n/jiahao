# Handoff — grill-t7 v2 round task book (post-grill consolidation, 2026-09-15)

Repo: D:\Aworker\jiahao. Ledger of authority: .scratch/grill-t7/decision-ledger.md
(D-001..D-016, all current). .scratch is git-tracked — this ledger is its own
durability channel; docs/governance/decision-ledger-t7.md kept as the frozen
D-016 archive only (no further sync).
Spec: .scratch/grill-t7/spec-devin-v2.md (restatement only — ledger is authoritative).
Goal anchor: .scratch/grill-t7/GOAL.md.
Prior round archive: handoffs/unblind-round-audit-passed.md — v1 verdict SETTLED:
indeterminate (k=3/12, CI [0.054861,0.571858] vs floor 0.563863; FP 10/40).

## State snapshot (verified this session)

- HEAD 3cd4e19 (+ workspace commit), tree clean, no applied branches — unblind
  stack merged. jest 59/865; gate:all exit 0 (30 entries, 4 ci-mode UNVERIFIABLE);
  [154 devin-oot-replay] PASS; pack 275,397/101 < 300,000.
- devin-corpus@v1: settled indeterminate, single-shot burned, replay gate live.
  Claim surface carries the bound fact line verbatim in README / claim-template /
  oot-report.
- v1 corpus shape: 4 task categories + misreport emergent layer; all 3 hits and
  all 10 FPs sat in command-exit shape; drop_closing delta = 0 on real transcripts.
- This session committed: CONTEXT.md +10 glossary terms (v2 vocabulary), ledger
  mirror synced to D-016, anchors regen (branch grill-t7-v2-docs). No ADR added
  — ADR-0068 authoring is T-1 below.
- .scratch is git-tracked since 2026-09-15; no mirror sync needed anymore.

## Next round tasks — THREE-STAGE, ORDER BINDING (D-016)

Stage gate: the R-1 doc commit must land BEFORE any v2 collection begins.
Inside R-3 the integer-table freeze is its own commit BEFORE label unlock.

### T-1 Doc round: v2 plan + ADR-0068 [covers D-013, D-014, D-015, D-016]
- bench/research/devin-corpus-v2/ NEW directory (parallel to v1, off npm
  surface). plan.json: category map (4 shapes approx-equal honest allocation +
  misreport emergent layer), bands n_hon [80,130] / n_lie [24,40], stress
  side-set ~15-25 command-exit honest marked never-in-table, disjointness
  incl. all v1 ids, blind fields unchanged, readable metadata extended with
  session_id / batch_id / mining-rate / honest success-ratio, deterministic
  stopping-function TEXT (add-a-batch iff misreport count < trajectory floor
  after each batch), total attempt cap, planned 6-8 drops, undersized-marking
  rule, designed-after-v1 disclosure + structured contamination registry
  rows {parameter, value, v1_informed, basis}.
- eval-plan.json (same dir): dual-axis IUT rule — lie axis integer table vs
  floor 0.563863 (conservative transfer restated); FP axis integer table vs
  usability bound 0.10 (named usability bound, never called non-inferiority;
  product-semantic rationale physically separated from table arithmetic;
  registered as v1-contaminated); worst-of combination; quadrant INDET
  semantics; exit-report named descriptive sub-item + >=60% concentration
  trigger for v3; CI flavor frozen CP two-sided 95% (scripts/reverify.js
  clopperPearson95 is the derivation oracle — recompute every cell, never
  hand math); table DERIVATION rule (bands derive from landed n while labels
  stay blind, then freeze); single-shot burn on v2; probe channel
  categorical-only; v3 binding route (revised artifact -> devin-corpus@v3).
- docs/adr/0068-*.md in the SAME commit: adjudication rule + collection
  protocol + claim slot + v3 binding + probe terms (ADR-0027 D2 ceremony).
- Ceremony: deferred-registry tally row for the round, README ADR index
  rebuild, anchors regen, wiring-test seeds, instrument-side plan
  registration event (same channel as v1).

### T-2 Collection prep: script parameterization [covers D-016]
- collect-devin-corpus.js + devin-oot.js accept --snapshot-dir (or gain v2
  sibling entrypoints); v1 paths stay the frozen default; wiring asserts the
  v1 snapshot/manifest/report are byte-identical after v2-mode runs.
  No corpus data is touched by this task.

### T-3 Collection round: drops -> snapshot [covers D-015]
- Session-side drop protocol into devin-corpus-v2/incoming/: authored tasks
  across the 4 shapes (approx-equal honest allocation) + side-set items;
  real harness executions only — no hand-written items; labels EMERGE via
  scoring_function over transcripts (misreport overlay).
- Register per item: session_id, batch_id, attempt index; log mining rate
  (tasks per lie) per drop; run the registered stopping function verbatim;
  honor the total attempt cap; band miss -> snapshot anyway + undersized.
- validate -> snapshot devin-corpus@v2 (manifest: harness commit + agent
  model_version stamp + collected_at + disjointness + conformity disclaimer
  + side-set roster + contamination-registry reference); rescore agreement.

### T-4 Freeze + adjudication [covers D-014]
- Post-snapshot, labels still blind: read counts -> derive both integer
  tables from landed n via the frozen CP rule -> FREEZE COMMIT of the
  derived table artifact -> then unlock labels.
- devin-oot v2 mode SINGLE SHOT -> out/devin-oot-v2-report.{md,json}: 2D
  verdict + quadrant semantics + confusion matrices + CIs + category
  breakdown + side-set diagnostic + session-cluster sensitivity + batch
  slice + honest success-ratio + score distributions + sha256 per item.
- Abort-on-defect and refusal/exit contract unchanged (exit 1 + closed-enum
  prefixes; refusal precedes corpus reads; aborted persists run_status
  without a verdict).

### T-5 Claim + closure [covers D-009 mechanism, D-016]
- claim-template v2 slot: devin-corpus@v2 falsification test: <verdict>
  (n=N, lie=L, FP=k/N_hon, CI lower=x) (verdict date: ...) + bound
  limitation sentence; README + report repeat verbatim; per-mention binding
  wiring extended to the v2 block.
- Replay gate v2 registered in docs/gates.json (stored-artifact replay only,
  never re-runs the corpus); terminal-event + net-addition registry rows;
  anchors regen; jest green; gate:all exit 0; $handoff at close.

## Hard rules that bind

- No v2 collection before the T-1 commit; no label read before the R-3
  freeze commit; v2 is single-shot (re-test = devin-corpus@v3 pre-data).
- Frozen: thresholds.json / mde-freeze.json / v1 manifest+items / v1
  eval-plan / v1 report artifacts. Moves only via same-commit ADR.
- devin corpora never cited by conformity claims; fact line + limitation
  bound verbatim in all three claim homes.
- Probe results categorical-only into CAPA records; quantitative probe
  output never enters the v3 plan; probes never enter any verdict chain.
- but for all VCS writes; dedicated branch; no push/PR.
- Report honesty: every claim carries a rerunnable command + observed output.

## Open items outside this round (deferred unified governance round)

- P-2: seq-13 agent-signed countersign authority — USER decision (accept as
  F-2 closure or re-attest personally); ADR-0047 errata on delegated
  signature; delegation expiry (ADR-0061 D-C open-ended conflict);
  defer-0042 disposition at cadence review.
- Critique Rx4: INDETERMINATE claim treatment into ADR (equal-standing text
  currently sits under the COLLAPSE branch only).
- Critique Rx5: standing prior into CONTEXT.md (6/6 self-report failures all
  caught by re-execution).
- Trend-anchor absolute cap; deferred-delta ratchet; verifier iron-law
  addition; privIds dead try/catch; hooks.test.js timing flake.
- Cadence dispositions 2026-12-14: defer-0042/0043/0044/0045/0046.

## Suggested skills

- $implement (T-2..T-5), $tdd at adapter/runner/plan seams, $code-review
  two-axis before commits, $handoff at session end, $but for all VCS writes,
  atomcode-research for any NEW research need (serial — one run in flight).
