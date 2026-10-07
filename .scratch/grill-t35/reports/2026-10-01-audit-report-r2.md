# grill-t35 second-party audit report, round 2 (re-audit of the rework wave)

- Date: 2026-10-01
- Auditor: same independent audit window as round 1 (no implementation authority, no fixes applied)
- Audit object: rework commit `d8653271` ("grill-t35 rework: fix the two blocking audit findings and the majors"), 20 files, on top of the lane re-audited in round 1; base still origin/main `78d8a14c`
- Rework claims under test: `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-report.md` §Findings table + §"Audit coverage" section, and `D:\Aworker\jiahao\.scratch\grill-t35\handoffs\2026-10-01-impl-handoff.md` §Boundary state
- Round-1 baseline: `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-audit-report.md`
- Battery: the same 13-command set as round 1 plus 3 repeat pack measurements; every figure below was produced in this window.

## Verdict

**FAIL again — but for a narrower and more diagnostic reason.** 8 of the 11 round-1 items are genuinely closed, including both blockers' proximate symptoms. What failed is not the code this time; it is the **claim layer on top of it**. The rework fixed the mechanism and then shipped a report whose central evidence block, boundary count, pack figure, and one disposition row do not describe the tree the rework commit created. The rework's own closing sentence — "every defect was a claim about state that a command would have settled" — is true of its own rework as well, and three of its fresh claims are exactly that kind of claim.

- 2 blockers (R2-1, R2-2): the sentinel block was never regenerated, and the B-2 fix removed the only check that could notice.
- 3 majors (R2-3, R2-4, R2-5): the "only red is the pack cap" boundary claim is false (4 reds); a disposition row asserts a block that provably is not there; the pack figure does not reproduce.
- 3 moderates, 2 minors. 1 round-1 rework instruction of mine was **wrong** and is retracted in §5.

## 1. What is genuinely fixed (verified by behavior, not by reading)

| Item | Verification in this window |
|---|---|
| **B-1** post_land judged the lane | `--root` is passed at `check-post-land.js:165,174` and honoured at `check-map-freshness.js:367`/`check-orphan-ancestry.js:27`, threading into `loadFreshness(root)` (`evidence-freshness.js:63-66`, `path.join(root, …)`). Behavioural proof: `--post-only` now **fails** map-freshness with `tip docs/rewrite-map.json at HEAD lacks 125 citation row(s) … (first: 71f3d4df6 README-zh-CN.md:3:613a2471909a…, README-zh-CN.md:69:051744a7…, README-zh-CN.md:182:994bdeb3)` — rows that exist only in the published tip's view. The 4-leg subset now judges four objects that are all the tip. **Closed.** |
| **M-1** scanner copied, hole still open | `test/adr-0076-wiring.test.js:9` requires `scripts/shared/doc-hygiene`; the local `function docHygiene` is gone; the corpus assertion at `:573` and the fixtures at `:589,604,621` all run the shared predicate. The strengthened set is therefore live in jest and in CI's test job. **Closed** (residual in R2-7). |
| **M-2** pack numbers did not reproduce | Corrected to 474,291 / 451,664 with the 471,521→472,857→474,291 progression shown, and the derivation now follows its input (`ceil10k(474,291×1.10)=530,000` — I recomputed it). The honest admission that 432,782 was subtraction, never measurement, is credited. **Closed on method**, with R2-5 on the value. |
| **M-3** acceptance gate mislabeled `met` | Now **NOT MET** with the reason stated. **Closed.** |
| **M-4** `fileTracked` undisclosed | Acknowledged in `check-map-freshness.js:246` and, importantly, named as "a REAL loosening" with two branch tests at `test/map-freshness.test.js:191,209`. **Substantially closed**; the ADR still does not carry it (R2-6). |
| **M-5** mirror unenumerated | `DOC_PATH_RE` is now `/^(docs\/|README[^/]*\.md$|AGENTS\.md$|CONTEXT\.md$|\.scratch\/)/` (`build-rewrite-map.js:67`), so `README-zh-CN.md` is enumerated — and the post_land failure above is direct evidence the enumeration works, since it is reporting mirror citations it could not see before. **Closed.** |
| **m-4** `151 of 151` | Corrected to 135 of 151, matching my round-1 measurement exactly. **Closed** (the supporting number is wrong, R2-8). |
| **M-6** `gate:all` never run | `gate:all` was run this wave, its result recorded, and the *reason* for not self-attesting a coverage block is argued honestly rather than papered over. **Closed as a process act**; R2-4 catches the table row that contradicts it. |
| Anchor soundness (not raised in round 1) | I checked it unprompted because the ratchet's validity depends on it: `982b52ec` sits at index 359 of the oldest-first published line and the mirror's creating commit `533e97b8` at 360 — the pairing window therefore opens one commit after the mirror exists, so the baseline never demands an impossible obligation. **Sound.** |

