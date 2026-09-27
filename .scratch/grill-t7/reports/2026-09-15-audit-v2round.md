# grill-t7 v2-round AUDIT — independent verification report

Date: 2026-09-15 | Auditor: audit window (this session) | Scope: `ee9b4db..HEAD`
on `grill-t7-v2-docs` (commits llp→xql→ptl→qsz→ktw→oom) | Report under audit:
`.scratch/grill-t7/reports/2026-09-15-report-v2round.md` (+ `handoffs/v2-round-done.md`)
Diff under review: `.scratch/grill-t7/reports/audit-v2round.diff` (5,904 ins / 107 del, 34 files).

## Verdict

**NOT CLEAN PASS — 打回返工。** Hard acceptance largely reproduces and the verdict itself
(`failed`, lie-fail × fp-fail) is mechanically sound — every frozen number re-derives through
the repo oracle. But: (a) one committed defect weakens the fail-closed guard on the
adjudication path; (b) three spec-letter deviations survive (one needs an ADR-level
adjudication); (c) three of the report's own "rerunnable evidence" claims do not reproduce
as written — a direct breach of the round's own report-honesty rule. Fix list + mandatory
re-run checklist at the bottom. Audit window fixes nothing.

## 1. Hard acceptance re-run (auditor-executed, this machine)

| Command | Report claimed | Auditor observed | Result |
|---|---|---|---|
| `npx jest` | 60 suites / 922 tests PASS, exit 0 | `Test Suites: 60 passed`, `Tests: 922 passed`, exit 0 | PASS |
| `npm run gate:all` | exit 0; 31 entries; devin-oot-v2-replay PASS; deferred OK 42 | exit 0; 31 entries; `[devin-oot-v2-replay] OK … failed, lie 9/31, FP 21/89, CI lower 0.142229`; `[deferred] OK - 42 entries`; 4 ci-mode UNVERIFIABLE (pre-existing posture, unchanged) | PASS |
| `npm pack --dry-run` | 101 files, 281751 B < 300000 | **102 files**, 281,751 B (`--json`: `files=102 size=281751`) | **FAIL — stale file count** (see F-1b) |
| `node scripts/install.js --help` | usage, exit 0 | usage, exit 0 | PASS |
| `node scripts/install.js init --dry-run` | "prints dry-run plan (exit 0)" | **exit 1**: `Non-interactive shell detected. Re-run with: jiahao init --profile verifier`. `init --dry-run -y` → exit 0, dry-run plan printed | **FAIL as written** (see F-1a) |
| `git diff --check` | clean | clean, exit 0 | PASS |
| `devin-oot.js --snapshot-dir devin-corpus-v2 run` | REFUSED exit 1 | `REFUSED: a completed devin-oot-v2-report.json already exists - single-shot burn is mechanical`, exit 1 | PASS |
| `devin-oot.js --snapshot-dir devin-corpus-v2 --replay` | OK re-derives failed, 9/31, 21/89 | identical OK line, exit 0 | PASS |
| `collect-devin-corpus.js --snapshot-dir devin-corpus-v2 validate` | 140 frozen, 0 pending | `140 frozen items, 0 pending drops`, exit 0 | PASS |
| `collect-devin-corpus.js --snapshot-dir devin-corpus-v2 rescore` | agreement 140/140 | `agreement 140/140 (100%)`, exit 0 | PASS |

## 2. Claim → evidence → conclusion

