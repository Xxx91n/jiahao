# ADR-0097: Upstream-Borrowing Incorporation — The Inline Cap-Comment Convention, the Harvester Landing-Channel Constraint, the Honest-Boundary Disclosure Discipline, the Methodology Quartet, Generator-Side Intensity, the Exclusion Domain, and the Numeric-Citation Ban (grill-t39)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-10-07
- Ledger: `.scratch/grill-t39/decision-ledger.md` — D-003 (current); round scope D-001.1 (the P-A line)
- Spec: `.scratch/grill-t39/spec-t39.md` — §S-3 (the sole drafting specification; not an authority source)
- Relates: ADR-0091 (derive-from-source mechanism, the only sanctioned second home for the harvester), ADR-0087 D-D (the polygraph appendix-probe status this ADR's numeric ban extends), ADR-0098 (sibling carrier for the fifth semantics — a different force-field, deliberately not folded here)

## Context

The upstream anchor project `ponytail` (v4.13.0, 311 commits at census time) shipped a
major update family: an inline cap-comment convention, a debt-marker harvester, an
honest-boundary scoreboard, an effectiveness benchmark method, a runtime intensity tier,
explicit Boundaries exclusion domains, and a numbering-continuity edit convention. This
round harvested ten deltas against this repository and adjudicated each one into
adopt / adapt / defer / reject (ledger D-003, ratified from the atomcode re-judgement
table, run 2026-10-07 session a5c67d8f).

Two facts shape the whole adjudication and are stated once here rather than per item.

**First, the conflict of interest in item #3 is real and is disclosed, not smoothed.**
Upstream's product position is "delete the check"; this repository's product *is* the
check. A borrowing decision made without naming that asymmetry would be an undisclosed
self-interest riding on a technical label.

**Second, what is borrowed is methodology, never numbers.** Upstream benchmark figures
have no evidentiary standing for this repository's effectiveness (D-J below). This is
the ADR-0087 D-D polygraph-appendix probe status extended from internal probes to
external baselines.

## Decision

### D-A — Item #1: the inline cap-comment convention (adopt, marker name adapted)

Engineering code in this repository (`scripts/`, `hooks/`) carries inline capacity/limit
comments following the upstream two-segment shape:

```
// jiahao-debt: <limit>, <upgrade trigger>
```

- The marker name is **adapted to this repository's namespace** (`jiahao-debt:` adopted;
  the bare upstream token is not shipped).
- **The two segments are legally inseparable.** `<limit>` without `<upgrade trigger>` is
  the upstream `no-trigger` rot class and collides with this repository's
  deferred-registry trigger discipline (ADR-0033 D4 lineage). A one-segment comment is a
  malformed comment, not a shorter one.
- The comment **is not a claim surface** and does not enter the rewrite-map coverage
  domain; it therefore has no interaction with the append-only discipline ADR-0100
  legislates. Writing it as debt-in-comment does not create a second ledger (D-B).

### D-B — Item #2: the harvester landing channel (adopt with a hard channel constraint)

Debt markers may be harvested into a machine-readable list, and the harvest is
**forbidden from creating a parallel ledger file** (the E-25 dual-channel disease).

Two sanctioned landing channels exist, and the choice between them is an **OWNER act**
(registered as a deferred row; see Registered transfers):

1. **Existing-channel landing** — harvest output is expressed as rows of
   `docs/deferred-registry.json`, i.e. the governance artifact this repository already
   operates, with its trigger/deadline discipline intact.
2. **Derive-from-source landing** — the marker *is* the source and the list *is* the
   derived artifact, which requires the full ADR-0091 mechanism form: derived artifact
   plus a freshness leg plus `--check` regen-plus-diff.

Independently of the landing choice, two obligations are legislated now:

- **The marker scan is a new enumeration surface and must carry its own ADR carrier**,
  not be bundled into another item (grill-t37 D-001 M-D).
- **The harvester must assert trigger completeness** — a harvested marker without an
  upgrade trigger is a rejection, not a row with an empty field.

### D-C — Item #3: deferred, with the reason registered as a conflict of interest

The upstream `yagni:` / `delete:` label family (six-token vocabulary
delete/stdlib/native/reuse/yagni/shrink) is **deferred**, and the deferral reason is the
conflict of interest named in Context, not a cost estimate.

- **Scope fence (permanent, not a deadline).** Governance ratchets, claim surfaces, and
  fenced enumerations **never** enter a `yagni:`-style target set. The fence is the
  unfreeze condition's precondition, so an unfreeze can widen the *label machinery* but
  cannot widen the *target domain* past the fence.
- **The caller-check half of the item needs no borrowing** — this repository already has
  a mechanical equivalent; re-borrowing it would create a second counter.

### D-D — Item #4: split into an adopt-now half and a defer half

- **Honest-boundary half — ADOPT NOW.** This is a **disclosure-sentence discipline**, not
  a gate: an effectiveness claim in a README or ADR may not invent a per-repository
  benefit figure; where the counterfactual does not exist, the claim says so; numbers are
  attached only to a measurement surface that produced them. Landing surface =
  effectiveness-class prose (README/ADR effect sentences). **No gate consumes this
  clause**, because a prose-discipline clause made blocking would be a
  style-enforcement leg, which ADR-0083 D-C does not authorize.
- **Scoreboard body — DEFER.** A scoreboard requires a control-arm experiment and a
  budget; neither exists. Registered as a deferred row rather than silently dropped.

### D-E — Item #5: adopt the method structure, refuse the water line

The benchmark **method** is adopted: real agents × real repositories, a control arm
(including a plain-wording control arm of the caveman type, supported by the SkillBenchmark
and ACES sources), a `safe` axis reported separately, and a corrective posture.

