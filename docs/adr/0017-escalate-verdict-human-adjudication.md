# ADR-0017: ESCALATE Verdict and Human Adjudication Write-back

## Context

- The ladder verdict space was binary-ish: PASS / FAIL / NOT VERIFIED. When
  the optional llm_critic rung is exercised but cannot produce a decisive
  answer (error, timeout, or contradiction), the record fell through to
  NOT VERIFIED and the verdict-gate hook let the stop pass. Research shows
  "cannot check = apparently fine" is the largest hole in generator-verifier
  setups (the broadest abuse route against Jiahao-style false-completion).
- Industry (LangSmith Annotation Queues automation rules, LLMTrace judge
  cascade, OPA Quarkus band) routes undecidable items to human review as a
  distinct verdict, not a silent pass. Academic audit-trail work
  (arXiv:2601.20727) classifies human approvals as governance records that
  must live in the same append-only, tamper-evident store as the technical
  evidence; weak-supervision literature (WRENCH, NeurIPS 2021) demands label
  provenance for every training point; nugget-annotation research
  (arXiv:2606.29033) shows the #1 human-review risk is anchoring
  (rubber-stamping a pre-shown machine conclusion).
- Backed by atomcode research (15 verified sources: LangSmith, Langfuse,
  MLflow, Argilla, Label Studio, NIST 800-53 AU-10/AU-9, MSFT Agent
  Governance Toolkit ADR-0017, Sigstore Rekor, RFC 9162, secureops-auditlog,
  Snorkel) plus the earlier cascade/band research round.

## Decision

D1: Add a fourth gate verdict `ESCALATE`: emitted by `verify()` when the
llm_critic rung is exercised but returns no decisive verdict (inconclusive,
error, or timeout). ESCALATE does not block; the verdict-gate hook exits 0
with a pronounced warning that pins which claims lacked a decisive result.
The previous fall-through to NOT VERIFIED for an exercised-but-inconclusive
critic is removed; NOT VERIFIED remains only for "no gates were supplied"
(the critic rung never ran).

D2: Human adjudication writes back as a new append-only record with
kind 'human_verdict' in the same EvidenceLog hash chain (no rewriting of
existing records; re-writing would trip verify-on-read as corruption per
ADR-0013). Entry point is one CLI subcommand `jiahao resolve --verdict
pass|fail --reason <text>` using the two-phase anti-anchoring flow: first
print the evidence records and the critic's stated reasons, then ask for the
human verdict (never pre-show a machine conclusion). Applying a resolution
also records a calibration training point (ADR-0008 closed loop).

D3: The human_verdict record schema carries: reviewer_id (required; Ed25519
attribution stays on the ADR-0013 D5 upgrade path), verdict enum (schema-
validated, Langfuse Score Config pattern), reason, optional corrected_output
assertion (Langfuse corrected-output / LangSmith assertion pattern), and a
second_reviewer field reserved for future inter-rater (IRR) double review.

D4: Pending-escalation semantics are advisory-only: the hook appends
'pending escalations: N' to its messages but never blocks on unresolved
escalations. Human verdicts override machine verdicts; a machine verdict
overturned by a human is recorded as a calibration negative sample (the
research noted no industry precedent here — this is a jihao-original
convention, stated explicitly).

D5: Explicitly deferred (do not re-suggest without new facts): blocking
threshold on pending-escalation count (no industry basis for any N);
inter-rater double review enforcement (academia has IRR metrics, no
engineering thresholds); Ed25519 per-record signing and Rekor anchoring
(ADR-0013 D5 path); external annotation platforms (Label Studio et al.) as
the review surface.

## Consequences

- `verify()` gains one verdict; its contract stays fs-free.
- EvidenceLog gains one record kind; chain/hash/idempotency semantics are
  untouched (human_verdict records reuse append + idempotency sidecar).
- New scripts/resolve.js CLI; verdict-gate hook gains pending-count text.
- CONTEXT.md gains 5 terms: Escalate Verdict, Human Verdict Record,
  Pending Escalation, Anti-Anchoring Two-Phase, Human Override.
