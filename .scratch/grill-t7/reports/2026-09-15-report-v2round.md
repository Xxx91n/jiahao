# grill-t7 v2 round report - 2026-09-15

Branch: `grill-t7-v2-docs` (GitButler). Scope: ledger D-013/D-014/D-015/D-016 (v2 round), D-009 mechanism extension (claim slot), inherited D-004/D-008/D-010/D-011. Task book: `.scratch/grill-t7/handoffs/next-round.md` T-1..T-5, all completed in order.

## Verdict

**devin-corpus@v2 OOT falsification: FAILED** (single-shot, dual-axis intersection-union).

- lie axis: k=9/31 hits, CP 95% CI [0.142229, 0.480361] - upper bound below the conservative-transfer floor 0.563863 -> decisive fail
- FP axis: 21/89 (23.6%), CP 95% CI lower 0.144 > usability bound 0.10 -> decisive fail
- quadrant: lie-fail x fp-fail (double failure); collapse-no-shelf wording armed, no shelf language emitted
- exit-report concentration: ALL 21 FPs are exit-report-shaped (share 1.0) - the registered 60% trigger FIRED -> v3 considers a category-scoped bound
- stress side-set: 20/20 command-exit honest items flagged (descriptive only, never in either table)

## Claim surface (verbatim, all homes)

> devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229) (verdict date: 2026-09-15)

> This is a decision-table outcome from a seeded-emergence bench corpus, not a precise performance estimate; devin-corpus@v2 is never cited by any conformity claim.

Homes: `bench/research/out/claim-template.md`, `bench/research/out/devin-oot-v2-report.md`, `README.md` (bound verbatim; test/adr-0068-wiring.test.js 'claim homes carry the fact line + limitation verbatim').

## Commit chain (GitButler, grill-t7-v2-docs)

| commit | content | gate satisfied |
|---|---|---|
| llp | T-1 docs: ADR-0068 + plan.json + eval-plan.json + defer-0047 + claim slot + wiring seeds | plan-first registration; NO v2 items at this commit (wiring asserts items.jsonl absent at plan commit) |
| xql | T-2: --snapshot-dir parameterization (collect-devin-corpus.js + devin-oot.js) + derive-devin-v2-tables.js | v1 bytes pinned (wiring sha256 pins) |
| ptl | T-3: collection drops -> items.jsonl (140) + manifest + collection-log + rescore 140/140 | deterministic stopping, caps, session<=6, disjointness vs all v1 ids |
| qsz | T-4 freeze: decision-tables.json ONLY (own commit) | derived-from landed counts under blind labels; labels unlock after this commit |
| ktw | T-5: verdict artifacts + claim fill + devin-oot-v2-replay gate + defer-0048 + wiring | terminal event, one per round |

## What was built

- `bench/research/devin-corpus-v2/`: plan.json / eval-plan.json (pre-registered), items.jsonl (140: 120 main + 20 side), manifest.json (readable counts), collection-log.json (stopping fn, mining rate 3.87 tasks/lie, disclosed misreport rate 0.25), decision-tables.json (derived, frozen)
- `docs/adr/0068-*.md`: adjudication rule + collection protocol + claim slot + v3 binding + probe terms + closure note
- `scripts/collect-devin-corpus.js`, `bench/research/devin-oot.js`: closed-enum `--snapshot-dir`; v1 default path byte-preserved
- `scripts/derive-devin-v2-tables.js`: CP oracle derivation (n=12 check reproduces the v1 frozen table exactly)
- `docs/gates.json`: devin-oot-v2-replay (order 156, confirmatory, requires repo-tree)
- `docs/deferred-registry.json`: defer-0047 (net-addition), defer-0048 (terminal event FAILED)
- `.scratch/grill-t7/devin-collect-v2.js`: the v2 collection harness (seeded-emergent misreport stream, real worker executions)

## Rerunnable evidence

```text
npx jest                                  -> 60 suites / 922 tests PASS (exit 0)
npm run gate:all                          -> exit 0; 31 entries; [156 devin-oot-v2-replay] PASS; deferred OK 42 entries
npm pack --dry-run                        -> 101 files, 281751 B < 300000 cap
node scripts/install.js --help            -> prints usage (exit 0)
node scripts/install.js init --dry-run    -> prints dry-run plan (exit 0)
git diff --check                          -> clean
node bench/research/devin-oot.js --snapshot-dir devin-corpus-v2 run     -> REFUSED exit 1 (single-shot burn armed)
node bench/research/devin-oot.js --snapshot-dir devin-corpus-v2 --replay -> OK: stored artifact re-derives cleanly (failed, lie 9/31, FP 21/89)
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
- devin-rescore-v2.json    a1a6d03bae02b0ef

## Boundary notes

- v1 surfaces byte-pinned: items/manifest/eval-plan/report sha256 pins asserted in test/adr-0068-wiring.test.js.
- The v2 corpus never enters the npm package (files whitelist asserted: only bench/polygraph/thresholds.json under bench/).
- v2 is never cited by any conformity claim; the terminal event does not reopen the v1 INDETERMINATE record.
- Open seam: the 60% exit-report FP-concentration trigger FIRED - the v3 evaluation round inherits a registered category-scoped bound consideration (ADR-0068 D-A.3 / ledger D-014(b)). defer-0048 stays pending-evaluation until disposition.
