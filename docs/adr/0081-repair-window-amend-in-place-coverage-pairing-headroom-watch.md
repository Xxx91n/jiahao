# ADR-0081: The Repair-Window Amend-in-Place Convention, the Coverage-Base Pairing, and the Pack-Cap Headroom Watch (grill-t22 documentation round)

- Status: Accepted
- Date: 2026-09-22
- Ledger: `.scratch/grill-t22/decision-ledger.md` - grill-t22 D-001..D-004 (all current)
- Spec: `.scratch/grill-t22/spec-t22-disposition.md`

## Context

The grill-t21 post-audit repair window (a8974cd..b93a5df) was the second de-facto instance of a convention that had never been written down: a repair window lands in place on the audited surface and the repaired round's trend row accumulates the window's R2 touches (t20 abf2f83, t21 715eef1). The grill-t22 second-party audit (`.scratch/grill-t21/reports/2026-09-22-audit-r2.md`, PASS WITH FINDINGS) verified the repair chain live - including must-fail teeth on both new-machinery legs - and adjudicated the charter's three evaluation inputs: the amend-in-place shape is SOUND (the own-row flip branch does not fire), the rc.from guard needs no separate policy home (it is conformance to the already-ratified ADR-0080 D-B text), and defer-0042's second_reviewer slot is now countersigned while defer-0051's was already discharged at grill-t14. The same audit found the round's own charter commit had crossed the ADR-0039 D3 pack cap undisclosed (npm pack 340,258 > 340,000) - the pre-registered headroom watch this ADR names had its trigger fire before the row existed. This ADR writes the convention, records the adjudications, and registers the watch.

## Decision

### D-A - Amend-in-place is the canonical repair-window form (ledger D-003; audit-r2 adjudication b)

A Repair Window (CONTEXT.md term) - the bounded session that repairs a round's audit findings before the next round opens - owns no independent trend row. Its R2 touches register in place on the repaired round's row:

- `governance_tooling_diff.files` gains the newly touched R2 files;
- the row's `reason` gains a dated post-audit note naming the audit and the finding it answers;
- `mechanism_output_diff` carries faithful regenerations exactly as an in-round touch would;
- the checker's `--coverage-base <ref>` leg anchors at the round base and validates the latest row - the base MUST pair with the latest row's own round, otherwise the leg conflates two rounds' diffs against the wrong declared set (audit-r2 adjudicated boundary property);
- the criterion is annotate-not-supersede: the row keeps its original date; fields accumulate, nothing is rewritten.

Recorded boundary properties (audit-r2 section 5, adjudicated non-defects): the leg validates the latest row only; classification runs under the current taxonomy - a file touched while R2 and reclassified inside the same window could evade the flag (latent, no live instance); the diff reads committed state only - the working tree is the clean-tree leg's surface by design.

Conditional flip branch (recorded, not fired): had the audit found the amend-in-place shape defective, this clause would have flipped to own-row canonical - each repair window writes its own trend row - plus checker rework to validate every row's window. The audit's verdict (sound; teeth proven in both directions: wrong-base keyed FAIL, injected-defect keyed FAIL) leaves the canonical form standing.

### D-B - The rc.from tightening needs no separate policy home (audit-r2 adjudication a)

`scripts/check-governance-inventory.js`'s reclassification grace requires `rc.from === 'R2'`: a log entry excuses a non-R2 classification only when it attests the file was R2 at row time. The audit adjudicated that this is conformance to the already-ratified ADR-0080 D-B policy text ("a file moved off R2 by a reclassification effective AFTER the row's date was R2 at row time") - not a new policy decision: nothing about what SHOULD be excused changed, only whether the code enforces it. A standalone ADR would be ceremony inflation. The wiring pin (source assertion + positive control) and the audit's live fixture (R1->R3 does not excuse; R2->R3 does; missing-from does not) hold the semantic floor.

This conditional section is the carrier the charter provided for the adjudication. Trigger registered forward: if the guard's semantics ever drift from ADR-0080 D-B's stated rule - if what should be excused changes, not merely whether it is enforced - the policy text moves to an ADR.

### D-E - Registrations and round bookkeeping (ledger D-004)

- `defer-0067` - the pack-cap headroom watch, registered with its trigger already in-band: the t22 charter commit measured over cap before this row existed. Trigger: pack-smoke-measured headroom below 2,048 bytes, or any commit over the cap. Acceptance: the pre-registered cap-amendment channel (ADR-0062 D-A policy-before-value + the ADR-0071 amendment precedent) lands a cap-amendment ADR, or headroom is restored above the band, before any further surface-growing commit. The cap value itself is untouched this round per the charter's negative-union clause.
- `defer-0042` - the audit-r2 second-party countersign (weak-independent: procedure and the 270,813 -> 300,000 arithmetic verified against the committed record; the original measurement was not witnessed) is recorded via the row's last_check_in; the row stays pending-evaluation pending the 2026-12-14 review_at tide and pinned-protocol re-measurement.
- `defer-0051` - audit-r2 R2-C-4 prose reconciliation: the "second_reviewer slot open" claim was stale residue - the slot discharged 2026-09-17 via the grill-t14 second-party countersign. The registry rationale and ADR-0071's status line are corrected in place; the audit independently re-verified the amendment arithmetic (302,936 -> 340,000).
- `defer-0043`, `defer-0050`, `defer-0052`, `defer-0056`, `defer-0059`, `defer-0061`, `defer-0062` - tally-row subject+rationale compressions under the R2-C-1 pack-surface repair; `defer-0026`, `defer-0054`, `defer-0063` (closed/actioned narrative trims); `defer-0060`, `defer-0024` (pending-row tightening keeping the four elements and all pinned tokens) - the same class: duplicated ADR-content summaries and expired narrative trimmed to registration essence with the pinned tokens (net-addition, D-006(a)(i), gate criteria, gitleaks, R10/R13, sole live tracker, discharged-by-trigger, 324711, closed_via strings) preserved; the audit trail lives in the source ADRs and git history, not in a packed registry field. `bench/polygraph/thresholds.json` `_doc_*` fields were trimmed by the same compression pass (an R2 file - declared on the t22 row's gtd.files).
- The t22 trend row declares `carve_out_used:1` naming the round's two R2 touches (`.github/workflows/ci.yml` - the ADR-0057 D-C suite-parity bump 75->76 forced by the new adr-0081 wiring suite; `scripts/check-governance-inventory.js` - the keyed unresolvable-ref repair under audit-r2 R2-C-3) plus the faithful g6-publish replay regeneration on the mechanism-output channel. The pack-surface compression itself is an R3 documentation-surface edit and rides no machinery channel.

## Consequences

- The repair-window convention is written rather than tribal: future audits check a window's claims against D-A's elements, and the coverage leg's latest-row binding is enforced by each round's battery pinning the matching base.
- defer-0067's armed state is registered truth, not a defect: post-compression the pack sits under cap with the watch row standing guard over the remaining headroom; the cap-amendment ADR is the registered exit when the band is entered again.
- Wiring pins: `test/adr-0081-wiring.test.js` pins the ADR surface, the three registry dispositions, the t22 trend row, the keyed-exit leg, the CONTEXT term, and the index/suite counts; the `test/adr-0033-wiring.test.js` seed inventory extends to 61 entries.
