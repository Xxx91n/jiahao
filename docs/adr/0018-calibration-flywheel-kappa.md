# ADR-0018: Calibration Flywheel — Threshold Band + Few-shot Injection + Kappa Governance

## Context

- ADR-0017 closed the write path: `jiahao resolve` records every human
  adjudication as an append-only `human_verdict` record in the hash chain
  and as an ADR-0008 calibration training point. But the points were
  write-only — the critic never read them back. Industry calls the missing
  half the calibration flywheel (R5 on the verification maturity ladder;
  R1-R3 = deterministic gate, hash-chained evidence, human escalation, all
  already implemented here).
- atomcode research (13 verified fetches, source `atomcode-flywheel-writeback`):
  three industrial write-back media differ in what they write back —
  few-shot examples (LangChain Align Evals), rubric text (AutoCalibrate,
  arXiv:2309.13308; Autorubric, arXiv:2603.00077), or decision boundary
  (Overconfidence TH-Score, arXiv:2508.06225; maf-evals floor/target band).
  maf-evals rule: "a single cut-off turns anything near it into a coin
  flip" — dual thresholds (floor blocks, target warns) absorb judge jitter.
  Three sources (Galileo, Arize, FutureAGI) agree raw agreement is
  misleading under class imbalance (90% raw agreement can mean κ≈−0.05);
  Cohen's κ ≥ 0.60 is the governance bar, with drift triggers at
  Δκ ≥ 0.05 or κ < 0.40.
- Rubric auto-revision (AutoCalibrate draft-refine) was evaluated and
  deferred: it is the only channel requiring an LLM runtime dependency in a
  currently zero-dependency project, and systematic-disagreement volume
  (134-item holdout) is below what meaningful per-criterion revision
  requires.

## Decision

D1 (Scope): Implement the calibration flywheel as R5 maturity, bounded to
two write-back channels (Layer 0 and Layer 2). The ADR-0015 polygraph-bench
main regression is executed FIRST within the same implementation round —
its pre-registered thresholds (recall > 46% @ FP ≤ 4.5%, score ≥ 0.80)
become the baseline the flywheel is measured against.

D2 (Layer 0 — Threshold Band): Replace the single STATIC_BAND cut with a
floor/target band (maf-evals pattern). `deriveThresholds` gains floor
(blocking boundary) and target (warning boundary) outputs derived from the
Platt fit; scores inside the band surface as warnings, not verdicts. Band
recomputation stays manual/explicit — no silent auto-recalibration.

D3 (Layer 2 — Few-shot Calibration Injection): The llm_critic prompt
(Level 4 rung) injects up to 5 human-verdict examples drawn randomly from
the calibration log (LangSmith defaults: top-k=5, random sampling).
Injection material is limited to records with a non-empty `reason`
(a correction without a stated reason is a wasted signal — Galileo). Order
and content are pinned per-verify call; no retrieval model is introduced.
Corrected outputs (Human Override records, ADR-0017) are eligible sources.

D4 (Kappa Governance): New zero-dependency computation (~30 lines, fitPlatt
precedent) over paired machine/human verdicts from the chain: raw agreement,
Cohen's κ, confusion matrix, per-class precision/recall. Drift alert
RE-ALIGN is advisory-only when Δκ ≥ 0.05 vs the last recorded baseline or
κ < 0.40. Never blocking. Output as a JSON report; versioned per judge
prompt hash so cross-version comparison is possible (maf-evals rule:
recalibrate after any judge change).

D5 (Rejected — do not re-litigate):
- Rubric auto-revision (AutoCalibrate draft-refine into critic prompt) —
  revisit only when human-labeled pairs exceed ~500 (FutureAGI gold-set
  scale) AND an LLM runtime dependency is independently justified.
- R4 online-eval sampling governance (LangSmith filter/sampling/spend) —
  no SaaS surface here.
- R6 multi-signal fusion / OTel `gen_ai.evaluation.result` export — no
  second signal producer exists in this project.
- κ thresholds as blocking conditions — κ is governance telemetry
  (consistent with ADR-0017 D4: advisory-only pending state).

## Consequences

- calibration.js deepens from a recording module into the flywheel hub:
  few-shot selection, band derivation, and κ reporting all live behind it.
- The critic prompt gains an injected-example section; detector.js and the
  hook are untouched (no new hook-time behavior, exit codes unchanged).
- Every RE-ALIGN alert is human-actionable telemetry; it never changes a
  verdict by itself. Flywheel efficacy is falsifiable: κ before vs after a
  band/injection change on the same ADR-0015 baseline.
- Few-shot injection is bounded by calibration-log volume; below ~10 eligible
  points the injection section is omitted entirely (fail-open, same posture
  as fitPlatt's ≥10-point guard).
