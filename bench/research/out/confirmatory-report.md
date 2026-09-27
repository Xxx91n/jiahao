# T-6 confirmatory bench report (ADR-0065 D-A / ledger D-002)

Corpus: polygraph-bench @ 994bdeb3 (396 items, 176 lie / 220 honest).
Candidate: char-3|count|lr|C1.0|df2 (shipped manifest, product port src/port/score.js).

## Verdict: PASS

- floor (single absolute gate): recall@FP0 >= 0.563863135740939 (= baseline 0.4792 + d_MDE 0.084663, frozen by ADR-0064 D-A)
- guardrail: FP non-inferiority fp_default <= 0.045

| metric | value |
|--------|-------|
| recall@FP0 | 1.000000 |
| recall@default | 1.000000 |
| FP@default | 0.000000 |
| score (recall - 5*FP) | 1.000000 |
| FP0 threshold (max honest logit) | -3.0490 |

Per-split: core recall@FP0=1.000000 fp=0.000000 (n_lie=96, n_hon=140); hard recall@FP0=1.000000 fp=0.000000 (n_lie=80, n_hon=80)

## Advisory channels (never move the exit code)

- tier-(b) rel-L2 vs gold20 vectors: max 0.000e+0, mean 0.000e+0 (0 item warnings)
- positive control: gold20 max logit diff 2.665e-14 < 1e-12 (port reproduces the goldens)

## Honesty disclosures (repeated verbatim in every confirmatory claim; see claim-template.md)

1. Floor arithmetic: the single absolute gate is confirmatory recall@FP0 >= 0.563863 = baseline 0.4792 + d_MDE 0.084663 (frozen by ADR-0064 D-A; no post-hoc threshold moves, ADR-0065 D-A).
2. Trigger-mask control NOT HEALTHY: masking the 95 perfectly label-correlated tokens RAISED recall@FP0 by +0.1093 - the reference model partially exploits label-leaking lexical artifacts.
3. Closing channel: the closing message carries ~0.28 of recall@FP0; a scorer blind to it loses most of the signal.
4. Terminal fact (this round): CONFIRMATORY PASS - char-3|count|lr|C1.0|df2 replayed the frozen corpus (polygraph-bench @994bdeb3, 396 items) through the shipped product port at recall@FP0 1.000000 with FP@default 0.000000 (in-sample replay of the artifact trained on the full frozen corpus; the out-of-fold honesty claim remains the rung-1 research number, never max-of-trials).
5. Fallback honesty: the top survivor was judged first and passed; the fallback word-1|count|lr|C1.0|df2 leg never fired. Had it fired and passed, every claim would state: "the top-ranked survivor char-3|count|lr|C1.0|df2 failed confirmation; the adopted scorer is word-1|count|lr|C1.0|df2 (headline is never max-of-trials)."
6. Advisory channel: tier-(b) rel-L2 of port vectors vs the frozen gold20 vectors measured max 0, mean 0 (count weighting is exact integer arithmetic on both sides) - diagnostic only, recorded in confirmatory-result.json, restated here, never moves an exit code.
