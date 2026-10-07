# grill-t35 second-party audit report, round 3 (re-audit of the final rework wave)

- Date: 2026-10-01
- Auditor: same independent audit window (rounds 1–3); no implementation authority, no fixes applied
- Audit object: `674ce90f` + `3e0adf21` + `13a928af` (the round-3 waves), on the lane audited in rounds 1–2; base still origin/main `78d8a14c`
- Claims under test: `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-report.md` §Findings table rows R2-1..R2-5, and `D:\Aworker\jiahao\.scratch\grill-t35\handoffs\2026-10-01-impl-handoff.md` §Boundary state
- Prior rounds: `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-audit-report.md`, `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-audit-report-r2.md`
- Battery: 17 commands (the round-2 set plus `check-test-git-hermetic`, two `--coverage-base` windows, and `check-map-freshness --tip 78d8a14c`), captured as `P01`–`P17`

## Verdict

**The mechanism is closed. The artifacts are not landable yet.** Both blockers are genuinely fixed, verified below with an oracle I recomputed myself rather than read from their declaration. Two majors remain, both artifact-hygiene rather than design: this wave **introduced new byte corruption into the shipped surface while reporting the corruption class as closed**, and the handoff that says "reproduce before trusting" ships three mutually inconsistent versions of the owner-action figure — including the number round 1 falsified and the same file disavows.

Neither remaining item needs an owner decision or a design argument. They need a byte fix, a re-run, and one reconciled file.

## 1. Battery (auditor-executed, settled tree `13a928af`)

| leg | exit | reading |
|---|---|---|
| P01 `run-test-gate` | 1 | `Test Suites: 1 failed, 94 passed, 95 total`; `Tests: 1 failed, 1635 passed, 1636 total`; sole red `test/adr-0038-wiring.test.js` D1 pack cap. **Matches the rework's claim exactly.** |
| P02 `gate:all` | 1 | 49 legs; red = 196 `pack-smoke`, 231 `post-land-sentinel`; 4 UNVERIFIABLE (ci-mode). 229 `audit-surface` now PASSES. |
| P03 `check-post-land --pre-only` | 0 | green; declares boundary `13a928af` (correct — it is HEAD at run time) |
| P04 `--post-only` / P05 full | 1 | red by design until landing |
| P06 `check-post-land-sentinel` | 1 | **no staleness or timing error at all**; three reds, all post_land: doc-hygiene (R-A bytes at the tip), readme-pairing (baseline absent at the tip), map-freshness (`lacks 125 citation row(s) … README-zh-CN.md:3:613a2471909a…`). The leg now catches the object correctly and reports the honest reason. |
| P07 `build-rewrite-map --check` | 0 | in sync, 3,917 citations |
| P08 `--published-only --check` | 0 | clean |
| P09 `check-governance-inventory` | 0 | 49 entries; two advisory warnings |
| P10 `build-readme-pairing-baseline --check` | 0 | 12 registered over 406 scanned; ratchet holds |
| P11 `check-audit-surface` | 0 | selects an examiner report; see m-6 |
| P12 `check-orphan-ancestry` | 0 | 133 pins / 24 shas |
| P13 `check-map-freshness --tip HEAD` | 0 | 33 claim commits, 0 uncovered, 3,917 rows |
| P14 `check-test-git-hermetic` | 0 | clean |
| P15 `--coverage-base 78d8a14c` | 0 | **the three round-2 coverage failures are gone** |
| P16 `--coverage-base 3e0adf21` | 0 | clean at the second window too |
| P17 `check-map-freshness --tip 78d8a14c` | 1 | 125 rows missing at the public tip — correct behaviour, not a regression |

11 of 17 legs exit 0. Six exit non-zero, and each of those six is either the disclosed owner-action (pack cap) or an honest "not landed yet" (post_land family, tip map). **This is the first round of this loop where every non-zero exit has a stated reason that survives reproduction.**

## 2. R2-1 / R2-2 verified closed — by recomputing their oracle

I did not accept the shipped block. I derived the boundary independently from history with the rule the leg now claims:

- registration `ff4964f3`; newest claim-surface commit touching the judged artifact (the carrier) = `13a928af`;
- newest claim-surface commit **other than** the carrier = `3e0adf21` @ 2026-10-01T15:26:32Z;
- the shipped block declares `3e0adf2125fc5c2902f5eda5c9b469980367eff4` and `ran_at 15:29:55Z`, which is after the derived boundary.