## 2. New and remaining findings

| # | Claim as made by the rework | Auditor evidence | Conclusion |
|---|---|---|---|
| **R2-1** | The report carries a `post-land-verify v1` block describing this wave. | One block in the file, and it is **byte-for-byte the round-1 block**: `"last_claim_mutation": "f3c56469…"`, `"ran_at": "2026-10-01T06:24:18.852Z"`, `"wave_commits": 757`, `27 claim commit(s) … 3902 map row(s)`, `398 scanned`. A fresh `--pre-only` run on the settled tree in this window produced `"last_claim_mutation": "d8653271…"`, `ran_at 13:27:25Z`, `29 claim commit(s)`, `3905 map row(s)`, `400 scanned`. Every field moved; none of the moved values is in the shipped block. | **Blocker.** The rework changed the claim surface (`d8653271` touches the report) and never re-ran the battery whose output that block is supposed to be. This is the E-19 clause quoted verbatim in AGENTS.md — "after the LAST `but` mutation and before declaring, re-run `--check` against the settled tree … never declare inside the exposure window" — violated by the wave that wrote the clause. The post_land half of the shipped block is now actively misleading: it says `map-freshness pass`, while the correct post_land verdict is `FAIL … lacks 125 citation rows`. |
| **R2-2** | B-2 "fixed — bounded by the declared `pre_land.last_claim_mutation`, with the sha validated as a claim-surface ancestor; **negative test keeps the teeth**." | `check-post-land-sentinel.js:171-188` reads the boundary from the block's own declaration and validates only three things: sha-shaped, touches the claim surface, is an ancestor of HEAD. **Nothing asserts that no later claim mutation exists.** Proof by execution: round 1 the same file failed with `FAIL: pre_land: ran_at … predates the wave's last claim-surface mutation`; this round `N06-sentinel.log` contains **no timing failure at all** — only the two expected post_land rows — even though two claim-surface commits (`8235950c` @06:28Z, `d8653271` @13:09Z) landed after the declared boundary `f3c56469` @06:20Z. Separately, `grep` shows the test file exercises only `extractSegments` and `judgeSegment` with a hand-built `ctx`; **`checkSentinels`, the function containing the entire B-2 fix, is called by no test.** | **Blocker.** The unsatisfiability was real and is gone, but it was cured by deleting the check's independence rather than by scoping it correctly: the block now attests its own boundary, so the exact event the leg exists to catch — battery not re-run after the last change — passes silently. R2-1 is that event, and it passed. "Teeth remain" describes the arithmetic, not the provenance, and the provenance is untested. |
| **R2-3** | Handoff twice: "1631 tests; the only red is the pack cap"; "The single red test is `test/adr-0038-wiring.test.js` D1." Also "1628/1631" in the summary to the owner. | `node scripts/run-test-gate.js` → exit 1, `Test Suites: 4 failed, 91 passed, 95 total`, `Tests: 4 failed, 1627 passed, 1631 total`. The 4 reds: `adr-0038-wiring` D1 (pack cap), **plus** `adr-0081`, `adr-0083`, `adr-0084` coverage legs, each `Expected: 0 / Received: 1` from `check-governance-inventory.js --coverage-base 78d8a14c`. Reproduced directly: `FAIL: coverage: bench/research/out/g6-publish-replay.json is R2 but undeclared in the latest row (t21 audit C-1)` and `FAIL: coverage: scripts/check-orphan-ancestry.js is R2 but undeclared in the latest row`. `docs/governance/trend-inventory.json`'s `grill-t35` row declares 11 R2 files; `d8653271` landed 13, and the two undeclared ones are exactly the flagged pair. | **Major.** The boundary claim is false again, and the mechanism of the error is worth naming: `gate:all` runs the inventory leg **plain**, where `check-governance-inventory.js` exits 0; only the `--coverage-base <round>` window form catches it, and that form is reachable only through jest. Running `gate:all` (the M-6 fix) therefore did not surface these three. The rework's own ADR-0076 D-B carve-out declaration is incomplete for its own wave — an R2 machinery edit shipped undeclared. |
| **R2-4** | Report `:384`: "M-6 … **coverage block added**". | `grep "<!-- audit-coverage v1 -->" .scratch/grill-t35/reports/2026-10-01-report.md` → no match; the leg's own extractor (`extractCoverage` from `check-audit-surface.js`) fails with `audit-coverage v1 block missing`. The same file at `:556-558` states the opposite: "I considered adding the block and **rejected it**… this report carries NO coverage block." | **Major, and a repeat of round-1 p-1 in kind.** A summary-table row asserts a fact contradicted 170 lines later in the same document. The reasoning at `:556` is correct and creditable; the table row is simply false, and a reader who reads only the table — which is what a leg-229 auditor or a seal reviewer would — records the item as closed. |
| **R2-5** | Committed `g6-publish-replay.json` `tarball.size = 474291`; report `:296` says check-pack-smoke "agrees". | Three consecutive `npm pack --dry-run --json` runs on the settled tree: **474478, 474478, 474478** — deterministic. `gate:all` in this window reported `tarball 474478 bytes`, not 474291. So the committed value does not describe the committed tree; it describes some earlier state. Immediately after my `gate:all` run, `git status` again shows ` M bench/research/out/g6-publish-replay.json` — the leg rewrote it, exactly as round 1 §8 described. | **Major, but bounded in consequence.** The owner-action's decision figure is unaffected: `ceil10k(474,478×1.10)` and `ceil10k(474,291×1.10)` both give **530,000**, so no cap decision changes. What is broken is the evidence discipline — a shipped artifact recording a measurement the shipped tree does not reproduce — plus the standing defect that a gate leg mutates a tracked file every run and no leg asserts the recorded size equals a fresh measurement. |
| **R2-6** | ADR-0092 as the contract channel for the coverage semantics. | `grep -iE "file.?track|carries any|any row at all|scope clause" docs/adr/0092-….md` → **no match**, while D-M2 still asserts "the map committed at the published tip must cover the citation set of every claim commit on that line, taken as a union" and the code's `|| fileTracked(c.file)` branch makes that sentence false about its own implementation. Separately, the rework's numbering note at `:62-65` lists the three distinct items as *enumeration / defer-0030 subordination / anti-masking with TSA folded in*, but the labels at `:57,164,180` are *1 = enumeration-surface, 2 = anti-masking, 3 = no TSA* — so **defer-0030 is claimed as a declaration and carries no number**, and spec §9 asks for four subjects. | **Moderate.** "3 of 3" is self-consistent with its labels and inconsistent with both its own note and spec §9. The route this repo chose for exactly this class is ADR-0091's derive-from-source mechanism; the numbering prose should be generated from the labeled declarations, not kept beside them. |
| **R2-7** | The TAB predicate is a hardened, locked signature. | No positive fixture exists for it anywhere (`grep "TAB"` in `test/` returns only the comment at `adr-0076-wiring.test.js:559`). It is live via the corpus assertion, which is real coverage — but deleting the branch would leave the corpus green, because no committed file currently contains a mid-line TAB. | **Moderate.** The hole is closed for today's corpus and unlocked against tomorrow's edit. Add a fixture with a mid-line TAB (and one with a leading TAB that must stay exempt). |
| **R2-8** | "the mirror didn't exist for the first 376 commits". | 393 non-merge commits precede `533e97b8`. And the substantive fact the sentence was reaching for is stronger than the number: of the 135 unpaired README-touching commits, **123 precede the mirror's creation and only 12 follow it** — so the full-history figure is 91% non-existence noise, and the 12 the anchored baseline registers *is* the entire real post-mirror set. | **Minor.** Wrong number, and the correct framing would have made the design self-evident rather than apologetic. |
| **R2-9** | (nothing claimed) | `check-post-land.js:56` still imports `requireCapabilities` without calling it; the `--root` comments at `:154-157` still describe the pre-fix mechanism ("The child runs with cwd = the tree under judgment, so it reads THAT tree's map"), which is now the *wrong* explanation of a now-correct behaviour; `docHygieneFile` remains exported and uncalled. | **Minor.** Stale comments on freshly-fixed code are the defect class ADR-0034's lineage has chased for several rounds; here the comment argues for the bug that was just removed. |

## 3. Retraction — my round-1 rework instruction was wrong

Round 1 M-5 asked the rework to "register `613a2471` on the Δ2 exemption surface". **That instruction should not have been given.** Measured in this window: `git for-each-ref --contains 613a2471` → `refs/remotes/gb-local/grill-t34-impl`, i.e. the object **is** reachable in the local store, while `git merge-base --is-ancestor 613a2471 origin/main` → exit 1. The registry's verb therefore correctly refuses it, and the honest classification is ADR-0089's `local-only` — which the rework shipped as 22 committed rows in `docs/rewrite-map.json` carrying `"class":"local-only"`, `"resolved_to":null`, `"reachable_via":["refs/remotes/gb-local/grill-t34-impl"]`, and recorded the non-registration as E-28. Had they complied, they would have committed a false orphan fact on my authority. Their pushback is correct and better than my instruction. The rework's substantive part of M-5 — the enumeration gap — is fixed.

I also tested, and then **withdrew**, a suspicion this round: because `orphan-ancestry` printed identical results for the main repo, a tip worktree, and an older-tip worktree, I initially read that as `--root` being inert there. It is not: the pin set is registry-derived and `anchors.json` is byte-identical (3,704 bytes) at all three refs, so identical output is the correct output. Stating the retraction rather than leaving it in the finding list.

## 4. D-00x movement since round 1

| ID | Round 1 | Now | Basis |
|---|---|---|---|
| D-003 Δ2 | partial | **met** | enumeration surface extended and proven by the tip-side failure it now produces |
| D-004 | not met on its central clause | **met on the object, unmet on the bound** | B-1 closed; `--root` proves the subset judges the tip; "wave-bounded" still nominal (round-1 m-1 unchanged) |
| D-005 | met with reservation | **met, reservation narrowed** | authority declared and tested; the ADR sentence still misstates `fileTracked` |
| D-006 | met | **met, stronger** | mirror enumeration now covers the file the rule is about; anchor soundness verified independently |
| D-007 | not met (unsatisfiable) | **not met (cured by weakening)** | R2-2 |
| D-008#2 | half-done | **met** | single scanner, both callers |

## 5. Required for a third pass (short, and mechanical)

1. **Regenerate the sentinel block and ship it in the same commit that changes the claim surface.** Nothing else in this list matters until the block describes its own tree. Concretely: after the last edit, run `check-post-land.js`, paste the output, and assert in the same wave that the block's `last_claim_mutation` equals `git rev-list -1 --no-merges` over claim-surface paths at HEAD.
2. **Restore the timing check's independence without restoring the paradox.** Derive the boundary from the tree — latest claim-surface commit over `reg..HEAD` **excluding the commit that last modified the attesting artifact** — and assert the declared boundary equals that derivation. Then add tests that call `checkSentinels` (not just `judgeSegment`) on fixtures where a *third* claim commit lands after the block's own carrier; today's stale block is the regression fixture, and it is already real.
3. **Declare the two missing R2 files in the `grill-t35` trend row** (`scripts/check-orphan-ancestry.js`, `bench/research/out/g6-publish-replay.json`) and re-run the three coverage legs at `--coverage-base 78d8a14c` to green before restating the boundary claim. Then restate it as measured.
4. **Fix the `:384` table row** to say what `:556` argues, or add the block — either is consistent; the current pair is not.
5. **Put `fileTracked` in ADR-0092 D-M2** (or drop it from the code), and generate the declaration numbering from the labels so note and labels cannot diverge.
6. **Add the TAB fixture pair** (mid-line TAB fires; leading TAB stays exempt).
7. Owner decisions, unchanged from round 1 and still not yours or mine to mint: the pack-cap amendment (now with a correct 474,478 and an unaffected 530,000 candidate), the corpus refresh, and whether the examiner-vs-implementer classifier conflation (round 1 §4.6, and R2-4/R2-1's shared root) becomes its own round.

## 6. Coverage attestation

Split form: **4 checklist command entries re-executed verbatim in this window** (`npm install --ignore-scripts`, `npm run gate:all`, `node scripts/run-test-gate.js`, `node scripts/check-post-land.js`) **+ 22 attested from the archived CI log of run 36743467940** (6 corpus-restore fragments, owner-held secret; 16 summary-aggregation fragments, which need a `needs:` graph that exists only inside the workflow). **28 raw captures + 0 fixtures** at `D:\Aworker\jiahao\.scratch\grill-t35\audit-evidence\` — 13 new this round (`N01`–`N13`), 15 from round 1 — referenced by path and count only. The 13 battery commands are `run-test-gate`, `gate:all`, `check-post-land` in all three modes, `check-post-land-sentinel`, `build-rewrite-map --check`, `build-rewrite-map --published-only --check`, `check-governance-inventory`, `build-readme-pairing-baseline --check`, `check-audit-surface`, `check-orphan-ancestry`, and `check-map-freshness --tip HEAD`; plus 5 ad-hoc probes (three `--coverage-base` bases, three consecutive pack measurements, two throwaway worktrees for the `--root` threading test, `git for-each-ref --contains 613a2471`, and the leg-229 extractor run against the round report). The `--advisory-only` surface remains unexecuted and is deliberately absent from this array, as in round 1.

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
  "echo \"aggregate green - all $expected needed jobs report success\"",
  "node scripts/check-post-land.js"
]
```

