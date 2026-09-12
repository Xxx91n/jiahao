# ADR-0060: Judge Conformity Sampling Power, Indeterminate Conformity State, and Conditional Instrument Certification

Status: Accepted
Date: 2026-09-12
Amends: ADR-0049 (D-B: an `indeterminate` conformity state precedes the guarded-acceptance statement); ADR-0047 (D-A: a third instrument state `conditional`, with a mandatory expiry and CAPA)

## Context

The ADR-0059 implementation round licensed a two-point wording edit to `src/SKILL.md`.
Because `src/instrument-identity.json` anchors `rules_digest` to `src/SKILL.md`
(`rules_alias`), that edit changed the instrument identity and forced the
ADR-0046/0047 identity-change path: re-pin, `--quarantine`, `npm run reverify`,
`npm run judge:bias`, then human sign-off.

The as-found revalidation returned `conclusion=fail` with
`delta_vs_previous = {invocations:0, overrides_accepted:0, fail_soft:0}` — the
metrics are byte-identical to the last passing ledger entry (seq 2, 2026-08-29).
The failure is therefore NOT a regression from the wording edit; it is the
ADR-0049 `ilac-g8-guarded-acceptance` rule (v0049.1, w=1, k=2, spec_limit=0.10)
being applied for the first time to pre-existing data:

- observed flip rate p = 3/22 = 0.13636; Clopper-Pearson 95% CI [0.029055851, 0.349122097]
- u = CI half-width = 0.1600; acceptance_limit = spec_limit - w*u = -0.0600
- p (0.1364) > spec_limit (0.10) -> `fail`

A Clopper-Pearson power scan (w=1, k=2, spec_limit=0.10) exposes the structural defect:

| true/observed flip rate p | n=22 | n=50 | n=100 | n=200 | n=400 |
| --- | --- | --- | --- | --- | --- |
| 0.03 | conditional | conditional | **pass** | pass | pass |
| 0.05 | conditional | conditional | **pass** | pass | pass |
| 0.08 | conditional | conditional | conditional | conditional | conditional |
| 0.10 | conditional | conditional | conditional | conditional | conditional |
| 0.136 (observed) | **fail** | fail | fail | fail | fail |

Two defects follow. (1) At n=22 the guard band w*u = 0.1600 consumes the entire
spec limit, so `acceptance_limit` is negative and the rule can never return
`pass` for ANY observation — the rule is structurally inoperable at the current
sample size. (2) The rule has no state for "evidence insufficient": a
small-sample result is classified `fail`, which metrology practice reserves for a
confirmed non-conformity — a disposition-strength mismatch of an order of
magnitude (FDA OOS "inconclusive"; ARRIVE low-power studies; ISO/IEC 17021-1
"suspend pending correction").

Industry practice decouples the **disposition** of a non-conformity from the
**certification decision** (ISO 9001:2015 §8.7 concession; ISO/IEC 17021-1
certification-decision types incl. suspension pending correction; IATF 16949
"concessions only on specific quantities or for a specific duration, therefore
cannot be open-ended"; 21 CFR 820.90; OCC 2026 materiality-tiered controls;
EU AI Act Art 43(4) substantial-modification trigger; EU GMP Annex 11 §11
periodic review; NIST AI RMF Measure metric-justification records). A
certification decision rests on evidence sufficiency plus acceptable residual
risk, not on a single point criterion passing. The one thing industry forbids is
loosening the criterion post hoc so that existing data passes (FDA/BioPharm
explicit anti-pattern).

## Decision

### D-A - The sampling plan is a pre-registered part of the decision rule

The decision rule gains `min_n` (minimum flip-eligible sample), pre-registered at
**100** with the power table above as its justification (p_target=0.05 at n=100
gives u=0.0482 and acceptance_limit=0.0518, i.e. an operable rule). `min_n` is
part of the rule identity: a run below `min_n` cannot produce a conformity
statement. The `spec_limit` (0.10) is UNCHANGED. The corpus expansion needed to
reach n>=100 is a separate, registered work item (see Consequences).

### D-B - `indeterminate` conformity state

`evaluateConformity` gains a fourth outcome, evaluated BEFORE the guarded
acceptance statement:

- `n < min_n` -> `indeterminate` ("evidence insufficient; no conformity statement").
- otherwise: `pass` (x <= spec_limit - w*u) / `conditional` (guard band) / `fail` (x > spec_limit).

`conclude` maps `indeterminate` to `conclusion = "indeterminate"` when no hard
failure reason (fail_soft, invocation mismatch, dead judge, regression) is present.
An `indeterminate` run is not a pass and not a confirmed non-conformity; it is a
**look-back obligation** (ADR-0049 D-E) plus a conditional-certification trigger.

### D-C - Conditional certification rides a second axis, not a third state

