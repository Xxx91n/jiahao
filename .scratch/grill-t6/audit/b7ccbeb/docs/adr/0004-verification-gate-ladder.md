# Verification Gate Ladder Design

## Context

ADR-0001 established verification gates as the core anti-false-completion
mechanism. ADR-0002 defined the iron laws. ADR-0003 defined the hook
architecture including the Stop verdict gate. The open question: how do gate
levels compose and degrade?

Atomcode research (16 sources, 13 full reads) surveyed tau2-bench, Terminal-Bench,
SWE-bench, prove-it, Proof-or-Stop, CARE, FutureAGI, OpenHands, TrustBench,
VRR-Stop, and Microsoft AGT. Key findings:

- **Composition**: short-circuit + escalate, NOT all-run-then-vote. Deterministic
  layer blocks immediately on failure (CARE: 0.34ms static vs 17-460ms LLM).
  Only underdetermined cases (confidence 0.4-0.7 band) escalate to LLM critic.
- **Degradation**: not "no ground truth -> all LLM". Escalation is triggered by
  confidence band (FutureAGI 0.4-0.7), not binary availability. LLM critic
  output is calibrated (TrustBench: isotonic regression) before use.
- **Evidence file**: hash-chained records (AGT result_hash = sha256(JCS(payload))),
  receipts (Proof-or-Stop), git blob counters (prove_it). Core principle:
  "unchecked records never enter the chain" (MSFT AGT #276).
- **Trust tiers**: machine-verified > independently-checked > unverified (Skills
  as Verifiable Artifacts, arXiv:2605.00424).

## Decision

Implement the verification gate as a combination ladder with short-circuit +
escalation:

1. **Deterministic level** (rung 1-3): test suites, ground-truth comparison,
   re-execution. Hard short-circuit on failure -> FAIL (machine-verified tier).
2. **Checklist level** (rung 4): binary assertion decomposition. All must pass.
3. **Escalation band check**: if confidence is 0.4-0.7, escalate to LLM critic.
   Above 0.7 -> PASS (machine-verified). Below 0.4 -> escalate.
4. **LLM critic level** (rung 5): independent model, fresh context. PASS ->
   independently-checked tier. FAIL -> FAIL (independently-checked tier).
5. **Not verified** (rung 6): if no gate can run -> NOT VERIFIED (unverified tier).

Evidence chain structure (per MSFT AGT / Proof-or-Stop):
~~~
{ gate_id, gate_type, status, evidence_ref: sha256, detail, confidence,
  threshold, timestamp }
~~~
Unchecked claims are tracked separately and never enter the hash chain.

## Consequences

- Deterministic gates handle 50-90% of traffic (FutureAGI/CARE consensus);
  LLM critic only sees the 10-50% underdetermined remainder.
- The 0.4-0.7 escalation band is a static default; upgrade path is isotonic
  regression calibration (TrustBench) when sufficient data exists.
- Evidence file (.jiahao-evidence) bridges the iron laws (which demand evidence)
  and the Stop verdict gate (which blocks without evidence).
- The trust tier (machine-verified/independently-checked/unverified) maps
  directly to the SKILL.md output format.
- ponytail: hash chain is not yet tamper-evident (no previous_receipt_hash
  linking); upgrade path is AGT's AuditChain pattern when tamper-evidence matters.
