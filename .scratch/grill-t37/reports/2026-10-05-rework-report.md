# grill-t37 Rework Report (fixes lane) — 2026-10-05

Lane: `grill-t37-fixes`, stacked above `grill-t37-impl`. Rework commit
`9afe3d62a91f129b881095f8e68880e8c43e33e4` (GitButler change `rmx`; amended once
to fold in a regenerated `docs/governance/anchors.json`). Responds to the audit
verdict FAIL at `.scratch/grill-t37/reports/2026-10-05-audit-report.md`.

Method note taken from the audit's own finding: **every number in §2–§4 was
re-derived on the settled tree AFTER the rework commit landed.** Nothing below
quotes a pre-commit snapshot.

## 1. Findings disposition

| Audit finding | Disposition | Evidence |
| --- | --- | --- |
| F-1 (blocking): 15 R2 files undeclared → 3 coverage reds | **FIXED.** `docs/governance/trend-inventory.json` gained the `grill-t37` fix row: 38 R2 files (the window's 37 as measured by `git diff 78d8a14c..HEAD` on the settled tree + `test/orphan-cites.test.js`, which this commit touches), in the established `"path"`/`"path [R2]"` doubled form, `coverage_base = 0f58ba60…` (same convention as `grill-t36`). | §2 rows 4–6: `check-governance-inventory` exit 0, 76 decl names / 38 R2; jest `adr-0081/0083/0084` = 50/50. |
| F-2: out-of-set `declared_reason` swallowed on timedOut / exit-2 paths | **FIXED.** `run-gates.js` hoists the registry-violation branch above both early returns; a leg emitting an out-of-set `declared_reason` fails regardless of exit mode (with the parse-failure detail preserved). | §2 row 9; tests `declared_reason…out-of-set exits 0/2` + `…times out` (46/46). |
| F-3: escalation streak not grouped per surface | **FIXED.** `evaluateHooks` partitions the artifact history by `judged_surface` before streak evaluation; interleaved surfaces no longer mask each other's runs. | §2 row 9; tests `hook N-run trigger…interleaved` + `…independent streak` (46/46). |
| F-4: `pickDerivation` accepts `complete:false` | **FIXED.** Only `complete === true` artifacts are derivation candidates; a tree with only in-flight artifacts is underivable → the leg stays UNVERIFIABLE rather than comparing partial members. | §2 row 9; test `pickDerivation…complete:false…/newest complete` (46/46). |
| F-7: phantom sentinel blocks from prose mentions | **FIXED.** `extractSentinels` binds marker candidacy to marker + whitespace + an adjacent ```` ```json ```` fence (the same adjacency `CARRIER_RE` uses); backticked / fenced-mention text extracts nothing. | §2 row 9; tests `prose mention…not a sentinel` + `…at EOF` (46/46). |
| F-5: `run_id` missing matrix dimension | **NOT FIXED** — routed to owner (audit §6.6); latent while no matrix jobs exist. | — |
| F-6: s2 comparison domain wider than spec | **NOT FIXED** — ADR-0095 material (audit §6.6). | — |
| F-8: command/exit outside member identity | **NOT FIXED** — owner adjudication (audit §6.6). | — |
| F-9: T-0 tier fill not legislated | **NOT FIXED** — routed to docs lane (audit §6.6). | — |
| F-10: contract-vocab enumeration base | **NOT FIXED** — owner adjudication (audit §6.6). | — |
| F-11: mismatch precomputation | **NOT FIXED** — owner adjudication (audit §6.6). | — |
| Queued: orphan-cites fixture clock | **FIXED.** `commit()` pins `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` = `2026-09-28T00:00:00Z` (NOW0−12h) by default: stage1 0.5d silent, stage2 20.5d warn <21d, stage3 30.5d red — deterministic under wall-clock drift. | §2 row 5: orphan-cites 21/21 (was 20/21). |
| Queued: `cf79e810`/`5ed69c41` pin-resync | **DONE at the file level.** Registry rows already existed (committed on the t36 lane); `docs/rewrite-map.json` regenerated on the settled tree, so the cites now classify `registered-orphan` in the worktree map. map-freshness stays **RED** — landing-gated, not a code defect (§4). | §2 rows 2, 12. |

## 2. Audit §6 re-run checklist — verbatim, on the settled tree

`$` lines are display-form: Git Bash, repo root `D:\Aworker\jiahao`, after
commit `9afe3d62` landed (run order preserved; the full `run-test-gate` re-run
is the LAST test artifact, produced after the anchors amend).

| # | Step | Result |
| --- | --- | --- |
| 1 | `node --check` × the five touched code files | exit 0 (all five) |
| 2 | `node scripts/check-governance-inventory.js --coverage-base 78d8a14cbc90bbbe1f48a2931c69e41716738f6e` | exit 0 — `OK: 37 R2 file(s) under test-declared governance tooling`; `decl.names` = 76 (38 doubled) |
| 3 | `node --test scripts/check-governance-inventory.test.js` | 4/4 pass |
| 4 | jest `test/adr-0081-wiring.test.js` | 17/17 |
| 5 | jest `test/adr-0083-wiring.test.js` | 16/16 |
| 6 | jest `test/adr-0084-wiring.test.js` | 17/17 |
| 7 | jest `test/orphan-cites.test.js` | 21/21 (was 20/21 — fixture clock) |
| 8 | jest `test/adr-0061-governance-anchors.test.js` | 4/4 (anchors regenerated + amended in) |
| 9 | jest `test/status-inventory.test.js` | 46/46 (incl. the four new pinning tests) |
| 10 | `node scripts/run-test-gate.js` (post-settle) | **1740 pass / 1 fail** — jest surface carries `adr-0038-wiring` only (the audit's success criterion: back to the disclosed rows, minus orphan-cites which is now fixed) |
| 11 | `npm run gate:all` (post-settle) | 51 legs: **44 pass / 3 fail / 4 unverifiable** — identical headline to the audit's reproduction |
| 12 | `node scripts/check-status-inventory.js` | exit 0 — reconciles `…/2026-10-05-audit-report.md` (its own verdict block) member-level, `members_in_block == members_derived` (2 warnings, §4) |
| 13 | `node scripts/check-comment-refs.js` | exit 0 — 215 files / 6651 regions / 149 spans / 9 yellow disclosures |
| 14 | `node scripts/check-expected-red.js` | exit 0 — `0 registered rows, closed 3-code set` |
| 15 | `node scripts/check-deferred.js` | exit 0 — `79 entries (65 live, 14 closed/actioned)` |
| 16 | `node scripts/build-test-manifest.js --check` | exit 0 — `manifest matches generated shape (100 suites / 1740 tests)` |
| 17 | `node scripts/build-governance-anchors.js --check` | exit 0 — `18 artifacts, digests in sync` (regenerated, amended into `rmx`) |
| 18 | `npm pack` | tarball **`jiahao-0.0.1.tgz` 530,570 bytes** (see §4) |
| 19 | `tar -xzf … && node package/scripts/install.js init --profile verifier --dry-run` | exit 0 — `[dry-run] would write "verifier" to %USERPROFILE%\.jiahao-profile` |
| 20 | `git diff --check` | exit 0 (worktree clean; untracked residue only) |
| 21 | `node scripts/check-claim-surface-roles.js` | exit 0 — `232 rows cover all 232 tracked claim-surface artifacts` |
| 22 | `node scripts/check-anchoring-footer.js` | exit 0 — `158 post-registration commits verified against git show --name-only` |

## 3. Corrections to the implementation report's claims (errata on the record)

The implementation report (`2026-10-05-report.md`) is not byte-edited; its
stale claims are corrected here per the audit's P-1 disclosure convention:

| Impl-report claim | Correction on the settled tree |
| --- | --- |
| C-1 "1734 pass / 2 fail" | Landed tree produced 1731/5; after this rework: **1740 pass / 1 fail**. The 3 landing-induced reds are fixed by the `grill-t37` trend row; the orphan-cites row is gone via the fixture clock; `adr-0038` remains baseline. |
| C-4 "check-status-inventory exit 0" | Was pre-commit truth at `c13a8a53`; went red on landing (the audit demonstrated). Now exit 0 again against the audit report's own block (§2 row 12) — and this report's blocks supersede it as the new subject. |
| C-12 "leg-timing 46 legs, p50=142 p95=33972" | Those percentiles were from the FIRST of three `gate:all` runs (the quoted artifact filename was the second). The settled-tree artifact (`4e583972…`) carries p50=141ms / p95=33972ms — shape stable across runs. |
| C-13 "tarball 529,581 B" | Settled tree: **530,570 B** — over the committed cap (470,000) AND now over the draft ADR-0094 amendment ceiling (530,000); §4. |
| C-14 "`claim-surface-roles.json` +2 rows" | The impl commit carried **+4 rows** (−2/+6 line diff): the two named t37 rows plus the two t36 `next-round.md`/`audit-handoff.md` backfill rows (whose m3 gap the suite caught mid-round). |

## 4. Standing reds — disclosed, not repaired (owner / landing-gated)

| Red | Status | Why it stays |
| --- | --- | --- |
| `pack-smoke` 530,570 > 470,000 | **baseline** — pre-existing before this wave (HEAD tree alone was already 500,548 on the impl round). | Owner-scope cap amendment (ADR-0094). New fact for the owner: the draft ceiling 530,000 is already exceeded by 570 B on this tree. |
| `map-freshness`: `cf79e810`/`5ed69c41` "no registry entry" | **landing-gated** — the registered rows live on this lane (worktree registry = 486 entries); the leg's assertion object is the published `origin/main` tree (483). Not resolvable by lane code; clears when the lane lands (or the owner backfills `main`). | Owner/landing scope, not a defect. |
| `post-land-sentinel`: stale `pre_land` | **standing** — `pre_land` names the last *other* claim mutation, now this lane's `9afe3d62`; the refresh ritual lands the regenerated segment inside the wave's closeout commit. | Owner-refresh scope (audit §7); this rework does not mint post-land segments. |
| Assert-leg warnings ×2 | **expected bootstrap** — `status-inventory` leg self-registration pending ADR-0095 (docs lane); its own registration commit exists (this commit is it). | Docs-lane scope. |

## 5. Sentinel blocks (the assert leg's subject once committed)

Blocks rendered from the newest emitted derivations on the settled tree — the
`gate:all` run of §2 row 11 and the `run-test-gate` run of §2 row 10.

<!-- status-inventory v1 -->
```json
{
  "run_id": "gates.4e58397237f5f484ed28407e158fc1abfbc598cb.HEAD.dirty.2026-10-05T07-29-08.292Z",
  "emitted_at": "2026-10-05T07:32:43.735Z",
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
  "run_id": "test.4e58397237f5f484ed28407e158fc1abfbc598cb.HEAD.dirty.2026-10-05T07-33-32.418Z",
  "emitted_at": "2026-10-05T07:36:15.200Z",
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
    }
  ],
  "rows_digest": "sha256:a7d7c22621a128c1e67d2f794daf3273e515720dfa2e8ab43ea7d9a2cc0bf7f7"
}
```

## 6. What this commit does NOT claim

- No `docs/gates.json` / `docs/deferred-registry.json` diff — the `status-inventory`
  leg's registration is docs-lane scope (ADR-0095).
- F-5/F-6/F-8/F-9/F-10/F-11 are adjudication items, not defects this lane was
  authorized to fix — deliberately untouched.
- `map-freshness`/`post-land-sentinel`/`pack-smoke` remain red on the settled
  tree by design of their assertion objects; this report discloses rather than
  repairs them.
- No push performed; lanes are local.
