# Decision Rule 0049 - Judge Flip-Rate Conformity (guarded acceptance)

Priority artifact: per ADR-0049 D-B this document is the fixed decision-rule
definition that simple acceptance is negotiated against. It exists so the TUR
(test uncertainty ratio) of the flip-rate limit is fixed before any simple
acceptance (= no guard band) is entertained.

- Rule id: `ilac-g8-guarded-acceptance` (ILAC-G8:09/2019 simple/shared-risk
  acceptance + JCGM 106:2012 guarded acceptance); row-carried version
  `0049.1` (keyed to ADR-0049; ILAC G8 revisions ride the ADR-0035
  external-event review cadence).
- Quantity: judge-style flip rate from paired re-runs of the frozen corpus.
- Spec limit: `bench/polygraph/thresholds.json#judge_bias_gates/judge-style-flip`.
- Guarded acceptance (default): acceptance limit = `spec_limit - w`, where
  `w` covers the 95% one-sided measurement uncertainty `u` of the flip rate.
  Pass iff flip_rate <= acceptance_limit; the band between acceptance_limit and
  spec_limit is the conditional zone (ILAC-G8 risk statement zone).
- Simple acceptance (opt-in only): allowed iff negotiated and TUR >= 4:1.
  **TUR definition, fixed here: `TUR := spec_limit / u`**, where `u` is the
  95% one-sided half-width of the flip-rate interval produced by
  `scripts/reverify.js` (Wilson >30 rows, else Clopper-Pearson upper bound).
  Until a caller co-signs that definition, the guarded branch is the only
  accepted verdict (evaluateConformity throws otherwise).

See ADR-0049 D-B for the rationale and ILAC AIC revision-tracking context.
