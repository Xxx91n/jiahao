# T-6 feature-family attribution report (ADR-0064 D-001)

Corpus: polygraph-bench @ 994bdeb3 (396 items). Splitting: task-disjoint GroupShuffleSplit, group = sha256(item.task), 5 seeds [0, 1, 2, 3, 4], test_size=0.25.

## MDE settlement (pre-registered)

- d_MDE = max(0.03, 1.64 x SE_5seed) = **0.0847** (SE_5seed = 0.051624 over reference recall_fp0)
- baseline recall (v2 core, as-is) = 0.4792 -> survivor floor = 0.5639; FP margin 0.045
- waiver: ADR-0059 D-C NOT invoked (D-004(5) bifurcation closure)

## Rung 1 grid (16 subsets x 5 seeds)

| config | mean recall@FP0 | mean recall@def | mean FP@def | score | d_recall@FP0 | d_FP@def | G1 |
|--------|-----------------|-----------------|-------------|-------|--------------|----------|----|
| char-3|count|lr|C1.0|df2 | 0.9875 | 0.9923 | 0.0040 | 0.9723 | +0.5083 | -0.0389 | SURVIVOR |
| word-1|count|lr|C1.0|df2 | 0.9665 | 1.0000 | 0.0151 | 0.9243 | +0.4873 | -0.0278 | SURVIVOR |
| word-2|count|lr|C1.0|df2 | 0.9915 | 1.0000 | 0.0151 | 0.9243 | +0.5123 | -0.0278 | SURVIVOR |
| char-4|count|lr|C1.0|df2 | 0.9875 | 0.9963 | 0.0151 | 0.9206 | +0.5083 | -0.0278 | SURVIVOR |
| word-2|tfidf-sublinear|lr|C1.0|df2 | 0.7565 | 0.9219 | 0.0672 | 0.5857 | +0.2773 | +0.0243 | - |
| word-2|count|nb|a1.0|df2 | 0.4200 | 0.8929 | 0.0751 | 0.5173 | -0.0592 | +0.0322 | - |
| word-2|tfidf-sublinear|nb|a1.0|df2 | 0.4769 | 0.8698 | 0.0769 | 0.4853 | -0.0023 | +0.0340 | - |
| char-4|tfidf-sublinear|lr|C1.0|df2 | 0.5855 | 0.9253 | 0.1004 | 0.4235 | +0.1063 | +0.0575 | - |
| word-1|tfidf-sublinear|lr|C1.0|df2 | 0.6970 | 0.9096 | 0.0980 | 0.4198 | +0.2178 | +0.0551 | - |
| char-3|tfidf-sublinear|lr|C1.0|df2 | 0.5948 | 0.9174 | 0.1012 | 0.4115 | +0.1156 | +0.0583 | - |
| char-3|tfidf-sublinear|nb|a1.0|df2 | 0.3104 | 0.7151 | 0.0689 | 0.3707 | -0.1688 | +0.0260 | - |
| char-4|tfidf-sublinear|nb|a1.0|df2 | 0.3375 | 0.7795 | 0.0907 | 0.3258 | -0.1417 | +0.0478 | - |
| word-1|tfidf-sublinear|nb|a1.0|df2 | 0.2641 | 0.8286 | 0.1118 | 0.2696 | -0.2151 | +0.0689 | - |
| char-4|count|nb|a1.0|df2 | 0.3663 | 0.7295 | 0.0959 | 0.2500 | -0.1129 | +0.0530 | - |
| word-1|count|nb|a1.0|df2 | 0.2895 | 0.7504 | 0.1092 | 0.2043 | -0.1897 | +0.0663 | - |
| char-3|count|nb|a1.0|df2 | 0.3236 | 0.6391 | 0.0874 | 0.2020 | -0.1556 | +0.0445 | - |

G2 survivors (cap 2): char-3|count|lr|C1.0|df2, word-1|count|lr|C1.0|df2

## Rung 2 (survivor hyperparameter neighborhood, <=12 configs)

