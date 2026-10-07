# ADR-0099: Disposition–Evidence Closure — §P-A the defer-0089 Cash-Out (Claim Registrations Cite a Row Id), §P-B the Optional check_channel Field, §P-C the Prose Triple and the Gauge-Difference Disclosure (grill-t39)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-10-07
- Ledger: `.scratch/grill-t39/decision-ledger.md` — D-006 (current); round scope D-001.3 (the Q-t39 candidate branches)
- Spec: `.scratch/grill-t39/spec-t39.md` — §S-5 (the sole drafting specification; not an authority source)
- Relates: ADR-0096 §P-1 (this ADR's §P-C **refines** it, and §P-1 is **not** edited), ADR-0095 D-A/D-C (the anchor-sharing and triage exits), ADR-0089 D-D ("the classifier NEVER writes" — the rule §P-B's migration form obeys), ADR-0058 R3 (the `source_adr` naming precedent), ADR-0064 (alarm fatigue, the reason a missing field is yellow), ADR-0091 D-E (the disposition-debt argument behind defer-0101)

## Context

Three live instances of one shape were handed to this round by the grill-t38 LOOP
handoff §5. Each is a **disposition that claims to be evidence-backed but cannot be
walked back to the record**:

- **(a)** a report asserted that a deferred row had been registered when it had not
  (the ADR-0096:51 over-report; the repair stands as a positive sample);
- **(b)** a bounded assertion carried an unbounded obligation — the defer-0088/F-9 shape
  of "registered, therefore measured";
- **(c)** an instrument mis-reported itself: a summary header counting 54 while the leg
  rows counted 53, both readings true of different gauges.

