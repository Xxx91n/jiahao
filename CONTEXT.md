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

**Profile Flag (`.jiahao-profile`)** (Profile Flag 文件):
Install-time configuration file in the config directory (`$CLAUDE_CONFIG_DIR`
or `$HOME`) containing `generator` or `verifier`. Read by `jiahao-activate`
(which rule set to inject) and `jiahao-verdict-gate` (advisory vs blocking).
Absent flag = `verifier` for backward compatibility. Industry precedent
(Claude Code `defaultEnabled`, Cline rules toggle, Codex AGENTS.md sections)
shows install-time selection is the dominant pattern; runtime role detection
is unproven.
_Avoid_: env-var toggles, runtime detection (those add complexity without
evidence; use the canonical mechanism)

**Structural Signal Detection (结构化信号检测)**:
The detector's primary evidence mode: scoring false completion from
execution structure, not surface phrases. Three channels (agent-polygraph
L1-L3 shape): L1 error_concealment (tool error + success claim), L2
completion_vs_evidence (completion claim with no evidence record), L3
narrative_vs_assertion (files edited, no verification run, "works"
asserted). Structural signals stay effective even when fully public —
detection power rides on evidence the generator cannot fake without doing
the work.
_Avoid_: keyword detection, phrase matching (those are the demoted triage
layer; use the canonical term)

**Wordlist Triage Layer (词表分诊层)**:
The demoted role of the detector wordlist after ADR-0014: a low-confidence
feature feeding suspicion scoring, never the primary detector. Industry
baseline status confirmed by polygraph-bench (b1_regex "naive keyword
floor") and the 2026-07-09 archival of protectai/llm-guard (string-list
layer superseded by behavioral platforms).
_Avoid_: primary detector, magic word list

**Phrase File Integrity (词表文件完整性)**:
The practice of shipping the detector wordlist outside the audited agent's
working directory (${CLAUDE_PLUGIN_ROOT}/private/phrases.json or
JIAHAO_WORDLIST env) with a SHA-256 fingerprint checked at hook startup.
This is cost-raising and rule-tamper detection, NOT secrecy — declared
honestly per CWE-656 (security through obscurity is not a boundary) and
agentguard's threat-model precedent.
_Avoid_: secret wordlist, encrypted rules (implying cryptographic
guarantees jiahao does not make)

**Cross-Turn Hash Chain (跨轮哈希链)**:
The evidence-chain upgrade from ADR-0013: `.jiahao-evidence` is append-only
across turns, each turn opens with a `turn_init` record chained onto the
previous tail hash, and `prev_hash` is INSIDE the hashed body
(`H(canonical(record) || prev_hash)`, Crosby & Wallach 2009) — closing the
tail-truncate-and-relink hole left by ADR-0007's hash-input exclusion.
Linear chain only; Merkle trees and signatures remain deferred upgrades.
_Avoid_: blockchain, Merkle log (different structures)

**Composite Idempotency Key (复合幂等键)**:
`SHA256(session_id | turn_id | tool_seq)` per evidence record; on write,
same key = skip (first-writer-wins, Stripe/BackendBytes pattern via
ON CONFLICT DO NOTHING semantics). Hooks re-firing within a turn
(Stop + SubagentStop parity, double-fire) become no-ops instead of
phantom records. Distinct from a UUID: derived from stable business fields,
recomputable, collision-safe for dedup.
_Avoid_: request id, uuid (not stable across legitimate retries)

**Chain Verification Duty (链验证义务)**:
Every read of `.jiahao-evidence` runs `verifyChain()` — "a chain you never
verify is just a log" (hasp). A chain break is treated as corruption:
blocking severity in verifier profile, advisory in generator profile.
O(n) per read is trivially cheap at expected log sizes.
_Avoid_: lazy verification, verify-on-export (leave the chain unchecked)

