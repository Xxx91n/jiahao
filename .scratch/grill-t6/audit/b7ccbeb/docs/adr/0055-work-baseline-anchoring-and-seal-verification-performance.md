# ADR-0055: Work-Baseline Anchoring and Seal Verification Performance

Status: Accepted
Date: 2026-09-09

Amends: ADR-0053, ADR-0054

## Context

The ADR-0054 sync-and-baseline handoff exposed a governance gap: a grill
planning snapshot was newer than its historical upstream base but was not
guaranteed to contain every sibling stack. Separate documentation and
implementation stacks were already produced, but there was no standing rule
for recording the planning base or checking mergeability before implementation.

A second review of the anchor family found the same mechanism pattern was
missing from the working branch baseline: ADR-0053 and ADR-0054 define
re-anchoring for the evidence chain, but not for the repository base that a
plan depends on. Independent atomcode research compared this against mature
branch-stack, speculative-merge, and audit-log practices.

The research also located a real performance regression introduced by the
later seal checks: the segmented evidence log hot path calls
readConcat() through _chainHasSeal(), making every hot verification scan
the full chain. The write path calls readConcat() twice during commit().
This document records the performance decision but deliberately leaves the
source implementation to the next implementation round.

## Decision

### D-A - Plans record a work-baseline anchor

Every grill plan handed to a repair or development agent records three values:

- base_commit: the repository commit the plan was designed against.
- latest_upstream_commit: the newest relevant upstream commit checked during
  planning.
- checked_at: the timestamp when that upstream state was checked.

This extends the existing anchor freshness model from evidence-chain objects
to the planning work baseline. It does not rewrite ADR-0053 or ADR-0054.

### D-B - Plans are re-anchored when created or handed off

A new grill plan is re-anchored to the checked upstream state before it is
handed to an implementation agent. An existing plan whose upstream state has
changed is re-checked rather than carried forward as still valid. This is the
same freshness discipline as evidence-chain re-anchoring, applied to the
planning surface.

### D-C - Implementation requires a speculative merge check

Before implementation starts, the receiving agent must perform a
non-destructive mergeability check against the plan latest upstream commit.
The check is speculative evidence, not a promise of zero conflicts. A changed
merge base or a failed check makes the plan stale and requires re-anchoring
before source work continues.

### D-D - Documentation and implementation remain separate auditable units

Documentation-only and implementation-only stacks stay separate audit units.
A documentation stack is landed only when its own scope is explicitly
approved. Merging a broad historical documentation stack into an
implementation plan is prohibited without a separate approval.

### D-E - Seal verification must become O(1) and is not fixed in this document round

The next implementation round will replace the unbounded full-chain
readConcat() scan in seal validation with a bounded sidecar or checkpoint
read, keeping full verification as a separate cold audit path. The same round
will remove both full-chain scans from the append write path.

A verifyTail latency regression gate must be added before or with the
optimization. The implementation must prove the hot path no longer calls
readConcat() and that the cold full-verification path still detects the
same truncation and tampering cases.

## Rejected Alternatives

### Rewrite pushed ADR-0053/0054 history

Rejected. ADR-0053 and ADR-0054 are reachable from origin/main; rewriting
them would alter shared history. This ADR records the amendment instead.

### Adopt a separate documentation repository

Rejected. Path-level separation and explicit landing approval are enough for
this repository. A physical repository split would add infrastructure without
changing the audit boundary.

### Keep unbounded seal verification until evidence-chain scale forces it

Rejected. The regression is already present in the hot path and the write
path. Deferring it would let the documented O(active segment) claim continue
to diverge from runtime behavior.

## Consequences

Grill plans gain a machine-checkable planning anchor and stale-plan boundary.
The next implementation round has a concrete, testable performance target.
ADR-0053 and ADR-0054 remain immutable. This round changes no source, gate,
schema, or executable wiring surface.

## Acceptance

- This ADR exists and is listed by the generated README ADR index.
- CONTEXT.md contains the new glossary terms.
- No source or gate file is changed in this document round.
- The handoff task book carries the implementation scope and verification
  closure for the next round.