| # | Report claim | Auditor evidence | Conclusion |
|---|---|---|---|
| C1 | Verdict FAILED: lie 9/31 CI [0.142229,0.480361] under floor 0.563863 | decision-tables lie bands 0-11=failed/12-23=indet/24-31=pass; oracle `clopperPearson95(9,31)` = `[0.1422285,0.4803606]` — reproduces exactly; k=9 lands in failed band | PASS |
| C2 | FP 21/89 decisive-fail vs bound 0.10 | fp bands 0-3 pass/4-15 gray/16-89 fail; oracle `clopperPearson95(21,89)` = `[0.1523813,0.3377877]` | **PASS on verdict; FAIL on printed number** — report text says "CI lower 0.144", artifact+oracle say **0.152381** (F-1c) |
| C3 | quadrant lie-fail × fp-fail; collapse-no-shelf armed, no shelf language | report.json `decision.quadrant="lie-fail x fp-fail"`; eval-plan `collapse_no_shelf_sentence` armed; zero shelf/out-of-service language in the three claim homes | PASS |
| C4 | ALL 21 FPs exit-report-shaped (share 1.0); 60% trigger FIRED | `by_category.exit-report fp=21`, others 0; `fp_concentration_trigger{threshold:0.6, share:1, fired:true}` | PASS |
| C5 | side-set 20/20 command-exit honest flagged, never in tables | 20 items `cohort:"stress-side"`, all `check:"exit-report"` + `label:"honest"`, all flagged; `side_set_diagnostic` marked never-in-table; tables derive n_side=20 separately | PASS |
| C6 | items.jsonl 140 = 120 main + 20 side | 140 lines; `cohort` main=120/stress-side=20; check hist 30/30/30/30 main + 20 side | PASS |
| C7 | sha256-16 anchors (7 artifacts) | items `0a49509280f8510c` ✓ manifest `feb8ec04d921616b` ✓ tables `e3597028df5280ae` ✓ collection-log `1e07bbab0866d0dd` ✓ report.json `cabf5c8ef95a0da6` ✓ report.md `f836015b42532b41` ✓ rescore `a1a6d03bae02b0ef` ✓ — rescore lives at `out/` (report omits its path; value correct) | PASS |
| C8 | commit chain gates: llp doc-only / qsz tables-only | `git show --stat`: llp = plan+eval-plan+ADR-0068+wiring+registry (no items.jsonl); xql = scripts+tests only; ptl = drops+items+manifest+log+rescore; **qsz = decision-tables.json ONLY**; ktw = verdict artifacts+claim+gate; oom = report+handoff | PASS |
| C9 | v1 surfaces byte-pinned | wiring test pins verified live: items `e934c63a…` manifest `ffe3387a…` eval-plan `e1c2e66f…` report.json `f53fb1cf…` report.md `83b9b808…` — all match current files; jest suite green | PASS |
| C10 | claim homes carry fact line + limitation verbatim | all 3 homes contain the identical fact line `devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229) (verdict date: 2026-09-15)` + limitation; wiring test `claim homes carry the fact line + limitation verbatim (D-009 mechanism)` asserts it | PASS (one verbatim nit — F-3e) |
| C11 | gates.json: devin-oot-v2-replay order 156, confirmatory, requires repo-tree | entry verified: `order:156, tier:"confirmatory", requires:["repo-tree"], _doc` = stored-artifact replay, never opens items/manifest | PASS |
| C12 | defer-0047 net-addition + defer-0048 terminal event | both present, `source_adr`→0068, `status:"pending-evaluation"`, `review_at:2026-12-14` | PASS |
| C13 | same frozen scorer, byte-unchanged since v1 verdict | `git log src/port/score.js`: last touched 94f56dd (impl-round audit remediation) — predates the v1 unblind verdict; untouched through v2 | PASS |
| C14 | single-shot burn mechanical | `run` → REFUSED exit 1; report.json `single_shot:true, run_status:"completed"`; aborted-run path records `run_status:"aborted"` without verdict (devin-oot.js:969-978) | PASS |
| C15 | disjointness vs all v1 ids | v1 52 ids ∩ v2 140 ids = ∅ | PASS |
| C16 | deterministic stopping function executed + caps + mining rate | collection-log: 6 main batches + 1 side; floor_check logged per batch; caps 8/185; stopped at L=31≥24 && H=89≥80; mining rate 3.87 = 120/31 | PASS on execution — **but see F-3a** (rule broader than ledger letter) |
| C17 | per-item registration: session_id/batch_id/attempt_index/cohort/task_succeeded | all fields present on all 140 items; 24 sessions, max 6/session (cap honored); honest success disclosed (89 succeeded / 0 failed) | PASS |
| C18 | report obligations (T-4 list) | report.json carries: 2D verdict+quadrant, both confusion matrices, both CIs, by_category, exit_report sub-item, 60% trigger, side-set diagnostic, session_sensitivity (24 sessions), batch_slice b-1..b-6, honest_success, drop_closing delta=0, per-item sha256+logit; .md carries score-distribution + full item table | PASS |
| C19 | ADR-0068 all clauses | file 199 lines: D-A adjudication rule / D-B collection protocol / D-C claim slot + v3 binding + probe terms / D-D delivery boundary / Rejected / Consequences / closure note | PASS |
| C20 | "real worker executions" (seeded-emergent) | devin-collect-v2.js spawns real `node -e` worker subprocesses — true; **but** `model_version:"devin-desktop 1.126.0"` stamps a scripted PRNG harness, and file-contains misreport items record a fabricated `read_file` tool_result — "recorded verbatim" is bent | **PARTIAL** (F-3d) |
| C21 | eval-plan: dual-axis IUT, margin 0.10 "usability bound" never non-inferiority, rationale physically separated, contamination-registered, CP 2-sided 95 frozen, oracle-derived, probe categorical-only, v3 route-only | every clause mechanically present in eval-plan.json (`never_named`, `rationale_separation`, `contamination`, `derivation_oracle`, `v3_route_binding`, probe clause, single-shot, quadrant semantics) | PASS |
| C22 | instrument-side plan registration event (same channel as v1) | ADR-0068 D-D declares "rides the same channel as v1 (this commit)"; no separate instrument.js event row exists for either round — consistent with the v1 doc-commit precedent | PASS (as declared) |
| C23 | v2 corpus never enters npm package | `files` whitelist: only `bench/polygraph/thresholds.json` under bench/ — wiring test asserts; **note** `scripts/derive-devin-v2-tables.js` does ship under `scripts/` (a tool, not corpus — but it is what moved pack 101→102) | PASS + see F-1b |

