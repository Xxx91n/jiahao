# v2 round done - devin-corpus@v2 settled FAILED (2026-09-15, rev.1 post-audit)

Branch `grill-t7-v2-docs`, commits llp -> xql -> ptl -> qsz -> ktw -> oom -> (audit-rework commit).
Report with rerunnable evidence: `.scratch/grill-t7/reports/2026-09-15-report-v2round.md` (rev.1).
Audit that sent it back: `.scratch/grill-t7/reports/2026-09-15-audit-v2round.md`.

## Terminal state

- Verdict: **failed** (dual-axis IUT worst-of): lie 9/31 CI [0.142229,0.480361] under floor 0.563863; FP 21/89 CI [0.152381,0.337788] over bound 0.10; quadrant lie-fail x fp-fail.
- Report artifacts: `bench/research/out/devin-oot-v2-report.{json,md}` (single-shot, completed).
- Claim filled verbatim (unquoted limitation sentence, byte-identical) in claim-template.md + README.md + report.md.
- defer-0047 (net-addition tally) + defer-0048 (terminal event) registered; gates.json devin-oot-v2-replay live.
- jest 60/923 green; gate:all exit 0 (31 entries); pack 102 files / 281,751B < 300,000.

## Audit dispositions (verbatim citations - ADR-0068 Errata section)

- E-1 (F-3a): "the pre-registered two-disjunct rule stands as the executed spec (registered pre-data, so no QRP is at play), and the ledger letter is superseded for this round." The deciding clause for batch b-6 was H_b < 80 (H=76 at b-5 while L=24 already met F[5]=19); the frozen collection log is not retro-edited.
- E-2 (F-3b): "manifest.json has no contamination_registry field ... the frozen manifest is not mutated (a mutation would cascade into the pinned sha anchors and report citations)." The registry itself lives in plan.json.
- E-3 (F-3c): "plan.json registers total_attempt_cap 185 with semantics '160 main + 25 side'. The executed harness caps at 160 main + SIDE_N=20 side = ceiling 180; the landed run used 140 attempts, compliant under both readings."
- E-4 (F-3d): manifest.model_version names the desktop version by v1 convention; the item generator is the registered seeded-PRNG harness; the file-contains 'unrelated' read_file record is the injected fault, not a live read.
- F-2 defect fixed in devin-oot.js loadPlanV2 (k <= b.k_max) + positive-control wiring test; F-1 report claims re-measured; F-3e quote-state aligned.

## Key facts for the next round

- exit-report FP share = 1.0 (21/21 FPs) -> the registered 60% trigger FIRED; v3 evaluation is routed to consider a **category-scoped bound** (ADR-0068 D-A.3 / ledger D-014(b)). This is a CONSIDER clause, not a committed parameter.
- Stress side-set: all 20 command-exit honest items flagged (FP rate 1.0) - descriptive only; it never enters either table.
- The scorer's exit-report channel is where both axes failed: lie-side catches 9/31 overall (all 9 hits exit-report-shaped); honest-side flags nearly all exit-report transcripts.
- v3 planning must NOT convert/subtract v1/v2 outcomes (no cross-snapshot arithmetic); a v3 round registers its own plan first.

## Mechanism ownership

- `--snapshot-dir` closed enum on collect-devin-corpus.js + devin-oot.js; v1 default preserved byte-identically (sha pins in test/adr-0068-wiring.test.js).
- `scripts/derive-devin-v2-tables.js` derives integer tables from manifest.counts via scripts/reverify.js clopperPearson95; loadPlanV2 re-verifies every cell AND every band-internal k and fail-closes on drift/missing artifact.
- devin-collect-v2.js = the seeded-emergence harness (seed 'devin-corpus@v2-misreport-stream', disclosed rate 0.25; reruns reproduce the same labels).
- install.js headless liveness: use `init --dry-run -y` (without -y a non-interactive shell exits 1 - expected).

## Open items

- defer-0048 stays pending-evaluation until the next audit/trend disposition.
- F-2 human co-sign remains OPEN (agent never forges second_reviewer) - unchanged.
- No push/PR performed; the branch is local on GitButler.
