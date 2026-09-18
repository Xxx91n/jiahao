# grill-t16 handoff — 2026-09-18 (fix + mechanism round COMPLETE)

Audience: the next agent (grill-t17 or later). Status: round complete and
green; zero owner asks; awareness items listed at the end.

## What landed (branch `grill-t16-docs`, newest-first)

- `pnq` — final-battery regen (g6 replay 333992, facts/report re-render,
  anchors digest, trend marker reason, rewrite-map 1412).
- `f86494d` (was `rqt`, amended) — closing-step regen + `battery_as_of_commit`
  durable-pin fix in `scripts/build-round-facts.js`.
- `vkz` — R2 machinery: `mechanism_output_diff` checker support,
  `build-round-facts.js`, anchors t16 admission (15→16), F-E nits,
  render-pin + probe wiring, README 1216, T-2 ledger section, report.
- `wsn` — R2 verifier fix: `check-ci-jobs.js` exit keyed to
  `defer0004.satisfied` (consuming row), crash→exit 2, header convention,
  `any_matrix` inline fix; `adr-0058-wiring` three-direction + crash +
  diagnostic + inline-matrix fixtures.
- `spr` — R1 boundary: ADR-0077 (D-A convention, D-B enumeration,
  D-C facts canon, D-E narrowed addendum), ADR-0076 amended, taxonomy
  `mechanism_outputs` closed enumeration, t15 row additive annotation,
  defer-0004 ADR-0058 D-C cite, defer-0062 tally, CONTEXT terms, README 77,
  anchors 15, rewrite-map 1410.
- `mkz` — t16 setup (task book, spec, ledger D-001..D-005, CONTEXT terms).

## Verified state (round-final, reproducible)

- `node scripts/run-test-gate.js --expected-suites 73` →
  `[test] OK: 73 suites, 1216 tests, 0 skipped`, exit 0.
- `npm run gate:all` → exit 0, 35 entries, 4 UNVERIFIABLE
  (ci-wiring/bench-gate/probes/mr-probes need ci-mode; registered, honest).
- `node scripts/check-ci-jobs.js` → exit 1, `defer0004=unmet
  defer0026=SATISFIED` (diagnostic). Missing file → exit 2 stderr.
- `node scripts/check-governance-inventory.js` → OK 35 entries (advisory:
  doc-round ADR streak 10 ≥ K=2, never blocks).
- `node scripts/check-deferred.js` → OK 56 entries (47 live, 9 closed).
- `node scripts/build-governance-anchors.js --check` → OK 16 artifacts.
- `node scripts/build-rewrite-map.js --check` → OK 1412 citations.
- `node scripts/build-round-facts.js --round grill-t16 --check --report
  .scratch/grill-t16/reports/2026-09-18-report.md` → facts + region in sync.
- `npm run pack-smoke` → `jiahao-0.0.1.tgz (333992 bytes, 113 files)` <
  340000 budget.
- Facts canon: `.scratch/grill-t16/round-facts.json` (suites 73, passed
  1216, pack 333992, instrument 27, map 1412, registry 56, anchors 16,
  asof f86494d→pin, report_commit null, not_run 4 ci-mode gates).

## Conventions now in force (ADR-0077)

- **Consuming-row exit**: a `verified_by` script's exit reflects only the
  row(s) currently consuming it; multi-row reporting is diagnostic, never
  exit-driving. exit>1 = verifier broken (crash must not read as
  unsatisfied). Discharge re-point: when the consuming row discharges, the
  key re-points/retires in the same commit as that registry edit.
- **`mechanism_outputs`** (taxonomy): closed R2 enumeration {file, generator,
  replay_verified} = `src/instrument-state.json` + `bench/research/out/
  g6-publish-replay.json`. Trend rows may carry `mechanism_output_diff`
  {files, reason} for faithful regenerations — membership + R2-classification
  validated, bare marker hard-fails, never feeds burn-rate.
- **Facts canon**: `scripts/build-round-facts.js --round <slug>` regenerates
  `.scratch/<slug>/round-facts.json`; `--report <path>` splices the
  sentinel region from the on-disk artifact (never re-collects — a stale
  region is fixable without re-running jest); `--check` tolerates
  `battery_as_of_commit` drift (run-record, not freshness).
- **Regen order at round close**: rewrite-map → facts → report splice →
  anchors. The map classifies sha-shaped strings (e.g.
  `battery_as_of_commit`) as local-only citations — regenerate the map
  after the fact files settle, not before.

## Residual / disclosures

- `evalSuggestions` discards verifier stdout: a defer0026 leg regression
  surfaces only via wiring fixtures at runtime (documented in the report).
- The `mechanism_outputs` enumeration covers exactly the R2-surface
  members; docs-surface generated siblings (anchors, rewrite-map, taxonomy
  snapshots, README index) are named in ADR-0077 but not enumerated — R3
  files never enter files[] jurisdiction (disclosed interpretation).
- Facts artifact deliberately not in the anchors chain (per-round
  regeneration would churn the digest chain — ADR-0077 D-C).
- The three audit patches (`tq`/`nl`/`xu`) remain untracked forever —
  never commit them.
- `but commit` always got explicit change IDs copied from `but status`.

## T-3 awareness (zero asks, next agent should not act on these)

- Stack landing: `grill-t15-docs` (9 commits) + `grill-t16-docs` (mkz, spr,
  wsn, vkz, f86494d, pnq) unlanded — owner domain.
- defer-0060: sole live 403 tracker; owner actions (secret regen +
  required-check deploy) are its unfreeze_if, review_at 2026-12-15.
- Sunset counter stays 1/6; next observation 2026-12-15; the durable host
  is `docs/governance/sunset-counter.json` (anchors chain).
- Consent-sweep standing rows (defer-0053, defer-0057, defer-0058 cadence,
  O-E backlog): T-1/T-2 ledger lines record this round's dispositions.
