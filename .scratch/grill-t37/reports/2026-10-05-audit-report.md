# grill-t37 Implementation Round — Second-Party Audit Report — 2026-10-05

**Verdict: FAIL — rework required.** The round's core mechanism is real and demonstrably works (it caught the round's own drift), but the landed tree carries **3 undisclosed test-surface reds introduced by this commit's own landing**, the report's headline status claim is stale relative to the landed tree, and there are latent code defects plus spec-letter deviations needing fix-lane work or owner adjudication. Nothing in this report ratifies; adjudication stays owner-side.

Subject: lane `grill-t37-impl`, commit `b57f043be6567f0720ada5796f7a34524d830e74` (2026-10-05 12:36:01 +0800), parent `8da36b02`. 30 files, +5627/−43. Report under audit: `D:\Aworker\jiahao\.scratch\grill-t37\reports\2026-10-05-report.md`; handoff: `D:\Aworker\jiahao\.scratch\grill-t37\handoffs\2026-10-05-handoff.md`; taskbook: `D:\Aworker\jiahao\.scratch\grill-t37\handoffs\next-round.md`; authority: `D:\Aworker\jiahao\.scratch\grill-t37\decision-ledger.md` + `D:\Aworker\jiahao\.scratch\grill-t37\spec-t37-status-inventory.md`.

