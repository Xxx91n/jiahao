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

## Amendment (2026-09-26, grill-t28 D-004 / ERRATA E-14): trigger re-pointed

The forward rule's trigger - "the next signoff-class event carries the
completed template verbatim" - is RE-POINTED to:

  the first signoff-class event inside a human-authority round, or the
  2026-12-15 tide, whichever comes first.

Why the original trigger became unsatisfiable: it fired unexecuted at
seq-27 - that record_signoff event carried a scope-bounded authorization
but not the completed template - and the operative convention has since
narrowed signoff-class events to human-authority rounds, the only
surface where a delegation-renewal act can actually land. A next-event
trigger whose next event can no longer satisfy it is dead text; the
re-point keeps the renew-or-expire obligation on a surface where it can
fire.

The registered text above is not rewritten (pointer model - the same
append-only discipline that protects registered authorizations). This
amendment is the operative trigger. The four follow-up acts (seq-13
verdict, amendment acceptance, expired-by-default generalization,
grant-body decision) are drafted for the owner in
.scratch/grill-t28/human-authority-package.md.
