# Jiahao Iron Laws Design

## Context

ADR-0001 established jiahao as a prompt-as-mental-model skill distribution for
second-party agents. The open question was: what exactly are the ~100 lines of
Markdown that get injected into the second-party verifier agent?

Atomcode research (21 searches, 14 source reads, 3 engines) surveyed production
systems (ponytail, Claude Code Code Review Plugin, DeepEval, Inspect AI) and
academic literature (Huang et al. ICLR 2024, Tyen et al. ACL 2024 Findings,
LLM-Modulo, Constitutional AI, CheckEval, Reflexion). Key findings:

- No existing project distributes verifier-specific prompt rules as injectable
  Markdown — this is jiahao's ecological niche.
- Ponytail's 7-rung decision ladder (for primary agents) is the structural
  template; jiahao mirrors it with a 6-rung verification ladder (for second-party
  agents).
- LLM judge AUROC for detecting false completion is <=0.65 (Advani et al.);
  lightweight TF-IDF detectors achieve 0.83-0.95 — deterministic checks are
  strictly preferred over LLM-based judgment.
- The bottleneck is error detection, not correction (Tyen et al.: locating
  errors first makes correction effective).
- 12 documented judge biases (Calm et al.) require structural countermeasures:
  rubric, checklist, CoT, confidence threshold, blind ordering.

## Decision

Adopt the iron laws Markdown as the single source of truth for jiahao's
prompt-as-mental-model content, structured as:

1. **Frontmatter** — SKILL.md format with name/description/argument-hint/license
2. **Identity** — second-party verifier, second information boundary (not second
   opinion)
3. **Persistence** — always active, default verdict NOT VERIFIED
4. **Verification ladder** (6 rungs): deterministic check > ground truth >
   re-execution > checklist decomposition > independent LLM critic > NOT VERIFIED
5. **Iron laws** (7 rules): anti-author-judge, errors-found-not-felt, distrust-
   confident-language, calibrated-tiers, verify-side-effects, no-showing-off,
   no-self-comforting
6. **Output format** — verdict + evidence + locations + unchecked items
7. **Bias guards** — rubric/blind-order/score-threshold/authority-bias-suspect
8. **Intensity** — lite/full/ultra (mirroring ponytail's levels)
9. **Boundaries** — verification-not-generation, freeze-acceptance-tests,
   information-boundary-collapse detection

## Consequences

- The SKILL.md is the single source of truth; all host adapters derive from it.
- The 6-rung ladder inverts ponytail's 7-rung "do less" ladder into "verify
  more" — same structure, opposite direction.
- Rung 5 (LLM critic) is explicitly the weakest; this is the empirical finding
  from Advani et al. (AUROC <=0.65) and Huang et al. (intrinsic self-correction
  degrades performance).
- The iron laws are a soft constraint (model compliance not guaranteed); effect
  must be validated with fair baselines per ponytail's lessons.
- "NOT VERIFIED" is a first-class verdict, not a failure — this is the
  calibration iron law (Huang et al.: pretending to have checked is worse than
  admitting you cannot).