Audit conditions: this host has no `ci-mode` capability (4 legs honestly UNVERIFIABLE); the worktree was dirty throughout verification (uncommitted other-lane files: `docs/adr/0094-...md`, `test/post-land-sentinel.test.js`, and uncommitted `.scratch` artifacts — not touched by this audit window; none of the reds below are explained by the dirty tree, confirmed by the checkers' committed-diff semantics).

## 1. Hard acceptance — re-run by this audit, not trusted from the report

| Acceptance | Command | Result |
|---|---|---|
| 编译 | `node --check` × 18 touched scripts | all clean; full jest suite additionally compiles every file |
| 打包 | `npm pack` | `jiahao-0.0.1.tgz` produced, **529,789 B** (183 files) — over the 470,000 cap as disclosed; figure differs from the report's 529,581 (see §3 A-11) |
| 启动测活 (in-tree) | `node scripts/install.js init --profile verifier --dry-run` | exit 0, plan printed |
| 启动测活 (tarball) | extract `jiahao-0.0.1.tgz` → `node package/scripts/install.js init --profile verifier --dry-run` | exit 0 inside the extracted package; the `pack-smoke` leg also did this internally and printed `smoke OK ... extracted and its CLI dry-run plan matched` |
| test 闭环 | `node scripts/run-test-gate.js` | exit 1 — **100 suites, 1731 pass / 5 fail** (report claims 1734/2 — see F-1) |
| gate battery | `npm run gate:all` | exit 1 — **51 entries: 44 pass / 3 fail / 4 unverifiable** — reproduces the report's claim exactly |

## 2. Claim → evidence → conclusion

| # | Report claim | Re-derived evidence | Conclusion |
|---|---|---|---|
| C-1 | `run-test-gate.js` → 100 suites, 1734 pass / 2 fail (both disclosed) | My run: 1731 pass / **5 fail**; fresh artifact `test-artifacts/status-inventory/status-inventory.test.da04920c…T04-57-20Z.json` has 5 fail rows (adr-0038, adr-0081, adr-0083, adr-0084 coverage, orphan-cites) | **STALE — landing-induced.** The 3 coverage fails are caused by this commit: `check-governance-inventory --coverage-base` diffs *committed* files, and the impl commit's 15 R2 files are undeclared in the latest `trend-inventory.json` row (still `grill-t36`). At the report's 04:13Z run HEAD lacked the commit (run tree `c13a8a53`), so the claim was true at capture time and became false the moment the commit landed at 04:36Z. Undisclosed anywhere. |
| C-2 | `gate:all` → 51 entries: 44 pass / 3 fail / 4 unverifiable | Re-run: identical (50 registry legs + `D-4 - tracked-surface` pseudo-leg = 51) | **REPRODUCED** |
| C-3 | `status-inventory.test.js` 41/41 green | `jest-cases.json`: 41 cases for that file, all `passed` | **REPRODUCED** |
| C-4 | `check-status-inventory.js` → OK (bootstrap warnings only) | Re-run now exits **1**: member-level drift on surface `test` — re-derived-only rows = the 3 coverage fails | Claim was true pre-commit; on the landed tree the leg correctly fails — the mechanism works, the report is stale |
| C-5 | `check-comment-refs.js` → 215 files, 149 spans, 0 red / 9 yellow | Re-run: 215 files, 6609 regions (report said 6603; +6 consistent with the uncommitted test-file comment churn), 149 spans, 0 red, 9 yellow | **REPRODUCED** (region count is dirty-tree-sensitive) |
| C-6 | `check-expected-red.js` → OK, 0 rows, 3-code closed set | Identical | **REPRODUCED** |
| C-7 | `check-deferred.js` → OK, 79 entries | Identical (65 live / 14 closed) | **REPRODUCED** |
| C-8 | `build-test-manifest.js --check` → OK, 100 suites | Identical; `docs/test-manifest.json` enumeration.suites=100, junit.tests=1736 | **REPRODUCED** |
| C-9 | `check-g6-publish.js --write-log` → replay green, log re-anchored | Battery's compare-form `g6-publish` leg PASSED; committed log `tarball.size=529789` matches today's pack byte-for-byte | **REPRODUCED** (transitively — compare green ⇒ regeneration was post-final-edit) |
| C-10 | `install.js … --dry-run` → exit 0, in-tree and in extracted tarball | Both exit 0 | **REPRODUCED** |
| C-11 | `git diff --check` clean | clean | **REPRODUCED** |
| C-12 | leg-timing: 46 legs, p50=142ms p95=33972ms max=51699ms | Verbatim in the **earliest** of 3 artifacts (`…T04-05-04Z`, `summary` field). The run the report anchors to (`…T04-22-40Z`) measured p50=117 / p95=29495 / max=51693 | **TRUE but mis-anchored** — quoted run ≠ cited run_id; measurement varies across runs (a fact the tier-default fill must handle) |
| C-13 | tarball 529,581 B vs cap 470,000 | `npm pack` today: 529,789 B; the committed replay log itself says 529,789 | **Directionally true, figure stale** — 208 B drift between report figure and landed artifact (both >470k and <530k, conclusion unchanged) |
| C-14 | `claim-surface-roles.json` "+2 rows, fail-closed backfill" | Commit added **4** path rows (audit-handoff 10-03, handoff 10-05, next-round, report 10-05); handoff's "+4" is the accurate one | **Under-counted in report** |
| C-15 | TIER_TIMEOUT_S deliberately empty | `scripts/run-gates.js:71` `const TIER_TIMEOUT_S = {}` | **REPRODUCED** (and disclosed in the handoff — but see F-9, it is a letter deviation from T-0 stage 3) |
| C-16 | C-1 attribution: 4× registered-absence, reason_code_breakdown emitted | Completed gates artifact `closeout.reason_code_breakdown = {"registered-absence":4}`; rows carry reason_code only when non-green/non-fail | **REPRODUCED** |
| C-17 | Sentinel blocks are mechanism-emitted, digest-consistent | 3 blocks in the report recompute `rows_digest` clean via `sentinelSelfConsistent` | **REPRODUCED** (but see F-7: there are 3 blocks for 2 logical snapshots) |
| C-18 | ANCHORING footer discipline | footer file set == `git show --name-only` set, 30/30 equal | **REPRODUCED** |
| C-19 | M1b junit latent defect (assertionResults→testResults) | parent `8da36b02` read `s.assertionResults`; landed code reads `s.testResults` with contract tests; today's junit.xml has **1736 `<testcase>` + 5 `<failure>`** | **REPRODUCED — real defect found and fixed** |
| C-20 | instrument-failure rows / partial-junit legislation | `run-test-gate.js` emits `jest-cases-incomplete` marked rows with `reason_code: instrument-failure` | **REPRODUCED in code** (not exercised — no partial junit this run) |
| C-21 | T-0a check-post-land first run: pre_land 4/4 green, post_land doc-hygiene red | Not re-run to completion on this box (>120 s: fetches origin/main, materializes a throwaway worktree); the standing `post-land-sentinel` leg red it explains IS reproduced live in gate:all | **PARTIALLY VERIFIED** |

## 3. Findings

### Blocking / rework-required

- **F-1 — Three undisclosed landing-induced reds (the headline).** `test/adr-0081-wiring.test.js`, `test/adr-0083-wiring.test.js`, `test/adr-0084-wiring.test.js` coverage legs all fail on the landed tree: every R2 file in the committed diff `<base>..HEAD` must be declared in the latest `docs/governance/trend-inventory.json` row; the latest row is `grill-t36`, and `b57f043b`'s 15 R2 files (`scripts/build-adapters.js`, `build-contract-vocab.js`, `build-status-sentinel.js`, `check-comment-refs.js`, `check-deferred.js`, `check-expected-red.js`, `check-falsify.js`, `check-status-inventory.js`, `jest-junit-lite.js`, `run-test-gate.js`, `src/shared/per-run-artifacts.js`, `repo-exports.js`, `run-id.js`, `status-inventory.js`, `test/status-inventory.test.js`) have no `grill-t37` row anywhere. Neither the report's "Not done" section nor the handoff queues it — the per-round bookkeeping row fell through the T-12 crack. The round's own assert leg now exits 1 against the report it shipped, which is the mechanism working — and proof the red is real, not an instrument artifact.

### Latent code defects (fix-lane candidates)

- **F-2 — `run-gates.js:349-416`: out-of-set `declared_reason` is silently swallowed on the timedOut and exit-2 branches.** Marker lines are stripped at 356-364; the `timedOut` branch (370) and `code===2` branch (387) `return` before the violation check at 413. A leg that emits `::jiahao declared_reason=<out-of-set>` and then times out or exits 2 leaves zero trace — contradicts the file's own header (39-40) and D-003.1 "out-of-set = registry violation and fails the leg".
- **F-3 — `check-expected-red.js:117-149`: the N-run escalation streak is not per-surface.** The artifact list mixes `status-inventory.gates.*` and `.test.*` newest-first; `hit=false → break` means an interleaved other-surface artifact kills the streak. Under alternating runner cadence `consecutive_runs≥2` is nearly un-fireable. Comment says "per surface"; code does not partition by `judged_surface`. Dormant today (0 hook rows).
- **F-4 — `check-status-inventory.js` `pickDerivation` selects `complete:false` mid-run artifacts.** Verified live: while my `gate:all` was in flight, the assert leg picked the in-progress gates artifact and emitted a spurious "report-only: [map-freshness, post-land-sentinel]" FAIL — a verdict produced against a partial inventory. In-band use (as the battery's last leg) is safe by the observer-row exclusion; the standalone path — the only path until ADR-0095 registration — is not guarded. Fail-closed direction, but false reds erode the leg's credibility before it's even registered.
- **F-5 — `run-id.js:64-68`: CI form lacks the matrix dimension.** `ctx = GITHUB_RUN_ID.GITHUB_RUN_ATTEMPT.GITHUB_JOB`; spec D-005.2 requires "{job/matrix 维}（matrix 同名互覆防护）". `GITHUB_JOB` is identical across matrix legs → same-run matrix legs share `run_id` and would clobber each other's artifacts. Also `env.CI` alone triggers the CI form, yielding `no-run-id.*` on non-GitHub CI. Latent (no matrix jobs today).
- **F-6 — `repo-exports.js:87-99`: s2 "same-file declarations" over-widened.** Object-literal keys, member-access tails (`x.foo` ⇒ `foo`), and ident-shaped string literals all count. Spec S-4 defines s2 = {same-file declarations ∪ imports ∪ repo export table}; a comment citing `foo` resolves if the string `'foo'` appears anywhere — false negatives by construction on a deny-level leg.
- **F-7 — `extractSentinels` phantom blocks.** Any prose mention of the marker (even inside backticks — the report's own T-5 table cell does this) pairs with the next ` ```json ` fence and produces an evaluated block. The report extracts as **3 blocks for 2 snapshots**; during F-4's mid-run selection the phantom gates block emitted its own FAIL line. Marker should bind to a fence adjacency (`-->` then whitespace then ` ```json `), as `CARRIER_RE` already requires for candidacy.

### Spec-letter deviations / adjudication points (owner calls, not implementer fixes)

- **F-8 — member identity strips `command`/`exit`.** `normalizeRow` keeps {declared_reason, filepath, join_key, judged_surface, name, reason_code, status, suite, unit_kind}; S-5.5's strip list names only duration/timestamps/absolute-paths. Exit-code or command drift reconciles as equal. Legible design choice, but it is a choice the spec did not enumerate — needs an ADR-0095 sentence or a ledger entry.
- **F-9 — T-0 stage 3 not executed per letter.** D-006.6: "分布落盘→tier 默认值按 measured p95 填充→同 commit 立法". Distribution landed; `TIER_TIMEOUT_S = {}` stays empty; handoff discloses deferral to docs-lane legislation. Disclosed deviation, still a deviation.
- **F-10 — contract-vocab enumeration basis reinterpreted.** Spec froze "本轮实测 44 个同族集"; implementation enumerates all committed `docs/**/*.json` + `bench/polygraph/thresholds.json` + 4 code enums (`build-contract-vocab.js:31-56`). The drift-diff regen gate preserves "禁静默扩列" in spirit; the enumeration basis differs from the letter.
- **F-11 — `declared`-vs-inferred mismatch not computed.** D-003.7 wants the mismatch as an audit signal in the evidence_ref plane. Both fields ride the row so the signal is derivable, but nothing computes or marks it today. Partial.

### Report-accuracy minors (prose hygiene, no mechanism impact)

- "+2 rows" → actually +4 (C-14); tarball 529,581 → actually 529,789 (C-13); leg-timing quoted the earliest of three runs (C-12); "check-status-inventory → OK" was a pre-commit truth (C-4).

## 4. Process observations (reported, not adjudicated)

- **P-1 — Declared inside the F-6 exposure window.** Sequence: test run 04:13Z → report written 04:26Z → commit landed 04:36Z. The commit itself flipped the three coverage legs red; no post-landing re-run preceded the done-claim. The repo's own convention (grill-t29 F-6 / E-19) names this interval the exposure window and forbids declaring inside it. The assert leg — this round's own deliverable — is currently red precisely because of it. Whether this is a violation or a registered bootstrap condition is an owner call; I report the mechanics.
- **P-2 — `but commit` discipline verified clean.** Explicit-id allowlist used; `[ANCHORING]` footer == landed set (30/30); `git show --name-only` reproduced by this audit. No sweep past the filter observed.
- **P-3 — Dirty-tree verification caveat.** The workspace carries other lanes' uncommitted files; none of the findings trace to them (the coverage legs judge committed diffs). Recorded for completeness.
- **P-4 — The impl report's own sentinel blocks reconcile correctly on the gates surface and are digest-self-consistent** — the convention carrier is well-formed; only the content went stale.

## 5. What verified clean (so the fix list doesn't read as the whole truth)

The mechanism this round exists to build **works end-to-end**: per-run normalized artifacts emit at every exit path (incremental emission observed mid-run), jest member expansion with verbatim names, the C-1 mutex chain (`missing[]→registered-absence`, `timedOut→timeout`, residual `instrument-failure`) verified in code and in the real artifact, `closeout.reason_code_breakdown = {registered-absence:4}`, sentinel digests recompute, the assert leg's member-level reconcile caught the round's own drift the moment it existed — that is the strongest evidence the design is right. The jest-junit `assertionResults→testResults` defect find is a genuine latent-defect catch with contract pins. Honest UNVERIFIABLE bucketing is real (4 legs, never faked green).

## 6. Rework requirements and re-run list

Returned for rework; **nothing here is adopted as owner ruling.** Fixes route: F-1 is the only one that must land before any seal (it is a live red the round itself minted); F-2/F-3/F-4/F-7 are fix-lane; F-5 may ride F-2's file or wait for CI matrix existence (owner call); F-6/F-8/F-10 are ADR-0095 adjudication material; F-9 is docs-lane.

1. **F-1 (blocking):** append a `grill-t37` row to `docs/governance/trend-inventory.json` — `kind:"fix"` per the fix-round schema (fields: `round`, `date`, `kind`, `adr_added`, `adr_superseded_or_closed`, `net_additions`, `zero_product_diff`, `coverage_base`, `governance_tooling_diff.files` listing the 15 R2 files in the established `"path"` + `"path [R2]"` doubled form) — OR route through a registered alternative (expected-red entry / erratum) if the owner judges the row belongs to a different lane. A silent skip is not an option — the coverage legs are red now.
2. **F-2:** move the out-of-set `declaredViolation` check ahead of the `timedOut`/`code===2` early returns (or emit the violation line into those branches' rows before returning). Add a test: leg emits out-of-set declared_reason then exits 2 → leg fails.
3. **F-3:** partition the artifact history by `judged_surface` before streak evaluation in `evaluateHooks`; add a test with interleaved gates/test artifacts where a hook must still fire.
4. **F-4:** `pickDerivation` must prefer the newest `complete===true` artifact for the tree (or mark the verdict UNVERIFIABLE rather than reconcile against a partial set).
5. **F-7:** bind `extractSentinels` marker→fence adjacency (`-->` followed only by whitespace before ` ```json `), matching the candidacy regex's semantics; backticked prose mentions must not mint subjects.
6. **F-5/F-6/F-8/F-10/F-11:** present to the owner / ADR-0095 — they are contract-level decisions, not patches an agent should land unilaterally.

**Re-run checklist after rework (the same battery this audit ran, no subset):**
`node --check` touched files → `node scripts/run-test-gate.js` → `npm run gate:all` → `node scripts/check-status-inventory.js` → `node scripts/check-comment-refs.js` → `node scripts/check-expected-red.js` → `node scripts/check-deferred.js` → `node scripts/build-test-manifest.js --check` → `npm pack` + extract + `install.js init --profile verifier --dry-run` inside → `git diff --check`. Success criterion for F-1 closure: the test-surface inventory drops to the two previously-disclosed rows (adr-0038, orphan-cites) and the assert leg exits 0 against a regenerated report block.

## 7. Owner adjudication queue (new items this audit adds)

- Whether stripping `command`/`exit` from member identity is a registered normalization choice or a comparison-domain hole (F-8).
- Contract-vocab enumeration basis: measured-44 vs derived-all-docs-JSON (F-10).
- run_id matrix dimension timing (F-5): latent today, mandatory before any matrix job exists.
- Whether the F-6-window declare sequence (P-1) is citable as a precedent or needs a registered errata line.
- Standing owner items unchanged: pack-cap sign-off (ADR-0094), post-land refresh, map-freshness orphan registrations.

## 8. Mechanism-derived status at audit time (this report's own sentinel blocks — current truth, not the report's)

<!-- status-inventory v1 -->
```json
{
  "run_id": "gates.da04920c324985033dba47e747094abd394e159d.HEAD.dirty.2026-10-05T05-04-28.530Z",
  "emitted_at": "2026-10-05T05:08:19.572Z",
  "normalized_join_key_version": "v1",
  "rows": [
    {
      "declared_reason": null,
      "filepath": null,
      "join_key": "gate-leg::::::bench-gate",
      "judged_surface": "gates",
      "name": "bench-gate",
      "reason_code": "registered-absence",
      "status": "unverifiable",
      "suite": null,
      "unit_kind": "gate-leg"
    },
    {
      "declared_reason": null,
      "filepath": null,
      "join_key": "gate-leg::::::ci-wiring",
      "judged_surface": "gates",
      "name": "ci-wiring",
      "reason_code": "registered-absence",
      "status": "unverifiable",
      "suite": null,
      "unit_kind": "gate-leg"
    },
    {
      "declared_reason": null,
      "filepath": null,
      "join_key": "gate-leg::::::map-freshness",
      "judged_surface": "gates",
      "name": "map-freshness",
      "reason_code": null,
      "status": "fail",
      "suite": null,
      "unit_kind": "gate-leg"
    },
    {
      "declared_reason": null,
      "filepath": null,
      "join_key": "gate-leg::::::mr-probes",
      "judged_surface": "gates",
      "name": "mr-probes",
      "reason_code": "registered-absence",
      "status": "unverifiable",
      "suite": null,
      "unit_kind": "gate-leg"
    },
    {
      "declared_reason": null,
      "filepath": null,
      "join_key": "gate-leg::::::pack-smoke",
      "judged_surface": "gates",
      "name": "pack-smoke",
      "reason_code": null,
      "status": "fail",
      "suite": null,
      "unit_kind": "gate-leg"
    },
    {
      "declared_reason": null,
      "filepath": null,
      "join_key": "gate-leg::::::post-land-sentinel",
      "judged_surface": "gates",
      "name": "post-land-sentinel",
      "reason_code": null,
      "status": "fail",
      "suite": null,
      "unit_kind": "gate-leg"
    },
    {
      "declared_reason": null,
      "filepath": null,
      "join_key": "gate-leg::::::probes",
      "judged_surface": "gates",
      "name": "probes",
      "reason_code": "registered-absence",
      "status": "unverifiable",
      "suite": null,
      "unit_kind": "gate-leg"
    }
  ],
  "rows_digest": "sha256:41b10784ac5eeeb090f0257b257efc374cc23e750917edda57455d66ba1dcb0f"
}
```

<!-- status-inventory v1 -->
```json
{
  "run_id": "test.da04920c324985033dba47e747094abd394e159d.HEAD.dirty.2026-10-05T04-57-20.017Z",
  "emitted_at": "2026-10-05T05:01:06.884Z",
  "normalized_join_key_version": "v1",
  "rows": [
    {
      "declared_reason": null,
      "filepath": "test/adr-0038-wiring.test.js",
      "join_key": "jest-test::test/adr-0038-wiring.test.js::D1: files whitelist = runtime artifact surface::npm pack dry-run tarball: no test/, no docs/adr, no bench fixtures, thresholds.json present, under the ADR-0039 D3 cap",
      "judged_surface": "test",
      "name": "npm pack dry-run tarball: no test/, no docs/adr, no bench fixtures, thresholds.json present, under the ADR-0039 D3 cap",
      "reason_code": null,
      "status": "fail",
      "suite": "D1: files whitelist = runtime artifact surface",
      "unit_kind": "jest-test"
    },
    {
      "declared_reason": null,
      "filepath": "test/adr-0081-wiring.test.js",
      "join_key": "jest-test::test/adr-0081-wiring.test.js::ADR-0081 doc surface (grill-t22 disposition round)::coverage leg: the committed diff anchored at the t24 round base validates the latest row (re-anchored grill-t24)",
      "judged_surface": "test",
      "name": "coverage leg: the committed diff anchored at the t24 round base validates the latest row (re-anchored grill-t24)",
      "reason_code": null,
      "status": "fail",
      "suite": "ADR-0081 doc surface (grill-t22 disposition round)",
      "unit_kind": "jest-test"
    },
    {
      "declared_reason": null,
      "filepath": "test/adr-0083-wiring.test.js",
      "join_key": "jest-test::test/adr-0083-wiring.test.js::ADR-0083 doc surface (grill-t24 drift-clause round)::coverage leg: the committed diff anchored at the current round base validates the latest row",
      "judged_surface": "test",
      "name": "coverage leg: the committed diff anchored at the current round base validates the latest row",
      "reason_code": null,
      "status": "fail",
      "suite": "ADR-0083 doc surface (grill-t24 drift-clause round)",
      "unit_kind": "jest-test"
    },
    {
      "declared_reason": null,
      "filepath": "test/adr-0084-wiring.test.js",
      "join_key": "jest-test::test/adr-0084-wiring.test.js::ADR-0084 public-clone verifiability contract (grill-t25 fix round)::coverage leg re-anchored at the t35 base validates the latest row",
      "judged_surface": "test",
      "name": "coverage leg re-anchored at the t35 base validates the latest row",
      "reason_code": null,
      "status": "fail",
      "suite": "ADR-0084 public-clone verifiability contract (grill-t25 fix round)",
      "unit_kind": "jest-test"
    },
    {
      "declared_reason": null,
      "filepath": "test/orphan-cites.test.js",
      "join_key": "jest-test::test/orphan-cites.test.js::three-stage escalation ladder (injected now)::stage1 silent -> stage2 map warning -> stage3 leg red",
      "judged_surface": "test",
      "name": "stage1 silent -> stage2 map warning -> stage3 leg red",
      "reason_code": null,
      "status": "fail",
      "suite": "three-stage escalation ladder (injected now)",
      "unit_kind": "jest-test"
    }
  ],
  "rows_digest": "sha256:769359aecbbff9dcd6ec0d13ecd7dc01f45ca93fb73a7b66c2b8325fedef3bff"
}
```

## 9. Audit coverage declaration (ADR-0091 / grill-t34 D-004 contract)

This audit executed the full locally-runnable CI checklist subset (pack, CLI liveness, full jest gate, full gate battery, all new standalone legs) plus artifact-level spot verification. The two `advisories` entries (`check-map-freshness --advisory-only`, `check-post-land`) were partially exercised — map-freshness inside the battery (red, as expected) and post-land attempted but timed out locally (>120 s); the corpus-restore lines are N/A without `JIAHAO_BENCH_CORPUS_B64` (the environment-conditioned unverifiables are disclosed in §1, not hidden).

<!-- audit-coverage v1 -->

```json
[
  "npm install --ignore-scripts",
  "if [ -z \"$JIAHAO_BENCH_CORPUS_B64\" ]; then",
  "echo \"::warning title=corpus-restore::JIAHAO_BENCH_CORPUS_B64 not set; corpus gates degrade to UNVERIFIABLE\"",
  "else",
  "echo \"$JIAHAO_BENCH_CORPUS_B64\" | base64 -d > \"$RUNNER_TEMP/bench-corpus.tgz\" || true",
  "node scripts/restore-bench-corpus.js \"$RUNNER_TEMP/bench-corpus.tgz\" \"$RUNNER_TEMP\"",
  "fi",
  "npm run gate:all",
  "npm install --ignore-scripts",
  "node scripts/run-test-gate.js",
  "results=\"${{ needs.gate-all.result }} ${{ needs.test.result }}\"",
  "expected=2   # == length of the needs list above",
  "echo \"needed job results: [$results] (expected $expected)\"",
  "seen=0",
  "for r in $results; do",
  "seen=$((seen + 1))",
  "if [ \"$r\" != \"success\" ]; then",
  "echo \"::error::aggregate red - needed job result $r is not success (ADR-0058 D-B)\"",
  "exit 1",
  "fi",
  "done",
  "if [ \"$seen\" -ne \"$expected\" ]; then",
  "echo \"::error::aggregate red - saw $seen results, expected $expected (ADR-0058 D-B: unknown/empty reads red)\"",
  "exit 1",
  "fi",
  "echo \"aggregate green - all $expected needed jobs report success\""
]
```
