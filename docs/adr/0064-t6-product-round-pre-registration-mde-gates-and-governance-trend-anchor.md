# ADR-0064: T-6 Product Round Pre-Registration - MDE Stage-Gates, Golden-Sample Equivalence, Governance Trend Anchor

Status: Accepted (user-ratified 2026-09-14 via grill-t6 decision ledger D-001..D-006; second_reviewer countersign deferred to the next audit round)
Date: 2026-09-14

Amends: ADR-0059 D-C (the "research round carries no metric commitment" general
clause; T-6 and later research rounds carry an MDE stop-loss commitment, not an
absolute target value).
References: ADR-0027 D3 (advisory aggregation), ADR-0030 (corpus floor),
ADR-0050 (append-only), ADR-0060 D-B (min_n / indeterminate), ADR-0061 D-D/E
(output-tethered convergence; witnessed digest anchoring), ADR-0062 (trend
anchor precedent), ADR-0063 (surface-narrowed judge identity),
decision-ledger-t6 (D-001..D-006, in docs/governance/).
External basis: Advani (arXiv:2606.09863, TF-IDF task-disjoint AUROC 0.83/0.95
vs judge <=0.65), Vaccaro (arXiv:2606.11217, register the exploration space and
report all of it), Spotify decision engine (2024, guardrail non-inferiority),
FDA non-inferiority guidance (M1/M2 margin), Google SRE Workbook "Alerting on
SLOs" (static thresholds infeasible; burn-rate), MADR/IETF lifecycle precedent
(no numeric cap on decision records exists anywhere).
Critique disposition handled here: critique2 (".codex-tmp/锐评1.md")
prescription 5 ("freeze the ADR count in gates.json").

## Context

The T-6 product round was scheduled by ADR-0061 D-F (measurement unblock first,
identity narrowing second, product research third), and its opening grill
(grill-t6, ledger D-001..D-006) pre-registers the round before any bench run.

Honest starting state, recorded so no later round can recast it: detector v2 on
the frozen external bench (polygraph-bench @994bdeb, 396 items, 176 lie / 220
honest) reads core recall 47.92% at FP 4.29%, score 0.265 against the
pre-registered floor 0.385 (below floor; recorded, not laundered). The 34.7%
figure quoted by the critique is the detector v1 overall metric and is a
historical reference only; the T-6 attribution baseline is the v2 core split.

## Decision

### D-A - Success is a pre-registered MDE stop-loss gate (form A-prime)

T-6 delivers a *feature-family attribution report*: for every pre-registered
candidate subset of the TF-IDF family, task-disjoint recall at FP=0 and the
absolute delta versus the baseline, plus the P/R curve and per-class
decomposition. The gate is a minimum detectable effect, not a target value:
survivor judgment is mean(5-seed, task-disjoint recall) >= baseline + d_MDE with
the frozen formula d_MDE = max(0.03, 1.64 * SE_5seed); the numeric value is
computed from the corpus and frozen before the execution run. Missing the MDE
while moving non-zero is recorded as zero-movement (D-004 discipline of the
prior round); full zero movement is a stop-loss signal; a second consecutive
miss triggers CAPA and a switch to the next feature family. Guardrail
(non-inferiority): FP rate / human-review budget must not degrade beyond the
pre-registered margin (0.045). This explicitly supersedes the ADR-0059 D-C "no
metric commitment" general clause for product research rounds.

### D-B - Research and confirmatory surfaces stay split

T-6 never edits bench/polygraph/thresholds.json. The floors/targets
(ADR-0015/0018/0019) keep gating as-is under check-bench-thresholds.js. If the
attribution report passes the MDE gate, changing thresholds.json or shipping a
v3 detector is a separate later round (ADR + single confirmatory settlement,
G5). Mixing research and settlement in one commit batch is forbidden.

### D-C - Corpus assets are four distinct classes and never interchanged

1. External frozen bench (396 items, sha256 pinned).
2. Private structural corpora (probe / mr-probes, ADR-0029/0037).
3. Judge-conformity corpus (n=26 < min_n=100; indeterminate per ADR-0060; no
   conformity statement may cite it).
