# Bounded Delegation - renewal template (pre-staged, ADR-0072 D-E P-2)

Registered forward rule: from the next authorization-bearing event after
ADR-0072's registration commit, every exercise of delegated signing authority
MUST carry explicit scope and expiry. An open-ended grant is a defect in the
grant itself (Bounded Delegation, CONTEXT.md). The next signoff-class event
(signoff / conditional_signoff / criteria_change / record_signoff) carries
the completed template below verbatim in its authorization payload - renew
with scope+expiry, or record expiry. The renew-or-expire act is forced by
rule, not negotiated under pressure. Frozen history (the open-ended standing
grant verbatim on-record from seq 10) is never rewritten; ERRATA E-6 carries
its boundary note.

## Template (fill every field; copy verbatim into the event's authorization payload)

- delegation_id: <stable id for this grant>
- principal: <human owner id the signature stands for>
- delegate: <executing agent identity / session window>
- scope: <exact event kinds + artifacts this delegation may sign>
- granted_at: <ISO date>
- expires_at: <ISO date - mandatory, never "open-ended">
- decision: renew | expire
- evidence_ref: <issue / ledger / ADR pointer for this act>
- second_line: <independence statement - ID-level + delegation-level, or
  entity-level only when a distinct entity actually signs>

Renewal bounds: a renewed grant re-specifies scope and sets a new expires_at;
it never extends silently. An expired grant is inert - a later event signed
under it is a defect record, not a signature. Bound by
test/adr-0072-wiring.test.js.
