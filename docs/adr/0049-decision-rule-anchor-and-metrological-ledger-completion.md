# ADR-0049: Decision-Rule Anchor and Metrological Ledger Completion

Status: Accepted
Date: 2026-09-06

References: ADR-0013 (hash chain), ADR-0017 (human adjudication), ADR-0022
(censoring metadata), ADR-0025 (judge input certificate triple), ADR-0027
(pre-registered thresholds), ADR-0031 (replayability duty), ADR-0033/0035
(deferred registry), ADR-0040/0044 (evidence tri-state), ADR-0045
(deterministic verification channel), ADR-0046 (instrument identity and
quarantine), ADR-0047 (impact-tiered change control), ADR-0048 (metrological
ledger).

## Context

ADR-0048 froze the as-found/as-left double column but left the adjustment paths
thin in five places: the no-adjustment case is an implicit `as_left = as_found`
placeholder, pass is not tied to a named decision rule, the ledger row lacks
the reference-standard identity, criteria change lacks a pointwise replay
precondition, and a drift-exposed instrument has no obligation to revisit its
prior sign-offs. This document round sharpens those edges with the
industry-anchored models from six serial atomcode researches (Q1-Q6): ISO/IEC
17025:2017 (clauses 7.8.4.1(d), 6.4.10, and 7.10), ILAC-G8:09/2019 + JCGM
106:2012, CLSI EP26 (rebaseline old-new acceptability: D-C/D-D, not the D-E
retrospective), ONS/SNA2008 chain-linking, NIST metrological traceability, and OPA
Decision Logs. It records decisions and glossary terms only; it changes no
source, gate, schema, or executable wiring surface.

## Decision

### D-A - No-adjustment is a declared single result, not a duplicated column

When a reverify's as-found distribution passes the registered decision rule and
no adjustment occurs, the ledger records as-found once with an explicit
`no_adjustment` declaration. `as-left` appears only on an adjustment event
(rebaseline or criteria change), paired with its date. The
`as_left = as_found` + `adjusted:false` placeholder is replaced by the declared
form. This matches ISO/IEC 17025:2017 7.8.4.1(d) (before/after results are
reported only when adjusted or repaired) and VIM 2.39/3.11 (calibration is not
adjustment; adjustment normally requires re-calibration).

### D-B - Pass is a conformity statement under a named decision-rule anchor

`no_adjustment` and any pass statement are binary conformity declarations, not
raw readings. They may be made only when as-found passes a pre-registered
decision rule: ILAC-G8:09/2019 spectrum with JCGM 106:2012 acceptance-limit
math. The default is guarded acceptance `w=1, k=2` (PFA approximately 2.5%);
simple acceptance is enabled only when negotiated and TUR >= 4:1. A result in
the guard-band conditional zone does not receive a pass statement, mapping to
the existing evidence tri-state and threshold band. Each ledger row records
`decision_rule {id, version, w, acceptance_limit, spec_ref}`; a decision-rule
change is a criteria-change event on `change-surface.json` and replays by
version. Because ILAC G8 is under revision (ILAC AIC 2025-12), the anchor
carries a version and sits on the ADR-0035 external-event review cadence. Risk
values must annotate their uncertainty input basis (MPE-only versus standard
uncertainty); Acta IMEKO 2023 (reviewing ILAC-G8 practice) shows MPE-only
input overestimates conformity risk. The TUR definition for this single-sided
flip-rate limit (e.g. `TUR := spec_limit / u`) must be fixed in the
decision-rule document before any simple-acceptance negotiation — TUR >= 4:1
is the ANSI/NCSL Z540.3 industry convention, not an ILAC-G8 or 17025 clause.

### D-C - Each row anchors corpus reference; cross-baseline delta is re-expressed

The ledger row identity extends from the instrument identity triple to also
include `corpus_ref` (content digest plus version semantics). Cross-cycle
`observed delta` is directly comparable only between rows sharing the same
`corpus_ref`. A rebaseline breaks that comparability: cross-baseline delta is
carried through the old-new overlap of ADR-0047 D-B parallel scoring or is
declared non-comparable; silent subtraction across `corpus_ref` is forbidden.
This is the ISO 17025/NIST traceability requirement that a certificate identify
the reference standard used, plus the ONS/SNA2008 chain-linking discipline that
growth is spliced, not subtracted across reference periods. The machine
identity follows MLflow dataset digest / lm-eval task version: digest plus
version, not a name.