The **water line is not adopted**: upstream's `n=4` descriptive statistics support a
smoke-level disclosure at most. This repository's measurement floor is ADR-0067/ADR-0068
plus ADR-0029 D3 (`n ≥ 30`). Consequences stated plainly: an `n=4` figure may appear in a
smoke disclosure and may never be quoted as a threshold, a trend anchor, or evidence of
parity with or superiority over upstream.

### D-F — Item #6: the intensity tier, generator side only (the sub-ruling)

`intensity` and `role` are **two orthogonal axes**: `role` (generator/verifier profile) is
chosen at install time; `intensity` is a runtime-persisted setting. The sub-ruling of this
round concerns the second axis only.

- **The intensity tier is installed on the generator side. The verifier side does not
  carry a runtime intensity tier.** A blocking audit surface must not be weakenable by
  the party under audit. This is a force-field boundary, not a feature flag.
- **Drift toward runtime role detection is forbidden**; the vocabulary-based veto from
  earlier rounds stands.
- **Upstream's three incidents are adopted as this repository's acceptance criteria** for
  the intensity feature, named because they are the failure modes a reviewer would
  otherwise re-discover:
  1. upstream #1037 (project-state collision) ⇒ **state is namespaced per project**;
  2. upstream #687 / #676 (`off` semantics leak) ⇒ **`off` is genuinely silent at every
     injection point**, not silent at the ones the test happens to cover;
  3. upstream #677 (illegal parameter changed the mode) ⇒ **an invalid parameter preserves
     the current mode** and is reported, never coerced.

### D-G — Item #7: the exclusion domain, written on both faces

Adopted as two surfaces of one clause:

- the verifier configuration's **Boundaries** section grows an explicit exclusion domain:
  not for generating coaching content, not for resident injection on hosts without hook
  capability, not for non-audit tasks;
- the skill **description** carries the negative domain in the `Do NOT use for …` form.

The reason is stated once: the Generator–Verifier Gap is eroded by scope creep, and an
exclusion domain that exists only in prose erodes silently.

### D-H — Item #8: numbering continuity as an editing convention

New audit reports number their findings **continuously across the whole report**, so a
later round can cite a finding by number. This is an editing convention, not a gate. The
six-token label vocabulary attached to this upstream item travels with D-C (deferred),
not with this clause.

### D-I — Items #9/#10: rejected, with the genuine signal harvested

The upstream maturity matrix itself is **rejected** — this repository's ADR-0028 plus
ADR-0087 plus the host-contracts golden already express a more mature form of the same
governance question. Rejection is not loss: two signals harvested out of the rejected
items are registered as deferred rows, because each names a real hole here:

- **host sunset / degrade channel** — this repository has host *admission* and no host
  *removal* path;
- **the hook four-class incident checklist** — upstream's four hook failure classes, used
  as this repository's own self-inspection list.

### D-J — The numeric-citation ban (legislative)

> Upstream benchmark figures may never be cited as evidence of jiahao effectiveness. What
> is borrowed is methodology, not numbers.

This extends the ADR-0087 D-D probe status of the polygraph appendix from internal probes
to external baselines. It is a prose-discipline clause with a named residual: the ban is
enforced by review, not by a leg, and the reason no leg is minted here is the E-25
dual-channel rule — a numeric-citation check would need an enumeration surface of its own
and its own carrier (D-B precedent).

## Registered transfers (floor, not ceiling)

Deferred rows land in `docs/deferred-registry.json` in this round's documentation wave:

| Item | Row | Exit | Content |
|---|---|---|---|
| #3 label family | `defer-0094` | **deferred** | unfreeze condition + permanent scope fence (governance ratchet / claim surface / fenced enumeration never a target) |
| #4 scoreboard body | `defer-0095` | **deferred** | requires a control-arm experiment and a budget |
| #9 host sunset/degrade channel | `defer-0096` | **deferred** | admission exists, removal does not |
| #10 hook four-class self-check list | `defer-0097` | **deferred** | converted into this repository's own checklist |
| #2 harvester landing channel | `defer-0098` | **owner handoff** | registry-row form vs derive-from-source form, both prepared, cost named |

## Boundaries

- **Not in this ADR:** the fifth-semantics force-field (ADR-0098), claim-surface
  mutability (ADR-0100), disposition-evidence closure (ADR-0099). One ADR per
  force-field; folding them reproduces the t37-D-006 bundling defect.
- **Zero verifier-side additions.** The intensity tier, the harvester advisory, and the
  disclosure disciplines are generator-side or prose-side. No new blocking leg is minted
  by this ADR.
- **Rejected and recorded:** a parallel debt ledger (D-B); `n=4` as a measurement
  standard (D-E); a verifier-side intensity tier (D-F); runtime role detection (D-F); a
  blocking effectiveness-disclosure leg (D-D).
- **Honest gaps, registered not closed:** upstream issue #126 was read only through a
  restatement layer; the `safe` axis's six-task detail was not read (the
  `benchmarks/results/` original text must be read at landing time); upstream `hooks/`
  sources were not read file-by-file, so D-I's four classes are induced from release
  notes; the search engine AnySearch was unavailable during the run (two engines plus
  primary-source coverage).

## Human-only adjudication points

The harvester landing-channel selection (D-B, registry rows vs derive-from-source) is an
OWNER act; this ADR prepares both options and names their costs and does not choose. The
effectiveness-disclosure discipline (D-D) is adjudicated by review, not by machinery.
This ADR's machinery reports state; it never issues those verdicts.
