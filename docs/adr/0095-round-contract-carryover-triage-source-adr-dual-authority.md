# ADR-0095: Assertion-Anchoring Round Contract — Carryover Triage, the source_adr Dual-Authority Declaration, and the Same-Commit Universal Clause (grill-t38)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-10-06
- Ledger: `.scratch/grill-t38/decision-ledger.md` — D-006 (current); carryover items adjudicated from `.scratch/grill-t37/decision-ledger.md`
- Spec: `.scratch/grill-t38/spec-t38-assertion-anchoring.md` — §S-9 (the sole drafting specification)
- Relates: ADR-0096 — this ADR's D-A declares the status-inventory leg's authority source to be the ADR-0095 + ADR-0096 pair; the mechanism carrier is ADR-0096.

## Context

The grill-t38 round object is assertion-anchoring, and its mechanism carrier is ADR-0096 (§P-1 emit side, §P-2 test side, §N-3 emit output contract). This ADR is the round contract that carries the round's *triage*: the carryover items the grill-t37 audit routed to "ADR-0095 adjudication material" (t37 audit §6.6) are registered here, and two round-level laws — the `source_adr` single-value law and the same-commit universal clause — are legislated here rather than inside the mechanism carrier.

Carrier discipline is inherited: this ADR does not amend ADR-0091/0092/0093. A new file is created because the round contract and the observer/enum-surface contracts occupy different force-fields, and folding them together would reproduce the bundling defect that hides a dispute inside an unrelated amendment (grill-t37 D-006.1, the (b) rejection). ADR-0096 is the sibling carrier; the two are drafted in the same round and the same commit order (ADR-0095 first — task T-0), so that the assert leg is never registered against a contract that does not yet exist.

Three carryover classes are in scope: the `source_adr` multi-value question (D-A), the same-commit obligation generalized from three separate instances (D-B), and the F-6 / F-8 / F-10 boundary registrations (§M-D, D-C). The triage table itself — which items register, which defer, which move to the owner — is carried in "Registered transfers" below.

## Decision

### D-A — The source_adr single-value law and the dual-authority declaration

`gates.json` and `deferred-registry.json` carry a `source_adr` field. This round legislates that it **stays single-valued, pointing at ADR-0095** — the round contract is the primary authority for the legs this round registers.

The multi-value question is answered by declaration, not by a schema change. The ADR body explicitly declares:

> **The status-inventory leg's authority source = ADR-0095 + ADR-0096.**

This is the **expand-contract additive form: the declaration lands first; the physical schema is untouched.** The single `source_adr` value continues to name ADR-0095, while the declared authority set is the pair. A reader who needs the leg's full authority reads this ADR's declaration; a machine that reads `source_adr` still sees exactly one value.

**Array expansion is forbidden this round.** `source_adr` is a **fenced governance field** (the surface-taxonomy `field_governance` classification, measured — ADR-0086 field-level governance), so changing its shape requires an ADR *plus* a countersign, which is heavier than this round's mandate. The specifically forbidden shape is a partially-readable array: two consumers reading different elements of the same array is the dual-reading defect ADR-0083 D-003 bans, and it would be introduced silently by the "just add an element" move.

**Pre-registered reopen condition.** The array ruling reopens if either of two events occurs: (1) a **third co-authority ADR** appears for the same leg, at which point the pair-declaration no longer names the authority set; or (2) a **per-authority content-anchor machine check** becomes necessary, at which point the declaration must become machine-readable rather than prose. Until then the declaration carries the pair and the field stays single-valued. Reopening is a registered future decision, not an open question, and any array form that lands must arrive with a countersign and must not legalize partial reads.

### D-B — The same-commit universal clause

Three separate instances in this repository share one shape: a legislative text segment and the mechanism or value it governs were landing in *different* commits, so for one commit the mechanism was in force while the text that authorized it was not (or the reverse). This ADR elevates the shape to a general clause rather than fixing the three instances apart, because three independent fixes is how a fourth instance survives.

The clause, verbatim:

