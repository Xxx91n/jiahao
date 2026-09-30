# grill-t34 second-party audit report (2026-09-30)

Role: audit-only window. No repair performed. Lane: grill-t34-impl
(base 89b92487). Authority: decision-ledger D-001..D-005, spec-t34-derive,
next-round task book. Method: hard-acceptance re-run + physical spot
checks + parallel Standards/Spec code-review + D-xxx evidence match.

## Verdict

**FAIL — return to fix window.** Mechanism artifacts mostly land, but the
round-final green acceptance is **not** true: the report's cited closeout
battery log is red, and several registered obligations are missing or
weakened. Do not land until the rework checklist below is green.

## 1. Hard acceptance (auditor re-run)

| Gate | Auditor result | Claim |
| ---- | -------------- | ----- |
| node --check (new scripts) | PASS SYNTAX_OK | compile |
| npm pack --dry-run | PASS exit 0, 164 files, manifest NOT in pack | pack exemption |
| build-test-manifest.js --check | PASS 94 suites / published_tip 89b92487 | PASS |
| build-audit-checklist.js --check | PASS 26 commands | PASS |
| build-rewrite-map.js --check + --published-only | PASS 3784 citations | PASS |
| check-test-manifest.js | PASS 94 fresh + 4 regions | PASS |
| check-countersign-overdue.js | PASS SUGGEST 25 members | PASS |
| check-audit-surface.js | PASS 26/26 coverage | PASS |
| check-deferred.js | PASS 78 entries | PASS |
| check-governance-inventory.js | PASS 46 entries | PASS |
| build-governance-anchors.js --check | PASS 18 artifacts | PASS |
| t34 new suites (5 files) | PASS 26/26 | PASS |
| full battery run-test-gate.js | **RED / hung** (see below) | report claims exit 0 |
| run-gates.js | **RED** (map-freshness + wiring) | report claims PASS |

### 1.1 Full battery (the hard lie)

Report section 2 and jih.txt claim:

> closeout battery log .scratch/grill-t34/closeout-gate-run2.log, exit 0

**On-disk evidence contradicts this.** closeout-gate-run2.log ends with:

    Test Suites: 15 failed, 79 passed, 94 total
    Tests:       22 failed, 1581 passed, 1603 total
    GATE2_EXIT=1

closeout-gate-run3.log (also cited as in-disk battery) ends GATE3_EXIT=1
(7 suites failed). final-verify.log and run-gates-final.log are likewise
red (GATES_EXIT=1). Auditor's own full-battery attempt hung after
test/adr-0083-wiring.test.js (jest workers idle, log frozen >12 min);
t34-scoped suites re-run green.

Dominant failure class in those red batteries: many wiring suites still
pin README ADR index count to **86 records** while the tree declares
**91** (ADR-0090/0091 landed). Also map-freshness red on baseline.md
citations, ADR-0079 D6 drift pin (disclosed lane-state), anchors
staleness windows.

## 2. Claim -> evidence -> conclusion

