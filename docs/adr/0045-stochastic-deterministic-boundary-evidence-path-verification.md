# ADR-0045: Stochastic-Deterministic Boundary and Evidence-Path Verification

Status: Accepted
Date: 2026-09-05

References: ADR-0001 (prompt-as-mental-model), ADR-0004 (verification gate
ladder), ADR-0017 (ESCALATE verdict and human adjudication), ADR-0019
(detector v2 suppression rules and judge seam), ADR-0025 (judge form
convergence), ADR-0033 (deferred registry), ADR-0036 (capable-optimizer
threat model), ADR-0037 (metamorphic relations), ADR-0044
(claim-directed falsification).

## Context

The grill round after ADR-0044 identified the next architecture gap at the
boundary between an LLM-generated proposal and deterministic evidence.
Industry research and the existing ADR chain converge on two reusable
mental models:

- Stochastic-Deterministic Boundary (SDB): proposer -> verifier -> commit ->
  reject. Jiahao already has the first three roles distributed across the
  primary agent, the verification ladder, and EvidenceLog. The missing part
  is naming the boundary and giving reject a non-destructive semantic.
- Evidence-Path Verification: Silence, Perspective, and Counterfactual.
  These tracks organize existing mechanisms (NOT VERIFIED, judge
  independence, metamorphic relations) rather than adding new ones.

This is a document round. It records terminology and durable boundaries; it
does not add a gate, a schema, a corpus family, or implementation code.

## Decision

### D-A - Candidate-Verification Loop is the parent model

The parent mental model is Candidate-Verification Loop: generation and
verification are connected by an explicit feedback signal. SDB and
Evidence-Path Verification are concrete children of that loop, not separate
runtimes.

### D-B - Stochastic-Deterministic Boundary is canonical

SDB is the canonical term for the proposer -> verifier -> commit -> reject
contract. The existing mappings are:

- proposer: primary agent output/claim.
- verifier: deterministic checks in the ADR-0004 ladder.
- commit: append-only EvidenceLog write.
- reject: a typed rejection result carried by the falsification record.

The boundary itself is a first-class architectural object. Verification
stays terminal: a reject does not automatically re-enter the proposer.

### D-C - Reject is typed evidence, not automatic retry

A reject is `Typed Rejection Evidence` plus an optional retry input. It
must never trigger automatic retry in the semantic layer.

The reject maps to `falsification_record.falsified = invalid`. It must come
from a deterministic `falsification_cmd` with exit `1`; any code path that
writes `invalid` without such a command is forbidden. The five-tuple record
from ADR-0044 D-F remains unchanged:

`{claim_id, claim_type, falsification_cmd, exit_code, falsified}`

There is no sixth field, no new rejection record, and no new `claim_type`
value for reject. `claim_type` names the claim family, not the verdict.

Transport-layer retries for transient failures such as 429, 503, or timeout
remain an infrastructure concern and are outside SDB reject semantics.

### D-D - Evidence-Path Verification stays outside the machine surface

Evidence-Path Verification is an organizational mental model with three
tracks. It does not enter `claim_type`, `docs/gates.json`, or
`falsification_record` because the tracks are epistemic paths, not
capability families or deterministic commands.

Existing homes:

- Silence: ADR-0044 evidence tri-state `missing` and ADR-0040 exit `2`
  UNVERIFIABLE.
- Perspective: ADR-0025 judge input whitelist and ADR-0011 deployment
  independence.
- Counterfactual: ADR-0037 metamorphic relations and ADR-0044 falsification
  twins.

### D-E - Two future candidates are deferred

Scoring-function isolation and Lyft-style prompt contradiction linting are
registered as `defer-0012` and `defer-0013`. Evidence-Path Verification
itself is not deferred because it has no new implementation consumer.

### D-F - Document round only

This ADR changes documentation and terminology. It does not modify
`src/`, `scripts/`, `docs/gates.json`, or test files.

## Rejected alternatives

- Automatic finite retry for semantic rejects. Rejected because a
  deterministic wrong answer does not become correct by retrying and this
  would collapse the verification ladder into an unobserved loop.
- A sixth falsification-record field for verdict or reason. Rejected because
  it breaks the ADR-0044 D-F envelope and mixes decision-layer vocabulary
  into evidence-layer records.
- A separate rejection record type. Rejected because it splits provenance
  for the same event across two record shapes.
- Making Silence, Perspective, and Counterfactual claim types or gates.
  Rejected because no deterministic falsification command exists for all
  three tracks and the existing mechanisms already implement their
  semantics.

## Consequences

- `CONTEXT.md` gains the canonical terms and their `_Avoid_` boundaries.
- The five-tuple falsification record remains the only evidence shape for a
  falsification result.
- Future work may add a real capability claim family through an ADR, as
  required by ADR-0044 D-B.
- The deferred registry gains two new entries with review dates.

## Acceptance

- ADR-0045 is a document round; there is no implementation-round wiring test.
- `docs/deferred-registry.json` parses and `defer-0012`/`defer-0013` are
  anchored by this ADR.
- `CONTEXT.md` is updated with the terms above.

