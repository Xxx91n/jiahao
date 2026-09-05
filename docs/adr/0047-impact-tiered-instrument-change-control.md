# ADR-0047: Impact-Tiered Instrument Change Control — Identity Refinement, Tiered Revalidation, and Calibration-Interval Governance

Status: Accepted
Date: 2026-09-05

References: ADR-0018 (calibration flywheel + kappa), ADR-0025 (scoring-mode verifier), ADR-0027 (pre-registered thresholds + coupling guard), ADR-0029 (behavioral probes), ADR-0030 (reverification runbook + dead-man clock), ADR-0031 (gate tiers), ADR-0033/0035 (deferred registry), ADR-0040/0041 (three-state exit), ADR-0044 (mechanical falsifiability), ADR-0045 (stochastic-deterministic boundary), ADR-0046 (instrument-drift recalibration).

## Context

ADR-0046 froze the instrument identity triple and the two-state quarantine
machine but left three edges deliberately thin: the event trigger is a manual
CLI, the model/inference axes are self-referential descriptor hashes, and the
6/9-month reverify clock is a pure calendar constant. This grill round sharpens
those edges with industry-anchored models — impact-tiered change control,
clinical lot-to-lot verification, registry digest-and-alias identity, and
metrological calibration intervals — without expanding P0.

## Decision

### D-A — Change control is impact-tiered, not trigger-narrowed

An explicit change is classified by which validated object it touches and maps
to a tiered response: instrument identity axis -> quarantine + revalidation;
corpus/fingerprint batch -> lot-to-lot re-baseline; threshold -> versioned
criteria replay; calibration schedule and gate list -> record layer. The
mapping is a machine fact-source (a change-surface classifier analogous to
gates.json) protected by the ADR-0027 coupling guard. Every tier ends in a
human sign-off.

### D-B — Rebaseline and criteria-change stay authoritative

`corpus_rebaseline` and `criteria_change` are new event types in the state
machine, not new states: they append human-signed evidence records while the
instrument remains `authoritative`. The one escalation path is a rebaseline
whose comparison fails and whose old corpus cannot be rolled back — the
reference itself loses a usable anchor, so it escalates to an identity-axis
quarantine. Criteria change never escalates; an overturned prior sign-off is a
restatement mapping. Sign-off gains an attestation type (`certify` vs
`approve`) and reserves `second_reviewer`.

### D-C — Instrument identity is three-layer and content-anchored

The model axis is `registered name (tag) -> provider dated snapshot / revision
commit sha -> weights sha256`, in descending authority. A tag without a
resolved snapshot/commit is `UNRESOLVED` and never participates in the identity
hash as if resolved. Hashing the pin's own descriptor JSON is forbidden: that
self-referential digest records integrity, not identity.

### D-D — Inference config is an authoritative column plus a determinism envelope

The inference axis splits into: authoritative decode parameters (explicit
defaults materialized), a determinism contract (`decode_policy`,
`provider_contract`), and an observational column (`system_fingerprint`,
backend version, timestamp, concurrency) that stays out of the identity hash.
Determinism is a measured property, not a configuration claim: the pin carries
`measured_repeatability` from same-input re-runs. `temperature=0` is a greedy
decode request, never a determinism guarantee.

### D-E — Silent-drift auto-detection is deferred, not dropped

Silent provider drift behind a stable alias is detected by an anytime-valid
e-process with a guard window attributing `{none, system, judge}` on a frozen
human-labeled anchor set. It is registered as defer-0018; its prerequisites are
defer-0015 (anchor corpus) plus a trustworthy scheduler carrier. It is the
fourth defense line, orthogonal to the dead-man clock, explicit-change
lot-to-lot verification, and kappa inter-instrument comparison.

### D-F — Calibration interval is data-driven only after the ledger is metrological

The 6/9-month dead-man clock stays as the initial interval and structural floor.
The reverify ledger upgrades now to an as-found/as-left ledger (identity triple,
interval at run, observed delta, flip rate with Wilson interval, sample size).
Data-driven interval adjustment (staircase with floor/cap) is defer-0019, gated
on accumulated cycles, sample count, and the anchor set. The offset band is
derived from a guard-band decision rule, independent of the interval.

### D-G — Implementation boundaries

The implementation round activates defer-0016 and defer-0017: a machine
change-surface classifier, two authoritative event types, content-anchored
three-layer model identity with UNRESOLVED, and the inference-config metadata
column with a measured determinism envelope. defer-0018 and defer-0019 remain
pending-evaluation.

## Declared gaps (not pending-activation)

- Replayability audit: whether per-verdict inputs are retained to replayable
  granularity for criteria-change replay.
- Co-degradation hedge and anchor-set staleness/refresh protocol (prerequisites
  for defer-0018).
- `both` quadrant semantics for the drift attribution verdict.
- Threshold re-expression after a corpus lot change.
- Cross-version in-flight verdict attribution (carried from ADR-0046).

## Rejected alternatives

- Fully data-driven interval now: current n=26, Wilson 95% ~= ±0.14, below the
  graduation line for a control decision.
- Naive rolling z-test for silent drift now: ~75% false alarms on drift-free
  streams.
- Consumer-side weight-byte resolution now: producer-layer concern; the repo
  has no checkpoint bytes and no external registry.
- A third drift state: ADR-0046 already rejected it; the tiered responses are
  event types on the evidence chain, not states.

## Consequences

- defer-0014 is activated/removed (P0 already implemented); defer-0015 (anchor
  corpus) remains the shared prerequisite for defer-0018/0019.
- The next implementation round is bounded to defer-0016 and defer-0017.
- The 6/9-month dead-man clock stays authoritative until defer-0019 unfreezes.

## Acceptance

- `test/adr-0047-wiring.test.js` locks the change-surface classifier, the
  three-layer UNRESOLVED model identity, the inference-config metadata column,
  and the authoritative `corpus_rebaseline` / `criteria_change` event types.
- `docs/deferred-registry.json` parses and defer-0018/defer-0019 remain
  anchored by this ADR; defer-0016/defer-0017 are removed after activation.
- `CONTEXT.md` retains Impact-Tiered Change Control, Change Surface,
  Rebaseline, Criteria Change, Determinism Envelope, and Calibration Interval.
