# ADR-0052: Witness-Unavailable Failure State

Status: Accepted

Date: 2026-09-09

## Context

ADR-0050 added an independent local genesis anchor and tail sidecar. Its
failure registry currently treats an unreadable genesis anchor as generic
failure, and `sealForwardIfNeeded()` returns `corrupt` without separating
self-consistent chain data from a missing external witness. A sealed chain
whose genesis file disappears can also be silently re-anchored from the chain
itself, which removes the witness's independence.

## Decision

### D-A - Witness absence is distinct from corruption

`witness_unavailable` means:

- the chain itself verifies;
- the local anchor witness is missing, unreadable, or torn.

It is not `corrupt`, and it is not a pass. A present-but-wrong anchor with a
checksum or version mismatch remains in the corruption family.

### D-B - Anchor problems have a registered failure consumer

Every machine-readable anchor problem names its consumer. In the current
single-host deployment, the human auditor is the highest independence anchor
and the final recovery consumer.

### D-C - Verification fails closed and append uses explicit degraded writes

`verifyTail()` and `verifyFull()` fail closed while the witness is
unavailable and never return a pass.

Append does not silently continue forever:

- Detection writes a degraded breakpoint record.
- Before the soft deadline, append continues normally.
- After the soft deadline, append continues with an out-of-chain warning.
- After the hard deadline and at least one unverified post-detection append,
  append stops with an explicit error.

### D-D - Recovery uses an event clock

The recovery clock starts at `detected_at`, not at the ledger tail.

- Soft deadline: 72 hours.
- Hard deadline: 7 days.
- The detection-latency upper bound is published as
  `max(access interval, patrol interval)`.
- Reaching hard never clears or rebuilds the state automatically.

The constants live in an independent content-anchored `witness-recovery`
domain, separate from the judge 6/9-month domain in ADR-0030.

### D-E - Rebuild is a controlled rotation

Genesis-anchor rebuild is allowed only through the ADR-0017 human review
gate. A successful rebuild:

- records who, when, why, and the approval;
- writes the audit disposition into the append-only evidence;
- increments the anchor generation;
- forces full verification, including the degraded tail.

Acknowledgment alone does not clear the degraded state.

## Rejected Alternatives

- Deferring recovery: local anchor loss is triggerable today and would leave
  a fail-closed state with no authorized recovery.
- Merging witness absence into `corrupt`: it hides whether the chain itself
  is self-consistent.
- Unbounded append after witness loss: it creates an unbounded unaudited
  tail and weakens the recovery boundary.
- Immediate read-only mode: an evidence log must continue recording during
  the incident it is meant to preserve.

## Consequences

- `KNOWN_ANCHOR_STATUS` gains an additive `witness_unavailable` value.
- Existing ADR-0050 behavior for a never-sealed chain remains unchanged.
- `defer-0024` remains pending for the cross-host external witness.
- `CONTEXT.md` gains Witness Unavailable, Registered Failure Consumer, and
  Explicit Degraded Write.

## Acceptance

The implementation round must lock the status migration, no-silent-rebuild,
out-of-chain warning, soft/hard clock, hard-stop error, authorized rebuild,
mandatory full verification, and existing ADR-0050 compatibility paths.

## Sources

Serial atomcode research: `atomcode-q2-resume`,
`atomcode-q4-deferred-scope-boundary`, `atomcode-q6-recovery-deadline-model`,
`atomcode-q7-event-clock-constants`,
`atomcode-q8-append-fail-open-verify-fail-closed`.
