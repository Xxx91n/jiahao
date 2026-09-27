# ADR-0061 - Second Repair Order: single-line D-1 fix (2026-09-13)

From: audit window. To: repair window (or human, on approval).
Authority: `.scratch/grill-adr0061/reports/2026-09-13-reaudit-report.md` (Section 3 finding D-1, Section 5).

## Verdict of the re-audit

All six original blocking findings (STD-1, P-1, P-2, STD-2, SPEC-1, SPEC-2, SPEC-3) are **CLOSED** at the artifact level.
Append-only is **independently proven**: seq 1-10 hashes are byte-identical to the pre-repair baseline; seq 11/12 are legitimate appends.
Hard acceptance A1-A9 all reproduce (54 suites / 727 tests; gate:all exit 0 with 23 entries incl. the new governance-anchors gate; pack 212,699 B < 230,000).
No functional regression, no weakened assertion, no unauthorized scope.

**One Medium finding remains: D-1.**

## D-1 (Medium) - a re-measure figure in ADR-0039 that no measurement supports

- **Where:** `docs/adr/0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md:53`
- **As written:** `Current re-measure at this repair round: **212,387 bytes / 93 files** (still < 230,000).`
- **Ground truth (auditor, measured twice):** `212,699 B / 93 files` - which is also exactly what the `pack-smoke` gate prints.
- **Blast radius:** the string `212,387` occurs in exactly one place in the tree; `212,699` appears nowhere. No gate asserts it (`check-pack-smoke.js` parses only `out.size < N bytes`, i.e. the cap 230,000); ADR-0039 is not a witnessed artifact in `anchors.json`. So it is **prose-only** - but it is a factually wrong claim in a canonical ADR.
- **Why it must be fixed:** D-1 is the *same defect class* (an unverified number written into an ADR) that SPEC-1/R-4 was chartered to close. It was introduced by the R-4 paragraph itself, in the very round that was fixing that class.

### Fix (one line, one file)

At `docs/adr/0039-...md:53`, choose ONE:

1. **Correct the number:** replace `212,387 bytes` with `212,699 bytes`. If the figure is kept, re-measure it at the moment of writing (`npm pack --dry-run --json`, read the `size` field) and state the command beside it, per this ADR's own "re-measure after ANY packed-file edit" rule.
2. **Delete the sentence:** the trend rows 4-5 above it are the substantive content; a live figure in an ADR is a standing invitation to the same rot. Dropping `Current re-measure at this repair round: ... (still < 230,000).` is the lower-maintenance option.

**Do not change any other file.** `anchors.json` needs no regen (ADR-0039 is not witnessed). Do not touch the trend rows 4-5 back-fill or the ADR-0062 width note - those are correct and closed.

## Verification after the fix (proportionate - docs-only, no gate coupling)

1. `grep -n '212,387' docs/adr/0039-*.md` -> no matches; and if option 1, `grep -n '212,699'` -> one match.
2. `npx jest --runInBand` -> still 54 suites / 727 tests (must be unchanged by a docs-only edit).
3. `node scripts/run-gates.js` -> still exit 0, 23 entries.
4. `node scripts/build-governance-anchors.js --check` -> still exit 0 (must be unaffected; proves ADR-0039 is truly outside the witness set).

A full re-audit is **not** required for this single prose number; the four checks above are the proportionate confirmation, and the auditor will spot-verify them.

## Optional (non-blocking, may be deferred or declined)

- RSD-1: `scripts/instrument.js:461-463` - the P-2 lookup has a redundant fallback (`tailEvent` ternary, else `history.slice().reverse().find(...)`). It is behaviourally correct today but its correctness is incidental. A single unambiguous expression would be cleaner. Not required for closure.

## Separation of duties

The audit window does not edit code or docs. Whichever party applies the D-1 fix, the four checks above close the round.
