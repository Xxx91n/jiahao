# ADR-0051: Closed Persistence Capability Class

Status: Accepted

Date: 2026-09-09

## Context

ADR-0050 added off-chain tail and genesis anchors, but the anchor write path
still decides durability with a platform string:
`_fsyncDirectory()` skips directory fsync only when `process.platform` is
`win32`. A platform string cannot express a host's actual capability, cannot
be tested portably, and cannot explain crash semantics to later verification.
The closed-capability pattern already exists in ADR-0040.

## Decision

### D-A - The anchor write path uses a closed persistence capability class

The implementation uses a closed `PERSISTENCE_CAPABILITY` registry:

- `dir-sync-durable`: the host can open and fsync a directory descriptor.
- `dir-sync-unsupported`: the host cannot currently make a directory rename
  durable through the supported runtime.

`_fsyncDirectory()` dispatches by capability class instead of by
`process.platform`. The current Windows no-op remains a no-op.

### D-B - Installation probes, human declaration remains authoritative

Installation or upgrade probes directory fsync and records the observed
class. A probe that succeeds is not proof that the platform actually made the
directory entry durable, so an operator declaration is the authoritative
source when the probe is inconclusive or platform semantics are uncertain.

### D-C - Write recipe, crash interpretation, and audit exposure share the class

The capability class controls:

- the directory-fsync write recipe;
- the expected anchor state after a crash;
- the audit annotation attached to each anchor write.

The class must appear in verification or audit output so an
`anchor_behind` state can be explained as an expected degraded state.

### D-D - Native directory synchronization remains deferred

Windows-native directory synchronization is deferred as `defer-0025`. No new
dependency or generic filesystem adapter is added to bridge it now.

## Rejected Alternatives

- Platform-string dispatch: it leaks implementation trivia and makes behavior
  untestable on other hosts.
- Errno allowlist: it can silently convert a real durability failure into a
  successful write.
- Generic filesystem adapter: one real implementation does not justify a
  speculative seam.
- Signature or Merkle upgrade: it changes the threat model but not host
  durability.

## Consequences

- The next implementation round changes `_fsyncDirectory()` into a class
  dispatch, adds the probe and audit annotation, and keeps current platform
  behavior unchanged.
- `defer-0025` is registered in `docs/deferred-registry.json`.
- `CONTEXT.md` gains Persistence Capability Class.

## Acceptance

This document round changes no source, gate, schema, or executable wiring
surface. `defer-0025` must be registered and anchored by this ADR.

## Sources

Serial atomcode research: `atomcode-host-durability-model`,
`atomcode-q2-durability-witness-boundary`, `atomcode-q4-deferred-scope-boundary`.