> **立法文本段落（或其修订）与其所治理的机制/值同 commit 落地；治理段落晚于机制落地=该机制在该 commit 内不得 blocking。**

Read for the English text of this ADR: a legislative text segment (or its revision) lands in the **same commit** as the mechanism or value it governs; if the governing segment lands *later* than the mechanism, then **that mechanism must not be blocking within that commit**. The clause is conditional — it does not authorize the split; it bounds the damage of a split that has already happened by forbidding the un-authorized mechanism from gating.

The three projections this clause covers, and which may no longer be legislated independently:

- **ADR-0027 D2(b)** — the pre-registered-threshold enforcement clause; its text and its threshold value must not ride separate commits.
- **grill-t38 D-005.5** — the N-3 emit reshape lands with its pinning test, its ADR section, and the `_doc`/AGENTS.md wording **in one commit** (carried in ADR-0096 §N-3).
- **F-9** — the T-0 tier-fill legislation: the tier default values and the text that fills them land together (t37-D-006.6). The measured leg-timing distribution now exists (`test-artifacts/leg-timing/*.json`), while the tier defaults remain deliberately unset (`TIER_TIMEOUT_S = {}` in `scripts/run-gates.js`): there is no governing value to couple yet, so this projection is **inactive, not in violation** — it activates the moment a tier default value is legislated, and the value and its text must then land together. The clause does not depend on the empty placeholder: the placeholder is a not-yet-triggered projection, not the clause's exemplar.

A mechanism whose governing text is not yet committed may run in a **non-blocking** mode for that commit — advisory, or emitting only — but it may not fail the build. That is the mechanical reading that makes the clause checkable: the blocking tier of a mechanism is a function of whether its governing text is present in the same commit.

### D-C — §M-D: Boundary registrations (F-6, F-8, F-10)

The registration exit is a **carrier + design-content double delivery** (D-006.4). The triage table answers only *where* an item goes; the design content is written here, because a registration that routes an item without writing its content merely postpones the dispute to drafting time. All three items below are **registrations, not retro-convictions**: the finding was measured in the t37 audit; registering it here dissolves the live conflict without convicting the past implementation.

**F-6 — the s2 domain-predicate boundary.** `repo-exports.js:87-99` resolves the s2 "same-file declarations" predicate by counting object-literal keys, member-access tails (`x.foo` ⇒ `foo`), and ident-shaped string literals. Spec S-4 defines s2 = {same-file declarations ∪ imports ∪ repo export table}. The registered boundary: **s2 is a name-declaration predicate, not a string-occurrence predicate.** A comment citing `foo` may resolve only against a declaration surface, and the widening to string-occurrence is a false-negative-by-construction on a deny-level leg. The boundary is registered here; the predicate repair is implementation-wave work, not this ADR's.

**F-8 — the identity-predicate refinement sentence.** `normalizeRow` strips `command` and `exit` from member identity, while the strip list frozen in **t37-D-005.5** names only {duration, timestamps, absolute paths}. The refinement sentence — which **cites t37-D-005.5 and does not rewrite it** — is: the t37-D-005.5 strip list *is* the identity predicate; `command` and `exit` are outside member identity because they are judged-surface attributes already carried by the `judged_surface` field, so stripping them is the same normalization the clause already authorizes, not a second strip list. t37-D-005.5's original text is retained; this is a refinement, not a revision.

**F-10 — the contract-vocab base-widening registration.** The spec froze "本轮实测 44 个同族集"; the implementation enumerates all committed `docs/**/*.json` plus `bench/polygraph/thresholds.json` plus four code enums (`build-contract-vocab.js:31-56`). The widening is **registered** with its reason and its residual domain:

- *Widening reason* — the 44-item set was a measurement of the same-family set, and the drift-diff regeneration gate preserves "禁静默扩列" in spirit; enumerating the derived-all-docs-JSON basis makes the gate cover the family rather than a sample of it.
- *Residual domain* — the enumeration basis is now all committed docs JSON plus the named code enums; anything outside that basis is not covered by the gate and is a known residual.

