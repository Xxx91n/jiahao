# grill-t8 REPAIR report (audit F1/F2 rework) — 2026-09-16

Repair window for .scratch/grill-t8/reports/2026-09-16-audit-report.md
(verdict: PASS-WITH-CONDITIONS). Repair order R1/R2/R3 executed in full.
Commit: uqo on grill-t8-capa. The audit report itself is byte-untouched —
it is the auditor's frozen record; this file is the repair disposition.

## R1 — F1 pairer over-capture (was blocking for v3)

Defect (audit's live reproductions, re-verified before fix):
- closing "I appended it to the file." -> claim 'it' -> flagged
- closing "Done - appended the marker line PRBMARK-5." -> claim 'the' ->
  flagged DESPITE evidence tail PRBMARK-5 matching
- file-contains "Created report-final.txt containing the required token."
  -> claim 'report-final.txt' -> flagged on an honest item

Fix: claim extraction binds only to marker-shaped values —
isClaimShaped(v) = uppercase or dash or digit; quoted tokens, dashed
identifiers carrying an uppercase, or keyword-anchored shaped tokens.
The bare-verb 'appended' anchor removed from content-append; ends-with
candidates must be claim-shaped or fall through to claimToken.
pairItems local `results` renamed `paired` (F8 shadow); claimToken comment
repositioned to describe the new shape rule.

Rerunnable evidence:
- `npx jest test/adr-0069-capa-pairer.test.js` -> 31/31 pass (was 24/24;
  +7 regression tests: the three audit repros + contradiction-preservation
  + quoted-value binding + vague exit-report).
- `node bench/research/capa-probes.js` -> 21/21 MATCH (was 16; +5
  fail-closed-direction rows covering the over-capture surface).
- v2 diagnostic re-run (categorical, never a verdict):
  honest{consistent:109,flagged:0,undetermined:0}
  lie{consistent:0,flagged:31,undetermined:0} — separation unchanged.

Re-pin (per plan's own pin semantics — new artifact -> new pin under
same-commit ADR):
- `sha256sum bench/research/capa-pairer.js` ->
  9ff2d0ada931628b0bffcb8685125cc7d97ddbd599e8a67123d8811f83917445
  (10697 B; prior pin 2383d75f superseded).
- Pin updated in: devin-corpus-v3/plan.json adjudicated_object (+pin
  history note) + contamination_registry row, eval-plan.json
  instrument.pairer, contamination-framework.json 'adjudicated object pin'
  row, test/adr-0069-wiring.test.js assertion.
- ADR-0069 D-E.1 carries the same-commit amendment naming the re-pin.

## R2 — F2 collection unwired (was blocking for v3 collection)

scripts/collect-devin-corpus.js: devin-corpus-v3 added to the closed enum —
same five report-layer registration fields, side_set_check=exit-report,
disjoint_prior=['devin-corpus','devin-corpus-v2'] (live items.jsonl of
each prior), v2-style manifest via spec.style (no snapshot-name checks;
name-equality dispatches removed — partial F8 structural fix),
side-set size_band undersized marking, dynamic usage enum.

Rerunnable evidence:
- `node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v3
  validate` -> exit 0, "0 frozen items, 0 pending drops" + band advisories.
- Temp drop test (removed after): v1 id devin-fc-001 -> refused
  "collides with a prior snapshot id"; stress-side file-contains item ->
  refused "stress-side cohort must be exit-report shaped".
- `node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v2
  validate` -> exit 0, 140 items — v2 behavior unchanged.
- test/adr-0068-wiring.test.js: enum assertion extended to the v3 member
  with registration-field assertions (57/57 pass).

## R3 — non-blocking nits (F3-F9)

- F3 bench/research/README.md v3 line now names the three frozen files.
- F4 contamination-framework 'undetermined collapse', 'port telemetry
  channel', 'adjudicated object pin' -> v2_informed=false, reconciled to
  plan.json's registry semantics (the load-validated authority).
- F5 eval-plan abort_on_defect -> points at serialization.abort_on_defect
  + defect_conditions (real keys).
- F6 renderMdV3 'of n' concat fixed (paren around the sum).
- F7 probe-record row math rewritten (er4+fc4+cr3+ca3+2=16 -> now 21 with
  the fail-closed rows).
- F8 cheap items: pairItems shadow renamed, comment repositioned, factRe
  '.' escaped, renderMdV3 gains per-item + settlement sections (v2-parity).
  Snapshot-name dispatch refactor partially done (collector is now
  spec-driven; devin-oot v2/v3 block duplication left as-is — cosmetic,
  out of repair scope).
- F9 eval-plan adapter wording now matches the mechanism (item passed;
  pairItem reads whitelisted fields only).
- F10 no action (well-disclaimed edge note).

## Post-repair verification (re-run list from audit §7 — all green)

| command | result |
|---|---|
| `npx jest` (all) | 63/63 suites, 994/994 tests, exit 0 |
| `npm run gate:all` | exit 0, 31 entries, 4 ci-mode unverifiable (baseline), 2 advisory |
| `npm run pack:smoke` (inside gate:all) | passed |
| `node bench/research/capa-probes.js` | 21/21 MATCH incl. new fail-closed rows |
| `npx jest test/adr-0069-capa-pairer.test.js` | 31/31 |
| `npx jest test/adr-0069-v3-plan.test.js` | 11/11 |
| pairer sha256 == new pin | 9ff2d0ad…7445, re-derived identical at all five sites |
| `node bench/research/devin-oot.js --snapshot-dir devin-corpus-v3 run` | fails closed: "decision-tables.json missing" (pin check passes first — new sha matched) |
| `node scripts/instrument.js --check` | seq 16 record_only_change registered |

## Boundaries re-asserted

No v3 data exists; no v3 collection or adjudication ran; the
adjudicated/devin-corpus-v2 anchor is unmoved; src/port/ byte-frozen;
probes remain categorical; nothing cites v2/v3 by conformity. The v3
plan is ready-to-run against the REPAIRED artifact — the audit's two
blocking conditions are cleared for the next round to re-verify.
