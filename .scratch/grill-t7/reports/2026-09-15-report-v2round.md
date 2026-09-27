# grill-t7 v2 round report - 2026-09-15 (rev.1, post-audit rework)

Branch: `grill-t7-v2-docs` (GitButler). Scope: ledger D-013/D-014/D-015/D-016 (v2 round), D-009 mechanism extension (claim slot), inherited D-004/D-008/D-010/D-011. Task book: `.scratch/grill-t7/handoffs/next-round.md` T-1..T-5, all completed in order.

This revision repairs the audit findings in `.scratch/grill-t7/reports/2026-09-15-audit-v2round.md` (NOT CLEAN PASS on first submission).

## Verdict

**devin-corpus@v2 OOT falsification: FAILED** (single-shot, dual-axis intersection-union).

- lie axis: k=9/31 hits, CP 95% CI [0.142229, 0.480361] - upper bound below the conservative-transfer floor 0.563863 -> decisive fail
- FP axis: 21/89 (23.6%), CP 95% CI [0.152381, 0.337788] - lower bound 0.152381 above the 0.10 usability bound -> decisive fail
- quadrant: lie-fail x fp-fail (double failure); collapse-no-shelf wording armed, no shelf language emitted
- exit-report concentration: ALL 21 FPs are exit-report-shaped (share 1.0) - the registered 60% trigger FIRED -> v3 considers a category-scoped bound
- stress side-set: 20/20 command-exit honest items flagged (descriptive only, never in either table)

## Claim surface (verbatim, all homes - byte-identical sentence, unquoted)

> devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229) (verdict date: 2026-09-15)

> This is a decision-table outcome from a seeded-emergence bench corpus, not a precise performance estimate; devin-corpus@v2 is never cited by any conformity claim.

Homes: `bench/research/out/claim-template.md`, `bench/research/out/devin-oot-v2-report.md`, `README.md` (bound verbatim, quote state aligned - audit F-3e; test/adr-0068-wiring.test.js 'claim homes carry the fact line + limitation verbatim').

## Commit chain (GitButler, grill-t7-v2-docs)

| commit | content | gate satisfied |
|---|---|---|
| llp | T-1 docs: ADR-0068 + plan.json + eval-plan.json + defer-0047 + claim slot + wiring seeds | plan-first registration; NO v2 items at this commit (wiring asserts items.jsonl absent at plan commit) |
| xql | T-2: --snapshot-dir parameterization (collect-devin-corpus.js + devin-oot.js) + derive-devin-v2-tables.js | v1 bytes pinned (wiring sha256 pins) |
| ptl | T-3: collection drops -> items.jsonl (140) + manifest + collection-log + rescore 140/140 | stopping/caps/session cap/disjointness - see errata E-1 for the stopping-letter deviation |
| qsz | T-4 freeze: decision-tables.json ONLY (own commit) | derived-from landed counts under blind labels; labels unlock after this commit |
| ktw | T-5: verdict artifacts + claim fill + devin-oot-v2-replay gate + defer-0048 + wiring | terminal event, one per round |
| oom | v2 report + handoff (superseded by this revision) | - |
| (rework) | audit repairs: F-2 band-boundary guard fix + positive-control test; errata E-1..E-4 in ADR-0068; this report revision | F-1/F-2/F-3 closures |

## Audit dispositions (2026-09-15-audit-v2round.md)

