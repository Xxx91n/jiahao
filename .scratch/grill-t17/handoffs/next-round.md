# grill-t17 → next round — standing task book

Audience: any sub-agent executing the t17 fix round. Authoritative inputs:
- Ledger (decisions, verbatim answers, constraints): D:Aworkerjiahao.scratchgrill-t17decision-ledger.md
- Spec (sectioned requirements, negatives union): D:Aworkerjiahao.scratchgrill-t17spec-fix-disposition.md
- Audit being settled: D:Aworkerjiahao.scratchgrill-t16eports6-09-18-audit.md (§6 = acceptance battery to re-run verbatim)
- Audit handoff: D:Aworkerjiahao.scratchgrill-t16handoffs6-09-18-audit-passed-with-findings.md

## Verified baseline (t16 audit-reproduced; re-verify before claiming)

- node scripts/run-test-gate.js --expected-suites 73 → 73/1216/0 skipped
- npm run gate:all → exit 0 (35 entries; 4 UNVERIFIABLE on this host: ci-wiring, bench-gate, probes, mr-probes)
- node scripts/check-ci-jobs.js → exit 1 consuming-row keyed; missing file → exit 2
- check-deferred → 56 (47 live, 9 closed); governance-inventory → 35 + advisory;
  anchors → 16 in sync; rewrite-map → 1414; round-facts --check --report → in sync;
  instrument --check → authoritative (conditional cert to 2026-12-11)
- pack:smoke → 333992B / 113 files < 340000

## T-1 — R1 documentation bundle (doc surface only; covers D-002/D-004/D-005/D-006)

Ordered steps:
1. ADR-0077 appendix: register unconditional-scan proseScan semantics +
   evidence-file convention (per-round artifact, not in anchors chain — same
   churn reasoning as round-facts.json). [D-002]
2. CONTEXT.md terms — Scribed Approval vs Proxy Signature (delegation-quality
   axis = authorization field; 人决我录 vs 我决). NOTE: already landed in the
   t17 doc commit — verify present, extend only if wording drifts. [D-004]
3. seq-27 governance note: register "substantively compliant + literal defect"
   classification; record expiry=任务耗竭（两个具名任务完成即失效）as the
   correction; frozen chain untouched. Convention line: signoff-class
   authorizations carry literal scope:+expiry: tokens henceforth. [D-004]
4. Re-Execution Prior snapshot v2 in CONTEXT.md: n=19@2026-09-18 (G-1/G-2/G-3
   in, G-4 out as quality-not-claim); mark n=16 superseded; carry
   detection-bias clause verbatim; register "audit findings merge at closeout"
   + "first self-disclosure = directional event, separate registration". [D-004]
5. deferred-registry row for build-round-facts guard/exit-style smell:
   missing-convention class, anti-rot quota "next fix bundle must take one
   smell ticket first"; the gate criteria convention (minutes-scale ×
   behavior-preserving × no-convention-needed) written into the row. [D-005]
6. Doc-nits: t16 handoff 1412×2 citation-count dup + "D-E" mislabel vs
   ADR-0077 D-A..D-D; spec §3 member-list overclaim vs shipped enumeration;
   t16 report F-C wording (same-commit touch = carve-out gloss, not the
   convention term). [D-005]

## T-2 — R2 machinery bundle (covers D-002/D-003/D-005/D-006)

Ordered steps:
1. proseScan: move the bare-number scan into scripts/build-round-facts.js as an
   export; delete the backtick-strip; --check --report enforces it; jest pins
   the real report + quoted-stale-number fixture that MUST fail --check. Create
   .scratch/grill-t17/evidence/ for verbatim tool output; report references it
   by path without numbers. [D-002]
2. gen-docs invariant pin: new wiring assertion — every committed
   .scratch/grill-t*/gen-docs.cjs derives ROOT from __dirname, no absolute-path
   literal; retro-fix t14+t16 copies in the same commit; template file for the
   gen-docs header lands as the authoring layer. [D-003]
3. Gated smell fixes — separate refactor:/test: atomic commits (NOT mixed with
   fix commits): (a) tmpdir cleanup in adr-0058-wiring run() helper;
   (b) yml/job helper dedup across describes; (c) loadTaxonomy lifted out of
   the loop in check-governance-inventory. [D-005]
4. Wiring nits: adr-0076-wiring L1 stale header; adr-0069-wiring:305 test name
   "(rebuilt, 69 records)". [D-005]
5. Re-run t16 audit §6 acceptance battery verbatim; capture verbatim output
   into .scratch/grill-t17/evidence/. [D-006]
6. t17 round report: facts section rendered from round-facts.json (regenerate
   at close); NO canon numbers in prose (quoted or bare — D-002 now enforced);
   report_commit null. [D-002/D-006]
7. Consent sweep: defer-0060 quarterly (review_at 2026-12-15), sunset 1/6 same
   date, SLA rows, O-E backlog — one disposition line each + the smell-ticket
   quota line. [D-006]

## T-3 — closure (covers D-001/D-006)

- Zero owner asks. Stack landing (grill-t15-docs 9 + grill-t16-docs 9 unlanded,
  remote main 21b1442) is an informational note, not an ask.
- Four audit patches (tq/nl/xu/my) stay untracked forever — verify pre-commit.
- Audit-ready note for the owner: list G-bundle dispositions as the next
  audit’s review surface.

## Hard rules

- No canon numbers in report prose outside the sentinel region (D-002 enforced).
- Frozen history never rewritten (seq-27 correction lands as new note).
- No fourth edit-surface category; no delegation-posture reopening.
- No whole-script shared module for gen-docs (Wrong Abstraction).
- GitButler for ALL VCS writes; explicit change IDs; stack above grill-t16-docs.
- report_commit stays null; evidence artifacts never enter anchors chain.

## Suggested skills

-  — G-bundle fix round
-  — quoted-stale fixture, gen-docs invariant pin, smell-fix regression
- -review — before each commit; separate refactor:/test: commits per D-005
-  — next checkpoint
- gitbutler (but) — ALL VCS writes
- atomcode-research — only for contested dispositions
