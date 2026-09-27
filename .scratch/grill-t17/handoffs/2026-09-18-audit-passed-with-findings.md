# grill-t17 audit handoff — PASS WITH FINDINGS — 2026-09-18

For the next agent. The audit report is the authoritative artifact:
`.scratch/grill-t17/reports/2026-09-18-audit.md` — claim→evidence→conclusion
table, auditor-rerun battery (`audit-evidence/rerun/*.txt`), findings H-1..H-5.
This file is the map, not the content.

## Verdict

PASS WITH FINDINGS — every checkable claim in the t17 round report
reproduces against the live tree (hard acceptance re-run verbatim, all
green); the two-axis review is PASS-WITH-FINDINGS on both axes; D-001..D-006
all executed; G-1..G-4 + residue items settled. Findings are forward
dispositions; nothing falsifies a report claim; no rework needed this
window.

## What the audit verified (headline)

- Battery: 73 suites / 1225 tests / 0 skipped; gate:all exit 0 (4
  UNVERIFIABLE ci-mode channels); check-ci-jobs exit 1 keyed / exit 2
  missing; inventory 35 + advisory; deferred 57 (48/9); anchors 16;
  rewrite-map 1432; round-facts+region+prose in sync; instrument
  conditional to 2026-12-11; pack 335900 < 340000; quoted-stale fixture
  fails --check exit 1; liveness green end-to-end.
- G-1 class-killer: invariant pin over all 4 committed gen-docs copies,
  t14+t16 retro-fixed to __dirname derivation, template landed.
- G-2 unconditional scan: proseScan exported, backtick-strip deleted,
  author-time enforcement pre-collect + post-collect re-scan; report
  prose carries zero canon numbers.
- defer-0063 row: missing-convention class + gate criteria + anti-rot
  quota (next fix bundle takes one smell ticket first).
- ERRATA E-7, prior snapshot v2 (n=19), CONTEXT terms, t16 doc-nits ×5,
  consent-sweep rows — all present.

## Findings → next round's review surface

- H-1 (doc defect): `next-round.md` corrupted committed content —
  mangled paths, literal CR, eaten `$skill` names. Doc-nit fix + check
  the authoring path against the file-integrity protocol.
- H-2 (nit): defer-0055 unnamed in T-3 consent-sweep (substance folded
  into sunset line); seq 3/5/6/8 clause dropped from CONTEXT terms.
- H-3 (defer candidate): proseScan `v.length>=2` — single-digit canon
  values never trip; register the floor or remove it.
- H-4 (smell): proseScan FAIL-print+exit duplicated ×2, reportPath read
  thrice, PROSE_KEYS three-place update hazard, exported unused.
  Natural candidate for the defer-0063 quota.
- H-5 (convention candidates): (a) first fix-round trend row — closed
  `kind` enum can't express fix rounds; R2 machinery hand-edits carry
  no governance_tooling_diff (coherent under D-006's carve-out-not-
  invoked reading; the disclosure surface is unregistered); (b) learned
  rule "map regen must never ride an amend" lives only in a commit
  message; (c) handoff verified-state citation counts go stale at the
  regen boundary — keep volatile counts out or re-render at close;
  (d) evidence files disagree on citation count across the regen
  boundary — expected, noted.

## Suggested next grill direction

H-bundle disposition round (same shape as this round): H-1/H-2 as
doc-nits in R1; H-3 adjudication (register floor vs remove) + H-4 smell
under the defer-0063 quota in R2; H-5a as the convention question worth
grilling (fix-round trend-row semantics — extend `kind` enum or
register "fix rounds disclose machinery hand-edits like doc rounds");
H-5b/c as convention registrations. §6 of the audit report is the
mandatory re-run list.

## Suggested skills

- $grill — H-bundle fix round
- $tdd — proseScan floor fixtures, trend-row shape pins
- $code-review — before each commit
- $handoff — next checkpoint
- gitbutler (but) — ALL VCS writes
- atomcode-research — only for contested dispositions (H-5a likely)

## Standing awareness

- `.scratch/grill-t17/audit-evidence/` joins the never-commit set
  (tq/nl/xu/my + this).
- Stacks unlanded: grill-t15-docs (9) / t16-docs (9) / t17-docs (10) —
  owner-domain.
- defer-0060 / defer-0063 / sunset 1/6 quarterly: 2026-12-15;
  instrument conditional cert: 2026-12-11.
