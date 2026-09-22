# ADR-0082: Tarball-Cap Trend-Anchor Amendment Under the defer-0067 Armed Band

Status: Accepted (user-ratified 2026-09-22 via grill-t23 decision ledger
D-001/D-003; second_reviewer countersign slot deferred to the next audit
round - registered as defer-0068, review rides the 2026-12-15 tide)
Date: 2026-09-22

Amends: ADR-0039 D3 (the periodic trend-anchor cap moves 340,000 -> 380,000
bytes). References: ADR-0062 (the pinned amendment protocol this ADR follows
verbatim), ADR-0071 (the immediately prior application of the same rule),
ADR-0081 (which registered the defer-0067 headroom watch this amendment
discharges).

## Context

ADR-0081 D-E registered defer-0067 - the pack-cap headroom watch - already
armed: the grill-t22 charter commit measured 340,258 B over the 340,000 B
cap before the row existed, and the in-round compression left the pack at
339,408 B - 592 B of headroom, inside the 2,048 B trigger band. defer-0067's
acceptance routes here: the pre-registered cap-amendment channel (ADR-0062
D-A policy-before-value + the ADR-0071 amendment precedent) must land a
cap-amendment ADR before any further surface-growing commit. grill-t23
carries the GitHub front-face workstream, and README.md is on the packed
surface, so the channel runs first (grill-t23 D-001/D-003).

## Decision

### D-A - Amendment policy (procedure precedes value, as in ADR-0062 D-A)

1. A pre-registered gate value is amended only by an ADR that (a) states the
   policy before the value, (b) derives the value from evidence on file,
   (c) carries an explicit not-a-retro-application declaration, and (d)
   holds a second_reviewer slot plus a review_at in the deferred-registry
   tide (this amendment is registered as defer-0068).
2. The trigger stays the PERIODIC TREND ANCHOR: each implementation round
   records the measured M; the cap is reviewed against the trailing trend.
   This firing ran through the armed-band channel - defer-0067's registered
   acceptance - which is a declared trigger of the same policy, not a new
   one.
3. No assertion is deleted or weakened to make the gate pass; the cap moves,
   the artifact is narrowed, and nothing else. The live anchor keeps exactly
   one home: the `out.size < N bytes` literal in ADR-0039 D3 (parsed by
   scripts/check-pack-smoke.js and test/adr-0038-wiring.test.js).

### D-B - Measurement protocol (pinned by ADR-0062 D-B, unchanged)

- Command: `npm pack --dry-run --json`
- Field: `size` (packed tarball bytes) - not `unpackedSize`.
- Toolchain for this measurement: npm 11.19.1, Node v24.11.0 (measured
  2026-09-22).

### D-C - Value (derived from the on-file trend)

M_latest = 339,408 B (re-measured 2026-09-22, 113 files).
`ceil_to_10_000(339,408 x 1.10) = ceil(373,348.8) = 380,000`.

**New cap: 380,000 bytes**, effective on this commit. This is a
not-a-retro-application declaration: the amendment re-anchors the gate for
this and subsequent measurements; it does not retro-bless a measurement
that already failed red (the t22 charter's 340,258 B over-cap reading stays
an over-cap reading - defer-0067 was the registered record of it).

### D-E - Review slot

The second_reviewer countersign rides the deferred-registry tide as
defer-0068 (review_at 2026-12-15) - accept-now-countersign-later per the
ADR-0066/0071 precedent; the countersign is owed at the next audit window.

## Rejected

- Compression-instead-of-amendment (grill-t23 D-003 c): defer-0067's armed
  acceptance names this channel; compressing the surface only postpones the
  registered exit and forfeits the front-face round's README headroom.
- A self-chosen margin or a different formula: the pinned trend anchor
  `cap = ceil_to_10_000(M_latest x 1.10)` is the only sanctioned
  derivation.
- Retro-blessing the 340,258 B measurement: forbidden by channel clause (c);
  the breach is repaired history, not a measurement this amendment excuses.

## Consequences

- `out.size < 380,000 bytes` is the single live anchor in ADR-0039 D3;
  headroom after this commit
  lands (README index + count lines included) is 380,000 - 339,911 = 40,089 B, back above the
  2,048 B trigger band (amendment-time M_latest stays 339,408 - the
  re-measure rule keys the pre-change surface).
- defer-0067 discharges by trigger on this commit (registry row closed,
  closed_via names this amendment); defer-0068 carries the countersign slot
  to the tide.
- The 113-file, 339,408-byte measurement is the new M_latest for the next
  trend evaluation.
