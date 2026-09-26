# ADR-0077: The Consuming-Row Exit Convention, the Mechanism-Output Artifact Enumeration, and the Round-Report Facts Canon (grill-t16 fix + mechanism round)

- Status: Accepted
- Date: 2026-09-18
- Amends: ADR-0076 D-B(2) (governance_tooling_diff.files[] jurisdiction narrowed to machinery-source hand-edits; the mechanism-output faithful-regeneration exemption is registered)
- Ledger: `.scratch/grill-t16/decision-ledger.md` — grill-t16 D-001..D-005 (all current); the governance copy is `docs/governance/decision-ledger-t16.md`
- Spec: `.scratch/grill-t16/spec-fix-mechanisms.md`

## Context

The grill-t15 audit closed PASS WITH FINDINGS (F-A..F-E plus nits). Several findings name mechanism classes rather than one-off defects: F-A/F-B (a verified_by exit code ANDs legs across rows, so a terminal row's regression can silence the live tripwire; the stale header still describes the dead predicate), F-C (a disposition's citation chain broke), F-D (two R2-surface mechanism-output artifacts were touched but undeclared — the taxonomy's letter carves no output-artifact exception and the recompute validates labels, not coverage). A recurring class sits beside them: report numbers go stale between drafting and close. This round re-keys the exit to the row currently consuming the verifier, names the output-artifact convention inside the R2 surface, and moves report numbers into a regenerated canon.

## Decision

### D-A - The consuming-row exit convention (ledger D-002)

**Decision**: a verified_by script's exit code reflects only the legs of the row(s) currently consuming it; multi-row reporting is diagnostic, never exit-driving. The wording is "currently consuming" on purpose: the per-row selector is a pre-registered upgrade path that activates when a second live consumer appears — it is not a contradiction of the convention, and wiring a selector earlier would be permanent dead code (n=1 has nothing to select).

- exit 0 = the consuming row's condition satisfied; exit 1 = unsatisfied; exit >1 = the verifier itself is broken. A crash must never masquerade as unsatisfied (the Nagios UNKNOWN catch-all mirror); check-deferred's evalSuggestions already treats exit>1 as the verifier-broken WARN, so the contract plugs into existing machinery.
- Discharge re-point clause: when the consuming row discharges, the exit key re-points to the next consumer or retires in the same commit as that registry edit — the exit key is part of the disposition, not an afterthought.
- Executed on scripts/check-ci-jobs.js in R2: the exit is keyed to defer0004 (the only live consumer); defer0026 legs stay computed and printed in the stdout tag line as diagnostics; the header is rewritten in the same edit (settles F-B); main() is wrapped in a catch that exits 2 with a stderr line.
- Honest residual, disclosed not hidden: evalSuggestions discards the verifier's stdout, so defer0026 leg regressions surface only via wiring fixtures at runtime — wiring-layer-only, not fully orphaned (the summary job is separately covered by check-ci-wiring).

### D-A.1 - The guard/emit-exit structure contract (grill-t18 appendix, ledger D-003)

**Decision**: verifier-style fail-closed tooling accumulates violations WITHIN a phase and crosses exactly one emit-exit boundary per phase; an immediate `process.exit` mid-phase is reserved for the verifier-broken class (exit >1) alone. Phases are the script's own segments (arg-guard, collect, scan, splice); a fail-fast exit at a phase boundary is the contract, not a violation of it — the convention covers same-phase emit-exit convergence and does not forbid cross-phase fail-fast.

- **Cause-summary clause**: a nonzero exit states its cause at the end of output — one FAIL line per accumulated violation, then the exit. Exit >1 stays the verifier-broken channel per D-A (a crash must never masquerade as unsatisfied).
- **defer-0063 unfreeze + discharge**: this appendix is the written convention defer-0063's `unfreeze_if` required (ADR clause form). The grill-t18 fix bundle takes the ticket first per its anti-rot quota — `build-round-facts.js` converges both violation-emit sites on one shared emit-exit boundary, fail-fast semantics unchanged. The row transitions closed in the same round's registry bookkeeping.
- **Missing-input clause (grill-t19 amendment, ledger D-004)**: a missing input artifact is an unsatisfied condition recorded at the phase boundary — the phase is skipped and the single boundary exit carries it — never an early exit; the three-value contract grows no fourth class. Executed on `build-round-facts.js` in the same round's R2: the missing-factsFile condition routes through the drift/unsatisfied channel to the boundary exit, and the `main()` catch wrapper maps any crash to verifier-broken (exit 2).

### D-B - Mechanism-output artifacts: an R2-internal closed enumeration (ledger D-003)

**Decision**: docs/governance/surface-taxonomy.json gains a mechanism_outputs block — a closed enumeration (never residual, same anti-drift discipline as the R1 closure) of {file, generator, replay_verified} entries. The enumeration covers exactly the files the disclosure obligation exists for: git-tracked, R2-classified artifacts produced by a registered in-repo generator. Initial members:

- src/instrument-state.json — generator scripts/instrument.js; replay_verified:false (append-only event log with timestamps; re-running is not byte-identical — registered debt).
- bench/research/out/g6-publish-replay.json — generator scripts/check-g6-publish.js; replay_verified:true (deterministic at a fixed tree — its own _doc attests a green re-run reproduces identical bytes; it also carries the pack-size record).

The same output class on the documentation surface — docs/governance/anchors.json, docs/rewrite-map.json, the taxonomy's own R1.files snapshot, the README adr-index block — is named here, not enumerated: R3 files never enter files[] jurisdiction, so the exemption question does not arise for them. A fourth surface class stays rejected: it would break D-A's exactly-one-of-three invariant and let outputs escape R2 jurisdiction.

diff_semantics.governance_tooling_diff is reworded: files[] jurisdiction = machinery-SOURCE hand-edits. A mechanism-output artifact is exempt when the diff is a faithful regeneration — faithful = "the diff equals what re-running the registered generator at that commit produces" (the Go generated-file convention verbatim: non-canonical source; delete and regenerate produces zero diff). A HAND-EDIT of an output is a named heavier violation — falsification-adjacent — and must be disclosed in files[].

An optional sibling marker mechanism_output_diff:{files,reason} gives provenance visibility and never feeds burn-rate; the checker validates listed files ∈ mechanism_outputs, and a bare marker with no files hard-fails (mirrors carve_out_used=1). replay_verified:true outputs get re-run-and-diff as the audit's escalation tool (not a blocking gate initially); non-idempotent generators register replay_verified:false as recorded debt. The anti-gaming guards stand: a named heavier violation class, mechanical replay adjudication, git-archaeology deterrence, and idempotency pins; motive drift cannot be technically eradicated and is recorded honestly.

The grill-t15 trend row is annotated additively: the two touches the audit flagged (src/instrument-state.json via T-3, bench/research/out/g6-publish-replay.json via gate refresh) are the output class under this convention; historical booleans are untouched and carve_out_used:1 stands.

### D-C - The round-report facts canon (ledger D-004)

**Decision**: scripts/build-round-facts.js regenerates .scratch/grill-<tN>/round-facts.json at the closing step — schema {suites, passed, skipped, pack_bytes, instrument_entries, rewrite_map_citations, registry_entries, anchors_count, battery_as_of_commit, report_commit, not_run[]}. The report's facts section is deterministically rendered from the artifact inside a sentinel region; bare numbers are banned in report prose (wiring pins: no schema-key value may appear outside the facts section). report_commit stays null by design — the report cannot cite its own commit; self-reference is disclosed, not faked.

The as-of/addendum channel is narrowed to genuinely subsequent events (owner dispositions, T-3 sign-offs) and self-reference disclosure — the ASC 855 analogy: stale numbers are adjusting events determined at close and must be restated, not annotated. The t15 T-3 addendum pattern persists but sheds its number-fixing role; the t16 report states the narrowing explicitly so the thinner addendum is not misread as a deletion.

Explicit adjudicated deviation: the facts artifact does NOT join the anchors chain — per-round regeneration would churn the digest chain, and anchors serve slow-moving artifacts. The reason is recorded here rather than silently following the ledger-copy precedent.

Judgment line (the D-002 shape applied): "the report is narrative, never the home of numbers."

### D-D - Round surface and registrations (ledger D-001/D-005)

- The R1/R2 split is clean this round: the documentation bundle is all R3, the implementation bundle is all R2 — the D-B carve-out is NOT invoked and the burn-rate streak resets naturally. The t16 trend row records carve_out_used:0 with no governance_tooling_diff.
- defer-0062 — the net-addition tally row (+1 ADR-0077) per the D-006(a)(i) convention; closed via same-commit ledger note (defer-0059 precedent).
- defer-0004's rationale gains the explicit "ADR-0058 D-C" citation (settles audit F-C; lands in the same commit as the CONTEXT convention touch per the ADR-0027/0033 coupling guard).
- Consent-sweep (never "audit response"): defer-0060 (quarterly, review_at 2026-12-15 — a tracked row, not an ask), the sunset counter (1/6 — next observation 2026-12-15), defer-0053/0057/0058 and the O-E backlog each get one ledger disposition line at disposition time.
- Stack landing (grill-t15-docs, unlanded commits) — awareness line only; owner-domain action, not a decision item.
- Zero owner asks this round: T-3 is fully discharged; defer-0060's owner actions are its unfreeze_if.
- The three audit patches (tq/nl/xu) stay untracked forever; the round report restates the explicit-change-IDs lesson.

### D-E - The unconditional-scan enforcement and the evidence-file convention (grill-t17 appendix, ledger D-002)

**Decision**: the D-C prose pin is unconditional. The bare-number scan moves into `scripts/build-round-facts.js` as the exported `proseScan`, the backtick-span exemption is deleted, and `--check --report` enforces it at author time — a canon number in report prose fails the check before the gate ever sees it, quoted or bare. Schema-key values live only in the sentinel region; a number inside quotation marks is still a number in prose. The pin binds reports authored from this appendix forward — earlier round reports were written under the backtick-exemption convention and stay verbatim (the E-4/E-5 forward-binding pattern).

**The evidence-file convention**: verbatim tool output lives in `.scratch/grill-tNN/evidence/` committed artifacts; the report references them by path and carries no numbers inline. Evidence artifacts are per-round regenerated and do NOT join the anchors chain — the same churn reasoning that keeps `round-facts.json` out (per-round regeneration would churn the slow-moving digest chain; the D-C adjudicated deviation extends to the evidence directory by the same argument). Verbatim evidence snapshots may disagree on counts across the regen boundary — an expected ordering artifact, not a discrepancy (grill-t18 boundary sentence, ledger D-007).

**The bare-value floor, registered (grill-t18 amendment, ledger D-002)**: the unconditional scan's bare-number leg carries a `v.length >= 2` floor — a pattern-ambiguity function, not a leniency: a single-digit canon value collides with ambient `\b\d\b` numerals (dates, counts, list indices) that no regex can privilege, so the floor trades detection for precision at exactly one digit. Compensating clause: single-digit values are backstopped by the key-assign leg — `suites: 5` in prose violates because the schema-key form is unambiguous even when the bare digit is not. Coverage boundary: a bare single-digit canon value in prose is a permanent declared gap of this pin — registered here, not in the deferred registry, because no mechanism can close it without reintroducing the ambiguity the floor exists to kill. The key-assign leg itself covers all eleven schema keys — `skipped`, `not_run`, `battery_as_of_commit`, and `report_commit` included (the H-3 implementation fix); the `skipped=0` dedicated pattern stands beside them unchanged.

**defer-0063** registers the deferred sibling smell: `build-round-facts.js`'s guard/exit-style mix is a missing convention, not a local defect — convention first, fix after, per the registered gate criteria (minutes-scale ~≤30 lines × behavior-preserving × no-convention-needed). The row carries the anti-rot quota: the next fix bundle takes one smell ticket first. (Grill-t18: the convention landed as D-A.1 and the bundle took this ticket first — discharged; see D-A.1.)

## Consequences

- A verifier crash can no longer masquerade as "condition unsatisfied": exit>1 stays reserved for verifier-broken and evalSuggestions already warns on it.
- The multi-row union exit class is dead by convention: one live consumer = one keyed exit; the selector activates only when a second consumer exists.
- Mechanism outputs get provenance without polluting the burn-rate signal; a hand-edited output is a heavier named violation, not a diff that can hide behind regeneration wording.
- The report can never host stale numbers again: the facts artifact is regenerated at close, the section renders deterministically, and the self-reference hole is disclosed as null instead of filled with a fake value.

- Errata pointer (2026-09-26, ERRATA E-13, grill-t28 D-002): second_reviewer countersign obligation presumed subsisting - the bare form since t15 is unregistered drift, pending entity-level adjudication; the nine bare-form ADRs (0076..0081, 0083..0085) merge into the countersign queue (10 -> 19) for the 2026-12-15 entity-level tide - defer-0074. Reversal path: a lightweight registration ADR if consensus evidence for the bare form surfaces.
