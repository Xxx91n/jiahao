# grill-t7 unblind-exec AUDIT — independent verification report

Date: 2026-09-15 | Auditor: audit agent (this window) | Scope: `dadc50d...HEAD`
on `grill-t7-unblind-exec` (commits cc7ae18 vts / 08d42a4 zmr / 13014a9 xqz /
a9387bf skm / 7440713 mkn / 2e92d6f upk) | Report under audit:
`.scratch/grill-t7/reports/2026-09-15-report.md` | Spec: ledger D-007..D-011 +
spec-devin-oot.md + handoffs/next-round.md (T-1..T-5).

## Verdict

**NOT CLEAN PASS — 打回返工 (1 hard documented-standard defect + 3 latent
spec-letter gaps + judgement calls).** Every hard-acceptance command re-ran
green on this machine and all 20+ key report claims verified against repo
artifacts (hashes recomputed, CP table independently re-derived), but the
round's self-described exit-code "correction" lands inside the band ADR-0041
explicitly rejects, and three registered spec letters are implemented weaker
than written. Fix list + mandatory re-run checklist at the bottom.

## 1. Hard acceptance re-run (auditor-executed, this machine)

| Command | Report claimed | Auditor observed | Result |
|---|---|---|---|
| `node bench/research/devin-oot.js --validate` | "52 items serialized, 0 defects, positive control OK (labels untouched)" | identical line, EXIT=0 | PASS |
| `node bench/research/devin-oot.js run` | refuses re-run, exit 65 | `REFUSED: a completed devin-oot-report.json already exists - single-shot burn is mechanical`, EXIT=65 — burn mechanically enforced; the CODE is the F-1 defect | PASS (behavior) / see F-1 |
| `node bench/research/devin-oot.js --replay` | "OK: stored artifact re-derives cleanly (indeterminate, k=3/12, CI lower 0.054861)" | identical line, EXIT=0 | PASS |
| `npx jest --silent` | 59 suites / 862 tests, 0 failures | `Test Suites: 59 passed`, `Tests: 862 passed`, exit 0 | PASS |
| `node scripts/run-test-gate.js --expected-suites 59` | (not cited; CI wrapper per prior-round F-1 lesson) | `[test] OK: 59 suites, 862 tests, 0 skipped`, exit 0 | PASS |
| `npm run gate:all` | exit 0 (30 entries, 4 unverifiable ci-mode) | `gate:all exit 0 (30 entries, 4 unverifiable)`; `[154 devin-oot-replay] PASS` inside run | PASS |
| `npm pack --dry-run --json` | 275,397 B < 300,000 cap | size 275397 / 101 files | PASS |
| `node scripts/check-pack-smoke.js` | OK under cap | `smoke OK: jiahao-0.0.1.tgz (275397 bytes, 101 files)` + `budget 275397 < 300000`, exit 0 | PASS |
| `node scripts/install.js --help` + `init --profile verifier --dry-run` | usage + dry-run plan (CLI liveness) | usage block + dry-run plan printed | PASS |
| `git diff HEAD -- bench/research/devin-corpus/manifest.json` | empty | empty | PASS |
| frozen files vs base | thresholds.json / mde-freeze.json frozen | `git diff 94f56dd HEAD` on both: empty | PASS |
| tarball surface | bench/ excluded, src/port + manifest packed | 101 files; only 2 bench paths = `bench/polygraph/{thresholds.json,README.md}` (thresholds whitelisted; README is npm auto-include); 0 devin-oot/oot-report/corpus paths in package | PASS (claim wording loose — "bench/ excluded" should read "bench/research excluded") |

