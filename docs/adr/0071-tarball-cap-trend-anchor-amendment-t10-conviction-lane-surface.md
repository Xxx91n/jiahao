# ADR-0071: Tarball-Cap Trend-Anchor Amendment for the T-10 Conviction-Lane Surface

Status: Accepted (user-ratified 2026-09-16 via grill-t10 decision ledger; second_reviewer countersign discharged 2026-09-17 via the grill-t14 evidence packet, weak-independent - the "deferred to the next audit round" text was stale residue, corrected under audit-r2 R2-C-4 2026-09-22)
Date: 2026-09-16

Amends: ADR-0039 D3 (the periodic trend-anchor cap moves 300,000 -> 340,000
bytes for the conviction-lane surface). References: ADR-0062 (the pinned
amendment protocol this ADR follows verbatim), ADR-0066 (the immediately
prior application of the same rule), ADR-0070 (the round whose product
surface triggers this re-anchor).

## Context

ADR-0070 D-C moves the adjudicated pairer into the shipped runtime surface:
`src/capa-pairer.js` (10,697 B, byte-pinned) plus the channel components
`src/transcript-adapter.js` and `src/pairer-lane.js`. The packed tarball
grew past the 300,000-byte cap (measured 302,936 B / 109 files on the final
re-measure after all packed-file edits landed, per the pinned re-measure
rule). The ledger's stop-condition
routes exactly here: if `npm pack` would exceed the live cap, open an
ADR-0062-style amendment - never quantize or split the artifact.

## Decision

### D-A - Amendment policy (procedure precedes value, as in ADR-0062 D-A)

1. A pre-registered gate value is amended only by an ADR that (a) states the
   policy before the value, (b) derives the value from evidence on file,
   (c) carries an explicit not-a-retro-application declaration, and (d)
   holds a second_reviewer slot plus a review_at in the deferred-registry
   tide (this amendment is registered as defer-0051).
2. The trigger stays the PERIODIC TREND ANCHOR: each implementation round
   records the measured M; the cap is reviewed against the trailing trend.
3. No assertion is deleted or weakened to make the gate pass; the cap moves,
   the artifact is narrowed, and nothing else. The live anchor keeps exactly
   one home: the `out.size < N bytes` literal in ADR-0039 D3 (parsed by
   scripts/check-pack-smoke.js and test/adr-0038-wiring.test.js).

### D-B - Measurement protocol (pinned by ADR-0062 D-B, unchanged)

- Command: `npm pack --dry-run --json`
- Field: `size` (packed tarball bytes) - not `unpackedSize`.
- Toolchain for this measurement: npm 11.6.1, Node v24.11.0 (measured
  2026-09-16).

### D-C - Value (derived from the on-file trend)

M_latest = 302,936 B (final re-measure, 109 files).
`ceil_to_10_000(302,936 x 1.10) = ceil(333,229.6) = 340,000`.

**New cap: 340,000 bytes**, effective on this commit. This is a
not-a-retro-application declaration: the amendment re-anchors the gate for
this and subsequent measurements; it does not retro-bless a measurement
that already failed red.

### D-E - Review slot

The second_reviewer countersign stays open; the review rides the
deferred-registry tide as defer-0051 (review_at 2026-12-15).

Post-audit note (2026-09-22, audit-r2 R2-C-4): the slot discharged 2026-09-17 via the grill-t14 second-party countersign (weak-independent) on the defer-0051 evidence packet - the "stays open" sentence and the status line were stale residue, corrected in place. The audit independently re-verified the amendment arithmetic (302,936 -> 340,000).

## Rejected

- Shrinking the surface to fit 300,000: the pairer IS the shipped product
  of this round; the lane files are the minimal runtime.
- Quantizing or splitting the artifact: forbidden by the same stop
  condition that routes here (ADR-0066 precedent).

## Consequences

- `out.size < 340,000 bytes` is the single live anchor in ADR-0039 D3.
- The 109-file, 302,936-byte measurement is the new M_latest for the next
  trend evaluation.
