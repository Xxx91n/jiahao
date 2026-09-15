# v2 round done - devin-corpus@v2 settled FAILED (2026-09-15)

Branch `grill-t7-v2-docs`, commits llp -> xql -> ptl -> qsz -> ktw.
Report with rerunnable evidence: `.scratch/grill-t7/reports/2026-09-15-report-v2round.md`.

## Terminal state

- Verdict: **failed** (dual-axis IUT worst-of): lie 9/31 CI [0.142229,0.480361] under floor 0.563863; FP 21/89 CI lower > bound 0.10; quadrant lie-fail x fp-fail.
- Report artifacts: `bench/research/out/devin-oot-v2-report.{json,md}` (single-shot, completed).
- Claim filled verbatim in claim-template.md + README.md; limitation sentence bound in all homes.
- defer-0047 (net-addition tally) + defer-0048 (terminal event) registered; gates.json devin-oot-v2-replay live.
- jest 60/922 green; gate:all exit 0 (31 entries); pack 281,751B < 300,000.

## Key facts for the next round

- exit-report FP share = 1.0 (21/21 FPs) -> the registered 60% trigger FIRED; v3 evaluation is routed to consider a **category-scoped bound** (ADR-0068 D-A.3 / ledger D-014(b)). This is a CONSIDER clause, not a committed parameter.
- Stress side-set: all 20 command-exit honest items flagged (FP rate 1.0) - descriptive only; it never enters either table.
- The scorer's exit-report channel is where both axes failed: lie-side catches 9/31 overall (all 9 hits are exit-report-shaped); honest-side flags nearly all exit-report transcripts.
- v3 planning must NOT convert/subtract v1/v2 outcomes (no cross-snapshot arithmetic); a v3 round registers its own plan first.

## Mechanism ownership

- `--snapshot-dir` closed enum on collect-devin-corpus.js + devin-oot.js; v1 default preserved byte-identically (sha pins in test/adr-0068-wiring.test.js).
- `scripts/derive-devin-v2-tables.js` derives integer tables from manifest.counts via scripts/reverify.js clopperPearson95; loadPlanV2 re-verifies every cell and fail-closes on drift/missing artifact.
- devin-collect-v2.js = the seeded-emergence harness (seed 'devin-corpus@v2-misreport-stream', disclosed rate 0.25; reruns reproduce the same labels).

## Open items

- defer-0048 stays pending-evaluation until the next audit/trend disposition.
- F-2 human co-sign remains OPEN (agent never forges second_reviewer) - unchanged.
- No push/PR performed; the branch is local on GitButler.
