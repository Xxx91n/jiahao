# ADR-0037: Metamorphic Relations as Third Corpus Family (Staged Hybrid)

Status: Accepted
Date: 2026-08-31

## Context

Two corpus families exist: the behavioral probe corpus (ADR-0029, 14 paired
probes, zero-miss/zero-fp zero-tolerance smoke gate) and the frozen polygraph
answer corpus (ADR-0036, 396 items, Wilson lower-bound interval gate carrying
the statistical load). Both test *static* judgments: given a fixed answer, does
the verifier judge it correctly? Neither tests *judgment symmetry*: transform a
case in a way that provably preserves (or provably flips) its meaning, and check
that the verdict preserves (or flips) in lockstep. This is metamorphic testing
(MT; Chen, Cheung & Yiu 1998; Chen et al., ACM CSUR 2018, doi 10.1145/3143561),
and the deferred grill-r36 B-line (ADR-0036) designated it as the candidate
ADR-0037 scope.

Research grounding (two atomcode rounds, full fetches + cross-engine
verification): the 2026 CSUR systematic survey (arXiv 2605.13898, 93 primary
studies) confirms MT-for-LLMs maturity; LLMorph (ICSME 2025, arXiv 2511.02108)
provides a 191-MR catalog (MT4NLP, mt4nlp.github.io) with a 9-relation fake-news
family directly adjacent to our honesty verification, plus 36 implemented
relations; MetaQA (FSE 2025, arXiv 2502.15844) demonstrates the synonym/antonym
mapping beats SelfCheckGPT F1 by 0.154-0.368 on hallucination detection and
proves "ask again" self-consistency repeats the same hallucination.

Two hard constraints shape the design:

1. LLMorph measured that MR violations confirmed by *unverified* transforms are
   only ~42-60% true positives (the rest are the transform itself drifting
   semantically). ASE'26 (arXiv 2607.26843) recovers oracle F1 0.927-1.000 by
   adding an independent semantic-preservation judge that validates each
   transform before it enters the corpus. Our zero-fp smoke gate is structural
   (ADR-0029): every corpus entry's expected verdict must be ground truth, so a
   judge-validated machine pipeline cannot feed v1.
2. Paired before/after comparisons are paired data at the statistics level:
   independent-sample formulas are invalid; Amazon's open-sourced exact
   one-sided McNemar (arXiv 2602.10144, LLM-Accuracy-Stats) detects 0.3%
   degradations and is the v2 upgrade path, consistent with statsforevals'
   open recommendation (Wilson intervals for binomial point estimates; Tango /
   McNemar-family for paired comparisons).

## Decision

### D1 Staged hybrid route (v1 hand-authored, v2 trigger-gated)

v1 is a purely deterministic, human-authored metamorphic probe corpus grown
from selected catalog specifications with human review of transform validity.
v2 is an LLM-assisted generation pipeline with an independent
semantic-preservation judge, activation gated by a deferred-registry entry.
Pure hand-authoring alone (no upgrade channel) is rejected: untethered growth
contradicts the pre-registration machinery (ADR-0029 D5, ADR-0030, ADR-0033).
LLM pipeline at v1 is rejected: judge mispredictions enter the corpus as
false ground truth and structurally fail the zero-fp gate, and the weight of
the pipeline exceeds a single-maintainer, no-remote project (it also collides
with the ADR-0025 D5 no-LLM-judge stance in the corpus direction).

### D2 v1 scope: at most three MR families

Pre-registered families, selected for highest lethality against false
completion / exaggeration claims:

1. Claim negation (MetaQA antonym mapping): transform "task complete" to
   "task not complete" — the verdict must flip.
2. Logical equivalence restatement (LGMT-style constructively semantic-
   preserving rephrasing): equivalent rewording of a completion claim — the
   verdict must not change.
3. Evidence flip (counterfactual injection): presence vs absence of the
   required evidence record while the claim stays fixed — the verdict must
   flip.

Coverage discipline (ADR-0030 D1 semantics): every *applicable* iron law gets
>= 1 preserve-type and >= 1 flip-type pair. IL5 (evidence-chain mechanics) and
IL6 (tool-call consistency) have no natural textual flip transform and are
registered as declared-gap in coverage-map.json (honest partial coverage, not
silently claimed completeness). Candidate structured transforms for those two
laws are noted as v2 material.

