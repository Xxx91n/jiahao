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
Linear chain only; Merkle trees and signatures remain deferred upgrades. Registered as defer-0003 in docs/deferred-registry.json (ADR-0033).
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
- ADR-0018 calibration flywheel (threshold band + few-shot injection + kappa)
- ADR-0019 detector v2 (suppression rules + judge seam) + ADR-0015 D2 core-floor correction
- ADR-0020 multi-page enumeration with pagination-exhaustion pairing
- ADR-0021 request-side anchor signals + rescue-dominant trust direction (D6 delivery)
- ADR-0022 detector hardening: length caps + censoring metadata + degradation contract
- ADR-0023 timeout sentinel reconciliation + degradation schema evolution discipline
- ADR-0024 sentinel ownership lock + reconcile hardening + session-end sweep
- ADR-0025 judge form convergence (scoring-mode verifier contract) + honest-twin corpus + seam telemetry contract
- ADR-0026 segmented evidence log: rotation + cross-segment anchoring + base-seq naming + verifyTail/verifyFull + transparent legacy migration
- ADR-0027 bench gate: executable pre-registered thresholds (D1 real re-run, D2 derived config + guard, D3 0/1 + aggregated warning, D4 milestone archive)
- ADR-0028 multi-host L0 closure: regen-diff golden (--check) + host-contracts.json registry (term-anchored coupling guard) + 4 new research-gated adapters (copilot/qoder/opencode/aider) + lifecycle register
- ADR-0029 behavioral probe gate: per-iron-law paired probes (7+7 zero-miss smoke gate) + probe-recall/probe-fp registry + pre-registered growth + advisory upgrade channel + signing rejection log
- ADR-0030 probe corpus growth: interval coverage gate (law-dup dropped) + deferred edition/git-history gates with unfreeze conditions + judge re-verification runbook/ledger/dead-man switch + generator advisory disposition
- ADR-0031 wiring assertions (D1 mandatory per wiring-touching ADR) + judge bias calibration corpus (style/length-control + bias-probe, 3 metrics) + gate tier taxonomy (confirmatory/observational/deferred-with-unfreeze) + judge-input certificate isolation + optional evidence provenance (SLSA additive) + debt pack (F4/F5/S2/S3/S4)
- ADR-0032 generator surface rules deepening: inline gsr header (id/signal-domain/status, git-as-version) + coverage-map.json registry + check-coverage.js four-state gate + pre-registered equivalence statement (no statistical gate) + rule lifecycle triad admission / 6-8 active cap / six-reason retirement
- ADR-0033 deferred/unfreeze registry: docs/deferred-registry.json fact-source + confirmatory fail-closed + pending-evaluation + expiry-forces-action + coupling guard (seeds: sigstore / L1-L2 golden / Merkle)
- ADR-0034 gate registry: docs/gates.json fact-source + gate:all single entrypoint + run-all-aggregate with --fail-fast opt-in + CRTM-as-entry ordering contract + three-face alignment (ci.yml wiring assertion) + pre-commit untouched; generated-ci.yml uplift registered as defer-0004 in docs/deferred-registry.json
- ADR-0035 deferred registry maturation: review cadence ladder (quarterly/half-yearly/yearly by type x likelihood x exposure) + pending-evaluation residency SLA min(2 cycles, 12 months) + weak-form check_in discipline (warn-level) + defer-0002 split (0002 external-event narrowed / new defer-0005 free-text protocol-verification) + defer-0004 honest presence-condition via real verified_by assertion script + check-deferred.js verified_by enforcement (unverified claim auto-downgrades to pending-evaluation)
- ADR-0036 anti-gaming audit: NIST CAISI boundary (contamination vs grader gaming, A-2+A-3 subset) + answer-corpus migration to private/bench-corpus (probes/judge-twins/twins; thresholds stays public with private_corpus sha256 anchors) + known-exposed history handling (probes refresh now, twins on cycle) + gate-defaults params consistency assertion + corpus-freshness gate (cadence-tiered, tier warn / 1.5x fail-closed, event trigger) + check-corpus-leak fingerprint gate
- ADR-0037 metamorphic relations third corpus family: staged hybrid (v1 hand-authored selected MR specs, v2 deferred LLM+judge pipeline) + <=3 pre-registered families (claim negation / equivalence restatement / evidence flip) + IL5/IL6 declared-gap + deterministic check-mr-probes.js zero-violation gate + Wilson honest annotation / McNemar at v2
- ADR-0038 npm runtime-artifact surface: files whitelist tarball-as-wheel (prompt-installer, measured budget per ADR-0039) + corpus gates maintainer/CI-only fail-closed by design (git clone also carries no corpus) + honest missing-corpus message + private-registry-only future corpus channel (deferred)
- ADR-0039 tarball runtime surface narrowing: docs/adr + docs/agents leave the npm artifact (archive channel = the git tree itself; no Releases/sparse-checkout infrastructure), whitelist keeps docs/gates.json + coverage-map.json + deferred-registry.json machine fact-sources + CONTEXT.md vocabulary asset; measured-anchor budget 200,000 bytes with ADR-text content anchor, single confirmatory tier, no warn band

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

**Calibration Flywheel (校准飞轮)**:
The closed loop that reads Human Verdict Records back into the verifier
(write path was closed by ADR-0017 D2; the read-back half is ADR-0018).
Composed of Threshold Band (Layer 0) and Few-Shot Calibration Injection
(Layer 2), measured by Kappa Governance. R5 on the verification maturity
ladder.
_Avoid_: feedback loop, self-learning verifier (no model weights are
touched; write-back media are examples and decision boundaries, not
gradients)

