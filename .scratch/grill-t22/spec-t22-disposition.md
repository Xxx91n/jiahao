# grill-t22 — disposition spec (t21 repair-window audit + residual round)

Source of truth: .scratch/grill-t22/decision-ledger.md (D-001..D-004, all current).
Pain (invariant): 构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## 1. Round shape & boundary [D-001]

- kind:documentation round whose work sequence is: second-party audit of the t21 repair window → disposition of whatever it finds → residual items carried by declared carve-out.
- The t21 post-audit repair chain (a8974cd..b93a5df: audit-deliverable absorb, C-1..C-5 repair, cascade re-pin, battery re-run, fixpoint, clean-tree) is unaudited second-party; its own battery re-run is generator-side evidence only and is NOT accepted as verification.
- Residuals carried this round: the repair-window amend-in-place convention is written down; rc.from's policy home is decided via the audit's evaluation; pack-cap only registers its pre-registered slot/trigger — the cap amendment body is out of this round (it walks its own pre-registered ADR channel per the standing policy).
- The new machinery is itself audit object: the --coverage-base leg and the rc.from guard tightening are verified, not assumed.

## 2. Audit charter [D-002, D-004]

- Placement: out-of-round precondition window, run by a verifier-profile independent session — never a task inside the generator round's task book (perceived independence).
- Incremental scope: a8974cd..HEAD (repair chain + GitButler workspace wrapper) plus the amended artifact surface (t21 trend row, ADR-0080 post-audit note, t21 report post-audit section). No cumulative re-audit of already-confirmed surface.
- Anchors: the C-1..C-5 repair claims; the new machinery (coverage leg correctness — diff-derived R2 set vs declared union; rc.from semantics).
- Evaluation inputs (adjudication, not just pass/fail): (a) whether the rc.from tightening needs an explicit policy home; (b) whether the amend-in-place convention's shape is sound; (c) the second_reviewer countersign slots open on defer-0042 and defer-0051 (the next-audit-round event they wait on is this window).
- Deliverables: a second audit file under .scratch/grill-t21/reports/ plus handoff (audit object is the t21 repair chain — same-directory precedent); absorbed by the t22 setup commit.
- Conditional charter rule: this spec and the task book branch disposition by finding CLASS and never name expected findings, severities, or counts — severity and quantity assessment belongs to the audit report. Disposition completion is gated on the audit's verification; zero-finding output degrades the round to residual work only.

## 3. Conditional disposition slots [D-004]

- Registration/disclosure class → Disclosed Repair triple + row backfill (the t21-proven form).
- Convention/policy class → codification (ADR-0081 already carries the repair-window domain; further policy findings take their own slot decision).
- Machinery class → declared carve-out on the t22 row; the escalation branch to a kind:fix round for heavy work is written, threshold left to execution judgment.
- Nit/cosmetic class → in-round prose fixes.
- Zero findings → residual-only round.

## 4. Convention codification [D-003]

- ADR-0081 is the policy carrier:
  - D-A: amend-in-place is the canonical repair-window registration shape — a repair window owns no trend row; the repaired round's row accumulates the window's R2 touches (governance_tooling_diff.files gains newly touched R2 files; the reason gains a dated post-audit note); the coverage leg anchors at the round base and validates the latest row; annotate-not-supersede is the stated criterion.
  - D-B: conditional section for rc.from's policy home — if the audit adjudicates a named home is needed this section carries it; if adjudicated unnecessary, the section records that adjudication.
  - D-E: names defer-0067 (headroom-watch row), satisfying the ADR-0027 registry-ADR coupling and serving as the row's deferred_entry.
- CONTEXT.md gains a standalone glossary term Repair Window (修复窗口) in the standard form (definition + references to ADR-0081/ADR-0076/coverage leg + _Avoid_ line) — a term, not a clause hung on Governance Trend Anchor (t18 D-005 precedent form).
- Conditional branch retained: if the audit adjudicates the amend-in-place shape itself defective, ADR-0081's content flips to the own-row canonical plus checker rework.
- t22 trend row: kind:documentation, adr_added:["0081"], net_additions:1, deferred_entry:defer-0067, zero_product_diff:true, carve_out per actuals.

## 5. Residuals [D-001]

- pack-cap: register the pre-registered slot/trigger only (defer-0067 headroom-watch); the cap amendment itself is forbidden inside this round — it rides its own dedicated ADR channel.
- rc.from: disposition rides the audit's evaluation (ADR-0081 D-B conditional section).

## 6. Closeout [D-004]

- Setup commit absorbs the audit report + handoff, with the absorption disclosure sentence.
- Disposition executes per section 3 slots.
- Acceptance battery verbatim re-run (capture harness reusable).
- Per-finding closure table: every audit finding marked fixed / deferred / converted / rejected-with-rationale.
- Consent sweep named lines: defer-0060 standing, defer-0064/0065/0066/0067 pending-evaluation, sunset counter, never-commit set.
- t22 trend row carries the full field set of section 4; carve_out reflects actuals.
- facts-canon report; report_commit:null.
- C-7 two-round lookback: the t22 report records this round's split-form wording self-check (first tick of the effectiveness review).

## 7. Negative union

- No preset conclusions in the charter (no named expected findings/severities/counts).
- No audit inside the generator round's task book.
- No cumulative re-audit of confirmed surface.
- No pack-cap amendment body this round.
- No own-row convention unless the audit adjudicates amend-in-place defective.
- No R1 touches; never-commit evidence trees preserved.
