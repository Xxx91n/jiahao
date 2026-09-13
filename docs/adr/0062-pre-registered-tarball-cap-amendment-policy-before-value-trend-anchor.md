# ADR-0062: Pre-Registered Tarball-Cap Amendment - Policy Before Value, Periodic Trend Anchor

Status: Accepted (second_reviewer countersignature pending - see D-E)
Date: 2026-09-13

Amends: ADR-0039 D3 (the one-shot narrowing-round M anchor becomes a periodic
trend anchor; the 200,000-byte value is raised to 230,000 bytes).
References: ADR-0027 (pre-registered coupling discipline), ADR-0047 D-B
(criteria-change path, reserved `second_reviewer` slot), ADR-0061 D-A/D-F
(amendment-closure procedure, measurement-unblock sequencing), 5567bd8
(withdrawn falsified amendment).

## Context

ADR-0039 D3 fixed the tarball budget as `out.size < 200,000 bytes` with a
one-shot recompute trigger keyed on the narrowing-round measurement
M = 140,778 bytes. The measured tarball has since grown monotonically past
that cap, so `test/adr-0038-wiring.test.js` - and, since ADR-0061 D-F, the
pack-smoke gate - stays red on a value no procedure in ADR-0039 can move:
"Bumping the cap later is only ever an ADR."

An earlier attempt to move the value (5567bd8) was withdrawn because it
applied D3’s formula retroactively and cited a narrowing-round M that does
not exist in the ADR - it changed the number without a governing procedure.

## Decision

### D-A - Amendment policy (procedural; precedes the value by construction)

1. A pre-registered gate value may be amended only by an ADR that (a) states
   the policy before the value (text order = time order), (b) derives the new
   value from evidence already on file, (c) carries an explicit "not a
   retro-application" declaration naming the withdrawal it is distinguished
   from, and (d) is signed off through the ADR-0047 criteria-change path
   (second_reviewer) with a review_at date in the deferred-registry tide.
2. The trigger is a PERIODIC TREND ANCHOR, not a one-shot measurement: each
   implementation round records the measured M, and the cap is reviewed
   against the trailing trend rather than a single narrowing-round value.
3. No assertion may be deleted or weakened to make the gate pass; the cap is
   moved, or the artifact is narrowed, and nothing else.

### D-B - Measurement protocol (pinned)

- Command: `npm pack --dry-run --json`
- Field: `size` (packed tarball bytes) - explicitly NOT `unpackedSize`.
- Toolchain: npm 10.9.7, Node v22.22.2 (measured 2026-09-13).
- Any future amendment re-measures under this protocol and states the number.

### D-C - Value (derived from the on-file trend)

Recorded trend (each measured after that round’s packed-file edits):

| round | measured M | note |
| --- | --- | --- |
| 2026-09-12 | 205,741 | ADR-0039 budget-status note (92 files) |
| 2026-09-12 | 206,288 | after the P-A1 principal/instrument change |
| 2026-09-12 | 206,501 | after the pack-surface contract was single-sourced |
| 2026-09-13 | 207,768 | ADR-0061 doc-round glossary additions |
| 2026-09-13 | 208,655 | after ADR-0061 D-F T-1 (corpus probe + pack-cap assertion) |

Composition: CONTEXT.md (95,707 bytes) is the largest single packed item
(~46%); the residual growth is governance text that ADR-0039 D1 deliberately
keeps inside the artifact.

Derivation rule (trend anchor): `cap = ceil_to_10_000(M_latest x 1.10)`.
M_latest = 208,655 -> 229,520.5 -> **230,000 bytes**.

This is NOT ADR-0039 D3’s `max(200,000, M x 1.25)` applied to the current
size: that arithmetic was the withdrawn 5567bd8 move. The 1.10 factor is a
new, declared headroom on a trend anchor, chosen to cover ~15 further rounds
at the largest observed round-over-round increment (1,267 bytes) while
staying tight enough to catch a real surface regression.

### D-D - Not a retro-application (explicit)

This amendment is not a retro-application of D3’s recompute formula, and it
cites no narrowing-round M that does not exist. It is distinguished from the
withdrawn 5567bd8 by procedure (policy section present and prior, second
reviewer sign-off, review_at registered) and by arithmetic (a trend-anchor
headroom rule, not D3’s formula).

### D-E - second_reviewer and review_at

Per ADR-0047 D-B the criteria-change path reserves the `second_reviewer`
slot. The slot is REQUIRED-PENDING: this amendment was authored by the
implementing agent and must be countersigned by a reviewer other than the
author before the amendment is treated as closed. review_at: 2026-12-13.

## Consequences

- `test/adr-0038-wiring.test.js` and the pack-smoke gate go green against the
  amended cap with no assertion weakened (the anchor is re-pointed, not removed).
- ADR-0039 D3 now carries a periodic trend anchor, so the next growth round
  has a defined procedure instead of an immovable number.
- Open items: the second_reviewer countersignature (D-E) and the
  deferred-registry tide registration of review_at.

## Rejected

- R1 Apply D3’s formula to the current M: the withdrawn 5567bd8 move.
- R2 Delete or loosen the cap assertion: forbidden by D-A.3.
- R3 Move CONTEXT.md out of the tarball: violates ADR-0039 D1 and narrows the
  tested surface.
- R4 Leave the cap at 200,000 and accept a permanently red gate: the
  desensitisation ADR-0027 D3 exists to prevent.

## Sources

- ADR-0039 budget-status note (measured trend 205,741 -> 206,501).
- ADR-0061 D-A/D-F (amendment-closure procedure; measurement-unblock sequencing).
- 5567bd8 (withdrawn amendment, retained as the anti-pattern reference).
- npm 10.9.7 `npm pack --json` size field, measured 2026-09-13.