The precedent this round records for the second time in a row: **the correct carrier for a
disposition is to cash out an existing deferred row, not to mint a new enumeration
surface** (the first instance being the Q4 merge onto the defer-0091 anchor). All three
branches land in one ADR with three independently amendable sections, because they are one
force-field — disposition against evidence — and a section that needs to move later must
not drag the other two (grill-t37 D-006's bundling defence).

## Decision

### §P-A — Claim registrations cite a row id (the defer-0089 cash-out)

**Prose convention.** A committed sentence that claims a registration — "已登记
defer-NNNN", "registered as defer-NNNN" — **must name the row id**. A claim of
registration without a resolvable id is not a registration.

**Mechanical existence check.** The named row id must **resolve inside the claim anchor
commit**: the registry is read from the anchor commit's tree, not from the worktree, so the
assertion is about the committed surface at the point the claim was made. The obligation is
satisfied when the id exists in `docs/deferred-registry.json` at that anchor.

**Why this is a cash-out and not a new surface.** This closes **defer-0089** ("prose
run_id parenthesization existence mechanical backstop"), whose un-freeze trigger is
"parenthesization degradation is evidenced". The degradation is now evidenced, and the
disposition performed is exactly the one that row reserved. Under ADR-0033's terminal
dispositions the row becomes **`actioned`** (deferred work performed), carrying
`actioned_at` and `actioned_via` pointing at this section — it is not deleted, and it is
not left pending. `source_adr` for the rows this ADR registers names
`docs/adr/0099-…` following the ADR-0058 R3 form.

**Standard, named once.** The bidirectional reconciliation is the audit assertion
discipline (ISA 315 / PCAOB AS 1105): a claim and a record must be walkable in both
directions. This repository had record→claim and was missing claim→record.

### §P-B — The optional `check_channel` field

**Shape.** `docs/deferred-registry.json` entries may carry an optional
`check_channel` field. It is **not required on existing rows**. The change is
expand-contract additive (the Kubernetes CRD precedent: a required field protects write
integrity, and this is not a write-integrity problem).

**Closed three-valued enum.** The channel names where a deferred row's check actually
runs:

| value | meaning |
|---|---|
| `gate-leg` | a registered blocking leg evaluates the condition |
| `owner-only` | the check is an owner act; no machinery claims it |
| `mechanical-trigger` | a script/verifier assertion exists (the `verified_by` family) |

**Enum-widening is pre-registered.** A fourth channel value may not be introduced
silently: widening this closed enum rides the **ADR-0086 fenced channel — an ADR plus a
countersign**. The rule is registered here so the first attempt to add a value meets a
pre-existing contract rather than a fresh argument.

**Missing field = yellow disclosure, not red.** The roughly ninety existing rows would all
fire red on day one; a uniform red over the whole population is alarm fatigue (ADR-0064),
and an alarm nobody can distinguish from noise stops being an assertion.

**Landing form.** Schema validation in `scripts/check-deferred.js`, the annotation of the
rows this round touches, and the wiring test land in **one atomic commit** — the ADR-0089
D-G same-commit family, and ADR-0095 D-B's universal clause: the governing text and the
mechanism it governs do not ride separate commits.

**Whether `check_channel` is classified editorial or fenced is an OWNER act** (Registered
transfers); this section does not pre-empt it, and the field ships without a governance
classification rather than with an unratified one.

**Migration is one-shot, never standing.**

- form: `backfill --dry-run` → produce the list → **owner confirms** → one commit;
- forbidden: periodic agent-side backfill (the ADR-0089 D-D "classifier NEVER writes" law
  generalized: a migration that runs on a timer becomes the writer nobody authorized);
- forbidden: **partial backfill** — a schema-complete claim over partially migrated data
  is the self-referential defect this section exists to close;
- **pre-registered degrade condition** (cost unmeasured at drafting time, so the condition
  is registered rather than the exemption): if the measured cost exceeds the round's
  budget, the standing form becomes *"required on new rows + yellow disclosure on existing
  rows + a trigger-side ratchet (a row missing the field gains no new trigger authority)"*.
  **The cost may be cut; the obligation may not.** Registered as `defer-0100`.

### §P-C — The prose triple and the gauge-difference disclosure

**The refinement (of ADR-0096 §P-1, not a redirection).** The prose-anchor obligation
grows from a pair to a **triple**: a sentence carrying a mechanically-judgeable value must
parenthesize

1. the **value**,
2. its **`run_id`** back-reference, and
3. the **instrument gauge name** — which counter produced the number.

The precedent is that a metric's identity is incomplete without its operation name
(Prometheus `level:metric:operations`) and that a status object is only interpretable next
to the generation it observed (Kubernetes `observedGeneration`). The t38-D-003.7 refinement
sentence is the form this clause follows: a refinement names what it refines and does not
rewrite it. §P-1's text is **not** edited.

**Gauge-difference disclosure obligation.** Where the summary-header count and the
leg-level count measure different gauges, the divergence is a **yellow disclosure
obligation**, not a red verdict. Both readings may be true of different objects; the defect
is a silent difference, not the difference itself. Measured instance for this round: the
`gate:all` summary line reports 54 rows while the leg-timing artifact of the same run
records 49 leg entries
(run_id `gates.f41af2f7bfdc61b74f4dcbebfaa841e79066533c.HEAD.dirty.2026-10-07T06-52-44.620Z`,
gauge: the leg-timing artifact's `legs[]` length vs the summary's "53 legs + 1 guard = 54
rows") — the two are different populations (per-leg spawn timings vs registered rows plus
guards), and this section is the reason the difference is written down instead of resolved
by picking a favourite number.

**The consistency leg is vetoed this round, and the veto is recorded.** A
`summary == legs` counting-consistency leg is **not** built here. Reasons, all three
required and none sufficient alone: (i) the two gauges are each true of their own
population, so equality is the wrong assertion — they are not aggregate-and-part; (ii) it
would collide with t38-D-006.8's ban on a second counter; (iii) its cost is unmeasured.
The question rides **the same anchor as `defer-0091` / F-11** — the first real
declared-vs-inferred mismatch case — so the two never become double counters. Registering
the veto with its anchor is the disposition; leaving it as an open argument would be the
suppressed-debt form.

## Registered transfers (floor, not ceiling)

| Row | Exit | Content |
|---|---|---|
| `defer-0100` | **deferred (pre-registered degrade condition)** | §P-B migration cost unmeasured; the degrade form is named in advance so exceeding budget cannot be read as permission to drop the obligation |
| `defer-0101` | **deferred, pending decision with a trigger** | the audit-surface coverage red has two exits, named with costs in the owner handoff list: (1) re-run the CI face and paste the full v1 block by name — a mechanical act; (2) legislate a *partial-coverage declaration* — a legislative act. A list-only exit would leave an undated warning (suppressed debt, ADR-0091 D-E stage 2); a registry-only exit would bury a blocking decision in a quarterly-polling queue |
| `check_channel` editorial-vs-fenced classification | **owner handoff** | the field ships unclassified rather than pre-empted |
| defer-0089 | **cash-out (actioned)** | §P-A is the disposition the row reserved |

## Boundaries

- **Vetoes, recorded:** a fifth enumeration surface to route around defer-0089 (the
  t37-D-001 constraint is the reason §P-A is a cash-out); a required field form (§P-B); a
  consistency leg this round (§P-C, with its anchor named); periodic or partial backfill
  (§P-B); and carrying the three sections in `AGENTS.md` plus a schema change instead of an
  ADR — a convention surface cannot host a contract surface (ADR-0083 D-C).
- **Independence.** §P-A, §P-B and §P-C amend independently; none of the three cites the
  others as a precondition.
- **Honest gaps, registered not closed:** the §P-B backfill cost is unmeasured (degrade
  condition pre-registered); the §P-C gauge-difference disclosure is prose-plus-review,
  with the machine check living in `defer-0091`'s anchor, not here; the SOX 404 practice
  layer was reached only through a second-hand source.
- **Zero verifier-side additions beyond the two named assertions** — the row-id existence
  check (§P-A) and the `check_channel` shape validation (§P-B) are the whole blocking
  surface this ADR adds.

## Human-only adjudication points

The `check_channel` governance classification, the `defer-0101` exit choice, and the
§P-B migration's owner confirmation are OWNER acts. This ADR's machinery reports state; it
never issues those verdicts.
