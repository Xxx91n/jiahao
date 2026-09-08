# ADR-0053: Periodic Re-Anchoring and Anchor Freshness

Status: Accepted

Date: 2026-09-09

## Context

ADR-0050 treats the genesis anchor as a one-time install artifact. Once it is
lost, the only fallback is manual restatement from the beginning of the
chain, so the guarantee strength falls from an independent witness to a
self-anchored chain. ADR-0052 defines the witness-unavailable state and
recovery path, but not how often a fresh independent witness point exists.

## Decision

### D-A - The anchor is a periodically refreshed witness

The existing forward-seal mechanism becomes a periodic re-anchor. A re-anchor
may occur after a commit count, an elapsed interval, or both. Even with no new
data, the anchor freshness timestamp is renewed.

### D-B - Recovery falls back to the last good seal

When the current anchor witness is unavailable, verification falls back to
the last good seal. The recovery window is bounded by the re-anchor interval,
not by the full age of the chain. If no acceptable seal remains, the
ADR-0052 witness-unavailable recovery path applies.

### D-C - Anchor freshness is a behavior decision, not a new failure code

ADR-0053 defines re-anchor cadence, seal TTL semantics, and last-good-seal
recovery. It does not add another `KNOWN_ANCHOR_STATUS` value. ADR-0052 owns
the failure-state contract.

## Rejected Alternatives

- One-time genesis anchor only: loss causes a cliff-like loss of independent
  detection strength.
- Merging this decision into ADR-0052: failure semantics and witness
  lifecycle evolve independently.
- Rebuilding from the whole chain without a last good seal: it weakens the
  independent witness into a self-witness.

## Consequences

- The next implementation round extends `sealForwardIfNeeded()` into a
  periodic re-anchor behavior.
- `CONTEXT.md` gains Anchor Freshness / Periodic Re-Anchoring.
- The cross-host external witness remains deferred as `defer-0024`.

## Acceptance

The implementation round must lock re-anchor triggering, last-good-seal
fallback, TTL semantics, and the absence of new failure-state registry
values.

## Sources

Serial atomcode research: `atomcode-q9-periodic-reanchor-boundary`.
