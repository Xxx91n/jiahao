# spec-t28-disposition — grill-t28 execution spec (convention-drift disposition round)

Round: **grill-t28** — dispose the four convention-drift findings of critique V7 (ADR approval-surface drift / restack orphan blind spot / audit-artifact residence / delegation trigger text) plus the now-fired defer-0070 closure. Sole decision source: `.scratch/grill-t28/decision-ledger.md` (D-001..D-006, all current). Four atomcode research runs informed the records; refinements folded into cited D-IDs — nothing outside the ledger.

Invariant motivation (verbatim): 我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## 1. Round topology (D-001)

- **t28 = convention-drift disposition round**: agent-side disposition of V7 items 1-4 plus the seven-field defer-0070 closure (trigger objectively met: run 36142965743 = first origin/main success).
- **Pinned execution order 1→3→4→2→0070**: the approval-form definitions from item 1 are the semantic antecedent for items 3/4 adjudications.
- Zero new ADR expected: item 1 degrades to errata+restore (archaeology proved nobody decided it), item 3 is residence restoration, item 4 rides the append-only amendment-pointer precedent, item 2 mechanizes an existing contract (D-006). Anti-ratchet evidence continues — disclosed with reasoning, never a bare zero-ADR streak (t19 D-001 lesson).
- If the round's audit surfaces >6 new decision lines, split t28a/t28b voluntarily — do not cram.
- Human-only (drafted, never executed): ratification restoration, seq-13 verdict, `adjudicated/grill-t27` tag push, ratchet-brake adoption, errata/waiver issuances.

## 2. ADR approval-surface drift (D-002)

- Archaeology verdict (established, not assumed): the bare `- Status: Accepted` form was born at ADR-0076 (t15, commit e03324e3) as an ADR-FORMAT.md minimal-template adoption artifact — **no decision record exists** (t15/t16 ledgers, specs, reports, audit reports, PR history: zero hits). ADR-0082 (t23) retained the old form → two forms coexist unregistered.
- Disposition (a′-hybrid): (i) one master errata record + one appended pointer-annotation line on each of ADR-0076..0085 — wording carries **pending-confirmation**: `second_reviewer countersign obligation presumed subsisting - the bare form since t15 is unregistered drift, pending entity-level adjudication` (the accidental-stripping characterization is NOT asserted as adjudicated fact); (ii) the nine affected ADRs (0076-0081, 0083-0085; 0082 already carries a slot via defer-0068) merge into the existing 10-item countersign queue for the 2026-12-15 entity-level tide; (iii) a registry/ledger row marks the two approval forms' boundary, this ledger's D-record as the lightweight endorsement record; (iv) NO new ADR — archaeology proved nobody decided; the sole reversal path (consensus evidence surfacing later) is pre-registered as a lightweight registration ADR.
- Negatives: audit-PASS (first-line self-check) is never stated as substituting countersign (second-line sign-off — IIA three-lines model); no drift-then-ratify precedent; whether errata adoption needs same-level approval as the original ratification is a human call.

## 3. Audit-artifact residence (D-003)

- The verdict-bearing audit report is a **claim artifact** — it must live in a registered claim surface (`reports/` or `handoffs/`, ADR-0085 closed enum), not under `audit-evidence/` (examiner work-product per nc-001). Residence under audit-evidence both evades claim-point freshness checks and thins the public audit surface established by ADR-0084 D-B.
- Disposition: (i) move t26/t27 `audit-evidence/audit-report.md` byte-verbatim into each round's `reports/` and commit; (ii) leave an untracked two-line pointer README at the old spot (verdict residence + captures remain per nc-001); (iii) register the report-writing convention in the audit-side docs: reports may only claim committed-surface-reachable evidence; untracked captures get path/count pointers only, never copied content; (iv) verdict issuance stays owner-side — migration is residence, not adjudication; wording marks the distinction; (v) nc-001 untouched; any future change to nc-001 or the claim_surfaces enum requires ADR + human sign-off.
- Negatives: workpaper/report institutional separation (AS 1215 / SEC 2-06) is inviolable; no findings-table embedding in handoffs (SSOT / dual authority); no copying untracked capture content into the committed surface.

## 4. Delegation trigger text + seq-13 expiry (D-004)

