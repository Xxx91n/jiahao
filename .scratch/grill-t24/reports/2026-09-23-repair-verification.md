# grill-t24 repair verification — audit findings dispositioned (2026-09-23)

Auditee: branch `grill-t24-docs`, base `c526de3`, durable tip `4a18262`
(40 durable commits total; repair window = `bbf5259`..`4a18262`, 17 commits).
Prior audit: `.scratch/grill-t24/reports/2026-09-23-audit.md` (PASS WITH
FINDINGS, T5-C-1..C-5). Method: independent re-execution on the maintainer
worktree (pollution from audit-window incident I-1 is gone — worktree restored
to committed bytes before the repair window opened, confirmed: porcelain shows
only the 13 registry-covered untracked paths).

Verdict: **PASS** — all five findings disposed, all mandatory scope lines and
the full acceptance battery re-verified green on the final committed state.

## Mandatory scope lines — re-verified on tip `4a18262`

| # | check line | verdict |
| - | ---------- | ------- |
| 1 | evidence-freshness ordering | **PASS** — freshness anchor recomputed independently = `ad8c5a1` (matches the repair window's declared anchor); all 24 committed captures + ordering pin: 0 violations (`merge-base --is-ancestor` per artifact). |
| 2 | never-commit label coverage | **PASS** — worktree untracked = 13 paths, all registry-classified (nc-001/002/004); tracked-tree matches = the 5 LEGACY paths only. |
| 3 | commit file-list conformance | **PASS** — the 17 repair-window commits each match their declared scope: 3 anchoring (`bbf5259` repair dispositions, `401e1f1` report-restore + pins + `fix-report.cjs`, `ad8c5a1` facts re-splice), the rest evidence-only or regen-only. |

## T5-C dispositions — claim → evidence → verdict

| finding | disposition claimed | evidence verified | verdict |
| ------- | ------------------- | ----------------- | ------- |
| C-1 consent sweep dropped defer-0060/0064/0065 | dated backfill naming all three, pending-evaluation, no disposition change | report:119-121 carries the dated backfill in the t23 repair shape; registry confirms all three still pending-evaluation | CONFIRMED |
| C-2 unmarked display-form `$` lines | report rows marked | report:141/142/156 — compile-yaml, compile-node-check, never-commit-sweep each carry "(artifact `$` line is display-form …)"; h1-reread/liveness were already marked | CONFIRMED |
| C-3 burn-rate ordinal | "sixth consecutive" stated | report:232 "**sixth consecutive carve-out round**" — now matches ADR-0083 D-F's claim | CONFIRMED |
| C-4 C-7 citation re-point | cite the committed set, not the untracked sweep | report:163-166 — "the committed set is 24 captures + 1 fixture - the table above enumerates the legs; the byte-level cross-check is `git ls-tree -r HEAD -- .scratch/grill-t24/evidence/`" (sweep/clean-tree correctly re-scoped to the untracked surface) | CONFIRMED |
| C-5 cosmetic cluster | titles / GOAL / mislabel / exit-code gloss | `adr-0080:185`, `adr-0081:134`, `adr-0082:73` now read "declares the live expected suite count"; GOAL.md → "Grilling landed … repair window disposed T5-C-1..C-5"; report:63 discloses `0ef7239`'s nc-007→nc-004 mislabel inline; check-ci-jobs row reads "EXIT 1 by design" | CONFIRMED |

## Repair-window extras claimed

| claim | evidence | verdict |
| ----- | -------- | ------- |
| defer-0069 discharged-by-trigger | registry: `status:"closed"`, `closed_via` names the audit + the presence-condition; `closed_at` 2026-09-23; wiring pin updated to assert `closed` (not left stale) | CONFIRMED |
| defer-0066 gains instance 5 | registry `instances[4]` = execPath runtime-portability (the I-1 lesson) | CONFIRMED |
| `bbf5259` committed a corrupted report blob | object store: `git show bbf5259:…/report.md` = 1188 lines, **9 interleaved copies** (`round-facts:start` ×9) — matches the disclosed `String.replace` `` $` ``-expansion root cause | CONFIRMED (corroborated, not just claimed) |
| report restored coherent | current report = 262 lines, exactly 1 sentinel region; `fix-report.cjs` rebuilds from the `9efe7b6` clean blob with function-replacement (the actual bug fix) + write/read-back verify — committed at `401e1f1` | CONFIRMED |
| adr-0033 status array + adr-0080 instance pin re-tallied | adr-0033 suite passes (enumeration maps to `closed`); adr-0080:154 asserts "five instances" | CONFIRMED via green suite |

## Acceptance battery — rerun on the final tree

| leg | result | verdict |
| --- | ------ | ------- |
| run-test-gate | 78 suites / 1325 passed / 0 skipped | CONFIRMED |
| gate:all (committed capture at a9faaa9) | exit 0, 35 entries, 4 unverifiable (`ci-wiring`, `bench-gate`, `probes`, `mr-probes`) | CONFIRMED |
| rewrite-map --check | in sync, 2529 citations | CONFIRMED |
| round-facts --check --report | canon + region in sync (exit 0 — green only on the clean maintainer tree, consistent with the I-2 chain) | CONFIRMED |
| anchors / deferred / inventory / coverage / pack-smoke / adr-index / instrument | 18 artifacts; 63 entries (51 live, 12 closed); 35 entries; coverage OK @c526de3; **341,239 B** < 380,000; index in sync; instrument conditional-certified | CONFIRMED |
| liveness (committed capture) | pack→extract→`install --help`→`init --dry-run`→MCP initialize, EXIT 0 | CONFIRMED |
| committed evidence shape | 24 captures + 1 fixture; green legs EXIT 0, designed-red legs carry keyed exits (2/1/1/1) | CONFIRMED |
| clean-tree (committed, 4db2646) | tracked-diff 0, 13 untracked all registry-covered, verdict CLEAN | CONFIRMED |

## Residual observations (non-blocking, carried forward)

- Commit map compresses the 16-commit evidence/regen tail into one row —
  readable, and per-commit truth is preserved in git; noted, not a defect.
- The pack size grew 341,056 → 341,239 B (report grew); under the amended cap.
- `fix-report.cjs` is a committed one-shot editor — disclosed as such; it is
  also the standing record of the `` $` ``-expansion root cause.
- defer-0064's collect()-conflation surfaced live during the audit (I-2 chain);
  it is registered and unchanged — no new row needed.

## Round state

`grill-t24-docs` tip `4a18262`, local-only (no push authorized). All audit
obligations discharged; defer-0069 closed. The three ADR-0083 D-E check lines
remain permanent audit-window scope for future rounds.
