# grill-t32 second-party audit report — 2026-09-29

Auditor window: independent re-execution + claim-vs-artifact spot-check.
Audited object: lane `grill-t32-docs` (merge-base `b06f4a97`), report
`D:\Aworker\jiahao\.scratch\grill-t32\reports\2026-09-28-report.md`,
handoff `D:\Aworker\jiahao\.scratch\grill-t32\handoffs\2026-09-28-closeout.md`.
Audit-evidence (examiner work product, never-commit):
`D:\Aworker\jiahao\.scratch\grill-t32\audit-evidence\rerun\gates-2026-09-29.txt`.

Verdicts stay owner-side; this report states evidence and repair scope only.

## 1. Hard acceptance — independently re-run, all green

| Acceptance leg | Command | My result | Report claim | Match |
|---|---|---|---|---|
| compile | `node --check` x9 touched files | all OK | OK | yes |
| test loop | `npx jest` | **89/89 suites, 1566/1566 tests, 477s** | 89/89, 1566/1566 | yes |
| package | `npm run pack:smoke` | OK 435426<470000B, tarball extract + CLI dry-run matched | same | yes |
| liveness | `node scripts/install.js --help` | exit 0, usage printed | same | yes |
| map check | `build-rewrite-map.js --check` | OK — **3611** citations | "3610" | stale-by-1 (F-4) |
| published-only | `--published-only` | OK — **3611** | "3610" | stale-by-1 (F-4) |
| orphan-registration | `check-orphan-registration.js` | OK exit 0 | same | yes |
| run-gates | `run-gates.js` | exit 0, 43 entries, **4 UNVERIFIABLE** (ci-wiring/bench-gate/probes/mr-probes — all ci-mode capability negatives) | same | yes |
| anchoring-footer leg | inside run-gates [223] | PASS — **88** commits verified | "86" | grew post-report (tts+kxx), consistent |
| map-freshness leg | inside run-gates [224] | PASS — **11** claim-surface commits | "10" | grew post-report, consistent |
| classification-consistency | [221] | PASS | T-2 claim | yes |
| test-git-hermetic | [222] | PASS | T-7 premise | yes |
| backfill idempotent | `backfill --dry-run` | 0 live + 0 degraded + 277 registered + 460 reachable + 0 errors | implied | yes |
| registry self-check | `orphan-cites.js check` | OK, 277 entries | 277 | yes |

## 2. Lane integrity

- `git log main..grill-t32-docs` = **14 commits** (goal text said 13; closeout
  enumerates 12). Actual set: `sor` docs-book, `zlo` T-0, `swy` T-1, `pmz` T-2,
  `mzmz` T-3+T-4a, `szx` T-4/5, `spm` T-6, `wnz` T-7+T-8 atomic cutover,
  `rkt` T-9 docs, `rrz` T-9b repair, `qol` T-9c closeout wave, `xox` T-9d
  anchors, `kxx` T-10 report+handoff+map regen, `tts` T-9c2 wiring resync.
- **14/14 `[ANCHORING]` footers reproduce** via
  `node scripts/derive-anchoring-footer.js --commit <sha>` — footer file set ==
  `git show --name-only` landed set on every commit.
- No push performed (as stated). `gitbutler/workspace` HEAD contains the lane.

## 3. Claim → evidence → conclusion

