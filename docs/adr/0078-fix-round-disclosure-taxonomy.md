# ADR-0078: The Fix-Round Disclosure Taxonomy - kind:fix and the Reused governance_tooling_diff Channel (grill-t18 disposition round)

- Status: Accepted
- Date: 2026-09-19
- Amends: ADR-0064 D-F (the trend-inventory kind field is no longer a closed documentation-only enum)
- Ledger: `.scratch/grill-t18/decision-ledger.md` - grill-t18 D-001..D-008 (all current); the governance copy is `docs/governance/decision-ledger-t18.md`
- Spec: `.scratch/grill-t18/spec-h-disposition.md`

## Context

The grill-t17 audit closed PASS WITH FINDINGS (H-1..H-5 plus nits). H-5a named the gap: the trend-inventory `kind` field was a closed enum - `documentation` - and the grill-t17 fix round was filed under it anyway, a mislabel that survived because a fix round's real signature (R2 machinery hand-edits) had no disclosure channel. The adjudicated options were: extend the enum and reuse the existing disclosure field, redefine `kind` as row-class, mint a third parallel disclosure field, or exempt fix rounds from the inventory. This decision registers the first: the enum admits `fix`, fix rounds disclose through the same `governance_tooling_diff` field documentation rounds use for carve-out accounting, and the grill-t17 row receives a disclosed corrective rewrite under the audit-log convention - state the mislabel, never silently re-edit history.

## Decision

### D-A - The fix-round row shape (ledger D-004)

**Decision**: `rounds[].kind` admits exactly two values - `documentation` and `fix`. A fix round's distinguishing fact is R2 machinery hand-edits, so the disclosure obligation travels with the kind: a fix row MUST carry `governance_tooling_diff` listing every R2 machinery source file the round hand-edited. The field is reused verbatim - same recompute-against-taxonomy validation (every listed file must classify R2; R1 is a hard error, R3 is a mislabeled row), same `{files, reason}` shape. No `machinery_diff` third field, no semantic overloading of `kind`.

- `zero_product_diff` keeps the ADR-0076 D-A definition: the product is the R1 runtime require-closure; R2 machinery edits never move it.
- `carve_out_used` is a documentation-round burn-rate field and is NOT counted for fix rounds (the carve-out streak counts documentation rows only); a fix row may omit it.
- `governance_tooling_diff` presence implies a non-empty `files` list (grill-t19 amendment, ledger D-005): 'no carve-out used' is recorded as `carve_out_used:0` with the field omitted, never an empty files list - a bare marker hard-fails for both kinds.
- The D-F deferred-entry assert is documentation-round scoped: a fix row is exempt from the "zero-product-diff + new ADR forces a deferred-registry entry" rule. The tally-row convention is a documentation-round cadence; fix rows stay in the inventory because the streak semantics depend on continuity.
- The advisory streak computation is kind-aware (grill-t19 amendment, ledger D-003): `kind:fix` rows are outside both advisory streak populations (skip-not-reset) - they never feed the doc-round net-additions streak even when `net_additions > 0`, and they never reset `carveStreak`, so a doc-fix-doc sequence remains consecutive for both streaks.
- `scripts/check-governance-inventory.js` admits `fix` on the kind enum line and enforces the row shape above; wiring pins the negative (a `kind:fix` row without `governance_tooling_diff` fails).

### D-B - The disclosed corrective rewrite (ledger D-004)

**Decision**: the grill-t17 trend row is corrected in place under the audit-log convention, not rewritten silently: `kind` flips `documentation` -> `fix`, `governance_tooling_diff` is backfilled with the round's two R2 machinery hand-edits (`scripts/build-round-facts.js`, `scripts/check-governance-inventory.js`), and the `reason` first line states the retroactive correction - the row was mislabeled under the closed enum before this ADR existed. Historical fields (`net_additions`, `zero_product_diff`, `mechanism_output_diff`, `carve_out_used`) stand untouched: an observational ledger may be corrected, but only with the correction disclosed on the corrected line itself.

## Consequences

- A fix round can no longer be filed as a documentation round: the kind enum makes the distinction explicit and the missing-governance_tooling_diff pin makes silence ungreen-able.
- One disclosure channel serves both round shapes; the taxonomy surface gains no third field and `kind` carries no second meaning.
- History stays an audit log: corrections land with their reason on the corrected line, matching the Amend-Riding Discipline's immutable-history rule for sha references.