4. Devin truth corpus (to be collected from the local Devin agent harness;
   frozen snapshot devin-corpus@v1 naming harness commit + model version +
   date). Devin items are blind to rung 1 and unlocked only after rung-1
   settlement; its task inventory is explicitly disjoint from the bench 396 and
   the golden-sample 20. No class may be merged into or substituted for another.

### D-D - Exploration space: two stage-gates (ASHA rung structure, manual)

Rung 1 (attribution) grid: granularity {word 1/2-gram, char 3/4-gram} x
weighting {count, tfidf-sublinear} x model {LR L2 class-balanced, NB}, Advani
defaults (min_df=2, max 30k tokens); expected 8-16 subsets x 5 seeds); task-disjoint split = GroupShuffleSplit over task_id (Advani protocol).
G1 survivor judgment - D-A gate. G2 survivor cap 2 (rank by score =
recall - 5*FP; the rest are registered negatives). G3 zero survivors is a legal
outcome: negative closure, no thresholds.json change. G4 rung-2 space only:
{LR C in {0.25,1,4}; NB alpha in {0.1,0.5,1}} x {min_df in {2,5}} (<= 12
configs); introducing a feature family not present in rung 1 (rule stacking,
channel decomposition) requires a new ADR. G5 settlement: all trials appended,
headline never max-of-trials. Two negative controls from the Advani appendix:
label-regex trigger-word masking (delta < 0.001 is healthy) and a
non-closing-channel-only control.

### D-E - Golden-sample equivalence gate G6 (sklearn attribution -> JS product)

The vectorizer layer (tokenizer + TfidfVectorizer semantics) is hand-written JS
under every option (skl2onnx's own docs show tokenizer drift flipping
predictions); the estimator layer (dot product on the dumped manifest
{vocabulary_, idf_, coef_, intercept_, tokenizer regex, analyzer config,
ngram_range}) is generated by m2cgen or hand-written - both equivalent.
sklearn-porter (dead, sklearn<=0.22) and ONNX/onnxruntime-web (numeric drift,
char_wb unimplemented) are forbidden channels. Equivalence gate, fail-closed:
(a) token multiset bit-equal; (b) tfidf vector rel-L2 < 1e-9 (diagnostic);
(c) logits diff < 1e-12 over 20 frozen items (release condition); plus one
positive control - a deliberately corrupted JS port flipping one idf value MUST
be rejected, otherwise the gate itself is invalid. The G6 thresholds are
pre-registered into thresholds.json before any porting line is written. Two
failed repair rounds fall back to the pure-JS substrate under the same gate.

### D-F - Governance mass: structure gate + trend anchor (critique prescription 5 disposition)

The critique's prescription 5 is partially adopted and the refusal is on the
record, not a quiet discount: the numeric hard cap is rejected (no industrial
precedent - MADR/IETF manage by lifecycle, and an unreachable confirmatory
alarm is precisely the alarm-fatigue disease diagnosed by the tarball gate's
permanent red, now healed by ADR-0062 at 212,699 B < 230,000 B). Adopted:
(1) a new confirmatory structural gate "governance-inventory" - every
gates.json entry's source_adr exists with a live status, no command is
registered twice, supersede/updated-by references close bidirectionally;
(2) an observational trend anchor on ADR net additions per documentation round
(new minus superseded/closed; anchor 63, K=2; two consecutive doc rounds with
net > 0 raise a single advisory ::warning::, never blocking; anchor revision
is a same-commit ADR, D-001/ADR-0062 tariff style); (3) an event rule: a round
with zero product diff (src/, bench/ unchanged) that still lands a new ADR
writes a deferred-registry entry for forced disposition. The window "round" is
pinned to documentation rounds; research/confirmatory-round ADRs do not feed
the trend count.

## Consequences

T-6 becomes executable with mechanized gates at every judgment point (G1-G5,
G6). The governance-inventory gate ships with this ADR (source_adr existence +
command uniqueness + supersede closure are computable today). The trend anchor
is recorded in docs/deferred-registry.json as defer-0039 with the tide
discipline. The critique's count of red findings closes here: prescription 1 (ADR-0062),
2 (ADR-0061 D-E), 3 (this ADR's D-A..D-E), 4 (ADR-0061 D-C), 5 (this D-F).
