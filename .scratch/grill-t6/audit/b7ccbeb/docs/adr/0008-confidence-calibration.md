# ADR-0008: Confidence Calibration

## Context

ADR-0004 established the static escalation band (0.4/0.7) borrowed from
FutureAGI research. These thresholds have no public standard provenance and
are domain-specific hyperparameters. LLM judges exhibit systematic
overconfidence (arXiv:2508.06225); raw confidence scores do not correspond
to actual pass rates.

Atomcode research (17 sources, 12 full reads) surveyed:
- TrustBench: isotonic regression per (agent × domain) calibration profiles,
  87% harmful action reduction, <200ms latency
- scikit-learn CalibratedClassifierCV: Platt sigmoid (2-param, data-efficient)
  vs isotonic (data-hungry but statistically superior, KDnuggets Bonferroni
  α=0.003)
- JS ecosystem: only npm 'isotonic' WASM package exists; no LLM calibration
  library. Three major frameworks (LangGraph, OpenAI Agents SDK, CrewAI) have
  no built-in probability calibration
- Overconfidence in LLM-as-a-Judge is systematic; post-hoc calibration is
  standard practice (JAMIA Open 2025: Flex-ECE reduced to 0.1-4.1%)

## Decision

Implement minimal viable calibration: Platt sigmoid + logging infrastructure.
Defer isotonic regression as upgrade path.

1. **recordCalibrationPoint(score, passed)**: Append-only JSONL log of
   (raw confidence, pass/fail) pairs. Best-effort, fail-open.

2. **fitPlatt(points)**: Gradient descent on log-loss, 200 iterations,
   learning rate 0.01. Returns { a, b, n } or null if < 10 points.
   P(pass|score) = 1/(1+exp(a*score+b)).

3. **calibrateScore(score, model)**: Sigmoid mapping. Passthrough if no model.

4. **deriveThresholds(model, targetPrecision)**: Inverse-logit to find score
   where calibrated probability equals target precision (default 0.85).
   Falls back to STATIC_BAND (0.4/0.7) when no model.

5. **computeECE(points, model, nBins)**: Expected Calibration Error for
   monitoring drift. 10-bin reliability diagram.

No isotonic regression yet. Upgrade path: when 1000+ labeled samples exist,
swap fitPlatt for PAVA-based isotonic fitting. The interface stays the same.

## Consequences

- Calibration is opt-in: without data, the system uses STATIC_BAND unchanged.
- JSONL logging is append-only and fail-open — calibration logging never
  blocks verification.
- Platt sigmoid needs only 10+ points to produce a model; the 2-parameter
  form is data-efficient per KDnuggets comparative study.
- ECE monitoring enables drift detection: re-calibrate when ECE exceeds
  a threshold (future: alert in mode-tracker hook).
- Zero new dependencies — all math is Node.js built-in.
- Upgrade path: isotonic regression (PAVA algorithm, ~30 lines) when data
  suffices; external anchoring (Rekor) for cross-org audit.
- 12 new tests: logging, fitting, calibration, threshold derivation, ECE,
  end-to-end flow.
- Total: 61 tests (was 49).
