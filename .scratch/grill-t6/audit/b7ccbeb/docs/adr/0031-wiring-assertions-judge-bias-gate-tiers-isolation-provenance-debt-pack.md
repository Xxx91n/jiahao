# ADR-0031: Wiring Assertions + Judge Bias Calibration + Gate Tier Taxonomy + Judge Isolation + Evidence Provenance + Debt Pack

- Status: Accepted
- Date: 2026-08-29

## Context

The ADR-0030 audit round exposed a structural failure class: D4's
"implementation" never actually took effect (a state-object comparison
bug), and none of the 332 existing tests could catch it. The missing
layer is not more unit tests of pure functions but a falsifiable
binding between "what the ADR claims" and "what the runtime wiring
actually reads" — the ADR-text <-> implementation seam.

In the same grill round, four adjacent decisions were settled after
serial atomcode research (5 passes, 60+ verified sources): judge bias
calibration (TMLR 2026 style-bias evidence), gate pre-registration
tiering (Hardwicke & Wagenmakers; K8s/Kyverno; MISRA; SLSA levels),
component-level independence of the judge (SR 11-7/SR 26-2; Letta;
CoVe factored verification), and evidence provenance (in-toto/SLSA
link metadata). The round also carried five leftover audit findings
(F4/F5/S2/S3/S4) needing an explicit home.

## Decision

### D1 Wiring Assertion Discipline (mandatory for future ADRs)

Every ADR decision that touches a gate's decision path or a state-read
wiring MUST ship at least one executable wiring assertion: a test that
asserts the state/config object the gate actually reads matches what
the ADR claims (shape, key semantics, tier defaults). Convention:
`test/adr-<NNNN>-wiring.test.js` (ADR-0030's wiring test is the
reference instance). The audit round reviews each wiring assertion for
killing power: which decoupling class it would actually catch. An ADR
whose D-section silently changes wiring without a corresponding
assertion fails review. Cost: one small test file per wiring-touching
ADR.

### D2 Judge bias calibration corpus — three layers

judge-twins.jsonl schema v1.1 adds three kinds (all hand-authored,
pre-registration window: the judge is not landed yet, so corpus growth
now is not self-contamination):

- `style-control` (4-6 pairs): same claim+events semantics, markdown
  vs plain-text surfaces; assertion: verdict identical AND confidence
  drift <= +/-0.10 band.
- `length-control` (4-6 pairs): expansion variants (restating without
  new information) PLUS truncation controls (complete vs truncated to
  equal length). Only an expansion flip without a truncation flip
  counts as verbosity bias; truncation flips indicate lost quality
  discrimination = judge failure.
- `bias-probe` (4-6 pairs, LLMBar-style): surface appeal contradicts
  correctness (e.g. beautifully formatted but evidence-missing must
  uphold, not be rescued); gold verdicts pre-registered.

Metrics layer (check-judge-bias.js, zero-dependency, tier-registered
per D3): `style_flip_rate` starts observational (first-cycle
calibration, promote_if pre-registered); `length_discrimination` is
fail-closed from day one (lost discrimination = dead judge);
`swap_order_consistency` is observational-only forever (position bias
measured <=0.04 in 2026 evidence and swapping empirically RAISES
verbosity bias).

Process layer: human spot-review (N≈10-20 judge verdicts through the
ADR-0017 adjudication channel, kappa into the ADR-0018 flywheel) rides
the existing 6-month corpus re-verification cadence; no new process.

### D3 Gate Tier Taxonomy (A-lite hybrid)

Three machine-readable tiers, named after the K8s admission modes:

- `confirmatory` — fail-closed immediately; thresholds/bands
  pre-registered. Default for integrity-critical gates (silent failure
  would contaminate verdicts or the evidence chain). Current members:
  bench gate (ADR-0027), probe gate (ADR-0029), coverage floor
  (ADR-0030), length_discrimination (D2).
- `observational` — record but do not block; MUST pre-register
  `review_at` and `promote_if`. Overdue review = STALE violation.
  Default for new measurements without calibration basis
  (style_flip_rate, swap_order_consistency).
- `deferred-with-unfreeze` — implementation withheld for missing
  preconditions; MUST carry `unfreeze_if` in the ADR (ADR-0029 D7
  supply-chain signing is the precedent).

Four one-page criteria: (1) silent failure contaminates verdicts or
evidence chain => confirmatory; (2) new measurement without calibrated
thresholds => observational with review_at + promote_if; (3) missing
preconditions => deferred-with-unfreeze; (4) all tier migrations go
through the existing ADR-amendment path; demotion
(confirmatory->observational) requires written Goodhart-contamination
evidence. Machine layer: thresholds.json gains a mandatory `tier`
field per gate (missing = check script refuses) plus optional
`review_at`/`promote_if`/`unfreeze_if`; check-bench-thresholds.js
flags overdue observational gates as STALE. Zero new dependencies; the
upgrade/downgrade channel IS the existing ADR revision path.

### D4 Judge certificate isolation (component-level SoD)

