# Spec — grill-t11: readiness verdict + critique dispositions

Sole source: .scratch/grill-t11/decision-ledger.md (D-001..D-005, all current).

## 1. Round scope (D-001)

Two agenda surfaces:
- Readiness adjudication for "formal use + actual testing" of the shipped product, with gap dispositions.
- Disposition of the open 锐评-v4 prescriptions: #1 proxy-signature appendix, #2 delegation expiry, #4 INDETERMINATE claim treatment, #5 failure-family prior.

Explicitly out of scope (with reasons):
- deferred-registry 45-entry cadence review — nothing due (defer-0051 review_at 2026-12-15).
- b4 npm publication — ADR-0011 stands; not revisited.
- shadow->enforce promotion flip — physically locked by the bake window (0 real lane events).
- 锐评 #3 (v2 contamination registry) — verified already landed (plan.json contamination_registry); record-only, no decision.

## 2. Readiness verdict + re-measurement (D-002)

- Verdict: the product IS formally usable and testable — but the declaration wording lands only AFTER the re-measurement record of the CURRENT artifact exists (measure-then-declare ordering).
- Re-measurement = pre-registered run, b2 method: clean-env npx --yes github:Xxx91n/jiahao install + hook-chain assertions + a mock Stop carrying transcript_path that exercises the lane end-to-end (stdin -> transcript adapter -> pairItem -> shadow record in the evidence chain). The plan document is registered before execution and carries the downgrade trigger.
- On failure: the pre-registered downgrade clause fires; wording repair is forbidden.
- Claim wording is layered: every sentence tagged by evidence source (installed-artifact measured / sandbox-verified / documented).
- Capability labels must not impersonate measurement (see section 5).
- The frozen promotion gate is untouched: "usable for real testing" declares the bake window may start collecting, not that the gate passed.
- Rejected: declaring without re-measuring (Squad-class failure: source tests green != artifact works); no post-hoc exemptions to pre-registered measurement discipline; clean env mandatory.

## 3. Bake protocol (D-003)

- Body: owner dogfooding on claude-code — register jiahao hooks + init, accumulate events through real use. The first real lane record upgrades claude-code reachability from documented to measured.
- Tier-2 prerequisite for enforce flip (ADR-0070 amendment, via amendment discipline — never a silent edit of the frozen gate): every flagged item is re-reviewed by an independent second line; FP adjudication authority is not the owner alone. External third-party telemetry returns are a bonus source, never a hard dependency.
- Flagged-item review uses pre-set adjudication criteria (anti post-hoc rationalization).
- Claim language is evidence-tiered ("measured on one operator, one host").
- Single-operator dogfood traffic supports plumbing-health claims only; it cannot support diverse-population FP claims.
- Registered non-blocking agenda: transcript-reachability research on codex/copilot/qoder (unverifiable hosts).
- Forbidden: synthetic traffic injection; external return as hard dependency.

## 4. Critique dispositions (D-004)

- P-1 (proxy signature): ERRATA E-6 + appended note on ADR-0047 — since seq 13, second_reviewer=Xxx91n is a proxy signature under standing authorization; independence is ID-level + delegation-level. seq 13 is never rewritten.
- P-2 (delegation expiry): forward-looking rule — from the next authorization-bearing event, delegated authority must carry scope + expiry; the existing grant is not rewritten but carries a registered boundary note; a bounded-renewal template is pre-staged so the next signoff/criteria_change forces renew-or-expire.
- P-4 (INDETERMINATE claim treatment): ADR-0067 appended appendix registering the de facto treatment (indeterminate fact line enjoys equal mechanical binding); the "performance characteristics not established" label stays reserved-not-displayed — hanging it is a new claim action requiring its own pre-registration.
- P-5 (failure prior): CONTEXT gains a presumptive-prior term in ISA-240 form: as of a dated snapshot, every self-report correction was caught by re-execution/independent audit, zero by self-disclosure; audit/gate strategy takes this prior as default design input; overturning requires a documented argument. Frequency-extrapolation wording forbidden; detection bias disclosed.

## 5. Delivery boundary (D-005)

- R1 doc round -> R2 action round. Ordering is discipline-forced: pre-registered docs -> measurement -> declaration; never parallel or reordered.
- R1: ADR-0072 (verdict + re-measure plan + bake protocol + ADR-0070 gate amendment + four dispositions), CONTEXT terms, ERRATA E-6, ADR-0047/0067 appended notes, delegation forward rule + renewal template, capability-label semantics fix, wiring-test seeds, anchors/inventory sync.
- R2: execute the pre-registered re-measurement in a clean env (result lands in the evidence chain); pass -> declaration wording lands in README, fail -> downgrade fires; claude-code hook registration requires separate owner confirmation (touches user host config); first real lane record = bake start.
- Capability-label fix takes the lightest honest form: _doc semantic clarification (present = documented to deliver, not live-measured) + README wording to "documented to deliver" + enum addition measured-present (word slot reserved until the first real claude-code Stop event); no enum rename/surgery.