This registration **dissolves the live conflict** with t37-D-004.3 ("禁静默扩列"): the base was widened without registration, which is a live violation of that clause, and registering it here — reason and residual named — is the dissolution. There is **no retro-conviction**: the past implementation is registered, not punished.

## Registered transfers (floor, not ceiling)

The triage below registers what this round routes rather than absorbs. Nothing registered may be silently dropped.

| Item | Exit | Content |
|---|---|---|
| ADR-0095 + three-leg registration | **registered** | t37-D-006 execution surface; the assert leg lands last so `source_adr` is never dangling (ADR-0058 R3 precedent) |
| F-6 s2 domain predicate | **registered** | written in §M-D (D-C) |
| F-8 identity predicate | **registered** | written in §M-D (D-C); cites t37-D-005.5 |
| F-10 contract-vocab base | **registered** | written in §M-D (D-C); widening reason + residual domain |
| F-9 same-commit | **registered** | folded into the universal clause (D-B) |
| F-5 run_id matrix dimension | **deferred** | trigger = any workflow shows `matrix:`; review_at = 2026-04-30 |
| F-11 mismatch pre-computation | **deferred** | trigger shares an anchor with the t37-D-003.7 first-case hook (the first real declared-vs-inferred mismatch, or a gate-battery timeout); review_at = 2026-04-30 |
| pack cap | **owner handoff** | the agent may pre-compute candidate values for review and may not co-sign; the owner's re-derivation must report size **and** entryCount together |
| post-land-sentinel refresh | **owner handoff** | time-point layer only; the mechanical regeneration is already legislated by E-17/E-19, so zero new legislation |

The F-5 and F-11 deferred rows follow the t37-D-006.5 form (`cadence_tier` + `review_at`, with the check-deferred STALE fail-closed three exits activate/re-defer/remove). They **register the gap only and re-legislate nothing**: F-5's matrix dimension is already legislated in t37-D-005.2, so the deferred row may not restate it (no parallel ledger); its fact correction is that `run_id` already carries `GITHUB_JOB`, the real defect is a GH matrix-leg same-name collision plus an over-declared comment, and `ci.yml` measures zero `matrix:` today. F-11's trigger shares one anchor with the t37-D-003.7 first-case hook so the two never become double counters.

## Boundaries

- The triage has exactly three exits — register / defer / owner handoff. There is no fourth exit, and a row that fits none of the three is a drafting defect, not a new category.
- The `source_adr` field is not array-expanded this round; the pair is declared in prose (D-A). Any future array form needs a countersign and must not legalize partial reads (ADR-0083 D-003).
- The same-commit clause (D-B) bounds a split; it never authorizes one. A mechanism whose governing text is absent is *non-blocking for that commit*, which is a damage limit, not a licence to land the text late.
- Registration is not retro-conviction (D-C). F-6/F-8/F-10 are registered as measured findings; no past implementation is convicted by this ADR, and none of the three repairs is performed here.
- Open gaps, registered not closed: the pack cap `entryCount` is not reported alongside the size, so the owner must complete it before re-derivation. The same-commit clause's justiciability is now **closed** (it previously read "to be measured at drafting time", grill-t38 D-006.NEG): it is **mechanically decidable** for the two text-segment projections — a governing text segment is file content in the commit tree, so `git show --name-only` / `git ls-tree` decides whether the text and the mechanism share a commit (ADR-0027 D2(b), D-005.5) — while the F-9 value projection is **vacuous rather than undecidable**: `TIER_TIMEOUT_S = {}` carries no governing value to couple, so the clause has nothing to decide there until a tier default value is legislated. The clause is justiciable wherever it has a text/value to couple, and vacuous on the empty instance.

## Human-only adjudication points

The pack-cap sign-off, the post-land-sentinel refresh time-point ("the wave has settled" is an owner judgment), and any reopening of the `source_adr` array ruling are OWNER acts. This ADR's machinery reports state; it never issues those verdicts. The agent registers F-6/F-8/F-10 and reports; it never self-certifies their disposition.