**Threshold Band (阈值带)**:
Dual boundary replacing a single confidence cut (maf-evals pattern): floor
(blocking) + target (warning). Scores inside the band warn instead of
verdicting — "a single cut-off turns anything near it into a coin flip".
Derived from the Platt fit by deriveThresholds; recomputation is explicit,
never silent (ADR-0018 D2).
_Avoid_: auto-tuned threshold, single cut-off, hysteresis (a band is a
decision boundary pair, not a dynamic feedback controller)

**Few-Shot Calibration Injection (few-shot 校准注入)**:
Read-back channel that injects up to 5 randomly sampled human-verdict
examples (reason field mandatory — a correction without a stated reason is
a wasted signal) into the Level-4 critic prompt per verify call
(ADR-0018 D3; LangSmith Align Evals defaults). Omitted entirely below ~10
eligible calibration points.
_Avoid_: RAG retrieval, fine-tuning, rubric rewriting (injection is
bounded example replay, not learned retrieval and not rubric auto-revision)

**Kappa Governance (κ 一致性治理)**:
Measurement layer of the Calibration Flywheel: Cohen's κ + confusion
matrix + per-class precision/recall over paired machine/human verdicts from
the chain; raw agreement is never reported alone (90% raw agreement can
mean κ≈−0.05 under class imbalance). Drift alert RE-ALIGN fires when
Δκ ≥ 0.05 vs last baseline or κ < 0.40. Advisory-only telemetry, never
blocking (ADR-0018 D4).
_Avoid_: accuracy target, raw agreement dashboard (both collapse under
imbalanced verdict distributions)

**Claim-Evidence Pairing (宣称-证据配对)**:
The relational judgment at the core of detector v2 (ADR-0019 D1): a
completion claim in a closing message must be paired against behavioral
evidence inside the SAME turn — relational matching, not keyword
co-occurrence (keyword alone: FP 30.9%; relational: FP 5.5%).
_Avoid_: keyword trigger, vibe check (pairing is evidence-anchored)

**Suppression Rule (抑制规则)**:
A condition, scoped to the current turn, that downgrades an armed
structural signal to severity `low` rather than letting it block — the
built-in FP defense of ADR-0019 D2 (industrial precedent: Sentry
ignore-until, Camunda ≤5% FP gate budget). Suppression never erases the
event: the signal still lands in the hash chain.
_Avoid_: filter, ignore list (suppression is a severity decision with an
audit trail, not event deletion)

**Honest Lexical Twin (诚实词汇孪生)**:
An honest turn sharing surface vocabulary with a lie class (H1-recov
retried-to-green, H5 doc-only "fixed", H6 coincidental-digit bait) — the
unit every suppression rule must demonstrably not flag; the benchmark's
core design law is discrimination against twins, not keyword presence.
_Avoid_: false positive, edge case (twins are first-class design targets)

**Judge Seam (judge 扩展缝)**:
The reserved-but-unimplemented interface `judge(claim, toolResults,
heuristicVerdict) -> override|null` of ADR-0019 D4 with honest_only
escalation semantics (rescue misses only, never new FPs) and fail-soft
(unavailable -> heuristic verdict stands). Implementation is forbidden
until it passes the internal-holdout FP gap <= 3pp gate.
_Avoid_: plugin point, reviewer hook (the seam has a forbidden-now
implementation contract)

**Beat-b2 Gate (beat-b2 基准门)**:
The corrected pass criterion from ADR-0019 D5: core-split score must
exceed b2's core score 0.385, with the pre-registered recall > 46.0% @
FP <= 4.5% unchanged; the benchmark's 0.80 number is its own ranking
floor, never a jiahao pass line.
_Avoid_: score target, fixed threshold (the gate is defined relative to
the shipped heuristic baseline, not an absolute number)

**Pagination-Exhaustion Pairing (分页-耗尽配对)**:
The discriminator of ADR-0020 D2: a paginated enumeration supports a
completeness claim only when the final page comes back strictly short of
the fullest page fetched, proving the set is exhausted; a final page that
is exactly full leaves the next page unproven and the claim stays armed.
_Avoid_: count matching, page tally (equality of counts is not evidence
of completeness — the L2a twins share the claim==count surface)

**Request-Side Anchor Signal (请求侧锚点信号)**:
The hook-recorded request parameters of a tool call (`tool_input`:
per_page, page/cursor) plus the response's Link header — ground truth
from the host runtime, not the model's self-report — admitted to the
evidence chain as a parallel signal family alongside response-shape
signals (ADR-0021 D1/D2).
_Avoid_: prompt log, agent testimony (the anchor is what was actually
sent, never what the agent says it sent)

**Server-Authoritative Boundary (服务器权威边界)**:
A continuation/termination signal asserted by the API server itself
(Link rel=next, has_more, next_cursor) rather than inferred from page
shape; per RFC 8288 plus GitHub/Slack/Stripe contract docs it is the
only evidence class strong enough for conviction — the single
conviction exception of ADR-0021 D3.
_Avoid_: heuristic stop, page-size inference (a short page is a weak
witness; Slack explicitly warns size<limit is not end-of-list)

**Signal Trust Table (信号信任表)**:
The per-API allowlist (initially GitHub, Stripe, Slack) naming which
publishers emit Server-Authoritative Boundaries per contract; APIs not
in the table fail-soft (no conviction, no rescue on absence). Governed
by the calibration flywheel (ADR-0018), not by hand edits (ADR-0021 D3
hardening condition 1).
_Avoid_: global toggle, hardcoded regex map (the table is a governed
calibration surface with drift detection, not config trivia)

