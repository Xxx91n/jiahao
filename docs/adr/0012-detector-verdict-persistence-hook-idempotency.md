# ADR-0012: Detector Verdict Persistence + Hook Idempotency

- Date: 2026-08-24
- Status: Accepted

## Context

Q1-Q6 grill round 2026-08-23/24. Upstream decisions:

- ADR-0001: jiahao is a prompt-as-mental-model distribution for second-party agents.
- ADR-0007: hash-chain evidence file (`.jiahao-evidence`) carries the trust chain.
- ADR-0008: verdict gate is profile-aware (generator advisory, verifier blocking).
- ADR-0010: install-time profile flag; no co-installation of generator+verifier (Self-Preference Bias).
- ADR-0011: dual-tier install UX + layered drift automation.

Two follow-up questions from implementation of ADR-0010:

1. Where does a deterministic "suspicion" signal land on the evidence record? Standalone file (`.jiahao-suspicious.jsonl`) vs field on the record vs both.
2. How does the Stop hook stay idempotent when Claude Code re-fires Stop on plugin-registered hooks (as SubagentStop), and when the host re-runs the same hook twice in one turn?

Atomcode research (13 AnySearch queries + 12 full fetches, 9 domains) covering
Microsoft Agent Governance Toolkit (AGT), IETF draft-sharif-agent-audit-trail,
arXiv 2504.11168 (unicode-smuggling attacks on wordlist filters), False
Completion (ICML 2026 FAGEN, arXiv 2606.09863), METR reward-hacking report,
Langfuse evaluator guidance, OpenAI guardrail SDK, Claude Code hooks docs,
Marcin Dudek 5-part quality-gate series, Plus 13 prior ponytail-style coding
agents.

## Decision

### D1 — Detector verdicts land as fields on the existing evidence record

Detector output (`{ suspicious, matched_phrases, severity }`) is appended to
the evidence record **before hashing**, so the suspicion metadata is as
tamper-evident as the evidence it sits on. `.jiahao-suspicious.jsonl` is NOT
a separate stream; it would create a second trust domain, split-chain
consistency questions, and precisely the consume-on-read / re-read costs this
ADR rejects.

This mirrors IETF draft-sharif §5 Recording Independence, AGT AuditLog's
`rogue_detection` event type, and Sigma's per-rule verdict field — the
detection conclusion rides the same append-only chain as the evidence it
qualifies.

### D2 — Suspicion is a triage signal, never the sole block

At 10% flag rate the precision of the deterministic detector is ~50% (ICML
2026 FAGEN). A hard block on detector hits manufactures a new false-
completion theater. The gate is **profile × severity**:

- Generator profile: always advisory (warning systemMessage + the advisory
  is appended to the chain; the generator is never blocked).
- Verifier profile: high-severity + no-independent-evidence → block; low-
  severity → advisory.

This split is the operational shape of Iron Law 3 ("the judge cannot be the
author"): the verifier may block, the generator may only warn.

### D3 — Private wordlist, public rule

SKILL.md keeps only the principle ("do not claim completion in the absence
of evidence") plus the ponytail-style behavioral ladder; the phrase list
(搞定 / 跑通 / done / verified / all good / …) stays exclusively in
`src/detector.js`. Reward-hacking research (METR, arXiv 2605.12474) plus
2504.11168's ASR evidence shows exposed wordlists are gameable at 44-100%
evasion rates; the information-theoretic invariant from SKILL.md applies
(checks must carry information the generator does not).

### D4 — Idempotent evidence rounds; no consume-on-read

`writeEvidence` becomes replace-not-append (overwrite the whole file per
turn). `verdict-gate` stops calling `unlinkSync` — the evidence persists
across Stop / SubagentStop / repeat-fire events. Turn identity is
`session_id + turn_id` from the hook input, no separate `idempotency_key`
by default (only needed later for cross-session audit federation).

This removes the Double-Stop-Block failure where the second fire sees an
empty file and blocks on a verified turn.

### D5 — SubagentStop parity

`jiahao-hooks.json` registers `SubagentStop` next to `Stop`, both targeting
`jiahao-verdict-gate.js`. Claude Code converts plugin Stop to SubagentStop
for subagent completions; without parity the verifier subagent's finish
skips the gate the primary agent is held to.

## Consequences

- `.jiahao-evidence` now carries an optional `detector: { suspicious: bool,
  matched_phrases: string[], severity: 'low'|'high' }` field per record.
- `hooks/jiahao-verdict-gate.js` reads `readProfile() × record.detector.severity`
  to decide `block | advisory`, never consumes the file.
- `hooks/jiahao-hooks.json` gains a `SubagentStop` registration.
- No `.jiahao-suspicious.jsonl` file; no `idempotency_key` field on records.
- SKILL.md gains no wordlist; only the ponytail-style ladder and the
  information-theoretic invariant remain as public prompt text.

## Upgrade paths

- When labeled detector data reaches 50-100 per class per domain, train a
  TF-IDF + Logistic / XGBoost classifier and ensemble it with the wordlist;
  the record schema already supports a `classifier_score` field.
- When cross-session audit is needed, add `idempotency_key =
  session_id + gate_id + turn` and a unique constraint.
- When multiple agent processes share one config dir, switch to per-session
  locks on `writeEvidence`; today the chain lives on single-host file
  integrity only (no cross-process anchoring yet).

## Out of scope for this round

- Implementation of the detector, the gate-level changes, hook registration,
  and tests — this ADR fixes the shape; implementation is a separate grill
  round if the user wants it.
- anysearch-cli integration into this flow (deferred per earlier grill).
