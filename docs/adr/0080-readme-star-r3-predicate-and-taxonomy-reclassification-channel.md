# ADR-0080: The README-* R3 Predicate, the Taxonomy Reclassification Channel, and the grill-t20 C-1 Record Repair (grill-t21 documentation round)

- Status: Accepted
- Date: 2026-09-22
- Ledger: `.scratch/grill-t21/decision-ledger.md` - grill-t21 D-001..D-004 (all current)
- Spec: `.scratch/grill-t21/spec-t21-disposition.md`

## Context

The grill-t20 second-party audit closed PASS-with-findings; C-1 was the blocking defect: the t20 trend row and four authority documents claimed "zero R2 touched" while `.github/workflows/ci.yml` (a suite-parity hand-edit) and `README-zh-CN.md` (the new bilingual mirror) had both been touched and both classified R2 under the surface taxonomy. The single registration defect carried two distinct root causes: (a) the honest carve-out channel existed but was never invoked, so a real machinery touch went undisclosed; (b) `README-zh-CN.md` - a root-level documentation file - classified R2 only because no R3 rule named it: a residual-rule gap in the taxonomy, i.e. a classification defect masquerading as a governance violation. Repairing both halves needs a retroactive record correction that keeps t20-time truth, a forward-looking taxonomy amendment, and a channel by which historical disclosures survive taxonomy evolution.

## Decision

### D-A - The README-* root-file predicate joins R3 (ledger D-003)

The R3 surface gains a root-level README-prefix predicate: any git-tracked root file whose name begins `README` classifies R3 in `scripts/surface-taxonomy.js` (`R3_README_ROOT`, exported and pinned by the wiring test). The wide form is deliberate: a root file named README-anything is documentation by naming convention, so the false-inclusion risk is bounded by the name itself - a non-documentation README-* file would be a naming violation anyway. The exact-match alternative (`README-zh-CN.md` alone) is rejected as a band-aid that re-opens the residual gap on the next locale mirror or README-* companion file. `README.md` stays in `R3_EXACT` - redundant under the predicate, kept so existing pins hold unchanged. ADR-0076 D-A's taxonomy is narrowed, not revised in place: the predicate lands as new policy here per supersede-not-rewrite (ADR-0025).

### D-B - The taxonomy reclassification channel (ledger D-002/D-003)

`docs/governance/surface-taxonomy.json` gains a `reclassifications` log - entries `{pattern, from, to, effective, adr, note}` recording each taxonomy rule change that moves paths between surfaces. `scripts/check-governance-inventory.js` consults the log when recomputing `governance_tooling_diff.files`: a listed file classifying non-R2 is excused iff a reclassification entry matches the file, targets its current class, and is effective after the row's date - i.e., the file was R2 at row time. A row dated on or after the entry's effective date fails on the same listing as before. This keeps the recompute-not-trusted check strict under taxonomy evolution: historical rows keep their at-time truth without weakening the gate for future rows.

First registration: `^README[^/]*$` R2 to R3 effective 2026-09-22 under this ADR - the entry that keeps the t20 row's `README-zh-CN.md` listing valid.

### D-C - The t20 record repair in carve_out_used:1 form (ledger D-002)

The t20 trend row is corrected to `carve_out_used:1` with `governance_tooling_diff.files` naming both touched files - the declared carve-out channel is used as designed rather than annotated as a non-use. The reason's first line names the retroactive correction under audit C-1 and the field-name/content mismatch: `README-zh-CN.md` was a taxonomy-residual misclassification, not governance tooling in substance - `gtd.files` is reused as the disclosure carrier per the CONTEXT.md Trend Anchor disclosed-repair clause. The row keeps t20-time truth (both files were R2 under the then-current taxonomy). The four prose claim sites (t20 ledger D-001, spec-t20 sections 0/1/8, next-round.md, t20 report) carry Disclosed Repair markers with the reason+when+who triple. This supersedes the 2026-09-20 `carve_out_used:0` annotation form.

### D-D - No standing ci.yml suite-parity exemption; the t20 ledger joins the anchors chain (ledger D-003)

`.github/workflows/ci.yml` gets no standing exemption: suite-parity edits remain genuine R2 machinery touches requiring the carve-out and wiring-pin discipline; the audit's option-b (a blanket exemption) is rejected. Separately, `docs/governance/decision-ledger-t20.md` is admitted to the ADR-0061 anchors chain - the governance copy is content-equal to `.scratch/grill-t20/decision-ledger.md`; the admission the audit owed lands here.

### D-E - Registrations and round bookkeeping (ledger D-004)

- `defer-0066` - new merged ratchet row: the four audit C-6 capture-harness smells itemized as individually-closable instances (recapture clone -> shared clean-tree leg module; capNode() deriving label and argv once from the spawned argv; robust NPMCLI resolution; the C1 control-range regex moved to the copy-safe unicode-escape form). The row carries the four elements (owner, deadline, acceptance criterion, recurrence->split escalation trigger) and ratchet semantics - the set only shrinks, never grows.
- C-5 (stale wiring titles and the mislabeled pin) was repaired by the t20 post-closeout commit and is re-verified here; the README index-count pins move to 80 records.
- C-7 lands the AGENTS.md evidence-count split-form convention ("17 captures + 1 fixture"; a bare total is forbidden where a capture/fixture split exists) with its closeout/audit-loop checklist position and a two-round effectiveness lookback registered in the t21 ledger.
- The t21 trend row records `carve_out_used:1` with `governance_tooling_diff.files` naming this round's machinery edits honestly (`.github/workflows/ci.yml`, `bench/polygraph/thresholds.json`, `scripts/build-governance-anchors.js`, `scripts/check-governance-inventory.js`, `scripts/surface-taxonomy.js`). Post-audit note (t21 second-party audit, 2026-09-22): the pack-cap `_doc` hand-edit on `bench/polygraph/thresholds.json` rode commit-prose disclosure only at commit time and was retro-registered on the row; the checker blind spot the audit proved - declared-set labels were recomputed but the committed diff's COVERAGE never was - is closed by the checker's `--coverage-base <ref>` leg (every R2 file in the window must ride a declared channel). The same defect class recurring inside its own repair round is the sharpest possible demonstration that prose disclosure without a coverage check is insufficient.

## Consequences

- R2 residual surface shrinks by the README-* class; future locale mirrors are R3-by-rule.
- The gtd recompute check is unchanged for every file not named in the reclassifications log; the grace is dated and pattern-scoped, never a blanket R3 pass.
- Two consecutive `carve_out_used:1` rows (t20 corrected, t21 declared) raise the burn-rate advisory - advisory only, disclosed in the t21 report.
- Wiring pins: `test/adr-0080-wiring.test.js` pins the predicate behavior, the reclassification log, the corrected t20 row shape, the defer-0066 ratchet row, the anchors admission, and the README index count.
