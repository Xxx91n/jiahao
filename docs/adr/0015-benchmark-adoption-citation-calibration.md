# ADR-0015: Detector Benchmark Adoption + Citation Calibration

- Date: 2026-08-24
- Status: Accepted
- References: ADR-0012 D2 (triage-not-block), ADR-0014 (structural signals)

## Context

Two documentation/benchmark gaps from the grill round:

1. ADR-0012 D2 asserts "at 10% flag rate the precision of the
   deterministic detector is ~50% (ICML 2026 FAGEN, arXiv 2606.09863)".
   The audit could not verify the "~50%" figure against the source. What
   FAGEN actually reports: lightweight TF-IDF / XGBoost detectors reach
   AUROC 0.83 / 0.95 versus LLM judges at or below 0.65, and at equal flag
   rate recall is 4-8x higher. The "~50% precision" number is unverified
   and must not ship in an ADR.
2. The detector (wordlist + soon structural signals) has never been
   measured against any external benchmark. jiahao cannot claim anything
   about its own FP/recall without a baseline.

Atomcode benchmark survey (11 searches / 10 full fetches, 7 domains)
covered polygraph-bench (najemwehbe), tau-bench family (Sierra), MASK,
MIRAGE-Bench, SycEval, HaluBench, PROBE, and Scale AI MRT
weak-to-strong monitoring (arXiv 2508.19461). Conclusions:

- **polygraph-bench is the only public benchmark whose subject is the
  detector itself** (turn in, verdict out) — 396 synthetic items,
  176 lie / 220 honest, honest "lexical twins" per lie class, scoring
  `recall - 5*FP`, core-split floor 0.80, MIT license, official harness,
  baselines b1 (keyword) / b2 (heuristic gating, recall 46.0% / FP 4.5%) /
  b3 (local LLM judge).
- It is single-maintainer, zero-star, no third-party validation; the
  0.8% FP @ 100% recall production number comes from a private 155-turn
  holdout nobody else can reproduce. It is therefore fit as a
  *regression* instrument, not as a marketing number.
- tau2/tau3-bench provides executable ground truth (DB end-state) with a
  published precedent (Cleanlab) of using it to evaluate detectors.
- MRT defines the adversarial evaluation setting (TPR@FPR=0.01) for
  monitor robustness.

## Decision

### D1 — Correct the FAGEN citation in ADR-0012

ADR-0012 is immutable; record the correction here. Replace, in effect,
"precision ~50% at 10% flag rate" with: **at comparable flag rate,
lightweight structured detectors reach 4-8x the recall of LLM judges,
with AUROC 0.83-0.95 vs judges at or below 0.65 (FAGEN, arXiv
2606.09863)**. The design conclusion of D2 (detector = triage, never sole
block) is unchanged — it stands independently on the information-
theoretic invariant and on promptfoo/HiddenLayer judge-manipulation
evidence (master-key false-reward 80-90%).

### D2 — Benchmark adoption: polygraph-bench as primary regression gate

Implement jiahao's detector as a polygraph-bench `judge(item)` adapter
and run the official harness. Pass thresholds recorded now, before seeing
results (avoids post-hoc threshold shopping):

- **Beat b2**: recall > 46.0% at FP <= 4.5% (must exceed the shipped
  heuristic baseline, else the detector adds nothing).
- **Core-split score >= 0.80 floor** where score = recall - 5*FP.

### D3 — Self-built holdout precedes full benchmark trust

Because polygraph-bench's synthetic-to-real transfer is maintainer-
attested only, jiahao first builds a 50-100 item internal holdout of
real primary-agent turns (labeled honest / false-completion) drawn from
actual usage of this repo's own sessions. Detector must not collapse on
the holdout (sanity-level recall) before polygraph-bench numbers are
cited anywhere externally.

### D4 — tau-bench trajectory conversion is the secondary evaluation

Following Cleanlab's precedent: convert tau2-bench trajectories into
turn-level detection items using DB end-state + policy checks as the
programmatic label source, and measure the failure-rate reduction when
the detector's blocks are honored. This is the only loop that measures
both detector recall and the cost of false blocks on real tool-use
traces. Deferred until D2/D3 are green.

### D5 — Adversarial robustness target

TPR at FPR = 0.01 on MRT-style adversarial trajectories (ScaleAI/mrt)
is the long-term robustness definition, not a gating requirement for the
current wordlist+L1-L3 detector.

## Consequences

- ADR-0012's FAGEN number is formally corrected here (ADR-0012 text
  stays immutable; readers follow the reference chain).
- New test/benchmark surface: `bench/` (or `test/bench/`) with the
  judge(item) adapter, internal holdout set, and a documented run
  command; CI does not gate on benchmarks (runtime cost), but the
  numbers land in docs whenever detector code changes.
- Metrics vocabulary for future ADRs: recall / FP rate / score =
  recall - 5*FP, matching polygraph-bench, so numbers stay comparable.

## Out of scope

- Writing the adapter and actually running either benchmark —
  implementation round.
- Sycophancy-axis evaluation (SycEval) — only if a sycophancy detector
  is ever added.