ADR-0046's release-gate contract is a TWO-state machine (`authoritative` /
`quarantined`). Rather than overload that axis, the assurance level rides a
separate `certification_mode` axis, reachable from `quarantined` by a new
`conditional_signoff` event that requires: reviewer_id, `certify` attestation,
reverify-ledger hash, bias-probe hash, an `expires_at` date, and a `capa_ref`.
The event sets `state = authoritative` and `certification_mode = conditional`;
`effectiveState` returns `quarantined` once the expiry passes (fail-closed: an
expired conditional certification is not a certification). A plain `signoff` or
`rollback` restores `certification_mode = full`. `instrument.js --check` accepts
a conditional certification (exit 0) while printing the expiry, the CAPA
reference, and the certification mode; it never accepts an expired one. This
keeps ADR-0046's two-state contract intact (the state machine is unchanged in
shape) while making the assurance level explicit.

### D-D - CAPA obligation; no post-hoc criterion loosening

A `conditional` certification carries a CAPA with a target: judge flip rate
<= 0.05 (the operable region per D-A). The spec limit MUST NOT be loosened to
make existing data pass. The conditional window is 90 days by default (CAMA 60 /
CMMC 180 precedents); renewals are new `conditional_signoff` events, never
open-ended extensions. Criterion revisions ride the criteria-change channel
(ADR-0027 same-commit, ADR-0047 `threshold` surface -> `criteria-change`).

### D-E - Sign-off guard by conformity

Plain `--signoff` (certify) requires the reverify ledger tail conformity to be
`pass`. `indeterminate` or `conditional` conformity requires
`--conditional-signoff`; a hard `fail` may be neither signed off nor
conditionally certified (it must be dispositioned first). This keeps "certify"
meaning what it says.

## Rejected alternatives

1. **Raise spec_limit to make the observed rate pass** — the FDA/BioPharm
   post-hoc anti-pattern; forbidden by D-D.
2. **Keep `fail` and certify anyway** — a false certification; violates the
   project self-certification ban and ADR-0049 D-E.
3. **Add only a "warning" flag without a state** — no expiry, no CAPA, no
   fail-closed transition; equivalent to the open-ended concession IATF 16949
   forbids.
4. **Expand the corpus first (n>=100) and re-run** — correct but insufficient:
   at p=0.136 no sample size passes (power table), so the rule repair is needed
   regardless; the corpus expansion is a separate work item.

## Consequences

- `min_n`/`indeterminate` change the decision rule identity; the reverify run key
  gains the rule version so a rule change appends a new ledger row instead of
  being swallowed by same-day idempotency.
- The instrument can leave `quarantined` only via `authoritative` (clean pass)
  or `conditional` (expiry + CAPA). `rollback` remains available.
- Registered work items (deferred): (a) expand `judge-twins.jsonl` to n>=100
  flip-eligible (corpus rebaseline, ADR-0047 `corpus` surface); (b) judge-quality
  CAPA to flip rate <= 0.05; (c) an eval surface that actually exercises the
  SKILL.md prompt (the judge-twins path is deterministic; whether it exercises
  the prompt is a declared gap).
- The ADR-0059 D-D wording edit itself is vindicated: it introduced zero
  measured regression (delta = 0 on every metric).

## Acceptance

- `npm test`, `npm run gate:all`, `npm run corpus:drift`, `npm pack --dry-run`
  < 200,000 bytes, `git diff --check`.
- `evaluateConformity` returns `indeterminate` for n < min_n (unit + wiring
  assertions).
- `instrument.js --check` exits 0 in `conditional` and exits 1 once expired
  (wiring assertions).
- The reverify ledger records the rule change as an appended row (run_key
  covers the rule version).
- `--signoff` refuses a non-`pass` conformity; `--conditional-signoff` refuses a
  hard `fail`.

## References

- ADR-0046 (identity gate + quarantine), ADR-0047 (impact-tiered change control),
  ADR-0049 (decision-rule anchor, guarded acceptance, look-back), ADR-0030
  (reverify schedule / dead-man).
- atomcode research run 2026-09-12 (21 searches / 10 full-text reads): FDA
  Investigating OOS Results 2022; ISO 9001:2015 §8.7; IATF 16949; 21 CFR 820.90;
  ISO/IEC 17021-1; CAMA 60-day; FedRAMP/CMMC POA-N; OCC 2026 materiality;
  SR 11-7; EU AI Act Art 43(4)/111(2); EU GMP Annex 11 §11 / Annex 15; NIST AI
  RMF Measure; TOST (MetricGate / BioPharm).
- `.scratch/grill-adr0059/decision-ledger.md` D-006;
  `.scratch/grill-adr0059/reports/2026-09-12-q7-disposition.md`.
