# grill-t31 audit-repair report — 2026-09-28

scope: fix-window response to `2026-09-28-audit-report.md` (verdict FAIL).
Base for repair: `f4ea1a38`. Repair waves: `87192ded` (impl) +
`b0504f28` (docs) -> re-issued seal declaring `b0504f28` ->
this claim wave. No effectiveness verdict issued — owner-side by design.

## disposition of the 7 mandatory findings

| # | audit finding | disposition | evidence |
|---|---|---|---|
| 1 | VERIFY_RE `\s` bytes eaten (`npms+` etc.) — verify_run dead for npm/go/cargo/mvn/gradle/make/node/pnpm | FIXED: regex rewritten with real `\s` classes, coverage extended (pnpm/yarn/vitest added) | `bench/codebuddy-trial/tools/lib/capture.js` VERIFY_RE; probe: 18 command strings all MATCH, `git status`/`ls`/`npm install` NOMATCH; battery `verify_run marks real verify commands: <cmd>` x8 + negative + L3 suppression/firing pair |
| 2 | committed-invariant red: `build-rewrite-map.js --check` exit 1 on committed bytes (orphan sha cites `d7ddd772`/`6e2334bf`, SEAL comment `49700fac`) | FIXED: map regenerated over settled tree (3485 cites, `--check` + `--published-only` green); orphan cites registered in `docs/governance/ERRATA.md` E-20 (prose cites — not pin_patterns lines, no exemption rows applicable); D-010 recorded in the decision ledger | `docs/rewrite-map.json`, `docs/governance/ERRATA.md` E-20 |
| 3 | spans_boundary exclusion dead (repItems scan could never hit; `spans` set unconsumed) | FIXED: `ctx.spansSet` = union over all sealed manifests' `spans_boundary_sessions`; classifyDomain emits bucket `excluded` (recorded, non-poisoning); JL-4 stratum verdicts compute over counted items only; `spanning_sessions` lists excluded ids | `predicates.js` classifyDomain/evalJL4; fixture `spans-boundary session excluded from within-phase comparisons` asserts exclusion + `indeterminate:no-comparable-control` |
| 4 | binding mismatch/multi-prompt degraded to deviation, not D-004(vi) orphan hard error | FIXED: evaluate refuses exit 1 with classes `binding-unbound`/`binding-multi-prompt`/`binding-<violation>` for any member session without exactly one task binding; owner-paste degraded guard implemented as unique path-binding (transcript-absent session + single unclaimed paste task) with `binding-owner-paste-path` anomaly; claim-domain orphans (`claim-orphan` unplanned task, `claim-duplicated` across manifests) refuse likewise | `evaluate.js` orphan gate extension; red fixtures `binding-guard: multi-user-prompt … refuses`, `binding-guard: unbound … refuses`, `claim for an unplanned task refuses`, `the same task claimed under two manifests refuses` |
| 5 | coverage matrix self-referential (grepped own source for tokens the literal contained) | FIXED: matrix now extracts DECLARED test names via `test('...')`-anchored pattern; REQUIRED_TESTS literals are plain strings that can never satisfy the anchored extraction | `test/codebuddy-trial.test.js` coverage-matrix block |
| 6 | RUNBOOK gaps: reachability/session_id owner steps, pristine-copy path + per-task checklist, verify-needles placement vs comment | FIXED: §3 four-probe table incl. owner-side adjudication rows + per-Stop reachability recheck; §4 per-task checklist with `<trial-workspace>/<run_id>/<task_id>/` + P2 replay instance rows + task-start verify-needles; tool gained `--workbench <dir>` for pristine copies (requires --volume); comment/RUNBOOK reconciled | `bench/codebuddy-trial/RUNBOOK.md`, `verify-needles.js` |
| 7 | endpoint sentinels absent (all-miss / all-indeterminate runs) | FIXED: `all-miss domain emits zero hits` + `all-indeterminate domain emits zero hits` assert zero `hit` verdicts on engineered degenerate domains | sentinel describe block |

## advisory items disposition

- deviations.js:109 `src.source_run_id !== undefined` dead leg → FIXED (`(src.run_id||null) !== (d.source_run_id||null)`)
- red five-tuple store-writes/recoverable → ADDED: `evaluate performs zero writes` (byte snapshot) + refusal determinism re-run in multi-prompt fixture
- cursor-gap + duplicated-claim red fixtures → ADDED (`deviation cursor gap fails selfcheck`, `claim-duplicated refuses`)
- paste-channel degraded guard → IMPLEMENTED (unique path-binding elimination, anomaly-recorded)
- report prose nits → registered in ERRATA.md E-20 (report text untouched — claim artifact convention)
- hygiene: storesByRun dead code removed; EVAL_MAP single read; `res.length===2` → `expectedFiles.length`; common.js shebang removed; binding vocabulary unified across collect/end; `|\x00|` dedup key factored into `common.captureKey`
- additional spec-axis gap closed: `ts-membership-conflict` per-event anomaly at evaluate

## re-run list (same battery as audit)

| check | result |
|---|---|
| `npx jest test/codebuddy-trial.test.js` | 60/60 (was 40) |
| `npx jest --silent` | 1537/1537 across 87/87 suites (one Windows inode flake in sentinel-ownership, passes on re-run) |
| `run-test-gate --expected-suites 87` | green |
| `check-frozen` / `check-isomorphism` / `verify-needles` / `selfcheck` | frozen-ok(5 pins) / isomorphic(8 groups,3 replays) / all-needles-present / 4 legs ok |
| `build-rewrite-map.js --check` + `--published-only` | OK 3485 / OK |
| `build-governance-anchors.js --check` | digests in sync (18 artifacts) |
| `node scripts/run-gates.js` | gate:all exit 0 — 42 legs (4 ci-mode UNVERIFIABLE standing) |
| `node scripts/check-map-freshness.js` (leg 224) | 5 claim-surface commits verified tree-internally |
| evaluateRound(grill-t31) | declared=expected `b0504f28`; amended:false; inFlightClean:true; freezeViolations/sealBad empty; capturesAtSealOk:true; 1 claim commit, 0 bad, 0 unregistered |

## seal disposition

The first seal (`seal: f4ea1a38` @ `bf900a3b`) was superseded: audit FAIL
opened the repair window; the unpublished seal+claim tail was uncommitted and
reissued. New seal declares `b0504f28` (last substantive = repair-docs wave).
Superseded objects registered in ERRATA E-20; evaluateRound final state is
re-run in the claim-wave verification block of the handoff.
