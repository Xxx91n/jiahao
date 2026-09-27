# T-6 feature-family attribution report (ADR-0064 D-001)

Corpus: polygraph-bench @ 994bdeb3 (396 items). Splitting: task-disjoint GroupShuffleSplit, group = sha256(item.task), 5 seeds [0, 1, 2, 3, 4], test_size=0.25.

## MDE settlement (pre-registered)

- d_MDE = max(0.03, 1.64 x SE_5seed) = **0.0847** (SE_5seed = 0.051624 over reference recall_fp0)
- baseline recall (v2 core, as-is) = 0.4792 -> survivor floor = 0.5639; FP margin 0.045
- waiver: ADR-0059 D-C NOT invoked (D-004(5) bifurcation closure)

## Rung 1 grid (16 subsets x 5 seeds)

| config | mean recall@FP0 | mean recall@def | mean FP@def | score | G1 |
|--------|-----------------|-----------------|-------------|-------|----|
| char-3|count|lr|C1.0|df2 | 0.9875 | 0.9923 | 0.0040 | 0.9723 | SURVIVOR |
| word-1|count|lr|C1.0|df2 | 0.9665 | 1.0000 | 0.0151 | 0.9243 | SURVIVOR |
| word-2|count|lr|C1.0|df2 | 0.9915 | 1.0000 | 0.0151 | 0.9243 | SURVIVOR |
| char-4|count|lr|C1.0|df2 | 0.9875 | 0.9963 | 0.0151 | 0.9206 | SURVIVOR |
| word-2|tfidf-sublinear|lr|C1.0|df2 | 0.7565 | 0.9219 | 0.0672 | 0.5857 | - |
| word-2|count|nb|a1.0|df2 | 0.4200 | 0.8929 | 0.0751 | 0.5173 | - |
| word-2|tfidf-sublinear|nb|a1.0|df2 | 0.4769 | 0.8698 | 0.0769 | 0.4853 | - |
| char-4|tfidf-sublinear|lr|C1.0|df2 | 0.5855 | 0.9253 | 0.1004 | 0.4235 | - |
| word-1|tfidf-sublinear|lr|C1.0|df2 | 0.6970 | 0.9096 | 0.0980 | 0.4198 | - |
| char-3|tfidf-sublinear|lr|C1.0|df2 | 0.5948 | 0.9174 | 0.1012 | 0.4115 | - |
| char-3|tfidf-sublinear|nb|a1.0|df2 | 0.3104 | 0.7151 | 0.0689 | 0.3707 | - |
| char-4|tfidf-sublinear|nb|a1.0|df2 | 0.3375 | 0.7795 | 0.0907 | 0.3258 | - |
| word-1|tfidf-sublinear|nb|a1.0|df2 | 0.2641 | 0.8286 | 0.1118 | 0.2696 | - |
| char-4|count|nb|a1.0|df2 | 0.3663 | 0.7295 | 0.0959 | 0.2500 | - |
| word-1|count|nb|a1.0|df2 | 0.2895 | 0.7504 | 0.1092 | 0.2043 | - |
| char-3|count|nb|a1.0|df2 | 0.3236 | 0.6391 | 0.0874 | 0.2020 | - |

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

G5: every trial appended to out/trials.jsonl; headline = per-config 5-seed mean, never max-of-trials.
