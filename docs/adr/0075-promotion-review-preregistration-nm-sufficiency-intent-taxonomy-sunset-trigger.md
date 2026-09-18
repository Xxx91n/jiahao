# ADR-0075: Promotion-Review Preregistration Pack — N/M Sufficiency Qualifier on the G1 Organic Corpus, Pre-Registered <=8-Class Intent Taxonomy, Sunset Trigger Clause, and Blocking Meta-Requirement

Status: Accepted (user-ratified 2026-09-17 via grill-t14 decision ledger D-001..D-005; second_reviewer countersign landed 2026-09-18 (owner ratified the grill-t14 audit outcome alongside Ask A seq-24 sign-off and Ask B defer-0051 packet ratification; the ADR-0065/0066/0067/0069/0070/0072/0073/0074 ratification pattern))
Date: 2026-09-17

References: ADR-0070 D-B (the frozen shadow->enforce promotion gate this pack serves - G1/G3/G4 untouched), ADR-0073 D-A (provenance classes the corpus is tiered by) and D-B (G1 narrowed to organic events) and D-D (the diversity-qualifier framework this ADR lands the values for; the defer-0055 watch the sunset clause parallels), ADR-0071 (the cap amendment whose defer-0051 review slot is discharged by trigger this round, ledger D-002), ADR-0035 (the cadence-checkin registry discipline and the assertion-suggests-activation precedent the sunset consequence follows), ADR-0033 D2 (registry row discipline), ADR-0064 D-F (trend inventory; defer-0059 is this round's net-addition row), ADR-0061 D-E (governance anchors; the t14 ledger joins under this ADR), ADR-0074 D-F (independent-verification triggers and the independence-grade declaration - this round takes the light close), CONTEXT.md glossary (Sufficiency Qualifier, Sunset Trigger, Meta-Preregistration, Discharged-by-Trigger - all registered ledger-t14 terms), decision-ledger-t14 (`.scratch/grill-t14/decision-ledger.md` - git-tracked, its own durability channel; the governance copy is `docs/governance/decision-ledger-t14.md`).

## Context

The grill-t13 close published the full stack (`origin/main` = `a8e0bdb`) and left the promotion gate honestly frozen: G1 reads 0 organic events after the ADR-0073 provenance narrowing, G2 stays a human review with no flagged population, G3 reads false on the harness-dominated telemetry, G4 reads true. Two residues needed registered form before they could decay:

- **The promotion review has no registered sufficiency frame.** ADR-0073 D-D registered the shape - corpus sufficiency qualified as `>= N independent sessions x >= M task-intent shapes`, values pre-registered before any promotion review, deliberately NOT deferred-registry rows - but the values themselves, the taxonomy M is counted over, and the independence operationalization were still open. Organic traffic is exactly zero today; that makes now the contamination-free window: any taxonomy or threshold registered after organic data arrives could be accused of being fit to the data. Preregistration is only credible before the data exists.
- **The gate has no honest terminal for permanent zero.** defer-0055 watches whether organic traffic arrives at all, but a watch that never closes and a gate that never activates leave an unbounded zombie state. The round needed a bounded clause - one that convenes the already-scheduled strategic review without ever touching the gate itself.
- **defer-0051 was reopened by the T-3 audit (F-4).** Its own unfreeze condition - pinned-protocol re-measurement plus second_reviewer countersign - had never been satisfied, so the closure was reverted. This round executes the live legs and closes it by explicit trigger override of the review_at calendar, recorded as a Discharged-by-Trigger event.
- **instrument seq 24 sits pending_signoff** (the t13 T-3 fix-round record) and the defer-0051 packet needs owner ratification - two asks of different types that must not be bundled.

Nothing in this ADR asserts a new product claim and nothing touches G1/G3/G4, the strategic question itself, or source behavior. The strongest artifact here is a preregistration: its value is that it cannot be argued with later.

## Decision

### D-A - The N/M sufficiency qualifier (ledger D-003)

**Decision**: corpus sufficiency for the promotion review is a qualifier applied to the SAME organic corpus G1 counts (ADR-0073 D-B), stated as a single conjunctive proposition:

> **events >= 200 AND sessions >= 20 AND intent-classes >= 5**

The qualifier carries NO independent pass state - it is a sufficiency condition on the corpus, not a second gate leg. A small-but-diverse corpus cannot route around the 200-event count (the independent-leg form is rejected below), and a large-but-monotone corpus cannot read sufficient on count alone.

**Operationalization, frozen**: `sessions` counts distinct `session_id` values among organic lane records, excluding every session in the registered marked-self-test set (the ADR-0073 D-A `synthetic_selfcheck` enumeration). Independence = distinct non-self-test session_id. The measurability boundary is stated here verbatim: **lane records carry no user-id field, so distinct-session is the measurable proxy for independent usage; it cannot prove distinct users.** That boundary is part of the preregistration, not a caveat added later.

**Values, frozen, with their justification**: N = 20 sessions is the loosest defensible lower bound for a UX-quantitative read (below ~20 independent sessions a corpus cannot support even coarse distributional claims), and M = 5 intent classes is the loosest defensible coverage of the 8-class taxonomy (62.5% of classes - a majority read that still leaves long-tail room). Under the Tightening-Only Post-Hoc Amendment asymmetry both numbers may only tighten later, never loosen; they are therefore registered at the loosest values that remain defensible.

### D-B - The intent taxonomy and its four implementation requirements (ledger D-003)

**Decision**: `intent-classes` in the D-A proposition is counted over a pre-registered **8-class task-intent taxonomy**, assigned on the ANALYSIS side by transcript classification at review time (never by write-time fields - defer-0053 keeps that agenda frozen):

| class | definition (task intent, judged from the transcript's opening ask and work shape) |
| --- | --- |
| `feature` | the session aims to add a new capability or behavior to the product surface |
| `bugfix` | the session aims to diagnose and repair a reported defect or regression |
| `refactor` | the session aims at behavior-preserving restructuring of existing code or docs structure |
| `docs` | the session's deliverable is documentation-only (ADR, README, governance text, comments) |
| `exploration` | the session is read-only investigation - questions, research, review - with no intended state change |
| `ops` | the session performs an operational or maintenance act (install, configure, deploy, environment, dependency upkeep) |
| `qa` | the session's primary intent is verification - tests, audits, measurement, gate runs |
| `other` | the transcript shows a classifiable task intent not covered above |

`unknown` is the mandatory catch-all, not a ninth class: it holds sessions the classifier cannot assign with confidence, and **unknown never counts toward M**. The taxonomy is exactly these eight classes at registration; growth stays under the <=8 bound only through the amendment procedure (renaming or merging, never silent addition).

The four implementation requirements, frozen as text:

1. **Pre-registration before data.** The taxonomy and the per-class definitions above are registered while the organic corpus is empty (organic=0) - the contamination-free window. No class may be defined after inspecting organic traffic.
2. **Mandatory `unknown` catch-all.** Every organic session receives exactly one label from {the 8 classes} ∪ {unknown}; unknown sessions are retained and reported but never counted toward M.
3. **Per-class K=2 support.** An intent class counts toward M only when >= K=2 independent sessions (D-A's distinct non-self-test session_id) hit it; a class seen once is diversity's noise floor, not a class.
4. **Classifier pinning.** The promotion-review record carries the classifier's version and prompt hash verbatim, so the classification run is reproducible; taxonomy changes go through the ADR amendment procedure only - never silent edits, never post-hoc classes.

### D-C - The sunset trigger clause (ledger D-004)

**Decision**: a pre-registered dual-or-path trigger, first to fire wins:

- **Path A - parallel zero counter.** N=6 consecutive quarterly check-ins with organic=0, counted on the same quarterly cadence as defer-0055 but with an INDEPENDENT lifecycle: the counter is not defer-0055's field and does not die with defer-0055's row (watchdog lifecycle independence). Any check-in observing organic>0 resets the counter to zero.
- **Path B - watch closure without activation.** defer-0055 closes under its own `closes_if` (or any later disposition) while the strategic review has not yet activated.

**Sole consequence**: firing activates the already-scheduled, pre-registered strategic review of the conviction-lane promotion gate, and the activation is recorded as an event in the decision ledger. The clause is the scheduling mechanism only - it never amends, closes, or exempts G1/G3/G4, and it carries no strategic content (no verdict, no criteria, no disposition). Per the ADR-0035 precedent an assertion only SUGGESTS activation; the review's disposition stays human.

defer-0055's registry row carries a pointer to this clause and nothing else - the clause body lives here, not in the row.

Durable state host (grill-t15, ADR-0076 D-C): the path-A counter lives in `docs/governance/sunset-counter.json` inside the ADR-0061 anchors chain; the decision ledger keeps an append-only audit trail only. A missed check-in is not a zero - the counter freezes and records the miss; an organic observation resets it with an explicit reset event.

### D-D - The blocking meta-requirement and the criteria shape (ledger D-004)

**Decision**: the strategic review the D-C trigger activates is bound by a blocking meta-requirement, registered now:

> The review MUST register its full evidence criteria before evaluating anything; output produced without prior registration is void.

This round registers the requirement plus the criteria SHAPE - deliberately not the criteria themselves (full criteria written now would arrive stale at an 18-month-out review and drafting them now would be de facto strategy work, banned by ledger D-001):

- **>= 1 kill condition** falsifiable in the organic-event corpus - a measurable observation that would kill the lane's promotion case outright;
- **no amendment of G1/G3/G4** - the review's criteria operate on the frozen gate, never rewrite it;
- **tighten-only** - criteria registered at the review may only be stricter than this shape implies; loosening between registration and evaluation voids the review.

### D-E - Round surface and registrations (ledger D-005)

- `defer-0055` gains a pointer field to D-C (pointer only; the clause body is D-C).
- `defer-0059` registers as this round's net-addition tally row (D-006(a)(i) convention: one summary row per doc round).
- The t14 decision ledger joins the governance anchors (`docs/governance/decision-ledger-t14.md` + anchors.json regen; the `.scratch` original is untouched).
- `test/adr-0075-wiring.test.js` seeds this round's doc surface (coherence-tier assertions: existence, registered wording, sync-surface agreement - ADR-0059 D-D applies).
- The README ADR index rebuilds to 75 records; the instrument-state gains the doc-round `record_only_change` event.
- **R1 exit criterion (frozen text)**: every R2-needed preregistration element - the N/M values, the sunset clause, the taxonomy, the meta-requirement - is frozen as text before R1 closes, and the R1->R2 boundary commit is green (intermediate commits may be red per the O-B convention; only the boundary state must be green).
- **No independent audit this round**: the ADR-0074 D-F trigger conditions are unmet (no external claim, no sanitization-zone touch, no risk threshold). The round closes by self-check battery plus owner approval, and this round's dispositions are listed as routine review surface for the next audit.
- **Two separate owner asks** land at closeout (ledger D-005): instrument seq 24 sign-off (record-type) and owner ratification of the defer-0051 evidence packet (judgmental - it keeps its own accept/reject exit). They are never bundled.
- Reaffirmed: no push this round (owner-only domain; remote main already reached `a8e0bdb` at grill time - a fact annotation, not an agenda); `.scratch` records append-only; no source-code behavior edits.

## Rejected

- **An independent N/M leg** producing its own pass state - a small-but-diverse corpus would bypass the 200-event count's intent (ledger D-003).
- **Write-time provenance/intent fields** on lane records - defer-0053 is frozen; classification is analysis-side transcript work (ledger D-003).
- **Reusing claim-family or projectSlug as the diversity measure** - semantic mismatch; projectSlug may only enter later as a tightening dimension, never as the primary judgment (ledger D-003).
- **Symbolic parameter registration** (leaving N/M as symbols) - violates the concreteness principle; values are pinned (ledger D-003).
- **Binding the sunset to defer-0055's `closes_if` alone** - dependency inversion: the gate's sunset would hang on a bookkeeping row's own expiry field (ledger D-004).
- **Auto-disposition on trigger fire** (auto-downgrade or auto-close of G1) - ADR-0035 precedent: assertions SUGGEST activation; disposition stays human (ledger D-004).
- **A record-only trigger** - a sunset that convenes nothing is a decorative clause and a false sense of safety (ledger D-004).
- **Registering the review's full criteria now** - stale on arrival at a distant review and de facto strategy work under the D-001 cap; the blocking meta-requirement plus shape is the correct registration depth (ledger D-004).
- **Bundling the two owner asks** - a judgmental ratification hidden inside a record-type tail dilutes the ratify into a rubber stamp (ledger D-005).
- **Reporting the defer-0051 countersign as a round audit** - it covers exactly one registry item (ledger D-005).
- **Loosening N/M later** - the asymmetry is tightening-only (ledger D-003/D-006).

## Consequences

- The promotion review's corpus frame is now frozen before data exists: a single-proposition qualifier (200 events AND 20 sessions AND 5 classes), an 8-class taxonomy with its four implementation requirements, an explicit independence operationalization with its measurability boundary, and tighten-only amendment discipline.
- The gate gains an honest terminal for permanent zero: a dual-or-path sunset trigger whose only power is convening the scheduled strategic review, lifecycle-independent of the watch it parallels.
- The strategic review is bound by a blocking meta-requirement - unregistered criteria void its output - with the criteria shape fixed but values deferred to the review itself.
- defer-0055 keeps its quarterly cadence and carries only a pointer to the clause; defer-0059 joins the tally tide; the t14 ledger joins the anchors; the round takes the ADR-0074 light close with two unbundled owner asks.
- R2 dispositions (executed 2026-09-17, action round) land below this line when executed; the preregistration text above does not move during R2.
- R2 dispositions (executed 2026-09-17): defer-0051 closed discharged-by-trigger (pinned-protocol re-measure 324711 < 340000 on the evidence packet, weak-independent second-party countersign, single-point caveat recorded, owner ratification pending as T-3 Ask B); defer-0059 closed via the same-commit ledger note; defer-0055 keeps quarterly cadence with the sunset counter at 1/6 (organic=0 at this check-in); telemetry checkpoint exported; trend-inventory grill-t14 row landed; instrument seq 26 recorded; the rewrite-map generator's old-ref discovery and citation-scan enumeration were repaired under the F-1 union lesson (the doc round's own regen exposed that post-publish working branches poisoned old-side discovery); preregistration text untouched throughout.

## Acceptance

- `node scripts/build-adr-index.js --check`, `node scripts/build-governance-anchors.js --check`, `node scripts/check-governance-inventory.js`, `node scripts/check-deferred.js`, `node scripts/check-host-contracts.js` all exit 0.
- `npx jest test/adr-0075-wiring.test.js` green; `node scripts/run-test-gate.js --expected-suites 72` green.
- `node scripts/instrument.js --check` verifies the chain with the t14 doc-round event appended.
- R2 exit evidence: `npm run gate:all` exit 0; the defer-0051 evidence packet carries the re-measurement plus both signature slots; telemetry checkpoint artifacts exist under `.scratch/grill-t14/`.