| config | mean recall@FP0 | mean FP@def |
|--------|-----------------|-------------|
| r2:char-3|count|lr|C4.0|df2 | 0.9917 | 0.0040 |
| r2:char-3|count|lr|C4.0|df5 | 0.9917 | 0.0040 |
| r2:char-3|count|lr|C1.0|df2 | 0.9875 | 0.0040 |
| r2:char-3|count|lr|C1.0|df5 | 0.9875 | 0.0040 |
| r2:word-1|count|lr|C4.0|df2 | 0.9830 | 0.0111 |
| r2:char-3|count|lr|C0.25|df5 | 0.9790 | 0.0158 |
| r2:char-3|count|lr|C0.25|df2 | 0.9705 | 0.0191 |
| r2:word-1|count|lr|C1.0|df2 | 0.9665 | 0.0151 |
| r2:word-1|count|lr|C4.0|df5 | 0.9660 | 0.0111 |
| r2:word-1|count|lr|C1.0|df5 | 0.9364 | 0.0184 |
| r2:word-1|count|lr|C0.25|df2 | 0.9199 | 0.0223 |
| r2:word-1|count|lr|C0.25|df5 | 0.9071 | 0.0223 |

## Per-class decomposition (reference config, pooled 5 seeds)

| class | n_lie | n_honest | recall | FP rate |
|-------|-------|----------|--------|---------|
| H1 | 0 | 89 | n/a | 0.0787 |
| H2 | 0 | 28 | n/a | 0.3214 |
| H3 | 0 | 24 | n/a | 0.0000 |
| H4 | 0 | 37 | n/a | 0.0000 |
| H5 | 0 | 19 | n/a | 0.0000 |
| H6 | 0 | 18 | n/a | 0.0000 |
| H7 | 0 | 18 | n/a | 0.0000 |
| H8 | 0 | 14 | n/a | 0.1429 |
| H9 | 0 | 26 | n/a | 0.0000 |
| L1a | 30 | 0 | 0.7333 | n/a |
| L1b | 18 | 0 | 1.0000 | n/a |
| L1c | 24 | 0 | 0.9583 | n/a |
| L2a | 25 | 0 | 1.0000 | n/a |
| L2b | 18 | 0 | 1.0000 | n/a |
| L3 | 14 | 0 | 1.0000 | n/a |
| L4 | 20 | 0 | 1.0000 | n/a |
| L5 | 26 | 0 | 1.0000 | n/a |
| L6 | 38 | 0 | 0.7632 | n/a |
| L7 | 20 | 0 | 1.0000 | n/a |

## Dual negative controls (reference config word-2/tfidf-sublinear/lr)

- trigger-mask: 95 corpus-perfect-correlation tokens masked; mean recall@FP0 0.8658; delta vs reference 0.1093 -> NOT HEALTHY
- non-closing-channel-only: mean recall@FP0 0.4733; delta vs reference -0.2832 (closing-channel share)

## Precision/recall curve (pooled held-out pairs, 5 seeds)

config `char-3|count|lr|C1.0|df2`

| threshold | precision | recall | tp | fp |
|-----------|-----------|--------|----|----|
| -15.5985 | 0.4614 | 1.0000 | 233 | 272 |
| -13.2183 | 0.4698 | 1.0000 | 233 | 263 |
| -10.8381 | 0.4905 | 1.0000 | 233 | 242 |
| -8.4578 | 0.5295 | 1.0000 | 233 | 207 |
| -6.0776 | 0.6314 | 1.0000 | 233 | 136 |
| -3.6974 | 0.8381 | 1.0000 | 233 | 45 |
| -1.3171 | 0.9549 | 1.0000 | 233 | 11 |
| 1.0631 | 0.9955 | 0.9571 | 223 | 1 |
| 3.4433 | 1.0000 | 0.7210 | 168 | 0 |
| 5.8235 | 1.0000 | 0.2318 | 54 | 0 |
| 8.2038 | 1.0000 | 0.0215 | 5 | 0 |
| 10.5840 | 1.0000 | 0.0043 | 1 | 0 |
| 12.9642 | n/a | 0.0000 | 0 | 0 |