- The template's forward rule ("the next signoff-class event carries the completed template verbatim") fired unexecuted at seq-27; the operative convention already confines signoff-class events to human-authority rounds — the trigger is dead text. seq-13 (`henceforth all human consent, you as main agent sign on behalf of human Xxx91n`) is an open-ended standing grant outside the expired-by-default net.
- Disposition (a′): (i) append-only amendment re-pointing the trigger to `the first signoff-class event inside a human-authority round / the 2026-12-15 tide`; the amendment note states WHY the original trigger became unsatisfiable (the signoff-class narrowing history); ADR-0072 gets an amendment pointer line (ADR-0070 Amended-by precedent); `test/adr-0072-wiring.test.js` updated in lockstep; (ii) a default-expiry annotation appended on seq-13 — **not editing the grant body** (registered authorizations are never modified in place, POA discipline): `unadjudicated at the 2026-12-15 tide => inert for events after that date; frozen history untouched`, worded pending-confirmation awaiting owner endorsement; (iii) four human-only items listed: seq-13 renew/expire/exemption verdict, amendment-pointer acceptance, expired-by-default generalization decision (reserved for the tide), any modification of the seq-13 body.
- Negatives: no in-place rewrite of registered authorization/rule text; no exemption entry masking a genuinely-failed rule (exemptions are for valid-rule-not-applicable-here); no agent unilateral expiry or generalization (criteria-change level, needs second_reviewer + review_at); auto-inert is a safety-engineering convention not universal law (durable-POA counterexample) — hence pending-confirmation.

## 5. Restack orphanization — detection leg + mechanized ritual (D-005, D-006)

- Detection leg (standing wiring leg): every pinned/`captured-at-head` sha inside committed round artifacts is asserted ancestor of HEAD via `git merge-base --is-ancestor <sha> HEAD`; any failure → leg red (red semantics = no new claims / no seal); exemptions only via registered errata list.
- Mechanized ritual trigger: `gitbutler/workspace` HEAD non-fast-forward vs the last seal-anchor record → the leg goes red automatically ("remember the ritual" degrades to "see the red light").
- Registered ritual (AGENTS.md working agreement): after any move/restack/undo on a lane containing claim commits → re-run the full evaluateRound → errata detected orphans → only then resume claims/seals.
- Registration contents: residual window (restack→next-eval gap), trigger, red-light semantics, human-only adjudication points, explicit rejection reasons for the lane-ownership precheck (GitButler lane/ownership is not in the git database — unmechanizable) and waiver-only (waivers are for undetectable residuals, first principle of waiver discipline).
- Carrier (D-006): zero new ADR — gates.json + wiring test + `kind:fix` trend row + `governance_tooling_diff` + one append-only pointer line on ADR-0085 carrying the **verbatim derivation**: `pinned-sha ancestry assertion mechanized - violation-instance of the existing claim-point contract; the non-ff trigger maps to the existing post-seal-edit red state, no new normative state introduced` plus the promotion hook: `if a second independent violation form of the ancestry contract appears, or the assertion's semantics diverge from the claim-point walk, mint a first-class ADR at that point`. The α classification itself is countersigned by the owner (never self-certified).
- Human-only: errata adjudication + re-seal authorization; ritual-trigger interpretation; waiver issuance; α-classification ratification; promotion decision; red-light response adjudication (rebuild / re-seal / declared drift).

## 6. defer-0070 closure (D-001 scope; t27 D-007 schema)

- The registered condition fired: run `36142965743` on origin/main (sha `c8613f55`) concluded `success` — the first green run since the 40-failure streak.
- Seven-field closure row: `run_id=36142965743` / `conclusion=success` / `verifiable_composition` (true-green leg count + verbatim UNVERIFIABLE leg id list from that run — expected: 4 corpus gates + rewrite-map + registered ci-mode UNVERIFIABLEs) / `degradation_semantics` (exit-2 non-blocking, ADR-0040/0061 D-F verbatim anchor) / `degradation_cause` (stale JIAHAO_BENCH_CORPUS_B64 secret = human action, defer-0072) / `successor_defer_id=defer-0072` / `closure_rule_verbatim`: `a workflow run on origin/main concludes success; on landing, close this entry and record the first green run id` + literal-execution statement.
- Grade: yellow (closed-but-degradation-marked), never unqualified green; UNVERIFIABLE legs keep running + reporting.

## 7. Human-authority package (drafts only)

- Tag adjudication memo: co-name declared seal `5cb2a9fe` (recommended — the seal/tag co-naming contract pins the declared sha; post-seal rework was disclosed substantive work, D-011) vs covering the rework tip (breaks co-naming).
- seq-13 adjudication draft (renew-with-expiry / expire / exemption-with-expiry three-way).
- Countersign queue expansion 10→19 (ADR-0076..0081, 0083-0085).
- Ratchet-brake four-criteria adoption item (t25 human-authority package carryover).

## 8. Negative union

No asserting accidental-stripping as adjudicated fact (pending-confirmation wording); no audit-PASS-as-countersign-substitute language; no editing pinned claim artifacts or registered authorization bodies in place; no findings-table duplication into handoffs; no copying untracked captures into committed surfaces; no lane-ownership precheck (tool boundary); no waiver for mechanically-detectable residuals; no exemption masking a failed rule; no agent-side tag push / secret write / grant verdict / classification ratification; no silent convention drift — every boundary gets a registered row; no zero-ADR streak as an end in itself.
