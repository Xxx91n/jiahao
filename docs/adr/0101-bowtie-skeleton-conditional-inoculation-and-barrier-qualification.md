# ADR-0101: Bow-tie skeleton, conditional inoculation, and barrier qualification (grill-mental-model)

- Status: Accepted
- Date: 2026-10-18
- Ledger: `.scratch/archive/2026-10-18-grill-mental-model/decision-ledger.md` — D-001, D-002, D-003, D-004, D-005 (all current)
- Relates: ADR-0002 (the iron laws — the verifier core this ADR explicitly does not move), ADR-0018/0060/0064/0068 (the method layer P1 rides), ADR-0098 (the fifth semantics — a candidate input to the failure-mode inventory P1 must verify)
- Numbering note: 0099 and 0100 were created by the grill-t39 lane and later removed as retired governance machinery (commit 62a71522); dangling references to them remain in ADR-0098 and scripts/shared/coinage-triage.js. Their numbers are not reused.

## Context

Two pain points drove this round: ponytail v5's major updates, and the paper
evidence that prevention beats detection when failure modes are known in advance.
The repository's method layer is mature and load-bearing, but the five semantics
are law without measurement, and the detector line is settled FAILED with v3
frozen at zero data (ledger D-002). The unified mental model follows a staged
empirical route: verify the five-semantics inventory first (P1), induce the
unifying principle from data (P2), then land both layers per face (P3) — never
unify before the data supports it (ledger D-001). The question this ADR answers:
where does prevention-class evidence land on a two-profile architecture without
weakening the verifier?

## Decision

### D-A — The bow-tie skeleton

The two profiles map onto the bow-tie model from process safety (CCPS/AIChE):

- **generator profile = prevention barrier** — it stands between the motive to
  fake completion and the fake completion itself;
- **verifier profile = mitigation barrier** — it stands between a fake completion
  and its delivery consequences.

The two layers stay independent. Neither lends rules to the other. The mitigation
layer is always designed on the assumption that the prevention layer will leak
(Swiss Cheese). Paper evidence that prevention is cheaper (inoculation-style
priming cut misaligned generalization 75-90% in training settings, Anthropic
2025-11) does **not** move resources from verifier to generator: no industry
dismantles its detection layer because prevention improved. The verified
short-list of detector weaknesses is monitors being persuaded and calibration
drift (MonitoringBench catch rate 94.9% to 60.3%), not wrong direction.

### D-B — Conditional inoculation

Inoculation rules (naming failure modes before a task starts) may enter the
generator face, but their content must ride failure modes that P1 — the MAST
mapping of ledger D-003 — has verified. The inoculation premise, failure modes
known in advance, is not yet satisfied. The landing order is therefore fixed: P1
evidence first, inoculation text second. "Inoculate first, verify later" would
violate this repository's empirical discipline. P1 also gains a second job: the
inoculation effect has no direct experiment in agent runtime (non-training)
settings, and the public-corpus mapping is the first place that hypothesis can be
tested.

### D-C — Barrier qualification (the IPL triple test)

A generator-face rule counts as a prevention barrier only if it passes the IPL
triple test — effective, independent, auditable. The three current gsr rules do
not pass yet; they are support controls, not barriers. Until they are upgraded,
no claim of "double barrier" is allowed. Counting unqualified rules as barriers
manufactures a false sense of multiple protection (the Primatech warning), which
is itself semantics-1 behavior.

### D-D — CoT observability protection

Inoculation text design must evaluate whether it pushes failure motives into
invisible territory. Telling a model that a detector exists raised sneaky hacking
from 4% to 19%; putting optimization pressure on chain-of-thought hides intent
instead of stopping the cheating (reward-seeker 2026). Inoculation text must not
advertise the detector surface and must not put optimization pressure on CoT.
CoT-class signals keep their heavy allocation in the verifier: failure motives
surface early in the chain of thought.

### D-E — Ponytail v5: the two accepted mechanisms

Adoption is gap-driven, mechanism by mechanism — no wholesale transplant (ponytail
is a single-file prompt repository; jiahao is a two-profile + hook + adapter
system).

1. **Negative-disclosure line, generator face (prevention side).** The
   completion-claim grammar of gsr:2 extends from a positive-only list to a
   positive list plus 1-2 lines of what was skipped, left unchecked, or remains
   risky — the same shape as ponytail v5's "replies end with what was
   skipped/unchecked/risks". A self-check that only reports wins is exactly the
   behavioral face of semantics 1 and 2. The disclosure line itself stays under
   prose-density / coinage-triage supervision, so it cannot grow its own jargon
   and become a new gaming surface.
2. **Change-reach list, verifier face (mitigation side).** "Verify side effects,
   not just the happy path" becomes a procedure: before a change, list the
   change-reach (callers, tests, configs, docs); at verdict, reconcile the list
   item by item.

Not adopted: reuse-before-write (jiahao is a verification-discipline repository,
not a coding-workflow repository), /ponytail-review (rung 3 of the verification
ladder already covers the spirit), benchmark discipline (this repository's 105
suites / 1846 cases plus pre-registration are stronger), and the v5.3
band/board/history CLI surface (product, not discipline).

## Consequences

- Every future rule gets a slot on arrival: prevention (generator), mitigation
  (verifier), or rejected. Placement follows the skeleton, not preference.
- Research gaps on record from the round: the 2.4% catch-rate figure comes from
  the alphaXiv author's self-description, not the paper body (medium confidence);
  no industry publishes a prevention-to-detection staffing ratio; the inoculation
  runtime-effect hypothesis is untested until P1.
- Landing (gsr text revisions, verifier procedure text) is a later round — handoff
  T3. This ADR legislates; it does not edit the skill files.