| # | Claim (report/task) | Evidence gathered | Conclusion |
|---|---|---|---|
| T-0 | baseline.md committed | `git show bb6628b0` lands `.scratch/grill-t32/handoffs/baseline.md`; gc.pruneExpire unset confirmed (`git config` exit 1) | VERIFIED |
| T-1 | ADR-0089 authored + 0074 scoped pointer + countersign queue | ADR-0089 exists, status `Accepted — ID-level-only` + queue 20→21 line; ADR-0074 carries the scoped succession note (input surface + class enum only); README index lists 0089 | VERIFIED |
| T-2 | orphan-cites.json + fenced registration + clause-(b) | file exists, schema_version 1, append-only validated; `"docs/governance/orphan-cites.json": "fenced"` in surface-taxonomy.json; clause (b) file-path resolution present in check-classification-consistency.js, leg [221] PASS | VERIFIED |
| T-3 | verbs: register/--revive/--successor/--replace-ref/backfill/check | all present in scripts/orphan-cites.js; register machine-verifies successor (see F-8 for scope); ambiguous/absent fail-closed; degraded entries emitted | VERIFIED w/ F-2,F-8 |
| T-4 | classifier = f(pair/removed, pinned-tip ancestry, cat-file -e, registry); ref topology → qualifier only; injectable exec/root/now; NO_REPLACE | class cascade in buildInner reads exactly those four facts; `via` computed after class decision and feeds warnings+qualifier only; seams via `_execOverride`/`_root`/`o.now`; all `git()` calls under NO_REPLACE_ENV | VERIFIED w/ F-6,F-7 |
| T-5 | --check domain = stable fields; qualifiers exempt + weak-checked; unresolved hard red | `stableCopy` strips generated_at/warnings/qualifiers; `consistencyErrors` checks reachable_via-vs-class + type enum + unresolved hard red; --check never writes | VERIFIED w/ F-10 |
| T-6 | orphan-registration leg 225 confirmatory, source_adr 0089, constants 14/7 | gates.json entry exact; constants named in orphan-cites.js AND ADR-0089; stage-3 over-grace red implemented; purge-mark behind old-side probe | VERIFIED w/ F-9,F-12 |
| T-7 | 16-case battery on real git fixtures | exactly 16 test() blocks; git-hermetic helper used; coverage spans §6.2/§6.3 (6 classes, verbs, ladder via injected now, tamper/purge/ambiguous/replace-ref/resurrection/partial-clone); jest green | VERIFIED |
| T-8 | atomic cutover commit | `wnz` lands registry 277 + map v2 + battery + ci.yml together; migration diff = commit diff (rows individually visible) | VERIFIED |
| T-9 | doc sync: generator spec v2, CONTEXT.md glossary, ADR cutover notes | all three present | **PARTIAL — F-1, F-3** (AGENTS.md soft-constraint missing; stale non-goal line survives) |
| T-10 | closeout + debug residue removed | map-before.json / map-committed.json absent; report+handoff committed in `kxx` | VERIFIED w/ F-5 |
| §8 gates | all six rows | independently re-run, all exit 0 | VERIFIED |
| D-001 | single-object bundle a+b+c atomic | (a)+(b) landed; **(c) editorial soft-constraint never landed** | **PARTIAL — F-1** |
| D-002 | four-fact purity, qualifier layering, exists_at/mtime/type/size | code-verified; class cascade clean; qualifiers written all 3611 rows | VERIFIED |
| D-003 | registry append-only + schema + dual-role + NO_REPLACE isolation | append-order validation + tamper detection green; schema superset present; classifier never writes registry | VERIFIED w/ F-2 (errata back-pointer absent) |
| D-004 | three-stage ladder + --check exemption + explicit backfill | stages wired; constants registered; backfill idempotent/dry-run/checkpoint | VERIFIED w/ F-2,F-9 |
| D-005 | ADR-0089 + scoped 0074 + dual-track countersign + atomic regen + clone reshape | carrier/pointer/queue/cutover all landed; --published-only widened (registry consistency clone-computable) | VERIFIED |
| D-006 | real-git battery + ~5% mock seam + injected clock | 16 tests via git-hermetic; mocks only at exec seam; no sleeps | VERIFIED |

## 4. Findings

### Must-route (spec/contract misses; two are undisclosed)

- **F-1 [undisclosed spec miss]** Editorial soft-constraint never landed.
  Spec §7: "New prose cites SHOULD carry subject/date context … documented in
  AGENTS.md during the doc-sync task"; T-9 assigns it; spec §1 makes (c) a
  bundle component with "No partial landing". `AGENTS.md` contains no such
  clause (whole-repo grep confirms); report T-9 row and deviations are silent.