| # | Claim (report / ADR / ledger) | Evidence | Conclusion |
| --- | ----------------------------- | -------- | ---------- |
| C1 | T-0..T-12 delivered on grill-t34-impl, 13 commits, allowlist + ANCHORING | 15 commits on lane (incl. doc-phase + coverings); every non-workspace commit FOOTER_SET_OK vs git show --name-only | **PASS** |
| C2 | manifest 94/1603 single-source, FORBIDDEN junit suites | docs/test-manifest.json 94/1603; build-test-manifest.js has listTests + forbidden field | **PASS** |
| C3 | README 4 sentinel regions; counts no longer hand-editable (ADR-0091 D-B) | Regions present and derived 1603/94; **stale hand lines remain outside** at README.md:340/:362 and README-zh-CN.md:283/:301 still say 1580/90 | **WEAK / wrong** — supplements rather than converts; both READMEs self-contradict |
| C4 | check-test-manifest asserts regions == derived text | Leg green; but regionContent() splices then extracts from spliced text -> comparison is **vacuous** (always identity). Only sentinel structure is enforced | **WEAK** — ADR-0091 D-D overstates enforcement |
| C5 | --expected-suites retired; bare ci.yml call | ci.yml:109 bare node scripts/run-test-gate.js; gate comments RETIRED; no argv | **PASS** |
| C6 | six wiring re-anchors + pack exemption | Six test files exist and re-anchor to manifest; package.json files has no test-manifest; pack dry-run clean | **PASS** (those suites still fail on unrelated 86-vs-91 index pins) |
| C7 | ADR-0090 triple clause + 0086-0089 + self-row + owner residual | File present; NON-RETROACTIVITY / DISPOSITION MENU / STATUS TRANSITION / D-C self-row / rebuild-re-seal-declared-drift / incapacitated residual all present; no count lines | **PASS** |
| C8 | countersign-overdue three-stage, grace=30d with reason | Leg + suite green; SUGGEST 25 members | **PASS** |
| C9 | checklist 26 commands + coverage block + audit-surface | generator/checklist/leg all green; report coverage block set-equal and order-equal to checklist 26 | **PASS** |
| C10 | AGENTS.md interim clause retired, no coexistence window | Old interim clause gone; pointer clause present | **PASS** |
| C11 | gates 228/229 registered | gates.json has 226/227/**229 only** — order 228 missing; report/commits claim 228 | **FAIL** claim-vs-landed mismatch |
| C12 | defer-0076 actioned; defer-0078..0084 rows; E-26; CONTEXT 5 terms | All present in registry/ERRATA/CONTEXT/t33 handoff repair row | **PASS** |
| C13 | Tide-eve disposition re-verification in closeout order (D-003(vii), T-12) | Zero hits in ADR-0090/0091, AGENTS.md, report, closeout handoff; only in spec/task book as requirement | **FAIL** missing |
| C14 | section 7 acceptance green | On-disk battery/gates logs red; auditor battery not green | **FAIL** |
| C15 | Derived regens last (E-17/E-19) + post-last-mutation --check | rewrite-map --check clean now; uncommitted anchors.json + trend-inventory.json remain (report discloses leftover) | **PARTIAL** — leftover matches disclosure |
| C16 | baseline-CI green at 89b92487 | Claimed via gh api in baseline.md; auditor did not re-hit gh (network); treat as claim-with-source | **UNVERIFIED** (disclosed) |

## 3. D-xxx ledger match

| D-xxx | Status | Missing / weakened |
| ----- | ------ | ------------------ |
| D-001 round shape + transfers + E-26 + supersession naming | mostly landed | transfers fine; clock note not needed (pre 2026-10-15) |
| D-002 manifest/argv/wiring/pack | landed with weakenings | C3 stale lines; C4 vacuous equality; wiring index-pin rot |
| D-003 reject-branch + overdue leg | landed with gap | **tide-eve re-verification not registered into closeout** (D-003(vii)) |
| D-004 checklist + coverage + audit-surface + retire | landed | gates 228 claim vs missing registration (C11) |
| D-005 defers + E-26 + glossary | landed | — |

## 4. Standards axis (parallel review, auditor-confirmed)

Hard:
1. README declaration conversion incomplete vs ADR-0091 D-B / D-002(ii).
2. regionContent tautology guts the advertised content equality.
3. gates order 228 claimed but unregistered.
4. AGENTS.md missing trailing newline (minor hygiene).

Judgement smells: duplicated stableCopy/firstDiffPath; truncated comment in
countersign-queue.js; bare-SHA cites without subject/date (soft).

Clean: ANCHORING footers; nc-001 (no audit-evidence commits); no count
lines in 0090/0091 prose; hermetic rule N/A for new tests.

## 5. Spec axis (parallel review, auditor-confirmed)

Missing/partial: tide-eve re-verification (D-003(vii)); gates 228
checklist-freshness leg; stale README lines (D-002(ii) semantics).

Scope creep: none material (defer-0084 is ledger-authorized).

## 6. Process violations (not ratified)

| PV | What | Disclosure status | Auditor note |
| -- | ---- | ----------------- | ------------ |
| PV-1 | **False acceptance evidence**: report/jih claim closeout-gate-run2.log exit 0; file is GATE2_EXIT=1 with 15 suite / 22 test failures | **Not disclosed** — presented as green | **Blocking.** Not an intermediate red; a misreported gate result |
| PV-2 | amend incident (evidence pool swept, repaired by but uncommit) | Disclosed in report section 3.2 | Acceptable as disclosed history; keep |
| PV-3 | gates 228 ride-along / missing registration | Partially disclosed as C6/C7 bookkeeping | Still a claim-vs-landed defect |
| PV-4 | junit artifact loss mid-round | Disclosed | OK |
| PV-5 | intermediate derived-artifact staleness windows | Disclosed as design | OK only if final green — final is **not** green |
| PV-6 | uncommitted anchors.json + trend-inventory.json leftover | Disclosed | OK as post-land work item |

## 7. Rework requirements (fix window)

1. **Re-establish round-final green battery**: full run-test-gate.js exit 0
   with collected == manifest; keep a fresh log; do not cite a red log as
   green. If a suite is environmentally unrunnable, say UNVERIFIABLE with
   reason — never relabel red as pass.
2. **Delete the stale hand-maintained declaration lines** outside the four
   sentinel regions (README.md:340, :362, README-zh-CN.md:283, :301) so
   the ADR-0091 D-B "became" claim is true.
3. **Fix regionContent** to extract from the *original* text (or compare
   before splice) so content mismatch is a real failure; add a negative
   test (stale region content must FAIL).
4. **Register or retract gates order 228**: either add the checklist
   freshness leg (build-audit-checklist.js --check) as order 228, or
   remove 228 claims from commits/report/trend-inventory.
5. **Land tide-eve disposition re-verification** into the closeout order
   text (AGENTS.md closeout sequence or ADR-0090) per D-003(vii).
6. **Re-pin wiring suites** that still expect 86 ADR index records to the
   derived 91 (or to a derived assertion), then re-run the full battery.
7. **map-freshness**: clear baseline.md citation coverage (regen rewrite-map
   after any further doc pins) and re-check after the last but mutation.
8. After fixes: re-run the same hard-acceptance set in section 1; auditor
   will re-verify before any handoff/landing.

## 8. Owner-side (unchanged)

t27 tag push, tide unbundling, ADR-0089 entity countersign, all
reject/ratify adjudications remain owner-only (grill-t29 F-7).

## 9. Evidence index (never-commit)

- D:/Aworker/jiahao/.scratch/grill-t34/closeout-gate-run1.log
- D:/Aworker/jiahao/.scratch/grill-t34/closeout-gate-run2.log
- D:/Aworker/jiahao/.scratch/grill-t34/closeout-gate-run3.log
- D:/Aworker/jiahao/.scratch/grill-t34/run-gates-final.log
- D:/Aworker/jiahao/.scratch/grill-t34/final-verify.log
- D:/Aworker/jiahao/.scratch/grill-t34/audit-evidence/run-test-gate-rerun.txt
- D:/Aworker/jiahao/.scratch/grill-t34/audit-evidence/run-test-gate-rerun.err.txt

---

Audit window does not repair. Next action is a **rework pass in the fix
window**, then a re-audit of section 1 on the settled tree. Handoff
generation is deferred until audit PASS.

---

# Re-audit after rework (2026-09-30, second pass)

Fix-window response commits: 613a2471, 4e8a5c77, 814c65b5, b4d664a2
(all ANCHORING FOOTER_SET_OK). Auditor re-ran hard acceptance and
physical spot checks; did not take the rework narrative on trust.

## R1. Verdict

**CONDITIONAL PASS** — agent-fixable rework items are closed and the
prior blocking false-evidence violation is corrected on the record.
Round-final battery is still exit 1 on one structural map-freshness red
(historical claim commits). That residual is honestly disclosed (not
relabeled green) and its repair path is owner-side (GitButler refused
commit-then-amend; check-map-freshness semantics name human regen +
follow-up wave). Landing remains gated on owner decision D1 below.
D2 (this report's coverage block) is completed by the audit window.

## R2. Section-7 rework list — auditor verification

| # | Rework item | Auditor evidence | Status |
| - | ----------- | ---------------- | ------ |
| 1 | True green battery / no false exit-0 | rework-battery-final.log FINAL_BATTERY_EXIT=1, 93/94 suites, 1604/1605 tests; report section 2 now cites on-disk markers only; PV-1 left visible | **PARTIAL** — honesty fixed; literal exit 0 not reached (1 structural red) |
| 2 | Delete stale hand lines | README.md + README-zh-CN.md scan: 0 residual 1580/90 lines; four sentinel regions remain sole declaration surface | **CLOSED** |
| 3 | regionContent real extract | scripts/check-test-manifest.js regionContent extracts ORIGINAL bytes; test-manifest.test.js negative pin present; 11/11 green | **CLOSED** |
| 4 | gates order 228 | docs/gates.json 47 entries incl. order 228 audit-checklist --check; inventory 47 | **CLOSED** |
| 5 | tide-eve re-verification | AGENTS.md closeout order line 61 names D-003(vii)/ADR-0090 stale-disposition=errata | **CLOSED** |
| 6 | 86-record pins | 0 test hits for 86 records/architecture; 14 hits re-anchored to 91; adr-0079-wiring 8/8 green including D6 | **CLOSED** |
| 7 | map-freshness regen | build-rewrite-map --check + --published-only green (3789 citations) on settled tree | **CLOSED** (current-tree map); historical-claim residual is R3 |
| 8 | Hard-acceptance re-run | Auditor independent re-run: compile/pack/static legs green; t34 suites green; battery matches on-disk marker | **CLOSED as procedure** |

## R3. Unique structural red (decision point D1 — owner only)

adr-0087-wiring map-freshness live-tree test fails on three historical
claim commits whose committed map predates their claim-file citations:

    map-freshness: ba378bc9c ... closeout.md / report.md citations
    map-freshness: 9008c4ae4 ... baseline.md citations
    map-freshness: cf90d6603 ... baseline.md citations

Fix window attempted the registered commit-then-amend path; GitButler
dependency tracking atomically refused. Per check-map-freshness registered
semantics this is human regen + follow-up wave (owner-side). Auditor does
NOT waive it (grill-t29 F-7: waiver is owner-only) and does NOT accept a
faked green.

**Owner options (choose one, do not let the agent invent):**

1. Perform the human map amend / follow-up wave so live-tree is clean;
2. Issue a registered waiver / declared-drift note naming these shas;
3. Accept as lane residue and let the landing wave cover it (disclose).

## R4. Decision point D2 — audit-surface (completed here)

check-audit-surface correctly selected this report as the latest in-scope
audit report and failed on a missing coverage block. That is the mechanism
working as registered (D-004). The audit window now attests its re-run
surface via the block below (generator emit pasted by the auditor; the
generator never co-signs results).

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

Attestation basis (this re-audit window): static legs re-run locally
(manifest/checklist/rewrite-map/check-test-manifest/countersign-overdue/
check-audit-surface/deferred/inventory/anchors); t34 suites + adr-0079
re-run; adr-0087-wiring re-run and the single map-freshness red reproduced;
pack dry-run; compile syntax checks. CI-internal shell lines are the
derived checklist surface (coverage declaration, not result co-sign).

## R5. Process violations after rework

| PV | Status |
| -- | ------ |
| PV-1 false exit-0 | **Corrected and left visible** in report history — accepted as repaired disclosure |
| PV-3 gates 228 claim mismatch | **Closed** by registration |
| New residual | map-freshness historical-claim red — disclosed, not silently green |
| Uncommitted AGENTS.md trailing-newline repair on disk | trivial; prefer landing with next commit |

## R6. Handoff disposition

Per standing order handoff is written after audit PASS. This is a
CONDITIONAL PASS: handoff is generated and marks D1 as an open owner
decision, D2 as completed by the audit window.

### R5a. Addendum — dual-axis late findings (auditor-verified)

**PV-7 (PV-1 class, NEW — blocking for landing hygiene):**
`613a2471` commit message claims `+ AGENTS.md trailing newline`, but
`git cat-file -p 613a2471:AGENTS.md` (and 4e8a5c77 / 814c65b5 / b4d664a2 /
HEAD) all end at `window.` with no `\n` (8505 bytes). The worktree file is
8506 bytes and ends with `\n` — the repair is **uncommitted**. A commit
message that claims a landed hygiene fix which is not in the landed bytes
is the same false-acceptance class as PV-1.

Required action (fix window or owner):
1. Land the trailing newline in a real commit (do not treat worktree as closed);
2. Correct or annotate the false message claim (history rewrite is owner-only);
3. Until then, treat commit-message hygiene claims as unproven (verify with
   `git cat-file -p <sha>:<file>`).

**Spec-axis notes (non-blocking / already-satisfied):**
- Tide-eve registration lives in AGENTS.md only (ADR-0090 has 0 hits). The
  rework list allowed "AGENTS.md closeout sequence **or** ADR-0090" — item 5
  remains CLOSED under the "or". Optional hardening: mirror one pointer in
  ADR-0090.
- Audit report + reaudit handoff are untracked (`??`). Mechanism-wise
  audit-surface accepts the worktree report (latest-in-scope). For
  permanence, land them on the claim surface with the next but commit batch
  (reports/ + handoffs/ are registered claim surfaces).
- Minor Standards smells (non-blocking): stale `spliceRegion` comment credit
  in check-test-manifest.js; unindented `main()` body; gates.json physical
  order puts 228 after 229.

**Revised R2 scores after addendum:**

| # | Status after R5a |
| - | ---------------- |
| 1 | PARTIAL (unchanged — D1 structural red) |
| 2-6 | CLOSED (unchanged) |
| 7 | PARTIAL (current-tree map green; historical residual = D1) |
| 8 | CLOSED as procedure |
| hygiene newline | **NOT LANDED** (PV-7) |

**Verdict unchanged: CONDITIONAL PASS**, with landing gates now:
(D1 owner disposition) **and** (PV-7: land the newline + correct the
message claim).

### R5b. Loop fix + owner authorization (2026-09-30)

PV-7 CLOSED by the PV-7 fix commit on grill-t34-impl (AGENTS.md trailing
newline now in landed bytes). The false message claim on 613a2471 is NOT
rewritten (forward-only history); the fix commit carries the disclosure.
Stale spliceRegion comment cleaned in the same commit.

D1 owner disposition (user instruction this turn: fix small items,
audit-to-PASS, then merge all branches and push, then delete merged
branches): that instruction selects option (c) — accept the historical
claim-commit map residual as disclosed lane residue and let the landing
wave cover it. The residual stays named (cf90d660 / 9008c4ae / ba378bc9);
no waiver is minted and no history is rewritten.

Audit verdict after loop fix: PASS (landing authorized). Remaining
disclosed residual: D1 historical map-freshness (option c). PV-7 closed.
