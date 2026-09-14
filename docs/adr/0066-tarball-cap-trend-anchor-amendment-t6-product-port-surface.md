# ADR-0066: Tarball-Cap Trend-Anchor Amendment for the T-6 Product Port Surface

Status: Accepted (user-ratified 2026-09-14 via grill-t7 decision ledger D-003 T-1 stop-condition; second_reviewer countersign deferred to the next audit round - the ADR-0065 ratification pattern)
Date: 2026-09-14

Amends: ADR-0039 D3 (the periodic trend-anchor cap moves 230,000 -> 300,000
bytes).
References: ADR-0062 (the amendment procedure this ADR executes: policy
before value, periodic trend anchor, second_reviewer slot, review_at in the
deferred-registry tide), ADR-0065 D-B (the product port surface this cap
admits), ADR-0027 D2 (same-commit coupling), decision-ledger-t7 (D-003).

## Context

T-1 of the T-6 confirmatory round moved the trained manifest (116,852 B raw,
float64) into `src/port/g6-manifest.json` per ADR-0065 D-B.1 - the product
port ships in the tarball by pre-registration. The measured packed tarball
grew past the 230,000-byte cap (measured 269,320 B mid-round; final
re-measure 270,813 B / 101 files after all packed-file edits landed, per the
pinned re-measure rule). The ledger's
stop-condition routes exactly here: if npm pack would exceed 230,000 B, open
an ADR-0062 amendment - never quantize (G6 logits < 1e-12 need float64).
The ADR-0039 lever (excluding bench/polygraph/README.md, 4,764 B) cannot
close a ~40 kB breach, so the trend-anchor amendment is the only legal move.

## Decision

### D-A - Amendment policy (procedure precedes value, as in ADR-0062 D-A)

1. A pre-registered gate value is amended only by an ADR that (a) states the
   policy before the value, (b) derives the value from evidence on file,
   (c) carries an explicit not-a-retro-application declaration, and (d)
   holds a second_reviewer slot plus a review_at in the deferred-registry
   tide (this amendment is registered as defer-0042).
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
  2026-09-14).

### D-C - Value (derived from the on-file trend)

| round | measured M | note |
| --- | --- | --- |
| 2026-09-12 | 205,741 | ADR-0039 budget-status note (92 files) |
| 2026-09-12 | 206,288 | after the P-A1 principal/instrument change |
| 2026-09-12 | 206,501 | after the pack-surface contract was single-sourced |
| 2026-09-13 | 207,768 | ADR-0061 doc-round glossary additions |
| 2026-09-13 | 208,655 | after ADR-0061 D-F T-1 (corpus probe + pack-cap assertion) |
| 2026-09-13 | 212,699 | ADR-0061 repair-round re-measure (93 files) |
| 2026-09-14 | 226,867 | grill-t7 doc round (ADR-0065 + governance texts; 98 files) |
| 2026-09-14 | 269,320 | mid-round: port surface landed (src/port/score.js + g6-manifest.json) |
| 2026-09-14 | 270,813 | final re-measure after all packed-file edits (101 files) |

Derivation rule (trend anchor): `cap = ceil_to_10_000(M_latest x 1.10)`.
M_latest = 270,813 -> 297,894.3 -> **300,000 bytes**.

The jump is dominated by one planned payload - the float64 manifest
(116,852 B raw, ~40 kB packed) - not by drift. The 1.10 headroom covers the
observed governance-text increments while staying tight enough to catch a
real surface regression; quantization or manifest slimming remains FORBIDDEN
(ADR-0065 D-B.1: G6 logits < 1e-12 need float64).

### D-D - Not a retro-application (explicit)

This amendment is not a retro-application of ADR-0039 D3's recompute
formula, and it cites no narrowing-round M that does not exist. It is
distinguished from the withdrawn 5567bd8 by procedure (policy section
present and prior, second_reviewer slot held, review_at registered) and by
arithmetic (the ADR-0062 trend-anchor headroom rule applied to a measured
on-file M, not D3's one-shot formula).

### D-E - second_reviewer and review_at

Per ADR-0047 D-B the criteria-change path reserves the `second_reviewer`
slot. The slot is OPEN: countersign is deferred to the next audit round (the
grill-t7 ratification pattern used by ADR-0064/0065 - a user-ratified ledger
accepts now, independent review countersigns later). review_at: 2026-12-14,
registered in the deferred-registry tide as defer-0042 alongside the
ADR-0062 review entry defer-0037.

## Consequences

- ADR-0039 D3's `out.size < N bytes` anchor re-points to 300,000; the
  pack-smoke gate and adr-0038-wiring test pass with no assertion weakened.
- The 230,000-byte value and its derivation stay recorded in ADR-0039 /
  ADR-0062 (superseded, not erased).
- If a later round breaches 300,000, the same procedure applies: measure M
  under D-B, amend by ADR, never quantize.

## Rejected

- R1 Quantize / float32 / vocab-slim the manifest: FORBIDDEN (G6 logits
  < 1e-12 need float64; ADR-0065 D-B.1).
- R2 Exclude the manifest from the tarball: contradicts ADR-0065 D-B.1 (the
  port is the product surface and must ship).
- R3 Pull bench/polygraph/README.md (4,764 B): cannot close a ~40 kB breach;
  lever stays on file.
- R4 Leave the cap and accept a permanently red gate: the desensitisation
  ADR-0027 D3 exists to prevent (ADR-0062 R4 precedent).

## Sources

- ADR-0062 D-B measurement protocol and D-C trend-anchor derivation rule.
- npm 11.6.1 `npm pack --dry-run --json` size field, measured 2026-09-14.
