# grill-t21 audit-r2 handoff - repair-window second-party audit complete (PASS WITH FINDINGS)

For the grill-t22 session (T-1 conditional disposition). Authoritative audit record: `D:/Aworker/jiahao/.scratch/grill-t21/reports/2026-09-22-audit-r2.md`; verbatim re-run evidence (uncommitted, never-commit class): `D:/Aworker/jiahao/.scratch/grill-t21/audit2-evidence/` (29 captures + 2 fixtures + 4 harness scripts, incl. `capture.cjs` - the verbatim battery transform - plus the repair-specific legs `coverage-wrong-base` / `coverage-badref` / `coverage-fixture` / `rcfrom-fixture` / `reclass-from-pin` / `claim-sites`). This file is the map, not the content.

## State verified

- All five repair anchors CONFIRMED live: C-1 (t21 row gtd.files registers `bench/polygraph/thresholds.json` with dated retro-acknowledge reason; ADR-0080:37 names it + post-audit note; report post-audit section :77-85), C-2 (spec-4 Disclosed Repair marker + closure-row split `landed + one sub-item rejected-with-rationale`; the t20-era repair object verified at `.scratch/grill-t20/handoffs/2026-09-20-round-complete.md:36`), C-3 (inventory-shape leg restored `-t 'kind enum'` + removal/restoration disclosed in the battery header :6-15), C-4 (`seven wiring files` + marker quoting the superseded wording), C-5 (`verified + routine re-pin`, repair predates t21).
- New machinery VERIFIED WITH TEETH: `--coverage-base dc6d21b...` exit 0 on the committed diff; wrong-base (2ecbddb) -> keyed FAIL naming the undeclared R2 file; module fixture injecting the C-1 defect shape -> keyed FAIL. rc.from guard: live excusal path probed - R1->R3 and missing-from log entries do NOT excuse (the first audit's over-excuse scenario is dead), R2->R3 does. Indent fix + shapeBad dedup confirmed.
- Committed canon internally consistent at c39674f (75/1286/339994/1865/60/18/148972b/null) - NOT falsified; the tree moved past it (below).

## Findings owed (disposition candidates, by class)

- **R2-C-1 (registration/disclosure; material - blocks t22 green closeout)**: HEAD is over the pack cap - `npm pack` = 340,258 B > 340,000 (ADR-0039 D3 via ADR-0071). Entered at 584f98e (CONTEXT.md +13, the pre-landed Repair Window term, +226 B - the only packed-file change b93a5df..HEAD). Live reds: pack-smoke gate, adr-0038-wiring D1 pin, gate:all exit 1; rewrite-map stale (same commit's new citation surface) + its jest pin. Undisclosed: the charter's baseline line claims ~6 B headroom, stale within its own commit. Disposition candidates: the pre-registered cap channel (defer-0067 trigger + dedicated ADR per ADR-0071 precedent / t22 spec section 5) or a pack-surface trim; plus Disclosed Repair on the charter's baseline claim. The rewrite-map staleness alone would be convention-normal regen churn - the cap crossing is the defect.
- **R2-C-2 (nit)**: report :73 honest-state still says "six wiring files" (mid-session count; unverifiable, inconsistent-reading beside the corrected "seven").
- **R2-C-3 (nit/machinery)**: `--coverage-base` unresolvable ref exits 1 via uncaught exception + stack trace, not a keyed FAIL (coverage-badref.txt).
- **R2-C-4 (nit/registration)**: defer-0051 rationale + ADR-0071 status line still claim an open `second_reviewer` slot on a row closed since 2026-09-17 - reconcile prose when amending rows citing the audit.

## Adjudication answers (recorded in the report, section 6)

- (a) rc.from: NO separate ADR needed - the guard is conformance to the already-ratified ADR-0080 D-B policy; record the adjudication in ADR-0081 D-B's conditional section.
- (b) amend-in-place shape: SOUND (verified live incl. teeth both directions) - the ADR-0081 own-row flip branch should NOT fire; D-A wording should state the coverage base pairs with the latest row's round.
- (c) defer-0042: COUNTERSIGN (weak-independent - procedure + arithmetic verified, measurement not witnessed). defer-0051: registry slot ALREADY DISCHARGED at t14 - no open slot; ADR-0071 amendment procedure independently verified anyway (302,936 -> 340,000 correct); stale prose flagged R2-C-4.

## Carry-forwards / constraints

- Both deliverables stay UNTRACKED for the t22 setup commit to absorb (a8974cd precedent); audit2-evidence/ joins the never-commit class (my clean-tree leg's regex classifies `audit2?-evidence` - the committed regex names only `audit-evidence`; a pattern widening is a candidate for the shared-leg defer-0066 instance).
- My gate:all leg regenerated `bench/research/out/g6-publish-replay.json` to the true 340258; I restored HEAD bytes post-capture (clean-tree-restored.txt: CLEAN). Any gate:all re-run re-dirties it until R2-C-1 is disposed - that is the finding, not a harness bug.
- C-7 lookback tick for t22: this audit's prose uses split-form counts.
- Never push; audit window fixes nothing; evidence `$` lines name verbatim argv or marked display-form (h1-reread keeps the t20 display-form precedent).