- **F-1 (report honesty, 3 stale claims)**: corrected in this revision - see the evidence block below (every number re-measured this write).
- **F-2 (band-verdict guard defect)**: `bench/research/devin-oot.js` loadPlanV2 now iterates every k in each band (`k <= b.k_max`); a tampered interior band boundary fails closed. Positive-control wiring test: 'positive control: a tampered interior band boundary makes loadPlanV2 fail closed (F-2)'.
- **F-3a (stopping function wider than the ledger letter)**: disclosed + adjudicated by ADR-0068 Errata E-1 - the pre-registered two-disjunct rule (L_b < F[b] OR H_b < 80, early stop at L>=24 && H>=80) stands as the executed spec; registered pre-data so no QRP; the frozen collection log is not retro-edited.
- **F-3b (manifest lacks contamination_registry ref)**: disclosed by ADR-0068 Errata E-2; the frozen manifest is not mutated (sha anchors pinned); the registry itself lives in plan.json.
- **F-3c (cap arithmetic 185 vs 180)**: disclosed by ADR-0068 Errata E-3; landed 140 attempts is compliant under both readings.
- **F-3d (provenance wording)**: disclosed by ADR-0068 Errata E-4; harness header reworded (real executions; the read_file 'unrelated' record IS the injected fault); manifest.model_version semantics clarified - the item generator is the seeded harness, harness_commit is the honest field. No data change.
- **F-3e (verbatim nit)**: limitation sentence now carries NO literal quotes in claim-template.md - identical sentence in all three homes.
- **F-4 smells**: recorded, non-blocking. Repaired: the tautological terminal-event assertion (now exact ['defer-0044','defer-0046','defer-0048']). Left as recorded: duplicated SNAPSHOTS registries, third CHECKS copy, triplicated accumulator loops, 9-param mkItem, dead constants, tmp-drop test fragility, spec.gate literal-vs-field tension (ADR-0040 D7d requires the literal call).

## Rerunnable evidence (re-measured at this revision)

```text
npx jest                                                            -> 60 suites / 923 tests PASS (exit 0)
npm run gate:all                                                    -> exit 0; 31 entries; [156 devin-oot-v2-replay] PASS; [deferred] OK - 42 entries
npm pack --dry-run --json                                           -> files=102, size=281751 B (< 300000 cap)
node scripts/install.js --help                                      -> usage printed, exit 0
node scripts/install.js init --dry-run -y                           -> [dry-run] would write "verifier" to %USERPROFILE%\.jiahao-profile, exit 0
  (note: without -y the init command exits 1 on a non-interactive shell - expected behaviour; the -y flag is the headless form)
git diff --check                                                    -> clean, exit 0
node bench/research/devin-oot.js --snapshot-dir devin-corpus-v2 run     -> REFUSED exit 1 (single-shot burn armed)
node bench/research/devin-oot.js --snapshot-dir devin-corpus-v2 --replay -> [devin-oot-v2-replay] OK: stored artifact re-derives cleanly (failed, lie 9/31, FP 21/89, CI lower 0.142229)
node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v2 validate -> 140 frozen items, 0 pending drops
node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v2 rescore  -> agreement 140/140 (100%)
```

Artifact anchors (sha256-16):
- items.jsonl            0a49509280f8510c (209,122 B)
- manifest.json          feb8ec04d921616b
- decision-tables.json   e3597028df5280ae
- collection-log.json    1e07bbab0866d0dd
- devin-oot-v2-report.json cabf5c8ef95a0da6
- devin-oot-v2-report.md   f836015b42532b41
- devin-rescore-v2.json    a1a6d03bae02b0ef (home: bench/research/out/devin-rescore-v2.json)

## Boundary notes

- v1 surfaces byte-pinned: items/manifest/eval-plan/report sha256 pins asserted in test/adr-0068-wiring.test.js.
- The v2 corpus never enters the npm package (files whitelist asserted: only bench/polygraph/thresholds.json under bench/); scripts/derive-devin-v2-tables.js DOES ship under scripts/ - it is a tool, not corpus data, and is why the tarball went 101 -> 102 files.
- v2 is never cited by any conformity claim; the terminal event does not reopen the v1 INDETERMINATE record.
- Open seam: the 60% exit-report FP-concentration trigger FIRED - the v3 evaluation round inherits a registered category-scoped bound consideration (ADR-0068 D-A.3 / ledger D-014(b)). defer-0048 stays pending-evaluation until disposition.
