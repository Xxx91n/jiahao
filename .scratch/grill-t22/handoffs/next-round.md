# grill-t22 — next-round task book

Resident charter for any sub-agent executing grill-t22. Authoritative inputs:

- Ledger (settled decisions): D:/Aworker/jiahao/.scratch/grill-t22/decision-ledger.md — D-001..D-004, all current
- Spec (round shape): D:/Aworker/jiahao/.scratch/grill-t22/spec-t22-disposition.md
- Audit object: the t21 post-audit repair chain a8974cd..HEAD (absorb a8974cd / fix 715eef1 / cascade a3abb32 / battery 148972b / fixpoint c39674f / clean-tree b93a5df + workspace wrapper)
- Prior audit record: D:/Aworker/jiahao/.scratch/grill-t21/reports/2026-09-22-audit.md + handoffs/2026-09-22-audit-handoff.md (already absorbed by a8974cd)
- GOAL: D:/Aworker/jiahao/.scratch/grill-t22/GOAL.md

Baseline state (verified at grill close): 80 ADRs; 15 trend rows (last = grill-t21-doc-round, carve_out_used:1, gtd.files 5 entries incl. bench/polygraph/thresholds.json, deferred_entry defer-0066); 60 deferred entries; pack 339994/340000 (~6B headroom); check-governance-inventory.js carries the --coverage-base leg + rc.from tightening (both unaudited second-party).

## T-0 — second-party audit window (runs BEFORE the round, outside it) [D-001, D-002, D-004]

- T-0.1 Verifier-profile independent session audits the repair chain incrementally: a8974cd..HEAD + the amended artifact surface (t21 trend row, ADR-0080 post-audit note, t21 report post-audit section). No cumulative re-audit of the already-confirmed t21 surface.
- T-0.2 Anchor checks: the C-1..C-5 repair claims; the new machinery — --coverage-base leg correctness (diff-derived R2 set vs declared union) and rc.from guard semantics.
- T-0.3 Evaluation inputs (adjudication answers, not just pass/fail): (a) does the rc.from tightening need an explicit policy home; (b) is the amend-in-place convention's shape sound (if defective, the ADR-0081 own-row flip branch fires); (c) countersign the open second_reviewer slots on defer-0042 and defer-0051 — this window is the next-audit-round event they wait on.
- T-0.4 Deliverables: a second audit report + handoff under D:/Aworker/jiahao/.scratch/grill-t21/reports/ and handoffs/ (audit object is the t21 surface — same-directory precedent). Evidence tree stays untracked (never-commit class).
- T-0.5 The audit report OWNS severity and quantity assessment. Nothing in this charter names expected findings — if the audit returns zero findings, skip to the residual-only branch (T-2 + T-3).

## T-1 — setup + conditional disposition [D-002, D-004]

- T-1.1 Setup commit absorbs the audit report + handoff with the disclosure sentence (a8974cd precedent).
- T-1.2 Dispose each finding by class, never by preset conclusion: registration/disclosure class → Disclosed Repair triple + row backfill; convention/policy class → codification slot decision; machinery class → declared carve-out on the t22 row (heavy work escalates to a kind:fix round — the branch is chartered, threshold is execution judgment); nit class → in-round prose fix; rejected/inapplicable → stated with rationale in the closure table.
- T-1.3 Disposition completion is gated on the audit's verification verdict — a finding is not closed by the repair existing but by the audit confirming it.

## T-2 — convention codification + registrations [D-003]

- T-2.1 Author ADR-0081: D-A amend-in-place canonical (repair windows own no trend row; the repaired round's row accumulates window R2 touches via gtd.files append + dated reason-note; --coverage-base anchors at round base validating the latest row; annotate-not-supersede criterion); D-B rc.from policy-home conditional section (carries the audit's adjudication either way); D-E names defer-0067. Status Accepted, ledger+spec anchors per house form.
- T-2.2 Verify the pre-landed CONTEXT term Repair Window (修复窗口) sits correctly (glossary-term form, references ADR-0081/0076/coverage leg, _Avoid_ line) — adjust wording only if the audit's adjudication requires it.
- T-2.3 Register defer-0067 (headroom-watch: pack-cap headroom trigger; owner, deadline, acceptance criterion, review_at per registry schema). MUST land in the same commit as ADR-0081 with the id named in ADR text (ADR-0027 coupling; wiring pin enforces).
- T-2.4 Wiring/regen cascade: adr index 80→81 pins, seed inventory, published_tip re-pin, anchors/rewrite-map/facts regen as the committed battery requires.

## T-3 — closeout [D-004]

- T-3.1 Acceptance battery verbatim re-run (capture harness reusable: .scratch/grill-t21/audit-evidence/capture.cjs form); disclose every leg delta in the deltas list — the t21 C-3 finding was an undisclosed leg drop.
- T-3.2 Per-finding closure table in the t22 report: each audit finding marked fixed / deferred / converted / rejected-with-rationale.
- T-3.3 Consent sweep named lines: defer-0060 standing, defer-0064/0065/0066/0067 pending-evaluation, sunset counter, never-commit set.
- T-3.4 t22 trend row: kind:documentation, adr_added:["0081"], net_additions:1, deferred_entry:defer-0067, zero_product_diff:true, carve_out_used and governance_tooling_diff per actuals (zero if no machinery disposition was needed).
- T-3.5 facts-canon report (zero canon numbers in prose); report_commit:null.
- T-3.6 C-7 lookback first tick: record this round's split-form wording self-check in the t22 report (the two-round effectiveness review spans t22 and t23).

## Hard rules

- but for all VCS writes; new branch per session; never push/land; never-commit set preserved (audit-evidence trees).
- Ledger discipline: no conclusion lives in conversation only; compaction/handoff only after the ledger is on disk.
- Committed docs via fs.writeFileSync / file-edit tools only — never escape-interpreting shells; byte-check after write.
- Captured-evidence $ lines name verbatim argv or are explicitly marked display-form.
- Evidence counts in committed prose use split form ("N captures + M fixtures") — C-7 convention, checklist tick this round.
- Intermediate commits may be red if disclosed; round-final state must be green.
- ADR-0027 coupling: deferred-registry.json diffs ride the same commit as an ADR naming the defer id.
- If the audit adjudicates amend-in-place defective: ADR-0081 flips to the own-row canonical + checker rework (D-003 conditional branch) — do not silently pick the other shape.

## Suggested skills

- grill-with-docs — round-open ritual if scope shifts mid-execution
- domain-modeling — ADR-0081 authoring + CONTEXT term placement
- tdd — wiring pins for ADR-0081 / defer-0067 before or with the edits
- code-review — before each commit
- handoff — round-complete checkpoint
- gitbutler (but) — all VCS writes
- atomcode-research — only for contested dispositions