### D3 Case sourcing: real failures, not synthetic convenience

Cases are drawn bottom-up from human-confirmed real misses/FPs (ADR-0017
adjudication trail) and real completion claims in the frozen answer corpus.
Each pair is materialized once, frozen, and human-reviewed; the transform
validity review is recorded in the entry's provenance field. Variants carry
`ILx-mr-vN` naming alongside the existing probe id conventions.

### D4 Deterministic gate, full wiring

`scripts/check-mr-probes.js`: zero-dependency thin CLI + pure core, same shape
as ADR-0029 D4 (`check-probes.js`). Assertions are verdict symmetry only:
preserve-pairs require `verdict(source) == verdict(followup)`, flip-pairs
require inequality. Plain zero-violation exit semantics; corpus missing fails
closed (exit 2). The corpus lives at `private/bench-corpus/mr-probes.jsonl`
and inherits ADR-0036's privacy posture (gitignored, whole-line sha256
fingerprints via the existing leak gate, same freshness tier as probes —
half-yearly).

Registration obligations (unchanged machinery, new entries): gates.json entry
(confirmatory tier, ADR-0034 registry), thresholds.json registration with
`source_adr: 0037` under the ADR-0027 coupling guard, jest wiring test
(ADR-0031 D1: every gate ships a wiring assertion), coverage-map registered
with the IL5/IL6 declared-gap rows.

### D5 Statistical honesty

v1 is a structural smoke gate: zero miss / zero fp with a Wilson 95% lower
bound honestly annotated, exactly mirroring ADR-0029 D3 (the statistical load
stays with the 396-item frozen corpus). No per-family tuned thresholds:
MR-related thresholds, if ever needed, are global (ASE'26 rejects per-family
metric shopping).

### D6 v2 trigger (deferred-registry entry, pending-evaluation)

A new deferred-registry entry (defer-0006) registers the v2 pipeline: unfreeze_if =
any single MR family accumulates >= 30 real cases (the ADR-0029 D3 graduation
line) OR a freshness cycle demands corpus regeneration at scale; cadence_tier
half-yearly; verified_by is intentionally absent: the trigger is not machine-evaluable by an existing exit-code script, so per ADR-0035 D6 the entry carries no verified_by and stays pending-evaluation; the jest wiring test for check-mr-probes.js asserts the registration exists. On
activation, the v2 pipeline MUST adopt the ASE'26 two-layer design: LLM
generation candidates -> independent semantic-preservation judge of a
*different model family* (Self-Preference Bias record) -> refusal-treats-as-
violation deterministic fallback -> human spot-check calibration, with output
frozen to the same static jsonl. Paired McNemar (Amazon LLM-Accuracy-Stats
script) replaces independent-proportion reasoning; multi-family comparisons
control FWER (BH/Sidak).

## Rejected alternatives

- R1 LLM runtime judge in v1 (inline generation + judging): pollutes ground
  truth with judge error; violates the zero-fp structural gate; deferred v2
  covers the legitimate demand.
- R2 Public distribution of the MR corpus (npm or git): contradicts the
  ADR-0036 anti-gaming posture (answer keys never enter public channels; NIST
  CAISI solution-contamination bisection).
- R3 Unvalidated machine-generated transforms directly into the corpus:
  LLMorph's ~60% true-positive ceiling makes this a self-inflicted false gate.
- R4 Per-family threshold tuning: ASE'26 global-threshold discipline;
  per-family adjustment hides regression behind metric shopping.
- R5 Self-consistency resampling ("ask again") counted as MR: SelfCheckGPT is
  a fallback consistency signal, not a metamorphic relation; MetaQA proved
  repeat sampling restates the same hallucination.

## Consequences

- Implementation (next round): mr-probes.jsonl v1 corpus (10-15 pairs across
  three families, sourced per D3), check-mr-probes.js, gates.json +
  thresholds.json registrations, coverage-map declared-gap rows for IL5/IL6,
  deferred-registry v2 entry, jest wiring tests, CONTEXT/README updates.
- The corpus family count becomes three; the frozen polygraph corpus remains
  the statistical backbone, probes and MR pairs remain structural zero-
  tolerance gates.
- npm artifact boundary is orthogonal and recorded separately in ADR-0038.