### D-D - Criteria change requires pointwise replay, otherwise it restates

A criteria change produces a genuine as-left re-projection only when the
pointwise observation is replayable: the judge input triple
`{claim, toolResults, heuristicVerdict}` (ADR-0025), the criteria version in
effect, and the instrument identity. The re-projection is a new measurement
using the new criteria on retained input; it does not promise bit-level replay
(SLSA distinguishes reproducible from verified-reproducible). The
Replayability audit moves from a declared gap to a deferred registry entry
(defer-0023), whose unfreeze condition is: metrological ledger authoritative,
pointwise input retention implemented, and the anchor set available. Without
pointwise replay, criteria change falls back to ADR-0047 restatement mapping.
The implementation model is OPA Decision Logs (`decision_id`, full `input`,
`bundle revision`, and `nd_builtin_cache` intended for decision replay) with
Event Sourcing temporal-query semantics.

### D-E - Drift exposure forces an affected sign-off look-back

When as-found exposes drift (flip-rate Wilson interval over limit), the
previous calibration interval's sign-offs anchored to the same instrument
identity triple must be revisited. The decision-rule anchor decides the
obligation: drift inside the guard band permits a documented negative finding;
drift over limit forces a look-back. Disposition is accept (documented negative
finding), re-verify (ADR-0045 deterministic channel), or restatement. Until
assessment completes, affected sign-offs are marked `affected/under-review` and
never remain valid by default. New evidence kinds `reverse_traceability` and
`oot_impact_assessment` enter the hash chain and route through ESCALATE. The
wheel is ISO/IEC 17025:2017 7.10 nonconforming-work reverse traceability plus
6.4.10 (a reference standard shown out of requirements triggers an effect
examination that starts the 7.10 procedure). CLSI EP26 is NOT the anchor here:
it is a reagent-lot-change acceptability protocol and belongs to the D-C/D-D
rebaseline old-new parallel scoring. AI
and MLOps drift controls stop at retrain/rollback, so the obligation is
borrowed from metrology.

## Rejected alternatives

- A duplicated as-left column for no adjustment (industry anti-pattern that
  silently drifts).
- Simple acceptance as the unnegotiated default (PFA approaches 50% at the
  limit).
- v1-to-v2 conversion or translation across corpus versions (forbidden silent
  subtraction in disguise).
- Aggregate-only recomputation as a genuine criteria-change re-projection
  (restatement is the honest floor).
- Default-valid historical sign-offs until challenged (the exact
  false-completion pattern this project targets).

## Consequences

- The next implementation round wires the no-adjustment ledger write, the
  decision-rule column, the `corpus_ref` row identity, the criteria-change
  replay precondition, and the look-back evidence kinds; it registers
  defer-0023.
- `CONTEXT.md` gains No-Adjustment Path, Decision-Rule Anchor, Corpus
  Reference, Baseline Re-Expression, Criteria Replay Precondition, Reverse
  Traceability, and Affected Sign-off Look-Back.
- The README ADR index rebuilds to 49 records;
  `test/adr-0033-wiring.test.js` extends the seed inventory to 17 entries.

## Acceptance

- `docs/deferred-registry.json` parses and defer-0023 is anchored by this ADR
  (source_adr file exists and the id appears in this text).
- `npm run deferred:gate`, `npm run adr:gate`, and the full Jest suite pass.
- No source, gate, schema, or executable wiring surface changes in this
  document round.

## Post-audit 2026-09-11 (two-axis review + industry research)

- Found: D-B required a fixed decision-rule document before simple-acceptance
  negotiation, but none existed; only the `rule.tur >= 4` code guard did.
  Fixed: `docs/decision-rule-0049.md` now pins `TUR := spec_limit / u`; the
  row-carried version `0049.1` is documented as ADR-0049-keyed (the external
  ILAC G8 revision stays on the ADR-0035 cadence), resolving the ambiguous
  anchor noted in audit.
- Deferred: none within ADR-0049 scope; decision-rule doc content changes go
  through an ADR round like any other spec change.