**MATCH.** The declaration equals the world-derived truth, so the block is current rather than self-certified. The code matches the claim: `check-post-land-sentinel.js:213-225` derives `claimRows` from `rev-list reg..HEAD` + per-commit `--name-only`, excludes the carrier, and errors when `declaredSha !== expected.sha` (`:236`); `lastClaimMs` is taken from `expected.ms`, so the LATE RUN check also compares against history, not the artifact.

Two further checks that make the closure credible rather than plausible:
- **The design survives the shape that fooled round 2.** A later claim commit that does *not* touch the judged artifact still becomes `expected` (newest non-carrier), so the stale verdict still fires. Their comment at `:206-211` states exactly this and the code does it.
- **`checkSentinels` is now under test.** `test/post-land-sentinel.test.js:167-274` builds hermetic repos and calls `checkSentinels` end to end, asserting green for a current block (`:243-245`) and one red containing `the block is stale` for the stale shape (`:271-274`). Round 2's complaint — the fixed function had zero coverage — is addressed.

Their framing of the root cause ("a commit cannot name itself; when the claim is about the current state of the world, the oracle must be the world, never the artifact under test") is correct, and the diagnosis that they had committed the same error twice, in opposite directions, is the right generalisation. I have nothing to add to it.

Also verified this round:
- **R2-3** trend row `grill-t35` now declares **13** R2 files including `scripts/check-orphan-ancestry.js` and `bench/research/out/g6-publish-replay.json`; both `--coverage-base` windows exit 0. Their observation that `gate:all` runs the plain inventory form and therefore *structurally cannot* see a coverage-window failure is correct and worth keeping in the record — running `gate:all` was never evidence of coverage conformance.
- **R2-5** measured packed size in this window = **475,502** / 1,746,869 unpacked / 169 entries, exactly their fourth figure. The derived cap is **530,000 at all five values** (474,291 / 474,478 / 474,888 / 475,502 / my measurement), so reframing the cap rather than the byte count as the decision input is sound. **Closed.**
- **R2-7** the mid-line TAB predicate now has a positive fixture (`test/post-land-sentinel.test.js:139-150`). **Closed.**
- **R2-6, half** `fileTracked` is now declared in ADR-0092 as an explicit bullet at `:105-106`. **Closed for that item**; the numbering half is not (m-5).
- **Hermetic routing** (their in-passing fix): every git call in the new provenance tests goes through `hg.git`, temp dirs live in `os.tmpdir()` with `rmSync` cleanup, and `worktree` is correctly treated as a write verb (`:180-181`). P14 exit 0. **Credited.**
- **Sentinel artifact selection is now content-based** (`check-post-land-sentinel.js:147-158`: only in-scope artifacts that actually carry the `SENTINEL` marker are candidates). I verified the code does what is claimed. **Closed.**
- **R2-4** the report's row now states the block is absent by decision, removing the contradiction. **Closed.**

## 3. New findings

