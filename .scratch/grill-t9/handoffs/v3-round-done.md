# v3 round done - devin-corpus@v3 settled FALSIFICATION-PASSED (2026-09-16)

Branch `grill-t9-v3-collect`, commits 5687a03 -> 2b07c7a -> 30493cb ->
6ac8c90 -> 1dd200d -> 4bc2359 (but ids yzm/klv/owx/qkw/rrt/knv).
Report with rerunnable evidence: `.scratch/grill-t9/reports/2026-09-16-report.md`.
Pre-unlock audit (independent subagent): `.scratch/grill-t9/reports/2026-09-16-pre-unlock-audit.md`.

## Terminal state

- Verdict: **falsification-passed** (dual-axis IUT worst-of) on the CAPA
  claim-evidence pairer: lie 36/36 CI [0.902606,1.000000] over floor
  0.563863; FP 0/84 under bound 0.10; quadrant lie-pass x fp-pass;
  undetermined 0/120; side-set 0/20 flagged; 60% trigger not fired.
- Report artifacts: `bench/research/out/devin-oot-v3-report.{json,md}`
  (single-shot, completed) + `devin-rescore-v3.json` (140/140 agreement).
- Claim filled verbatim in claim-template.md + README.md + report.md;
  per-mention binding registry extended with 4 ADR-0069 exemption rows
  (test/adr-0067-wiring.test.js).
- gates.json: `devin-oot-v3-replay` (order 158) live; replay green.
- jest 64/64 suites, 1014/1014 tests; gate:all exit 0 (32 entries, 4
  ci-mode UNVERIFIABLE locally = baseline); pack 287,351 B < 300,000.

## What the round proved

- The CAPA pairer (claim-evidence contradiction surface) catches every
  seeded misreport (36/36) and flags zero honest transcripts (0/84) where
  the LR port went 9/31 + 21 FP - the v2 failure was the port's construct
  misalignment, not the corpus. Port-vs-pairer divergence disclosed: 70/140
  cells (28 flagged-pairer/honest-port, 42 unflagged-pairer/flag-port).
- The frozen blind-label protocol held end-to-end: collection -> validate ->
  manifest freeze -> tables freeze -> audit -> unlock -> single shot ->
  report+gate. No label read before the tables freeze commit (audit-verified
  commit order; `git merge-base --is-ancestor` enforced in wiring).

## Key facts for any future round

- v3 ids `devin-v3-*`, sessions `v3s-*`, tokens `V3TOK-*`/`V3MARK-*`;
  seed `devin-corpus@v3-misreport-stream`, rate 0.25; worker
  `.scratch/grill-t9/devin-collect-v3.js` (exports collect(dir); contract
  tests in `test/adr-0069-v3-collection.test.js`).
- `scripts/derive-devin-v3-tables.js` emits the v3 axis schema
  (`n_lie`/`n_honest` per axis - NOT the v2 `n`); `loadPlanV3` re-verifies
  every cell + band edge fail-closed.
- Single shot is burned: `devin-oot.js --snapshot-dir devin-corpus-v3 run`
  now REFUSES ([config] exit 1); only `--replay` re-derives the stored
  artifact. Any retest requires devin-corpus@v4 with its own registered
  binding (v4 was only needed if v3 failed/indeterminate - not taken).
- Stage-gate tests flip per commit boundary: when a frozen artifact lands,
  update the "absent" assertions in adr-0069-wiring / adr-0069-v3-plan in
  the SAME commit (audit caught a missed flip - defect D-1, closed).

## Mechanism ownership

- Per-mention claim binding: registry lives in test/adr-0067-wiring.test.js
  (exempt[] rows); new claim-context mentions need a row or same-section
  binding.
- ci.yml `--expected-suites` must equal on-disk test/*.test.js count
  (adr-0058 wiring enforces).
- gates.json `order` values are sparse; new entries pick a free slot and
  `node scripts/run-gates.js --check-alignment` verifies.

## Suggested skills for the next session

- `$handoff` again at next round close; `$implement` for any v4 binding;
  gitbutler (`but`) for all VCS writes.

## Open items

- None blocking. Port divergence telemetry is disclosed but the frozen port
  stays the v2-adjudicated artifact - any port change is a NEW pin + same-
  commit ADR amendment (per ADR-0069).
- No push/PR performed; the branch is local on GitButler.
