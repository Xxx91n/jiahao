# Prompt-as-Mental-Model for Second-Party Agents

## Context

The project targets a specific problem: LLM agents in runtime exhibit systematic
false completion — claiming tasks are done when they are not, self-deceiving
about success, hallucinating self-evaluation. Academic research (Huang et al.
ICLR 2024; ICML 2026 workshop) quantifies this at 45-48% of failures in
single-control-domain tasks and 75.8% in AppWorld self-evaluated trajectories.
The bottleneck is not correction ability but error detection: LLMs cannot
reliably find their own logical errors (ACL 2024 Findings).

External verification is the academic consensus. The information-theoretic rule
(Multigrid 2026) states a verification step can only catch an error if the check
holds information the generation did not use. Intrinsic self-correction without
external feedback degrades performance (Huang 2023). Sound external verifiers
improve outcomes (Stechly et al. 2023, Kambhambati's LLM-Modulo). The mainstream
form is actor-critic separation: independently trained verifier modules (CGI,
Prospector, LM2, OpenAI o1's learned scoring function, DeepSeek-R1's rule-based
verifier).

## Decision

Adopt the prompt-as-mental-model architecture pattern — the same pattern proven
by ponytail (DietrichGebert/ponytail) — but specialized for second-party agents
(external verifiers/critics) rather than primary agents.

1. **Kernel mental model**: ~100 lines of Markdown defining anti-false-completion
   iron laws, injected as always-on prompt via hooks (SessionStart/SubagentStart).
   The file format (SKILL.md/AGENTS.md) is a distribution carrier; the leverage
   is injection timing.

2. **Target host**: second-party agents — independent verifier/critic agents that
   check the primary agent's output. NOT the primary executing agent.

3. **Verification gate design**: prefer deterministic checkers (test suites,
   compilers, state hash comparison) over LLM-based self-evaluation. Independent
   LLM critic is the fallback for open-domain tasks without programmatic ground
   truth.

4. **anysearch-cli integration**: deferred. The SufficiencyGate complementarity
   (retrieval sufficiency vs task completion verification) is noted but not
   implemented in this phase.

## Consequences

- Jiahao is a skill distribution, not an agent itself — same relationship as
  ponytail to its host agents.
- The iron laws must be empirically validated with fair baselines and independent
  reproduction (ponytail's benchmark claims were discounted 33-50% by independent
  verification; SKILL.md lazy-load self-activation rate was zero).
- The prompt-level control is a soft constraint — model compliance is not
  guaranteed. Effect decays across model iterations.
- Deterministic verification gates are preferred where ground truth exists; LLM
  critic gates are the fallback for open-domain tasks.