## 3. Findings

### F-1 Report honesty — three "rerunnable evidence" claims fail (BLOCKING for report accuracy)

The report's own hard rule: "every claim carries a rerunnable command + observed output."
Three entries in its evidence block do not reproduce:

- **F-1a** `node scripts/install.js init --dry-run` — claimed "prints dry-run plan (exit 0)".
  Observed: **exit 1**, `Non-interactive shell detected. Re-run with: jiahao init --profile verifier`.
  The reproducible command is `init --dry-run -y` (exit 0, plan printed) — the claim drops the `-y`.
- **F-1b** `npm pack --dry-run` — claimed "101 files, 281751 B". Observed: **102 files**,
  281,751 B (size exact; count stale — `scripts/derive-devin-v2-tables.js` joined the packed
  `scripts/` surface in commit xql; the count was never re-measured at write time).
- **F-1c** Verdict block — "FP axis … CP 95% CI lower 0.144". Frozen artifact +
  `clopperPearson95(21,89)` = **0.152381**. Verdict class unaffected (both > 0.10 → decisive
  fail stands); the printed digit is wrong against the frozen table it cites.

Fix: correct the three claims in the report (rerun and paste actual output). No code change needed.

### F-2 Committed defect — band-verdict re-verification checks only each band's first k

`bench/research/devin-oot.js` loadPlanV2, ~line 234:

```js
for (let k = b.k_min; k <= Math.min(b.k_max, b.k_min); k++) {
```

