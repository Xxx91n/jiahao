# grill-t14 spec — disposition + preregistration round

Source of truth: .scratch/grill-t14/decision-ledger.md (D-001..D-005, all current).
Status: SETTLED 2026-09-17. Execution follows handoffs/next-round.md.

## §0 — headline

t13 closed with the full stack published (remote main a8e0bdb) and the
promotion gate honestly frozen (organic=0). This round converts the residue
into registered form: close the audit-flagged registry item, pre-register the
promotion review's parameters (N/M + sunset trigger) before any data exists to
game them, and hand the remaining human signatures to the owner as separate
asks. Nothing here asserts a new product claim; the strongest artifact is a
pre-registration — its value is that it cannot be argued with later.

## §1 — round boundary (D-001)

Six agenda items, bound:

1. Push request — externally satisfied during the grill (remote main reached
   a8e0bdb); residual = fact annotation in the R2 report, not a decision.
2. defer-0051 — disposition now (trigger beats calendar).
3. instrument seq 24 — human sign-off, separate owner ask.
4. Standing cadence (defer-0053/0055/0057/0058, O-E) — consent confirm.
5. N/M preregistration — designed and frozen this round.
6. organic=0 terminal — resolved as a bounded sunset trigger clause, not a
   strategy debate.

### Explicitly out of scope (with rationale)

- Strategic go/kill review on the conviction lane — scheduled only; the sunset
  trigger is its activation condition (D-001). Opening it now would decide the
  gate's fate while its own criteria are being invented.
- Any G1/G3/G4 threshold amendment — post-hoc move banned; the gate is frozen
  not broken.
- Re-litigating G1 semantics — the clause references ADR-0070/0073 only.
- Source-code edits — grill discipline.
- The push itself — already executed externally; owner-only domain.

## §2 — defer-0051 disposition (D-002)

Path: R2 runs `npm pack --dry-run --json` re-measurement → evidence packet →
fresh-session second-party agent countersigns (weak-independent declared) →
owner ratifies THE SAME packet → registry records closed +
discharged-by-trigger + closure note stating "1 data point existence check;
trend duty lives in the pack-smoke gate" + ledger records the explicit
trigger override of review_at=2026-12-15.

Why this shape: owner-only signature = self-review threat; agent-only lacks
closure authority; the two slots are different (checker independence vs
sign-off authority). Precedent: ADR-0062/0064/0065/0066 ratify-then-countersign.

Guards: both signatures on one packet; a closure note without the
single-point caveat is a future audit-bounce; cap watch continues in
check-pack-smoke.

## §3 — N/M preregistration (D-003)

N/M is a sufficiency qualifier on the same organic corpus G1 counts — single
proposition: events >= 200 AND sessions >= 20 AND intent-classes >= 5. The
qualifier produces NO independent pass state.

M via analysis-side transcript classification + pre-registered <=8-class
intent taxonomy (feature / bugfix / refactor / docs / exploration / ops / qa /
other scale). Four implementation requirements, all frozen in the artifact:

1. taxonomy + per-class definitions registered before data arrives (organic=0
   is a contamination-free window);
2. mandatory `unknown` catch-all — unknown never counts toward M;
3. a class counts toward M only with >= K=2 independent sessions hitting it;
4. classifier version + prompt hash pinned into the review record; taxonomy
   changes go through the amendment procedure.

Values: N>=20, M>=5 — loosest defensible bounds under tightening-only
asymmetry (tighten later, never loosen). N operationalized as distinct
session_id not marked self-test — the measurability boundary (no user-id
field) is written into the preregistration.

## §4 — sunset trigger clause (D-004)

Dual-or-path, first to fire wins:

- path A: N=6 consecutive zero-organic quarterly check-ins (parallel counter
  on the same cadence as defer-0055, independent lifecycle, organic>0 resets);
- path B: defer-0055 closes while the review has not activated.

Sole consequence: activate the scheduled pre-registered strategic review and
record the activation event in the decision ledger. The trigger does not
amend, close, or exempt the gate (ADR-0035 precedent: assertions SUGGEST
activation; disposition stays human).

Carrier: same preregistration ADR as the N/M pack (ADR-0075); defer-0055's row
carries only a pointer.

Meta-requirement (blocking): the strategic review must register its full
evidence criteria before evaluating anything — output without prior
registration is void. This round registers only the requirement plus criteria
SHAPE: >=1 kill condition falsifiable in the organic-event corpus; criteria
must not amend G1/G3/G4; criteria may only tighten later.

## §5 — closeout form (D-005)

- No independent audit — ADR-0074 trigger conditions unmet (no external
  claim, no sanitized-zone touch, no risk threshold). Self-check battery +
  owner approval closes the round. The round report must state the
  countersign covered one registry item, NOT the round.
- Two separate owner asks — seq 24 sign-off (record-type) and defer-0051
  ratification (judgmental, keeps its own accept/reject exit). Bundling would
  bury the judgment call.
- R1/R2 split with frozen-text exit criterion: R2-needed preregistration
  content (N/M values, sunset clause, taxonomy, meta-requirement) is frozen
  text at R1 close; the R1→R2 boundary must be green (intermediate red
  commits allowed per O-B convention).

## §6 — negative-requirement union

- No G1/G3/G4 amendment; no strategy this round; no source edits in grill.
- No owner-only signature on judgmental packets (self-review threat).
- No independent N/M leg; no write-time fields (defer-0053 frozen); no
  claim-family reuse; no symbolic parameter registration.
- No binding sunset to the watch's closes_if alone (dependency inversion); no
  auto-disposition; no record-only trigger.
- No audit performed may be reported as one; no bundled owner asks.
- Numbers may tighten later, never loosen.