| # | Evidence | Conclusion |
|---|---|---|
| **M-7** | A repo-wide byte scan of 1,186 tracked `.js/.md/.json` files finds mid-file `EF BB BF` sequences in exactly two files: `scripts/check-post-land-sentinel.js` @9966 and @9969 (two adjacent BOMs inside a comment), and `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-report.md` @17609. Provenance by blob walk: `8235950c` → 0, `d8653271` → 0, `674ce90f` → **2 + 1**, `3e0adf21` → 2 + 2, `13a928af` → 2 + 1. So **this round introduced them**, in the wave whose subject is escape/encoding corruption of committed artifacts. Can the strengthened battery see the class? No: `docHygiene(Buffer.concat(['a line of text ', EF BB BF, 'more text\n']))` → `[]`, and `docHygiene` of the actual shipped sentinel file → `[]`. U+FEFF is not in the C1 range the scanner tests (`/[\u0080-\u009f]/`) and is not a control byte, so it is outside the signature set entirely; separately, the scanner's scope is `.scratch/*.md`, so `scripts/**` is never scanned at all. | **Major, must fix before landing.** This is structurally the same lesson R-A recorded — "the t18 set exempted TAB outright, which is exactly how this byte walked through the battery" — now repeated one class over, by the repair wave itself, and left in both a governance script and the claim artifact that reports the class as closed. Functionally benign (the file loads and runs; V8 strips a leading BOM only, and these are mid-comment), so the defect is integrity-of-artifact, not behavior. Fix is mechanical: strip the three sequences, extend the signature set to flag `U+FEFF` anywhere except byte offset 0, and decide whether doc-hygiene's scope stays `.scratch/*.md` or widens to shipped text — the second is a contract change and belongs in ADR-0092 or a successor, not in a comment. |
| **M-8** | The committed handoff at `D:\Aworker\jiahao\.scratch\grill-t35\handoffs\2026-10-01-impl-handoff.md` carries **two** §Boundary state blocks and **three** different pack figures: `:36` says 474,478; `:50` says 474291; `:79` says **471,521** — the figure round 1 falsified, and which `:64-65` of the same file explicitly disavows ("the first report's 471,521 / 432,782 were wrong"). Both boundary blocks also still say "1631 tests"; the settled count this window measured is 1636. | **Major.** The section is headed "reproduce before trusting", and a next-session agent that does exactly that gets 475,502 and 1636, and must conclude the handoff is unreliable — for the third wave running, and in the one artifact whose job is to be trusted without re-derivation. This is the same claim/state class as R2-1 and R2-5, now in the handoff rather than the report. Fix: delete the stale duplicate block, reconcile all figures to one measured set with a point-in-time label, and re-run the list top to bottom before shipping it. |
| **m-5** | ADR-0092 `:60-65` states "The distinct declared items are three: this enumeration-surface change, the defer-0030 subordination strengthening, and the anti-masking two-segment read with its TSA decision folded in. **Numbering now matches the count.**" The actual labels are `:57` Declaration 1 of 3 = enumeration-surface; `:179` 2 of 3 = anti-masking; `:195` 3 of 3 = **no TSA with an armed trigger**. So the sentence names defer-0030 as one of the three, while defer-0030 carries no number and TSA — which the sentence says is folded in — is its own numbered declaration. spec §9 lists four required subjects. | **Moderate.** The duplicate is gone but the note now misdescribes the labels it claims to match, and the fourth spec subject (defer-0030 subordination strengthening) is still unnumbered. Generate the count sentence from the labels, as ADR-0091's derive-from-source mechanism recommends, so this cannot drift again. |
| **m-6** | "13 verification legs all exit 0" is not reproducible as stated: my 17-leg battery yields **11** exit-0 legs, and the committed boundary list contains 7 commands, two of which their own annotations mark exit 1. Separately, `check-audit-surface.js:56-63` still selects by first-commit-date/mtime — the flake they removed from the sentinel is latent here — and leg 229 passes only because an examiner report is what gets selected; `extractCoverage` against the round report still fails with `audit-coverage v1 block missing`. Both of those are disclosed by the round itself, so they are open-by-declaration rather than hidden. | **Minor.** The count claim is harmless in intent and wrong in fact; the classifier/ADR question is correctly parked as an owner act. Worth noting that after three rounds the *only* remaining coverage-block issue is one the round explicitly declined to paper over. |
| **p-3** (still open, now root-caused) | The shipped block still prints `control byte 0x8 @1424, mid-line TAB (eaten-$ class) @1589`. True byte index of that TAB in the pre-repair blob is **1597**. Cause: `doc-hygiene.js:32` iterates the **byte** buffer while `:53` iterates `t = buf.toString('utf8')`, a **character** index — so one hits string mixes two addressing units, and any multi-byte character before the TAB shifts the second number down (here by 8). | **Minor, now precisely diagnosable.** Two options: report byte offsets consistently (map the character index back), or label each unit. A forensic address that is not replayable defeats the purpose of the convention that produced it, and the round-1 prose already cites 1597, so the same file disagrees with itself. |
| nit | `docHygieneFile` is still exported and called by nobody; `check-post-land.js:56` still imports `requireCapabilities` without calling it (`exitUnverifiable` *is* used at `:254,:262`, so spec §3's capability requirement is partially served); the sentence at `check-post-land.js:156-157` still asserts the pre-B-1 mechanism ("The child runs with cwd = the tree under judgment, so it reads THAT tree's map") before the B-1 FIX note corrects it; `doc-hygiene.js:47` still says "848 committed md/txt files" where the corpus is larger. | **Minor.** The stale comment is the one that matters: it argues for the bug that was just removed, in the file that removed it. |

## 4. Scorecard across three rounds

| Item | R1 | R2 | R3 |
|---|---|---|---|
| B-1 assertion object | blocker | fixed | **verified closed by behavior + code** |
| B-2/R2-2 sentinel self-reference | blocker | broke it sideways | **verified closed by independent oracle recomputation** |
| R2-1 stale block | — | blocker | **verified closed** |
| M-1 one scanner | major | fixed | holds |
| M-2/R2-5 pack figures | major | major | **closed as measurement; derived cap 530,000 stable** |
| M-3 acceptance honesty | major | fixed | holds |
| M-4/R2-6 `fileTracked` | major | partial | **declared in ADR**; numbering residual (m-5) |
| M-5 Δ2 enumeration | major | fixed | holds (the 125-row failure is the proof) |
| R2-3 coverage declaration | — | major | **closed**, both windows green |
| R2-4 self-contradiction | — | major | **closed in the report**, re-opened in the handoff (M-8) |
| R2-7 TAB fixture | — | moderate | **closed** |
| New this round | | | **M-7 BOM corruption**, M-8 handoff figures |

## 5. Recommendation

Land-able after two mechanical repairs, with no further design work:

1. Strip the three `EF BB BF` sequences (`scripts/check-post-land-sentinel.js` @9966/@9969, `.scratch/grill-t35/reports/2026-10-01-report.md` @17609), then decide and record whether `U+FEFF` joins the signature set and whether doc-hygiene's scope widens beyond `.scratch/*.md`. If the signature set changes, ADR-0092 D-M1 must say so — that is the channel this round itself established.
2. Collapse the handoff's duplicate §Boundary state into one block, reconcile every figure to a single freshly measured set with a point-in-time label, and run the list top to bottom before shipping. While there, fix `check-post-land.js:156-157`'s pre-B-1 sentence.
3. Then re-run §1's battery unchanged and re-check the two assertions this round was built on: the sentinel reports no staleness/timing error, and my derivation of "newest claim commit other than carrier" equals the declared boundary.

Nothing else in this report blocks landing. The corpus refresh and the cap amendment (530,000, from any of the four measurements) remain owner acts, correctly unminted by the agent for three waves running.

## 6. Coverage attestation

Split form: **4 checklist command entries re-executed verbatim in this window** (`npm install --ignore-scripts`, `npm run gate:all`, `node scripts/run-test-gate.js`, `node scripts/check-post-land.js`) **+ 22 attested from the archived CI log of run 36743467940** (6 corpus-restore fragments behind the owner-held `JIAHAO_BENCH_CORPUS_B64` secret; 16 summary-aggregation fragments needing a `needs:` graph that exists only inside the workflow). **45 raw captures + 0 fixtures** at `D:\Aworker\jiahao\.scratch\grill-t35\audit-evidence\` — 17 new this round (`P01`–`P17`), 13 in round 2 and 15 in round 1 — referenced by path and count only. This round also ran 6 ad-hoc probes: the repo-wide BOM scan, the injected-BOM scanner test, the independent boundary derivation, per-ref BOM traces across five commits, three pack measurements, and `extractCoverage` against the round report. `check-map-freshness --advisory-only` remains unexecuted and is deliberately absent, as in rounds 1–2.

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

## 7. Side effects of this window (third occurrence)

`npm run gate:all` again rewrote the tracked file `D:\Aworker\jiahao\bench\research\out\g6-publish-replay.json`; `git status` shows it as the only non-`.scratch` modification. Left unreverted for the standing reason — this window cannot prove the file was clean before the gate ran, and `but discard` could destroy another agent's edit. The non-idempotence the round correctly ruled out of its own scope is now reproduced three times across three waves, and it is the mechanism by which an R2 file gets into a claim commit uninvited (round-2's R2-3 was partly this). Restoring is one command if the owner wants the tree handed back clean.

No implementation file was authored or edited; no `but` mutation of any kind was performed. Scratch battery script lived in `.codex-tmp/` (gitignored) and will be removed with the window's other artifacts.
