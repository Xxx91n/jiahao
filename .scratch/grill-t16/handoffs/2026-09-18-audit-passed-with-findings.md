# grill-t16 audit handoff — 2026-09-18 (audit PASS WITH FINDINGS)

Audience: the next agent (grill-t17 or a small fix round). The t16
fix + mechanism round was independently re-verified: every claim in
the round report reproduces. Audit report (full claim → evidence →
conclusion table, hard-acceptance re-run, two-axis review, findings
register): D:\Aworker\jiahao\.scratch\grill-t16\reports\2026-09-18-audit.md

## Verified state (auditor-reproduced this session)

- node scripts/run-test-gate.js --expected-suites 73 → 73/1216/0 skipped
- npm run gate:all → exit 0 (35 entries, 4 UNVERIFIABLE: ci-wiring,
  bench-gate, probes, mr-probes — ci-mode absent on this host)
- node scripts/check-ci-jobs.js → exit 1 consuming-row keyed; missing
  file → exit 2 stderr verifier-broken
- check-deferred → 56 entries (47 live, 9 closed); governance-inventory
  → 35 entries + advisory; anchors → 16 in sync; rewrite-map → 1414;
  round-facts --check --report → in sync; instrument --check →
  authoritative (conditional cert to 2026-12-11)
- npm run pack:smoke → jiahao-0.0.1.tgz 333992B / 113 files < 340000
- Facts canon: .scratch/grill-t16/round-facts.json is the number home;
  do not copy numbers into prose — regenerate via
  node scripts/build-round-facts.js --round <slug> [--report <path>]

## Forward agenda (audit findings G-1..G-4 — next round's input)

- G-1: .scratch/grill-t16/gen-docs.cjs:5 ROOT='D:/Aworker/jiahao' →
  path.join(__dirname,'..','..') (t15 sibling already carries the fix;
  same-class regression).
- G-2: render pin strips backtick spans before the bare-number scan →
  quoted stale numbers escape. Decide: narrow the exemption to
  identifier-shaped spans, or scan values unconditionally; add a
  quoted-stale-number fixture that must fail --check.
- G-3 nits: adr-0076-wiring L1 stale header; adr-0069-wiring:305 test
  name "(rebuilt, 69 records)"; handoff 1412×2 + "D-E" mislabel vs
  ADR-0077 D-A..D-D; spec §3 member list still overclaims the shipped
  enumeration; report F-C wording (same-commit touch was the carve-out
  gloss, not the convention term).
- G-4 smells: duplicated marker-validation in check-governance-inventory
  (+ loadTaxonomy inside the loop); duplicated yml/job helpers in
  adr-0058-wiring describes; build-round-facts export/--report guard/
  exit-style; mkdtempSync leak in the new run() helper.

## Candidate next grill direction

Small fix round (same shape as t16): dispose G-1..G-4 as one F-bundle,
re-run the identical acceptance battery verbatim (audit report §6),
then the standing cadence (defer-0060 quarterly 2026-12-15, sunset 1/6
same date, SLA rows, O-E backlog) gets its next consent-sweep.
Alternative: grill the render-pin exemption policy itself — whether
"bare number" should mean "unquoted" or "ungrounded" — before fixing
G-2, since the answer decides the fixture.

## Awareness (zero asks, owner-domain)

- grill-t15-docs (9 commits) + grill-t16-docs (9 commits:
  mkz/spr/wsn/vkz/rqt/pnq/lzt/lkr/wzx) unlanded; remote main 21b1442.
- defer-0060 = sole live 403 tracker; owner actions are its
  unfreeze_if; review_at 2026-12-15.
- .scratch/grill-t16/audit-evidence/round-diff.patch — the t16 audit
  patch; never commit (same rule as tq/nl/xu). This handoff and the
  audit report are uncommitted pending the next setup commit.

## Suggested skills

- $implement — G-bundle fix round
- $tdd — quoted-stale-number fixture + any touched pins
- $code-review — before each commit
- $handoff — next checkpoint
- gitbutler (but) — ALL VCS writes; explicit change IDs always
- atomcode-research — only for contested dispositions