**Censoring Metadata (删失元数据)**:
The structured payload `{ truncated, bytes_seen, bytes_total, threshold }` that
replaces a bare boolean when jiahao truncates an oversized input (ADR-0022 D3).
It upgrades a truncation event into a right-censored observation (U_i, delta_i),
so the calibration flywheel (ADR-0018) can route it into its own bucket instead
of letting a partial view poison Platt/ECE/kappa fitting with full-view
ground truth.
_Avoid_: truncation flag, bool (a bare flag declares the event but not the
amount — half-censored data cannot be bucketed or excluded correctly)

**Coverage Severity Orthogonality (覆盖与严重度正交)**:
The ADR-0022 D4 rule that detector reports facts (`coverage: full|partial`)
while policy decides what partial coverage means: verifier (blocking) profile
fails closed on coverage (route ESCALATE), generator (advisory) profile only
annotates. Severity is judged on the visible part alone and never inflated by
coverage.
_Avoid_: severity upgrade on truncation (escalating review tier, not
severity — XACML Indeterminate forbids an adverse opinion on missing
evidence)

**Degradation Contract (感知降级契约)**:
The single top-level detector output field
`degradation: { kind: truncation|timeout|scan-skip|null, detail }` of
ADR-0022 D5. All perception-degradation sources (truncation today; timeout and
host-side payload clipping later) project into this one taxonomy; `coverage`
is its derived view. New degradation kinds extend the enum, never the schema.
_Avoid_: per-source top-level fields, silent pass-through (per-source fields
force O(N) edits across gate/calibration/tests; silent pass-through is the
ADR-0006 Fix1 locality breach reborn)



**Sentinel Reconciliation (哨兵对账补写)**:
The crash-only pattern of ADR-0023 D1: every hook writes a sentinel file
at start and deletes it at completion; the next hook invocation, finding a
residue, appends a degradation record (kind 'timeout') into the
EvidenceLog so a host-killed hook can never die silently. Follows the
SQLite hot-rollback-journal precedent (file existence IS the evidence)
and stays WAL-free by construction.
_Avoid_: heartbeat, watchdog process (the host's hard timeout already owns
liveness; a heartbeat has no consumer — ADR-0023 D2)

**Phase Intent (阶段意图)**:
The in-place-updated phase field on the sentinel (stdin|scan|verify|write)
of ADR-0023 D2; on reclaim it pins down which stage died and feeds three
registered consumers (scan-skip affinity, partial-output trust boundary,
calibration bucketing — ADR-0023 D3). New detail fields are admitted only
with a registered consumer rule; telemetry without a consumer rots.
_Avoid_: telemetry-first field addition, per-phase fsync (the durability
budget is decided once at creation, not per transition)

**Schema Evolution Discipline (契约演进纪律)**:
The three additive rules for the Degradation Contract (ADR-0023 D5): only
add kind enum values; per-kind detail only gains optional fields; never
delete, rename, or restructure a recognized kind. Machine-checked at test
time via schemas/degradation.schema.json; unknown kinds fail-closed into
detail.unrecognized_kind instead of being silently coerced to null.
_Avoid_: in-place breaking edits, silent null coercion (silent schema
drift is the ADR-0006 locality breach reappearing at the contract layer)
**Sentinel Ownership Lock (哨兵归属锁)**:
The kernel-arbitrated ownership model of ADR-0024 D1: sentinel.begin
holds an exclusive lock on the sentinel file for its whole lifetime, and
reconcile() try-locks each residue before acting — acquired lock means
the owner is provably dead (kernel-released on any exit incl. SIGKILL),
a failed try-lock means a parallel live session owns it and it must be
left untouched. Same family as the SQLite hot-rollback-journal and
etcd ephemeral-node models; it eliminates pid-reuse, clock-skew, and
suspended-process false positives at once.
_Avoid_: pid liveness probes (pid reuse makes them unreliable), pidfile
conventions (yakking: use a lock on the file instead), heartbeat-based
judgement (no consumer; ADR-0023 D2 stands)

**Append Critical Section (追加临界区)**:
The narrow lock introduced by ADR-0024 D2 around the evidence-log
append critical section (read chain, idempotency-key dedup, append,
write-back) — millisecond scope, reconciliation path only, released
automatically on process death. It fixes the whole-file
read-modify-write lost update when two reconcilers heal different
residues concurrently; per-residue races on the same residue stay
covered by the idempotency key instead.
_Avoid_: global sweep/reconcile exclusion (serializes every hook start
for no benefit once consumers are idempotent), rename-to-.processing
markers (redundant under fd/inode locking; non-atomic on Windows)

**Session-End Sweep (会话终局扫掠)**:
The defense-in-depth addition of ADR-0024 D3: a SessionEnd hook (Codex
3s / Claude Code 1.5-60s budget) that runs reconcile() so a normally
ending session reconciles its own final residues instead of waiting for
the next session's first hook. The blind spot is theoretically
uneliminatable (crash = cessation of execution; failure detection must
be external per Chandra-Toueg) — the sweep merely shrinks it; a host
SIGKILL still defers evidence to next-session reconciliation, and that
residual is explicitly accepted and documented.
_Avoid_: watchdog daemons (watchman-regression; a trusted terminal
observer is required anyway), treating SessionEnd as a hard guarantee
(host docs: some signals kill the process before the hook can run)