**Structural Signal Coverage (结构化信号覆盖)**:
ADR-0014 imposed a coverage gap: tool activity must EXIST for L2/L3 to fire.
If a turn has no tool calls and no evidence, structural signal detection
passes even when the wordlist hits — this is intentional triage-only falloff.
The remedy is that verdict-gate's advisory still surfaces the wordlist signal
even when L1-L3 yield nothing. Coverage and conservatism are not contradictory
here: an audit agent producing NO tool calls and NO evidence was not the
target jiahao is aimed at (that's an idle agent, not a false-completion case).
_Avoid_: chasing zero-FP on L2 (the cost was leaked to L3/wordlist; ponytail)

## Decision Log

**Self-Preference Bias (自偏好偏差)**:
An LLM judge's intrinsic tendency to favor its own outputs even when unaware
it generated them; the mechanism is perplexity/familiarity, not recognition
(Wataoka et al., arXiv:2410.21819). Stronger same-family models can exhibit
*more* bias (Yang et al., arXiv:2604.22891). Consequence for jiahao: a
verifier in the same model family as the generator is biased regardless of
context-window separation; prefer a different model family.
_Avoid_: self-verification bias, judge bias (use the canonical term)

**Verifier Deployment Discipline (验证器部署纪律)**:
The three-layer separation that makes the Verifier Profile effective:
(1) instance — separate context window (subagent / teammate session /
independent process), never same-context self-review; (2) process —
independent deployment for formal audit (CodeRabbit cloud sandbox, Copilot
review on GitHub Actions); (3) model layer — prefer a different model family
as the self-preference bias guard. Config-file co-location is inert;
independence lives at the deployment layer. This is why jiahao does not
support co-installation of competing generator/verifier profiles.
_Avoid_: agent isolation, verifier isolation (those name the symptom, not
the discipline)

**Two-Tier Install UX (双层安装 UX)**:
Tier 0 is the documented manual path: one `echo "verifier" > $CONFIG_DIR/.jiahao-profile`
line — the strongest precedent in pure-prompt distribution (shadcn manual
tab, anthropics/skills, awesome-cursorrules). Tier 1 is `npx jiahao init`
(or `jiahao init --profile <name>`): a single-question CLI using `prompts`,
supporting `--profile`, `-y`, and auto-detecting CI / non-TTY with an
informative failure. The CLI writes only the flag file — not the SKILL
content — and prints the Verifier Deployment Discipline reminder after
writing.
_Avoid_: installer, setup wizard (those describe the mechanism; use the
canonical tier framing)


**Detector Verdict (检测判定)**:
The deterministic local check `detect(text)` over a private bilingual
jiahao-language wordlist (e.g. 搞定了 / 跑通了 / 没问题 / done / verified /
all good). The output is seed metadata `{ suspicious, matched_phrases,
severity }` written into the evidence record before hashing — never a
standalone verdict that can block, never a phrase list exposed in the
prompt. The information-theoretic invariant from SKILL.md applies: a check
that uses only information the generator already used is verification
theater. arXiv 2504.11168 shows exposed wordlists are evadable at 44-100%
ASR, so the wordlist must never enter SKILL.md.
_Avoid_: classifier, judge, filter (those describe mechanisms; Detector
Verdict is the role it plays in the evidence chain)

**Suspicion Escalation (可疑升级)**:
The detector is a *triage* signal, never a final block. The 10% flag-rate
precision of ~50% (ICML 2026 FAGEN workshop) means a hard block on wordlist
hits manufactures a new false-completion theater. The policy gate reads
`profile × severity`: Low severity is advisory-only; High severity can
block only the Verifier Profile (independent instance). This is the
IETF draft-sharif-agent-audit-trail role split in practice.
_Avoid_: gating by detector alone, detector as gatekeeper (those are the  wrong shape; escalation is owned by the profile policy, not the detector)

**Advisory vs Blocking Mode (咨询 vs 阻断模式)**:
Generator Profile = advisory-only (warn via systemMessage, never block, and
still record the advisory inside the hash chain so it is tamper-evident).
Verifier Profile = blocking on no-evidence / high-severity suspicion,
advisory on low-severity. This split *is* Iron Law 3 ("the judge cannot be
the author") — it is not a UX nicety; it is the discipline that makes
self-review structurally inert (Huang ICLR 2024; Kamoi TACL 2024).
_Avoid_: fail-open, fail-closed (those are policy words; the generator is
never blocked, the verifier may block)

**Idempotent Evidence Round (幂等证据轮次)**:
`.jiahao-evidence` holds the turn's hash-chained records. `EvidenceLog.append`
dedups on the sidecar `_idem` key set (append-only, first-writer-wins),
so replays of the same turn do not accumulate phantom records. `verdict-gate` does NOT
consume-on-read (no `unlinkSync`); records are idempotent and audit-grade
over time. Turn identity is `session_id + turn_id` from the hook input;
`idempotency_key` is not required by default, only when federating
cross-session audits later.
_Avoid_: consume-on-read, stop hook dedup (those defeat the audit chain or
conflate integrity with idempotency). Superseded partially by ADR-0013:
the file now supports an append-only, cross-turn hash chain with a
composite idempotency key (prevents replacement-hack truncation).

**SubagentStop Parity (SubagentStop 等价)**:
Claude Code converts plugin-registered Stop hooks into SubagentStop events
for subagent completions; register both events against
`jiahao-verdict-gate.js` so the per-turn gate fires uniformly across the
primary agent and any verifier subagents. Without parity, a subagent's
completion slips past the gate the primary agent is held to.
_Avoid_: stop-only registration (silently asymmetric)

**EvidenceLog**:
The append-only, hash-chained evidence store: the single writer/reader
surface for all verification evidence, with tamper-evident persistence fully
hidden behind a small module interface.
_Avoid_: evidence store, event store, evidence file (mechanism, not module)

**GateLadder**:
The pure, fs-free verification business logic: trust-tier assignment and the
deterministic-to-critic escalation decision over claims and gates.
_Avoid_: gate module (the old monolith), verifier core

**Shared Core (src/shared)**:
Carrier-neutral shared modules depended on by every distribution carrier
(hooks, scripts, MCP) and by core modules alike; dependencies in this project
point inward, toward this core.
_Avoid_: utils, common, lib

ADRs in `docs/adr/` (numbered, immutable once Accepted). Active decisions:

- ADR-0001 prompt-as-mental-model for second-party agents
- ADR-0002 jiahao iron laws design
- ADR-0003 hook architecture
- ADR-0004 verification gate ladder
- ADR-0005 skill distribution adapter pattern
- ADR-0006 architecture deepening (Evidence Contract, Adapter Drift)
- ADR-0007 hash chain tamper evidence
- ADR-0008 confidence calibration
- ADR-0009 MCP adapter
- ADR-0010 dual-profile role-tagged distribution
- ADR-0011 deployment discipline, install UX, drift automation
- ADR-0012 detector verdict persistence + hook idempotency
- ADR-0013 cross-turn hash chain + composite idempotency key
- ADR-0014 wordlist migration out of cwd + structural-signal primary
- ADR-0015 benchmark adoption (polygraph-bench) + FAGEN citation calibration
- ADR-0016 EvidenceLog/GateLadder split + shared core relocation
- ADR-0017 ESCALATE verdict + human adjudication write-back

**Escalate Verdict (升级裁决)**:
Fourth ladder verdict emitted when the llm_critic rung is exercised but
cannot produce a decisive answer. Advisory-only: it never blocks, but the
verdict-gate hook surfaces a pronounced warning and counts it as a Pending
Escalation. NOT VERIFIED is removed as the escape hatch for an exercised-
but-inconclusive critic (ADR-0017 D1).
_Avoid_: soft fail, warning verdict, inconclusive (Escalate Verdict is a
routing decision to a human, not a weaker failure)

**Human Verdict Record (人审裁决记录)**:
Append-only EvidenceLog record (kind 'human_verdict') written by
`jiahao resolve`; carries reviewer_id, enum-validated verdict, reason,
optional corrected_output assertion, and a reserved second_reviewer field.
It is both audit evidence and an ADR-0008 calibration training point, and it
may overturn a machine verdict (the overturned verdict becomes a calibration
negative sample).
_Avoid_: edit in place, sidecar annotation, approval comment (rewriting
trips the hash chain; side-by-side storage breaks auditability)

**Pending Escalation (未决升级)**:
Count of Escalate Verdict records in the chain that have no matching Human
Verdict Record yet. Advisory state only — surfaced in hook output, never a
blocking condition (ADR-0017 D4).
_Avoid_: escalation debt queue, review backlog SLA (no threshold-based
blocking exists; see D5)

**Anti-Anchoring Two-Phase (防锚定两阶段)**:
The resolve CLI flow mandated by ADR-0017 D2: phase 1 shows raw evidence
records and the critic's stated reasons; phase 2 collects the human verdict.
The machine never pre-shows a conclusion, because shown machine answers
induce rubber-stamping even when wrong (arXiv:2606.29033).
_Avoid_: confirm dialog, default suggestion, verify-and-correct UI

**Human Override (人审覆盖)**:
Convention (jihao-original, no industry precedent) that a Human Verdict
Record may overrule any machine verdict; every override is simultaneously an
audit record and a calibration negative sample, so the detector learns from
each overrule instead of the overrule disappearing.
_Avoid_: admin override, force pass (those erase the contest history)
