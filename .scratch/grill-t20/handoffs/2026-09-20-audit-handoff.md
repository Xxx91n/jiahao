# grill-t20 audit handoff - 2026-09-20 (verifier second-party)

For the next agent. This file is the map, not the content: the audit findings
(C-1..C-7), the claim->evidence->conclusion table, the D-001..D-005 + t19
D-007..D-010 verification, and the standing surface all live in the audit
report - read it first.

- Audit report: D:\Aworker\jiahao\.scratch\grill-t20\reports\2026-09-20-audit.md
- Audit evidence (verbatim re-run, never-commit class): D:\Aworker\jiahao\.scratch\grill-t20\audit-evidence\
- Round report under audit: D:\Aworker\jiahao\.scratch\grill-t20\reports\2026-09-20-report.md
- Round-complete handoff under audit: D:\Aworker\jiahao\.scratch\grill-t20\handoffs\2026-09-20-round-complete.md

## Verdict

PASS WITH FINDINGS. The t20 documentation-disposition round's hard acceptance
was independently re-run verbatim through the Non-Interpolating Channel and
matches the report's facts canon in full (all 20 audit legs reproduced the
expected exit codes; suite 74/1271/0; pack 339518 < 340000 byte-equal to
canon; liveness pack/extract/install/init/MCP alive; clean tree: zero tracked
diffs, untracked set = never-commit class only). The npm readme.* glob claim
behind the filename deviation was independently re-demonstrated (dotted form
force-packs, hyphenated escapes). Pinned README fragments byte-verified
against the t19 tip. All seven B-1..B-7 dispositions landed with real
implementation evidence.

## Findings (C-1..C-7 in the report)

- **C-1 (requires disposition - the substantive one)**: the round touched two
  R2-classified files - `.github/workflows/ci.yml` (suite-parity bump) and
  `README-zh-CN.md` (R2 residual: no R3 rule names it) - while the trend row
  and four authority documents register "zero R2" / carve_out_used+gtd absent.
  Mechanically false under the round's own surface taxonomy
  (scripts/surface-taxonomy.js classifyPath over all 52 diff files: R1=0,
  R2=3 incl. the properly-disclosed g6 replay, R3=49), against the
  pre-registered disclosure path in t19 D-010 and the t15 ci.yml-in-gtd
  precedent. `zero_product_diff` holds (R1 untouched); every gate is green -
  the defect is in the governance record, repairable by retroactive
  annotation (t14/t17 precedent) or a fix-round taxonomy amendment + the owed
  t20-ledger anchors admission. Reported, not ratified.
- C-2 (minor): report:127 cites `evidence/host-contracts.txt` - no such file,
  no such leg; the check runs inside gate-all.
- C-3 (minor): the canonical anti-quota-theater sentence (charter requires it
  in ADR-0079 AND the report) is absent from the report - a paraphrase sits
  in its place, dropping the streak-feed disclosure.
- C-4 (minor): CONTEXT.md:2376/:2384 Bilingual Mirror term still names the
  superseded dotted filename `README.zh-CN.md`; shipped file is hyphenated.
- C-5 (nit): stale test titles ('76/77/78 records' asserting '79...') +
  mislabeled 'D6 semantics' pin asserting the Context anti-quota sentence.
- C-6 (judgement calls): recapture clone, cap() argv double-typing (the B-2
  drift channel survives structurally), fragile NPMCLI derivation x2, raw-byte
  C1 regex (the once-corrupted artifact; \u0080-\u009f is copy-safe).
- C-7 (nit): '18 evidence files' un-split ambiguous phrasing recurs in the
  round that repaired it upstream (17 captures + 1 fixture = 18 literal).

## Carry-forwards / standing surface

- C-1 disposition owed: retroactive gtd/carve_out_used backfill + Disclosed
  Repair on the zero-R2 claims (doc-surface, t14/t17 precedent), OR a kind:fix
  round for the taxonomy amendment (README-zh-CN.md -> R3; optional standing
  suite-parity exemption) + t20-ledger anchors admission (needs R2 surface).
- Pack-cap headroom thin: 339518/340000 (482 bytes) - the next surface-growing
  round should plan the pre-registered amendment path.
- defer-0060 standing; defer-0064/0065 pending-evaluation (review 2026-12-15).
- Mirror maintenance live: any README.md touch must sync README-zh-CN.md in
  the same commit + disclosed re-pin (ADR-0079 D6; wiring-enforced).
- Branch NOT pushed/landed - grill-t20-docs stacks on grill-t19-docs.
- Never-commit set unchanged: .scratch/*/audit-evidence/ trees (incl. this
  audit's), *.patch, round-commits.txt. Audit report + this handoff are
  untracked per convention - the next round's setup absorbs them.

## Next grill direction (audit recommendation)

grill-t21 should be the C-1 disposition round, in one of two shapes:

a. Retroactive-repair documentation round (audit-preferred, precedent-backed):
   `governance_tooling_diff.files` + `carve_out_used` backfill on the t20
   trend row + Disclosed Repair on the zero-R2 claims across ledger/spec/
   report/task-book (t14 retroactive annotation + t17 mislabeled-row
   precedent) + the cheap doc repairs C-2 (dangling host-contracts.txt
   citation), C-3 (canonical anti-quota sentence into the t20 report's
   record - or a Disclosed Repair noting its absence), C-4 (CONTEXT.md
   filename to the hyphenated form). Optionally defer-register the real
   taxonomy gap C-1 exposed: a root-level documentation file no R3 rule
   names.
b. kind:fix round (structural): surface-taxonomy amendment admitting
   README-zh-CN.md (or a README-* glob) to R3 + optional standing ci.yml
   suite-parity exemption + the owed t20-ledger anchors admission
   (build-governance-anchors.js is R2 - needs implementation surface) +
   regularize the t20 row. Pairs naturally with (a): (a) repairs the
   record, (b) closes the classification gap so the next doc-named root
   file is R3 by rule, not residual.

The audit window does not fix (duty separation) - route the shape choice
to the owner. Either way, the same hard-acceptance battery must be re-run
after repair (the audit's verbatim leg set in
.scratch/grill-t20/audit-evidence/capture.cjs is reusable verbatim).

## Suggested skills for the next agent

- `grill-with-docs` for the next round-open ritual; `handoff` for checkpoints;
  `gitbutler` (`but`) for all VCS writes; `code-review` before commits;
  `domain-modeling` if the taxonomy amendment or CONTEXT repair is taken;
  `atomcode-research` only for contested dispositions.
