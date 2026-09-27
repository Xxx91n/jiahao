# ADR-0025: Judge Form Convergence — Scoring-Mode Verifier Contract + Honest-Twin Corpus + Telemetry Contract

## Status

Accepted (2026-08-28)

## Context

ADR-0019 D4 reserved the judge seam as an interface and forbade the runtime:
the only then-published judge path (b3) measured FP 5.5% > 4.5% budget, 4.6s
hot latency against the 5s Stop-hook budget, and temperature-0 bit
instability (FP 9/132 <-> 10/132). Two research runs (atomcode, 2026-08-28;
~27 sources with full-text verification including OpenAI eval best practices,
METR methodology, k8s admission webhook good practices, OPA Gatekeeper /
Kyverno audit-then-enforce, FAGEN/ICML-2026, PRM800K, Self-Taught Evaluators,
ShieldGemma, LLM-pricing/jury critiques, Arize production guidance, Eval Smell
Catalog) established what the seam's eventual occupant must look like and what
the project should prepare NOW so a future implementation is not post-hoc
overfit to a corpus its author already saw.

Locating mental model (unchanged since ADR-0001): jiahao is a
prompt-as-mental-model second-party auditor; deterministic heuristics are the
primary detector, the judge is triage/fallback at most (FAGEN conclusion used
verbatim: "lightweight, domain-calibrated detectors as triage rather than
LLM judges as primary monitor").

## Decision

### D1 — Form convergence: only a scoring-mode small verifier may occupy the seam

Any future judge implementation MUST be a scoring-mode small verifier:
probability output (Yes/No or class scores from logprobs, not sampled token
sequences) feeding a calibrated threshold band (ADR-0018), sized to the <5s
hook budget (precedent: ShieldGemma/Llama Guard scoring mode; HaluGate
76-162ms token-level hallucination checking; 
Self-Taught Evaluators shows a synthetic-data-trained small judge reaching
RewardBench 88.3 > GPT-4's 84.3). A prompt-style generic LLM judge is rejected
(FP/latency/bit-instability, all three rooted in decode nondeterminism;
FAGEN judges AUROC <= 0.65 on false success vs 0.83-0.95 for lightweight
detectors). Training/calibration data = the existing ADR-0017 human verdict
records + ADR-0018 holdout pool. The ADR-0015 D3 internal-holdout
FP gap <= 3pp gate from ADR-0019 D4 remain the blocking precondition.

### D2 — Seam signature locked, runtime still forbidden

Locked interface (implemented in src/detector.js this round):

  judgeSeam(claim, toolResults, heuristicVerdict) ->
    { verdict: "override" | "uphold", confidence: 0..1, evidence: string[] } | null

- escalate = "honest_only" semantics unchanged (may only rescue heuristic
  misses, never invent a new FP; FP budget degrades from a calibration
  problem to a structural one — three-party evidence: Veris failure-mode
  framing consistency 94% vs 66%; k8s fail-open + validate-later; OPA
  audit-then-enforce).
- fail-soft unchanged: unavailable/timeout/malformed -> heuristic verdict
  stands, counted honest.
- ADR-0019 D4's runtime prohibition stands; what landed this round is the
  no-op seam function plus its telemetry counters, not a judge.

### D3 — Honest-twin corpus + telemetry contract prepared NOW (assets first)

Precedent: OpenAI "log everything / eval-driven development", METR
pre-registration discipline, Llama Guard taxonomy+benchmark-first, Grafana
instrument-then-configure, OTel contracts-first. Also jiahao's own ADR-0015
pre-registered thresholds already followed this pattern.

1. **Corpus**: bench/polygraph/judge-twins.jsonl — honest-twin hard cases
   (heuristics fire; a competent judge must override to honest and cite
   evidence). Every entry carries `provenance` + `collected_at`; entries
   older than 6 months are STALE for re-validation (eval rot rule, Eval
   Smell Catalog). Schema gate: bench/polygraph/check-judge-corpus.js
   (jest-closed via test/judge-seam.test.js). This is a corpus-format gate,
   not a runtime detection path; ADR-0019 D4 is not violated. Pre-registered
   = implementation rounds must not tune thresholds against this corpus.
2. **Telemetry contract** (minimal set of four, Motion 52-flags
   counterexample): `invocations` (suspicious-route rate numerator),
   `latency_ms_total`/`latency_ms_avg`, `fail_soft`, `overrides_accepted`.
   Counters live on the seam path in detector.js, snapshot into every
   suspicious detectFull verdict record so observations ride the evidence
   chain (ADR-0013) — instrumentation first, dashboards later.

### D4 — Routing is unchanged: judge sees suspicious traffic only

k8s matchConditions shape: the seam is invoked only when the heuristic
verdict is already suspicious (detectFull attaches judge_override +
judge_telemetry iff verdict.suspicious is true). Clean turns pay zero seam
cost and emit no telemetry fields. Rate expectation: <= 10-20% route rate,
derivable from the ADR-0018 10% flag-rate budget.

### D5 — Explicitly rejected (do not re-litigate)

- Prompt-style generic LLM judge (b3 measurements + FAGEN).
- Self-consistency majority voting (5s budget exceeded; shared systematic
  error votes error into majority — three 2026 critiques).
- Multi-agent debate (latency outrages 5s; 2026 consensus-collapse /
  sycophancy evidence).
- Judge as primary detector (FAGEN; monitor-as-triage conclusion).
- In-band cross-model jury (M x generation cannot meet 5s; out-of-band jury
  remains permitted as research path, not product code).
- Telemetry beyond the four-metric minimal set (Motion counterexample).
- Threshold tuning against judge-twins.jsonl (pre-registration discipline;
  METR "do not tune on eval").

## Consequences

- The seam now has a typed shape (D2) and metrics (D3.2); a future judge PR
  reviews as "swap the null with a verifier under the ADR-0015 D3 gate"
  instead of redesigning the seam.
- judge-twins.jsonl + check-judge-corpus.js give the future judge its
  acceptance test on day one, safe from author-overfit bias.
- DetectFull's verdict record gains two OPTIONAL fields (judge_override,
  judge_telemetry) present only on suspicious turns; gate/calibration
  consumers are unaffected unless they opt in.
- 6-month corpus staleness is load-bearing: recall it during any future
  bench review; do not silently extend it.
