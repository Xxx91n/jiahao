# grill-t33 T-0 baseline recon — 2026-09-29

Scope guard (D-001): nothing outside the ledger/spec enters this round.
This note is the registered baseline + the T-1 derived-queue survey
(D-002(i)(v)). Report deviations; never repair by hand.

## Public-CI status (D-003(iv) standing item, first live firing)

- `gh api repos/Xxx91n/jiahao/actions/runs?per_page=5` → the five newest
  origin/main runs are all `conclusion=failure`, name `ci`:

  | run id | head sha | created | conclusion |
  |---|---|---|---|
  | 36530594835 | 754e53c2 | 2026-09-29T06:20:49Z | failure |
  | 36530454003 | 68fb225b | 2026-09-29T06:19:08Z | failure |
  | 36419894001 | b06f4a97 | 2026-09-28T12:08:18Z | failure |
  | 36419692191 | 67785a34 | 2026-09-28T12:06:23Z | failure |
  | 36419582924 | a92efdf5 | 2026-09-28T12:05:21Z | failure |

- Tip run 36530594835 job breakdown (`runs/36530594835/jobs`):
  `test` = **failure** (failing step name verbatim:
  `Run node scripts/run-test-gate.js --expected-suites 89`),
  `gate-all` = success, `summary` = failure (step `success-only
  aggregation` — consequence of the failed test job).
- Reading: red as expected (README declared-count drift, known class).
  The single failing leg is the run-test-gate README-count assertion —
  same failing step on the streak per the round spec (E-25 registers the
  terminal statement once; this note carries the tip-run detail).

## Declaration sites vs actuals

- `README.md:337` — `npm test  # 1511 tests across 87 suites (full
  corpus tier; the public tier skips 7 corpus-bound tests with reasons,
  ADR-0056)`
- `README.md:356` — `test/` — `87 test suites, 1511 tests`
- `README-zh-CN.md:280` — same `npm test` comment (EN mirror)
- `README-zh-CN.md:295` — `test/` — `87 test suites, 1511 tests`
- `.github/workflows/ci.yml:107` — `node scripts/run-test-gate.js
  --expected-suites 89` (ADR-0057 D-C expectation on the call line)
- Actual at baseline: `npx jest --listTests` = **89** suite files
  (test/ carries 89 `*.test.js` + `fixtures/` + `helpers/`); the
  spec-recorded battery figure at the drift point was 1571 tests / 89
  suites. Wave-final counts are re-measured after all suite-affecting
  changes and written as a one-time measured record (D-004(iii)①).
- Local gate-command parity run (this round's own audit self-consistency,
  D-004(i)): `node scripts/run-test-gate.js --expected-suites 89` executed
  at baseline; expected result = FAIL on the README declaration legs +
  expected-suite mismatch — the local environment reproduces the CI red
  step. Log: `audit-evidence/t0-baseline-run-test-gate.log` (never
  committed, nc-001).

## T-1 declaration-surface survey (D-002(i)(v))

Method: all 89 `docs/adr/*.md` declaration surfaces scanned for the three
registered awaiting forms (old-form `ID-level-only, awaiting
entity-level` label; E-13 `Errata pointer (2026-09-26, ERRATA E-13,
grill-t28 D-002)` annotation; new-form `awaiting entity-level
countersign` status). Closed category set:
{awaiting-old-form, awaiting-e13-pointer, awaiting-new-form,
countersigned-or-final, registered-exempt}; undeclared = fail.

### Wording variants observed (prepass, D-002(v))

- Old form (10): status lines of 0064..0070, 0072, 0073, 0074 carry
  `user-ratified <date> via grill-tN decision ledger ...; second_reviewer
  countersign deferred to the next audit round ...; grill-t25 label: the
  deferred second_reviewer countersign is ID-level-only, awaiting
  entity-level - return condition: ...; return-by: 2026-12-15`.
- E-13 pointer (9): 0076, 0077, 0078, 0079, 0080, 0081, 0083, 0084, 0085
  each carry `- Status: Accepted` (bare) plus exactly one `Errata
  pointer (2026-09-26, ERRATA E-13, grill-t28 D-002): second_reviewer
  countersign obligation presumed subsisting ... nine bare-form ADRs
  (0076..0081, 0083..0085) merge into the countersign queue ...
  defer-0074` line. 0084 also carries the byte-stable historical
  "Countersign queue (10 entries ...)" bullet + "queue now runs 19 rows"
  reconciliation note — display text, not authority (D-002(iii)).
- New form (4): 0086, 0087, 0088, 0089 status lines carry
  `- Status: Accepted — ID-level-only, awaiting entity-level countersign;
  return condition: the 2026-12-15 tide; return-by: 2026-12-15`.
- Registered-exempt (1): 0082 carries
  `Status: Accepted (user-ratified 2026-09-22 ...; second_reviewer
  countersign slot deferred to the next audit round - registered as
  defer-0068, review rides the 2026-12-15 tide)` — its countersign slot
  lives in the deferred registry, so the ADR is not itself queue
  membership.
- Countersigned-or-final (65): 0062, 0063 carry
  `second_reviewer countersigned 2026-09-13`; 0071 (discharged
  2026-09-17 grill-t14), 0075 (landed 2026-09-18) carry discharge
  records; the remaining 61 ADRs (0001..0061) carry plain
  `Status: Accepted` or no status block — final under their era's
  convention.
- Undeclared: **none** — every file classifies.

### Derived queue set (member-level enumeration)

| form | members | n |
|---|---|---|
| awaiting-old-form | 0064, 0065, 0066, 0067, 0068, 0069, 0070, 0072, 0073, 0074 | 10 |
| awaiting-e13-pointer | 0076, 0077, 0078, 0079, 0080, 0081, 0083, 0084, 0085 | 9 |
| awaiting-new-form | 0086, 0087, 0088, 0089 | 4 |
| registered-exempt | 0082 (defer-0068 slot) | 1 |
| countersigned-or-final | all remaining 65 ADRs | 65 |

Derived queue = union of the three awaiting forms = **23 members**
— matches the spec-expected 23 (10+9+4). No deviation; nothing repaired
by hand. Mechanized member-level reconciliation lives in
`test/countersign-queue.test.js` (T-2); NO count-equality assertions
(cancellation-blindness, D-002(ii)).
