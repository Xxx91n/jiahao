# ADR-0090: Countersign Rejection Disposition Contract — Pre-Registered Exit Semantics, the Ratchet Tooth, and the Self-Row (grill-t34)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-09-30
- Ledger: `.scratch/grill-t34/decision-ledger.md` — D-003 (all current)
- Spec: `.scratch/grill-t34/spec-t34-derive.md` §3

## Context

The countersign queue (ADR-0084 registration, ADR-0086 new-form declaration) has
no registered answer to the question "what happens if a queued ADR is rejected
at its tide". ADR-0084 is itself queued and cannot self-referentially amend the
queue contract; the ADR-0089 scoped-succession precedent applies: a new ADR
carries the contract, with scoped pointers — no queued document is edited.

## Decision

### D-A — Generic rejection triple clause

1. NON-RETROACTIVITY (ADR-0086 rule-6 mirror): a rejection does not
   retro-convict commits landed while the rejected ADR was effective. History
   is never rewritten to punish effectiveness-period reliance.
2. DISPOSITION MENU = default floor: each registered disposition (D-B) executes
   unless the owner names a different branch at adjudication. A non-menu branch
   chosen by the owner requires an errata note recording the deviation —
   on-site invention becomes a registered deviation, never silent
   improvisation. The menu binds legibility, not owner choice.
3. STATUS TRANSITION: rejection amends the ADR's status to `Rejected at the
   2026-12-15 tide` and removes it from the queue (derived membership shrinks
   on the next derivation — no manual count edit exists to make).

### D-B — Per-member concretization (class rule: mandatory where the queued ADR introduced enforceable machinery)

- ADR-0086 (registry field governance + exception channel): the four
  machinery legs it introduced (orders 220-223: exception-channel,
  classification-consistency, test-git-hermetic, anchoring-footer) are removed
  from the gate registry; the fenced/editorial/exception-channel registry
  field classes revert to plain editorial fields.
- ADR-0087 (codebuddy host adapter trial): the map-freshness leg (order 224)
  is removed; the trial artifacts stay archived as historical record
  (append-only), never deleted.
- ADR-0088: detailed concretization is registered as an in-tide follow-up
  (defer-0084); until then the class-level default applies — machinery
  introduced by it reverts on rejection under the same removal discipline.
- ADR-0089 (rewrite-map classifier declared facts): the classifier reverts to
  the three-class enum, the orphan-registration leg (order 225) degrades to
  advisory, and `docs/governance/orphan-cites.json` is preserved as a
  historical registry (append-only, never deleted).
- Label-only members (the old-form and E-13 pointer forms): they introduced no
  enforceable machinery; the supersession default applies by class — rejection
  removes the queue slot and leaves the accepted prose standing as history.

### D-C — The self-row

If ADR-0090 itself is rejected at the tide, the queue reverts KNOWINGLY to the
pre-0090 state — restoring the exact silent-permanence defect this contract
was written to close, as an informed rejection registered by this section. Its
own disposition executes under its own authority only if it survives the tide.

### D-D — The ratchet tooth: the `countersign-overdue` leg

A three-stage leg (ADR-0089 D-E ladder precedent; registered in the gate
registry, order 227) enforces that no unadjudicated queue member may be
silently permanent:

- inside the return-by: SUGGEST, advisory, exit 0;
- return-by .. return-by+30d: grace window, still SUGGEST — the grace is
  registered with its reason (it covers one post-tide owner working window,
  about a third of the tide interval), not as a bare number;
- past grace: FAIL with declared-drift-shaped red output naming the three
  registered exits (rebuild / re-seal / declared-drift).

The leg never asserts "the owner must have acted by date X"; the red-light
response is a human call. Membership derives from the shared
`scripts/countersign-queue.js` surface; the leg implements no rollback —
rejection adjudication and its execution remain owner-side.

### D-E — Owner-incapacitated residual (named honestly)

If the owner is permanently unable to adjudicate, no agent-side self-help
exists: the leg's FAIL is the steady state, the exits stay human calls, and
the honest residual is a permanently-red governance leg or a declared-drift
decision taken by whatever authority remains. This contract deliberately does
not invent an automation for it.

## Boundaries

This ADR pre-registers exit semantics only. It implements no rollback, moves
no adjudication authority agent-side, and adds no count lines — queue
membership continues to derive member-by-member via the shared derivation.