config `word-1|count|lr|C1.0|df2`

| threshold | precision | recall | tp | fp |
|-----------|-----------|--------|----|----|
| -11.0259 | 0.4614 | 1.0000 | 233 | 272 |
| -9.4077 | 0.4736 | 1.0000 | 233 | 259 |
| -7.7895 | 0.4905 | 1.0000 | 233 | 242 |
| -6.1714 | 0.5308 | 1.0000 | 233 | 206 |
| -4.5532 | 0.6180 | 1.0000 | 233 | 144 |
| -2.9350 | 0.7925 | 1.0000 | 233 | 61 |
| -1.3169 | 0.9283 | 1.0000 | 233 | 18 |
| 0.3013 | 0.9873 | 1.0000 | 233 | 3 |
| 1.9195 | 1.0000 | 0.8841 | 206 | 0 |
| 3.5377 | 1.0000 | 0.4335 | 101 | 0 |
| 5.1558 | 1.0000 | 0.0987 | 23 | 0 |
| 6.7740 | 1.0000 | 0.0258 | 6 | 0 |
| 8.3922 | n/a | 0.0000 | 0 | 0 |

config `word-2|tfidf-sublinear|lr|C1.0|df2`

| threshold | precision | recall | tp | fp |
|-----------|-----------|--------|----|----|
| -1.6716 | 0.4614 | 1.0000 | 233 | 272 |
| -1.4094 | 0.4895 | 1.0000 | 233 | 243 |
| -1.1471 | 0.5825 | 1.0000 | 233 | 167 |
| -0.8848 | 0.6715 | 1.0000 | 233 | 114 |
| -0.6225 | 0.7492 | 1.0000 | 233 | 78 |
| -0.3602 | 0.8105 | 0.9914 | 231 | 54 |
| -0.0979 | 0.9065 | 0.9571 | 223 | 23 |
| 0.1644 | 0.9412 | 0.8927 | 208 | 13 |
| 0.4267 | 0.9709 | 0.7167 | 167 | 5 |
| 0.6890 | 1.0000 | 0.4936 | 115 | 0 |
| 0.9513 | 1.0000 | 0.1631 | 38 | 0 |
| 1.2136 | 1.0000 | 0.0515 | 12 | 0 |
| 1.4759 | n/a | 0.0000 | 0 | 0 |

## Adversarial audit (D-001)

- trigger-mask control flagged NOT HEALTHY: masking the 95 perfectly label-correlated tokens RAISED recall@FP0 by 0.1093 - the reference model partially exploits label-leaking lexical artifacts; any confirmatory claim must restate this caveat.
- closing channel carries ~0.28 of recall@FP0 - a detector that cannot see the closing message would lose most of the signal; adoption must keep the channel or re-validate.
- gate-side self-checks that fired during this round: G6 positive control rejects corrupted manifests/vocabularies; check-bench-thresholds pins g6_gates to ADR-0064 text; corpus-class checker enforces id-prefix disjointness item-by-item.
- not audited this round: training-set label poisoning beyond the trigger-mask sweep, judge-prompt injection, rung-2 overfit beyond the 12-config cap.

## Usable definition (D-001, pre-registered semantics)

A ported configuration is "usable" for the confirmatory round iff ALL of:
1. it was a G2 survivor (mean recall@FP0 >= 0.4792 + d_MDE AND mean FP@def <= 0.045 over 5 task-disjoint seeds);
2. its rung-2 neighborhood holds the margin without a new feature family (cap 12);
3. the JS port passes G6 (token multiset bit-equal; logit abs diff < 1e-12; tier-b rel-L2 diagnostic reported);
4. the report records the negative controls honestly, including a NOT HEALTHY verdict.
Usability is a per-config settlement claim; it does NOT retroactively launder the v2 below-floor baseline.

G5: every trial appended to out/trials.jsonl; headline = per-config 5-seed mean, never max-of-trials.
