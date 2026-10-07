# grill-t34 re-audit handoff (2026-09-30, after rework)

Round state: implementation + rework on lane grill-t34-impl (base
89b92487). Audit verdict: **CONDITIONAL PASS**. Authoritative audit
document: .scratch/grill-t34/reports/2026-09-30-audit-report.md
(first-pass FAIL + re-audit sections R1-R6 + audit-coverage v1 block).

## Read in this order

1. .scratch/grill-t34/reports/2026-09-30-audit-report.md — R1 verdict,
   R2 eight-item verification, R3 structural residual, R4 coverage
   attestation, R5 process violations, R6 disposition.
2. .scratch/grill-t34/reports/2026-09-30-report.md section 5a — fix-window
   rework account (PV-1 correction left visible).
3. docs/adr/0090-countersign-rejection-disposition-contract.md +
   docs/adr/0091-derive-from-source-mechanism-contract.md.
4. .scratch/grill-t34/decision-ledger.md D-001..D-005.

## Open owner decisions (grill-t29 F-7 — agent never decides)

1. **D1 — map-freshness historical-claim residual.** Three claim commits
   (cf90d660 / 9008c4ae / ba378bc9) have committed maps predating their
   claim-file citations; live-tree test in adr-0087-wiring stays red.
   Options: (a) human map amend / follow-up wave; (b) registered waiver or
   declared-drift note naming the shas; (c) accept as lane residue and let
   the landing wave cover it (disclose). GitButler refused the registered
   commit-then-amend path (delta depends on llx).
2. **Landing**: $but land --yes after owner review of D1; then the usual
   post-land re-pin rhythm (published_tip, zh-CN D6, ad-hoc leftovers:
   uncommitted docs/governance/anchors.json + $trend-inventory.json).
3. **D2** (audit-surface coverage block) is **completed** by the audit
   window — no owner action.

## Also open (from dual-axis re-audit)

- **PV-7**: 613a2471 message claims AGENTS.md trailing newline; landed
  bytes have none (worktree only). Land the newline + correct/annotate the
  false message claim. Same class as PV-1 — do not skip.
- Optional: mirror tide-eve pointer into ADR-0090 (AGENTS-only today).
- Land the audit report + this handoff on the claim surface with the next
  but batch (currently untracked).

## Suggested skills

- $but — landing + post-land re-pins after D1 disposition.
- $code-review — only if another rework wave opens.
- $grill-with-docs — t35 candidates (see below).

## Next grill direction

- Lead candidate: **defer-0078** (skip-attribution protocol).
- Registered floor: defer-0079..0083 transfer rows; defer-0084
  (0087/0088 disposition detail) rides the 2026-12-15 tide.
- Do not re-open t34 derive-from-source bodies unless D1 resolution
  requires a follow-up wave (then the wave is map-only + regen).

## Owner-only acts remain

Errata adjudication, re-seal authorization, trigger interpretation,
waiver issuance, countersign reject/ratify, t27 tag push, tide unbundling.
The agent reports state; it never issues these verdicts.

## Corruption disclosure (grill-t35 R-A fix-forward)

This file was committed with two escape-eaten characters, both produced by
an escape-interpreting shell layer rather than by its author:

- `0x08` (BACKSPACE) where `$but land --yes` was intended - the layer ate `$b`
  and emitted `\b`.
- `0x09` (TAB) where `$trend-inventory.json` was intended - the layer ate `$t`
  and emitted `\t`. The t18 doc-hygiene signature set exempted TAB outright,
  which is why this second byte escaped a battery that caught its sibling.

Both are repaired in the tree by this commit and the original commit
`71f3d4df` (grill-t34 audit PASS) is cited in display-form as the forensic
record of the corrupted bytes. History is never rewritten: the corrupted blob
stays reachable at `71f3d4df` and at `origin/main`.

The scanner itself was widened in the same wave
(`scripts/shared/doc-hygiene.js`, ADR-0092 D-M1): a TAB that is not at the
start of its line is now a registered signature. Measured across the tracked
text corpus at registration, that predicate has exactly one hit - this file.
