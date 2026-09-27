# grill-t17 round-complete handoff — 2026-09-18

For the next agent. Read the committed artifacts; this file is the map,
not the content.

## What landed (branch grill-t17-docs)

- `mox` — R1 documentation bundle: ADR-0077 D-E appendix (unconditional
  proseScan + evidence-file convention + defer-0063), CONTEXT prior
  snapshot v2 + Bounded-Delegation token sharpening, ERRATA E-7 (seq-27
  record: substantively compliant + literal defect, expiry=任务耗竭),
  defer-0063 smell ticket, t16 doc-nits, seed inventory 57, ledger T-1,
  anchors regen.
- `puu` — R2 machinery: `proseScan` exported from
  `scripts/build-round-facts.js`; backtick-strip deleted; `--check
  --report` enforces at author time (pre-collect, pre-splice); wiring
  pins (export, quoted-stale must-fail fixture, t17 real-report pin,
  registration pins); adr-0076 header + adr-0069 test-name nits.
- `mzs` — gen-docs class-killer: invariant pin over every committed
  `.scratch/grill-t*/gen-docs.cjs`; t14+t16 retro-fix;
  `.scratch/gen-docs.template.cjs` authoring layer.
- `zmn` / `zks` / `lun` — gated smells as atomic commits: adr-0058
  run() tmpdir cleanup; yml/job dedup; loadTaxonomy hoist.
- `ysz` — closeout: verbatim battery evidence, real facts + report
  splice, README counts, trend row, regen artifacts, ledger T-2/T-3.

## Verified state (see .scratch/grill-t17/evidence/*.txt)

- run-test-gate: 73 suites, 1225 tests, 0 skipped, exit 0.
- gate:all: 35 entries, exit 0; 4 UNVERIFIABLE host-absent channels
  (ci-wiring, bench-gate, probes, mr-probes).
- check-ci-jobs: exit 1 (consuming row defer0004 unmet — keyed exit);
  missing-file exits 2 (verifier-broken).
- check-deferred: 57 entries (48 live, 9 closed/actioned).
- anchors: 16 in sync. rewrite-map: 1425 citations in sync.
- build-round-facts --check --report (grill-t17): facts + region +
  prose in sync under the unconditional scan.
- instrument: authoritative, conditional certification expires
  2026-12-11.
- pack:smoke: 335900 < 340000.
- quoted-stale fixture: `1225` in backticks → FAIL exit 1 (canon
  number in prose, quoted or bare).
- liveness: tarball extract → install.js --help + init -y --dry-run
  exit 0; jiahao-mcp initialize handshake returns serverInfo.

## Conventions now in force

- Canon numbers live ONLY in the sentinel region and evidence files —
  never in report prose, quoted or bare. The scan is word-boundary
  based: identifiers containing a canon value (e.g. `seq-27` while
  instrument_entries is 27) WILL trip it. Next round's report must
  spell around such identifiers or cite evidence paths.
- Evidence files: `.scratch/grill-tNN/evidence/` committed artifacts,
  per-round, never in the anchors chain (same churn reasoning as
  round-facts.json). The report cites paths, not numbers.
- gen-docs: new rounds copy `.scratch/gen-docs.template.cjs` and fill
  `{{ROUND_SLUG}}`; ROOT must stay `__dirname`-derived (pin hard-fails
  otherwise). No whole-script shared module.
- Smell admission: the three-part gate criteria (minutes-scale ~≤30
  lines × behavior-preserving × no-convention-needed). Convention-
  needing smells get a deferred ticket, not a fix.
- Signoff-class authorizations carry literal `scope:`+`expiry:` tokens
  (ERRATA E-7); the seq-27 record is classified substantively
  compliant + literal defect; frozen chain untouched.
- Re-Execution Prior is at snapshot v2 (n=19); audit findings merge at
  closeout; first self-disclosure registers as a directional event.
- report_commit stays null; battery_as_of_commit is stripped in
  --check comparisons (drift between them is expected).

## Regen order (when artifacts drift)

1. `node scripts/build-rewrite-map.js`
2. `node scripts/check-governance-inventory.js` / anchors regen if
   governance files changed: `node scripts/build-governance-anchors.js`
3. `node scripts/check-g6-publish.js` if packaged surface changed
   (writes the replay artifact + new tarball byte record)
4. `node scripts/build-round-facts.js --round <slug>` (collect needs a
   green suite)
5. `node scripts/build-round-facts.js --round <slug> --report <report>`
   (splice)

## Bootstrap pattern (learned this round)

A real-report pin is necessarily red until the canon artifact exists.
Bootstrap: write a schema-complete provisional `round-facts.json`,
splice its region into the report, pin goes green, then regenerate for
real at close (collect requires a green suite — circular otherwise).

## Residuals / next-round obligations

- **defer-0063 quota**: the NEXT fix bundle must take one smell ticket
  first (anti-rot). The deferral is missing-convention class: write the
  guard/exit-style convention (ADR clause or CONTEXT term), then the
  fix becomes a gated candidate.
- Instrument conditional certification expires 2026-12-11.
- Sunset counter 1/6 + defer-0060 quarterly: next observation
  2026-12-15.
- The four audit patches (tq/nl/xu/my —
  `.scratch/grill-t1*/audit-evidence/*.patch`) stay untracked forever;
  do not commit them.
- Stack landing (grill-t15-docs, grill-t16-docs unlanded) is
  owner-domain; informational only.
- Zero owner asks this round; T-3 discharged.