Independent recomputation: CP two-sided 95% CI for k=3/12 = [0.054861, 0.571858]
(bisection over regularized incomplete beta, auditor's own implementation);
boundary slots verified — k=11 lower 0.615204 > floor (PASS band), k=2 upper
0.484138 < floor (FAIL band). Verdict INDETERMINATE at k=3/12 is correct under
the frozen integer table. Artifact sha256 anchors re-hashed and all match:
eval-plan e1c2e66f…, g6-manifest 7ed23909…, items.jsonl e934c63a….

## 2. Claim → evidence → conclusion (key claims)

| # | Report claim | Auditor evidence | Conclusion |
|---|---|---|---|
| C1 | eval-plan.json pre-registered, frozen, all required fields | file exists (+207 in T-1); carries serialization whitelist, integer table verbatim, floor conservative-transfer, -3.049 ban, single-shot, fact-line template + limitation + INDET wording + collapse no-shelf sentence, full-report field list, 3-line branch mapping, abort_on_defect | PASS |
| C2 | T-1 commit landed before any label read | `git show 08d42a4 --stat`: eval-plan + ADR-0067 (+142) + defer-0045 + wiring seeds + README/ci sync in ONE commit at 14:05; run artifact committed at 14:20 (a9387bf); ordering honored | PASS (consistent; see P-3) |
| C3 | adapter whitelist {task, transcript.events, transcript.closing} verbatim + per-item sha256 + abort-on-defect | `adaptItem` (devin-oot.js:163-168) hoists exactly the 3 fields via port.itemText + sha256; `serializeAndScore` returns rows=null on any defect; label/scoring_function never read on scorer path (join only in `adjudicate`, post-serialization) | PASS |
| C4 | single-shot verdict indeterminate, k=3/12, CI [0.054861,0.571858], floor 0.563863 | report.json decision block verified; CI re-derived independently; band 3-10 lookup mechanical | PASS |
| C5 | FP@default 10/40=0.25; guardrail not observed; no non-inferiority claim | report.json fp_count=10, fp_default 0.25, `descriptive_only: true`; report.md prints "not observed" + "never claimed passed"; RoT bound correctly n/a (plan scopes RoT to fp_count=0) | PASS |
| C6 | all 3 hits + all 10 FPs in exit-report shape; drop_closing delta 0 | by_category: exit-report n13/lie3/hits3/fp10, other three shapes 0/0; drop_closing {recall_default 0.25, delta 0} | PASS |
| C7 | runner refuses re-run, exit 65 | observed EXIT=65 + REFUSED line; refusal sits BEFORE label join (adjudicate at :504, refusal at :499) | PASS (behavior); exit-code VALUE is F-1 |
| C8 | replay gate registered order 154, replays stored artifact only | gates.json entry: command `--replay`, tier confirmatory, source_adr 0067, params {replay:true} (ADR-0036 D4), requires [repo-tree]; `replayCheck` opens only plan + report + mde-freeze (wiring spies fs.readFileSync: items.jsonl/manifest never opened); requireCapabilities anchored (ADR-0040 D7d) | PASS |
| C9 | claim surface: fact line + limitation + INDET wording verbatim in all 3 homes | README.md:309-318, claim-template.md:52-58, devin-oot-report.md:13-17 — identical bound block; wiring asserts co-occurrence, @v1+date+CI-lower, no superlatives, no failed-to-reach | PASS (with F-4 weakening note) |
| C10 | defer-0045 net-addition + defer-0046 terminal INDET registered | both rows present, source_adr 0067, review_at 2026-12-14, pending-evaluation; defer-0046 subject carries verdict + CI + v2 branch policy | PASS |
| C11 | ADR-0067 registered same-commit with eval-plan | in T-1 commit; status Accepted; cites ledger D-007..D-011 + ADR-0027/0030/0033/0038/0064/0065/0066; Rejected list R1-R6 matches ledger prohibitions | PASS |
| C12 | adr-0060 tail-assertion fix honest, committed separately before T-1 | cc7ae18 diff: `expect(last).toBe(st.history[len-1])` → compares within conditional_signoff kind only; the invariant's intent (repaired tail is the live sign-off) preserved; still fails red on post-repair signoff lacking expires_at | PASS — scoped, not weakened |
| C13 | "every claim carries a rerunnable command + observed output" | every report claim reproduced verbatim by auditor this session | PASS |
| C14 | jest wiring 34 assertions / suite 59 | test/adr-0067-wiring.test.js 440 lines; covers seeds+whitelist tamper+purity+plan/floor fail-closed+defect matrix+band boundaries+CP recompute+replay drift+claim binding+closure; jest total 862 machine-checked | PASS (count phrasing aside) |
| C15 | no scope creep / governance items out | diff touches exactly the declared surface; no SKILL.md, thresholds, mde-freeze, manifest, items.jsonl, package.json writes; registry deltas = defer-0045+0046 only | PASS |

## 3. D-007..D-011 implementation-evidence check

- **D-007 (scope)** — diff strictly inside T-1..T-5 + the declared vts repair;
  no B/D governance items expanded into the round; devin-corpus@v1 never
  cited by conformity (disclaimers in manifest, plan, report, claim block).
  PASS.
- **D-008 (adjudication rule)** — integer table frozen verbatim in eval-plan
  (auditor recomputed all 13 CP cells); floor re-derived fail-closed from
  mde-freeze; -3.049 banned constant asserted to 1e-12; recall@FP0 marked
  diagnostic_only with its post-hoc threshold disclosed; FP side descriptive
  only; verdict names non-conformity; single-shot clause armed + refusal
  mechanical. PASS.
- **D-009 (claim policy)** — fact line + limitation bound in one block
  verbatim ×3 homes; INDET registered wording present; collapse no-shelf
  sentence registered (unexercised, correctly); superlative/max-of-trials/
  percentage bans machine-asserted. PASS *except* the per-mention binding is
  enforced file-level, not per-mention — F-4.
- **D-010 (round boundary)** — minimal round held: eval-plan + ADR-0067 +
  adapter/runner + single-shot + report + claim line; branch policy
  registered as rules-only (no v2 numerics — R6 honored); defer-0046
  carries the designed-after-v1 disclosure requirement; no governance items
  in the commits. PASS.
- **D-011 (mechanics)** — (1) whitelist verbatim hoist + per-item sha256
  verified in code and artifact rows; (2) abort-on-defect: `serializeAndScore`
  refuses partial rows, but the registered `run_status=aborted` RECORD is
  never written — F-3; (3) eval-plan bench-side only, package surface clean;
  (4) runner/report at registered paths; (5) replay gate = stored-artifact
  re-derivation, corpus never opened (spy-asserted); (6) manifest untouched,
  settlement report-side; (7) ledger mirror D-001..D-011 synced in the docs
  commit (pre-dadc50d, outside this diff — consistent).
  PASS except F-3.

## 4. Findings (打回返工清单)

### F-1 [HARD / documented-standard breach] exit codes 64/65 violate ADR-0041 D3+R1
- `bench/research/devin-oot.js:481` `process.exit(64)` (usage) and `:501`
  `process.exit(65)` (REFUSED) sit inside sysexits 64-78 — the band ADR-0041
  R1 explicitly rejects ("sysexits 64/70/78 subclassing stays rejected",
  ADR-0040 R6). D3's contract is exactly 0/1/2; displaced usage/config
  errors move to exit 1 with a closed-enum stderr prefix `[usage]: /
  [config]: / [internal]:` (src/shared/prefix-vocab.js). `REFUSED:` is not
  in the enum.
- The report's own "Corrections" line cites ADR-0041 D3 for the 2→65 change
  while choosing the ADR's rejected alternative — see P-1.
- `test/adr-0067-wiring.test.js:314` asserts `r.status).toBe(65)`, locking
  the breach into wiring.
- Fix: usage error → exit 1 + `[usage]:` prefix; refusal → exit 1 + enum
  prefix; update the wiring assertion; keep the refusal BEFORE label join.
  Sibling convention: scripts/collect-devin-corpus.js:268-269.

### F-2 [spec-letter weakening, latent] positive control scores item IDs, not itemText
- `devin-oot.js:494` `positiveControl(ser.rows.map(r => r.id))` — the control
  scores "devin-fc-001"-style ID strings; `ser.rows` drops itemText entirely.
  Detection still fires (intercept +10 moves any input; report honestly
  prints "52/52 logits moved"), but the control never exercises serialized
  corpus texts — weaker than the registered "corrupted-manifest positive
  control" intent and the g6-publish corrupted-port precedent.
- Fix: retain itemText on rows (or re-adapt inside the control) so the
  perturbation check runs over the real serialized inputs.

### F-3 [spec-letter gap, latent] abort path never writes run_status=aborted
- ADR-0067 D-B registers "an aborted run records run_status=aborted and
  never a verdict"; eval-plan abort semantics say the same. The abort path
  (devin-oot.js:489-492) only stderrs ABORTED + exit 1 — no artifact row.
  Unexercised on v1 (0 defects), but the registered record is absent.
- Fix: on defect, write a minimal aborted artifact (run_status=aborted,
  defect list, no verdict) or amend the registered wording.

### F-4 [enforcement weakening, latent] per-mention fact-line binding → file-level
- D-009: "任何提及 devin-corpus 处必连带复述判决事实行 (wiring test 强制)".
  The wiring asserts file-level co-occurrence only (if the file mentions
  devin-corpus anywhere, the fact line must exist somewhere in it).
  claim-template.md:45 (prohibited-phrasings) and README.md:270 (ADR-0065
  index slug) mention devin-corpus with no adjacent fact line — currently
  harmless (non-claim contexts), but enforcement is weaker than registered.
- Fix options: tighten the wiring to section/block-level binding, or
  amend the registered rule to name the claim-context scope.

### Judgement-call smells (non-blocking, record only)
- Duplicated Code: devin-oot.js:43-94 (gammln/betacf/betai/betainv/
  cpInterval) re-implements the CP stack already exported from
  scripts/reverify.js:139-211 (`logGamma/incompleteBeta/betaQuantile/
  clopperPearson95`). The in-process recompute is load-bearing as the plan
  tamper check, so an independent implementation is defensible — but two CP
  tables can silently diverge; the 1e-5 wiring cross-check mitigates.
- Mysterious regex: adr-0067-wiring splits items on `/\n?\n/` (runner uses
  `/\r?\n/`); works on LF, sloppy on CRLF.
- Inconsistent root threading: loadPlan/loadCorpus/replayCheck take `root`,
  positiveControl/buildReport hardcode ROOT/PLAN_PATH.
- Bare `node devin-oot.js` defaults to `run` (argv[2] || 'run') — the
  single-shot is one missing flag away; `--validate` default would be safer.
- `seen.add(it && it.id)` flags a malformed id-less item also as
  'duplicate id' (harmless double-flag).
- Observation: `positiveControl` mutates a parsed copy of the shipped
  manifest — correct; and the run path re-serializes the full corpus before
  the refusal check (labels still untouched — burn holds, hoisting would be
  cleaner).

## 5. 过程违规呈报 (process violations — reported, not ratified)

- **P-1** The round's "Corrections inside the round" presents exit 2→65 as a
  standards fix citing ADR-0041 D3. The change actually moved the violation
  into the ADR's explicitly rejected alternative (R1 sysexits). A correction
  that quotes the governing ADR while violating its Rejected list is a
  claim-vs-standard mismatch, however unintentional.
- **P-2** dadc50d (docs branch, 13:45, predating this exec round; the report
  correctly treats it as pre-existing) appended instrument seq-13
  `criteria_change` — the ADR-0066 second_reviewer countersign (F-2 of the
  prior audit, reserved for the USER). The event is DISCLOSED, not hidden:
  `principal_id: "Euiop1"`, `second_reviewer: "Xxx91n"`, authorization field
  verbatim "以后所有全部人工同意，你作为主Agent代替人类签名Xxx91n | 本会话指示:
  签署 (F-2/defer-0042)". I report two open questions, not a ratification:
  (a) a standing delegation for an agent to sign *as* the human defeats the
  independent-second-reviewer purpose the control exists for — whether the
  countersign satisfies F-2 is the user's call; (b) defer-0042's unfreeze_if
  ("second_reviewer countersign lands") is now arguably met, yet the row
  still sits pending-evaluation with no check-in noting the landing
  (registered close rule: same-commit ADR or ledger note — not yet written).
- **P-3** "Exactly one execution" and "validate ran BEFORE the single shot"
  are consistent with all evidence (commit order, artifact timestamps, the
  mechanical refusal) but are not machine-provable: delete-artifact+rerun
  leaves no trace. The design discloses this bound; the report should
  ideally say so.
- No evidence of assertion-weakening beyond F-1's locked exit code: the
  adr-0060 rescope preserves the invariant's intent; all other test deltas
  extend inventories or add assertions.

## 6. Rework requirements for the fix window

Must-fix: **F-1** (exit codes + prefixes + wiring assertion).
Fix-per-decision: **F-2** (control over real itemText or register the weaker
scope), **F-3** (persist aborted status or amend the registered wording),
**F-4** (tighten binding or amend the rule).
Optional: smells above.

Mandatory re-run checklist after any fix (same acceptance + the items this
round's own evidence never covered):
1. `npx jest --silent` → 59 suites / 862 tests (or updated real counts) all pass
2. `node scripts/run-test-gate.js --expected-suites 59` → exit 0
3. `npm run gate:all` → exit 0, 30 entries, 4 ci-mode UNVERIFIABLE,
   `[154 devin-oot-replay] PASS` inside
4. `node bench/research/devin-oot.js --validate` → exit 0
5. `node bench/research/devin-oot.js run` → REFUSED with the NEW contract
   (exit 1 + enum prefix), labels still never joined
6. `node bench/research/devin-oot.js --replay` → exit 0, artifact re-derives
7. `npm pack --dry-run --json` → ≤300,000 B; `node scripts/check-pack-smoke.js` → exit 0
8. `node scripts/install.js --help` + `init --profile verifier --dry-run` → exit 0
9. `git diff HEAD -- bench/research/devin-corpus/{manifest.json,items.jsonl}`
   + `git diff 94f56dd HEAD -- thresholds.json bench/research/mde-freeze.json`
   → all empty
10. defect-path drill (new): feed the runner a synthetic malformed item and
    confirm exit path + the F-3 artifact behavior decided above

Audit performed read-only: no repo bytes modified; working tree clean
(`git status` empty; only gitignored .scratch artifacts written: this report,
audit-diff.patch, audit-diff-stat.txt).

---

## 7. RE-AUDIT after rework commit `skz` (3cd4e19) — 2026-09-15 pass 2

Rework window response audited. History edits verified: `upk` reworded
(2e92d6f -> c4c5441, misleading "2->65 is a fix" line removed), `zmr` amended
(08d42a4 -> c90ca86, ADR-0067 D-C claim-context scope note), `vts` unchanged
(cc7ae18). New stack: vts -> zmr' -> xqz' -> skm' -> mkn' -> upk' -> skz.

Same acceptance suite re-executed by the auditor — all green:

| Command | Observed | Result |
|---|---|---|
| `npx jest --silent` | 59 suites / 865 tests, all pass (see flake note below) | PASS |
| `node scripts/run-test-gate.js --expected-suites 59` | `[test] OK: 59 suites, 865 tests, 0 skipped`, exit 0 | PASS |
| `npm run gate:all` | exit 0, 30 entries, 4 ci-mode UNVERIFIABLE, `[154 devin-oot-replay] PASS` | PASS |
| `node bench/research/devin-oot.js --validate` | 52 items / 0 defects / positive control OK, exit 0 | PASS |
| `node bench/research/devin-oot.js run` | exit 1 + `[config]: REFUSED:` line (closed contract) | PASS |
| `node bench/research/devin-oot.js` (bare) / `--bogus` | exit 1 + `[usage]:` prefix both | PASS |
| `node bench/research/devin-oot.js --replay` | re-derives cleanly, exit 0 | PASS |
| `npm pack --dry-run --json` + pack-smoke | 275,397 B / 101 files, exit 0 | PASS |
| `install.js --help` + `init --profile verifier --dry-run` | exit 0 both | PASS |
| frozen diffs (manifest/items/thresholds/mde-freeze) | all empty | PASS |
| eval-plan sha256 | e1c2e66f… — identical to the artifact anchor (bytes frozen) | PASS |
| report.json | verdict indeterminate, k=3, run_status=completed, 52 items, item schema unchanged (no `text` persisted) | PASS |

Per-finding re-verification:

- **F-1 FIXED** — all fail paths now exit 1 + closed-enum prefix
  ([config]: REFUSED / DEFECT / FAIL-CLOSED / FAIL, [usage]: for argv);
  refusal hoisted before ANY corpus read (labels never even serialized on
  the refused path); wiring asserts status 1 + prefix regexes and locks the
  three refusal/usage surfaces; ADR-0041 D3/R1 now honored, not cited-then-
  violated.
- **F-2 FIXED** — `positiveControl` scores real per-item itemText (rows carry
  `text` in memory; artifact schema unchanged); new test proves the control
  exercises serialized corpus input.
- **F-3 FIXED** — `writeAbortedArtifact` persists run_status=aborted +
  defect list, never a verdict; ordering (refusal first) makes clobbering a
  completed artifact impossible; tmp-root test covers it without mutating
  the real corpus.
- **F-4 FIXED** — ADR-0067 D-C names the claim-context scope + registered
  exemption list; wiring enforces per-mention binding (same `##` section as
  the fact line OR a registered exemption); eval-plan bytes untouched.
- Smells folded in: bare-invocation [usage], refusal pre-corpus-read,
  duplicate-id single-flag, root threading unified, `/\r?\n/` aligned.
- P-3 disclosure added to the report verbatim.

**Flake note (observation, not a rework defect):** the auditor's first
full-suite jest run this pass showed a single red test —
`test/hooks.test.js` "ADR-0017: verifier gate surfaces pending escalation
count" (expected 'Pending escalations: 1', got ''). It passes in isolation
(22/22) and on the clean full-suite re-run (865/865). Timing-sensitive hook
spawn under parallel load (5s timeout). Not touched by skz; recorded for
the next round's hygiene list.

**Standing items (unchanged, user-side):** P-2 — the dadc50d agent-signed
second_reviewer countersign and defer-0042's disposition remain the user's
call (out of rework scope by design).

### Final verdict

**AUDIT PASS.** All F-1..F-4 closed with implementation evidence the auditor
re-ran personally; every report claim now carries a committed artifact or a
rerunnable command. Working tree clean throughout.