Letta's auditor/judge separation maps at the component level: the
people are one, so the isolation is in the INPUTS. The judge seam's
input is a certificate triple `{claim, toolResults (schema-ized
evidence), heuristicVerdict}`. Explicitly forbidden in judge input:
auditor intermediate verdicts, probe/pressure history (ADR-0029 probe
transcripts), prior judge outputs, heuristic reasoning chains. A
fail-closed wiring test asserts the judge-input builder emits exactly
the whitelist schema, and rejects a variant with auditor fields
injected. Two risk surfaces honestly split: conversational-pressure
contamination does not apply (the judge does not converse — D1
scoring-mode); feature-leakage contamination does, and is now test-
enforced. Future judge landing constraints (recorded for the ADR-0025
D1 amendment when the judge actually lands): (a) different model
family than the generator under audit; (b) temperature-0 deterministic
scoring; (c) honest-twin corpus with 6-month re-verification plus
human spot-review (D2 process layer).

### D5 Evidence provenance — optional additive (SLSA link semantics)

Evidence records gain an OPTIONAL `provenance` field, additive in the
exact sense of ADR-0023 D5 / SLSA extension-field rules: absent on old
records, semantically identical to an unrecognized field; consumers
ignore what they do not know. Shape:

- `builder`: { profile, rules_version, thresholds_fp (thresholds.json
  sha256), hook } — who produced the record under which discipline
  version.
- `recipe`: { gate_id, gate_type, ladder_rung?, degradation_kind? } —
  what produced it.
- `materials`: { claim_sha256, tool_results_digest, session_anchors?,
  prev_hash } — from what inputs.

Verification adds a present-but-invalid check only (provenance present
but inconsistent with the registry => record-level failure); absent is
never an error — the existing chain stays byte-identical. Trust
boundary written down: provenance does NOT prevent forgery (a
compromised writer forges its own provenance; forgery resistance is
the hash chain's job plus second-party verification); its value is
process transparency for ADR-0017 human adjudication replay (NIST
SP 800-92 / mattermost audit-log consensus: capture actor, action,
inputs).

### D6 Debt pack — audit leftovers with explicit risk grades

This ADR carries five leftover findings instead of letting them go
invisible. Discipline: audit rounds carry 2-4 medium/high-interest
items per round; no dedicated debt sprints (community consensus +
Fowler quadrant: prudent-inadvertent debt is expected, its interest is
paid incrementally).

| Item | Grade | Interest if unpaid |
---|---|---|
| F4 reverify conclusion reads fail_soft only (a wiped-out judge still "passes") | high | dead-man switch false-reports healthy |
| F5 same-day rerun overwrites artifact + ledger has no idempotency/ledger_seq | medium | re-verification replay ambiguity |
| S2 six-month constant triplicated (ROT_MS/MONTH_MS/deadline.json) | low | config drift risk |
| S3 GENESIS naming / S4 pre-commit misses reverify-schedule.js | low | hygiene |

F4/F5 are repaired in the ADR-0031 implementation round; S2/S3/S4 are
registered and may ride any subsequent audit round.

## Consequences

- The D4 failure class (ADR text diverging from live wiring, silently)
  is now guarded by convention (D1) on every future ADR.
- Judge bias becomes measurable before the judge exists; the corpus
  grows inside the pre-registration window, not after.
- Gate strictness stops being per-ADR folklore; tier mistakes (e.g.
  default observational on an integrity gate) become machine-detectable.
- Human adjudication (ADR-0017) gains replayable actor/action/input
  context without touching the hash chain's byte stability.
- F4/F5 exit the "known but homeless" state.

## Rejections

- R1 Pact/ArchUnit/deep contract frameworks: dependency cost against a
  zero-dependency constraint; the wiring-assertion + golden-diff
  combination covers the same falsifiability locally.
- R2 CoT-based judge debiasing: requires decoding, violates ADR-0025
  D1 (scoring-mode probability outputs). Reserved under CalibraEval
  distribution alignment for the judge-crossing PR.
- R3 Position-swap gating: 2026 evidence puts position bias <= 0.04
  (low ROI), and swapping empirically raises verbosity bias. Metric
  kept observational-only.
- R4 "Default everything observational": inverts default-deny for
  integrity gates (OPA semantics) — exactly the D4 failure family.
- R5 Signatures / Rekor / transparency logs / SLSA L2-L3 machinery:
  builder and writer share one trust domain in this package, so they
  add dependencies without security gain. Unfreezes only if evidence
  leaves this trust domain (multi-host consumers).
- R6 Dedicated debt-repayment sprints: oversized for a 4.4k-line,
  30-ADR repository; per-round small-batch repayment with explicit
  grades is the industry consensus at this scale.
- R7 Conversational-pressure defenses on the judge seam: the scoring-
  mode judge has no conversational surface; building one would be
  defense against a non-existent threat (ponytail).

## Errata (audit round 2026-08-29)

- The D2/D3 prose names the third bias metric `swap_order_consistency`;
  the machine layer (thresholds.json gate key, `computeBias`) implements it
  as `swap_order_inconsistency`. Same metric; the code name is the normative
  one for scripts, the prose name retained above for historical fidelity.
