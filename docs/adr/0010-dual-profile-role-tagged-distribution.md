# ADR-0010: Dual-Profile Role-Tagged Distribution

## Date

2026-08-23

## Status

Accepted

## Context

ADR-0001 established jiahao as a prompt-as-mental-model skill distribution
targeting second-party agents (external verifiers). Two rounds of atomcode
research (62 searches, 35 primary sources) revealed a fundamental architectural
question: jiahao is a plugin that can be installed in any agent host. Where
should it be installed?

### Evidence Chain

**Error detection is the bottleneck, not correction.**
- Huang et al. (ICLR 2024, arXiv:2310.01798): intrinsic self-correction without
  external feedback degrades performance.
- Kamoi et al. (COLM 2024, arXiv:2404.03602): GPT-4 and Claude 3 have
  extremely low recall for detecting errors in LLM-generated content.
  Self-consistency and majority vote cannot improve detection.
- Advani et al. (ICML 2026 FAGEN, arXiv:2606.09863): 45-48% false success rate
  in single-control domains, 75.8% in AppWorld. 5 judge models x 5 prompt
  strategies, none exceeded AUROC 0.65. Lightweight TF-IDF/XGBoost detectors
  achieved 0.83/0.95.

**Industry consensus is separation.**
- LangGraph: independent critique node (shared message state).
- AutoGen: per-agent _session_memory, typed message protocol with approved: bool.
- CrewAI: task-level guardrail functions with retry.
- OpenAI Agents SDK: guardrails wrapper outside agent loop.
- Codex: independent review workflow with structured JSON verdict.
- No mainstream framework implements verification as generator self-prompt.

**External information injection improves error detection.**
- CRITIC (ICLR 2024): ablation proves removing tools collapses self-correction.
- SAFE (NeurIPS 2024): Google Search verification matches humans at 72%,
  76% on disagreements, at 1/20 cost.
- FreshLLMs (ACL 2024): search augmentation dramatically improves temporal QA.

**No production plugin does runtime role detection.**
- ponytail installs on the generator side, no role distinction.
- Production systems configure role at install time (LangGraph graph structure,
  AutoGen agent role assignment) or implicitly (graph node position).

### The Dilemma

jiahao is a plugin that can be installed in any agent. Four options were
considered:

- **Option A**: Install in primary agent only. Contradicts evidence that
  self-verification is structurally limited.
- **Option B**: Install in verifier agent only. Aligns with academic consensus
  but abandons the generator-side surface signal attack.
- **Option C**: Install in both agents. Most complete but most complex.
- **Option D**: Role-tagged distribution with install-time profile selection.
  Single distribution, two profiles selected at install time.

## Decision

Adopt **Option D: dual-profile role-tagged distribution**.

jiahao ships two rule sets in a single distribution package. Profile is
selected at install time via a flag file (`.jiahao-profile`), not detected
at runtime.

### Generator Profile (lite)

Installed in the primary agent. Targets surface signals of False Completion
Syndrome:

1. **No evidence, no completion claim.** When claiming a task is done, the
   agent must list the verification commands it ran and their results.
2. **No confident closing without state change.** "Done" must be accompanied
   by at least one verified state change (file written, test passed, command
   output quoted).
3. **Verification means calling a tool, not re-thinking.** Run the test,
   compile the code, query the state. Re-reading your own output is not
   verification (Huang 2024, Kamoi 2024).

The generator profile does NOT include the verification ladder, LLM critic,
or hash chain. Academic evidence proves self-verification cannot improve
error detection — the generator profile attacks surface output, not detection
capability.

### Verifier Profile (full)

Installed in the second-party verifier agent. Carries the complete discipline:

- All 7 anti-false-completion iron laws.
- The 6-rung verification ladder (deterministic -> ground truth -> re-execute
  -> checklist -> LLM critic -> NOT VERIFIED).
- Hash-chained evidence records (ADR-0007).
- Confidence calibration (ADR-0008).
- Structured verdict: machine-verified / independently-checked / unverified.
- Bias guards (rubric, blind ordering, self-preference awareness).
- Tool-grounded verification: retrieval-type (anysearch-cli extension) +
  state-type (test execution, DB diff, command re-run).

### Profile Selection Mechanism

Profile is determined at install time:

1. A `.jiahao-profile` file in the config directory contains either
   `generator` or `verifier` (default: `verifier`).
2. The activate hook reads this file and selects the corresponding rule set
   from SKILL.md.
3. The verdict-gate hook only activates blocking behavior when profile is
   `verifier`. Generator profile uses advisory mode (warn, not block).

### Why Not Runtime Role Detection

No production plugin does runtime role detection. Industry consensus is
install-time configuration:

- LangGraph: role determined by graph node position.
- AutoGen: role assigned at agent construction.
- CrewAI: role determined by crew composition.
- Codex review: invoked as a separate workflow.

Runtime detection adds complexity without evidence of benefit. Install-time
selection is simpler, testable, and matches industry practice.

## Consequences

### Positive

- Generator-side rules attack surface signals at zero cost (no verification
  infrastructure needed on the generator).
- Verifier-side rules carry full discipline with independent evidence.
- Single distribution package, no fork.
- Profile selection is explicit and auditable.
- Aligns with academic evidence and industry consensus.

### Negative

- Two rule sets to maintain in SKILL.md (mitigated by shared sections).
- Install instructions must explain profile selection.
- Tests must cover both profiles.

### Upgrade Path

- anysearch-cli integration: verifier profile's LLM critic rung calls
  anysearch-cli for retrieval-type external information injection (SAFE
  pattern: claim decomposition -> per-claim search -> supported/unsupported
  -> structured verdict). Deferred per user decision.
- Runtime role detection: if evidence emerges that it provides value, the
  install-time flag can be replaced with a runtime check. The interface
  (profile selection) stays the same.

## References

- Huang et al., "Large Language Models Cannot Self-Correct Reasoning Yet",
  ICLR 2024, arXiv:2310.01798
- Kamoi et al., "Evaluating LLMs at Detecting Errors in LLM Responses",
  COLM 2024, arXiv:2404.03602
- Advani et al., "Characterizing False Success in LLM Agents",
  ICML 2026 FAGEN, arXiv:2606.09863
- Gou et al., "CRITIC: LLMs Can Self-Correct with Tool-Interactive Critiquing",
  ICLR 2024, arXiv:2305.11738
- Wei et al., "Long-form factuality in large language models" (SAFE),
  NeurIPS 2024, arXiv:2403.18802
- Panickssery et al., "LLM Evaluators Recognize and Favor Their Own
  Generations", NeurIPS 2024
- DietrichGebert/ponytail, GitHub (plugin distribution pattern reference)
- ADR-0001 (prompt-as-mental-model architecture)
- ADR-0005 (skill distribution adapter pattern)
- ADR-0007 (hash chain tamper-evidence)
- ADR-0008 (confidence calibration)