Leg 229 `audit-surface` currently passes **because this file exists** (uncommitted ⇒ mtime-newest ⇒ selected). That is my attestation, not the round report's; the committed `.scratch/grill-t35/reports/2026-10-01-report.md` still fails the extractor, as R2-4 states.

## 7. Side effects of this window (second occurrence, now with a determinism result)

Running `npm run gate:all` again rewrote the tracked file `D:\Aworker\jiahao\bench\research\out\g6-publish-replay.json` (`474291` → `474478`), which is the only non-`.scratch` working-tree change this window made. I left it unreverted for the same reason as round 1: this audit window cannot prove the file was clean before the gate ran, and `but discard` on it could destroy another agent's edit.

Round 1 §8's non-idempotence finding is now reproduced and sharpened: the leg is deterministic within a session (474,478 three times) but the committed artifact disagrees with the committed tree by 187 bytes, so **the recorded measurement cannot be reproduced from the tree that ships it** — and every `gate:all` run re-dirties it. If the owner wants this window's tree handed back clean, the one-command restore is `but discard` on that file's uncommitted id; I have not run it.

Two temporary detached worktrees were created for the `--root` threading tests (at `origin/main` and `89b92487`) and both removed; `git worktree list` shows only the primary. Scratch script confined to `.codex-tmp/` (gitignored), now deleted.
