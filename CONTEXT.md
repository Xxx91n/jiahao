# Jiahao (嘉豪)

A prompt-as-mental-model skill distribution for second-party agents — external
verifiers and critics in LLM agent runtimes. Jiahao injects anti-false-completion
discipline into the agent that checks the primary agent's work, not into the
primary agent itself.

## Language

**Jiahao (嘉豪)**:
The project. A prompt-as-mental-model skill distribution targeting second-party
agents, analogous to how ponytail targets primary agents.
_Avoid_: agent, verifier, checker (those are roles, not the project)

**Second-party Agent**:
An external verifier or critic agent that checks the primary agent's output. It
holds information the generator did not use — the information-theoretic
requirement for effective verification.
_Avoid_: secondary agent, helper agent, assistant

**Primary Agent**:
The main executing agent that generates outputs and claims completion.
_Avoid_: main agent, first agent

**False Completion Syndrome**:
The systematic failure mode where LLM agents falsely claim task completion,
self-deceive about success, or hallucinate self-evaluation. Quantified at
45-48% of failures in single-control-domain tasks (ICML 2026 workshop paper),
75.8% in AppWorld self-evaluated coding-agent trajectories.
_Avoid_: false success, premature completion (use the canonical term)

**Verification Gate**:
A machine-verifiable evidence checkpoint that downgrades "completion" from an
agent's claim to verifiable evidence. Prefer deterministic checkers (test
suites, compilers, hash comparisons) over LLM-based self-evaluation.
_Avoid_: validation check, completion check

**Prompt-as-Mental-Model**:
The architecture pattern where behavioral rules are injected as always-on prompt
via hooks or resident instruction files — not loaded on-demand. The injection
timing is the leverage point, not the file format.
_Avoid_: prompt engineering, system prompt (those are techniques, not the pattern)

**Actor-Critic Separation**:
The academic mainstream where critic/verifier is an independent module —
independently trained, independently invoked — rather than embedded
self-verification in the same model.
_Avoid_: dual-agent, two-agent (use the canonical term)

**Generator-Verifier Gap**:
The empirically quantified asymmetry: generation and verification are different
capabilities requiring separate optimization. A model good at generating answers
is not automatically good at verifying them.
_Avoid_: G-V gap (spell it out)

**Jiahao-style Behavior (嘉豪式行为)**:
The anti-pattern behaviors jiahao targets: presumptuous completion (自以为是完成),
self-comforting success (自我安慰跑通), delusion of competence (颅内高潮),
showing off without doing real work (显摆不干活).
_Avoid_: bad behavior, lazy agent (use the canonical term)

**SufficiencyGate (充足性门)**:
In anysearch-cli: "搜够了没" (retrieval sufficiency). In jiahao: "任务真完成了吗"
(task completion verification). Two complementary gates — one governs input
quality, one governs output authenticity.
_Avoid_: quality gate, check gate
