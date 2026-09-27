# grill-t25 human-authority package (T-3) - DRAFT for the human, agent does not decide

Three decisions, all human-executed. Options are pre-drafted; the agent stops here.

## 1. Renew-or-expire template (per deferred entry reaching review_at)

For each entry due at the 2026-12-15 tide, pick exactly one:
- (a) **renew with expiry** - state the new `review_at` date + what changed since registration;
- (b) **expire** - close the entry; record the trigger or obsolescence;
- (c) **registered exemption with expiry** - exempt status is only valid WITH an expiry date (accept-with-expiry convention; exceptions without expiry calcify).

No silent extension: an entry left untouched past review_at reads as expired by default at the audit window.

## 2. Countersign queue - forced binary per entry

The 10 entries labeled `ID-level-only, awaiting entity-level` (ADR-0064/0065/0066/0067/0068/0069/0070/0072/0073/0074) return at 2026-12-15. Per entry, choose one:
- **entity-level signing** - a named human signs the artifact itself (the deferred second_reviewer verdict is recorded); OR
- **formal downgrade** - the entry records that ID-level acceptance is final for this artifact (downgrade is a decision, not a default).

Labels without a return condition never count as resolved; all ten now carry `return-by: 2026-12-15`.

## 3. Ratchet-brake criteria -> charter layer proposal (meta-rule)

Proposed for CONTEXT.md/AGENTS.md meta-rule area (NEVER the metrics layer - dashboard edits dilute silently). Adoption lands only by your edit; this document proposes, nothing more:
- (i) every new control device MUST register which old device/check it eliminates;
- (ii) new rules declare their applicability domain;
- (iii) disable-test: ask "would the prior incident slip if this device stopped?" - a device that cannot answer is a candidate for removal;
- (iv) fix-produces-holes ratio registered as a metric; consecutive non-declines trigger a device-liquidation agenda item.

Reference: review-agenda entry at the 2026-12-15 tide.