- **F-2 [undisclosed spec miss]** ERRATA back-pointer absent on all 187
  degraded entries. Spec §3.2/§4.4 + T-3: degraded form = object_purged mark +
  ERRATA.md back-pointer. All degraded entries have `errata_ref: null`; the
  `--errata` flag exists but was unused at cutover; ERRATA.md ends at E-21
  (t31) — no t32 erratum covers the purge population.
- **F-3 [doc-code contradiction]**
  `docs/rewrite-map-generator-spec.md` "Non-goals" still reads "No
  `refs/replace/` is written or read (ledger D-003 rejection)" — false twice:
  `--replace-ref` writes `refs/replace/` (implemented + tested), and D-003
  conditioned rather than rejected it. Survived the claimed T-9 rewrite.
- **F-4 [claim-artifact accuracy]** Migration-diff figures are not
  reproducible from committed artifacts: committed v1 map at cutover parent
  = local-only **1042** (1034 dead-label + 1 pre-purge + 7 local object),
  rewritten **105**, unresolved class **0**. Report/ADR claim "1040→7,
  unresolved 618→0, rewritten 104→105" — the v1-side endpoints match the
  round-OPEN baseline (b06f4a97: 1040/104) not the cutover parent, and "618"
  appears in no committed map (v1 unresolved was a *label*, 1034 rows).
  Substance (dead tokens → orphaned-cite 1035) is correct; endpoints are
  imprecise. Committed map now reads 3611 / local-only 8 / published-unchanged
  2463 vs report/closeout's 3610/7/2462 (post-report regens grew it —
  immutability convention routes the correction through errata).

### Code-review findings (dual-axis; sub-agent corroborated)

- **F-5 [process note]** Closeout commit enumeration is stale: names `nww`
  (report) and `mzm`; lane actually carries `kxx`/`mzmz` (squash created the
  report commit) and omits `sor`+`tts`. `tts` (wiring resync) landed AFTER the
  report+handoff commit — the E-19 "re-run after the last `but` mutation"
  could not have covered it; my rerun of `--check`/`--published-only`/leg is
  green on the settled tree.
- **F-6 [standards]** `build-rewrite-map.js:49` imports `forRoot` unused; the
  classifier keeps a private seam (`_execOverride`/`git()`/`gitAt()`) with a
  different injected signature than `git-facade.js` — the facade's header
  overclaims "the single injectable seam for every git child-process call".
- **F-7 [standards/spec]** `scanDocTokensAt` (line ~177) uses raw
  `execFileSync` — ambient env (no `GIT_NO_REPLACE_OBJECTS`) and outside
  `_execOverride`: the map-freshness path is non-injectable and theoretically
  replace-ref-exposed on `git grep <ref>`.
- **F-8 [spec partial]** Successor verification checks subject only
  (orphan-cites.js:246-249); spec §3.3 says snapshot *fields* — author /
  committer_ts / parents unchecked.
- **F-9 [spec semantic, adjudicate]** `check-orphan-registration.js:60-64`:
  unagable objects (null `object_mtime` — packed blobs/trees) skip straight to
  stage-3 red. ADR-0089's "conservatively past stage 1" arguably intends the
  stage-2 window first; current reading is fail-closed but punishes
  transient states a D-004 negative clause tries to spare.
- **F-10 [coverage gap]** `--check` runs `consistencyErrors` on the
  regenerated map only; `stableCopy` strips committed-map qualifiers before
  equality — a committed-map qualifier contradiction is invisible to the
  gate (spec §4.3: exempt-from-equality ≠ exempt-from-consistency-check).
- **F-11 [smells, judgment]** Duplicated helpers across the three new modules
  (revListObjects / mtime+snapshot / displayRefs+reachableVia / resolveToken
  tri-state / prefix-match predicate / the qualifier-consistency loop twice);
  Speculative Generality (uncalled facade exports `exists`, `objectMtime`,
  `revListCommits`, `revParse`, `nrOk`; untested orphan-cites seams
  `o.git/o.readFile/o.writeFile/o.locations`; always-empty `notes`);
  Divergent Change (build-rewrite-map.js 770 lines hosting generation +
  discovery + classifier + registry validation + ladder + 3 verify modes).