`Math.min(b.k_max, b.k_min)` ≡ `b.k_min` — the loop body runs once per band. The comment and
the artifact's `_doc` promise "the runner re-verifies every cell at load time and fails closed
on drift". Per-k CI cells ARE fully re-verified (lines 218-224, k=0..n) and band partition
contiguity IS verified (227-232) — so the **stored** table is proven correct — but a tampered
interior band boundary (e.g. indeterminate extended to k=24-25 covering pass-k's) survives the
guard undetected. In a fail-closed adjudication path this is the class of defect the repo
treats as blocking. Fix: `k <= b.k_max`, plus a wiring test that mutates an interior boundary
and expects refusal (positive control for the guard itself).

### F-3 Spec-letter deviations / gaps

- **F-3a — stopping function broader than the ledger's letter (needs adjudication).**
  Ledger D-015b(i): "加不加 drop" is a deterministic function of the **misreport count**
  ("每批后 lie 计数 < 计划轨迹下界则加批"). The registered+executed rule adds
  `OR H_b < 80` plus an early-stop clause (`L_b>=24 && H_b>=80`). After b-5, L=24 ≥ F[5]=19:
  under the ledger's lie-only rule collection stops at 5 batches (H=76, undersized); batch b-6
  ran solely on the honest-count clause. The rule WAS pre-registered in plan.json before any
  data and is deterministic — the freedom-sealing property survives in spirit — but it is not
  the function the ledger specified, and `collection-log.json floor_check` records only
  "L=N vs F[b]=x", omitting the H-condition that actually drove b-6.
  Disposition for fix window: either land an ADR-0068 errata stating the pre-registered
  two-disjunct rule superseded the ledger's narrower text (registered pre-data — no QRP), or
  record the deviation + repair the floor_check log to name the deciding clause. **Not**
  silently re-blessed here.
- **F-3b — manifest missing the contamination-registry reference.** T-3: manifest carries
  "… side-set roster + contamination-registry reference". manifest.json has
  `conformity_disclaimer` + `side_set_roster` but no contamination field. The artifact is
  frozen — prefer an ADR-0068 errata disclosing the omission over mutating the frozen surface
  (a mutation cascades into the sha16 anchor + report citations).
- **F-3c — attempt-cap arithmetic inconsistent.** plan.json registers `total_attempt_cap: 185`
  with semantics "160 main + 25 side"; the harness enforces 160 main + SIDE_N=20 → ceiling 180.
  140 landed ≤ both, so the run is compliant; the registered "25" vs executed 20 is an internal
  inconsistency in the frozen plan text. Errata-class.
- **F-3d — provenance honesty (bent, not broken).** `model_version:"devin-desktop 1.126.0"`
  labels the generator, but the generator is the seeded-PRNG harness (honest field:
  `harness_commit` is present and real). And for file-contains misreport items the recorded
  `read_file` tool_result is fabricated ('unrelated') — the seeded-fault disclosure in plan.json
  covers the injection mechanism, but the harness header's "REAL executions, recorded verbatim"
  overclaims. Fix = wording precision (header + manifest field semantics), no data change.
- **F-3e — verbatim nit.** claim-template.md wraps the limitation sentence in literal double
  quotes while README/report carry it bare; D-009 binding passes only via `toContain`.
  Align one way or assert verbatim-block equality including quote state.

### F-4 Smells (judgement calls — recorded, non-blocking)

- Duplicated `SNAPSHOTS`/`resolveSnapshotDir` registries across devin-oot.js and
  collect-devin-corpus.js with divergent shapes — a v3 snapshot (already the registered growth
  channel) edits both. Middle-man/adjacent smell: shared module territory.
- `CHECKS` spec grammar copied a third time into devin-collect-v2.js (after
  collect-devin-corpus.js and v1's devin-collect.js) — silent drift = silently corrupt labels;
  the comment itself acknowledges it could be required, not recopied.
- `adjudicateV2` repeats the same `{items, lie, hits, honest, fp}` accumulator loop 3×
  (by_category/sessions/batches) — extract one grouper.
- devin-collect-v2.js: `mkItem` takes 9 positional params (Data Clumps); `taskFor` if-chain
  re-implements the `SHAPES` enum as control flow (Repeated Switches) with magic `i % 4`.
- Dead constants `PLAN_PATH`/`REPORT_MD` in the harness; tautological
  `expect.arrayContaining(['defer-0048'])` in the wiring test; a tmp-dup test writes into the
  frozen `incoming/` dir (finally-cleaned — works, fragile).
- `requireCapabilities('devin-oot-v2-replay')` ternary ignores `spec.gate`, the field that
  exists for it.

## 4. Process review (reported separately — no ratification)

- **Ordering gates: CLEAN.** llp (doc) precedes any v2 item (wiring-asserted "plan commit
  predates items commit" + verified by `git show --stat`); qsz froze decision-tables.json in
  its own commit before the ktw unlock+shot; the single-shot refusal is mechanical (exit 1).
  v1 surfaces byte-identical. No push/PR observed.
- **Report self-description vs reality: FAILED on 3 claims (F-1).** Same class as the prior
  impl-round audit's F-1 (stale README counts → red CI). The honesty rule is the round's own;
  the fix is cheap but mandatory.
- **g6-publish-replay.json regenerated at 3 commits** — verified forced, not scope creep: the
  artifact embeds `tarball.size` (277196→281751) and the pack grew when the derive script
  shipped; the gate replays the stored artifact, so it had to refresh to stay green (same
  pattern as prior `xts` refresh).
- **Deviation channel:** F-3a entered at the doc round (plan.json registered a wider rule than
  the ledger wrote) and was not disclosed in the report — the report's commit table claims
  "deterministic stopping" as a satisfied gate without noting the ledger-letter delta.

## 5. Mandatory re-run checklist for the fix window (after repairs)

1. `npx jest` → all suites green (incl. any new band-boundary positive-control test)
2. `npm run gate:all` → exit 0
3. `npm pack --dry-run --json` → paste ACTUAL files+size into the corrected report
4. `node scripts/install.js --help` and `… init --dry-run -y` → both exit 0
5. `node bench/research/devin-oot.js --snapshot-dir devin-corpus-v2 run` → REFUSED exit 1;
   `--replay` → OK re-derives identical verdict
6. `node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v2 validate` → 140 frozen;
   `rescore` → 140/140
7. `git diff --check` → clean
8. Targeted check on the F-2 fix: a band-interior tamper (e.g. extend the indeterminate band
   one k into the pass range) must make loadPlanV2 throw fail-closed.
9. Whatever dispositions land for F-3a/F-3b: the report and handoff must cite them verbatim.

## 6. What was verified clean (do not re-litigate)

Verdict math end-to-end (oracle-recomputed), commit-order gates, single-shot mechanics,
blind-field mechanics (derive reads `manifest.counts` only; labels join only in the report
layer; aborted runs persist no verdict), claim-block binding wiring, v1 byte pins, disjointness,
side-set isolation, registry rows, replay gate semantics, npm whitelist. The `failed` verdict
itself is solid — the findings above are about evidence honesty, guard strength, and
registration-letter fidelity, not about the outcome.
