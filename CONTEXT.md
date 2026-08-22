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

**Evidence Contract**:
The structured interface between gate.js (writer) and the verdict-gate hook
(reader). The evidence file must be a JSON array of evidence records, not
arbitrary non-empty text. An empty array `[]` is NOT evidence — this closes
the false-completion vector where the gate writes structural emptiness and
the hook passes on non-empty string length.
_Avoid_: evidence file, evidence check (those describe the mechanism, not the contract)

**Adapter Drift**:
The state where generated adapter files diverge from the single source
(src/SKILL.md). check-drift.js detects this by verifying existence of all 7
adapter files and checking 4 distinctive fragments across instruction-tier
adapters. Drift indicates someone edited SKILL.md without running
build-adapters.js.
_Avoid_: stale adapters, out-of-sync (use the canonical term)

**Hash Chain (证据哈希链)**:
A tamper-evident linked structure where each evidence record contains the
SHA-256 hash of the previous record (prev_hash). Deletion, reordering, or
modification of any record breaks the chain at that point. Uses canonical JSON
(RFC 8785 inspired key sorting) for deterministic serialization before hashing.
Does NOT require Merkle trees — linear prev_hash chaining is sufficient for
single-file evidence logs where O(n) verification is acceptable.
_Avoid_: merkle tree, block chain (those are different structures)

**Confidence Calibration (置信度校准)**:
The process of mapping raw LLM confidence scores to calibrated probabilities
via Platt sigmoid scaling (minimal viable, ~60 lines, zero-dependency) or
isotonic regression (upgrade path, needs 1000+ labeled samples). The static
0.4/0.7 escalation band is the uncalibrated default; deriveThresholds() can
override it with data-driven thresholds at a target precision. Calibration
logging is best-effort append-only JSONL.
_Avoid_: probability calibration, score normalization (use the canonical term)

**MCP Adapter (MCP 适配器)**:
A stdio MCP server (jiahao-mcp/) exposing jiahao verifier discipline via
registerPrompt + registerTool for MCP-only agent hosts that lack system-prompt
injection hooks. Mirrors ponytail-mcp pattern. MCP prompts are user-controlled
on-demand pull, not always-on injection — the MCP adapter is a fallback for
hosts without hook capability, not a replacement for hook-based adapters.
_Avoid_: MCP server, MCP plugin (those are generic; use the canonical term)

**Role-Tagged Profile (角色标记配置)**:
The dual-profile architecture where jiahao ships two rule sets in a single
distribution: a Generator Profile (lite, attacks surface signals) and a
Verifier Profile (full, carries iron laws + verification gate + hash chain).
Profile is selected at install time via a flag file (.jiahao-profile), not
detected at runtime. No production plugin does runtime role detection —
installation-time configuration is the industry consensus (LangGraph graph
structure, AutoGen agent role assignment, Codex review workflow invocation).
_Avoid_: dynamic role detection, runtime role switching (those are unproven;
use the canonical term)

**Generator Profile (生成器配置)**:
The lite rule set installed in the primary agent. Targets the surface signals
of False Completion Syndrome identified by Advani et al. (ICML 2026): confident
closing language and no-state-change action sequences. Rules: "no evidence, no
completion claim" and "list verified state changes when claiming done." Does NOT
include the verification ladder or LLM critic — academic evidence (Huang 2024,
Kamoi 2024) proves self-verification cannot improve error detection, only
surface output. Verification here means calling a verification tool, not
re-thinking.
_Avoid_: lite mode, generator mode (those conflate intensity with role; use the
canonical term)

**Verifier Profile (验证器配置)**:
The full rule set installed in the second-party verifier agent. Carries all 7
iron laws, the 6-rung verification ladder, hash-chained evidence, structured
verdict (machine-verified / independently-checked / unverified), and bias
guards. The verifier must hold information the generator did not use — the
information-theoretic requirement (Multigrid 2026). Identity independence
(Panickssery 2024) recommends different model family or at minimum different
context/prompt.
_Avoid_: full mode, verifier mode (those conflate intensity with role; use the
canonical term)

**Tool-Grounded Verification (工具接地验证)**:
The principle that verification must invoke external tools (test execution,
state queries, search retrieval) rather than re-thinking in the same context.
CRITIC (Gou et al. ICLR 2024) ablation proves removing tools collapses
self-correction. Huang (ICLR 2024) proves intrinsic self-correction without
external feedback degrades performance. Two tool categories: retrieval-type
(search, docs, API specs — anysearch-cli domain) and state-type (test runs,
DB diffs, command re-execution — AppWorld golden standard).
_Avoid_: tool-assisted verification (too vague; use the canonical term)

**Surface Signal Attack (表面信号攻击)**:
The Generator Profile's strategy: directly target the observable patterns of
false completion rather than trying to improve error detection (which is
structurally impossible for self-verification). Advani et al. (ICML 2026)
quantified that false success correlates with confident closing language
(+0.27-0.36 score) and no-state-change action sequences. Lightweight
TF-IDF/XGBoost detectors of these patterns achieve AUROC 0.83/0.95 vs LLM
judges' <=0.65. The generator profile attacks these signals at zero cost.
_Avoid_: signal detection, pattern matching (those are techniques; use the
canonical term)
