# grill-t21 — spec: t20 audit-finding disposition round (C-1..C-7)

Settled 2026-09-22. Authoritative source: .scratch/grill-t21/decision-ledger.md (D-001..D-004, all current). Inputs: .scratch/grill-t20/reports/2026-09-20-audit.md + .scratch/grill-t20/handoffs/2026-09-20-audit-handoff.md (sk + nv, absorbed by setup commit).

## 0. Headline

Single kind:documentation round WITH a declared carve-out (carve_out_used:1 + non-empty governance_tooling_diff.files): retroactively repairs the t20 governance record (trend-row backfill + four Disclosed Repairs) AND lands the structural machinery edits the audit owed (README-* -> R3 taxonomy amendment + t20-ledger anchors admission), plus all cheap doc repairs C-2..C-7. The carve-out channel is used as designed, not bypassed.

## 1. Round boundary (D-001)

In scope: the t20-row backfill; Disclosed Repair on the four zero-R2 claims (t20 decision-ledger D-001 line, spec-t20-disposition sections 0/1/8, .scratch/grill-t20/handoffs/next-round.md, .scratch/grill-t20/reports/2026-09-20-report.md); C-2 dangling host-contracts.txt citation; C-3 canonical anti-quota sentence into the t20 report; C-4 CONTEXT filename fix to hyphenated README-zh-CN.md; C-5 stale test titles + mislabeled pin; C-6 ratchet defer row; C-7 enforced convention; surface-taxonomy.js README-* predicate; build-governance-anchors.js t20-ledger admission; ADR-0080; closeout per section 6. Out of scope: any R1 runtime file; ADR-0076 in-place edits; re-litigating disclosed mid-round events; stack landing; never-commit set.

## 2. C-1 record repair (D-001/D-002)

- t20 trend row corrected in place as a disclosed retroactive repair: carve_out_used:1; governance_tooling_diff.files = ['.github/workflows/ci.yml','README-zh-CN.md']; reason's FIRST line names the retroactive correction under t21 audit C-1 + the field-name/content mismatch (README-zh-CN.md is a taxonomy-residual misclassification, not governance tooling) + pointers to the four Disclosed Repairs + the t21 taxonomy amendment. The row records t20-time taxonomy truth (files were R2 then). mechanism_output_diff (g6 replay) was properly disclosed — no repair.
- Four zero-R2 prose claims -> Disclosed Repair triples, rewritten as 'R1 zero-touch + two R2 files retro-acknowledged via carve-out'.
- Wiring/test label note: the gtd.files reuse is precedent-backed (t15 listed ci.yml; t14 retro annotation).

## 3. Structural machinery via carve-out (D-001/D-003)

- surface-taxonomy.js: predicate rule admitting the README-* root-file class to R3 (wide form; false-inclusion benign because the README prefix is documentation by definition).
- build-governance-anchors.js: t20 decision-ledger admission (the owed admission).
- ADR-0080 authored as the policy home: residual-rule gap the audit exposed + wide-form rationale + the explicit decision that ci.yml gets NO standing suite-parity exemption (high-risk files keep per-name disclosure; per-round gtd cost is low).
- All machinery diffs ride t21's carve-out: carve_out_used:1 + gtd.files listing every R2 file touched this round honestly.

## 4. Minors disposition (D-004)

- C-5: fixed in-round (R3): stale '76/77/78 records' titles -> '79'; mislabeled 'D6 semantics' pin renamed.
- C-6: ONE ratchet-style merged defer row (harness-hardening class) itemizing four individually-closable instances (recapture clone -> shared leg; capNode() single derivation of label+argv; robust NPMCLI resolution; C1 regex -> copy-safe \u0080-\u009f form); four elements (owner, deadline, acceptance criterion, escalation trigger 'same class recurs -> split into standalone entry'); set only shrinks. Serves as t21 deferred_entry.
- C-7: AGENTS.md convention sentence WITH positive+negative examples + boundary ('evidence counts write split form: "17 captures + 1 fixture"; bare totals forbidden where a capture/fixture split exists') + mechanical position (checklist tick in the closeout/audit loop) + effectiveness lookback registered for the next two rounds; the t20 report's ambiguous '18 evidence files' line gets a Disclosed Repair.
  [Disclosed Repair, 2026-09-22, grill-t21 fix/dev sub-agent - t21 audit C-2: the bare '18 evidence files' line does not exist in the t20 report - it lives only in the immutable commit message a47cde1, and the t20-era repair already landed at handoffs/2026-09-20-round-complete.md:36. This sub-item is therefore disposed rejected-with-rationale (no live object), while the convention + checklist + lookback landed as specified.]
- t20 ledger/spec dotted-filename mentions need NO repair (decision records of the original pick; the npm-driven deviation was disclosed in ADR-0079).

## 5. Closeout (D-004)

Setup commit absorbs sk+nv; section-6 battery verbatim re-run '--round grill-t21' (audit capture.cjs reusable); consent-sweep named lines (defer-0060; defer-0064/0065 pending-evaluation; new C-6 ratchet row; sunset counter; never-commit set); per-finding closure table in the t21 report (each C-1..C-7 -> fixed/deferred/converted/rejected-with-rationale); t21 trend row kind:documentation + adr_added:["0080"] + net_additions:1 + carve_out_used:1 + gtd.files non-empty + zero_product_diff:true + deferred_entry; facts-canon report; report_commit null.

## 6. Negative union

No silent history edits (all corrections disclosed first-line); no new unvalidated JSON fields; no prose-only corrections to structured rows; no ci.yml standing exemption; no exact-match-only taxonomy band-aid; no C-6 in-round refactor; no bare-count phrasing going forward; no R1 touches; no ADR-0076 in-place edit; never-commit set preserved; report_commit null.
