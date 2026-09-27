# grill-t8 round closed — handoff (2026-09-16)

## What this round delivered

Merged CAPA + readiness round, all three stages committed (stack:
`grill-t8-docs` xmq/ynm, `grill-t8-capa` zwz/ysw above it):

- T-1: ADR-0069 (pairer semantics + 3 pre-registered clauses + artifact-freeze
  + readiness contract + v3 obligations); `adjudicated/devin-corpus-v2` anchor
  tag on 8807a61; sha256 freeze wiring; contamination framework skeleton;
  ceremony (defer-0049, anchors, t8 ledger mirror, instrument seq 14).
- T-2: bench/research/capa-pairer.js — deterministic 4-family claim-evidence
  pairer ({flagged, consistent, undetermined}, meta-circularity ban, port =
  zero-verdict telemetry); 16 corpus-external probes all-match; b2 install
  chain measured WORKING through the real npx github: channel (record:
  .scratch/grill-t8/readiness/b2-install-measurement.md); G6 impact written
  (gates unchanged); b3 reproduction invitation in README.
- T-3: devin-corpus-v3/{plan,eval-plan}.json frozen — pairer pinned by sha256
  2383d75f (load-time re-derivation, fail-closed); IUT rule carried;
  undetermined=unflagged both axes inside n; divergence disclosure-only; 60%
  trigger disposition ADOPTED as descriptive escalation; 13 contamination
  rows populated; disjointness v1(52)+v2(140); instrument seq 15.

## State for the next round

- v3 is READY-TO-RUN, not run: no items.jsonl, no decision-tables.json, no
  report. `loadPlanV3` fails closed until the derived-table freeze commit
  (post-snapshot, blind labels, before label unlock).
- Follow-up round order: collection (scripts/collect-devin-corpus.js
  --snapshot-dir devin-corpus-v3) -> manifest freeze -> derived tables commit
  -> label unlock -> single-shot `node bench/research/devin-oot.js
  --snapshot-dir devin-corpus-v3 run` -> report + gates.json
  devin-oot-v3-replay entry land together.
- Never do: move the anchor tag, touch the frozen port artifacts, read
  spec.check/labels in the pairer, cite v2/v3 by conformity, run v3 on this
  stack's commits without a fresh registration.

## Suggested skills for the next session

- $implement (same workflow: readiness三件/ledger bounds/GitButler)
- tdd (any pairer rule extension must land a failing test first; new check
  families need a v3-plan pre-registration BEFORE collection)
- grilling + code-review on the v3 collection protocol before it runs
- atomcode-research if any new parameter needs external grounding

## Verification anchors

- jest: 63 suites / 987 tests green; gate:all exit 0 (pack 285,333 B).
- Report with rerunnable evidence: .scratch/grill-t8/reports/2026-09-16-report.md
