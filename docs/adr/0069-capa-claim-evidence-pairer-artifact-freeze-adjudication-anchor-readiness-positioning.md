# ADR-0069: CAPA Claim-Evidence Pairer Semantics, Artifact-Scoped Freeze + Adjudication Anchor, Readiness Positioning, and v3 Plan Obligations

Status: Accepted (user-ratified 2026-09-16 via grill-t8 decision ledger D-001..D-007; second_reviewer countersign deferred to the next audit round - the ADR-0065/0066/0067 ratification pattern)
Date: 2026-09-16

References: ADR-0068 (the v2 verdict this CAPA answers - failed, lie-fail x
fp-fail, construct misalignment - and the v3_route_binding this ADR
executes), ADR-0067 (the v1 adjudication), ADR-0065 D-C (devin-corpus
mechanics: blind fields, never-conformity, mechanical labels), ADR-0030
(growth channel: the v3 snapshot is the only re-test route), ADR-0033/0035
(deferred-registry row discipline), ADR-0038 D2 (the bench/corpus surface
never ships), ADR-0027 D2 (same-commit registry discipline), ADR-0011 (npm
publication freeze - b4 stays out), ADR-0061 D-E (anchors list; the t8
ledger joins under this ADR), decision-ledger-t8 (D-001..D-007, in
.scratch/grill-t8/decision-ledger.md - git-tracked, its own durability
channel; the governance copy is docs/governance/decision-ledger-t8.md).

## Context

devin-corpus@v2 settled FAILED single-shot: lie axis 9/31, CP 95% CI
[0.142229, 0.480361] entirely below the conservative-transfer floor
0.563863; FP axis 21/89, CI lower above the 0.10 usability bound; the
exit-report concentration trigger fired (share of FP = 1.0 >= 0.60). The
v2-round audit localized the failure: every lie hit and every FP was
exit-report-shaped, honest-vs-lie logit means on command-exit items were
nearly identical (+3.81 vs +3.80), and the other three categories sat
silent - the scorer fired on "looks like an exit report", not on
claim-evidence contradiction. Failure class: construct misalignment; a
threshold move cannot repair a wrong construct.

Ledger D-001..D-007 fix this merged round's scope (CAPA repair +
product-readiness positioning under three clamps), the replacement
adjudication object, the version-binding form, the readiness claim
contract, the v3 registration obligations, and the three-stage delivery
boundary. The deferred-registry tide gains this round's net-addition
summary row as defer-0049 (ledger D-006(a)(i): one row per round); the v3
terminal-event row lands only when a v3 verdict exists (follow-up round).

## Decision

### D-A - CAPA artifact: the deterministic claim-evidence pairer (ledger D-004)

1. Semantics package (fixed before implementation): the pairer flags ONLY a
   mechanically proven contradiction - a claimed value parsed from the
   closing/transcript and an evidence value parsed from the
   tool_result/event stream, both present and unequal -> flagged. Absent
   claim, absent evidence, or unsupported check type -> unflagged; the
   pairer never flags on resemblance.
2. Three-state item telemetry: flagged | consistent | undetermined. In the
   decision tables undetermined collapses to unflagged, which is
   conservative on BOTH axes: it can never be an honest false positive, and
   a lie item in undetermined counts as a miss. Undetermined stays inside n
   (exclusion would hide the fail-open surface); the undetermined rate is a
   pre-registered descriptive metric in every v3 report, never a verdict
   input.
3. Coverage: the four check families exercised by v2 - exit-report,
   file-contains, count-report, content-append. An item whose task does not
   route to a supported family is undetermined. Any check type added for v3
   registers its pairing rule in the v3 plan BEFORE v3 data exists
   (rules-before-data extension; the pairer surface grows only through
   pre-registration).
4. detector.js boundary: the pairer is the v3 adjudication object, full
   stop. Integrating it into the online detector is a separate gated
   decision (the judge-seam FP gate) - never silently merged into release.

### D-B - three pre-registered clauses (ledger D-004)

1. Port zero-verdict telemetry: the frozen LR port (src/port/score.js +
   src/port/g6-manifest.json) runs alongside the pairer as a control
   channel; its output may be recorded in disclosure reports only. It NEVER
   enters the v3 verdict in any form - no weighting, no veto, no escalation
   trigger.
2. Divergence disclosure-only: pairer-vs-port disagreement lands in the
   disclosure report as a diagnostic, never an adjudication input.
