# bench/research - T-1 research-round surface (ADR-0064)

This directory is the RESEARCH attribution surface for T-6. It is separate
from the confirmatory surface (ADR-0064 D-B): nothing here tunes
bench/polygraph/thresholds.json gates; the confirmatory floor/target set is
byte-frozen for this round by baseline-t1.json.

## Artifacts

- baseline-t1.json - D-002 baseline harness record. Pins detector v2 core
  47.92% recall @ 4.29% FP / score 0.265 (README Run 2, metrics-v2-run4.json),
  recorded below the 0.385 floor as-is. Guard: scripts/check-research-baseline.js.
- corpus-classes.json - D-C/D-003 four-class corpus taxonomy manifest
  (external-bench / private-probes / judge-conformity / devin-truth).
  Guard: scripts/check-corpus-classes.js.
- devin-corpus/ - D-005(6,7) ground-truth snapshot home (devin-corpus@v1).
  Collector harness: scripts/collect-devin-corpus.js (schema|validate|snapshot).
- mde-freeze.json - D-A frozen d_MDE = max(0.03, 1.64 x SE_5seed), computed
  from the corpus over the 5 registered seeds BEFORE the execution run.
- rung_ladder.py - D-D rung ladder. Phases: freeze | rung1 | rung2 | controls
  | report | all. Requires python + sklearn (research-only dependency).
- export_manifest.py - D-E manifest dump of the ported config (vocabulary +
  coef + intercept + analyzer spec) and the 20-item golden set.
- g6-manifest.json, gold20.jsonl - the frozen port substrate + goldens.
- sklearn-port.js - D-E hand-written JS vectorizer + dot-product estimator.
- out/ - append-only execution evidence: trials.jsonl (one row per
  config x seed x phase), survivors.json (G1/G2 verdicts), negative-controls.json,
  attribution-report.md (D-001 deliverable).
  Guard: scripts/check-g6-equivalence.js.

## Reproducing

1. Clone the pinned bench: git clone https://github.com/najemwehbe/polygraph-bench
   && git checkout 994bdeb3e75bb5c2ffac4f35a3eca9bac02c6356
2. python bench/research/rung_ladder.py --corpus-dir <clone>/data --phase all
   (freeze must precede rung1; 'all' sequences it correctly)
3. python bench/research/export_manifest.py --corpus-dir <clone>/data
4. node scripts/check-research-baseline.js && node scripts/check-corpus-classes.js
   && node scripts/check-g6-equivalence.js && node scripts/check-governance-inventory.js

## Design notes

- Task-disjoint splitting: the public corpus carries no task_id; the item.task
  text is the task-disjoint group key (sha256 recorded per trial row).
- recall@FP=0 is the headline metric (D-A); the FP guardrail uses the default
  operating point (decision > 0). G2 ranking uses the bench score family
  recall_default - 5*fp_default.
- Zero-survivor outcomes are legal negative closure (G3); rung 2 is capped at
  12 configs inside the survivor hyperparameter neighborhood only (G4).
- The trials ledger is append-only; headline numbers are per-config 5-seed
  means, never max-of-trials (G5).
