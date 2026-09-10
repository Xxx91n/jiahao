# ADR-0046: Instrument-Drift Recalibration — Dual-Axis Judge Identity, Resolve-then-Pin, and Quarantine State Machine

Status: Accepted
Date: 2026-09-05

References: ADR-0018 (calibration flywheel + kappa governance), ADR-0025 (scoring-mode verifier + judge seam), ADR-0027 (pre-registered thresholds), ADR-0029 (behavioral probes + bias calibration), ADR-0030 (reverification runbook + dead-man switch), ADR-0033/0035 (deferred registry + external events), ADR-0040/0041 (three-state exit + UNVERIFIABLE), ADR-0044 (mechanical falsifiability), ADR-0045 (stochastic-deterministic boundary).

## Context

The judge is measuring infrastructure, not eval logic: a judge version change
moves scores even when the candidate stays fixed (arXiv 2607.08535). The project
already has the 6-month time-triggered reverify runbook (ADR-0030) and the
RE-ALIGN kappa drift alert (ADR-0018 D4), but no event trigger — "recalibrate
after any judge change" remains a human convention. This ADR mechanises that
convention.

## Decision

### D-A — Instrument identity is dual-axis

The judge identity is the immutable triple
`{ rulesVersion + promptHash, model checkpoint identity, inferenceConfigHash }`.
The alias/endpoint name is a mutable pointer and is never evidence; only the
resolved content digest (weight bytes) is evidence identity. This mirrors
MLflow version-vs-alias and Docker digest-vs-tag.

### D-B — Detection is resolve-then-pin, not per-run fingerprinting

At gate/CI time, resolve the alias to an immutable digest and compare it against
the repository pin; mismatch fails the gate. Per-run runtime fingerprint
comparison is rejected: it records self-reported identity, adds lock/TOCTOU
surface, and does not raise adversarial resilience. Content byte-verification is
off-path only (install/reverify window). A consistent forgery — swap weights and
rewrite the self-reported identity — is declared-unverifiable at the metadata
layer; the only fallback is the behavioral anchor set.

### D-C — Execution semantics are layered by channel

A version change is a discrete attributable event, not statistical drift:
- deterministic channel (tests/exit code): no degrade state; CI re-runs and blocks on fail.
- stochastic channel (llm critic/judge): quarantine until revalidated.
- telemetry (kappa/delta-kappa): cross-version invalidated and re-baselined, never treated as a drift alarm on the version-change path.

### D-D — Revalidation is delta-gated on a frozen anchor set

Exit requires new-old parallel scoring on the frozen anchor set with a
pre-registered offset band (delta, not absolute) plus bias probes (AB/BA order
flip, length, self-preference). The ADR-0027 thresholds embed as the main-
regression component; the ADR-0029/0031 bias metrics become the bias-probe
component. Human-anchor agreement is an admission + periodic (60–90 day) gate,
not a per-change gate. Band numbers and the human agreement line have no public
standard and are self-registered with a ~2% reachability pilot.

### D-E — State machine is two states plus human sign-off

`authoritative <-> quarantined`. A version change enters quarantine; a
revalidation pass is necessary but not sufficient — a human sign-off binds the
new fingerprint and the reverify ledger hash into the hash chain before
authority is restored. Failed revalidation rolls back to the last authoritative
identity; an uncleared dead-man clock degrades to advisory-only (fail-safe).
Statistical drift is not a state: it is a veto input on the exit edge
(advisory-only per ADR-0018/0025).

### D-F — Document round only

This ADR records the decision and registers the implementation boundary; no
source change ships here. P0 implementation (identity triple + resolve-then-pin
+ event trigger) is defer-0014; the human-labeled anchor corpus and annotation
manual is defer-0015.

## Declared gaps (not pending-activation)

- Version-change offset band and bias-probe tolerance numbers: no public calibration exists.
- Kappa/drift anytime-valid attribution (e-process + guard-window to {none, system, judge}).
- Co-degradation hedge: an objective correctness subset against same-family new-old judges drifting together.
- Cross-version in-flight verdict attribution at the change boundary.
- Mechanical anti-rubber-stamp for the sign-off step (beyond ADR-0017 two-phase).
- Anchor-set staleness quantification.

## Rejected alternatives

- Auto-exit without human sign-off: the judge would self-certify its own upgrade; no model registry promotes unattended.
- A third `suspected` state for statistical drift: naive drift tests are ~75% false-positive and it violates the kappa advisory-only contract.
- Commit-time-only detection: blind to no-commit alias rollover.
- Reusing existing absolute thresholds as the pass criterion: old-score semantics are invalidated by the change.

## Consequences

- The next implementation round is bounded to P0 (defer-0014); P1-P4 remain unregistered future work.
- The human-labeled anchor corpus (defer-0015) is the prerequisite for the human-anchor admission gate.
- The 6/9-month dead-man clock remains the liveness backstop for a missing sign-off.

## Acceptance

- ADR-0046 is a document round; there is no implementation-round wiring test.
- `docs/deferred-registry.json` parses and defer-0014/defer-0015 are anchored by this ADR.
- `CONTEXT.md` gains the terms Instrument Identity, Resolve-then-Pin, Instrument Quarantine, and Lot-to-Lot Verification.