- **F-12 [minor]** `checkLeg`'s `covers` swallows `AmbiguousToken` into `null`
  — ambiguous tokens degrade to "uncovered" (still fail-closed via stage-3,
  but the diagnostic signal is lost).
- **F-13 [minor]** `register --replace-ref` writes refs inside fixture repos
  via facade ambient `process.env` — letter-clean for test-git-hermetic (argv
  lives in scripts/) but leaks ambient GIT_* config the hermetic helper exists
  to isolate.

### Verified-clean (no action)

- Atomic cutover in one commit; classifier purity; `--check` non-mutating and
  never registering; append-only append-order + tamper detection green;
  mock budget ≤ fault-injection seam; no scope creep (no settle-window leg,
  no claim-duplicated touch); all 7 disclosed deviations corroborated by
  commit messages/diffs; 4 tracked `audit-evidence/` files are pre-nc-001
  legacy (t12/t13/t15), this round added none; working-tree dirty files are
  gate-run side-effects (g6-publish-replay.json) + prior-round audit captures.

## 5. Process violations (separately reported, per instruction)

- The report itself committed cleanly; disclosed deviations (E-19 instance
  rkt→rrz, ADR status form, zh-CN baseline re-pin, self-cite exemption,
  exact-first adjudication, template-escape) are each corroborated in the lane
  history.
- **Undisclosed**: F-1 and F-2 are spec-required deliverables absent without
  disclosure; F-3 is a doc-code contradiction inside a file the report claims
  was rewritten; F-5's post-closeout landing is unremarked in the record.
- No `but commit` swept outside its allowlist (14/14 anchoring parity).

## 6. Repair brief for the fix window (not executed — audit scope)

R1. Land the AGENTS.md editorial soft-constraint (spec §7 wording), or route a
    documented withdrawal through the ledger — closing F-1 either way.
R2. Discharge the ERRATA back-pointer obligation: author the erratum covering
    the 187-entry degraded population and record the `errata_ref` linkage per
    the append-only channel (new adjudicating entries or a standing erratum —
    implementation choice belongs to the fix window). Closes F-2.
R3. Fix `docs/rewrite-map-generator-spec.md` non-goal line to the conditional
    form (replace refs optional; object reads isolated by NO_REPLACE). F-3.
R4. Route an erratum correcting the report's migration-diff figures
    (committed-parent truth: 1042→7*(*now 8*), unresolved-class 0→0, rewritten
    105→105; the 1034 dead-label + 1 pre-purge = 1035 orphaned-cite mapping is
    the honest semantic). F-4.
R5. Owner adjudication: F-9 (unagable→stage-3), F-10 (committed-map qualifier
    check), F-8 (subject-only successor check) — spec-reading calls, not agent
    fixes.
R6. Optional hygiene: dead `forRoot` import (F-6), `scanDocTokensAt` env/seam
    (F-7), `covers` ambiguity signal (F-12), facade ambient env on
    `--replace-ref` (F-13), dedupe helpers (F-11).

Mandatory re-run after any repair wave (same suite as this audit):
`node --check` touched files; `npx jest` (expect 89+ suites green);
`npm run pack:smoke`; `node scripts/install.js --help`;
`node scripts/build-rewrite-map.js --check` + `--published-only`;
`node scripts/check-orphan-registration.js`; `node scripts/run-gates.js`;
`node scripts/derive-anchoring-footer.js --commit <sha>` per new commit;
E-19 order: last `but` mutation → then gates → then declare.

## 7. Evidence index

- Gate reruns: `D:\Aworker\jiahao\.scratch\grill-t32\audit-evidence\rerun\gates-2026-09-29.txt`
- Jest tail (89/89, 1566/1566): captured in session; full log in
  `%TEMP%\devin.exe-overflows\shell-jest-main-fc14edf19070cb72\content.txt`
- run-gates tail: `%TEMP%\devin.exe-overflows\` shell `rungates`
- Anchoring parity: `derive-anchoring-footer.js --commit` x14, all MATCH
- Map counts: `docs/rewrite-map.json` committed = 3611 {rewritten 105,
  local-only 8, published-unchanged 2463, orphaned-cite 1035, unresolved 0}