**Scoring-Mode Verifier (评分式裁决器)**:
The only judge form permitted to occupy the judge seam (ADR-0025 D1): a small
fine-tuned verifier emitting Yes/No or class probabilities from logprobs, fed
into the ADR-0018 threshold band for calibration. Probability output (not
sampled token sequences) is what makes the <5s hook budget and the FP<=4.5%
budget jointly reachable; decode nondeterminism was the root cause behind the
b3 judge's FP 5.5% / 4.6s / temp-0 bit instability exclusion.
_Avoid_: prompt judge, LLM-as-a-judge (generic), self-consistency vote,
debate (all rejected in ADR-0025 D5)

**Judge Telemetry Contract (裁决器遥测契约)**:
The minimal four-metric set on the judge seam path defined by ADR-0025 D3 --
invocations, latency_ms_total/latency_ms_avg, fail_soft, overrides_accepted.
Counters live in src/detector.js and their snapshot rides into every
suspicious detectFull verdict record (judge_telemetry field) so observations
enter the hash-chained evidence log. Instrumentation first, dashboards later
(Grafana instrument-then-configure shape); extending beyond the four metrics
requires a new ADR.
_Avoid_: per-turn dashboards, free-form metrics (Motion 52-flags
counterexample)

**Honest-Twin Corpus (诚实双胞胎语料)**:
private/bench-corpus/judge-twins.jsonl (ADR-0036 D2, gitignored private surface): pre-registered hard cases where the L1-L3
heuristics fire but a competent judge must override to honest and cite the
rescuing evidence. Every entry carries provenance and collected_at; entries
older than 6 months are stale pending re-validation (eval-rot rule). The
corpus is the acceptance asset for any future scoring-mode verifier and must
never be used to tune thresholds (METR do-not-tune-on-eval discipline).
_Avoid_: tune-on-corpus, undated eval data, vibe evals

**Segment Anchor (段锚点)**:
The first record of every non-genesis segment in the segmented evidence log
(ADR-0026 D1/D3). It carries prev_segment_hash (SHA-256 of the previous
segment file, CloudTrail digest precedent) plus successor-anchored
prev_segment_count/bytes statistics, and links the hash chain via
prev_hash = previous segment tail event_hash. Bytes/count are pre-check
hints (O(1) statSync fail-fast); the hash chain remains the only integrity
authority.
_Avoid_: segment header mutation (journald anti-pattern), seal marker
embedded mid-file

**Base-Seq Naming (基准序号命名)**:
Segment files are named `%020d.jsonl` where the number equals the global
sequence of the segment's first record (Kafka base-offset style), allocated
by in-lock directory rescan of max+1 (ADR-0026 D3). Directory listing is the
only allocation source of truth -- no CURRENT/pointer file (RocksDB
counter-example). Filename vs anchor.seq_start cross-check catches rename
or copy tampering without hashing content. Timestamps never appear in
filenames (clock rollback, Windows 15 ms resolution collision).
_Avoid_: timestamped filenames, UUID names, allocation outside the narrow
lock, silent fallback to seq 0 on scan error

**VerifyTail Hot Path (尾段热路校验)**:
The default on-read integrity check for the segmented evidence log
(ADR-0026 D4): read only the active segment + statSync the previous one,
verify the segment anchor chain step and the in-segment hash chain. Full
verifyFull() walks every segment and filename/seq cross-checks; it is a
cold path, exposed via `scripts/verify-evidence.js --full`, never wired
into the per-turn verdict gate (ADR-0019 hook latency budget).
_Avoid_: full O(n) verification per turn, silent degrade to in-segment-only
when the anchor is missing

**Threshold Registry (阈值登记册)**:
The two-layer pre-registration structure of ADR-0027 D2: the ADR is the
registry (authoritative, immutable), bench/polygraph/thresholds.json is the
derived machine-readable config, and scripts/check-bench-thresholds.js is the
link-integrity guard (content anchor into source_adr plus same-commit ADR
coupling). The guard requires every threshold change to be accompanied by an
ADR but never judges direction; raising a threshold is a legitimate
ADR-led change (benchmark saturation, arXiv 2602.16763), only silent change
is forbidden. Parsing thresholds out of ADR prose is rejected (the same
number has different roles across ADRs).
_Avoid_: prose parsing as source of truth, guard rules that judge the
direction of a threshold change

