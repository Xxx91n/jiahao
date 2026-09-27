# grill-t19 audit handoff - 2026-09-19 (verifier second-party)

For the next agent. This file is the map, not the content: the audit findings,
the claim->evidence->conclusion table, the D-001..D-010 verification, and the
standing surface all live in the audit report - read it first.

- Audit report: D:\Aworker\jiahao\.scratch\grill-t19\reports\2026-09-19-audit.md
- Audit evidence (verbatim re-run, never-commit class): D:\Aworker\jiahao\.scratch\grill-t19\audit-evidence\
- Round report under audit: D:\Aworker\jiahao\.scratch\grill-t19\reports\2026-09-19-report.md
- Round-complete handoff under audit: D:\Aworker\jiahao\.scratch\grill-t19\handoffs\2026-09-19-round-complete.md

## Verdict

PASS WITH FINDINGS. The t19 fix-disposition round's hard acceptance was
independently re-run and matches the report's facts canon in full (all 19
battery legs re-produced identical exit codes; suite 73/1262/0; pack 339573;
canon fields all live-verified; clean tree: zero tracked diffs, untracked set
= never-commit class only). All eight t18 findings and all seven rework items
landed with real implementation evidence; every Disclosed Repair carries its
triple; the disclosed red mid-round state was verified real (published_tip pin
stale across xqq/pmv/utp); lrn is literally the first R2-surface commit
(wiring tests classify R3).

## Findings (B-1..B-7 in the report) - none blocking, none reworked by this window

- B-1 (coverage defect, the substantive one): the D-003 feed-leg negative pin
  is vacuous - a single fix(+1) row yields identical output under old and new
  semantics. Reset-leg is properly pinned; feed-leg needs a discriminating
  scenario ([fix(+1),fix(+1)] or [fix(+1),doc(+1)]). Candidate for the next
  fix bundle's smell ticket or a t20-closeout pin.
- B-2 (fidelity nit, reported not ratified): committed evidence `$` lines show
  `npx jest`/`npm pack` while the harness spawned node-resolved binaries - the
  same label-vs-exec class A-3 closed, in miniature, in the round's own harness.
- B-3 (slop): capture-battery.cjs captures round-facts.txt twice; unused WIN var.
- B-4 (adjudicated residual): a red suite inside collect() reads exit-2
  verifier-broken - D-004 registered execFileSync coverage, but spawn-failure
  and red-data conflate; precision clause candidate.
- B-5 (cosmetic): `--report` without a value exits 2 vs the `--round` sibling's 1.
- B-6 (nit): "18 evidence files" - qzk committed 17 under evidence/; defensible
  only counting round-facts.json as evidence.
- B-7 (evidence-trail nit): clean-tree assertion claimed but not committed as an
  artifact; this audit re-ran it clean (suggest a git-status battery leg).

## Suggested next direction

Per ledger D-001/D-007..D-010, the next grill is **t20: the README front-face
documentation round**, opening on this verified t19 baseline:

- EN-primary full IA redesign per spec-t19-disposition section-8 skeleton
  (pinned blocks byte-identical; honesty banner before '## What it does';
  '## Measurement record' parent demoting the pinned content one level;
  ADR index folded into <details>; wiring verdict is the ordering arbiter).
- README.zh-CN.md bilingual mirror (git-tree only, never the tarball; autonym
  switch line; translation-baseline commit-hash comment; English prevails).
- Pure-text face: 2-3 static non-numeric badges; no assets/readme/; optional
  Mermaid profile-flow in Architecture only.
- ADR-0079 houses the bilingual-mirror convention (D1-D5) + the
  anti-quota-theater sentence; t20 trend row kind:documentation +
  adr_added:["0079"] + net_additions:1; machinery (if touched) rides the
  carve-out with carve_out_used:1 + non-empty gtd.files (D-005 shape).
- The audit absorb convention: this report + handoff + audit-evidence stay
  uncommitted; t20's setup commit absorbs report+handoff disclosed (t18/t19
  precedent).

## Suggested skills

- $grill / grill-with-docs - t20 round-open ritual (any residual adjudications
  first: B-1 pin strengthening, B-4 precision clause if the contract opens).
- beautify-github-readme + readme-crafter - t20 README execution (D-007..D-009).
- $implement + $tdd - execution + wiring pins (incl. the B-1 discriminating pin).
- $code-review - before each commit (Standards + Spec axes).
- $handoff - at t20 closeout, same convention.
- gitbutler (but) - all VCS writes; t20 stacks on grill-t19-docs.

## Boundaries carried forward

- Never-commit set: tq/nl/xu/my round-diff patches + .scratch/*/audit-evidence/
  trees (now incl. grill-t19) + round-commits.txt - do not commit them.
- Stack landing (grill-tNN-docs unpushed to origin) is owner-domain; gb-local
  refs are GitButler's local mirror, not a push.
- defer-0060 stands (pending-evaluation external-event, CI 403 carrier,
  quarterly, review_at 2026-12-15); sunset counter 1/6 mid-quarter.
- report_commit stays null on any report regeneration; canon numbers never in
  prose; verbatim evidence is never byte-patched (Disclosed Re-Capture only).
- Battery args carrying backslashes run through Non-Interpolating Channels
  (arg arrays / script files) - the audit capture harness is the working
  example at .scratch/grill-t19/audit-evidence/capture.cjs.