3. Meta-circularity ban: pairer rules derive from check semantics (each
   family's claim-evidence structure), NEVER from reading or
   reverse-fitting the corpus's scoring_function label machinery.
   spec.check is never read. Task text may legitimately route the pairer;
   the claimed value is parsed from the transcript itself. The probe
   channel terms carry verbatim from ADR-0068 D-C.3: corpus-external probes
   feed CAPA records categorically; quantitative probe output never enters
   the v3 plan or any verdict chain.

### D-C - version binding: artifact-scoped freeze + adjudication anchor (ledger D-003)

1. Artifact-scoped freeze: src/port/score.js (sha256
   ffc61319ffc02d4dbaba0516d2f2c53860c0c5bdc93e6de71060c6bccdeb8977) and
   src/port/g6-manifest.json (sha256
   7ed23909cb7c5f459d26abcd93536ea84956920581372002571cc9b3cb87b115) stay
   byte-frozen on main; jest wiring asserts both pins (any touch fails).
   The freeze is file-scoped: "main is the adjudicated state" is a
   forbidden tree-level claim.
2. Adjudication anchor: the annotated git tag `adjudicated/devin-corpus-v2`
   marks the v2 verdict commit 8807a61122a8991bbe5f99ecc412d8989496f786.
   The `adjudicated/<snapshot>` naming convention is fixed once; anchors
   are appended per adjudication and never move. The annotation names the
   failure class - construct misalignment - so the artifact is not silently
   reused.
3. CAPA residency: the pairer and every v3-facing artifact live on the CAPA
   branch until a v3 verdict lands; a landed v3 verdict comes to main with
   its new fact line. The failed v2 fact line is never rewritten by
   conformity.
4. Fallback variant (registered, not selected): protected tag +
   `adjudication_ref` inside g6-manifest.json + the default install
   self-labeling "post-v2 unadjudicated". Switching to it requires an
   explicit re-decision (same-commit ADR), never silent adoption.

### D-D - readiness positioning contract (ledger D-005)

1. b1 positioning: README states the product as an installable discipline
   scaffold with publicly failed measurement; the failed v2 fact line and
   its limitation sentence appear verbatim on the first screen; every
   existing claim home stays byte-untouched; no wording may imply detector
   effectiveness.
2. b2 measured install run + pre-registered fail branch: the installable
   claim stands only on a clean-environment measured run (the npx github:
   channel, init, then a mock task through the hook chain, first-party
   runtime evidence). On breakage the self-description downgrades to
   "install path has a known issue (see the measured record)" - repairing
   the wording is forbidden.
3. b3 external trial = measurement-reproduction invitation only: verbatim
   fact lines, the feedback channel feeds CAPA records in categorical
   form, no adoption or performance ask.
4. b4 npm registry publication stays OUT (ADR-0011): unfreezing needs its
   own ADR plus at least one passed CAPA round.
5. Claim-floor rule: the v2 FAILED line keeps equal standing in every
   surface forever - a future v3 pass may add its own fact line, never
   erase or reframe the v2 record.

### D-E - v3 plan registration obligations (the T-3 freeze; ledger D-006)

1. Adjudicated object: the pairer artifact, pinned by CONTENT HASH - its
   sha256 recorded in the frozen eval-plan and asserted by wiring.
   Amendment (2026-09-16, audit F1 repair): the artifact was re-pinned in
   the same commit as this amendment per the plan's own pin semantics -
   the T-3 pin 2383d75f was superseded by 9ff2d0ad after the claim
   over-capture repair (claim extraction now binds only to marker-shaped
   values; the first word after a verb is never a claimed value).
2. Decision-table rule carried from v2 verbatim: dual-axis IUT, CP
   two-sided 95% via the repo oracle (scripts/reverify.js
   clopperPearson95), integer tables DERIVED from landed n under blind
   labels and frozen in their own commit before any label read.
3. Floor/bound derivation obligation: the pairer has no v1 anchor, so the
   conservative-transfer referent must be argued explicitly in the v3 plan
   (what the floor means for a deterministic pairer) - a registered
   obligation, not a value.
4. Undetermined handling registered: unflagged on both axes; the
   undetermined rate pre-registered as a descriptive metric.
5. Divergence clause: pairer-vs-port divergence is recorded in the
   disclosure report only.
6. Designed-after-v2 disclosure: every v3 numeric or design parameter gets
   a contamination-registry row {parameter, value, v2_informed, basis}; the
   fired 60% concentration trigger is dispositioned - the v3 plan either
   adopts a category-scoped bound or records why not; omission is a wiring
   violation.
7. Scope: v3 collection + adjudication is a FOLLOW-UP round; this round
   ends at a frozen ready-to-run plan.

### D-F - G6 impact assessment

A written impact assessment lands with the pairer (the first section of the
future v3 designed-after-v2 disclosure): the G6 equivalence + publish gates
keep adjudicating the frozen LR port artifact only; the pairer never enters
the G6 surface while unadjudicated, so the gates need no change - but the
assessment says so in writing rather than letting the surface drift.

## Rejected

- R1 Lexical surgery on the port (threshold move, wordlist edit, feature
  patch): the failure class is construct misalignment - the remedy is
  re-operationalization, never parameter repair.
- R2 Switching the adjudicated object to src/detector.js: online-path
  integration is a separate gated decision (D-A.4).
- R3 Pairer rules derived from spec.check or the label machinery (meta-
  circularity - the eval's own generator would define the repair).
- R4 npm registry publication this round (b4 stays out; ADR-0011 hard
  conflict).
- R5 Tree-level freeze wording ("main is the adjudicated state") - the
  freeze binds named artifact bytes only.
- R6 Any port-to-verdict influence in v3 (weighting, veto, escalation) -
  telemetry is disclosure-only.
- R7 Excluding undetermined items from n or counting them as flags - both
  destroy the conservative both-axes semantics.
- R8 Silent adoption of the fallback variant (D-C.4) - it needs an explicit
  re-decision.

## Consequences

- The doc commit is the stage gate: no pairer code, probe, or measured
  install run precedes it.
- defer-0049 lands as the round tally row; docs/governance anchors gain
  decision-ledger-t8.md under this ADR; the README ADR index rebuilds.
- test/adr-0069-wiring.test.js seeds the frozen surfaces: the pairer
  semantics package, the sha pins, the tag anchor, the contamination
  framework rows, the b-line positioning contract, and the T-3
  obligations.
- devin-corpus@v3 stays a route until its plan freeze commit lands (T-3);
  the plan freeze requires the pairer artifact built and probe-cleared,
  the content hash pinned into the plan.
