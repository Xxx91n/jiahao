# jiahao x Polygraph Bench — baseline (ADR-0015 D2/D3)

Benchmark: https://github.com/najemwehbe/polygraph-bench (MIT), public dev
corpus seed 20260712, 396 items (176 lie / 220 honest), score = recall - 5*FP.

## Run

```bash
git clone --depth 1 https://github.com/najemwehbe/polygraph-bench $TMPDIR/polygraph-bench
cd $TMPDIR/polygraph-bench
python harness/run_detector.py --detector D:/Aworker/jiahao/bench/polygraph/jiahao_detector.py \
  --items data/items.jsonl --out out/jiahao.jsonl
python harness/score.py --items data/items.jsonl --labels data/labels.jsonl \
  --verdicts jiahao=out/jiahao.jsonl --out out/metrics.json --report out/report.md
```

`jiahao_detector.py` is the official judge(item) adapter; it pipes each item
to `node-bridge.js`, which maps the transcript-format events onto
`detectFull({toolResults, closingText, evidenceRecords: [], turn: null})`
and flags `lie` iff severity is `high` (deployed detector semantics,
unmodified).

## Baseline (2026-08-26, detector v1: wordlist + L1-L3, no judge LLM)

| split   | recall  | FP      | score   |
|---------|---------|---------|---------|
| overall | 28.98%  | 39.09%  | -1.665  |
| core    | 37.50%  | 42.86%  | -1.768  |
| hard    | 18.75%  | 32.50%  | -1.438  |

Pre-registered thresholds (ADR-0015 D2): recall > 46.0% @ FP <= 4.5%,
core-split score >= 0.80. **Verdict: FAIL.** The current detector does NOT
beat the shipped b2 heuristic baseline (46.0% / 4.5%).

This is recorded deliberately and without tuning. Two known artifacts,
both fixable only by detector work in a separate round (not this one):

- FP concentrate in H1/H5 (52+11 of 86): signal L2's premise is "claim
  completion without a jiahao-chain verification record" — on raw
  transcripts there is no jiahao chain, so L2 fires on honestly-verified
  turns. Excluding L2 (L1+L3 only) drops overall to recall 6.8% @ FP 5.9%.
  The generalization path (behavioral-evidence pairing: a completion claim
  must be backed by tool results that actually show tests passing /
  200 OK / healthy) is real detector work and needs its own ADR.
- FN concentrate in L2a/L5/L7 (pagination completeness, count mismatch,
  per-route health): all need claim<->evidence numeric/association checks
  a wordlist+regex detector cannot honestly do. This is exactly why
  ADR-0004 keeps the detector at triage, never sole block.

Non-overfitting statement: no detector code was changed for this baseline.
Numbers in `results/` are byte-frozen from the run above.

Effectiveness of the ADR-0018 calibration flywheel is measured against this
baseline: rerun after each detector change; thresholds stay pre-registered.

## Run 2 (2026-08-27, detector v2: ADR-0019 suppression + claim-evidence pairing)

Same harness and frozen corpus; detector updated per ADR-0019 (D1-D5):
fired-hit suppression downgrades to `low` (never cleared; audit preserved),
transient vs hard failure 分层 (Bazel FLAKY semantics: retry-recovered
transient errors may downgrade only when a later verification record
exists), claim/evidence pairing (numeric claims, total-count enumeration,
truncation-seam acknowledgment), same-sentence negation scope.
Judge seam is JSDoc-only; no runtime judge LLM was used.

| split   | recall  | FP     | score  |
|---------|---------|--------|--------|
| overall | 34.66%  | 2.73%  | 0.210  |
| core    | 47.92%  | 4.29%  | 0.265  |
| hard    | 18.75%  | 0.00%  | 0.188  |

Pre-registered thresholds unchanged (ADR-0015 D2 / ADR-0019 D5):
recall > 46.0% @ FP <= 4.5%, core-split score > 0.385.
**Verdict: FAIL (honest).** recall and FP now pass pre-registered gates
(overall FP 2.73%, core recall 47.92%), but core score 0.265 < 0.385 —
the detector still does not beat the b2 heuristic baseline and is NOT
adopted into the gate. No thresholds were moved and no detector behavior
was tuned post-hoc to pass.

Remaining failure structure:

- All 6 remaining FP are H1-alln multi-page pagination completeness items
  (`pb-core-h1-alln-0128/29/30/31/33/35`): honestly-verified turns whose
  evidence is spread across several paginated tool results. Pairing across
  per-call results needs a dedicated pagination/HTTP anchor extractor —
  explicitly deferred by ADR-0019 D6 to a follow-up ADR (likely with the
  judge seam). Not handled by silent regex expansion.
- FN still concentrate in L2a/L5/L7 numeric-association classes; these
  need the deferred evidence anchors as well.

Artifacts: `results/jiahao-v2-run4.jsonl`, `results/metrics-v2-run4.json`,
`results/report-v2-run4.md` (byte-frozen from the run above).
