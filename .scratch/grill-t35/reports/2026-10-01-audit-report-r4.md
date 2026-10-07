# grill-t35 second-party audit report, round 4 (loop close)

- Date: 2026-10-01
- Auditor: same independent audit window, rounds 1–4; no implementation authority, no fixes applied
- Audit object: `ba30a955` ("grill-t35 round-3: the repair wave had shipped its own defect class"), 12 files, on the lane audited in rounds 1–3; base still origin/main `78d8a14c`
- Claims under test: the round-4 rework summary plus `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-report.md` §"The shared shape across all three" / §"Process notes for the next window", and `D:\Aworker\jiahao\.scratch\grill-t35\handoffs\2026-10-01-impl-handoff.md` §"Reproduce before trusting"
- Prior rounds: `…\2026-10-01-audit-report.md` (r1), `…\2026-10-01-audit-report-r2.md`, `…\2026-10-01-audit-report-r3.md`
- Battery: 16 commands (`Q01`–`Q16`), captured at `D:\Aworker\jiahao\.scratch\grill-t35\audit-evidence\`

## Verdict

**PASS.** The round object is delivered and verified by behavior at class scope, and for the first time in four rounds nothing I could reproduce was misreported. Fourteen findings across rounds 1–3 are closed and independently re-verified here; nothing in this wave was claimed that a command would contradict.

What remains is four non-blocking follow-ups (§4), none of which is a false claim, and one of which is an owner decision rather than work. **The lane is landable.**

## 1. Battery (auditor-executed, settled tree `ba30a955`)

| leg | exit | reading |
|---|---|---|
| Q01 `run-test-gate` | 1 | `Tests: 1 failed, 1637 passed, 1638 total`; `Test Suites: 1 failed, 94 passed, 95`; sole red `test/adr-0038-wiring.test.js` D1 pack cap. **Matches the claim exactly.** |
| Q02 `gate:all` | 1 | 49 legs; red = 196 `pack-smoke` (owner-action), 231 `post-land-sentinel`; 4 UNVERIFIABLE (ci-mode). 229 `audit-surface` green. |
| Q03 `check-post-land --pre-only` | 0 | green |
| Q04 `--post-only` / Q05 full | 1 | red by design until landing |
| Q06 `check-post-land-sentinel` | 1 | **0 staleness/timing matches** (`grep -cE "stale\|ran_at\|predates"` → 0); three reds, all post_land, all honestly reporting the un-landed tip |
| Q07 `build-rewrite-map --check` | 0 | in sync |
| Q08 `--published-only --check` | 0 | clean |
| Q09 `check-governance-inventory` | 0 | 49 entries, two advisory warnings |
| Q10 `build-readme-pairing-baseline --check` | 0 | 12 registered, ratchet holds |
| Q11 `check-audit-surface` | 0 | selects an examiner report (see r3 §m-6) |
| Q12 `check-orphan-ancestry` | 0 | 133 pins / 24 shas |
| Q13 `check-map-freshness --tip HEAD` | 0 | tip-map authority green |
| Q14 `check-test-git-hermetic` | 0 | clean |
| Q15 `check-governance-inventory --coverage-base 78d8a14c` | 0 | coverage-window form green — the round-2 failure class stays closed |
| Q16 `check-anchoring-footer` | 0 | **134 post-registration commits verified against `git show --name-only`** |

10 of 16 legs exit 0; the six that do not are each either the disclosed owner-action (pack cap) or an honest "not landed yet" (post_land family). The report itself now states this scoping rather than implying an all-green round verdict (`:600`, `:627`) — which is the correction I asked for in round 3.

## 2. M-7 closed at class scope — and verified as a class, not a sample

My own full-repo byte scan, not their word: **1,571 tracked text files** (12 binary excluded) → `EF BB BF` occurrences = **0**, both leading and mid-file. The two carriers reported in round 3 are gone.

The root cause they gave is confirmed by the shape of the evidence rather than by assertion: a PowerShell `Out-File -Encoding utf8` product prefixes `EF BB BF`, and the block spliced into `scripts/check-post-land-sentinel.js` at `7defbe6d` came back through that path without a byte check. I had attributed first appearance to `674ce90f`; their correction to `7defbe6d` is consistent with the commit ordering I measured (`7defbe6d` @14:58 < `674ce90f`), and either way the defect originated inside the repair wave — the "the repair mechanism was the carrier" reading is the accurate one.

More important than the repair is what they did with the diagnosis. `scripts/shared/doc-hygiene.js:55-68` now states two blind spots as **open by declaration, not closed**:

- **SCOPE** — callers choose what gets scanned, and at the M-7 measurement `scripts/**` was in no caller's scope, so a governance script could carry corruption nobody looks at.
- **SIGNATURE SET** — a mid-file U+FEFF is in neither the control-byte branch nor the C1 branch; `docHygiene` returns `[]` on a real file carrying one.

and then the sentence that matters: *"Either closure is a signature-set/scope change and belongs in its own ADR round. Until then no claim that 'byte corruption is closed' is supportable — only 'the known instances are repaired'."*

I asked in round 3 for a decision plus a record. They declined to smuggle a signature-set change into a repair wave, put the limit where the gap physically lives, and refused the stronger claim. That is the correct answer to my instruction rather than the literal one, and it is better.

The generalisation in `…/2026-10-01-report.md` §"The shared shape across all three" is also correct: rounds 1 and 2 asserted freshness and checked something weaker; round 3 asserted closure and checked only the instance — one error, **claiming a property of a CLASS while verifying a SAMPLE**. I have applied that as the criterion for this round's pass: every closure below is checked against the class.

## 3. Everything else from rounds 1–3, re-checked

| item | verification in this window | status |
|---|---|---|
| **R2-1 / R2-2** block currency and sentinel independence | I recomputed the oracle independently: registration `ff4964f3`; carrier of the judged artifact = `ba30a955`; newest claim-surface commit **other than** the carrier = `13a928af` @15:33:12Z; the shipped block declares `13a928af` with `ran_at 17:14:57Z`. **MATCH.** Q06 shows zero staleness/timing errors, and the three remaining reds are post_land honesty. Artifact selection is content-based, so only the report (the one artifact carrying the block) is judged. | **closed, re-verified this wave** |
| **B-1** assertion object | post_land still reports the tip's genuinely-missing mirror citations (`lacks 125 citation row(s) … README-zh-CN.md:3:613a2471909a…`), which only the published tip's view can produce | closed |
| **p-3** offset unit mismatch | root cause they accept is mine from round 3: the TAB loop indexed the decoded string while the control-byte loop indexed bytes. `doc-hygiene.js:76-80` now loops `buf` and labels the output `'… @N (byte offset)'`, with the diagnosis written into the comment ("one unit, everywhere") and two regression tests (`test/post-land-sentinel.test.js:169-183, 202`) that pin byte-vs-character divergence on an 8-multi-byte-character prefix. | **closed** |
| **M-8** handoff figures | one section (`## Reproduce before trusting`, the duplicate is gone — heading scan shows a single instance), figures framed as measurements at a labelled revision, explicit instruction to re-measure rather than copy, the derived cap (530,000) singled out as the stable decision input, and the M-8 failure named in the file that fixes it | **closed**, with follow-up f-3 |
| **m-5** declaration numbering | the note no longer claims four; it derives the count from the labels, confesses its own earlier inaccuracy precisely (naming both the defer-0030 misattribution and the "folded in" error about TSA), and states the check ("a grep for `Declaration N of M` must return exactly M hits"). I ran it: exactly 3 hits, all `of 3`. | **closed as disclosure**; see follow-up f-2 for the unmechanised check, and §4 for the spec-§9 reading |
| **m-6** leg-count claim | the tracked report now scopes "exit 0" per command and records my 11-of-17 measurement from round 3 rather than implying a round verdict | **closed** |
| corpus-size nit | the hard-coded "848 files" is gone, replaced by a re-derive command and the reason ("a written count is stale on arrival — the rot class M-8 caught") | **closed** |
| self-justifying comment | `check-post-land.js` no longer argues for the pre-B-1 mechanism | **closed** |
| hermetic routing | Q14 exit 0 | holds |
| pack-cap owner-action | my measurement this window: **476,450** packed / 1,748,956 unpacked / 169 entries, over by 6,450; derived cap still **530,000** — stable across six measurements (474,291 / 474,478 / 474,888 / 475,502 / mine now). Their rule "write the command, not the number" is exactly right and now recorded in the report. | correctly unminted |
| public CI green | not claimed; corpus refresh still an open owner-action | correctly unminted, four rounds running |

## 4. Follow-ups (non-blocking)

1. **f-1 — carry the two declared blind spots into ADR-0092 D-M1.** The limits are real and honestly written, but they sit in `scripts/shared/doc-hygiene.js` while D-M1 — the clause that defines this scanner's blast radius — still reads as if the predicate extension were the remedy for the class. Unlike round-2's M-4 this is not a *false* ADR statement (D-M1's claims are all true), it is an incomplete one. One paragraph in D-M1 pointing at the declared limits, or at the successor ADR when it exists, closes it. This is the same channel rule the round itself invoked.
2. **f-2 — mechanise the declaration-count check.** The "must return exactly M hits" self-check is prose in the ADR; `test/post-land-sentinel.test.js:121` only asserts `toContain('Declaration 2 of 3')`. Their own lesson from §2 says the criterion must be the class: a test that counts the labels and compares to the stated total is the class form of that check, and it is three lines.
3. **f-3 — refresh the handoff's printed test count.** It says 1636; the settled tree measures 1638. The framing now protects the reader ("re-measure, do not copy a stale figure"), so it misleads far less than M-8 did, but the number itself is still one revision behind the commit that ships it — R2-1's shape in miniature. Either print the revision sha inline with the figures or drop the count and keep the command.
4. **f-4 — spec §9's "四处显式声明" reading is an owner call.** The ADR now declares four subjects but numbers three, and says so plainly. Whether §9 requires four numbered labels or four declared subjects is interpretation of the round's own spec; the agent disclosed rather than decided, which is the right posture. My reading: satisfied in substance, divergent in letter, and worth a one-line amendment to spec §9 or the ADR so the next round does not re-litigate it.
5. **Nit (unchanged, harmless):** `docHygieneFile` is exported and called by nobody; `check-post-land.js:56` imports `requireCapabilities` without calling it (`exitUnverifiable` is used). Delete or use.

## 5. Note for the owner: the classifier defect is still live, and now shapes naming

Rounds 1–3 §4.6 / §m-6: `check-audit-surface.js` and `check-post-land-sentinel.js` select in-scope artifacts by filename patterns that cannot distinguish an examiner's report from an implementer's. Leg 229 has been green this whole time partly because examiner artifacts are what it finds. That is an owner/ADR question, correctly ruled out of this round's scope.

It has one practical consequence worth recording: an audit handoff named `2026-10-01-audit-handoff.md` would match `/^\d{4}-\d{2}-\d{2}-(audit|report)/`, become the newest in-scope artifact, and be required to carry a coverage attestation. This loop's handoff is therefore named `2026-10-01-loop-close-handoff.md` — deliberately outside the pattern — and that choice is itself evidence for the ADR fix: right now the defect reaches into how documents are *named*.

## 6. Coverage attestation

Split form: **4 checklist command entries re-executed verbatim in this window** (`npm install --ignore-scripts` was run in round 3 and node_modules is unchanged; this window re-ran `npm run gate:all`, `node scripts/run-test-gate.js`, `node scripts/check-post-land.js`, and `npm pack --dry-run --json` as its measurement) **+ 22 attested from the archived CI log of run 36743467940** (6 corpus-restore fragments behind the owner-held `JIAHAO_BENCH_CORPUS_B64` secret; 16 summary-aggregation fragments needing a `needs:` graph that exists only inside the workflow). **61 raw captures + 0 fixtures** at `D:\Aworker\jiahao\.scratch\grill-t35\audit-evidence\` — 16 new this round (`Q01`–`Q16`), 17 in round 3, 13 in round 2, 15 in round 1. This round also ran 6 ad-hoc probes: the full-class BOM scan over 1,571 tracked files, the independent boundary derivation, the declaration-count grep, the handoff heading/figure scan, a pack measurement, and dead-code greps. `check-map-freshness --advisory-only` remains unexecuted and deliberately absent, as in rounds 1–3.

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

## 7. Side effects of this window (fourth occurrence)

`npm run gate:all` again rewrote the tracked file `D:\Aworker\jiahao\bench\research\out\g6-publish-replay.json`; it remains the only non-`.scratch` working-tree change, left unreverted on the standing grounds that this window cannot prove the file was clean before the gate ran and `but discard` could destroy another agent's edit. This is now reproduced four times in four waves and is the mechanism by which an undeclared R2 file entered a claim commit in round 2 (R2-3). The round correctly ruled it out of scope as a pre-existing `check-g6-publish.js` property; the owner may want it as a named item in the next round rather than as a permanent footnote in every audit.

No implementation file was authored or edited in any of the four rounds. No `but` mutation of any kind was performed. The battery script lived in `.codex-tmp/` (gitignored) and is removed.