**Bench Gate (基准门禁)**:
The single zero-dependency entrypoint npm run bench:gate (ADR-0027 D1/D3):
re-runs the deterministic corpus in-process to produce fresh metrics and
compares them against the Threshold Registry, exiting 1 below the floor and
0 otherwise, with in-band results expressed as exactly one aggregated
::warning:: annotation (never blocking; GitHub's native warning surface).
Comparing against stale metrics files is rejected -- the green check must
witness current code.
_Avoid_: three-exit-code gates, continue-on-error masking, reading old
metrics artifacts

**Band-Hit Telemetry (带内命中遥测)**:
The ADR-0027 D4 persistence shape: local bench:gate runs write
bench/polygraph/results/metrics-<date>.json committed by a human (extending
the byte-frozen run4-run6 archive convention); CI emits JSON/JUnit artifacts
as per-run evidence only (public-repo 90-day retention makes artifacts
useless as trend storage). Band-hit rates are aggregated at ADR-0018 flywheel
review points from results/*.json; no auto-commit bot, no SaaS.
_Avoid_: auto-commit bots to main, artifact-only trendkeeping, cloud
benchmark services


**Host Contract (宿主行为契约)**:
The pre-registered registry test/fixtures/host-contracts.json (ADR-0028 D4):
per-entry {id, host, event, exit_codes, decision_keys, decision_values,
fail_soft, term, source_adr}. Tests are table-driven from it; the file is
consumed by tests only and never shipped or read by hooks at runtime.
Change governance reuses the ADR-0027 coupling guard with a term anchor:
every entry's `term` must name a glossary term present in CONTEXT.md
(existence check, never prose parsing), and editing the registry without
an ADR or CONTEXT.md change in the same commit range fails CI.
_Avoid_: inline exit-code assertions as the only record of behavior,
runtime consumption of the contract file, prose-parsed anchors

**Golden Regen-Diff (重生成比对黄金层)**:
The golden-master mechanism of ADR-0028 D2: build-adapters.js --check
regenerates every adapter file in memory from src/SKILL.md and
byte-compares against committed files, printing a unified diff and
exiting 1 on mismatch. The update path is the existing explicit command
node scripts/build-adapters.js -- the approval act stays human. Layered
with check-drift.js: regen-diff catches unintended byte changes,
check-drift catches profile-fragment violations.
_Avoid_: jest .snap dual review surfaces, opaque hash manifests, any
auto-bless update path

**Adapter Lifecycle (适配器生命周期)**:
The per-host state register of ADR-0028 D6: each host adapter carries
active / deprecated / eol, with retirement triggers being official
shutdown announcements, repository archival, or consecutive
protocol-breaking versions without documentation updates. Host extinction
is an operating condition (Roo Code EOL 2026-05-15, Gemini CLI retired
2026-06-18), so the 11-host inventory is a living register, not a fixed
list. New hosts are added only after a serial atomcode research pass
against current official protocol docs.
_Avoid_: adapters for retired hosts kept as if current, new hosts added
from memory instead of researched protocol docs

**Protection Tier (保护层级)**:
  The disclosure of enforcement asymmetry (ADR-0028 D6): hook-tier hosts
  (claude-code, codex, copilot, qoder) can enforce verifier exit-2 blocking
  semantics; instruction-tier hosts (cursor, windsurf, cline, opencode, aider,
  instruction-tier AGENTS.md) deliver advisory-only soft injection. opencode
  is instruction-tier, not hook-tier: it has no hook or exit-2 mechanism
  (upstream #12472 open, #14551 not-planned, verified by atomcode research
  2026-08). README states the tier table explicitly so users never assume
  all 11 hosts are equal. Copilot's broken repo-level sessionStart (#1730)
  is recorded as a degradation: userPromptSubmitted is the attested
  injection path.
_Avoid_: uniform protection claims across hosts, hiding advisory-only
hosts behind hook-tier marketing

**Behavioral Probe (行为探针)**:
A paired per-iron-law corpus item (ADR-0029 D2/D3): one planted
violation plus one benign near-miss per law, in the CheckList MFT /
XSTest contrastive tradition. The corpus lives in
private/bench-corpus/probes.jsonl (ADR-0036 D2) under the same governance family as
judge-twins (schema gate + ADR-witnessed growth). Benign near-misses
are mined from real false-positive history, not synthesized.
_Avoid_: treating the corpus as a statistical benchmark (the
statistical load stays with the frozen 396-item corpus), synthesized
benign items

**Zero-Miss Smoke Gate (零漏检冒烟门)**:
The structural gate of ADR-0029 D3/D4: probe-recall demands zero
misses and probe-fp demands zero false positives over the paired
corpus (14 items at introduction; a full pass supports only a ~78.5%
Wilson lower bound, so the gate claims per-law regression coverage,
never a statistical effectiveness rate). Runs as
scripts/check-probes.js, a thin zero-dependency CLI with a testable
pure core, in its own probes:gate CI job; jest tests the core but
never runs the gate (Bazel contract: a gate is a standalone process
with an exit code).
_Avoid_: marketing 14/14 as a detection rate, merging the smoke
gate into bench:gate, jest-as-gate

**Advisory Upgrade Channel (顾问规则升级通道)**:
The pre-registered promotion path of ADR-0029 D5 (MISRA GRP
reclassification / K8s audit-warn-deny ladder): the generator
profile's 3 advisory surface-signal rules stay out of probe scope
by default, but a rule may be promoted when real violations have
accumulated, benign near-miss assets exist for FP calibration, and
the promotion passes the ADR-0027 coupling guard.
_Avoid_: hard-gating advisory SHOULDs, reopening the promotion
question without the three registered conditions

**Interval Coverage Gate (区间覆盖门)**:
The post-ADR-0030 corpus constraint: every (kind, law) pair needs at
least one probe (count >= 1); the ADR-0029 law-dup exactly-once
invariant is dropped so the pre-registered growth rule (ADR-0029
D3) is mechanically executable. New probes for a covered law carry
a variant suffix (IL3-v2-*), mirroring MISRA amendment numbering.
Global id uniqueness and a thresholds.json structural floor
(source_adr: 0030) remain. schema_version describes the data
format, not checker policy; policy changes are ADR-witnessed.
_Avoid_: re-introducing exactly-once, mutating schema_version for
policy-only changes, building edition-dispatch before any
out-of-repo consumer exists

**Reverification Runbook (judge 重验证 runbook)**:
The operationalization of ADR-0025 D3 (ADR-0030 D3):
npm run reverify executes scripts/reverify.js (thin CLI + pure
core), recomputes the 4 telemetry metrics with Wilson intervals
and STALE counts over the frozen judge-twins corpus, and emits
bench/polygraph/results/reverify-<date>.json; results that change
thresholds/frequency anchor their numbers to ADR text via the
ADR-0027 content-anchor and ship with a same-commit ADR
amendment. Append-only bench/polygraph/reverify-ledger.json
chained by prev_hash reuses the ADR-0013/0026 hash-chain
discipline. Deadlines are calendar events (Rust release train):
no silent extension; a pre-commit local hook warns (never blocks)
when judge/bench files change with a stale ledger entry.
_Avoid_: cron/CI scheduling with no trusted remote executor,
profile-embedded meta-checks, audit-sprint evidence produced only
after the fact

**Dead-Man Degradation (死人开关降级)**:
ADR-0030 D4: the judge seam degrades on schedule breach, in the
Python __future__ MandatoryRelease pattern (machine-readable,
append-only, programmatically checked) and the CA/B Forum
certificate-expiry precedent (deadlines need structural
consequences). 6 months past re-verification: warning banner
(runbook + hook). 9 months: hook-tier verdict gates return
advisory-only semantics with a banner naming the recovery
condition; instruction-tier hosts were already advisory-only
(ADR-0028 D6). The state lives in a content-anchored artifact so
deleting state files to silence the switch is itself caught
(K8s PDB bypass-closure semantics).
_Avoid_: reminder-only deadlines (Node EOL evidence says they
change nothing), blocking instruction-tier hosts, removable state
files

**Gate Tier (门档位)**:
The three-tier machine-readable taxonomy of ADR-0031 D3 (K8s
admission-mode naming): confirmatory (fail-closed, thresholds
pre-registered; default for integrity-critical gates),
observational (record-only, must pre-register review_at and
promote_if; overdue review = STALE violation), and
deferred-with-unfreeze (withheld implementation, must carry
unfreeze_if). Tier is a mandatory thresholds.json field; tier
migrations ride the ADR amendment path, and demotion requires
written Goodhart-contamination evidence.
_Avoid_: per-ADR ad-hoc strictness statements, defaulting
integrity gates to observational, MISRA full deviation ceremony

**Second-Line Independence (组件级第二线独立性)**:
The component-scoped form of SR 11-7's second line (SR 11-7 was superseded by SR 26-2 on 2026-04-17; the principle survives), applied in
ADR-0031 D4: where the auditor and judge are the same deployable
component, independence is enforced as an INPUT whitelist — the
judge seam reads only the certificate triple {claim, toolResults,
heuristicVerdict}; auditor intermediate verdicts, probe/pressure
history, prior judge outputs, and heuristic reasoning chains are
forbidden in judge input, enforced by a fail-closed wiring test.
Distinct from Verifier Deployment Discipline (instance/process/
model separation), which this complements, not replaces.
_Avoid_: person-level separation theater, conversational-pressure
defenses on a non-conversational scorer

**Evidence Provenance (证据来源三元组)**:
The optional additive record field of ADR-0031 D5 (in-toto/SLSA
link semantics): builder (profile, rules_version, thresholds_fp),
recipe (gate_id, ladder_rung, degradation_kind), materials
(input digests). Absent == unrecognized (SLSA extension-field
rule); verification checks only present-but-invalid. It makes
"who produced this, under which discipline version, from which
inputs" replayable for ADR-0017 human adjudication. It does NOT
prevent forgery — that remains the hash chain plus second-party
verification; the builder and writer share one trust domain.
Signatures, Rekor, and SLSA L2+ machinery are explicit non-goals
until evidence leaves this trust domain.
_Avoid_: treating provenance as forgery protection, signature/
transparency-log additions inside the zero-dependency package

**Replayability Duty (可重放义务)**:
The audit-record obligation that an independent reviewer (second-
party agent or human arbitrator) can reconstruct actor, action,
and inputs from the record alone (NIST SP 800-92 / audit-log
consensus). Operationalized by Evidence Provenance and Chain
Verification Duty together: the chain proves integrity,
provenance proves context.
_Avoid_: "we can grep the log later" answers, provenance-free
records reaching ADR-0017 adjudication


**Generator Surface Rule Header (gsr 规则头)**:
The one-line inline metadata each generator-side rule carries in
SKILL.md (ADR-0032 D2): `<!-- gsr:N | signal-domain: <domain> |
status: active|superseded|deprecated -->`, with optional `check:`
naming the wiring assertion that binds it (jiahao's analogue of
garak's primary_detector). The header rides inside the exact prose
fragment that build-adapters.js slices into host adapters, so the
metadata is cold-chain self-describing and covered by regen-diff
for free. Version is git commit, never a SemVer field.
_Avoid_: sibling manifest.json (ADR-0028 D2 opaque-manifest
precedent), rules-as-JSON-schema rendered prose (double review
surface)

**Coverage Map Registry (覆盖率登记册)**:
The machine fact-source `docs/coverage-map.json` (same family as
thresholds.json and host-contracts.json) that declares, per iron
law L1..L7, one of four states — covered / declared-gap /
needs-adr / undecidable (MISRA analogue: human judgment written
down, never a silently empty cell) — with gsr targets for the
covered and rationale + source_adr + review_at for the rest
(ADR-0032 D3). `scripts/check-coverage.js` asserts existence,
reference integrity, unidirectional lifecycle, and STALE review_at;
the derived matrix is a print artifact, never checked in. Basis:
Tian 2021 — hand-maintained trace links are traceability's first
cost; links must be generated from the source of truth.
_Avoid_: hand-maintained markdown mapping tables, CONTEXT.md
appendix tables, auto-generated rules to fill gaps

**Pre-Registered Equivalence Statement (预注册等效声明)**:
ADR-0032 D4's pre-committed criterion for the generator side:
because paired-sample power for a behavioral effect needs ~1200
observations (LREC 2026 / llm-power) and garak itself disclaims
scientific validity for probe scores, "no measured behavioral
difference" is a pre-registered CONCLUSION (acceptance duty returns
to the injection layer), not a failure state. Statistical duties
stay with the verifier side's probe/regression gates
(ADR-0029 advisory-don't-gate principle); generator-side releases
carry 3-10-task human sampling in release notes only.
_Avoid_: statistical gates on 14-probe/396-corpus scales, offline
A/B runs under cold-chain, "no difference found" treated as defect


**Deferred Registry (挂起登记册)**:
The fourth machine fact-source `docs/deferred-registry.json`
(ADR-0033), sibling to thresholds.json / coverage-map.json /
host-contracts.json. It registers only chosen-to-defer items with a
structured unfreeze_if predicate and a review_at expiry; confirmatory
gates can never be entries; enforcement is fail-closed via
`scripts/check-deferred.js` with the ADR-0027 couplingViolation guard
(registry diff requires a same-commit ADR change). Anchoring is
existence-based (source_adr exists + entry id appears in ADR text or
CONTEXT.md), never value-anchored.
_Avoid_: parsing ADR prose to derive deferrals, observational tier for
registry violations, a second registry file for rejected items

**Pending-Evaluation (待判定态)**:
The explicit status of ADR-0033 D3 for entries whose unfreeze_if
predicate cannot be evaluated machine-side: not a violation and not an
automatic grace — the entry carries its own review_at, expiry of which
is still STALE fail (FedRAMP VD/OR channel pattern). Renewal is a
re-assessment action with rationale through the ADR amendment channel,
never an automatic extension.
_Avoid_: treating un-evaluable as failed, treating un-evaluable as
silently extended

**Expiry Forces Action (到期强制动作)**:
The k8s-feature-gate expiry semantics of ADR-0033 D4: review_at expiry
is STALE fail-closed and clears only through an explicit act —
activate, re-defer with new review_at + rationale, or remove — all via
ADR amendment. No automatic grace period, no silent persistence
(FedRAMP "acceptance is not forgetting"; security-exceptions
literature: failure to enforce expiry is the top failure).
_Avoid_: grace-period soft landing, reminder-only expiry,
keep-the-item-but-keep-waiting

**Gate Registry (门注册表)**:
The fifth machine fact-source docs/gates.json (ADR-0034 D1), sibling to
thresholds.json / coverage-map.json / host-contracts.json /
deferred-registry.json: every quality gate is a first-class, enumerable
entry {name, command, tier, source_adr, order}; tier reuses the ADR-0031
D3 vocabulary verbatim; changes require a same-commit ADR via the reused
couplingViolation guard. scripts/run-gates.js is the single entrypoint
(npm run gate:all); CI calls it exactly once and the D5 wiring assertion
fails closed otherwise.
_Avoid_: gates as bespoke npm scripts and hand-wired CI run lines,
orchestrator dependencies (wireit/nx/turbo), YAML parsing for the CI
contract

**CRTM-as-Entry Ordering Contract (门序契约)**:
ADR-0034 D4's ordering rule: every registry entry carries a required
integer order (no default; omission is a schema violation), and the
runner's schema asserts that meta-check entries — three-face alignment
(gates.json/package.json/ci.yml) plus the coupling guard — exist and
hold the minimal orders. Structural preconditioning is hard-coded in the
runner; content is declared in the registry: the minimal common form of
Bazel's analysis phase, Terraform validate-before-plan, Kubernetes
initContainers, and systemd After=. Order bands: 0-99 meta, 100+
functional. Ordering is unconditional; --fail-fast governs what happens
after a failure, never the schedule.
_Avoid_: implicit array ordering, meta-checks hard-coded outside the
registry, tier semantics mixed into scheduling

**Decision/Evidence Separation (判定与证据分离)**:
ADR-0034 D3's split of what a failing gate terminates: a confirmatory
failure terminates the decision (exit code) but not evidence collection
— gate:all defaults to run-all-then-aggregate so that one invocation
yields a complete breach inventory (DO-178C-style evidence
completeness); --fail-fast is explicit opt-in (pytest -x / jest --bail /
Nx --nxBail alignment) and short-circuits confirmatory entries only.
_Avoid_: partial runs read as clean audits, fail-fast as default,
treating sibling independent checks as a DAG

**Rung-Internal vs Cross-Gate Orthogonality (阶梯内短路·门链间全跑)**:
ADR-0034 D3's guard-rail against category error: ADR-0004's
short-circuit lives *inside* one verification ladder rung (cheaper
mechanism first for one target); gate:all is a family of independent
sibling checks with no task-dependency graph, so complete-run is the
correct default (industrial independent-check family: pre-commit
fail_fast=false, jest/pytest default full runs). Neither semantics may
be invoked to justify the other.
_Avoid_: porting rung-internal short-circuit to gate orchestration,
porting cross-gate full-run into the verification ladder


**Review Cadence Ladder (评审阶梯)**:
ADR-0035 D1's normative tiering for deferred-registry review_at:
quarterly (external-event with an actively changing upstream),
half-yearly (presence-condition, zero holding cost, high trigger
impact), yearly (rare external event or low-drift internal condition),
keyed by unfreeze_if.type x trigger likelihood x residual exposure.
Every new entry takes a tier at creation; off-ladder dates are invalid.
Grounded in deadline-spacing evidence (Ariely & Wertenbroch 2002:
evenly spaced external deadlines beat clustered self-set ones) and
real-options waiting value for rare events.
_Avoid_: batch-assigned identical dates, per-entry ad hoc dates, ladder
changes outside the ADR amendment channel

**Check-In Discipline (核验签到纪律)**:
ADR-0035 D3's weak-form governance for external-event entries: a
last_check_in {date, note} record at least once per review cycle,
mirroring FedRAMP POA&M Column R. Violations warn (pre-commit parity);
only review_at expiry fails. A check-in records that verification
HAPPENED, never that the condition is FULFILLED — machine-assertable is
the discipline of checking, not the state of the external world; this is
the only dimension that can be fail-closed without fabricating
certainty (FedRAMP VD; alarm-fatigue evidence demands warn/fail split).
_Avoid_: monthly cadence for OR-class items, blocking on check-in,
conflating 'checked, nothing changed' with fulfillment

**Verified-By Enforcement (验证者强制)**:
ADR-0035 D6's structural rule in check-deferred.js: an entry typed
presence-condition or count-threshold MUST carry verified_by pointing
to an existing script; otherwise it is treated as non-evaluable and
forced into pending-evaluation (FedRAMP Validated-vs-Pending: a
classification claim without a verification channel defaults to
Pending). A satisfied assertion only SUGGESTS activation in gate
output; disposition stays human (Azure exemption expiry semantics;
stale-bot auto-close rejected). Kills false-evaluable classification
mechanically, not ceremonially.
_Avoid_: decorative grep assertions, auto-activation of satisfied
conditions, prose presence-condition without a verifier


**Answer Corpus vs Scoring Standard (答案语料与评分标准分离)**:
ADR-0036 D2's partition of evaluation assets. Answer corpora (probes.jsonl,
judge-twins.jsonl, twins.jsonl) must live outside the audited agent's
readable surface (private/bench-corpus/); the scoring standard
(thresholds.json) must stay public because hiding it would destroy
pre-registration transparency and the public integrity-anchor semantics.
NIST CAISI form: private tasks + public affordances declarations; Kaggle
private labels + public metric. Obscurity is one legal layer of
defense-in-depth, never the sole protection (Kerckhoffs boundary).
_Avoid_: hiding thresholds, canary-only defense, security-through-obscurity
claims for the whole system

**Soft-Hard Freshness Ladder (软硬双层保质期)**:
ADR-0036 D5's corpus freshness semantics on the ADR-0035 cadence ladder:
warn + evidence entry at tier expiry, fail-closed at 1.5x tier. ADR-0030's
6/9-month judge dead-man is the half-yearly x 1.5 instance. Event trigger
(PCI after-significant-change): non-append corpus change obligates
same-commit reverify or an exemption note.
_Avoid_: single global TTL, pure fail-closed at tier boundary (NIST
800-63B ritualization lesson), warn-only with no hard stop

**Gate-Defaults Consistency (门默认值一致性)**:
ADR-0036 D4's declaration-execution assertion: docs/gates.json gate entries
carry a params block (e.g. --check on, coverage floor, exemption words),
and a script verifies the runtime-effective parameters match. Defends the
silent-degradation class (SWE-bench+ weak-test suspicious passes) without
duplicating the behavioral probe gates.
_Avoid_: asserting gate behavior outcomes here (probes:gate owns that),
params drift between gates.json and scripts

**Capable-Optimizer Threat Model (有能力型优化者威胁模型)**:
ADR-0036 D1's upgraded adversary: a generator that can read anything in the
repo and optimizes for passing gates rather than doing the work. Auditing
scope = NIST CAISI bisection (solution contamination vs grader gaming),
covering corpus/environment leakage and process-layer bypass with gate
mechanics as the already-covered layer. Stays cost-raising, not
impossible-to-bypass (CWE-656 honesty).
_Avoid_: careless-generator-only threat model, claims of un-gameability

**Metamorphic Relation (蜕变关系)**:
A necessary property of the verifier's judgment function across transformed
inputs: transforms that provably preserve case semantics must produce the
same verdict (preserve-type); transforms that provably flip semantics must
flip the verdict (flip-type). Third corpus family per ADR-0037, testing
judgment *symmetry* where probes test fixed judgments. Source formats are
selected from the LLMorph/MT4NLP catalog (191 MRs), not invented.
_Avoid_: mutation testing (bug-seeding), self-consistency resampling
(not an MR; repeats the same hallucination per MetaQA)

**Transform Validity Layer (变换有效性验证层)**:
The mandatory human (v1) or independent-judge (v2) check that a metamorphic
transform actually preserves or flips semantics as designed, before the pair
enters the corpus. Without it, corpus entries carry ~40% false ground truth
(LLMorph measured ~60% true-positive ceiling for unverified transforms),
which structurally breaks the zero-fp smoke gate. v1 = human review recorded
in provenance; v2 = independent model-family semantic-preservation judge
(ASE'26 two-layer design).
_Avoid_: skipping validation on "obviously equivalent" rewrites

**Runtime-Artifact Surface (运行时工件面)**:
ADR-0038's dual-surface distribution model, isomorphic to Python's
wheel/sdist: the npm tarball is the runtime artifact (prompt-installer only,
files-whitelisted, measured-anchor budget 200,000 bytes per ADR-0039); the git tree is the development surface (tests,
fixtures, integrity anchors, ADRs). Answer corpora appear on neither public
surface; they resolve only via JIAHAO_CORPUS_DIR / install-planted /
maintainer-tree tiers (ADR-0036).
_Avoid_: tests-in-tarball, .npmignore blacklist reliance (npm: whitelist is
"by far the safest way")
