# Task book — grill-t11 next round (usable-by-any-child-agent)

Authority: .scratch/grill-t11/decision-ledger.md (D-001..D-005, all current).
Spec: .scratch/grill-t11/spec-readiness-and-dispositions.md. Prior audit state: grill-t10 PASS-WITH-OBSERVATIONS, all F-B closed.

Ordering contract (D-005): pre-registered docs -> measurement -> declaration. Never parallel, never reordered.

## T-1 — R1 doc round (covers D-002, D-003, D-004, D-005)

Write ADR-0072 + the doc artifacts, then commit before any action:
- ADR-0072: readiness verdict (usable+testable), pre-registered re-measurement plan (b2 method: clean-env npx github: install + hook-chain assertions + mock Stop carrying transcript_path exercising lane stdin->adapter->pairItem->shadow-record; downgrade trigger pre-registered; wording repair on failure forbidden), bake protocol (owner claude-code dogfood; tier-2 independent second-line FP review as an ADR-0070 amendment; pre-set flagged adjudication criteria; evidence-tier claim language), and the four critique dispositions (D-004).
- CONTEXT.md: the new terms are already landed in the closeout (Re-Execution Prior / Bounded Delegation / Reachability Provenance); sync only if ADR-0072 mints more.
- ERRATA.md E-6: delegated/proxy second_reviewer disclosure (wording: "delegated second-line review, ID-level + delegation-level independence"); seq 13 never rewritten. ERRATA.md is anchored -> rebuild governance anchors.
- ADR-0047 appended note + ADR-0067 appended appendix (INDETERMINATE de facto claim treatment; "performance characteristics not established" stays reserved).
- Delegation forward rule + pre-staged bounded-renewal template (scope+expiry mandatory from next authorization-bearing event).
- Capability-label semantics fix: _doc clarification (present = documented to deliver) + README wording + add measured-present enum word slot (unused until first real event); no enum rename.
- Sync surfaces: README ADR index rebuild, deferred-registry net-addition row (defer-0052 class), instrument-state event, anchors + governance inventory, wiring-test seeds for ADR-0072.

## T-2 — R2 action round (covers D-002, D-003, D-005)

- Execute the pre-registered re-measurement in a clean env (empty HOME/work dirs); write the result into the evidence chain and a .scratch/grill-t11/readiness/ record (b2 sibling).
- Pass -> README declaration wording lands (layered, evidence-source-tagged). Fail -> the pre-registered downgrade clause fires; wording repair forbidden.
- claude-code hook registration on the owner machine REQUIRES a separate owner confirmation first (it modifies user host config). Then real use accumulates lane records = bake start.
- First real lane-bearing Stop event upgrades claude-code to measured-present.

## Registered non-blocking agenda (D-003)

- Transcript-reachability research on codex/copilot/qoder (currently unverifiable).

## Out of scope (D-001, with reasons)

- deferred-registry cadence review (nothing due); b4 npm (ADR-0011); promotion flip (bake window, 0 events).

## Hard rules

- Do not modify frozen artifacts: v3 report.json/manifest, instrument-state history (seq 13 included), ADR-0067/0070 existing text (appendices/amendments only via registered discipline).
- Claim wording never precedes its evidence; labels never impersonate measurement; synthetic bake traffic forbidden.
- but (GitButler) for all VCS writes; never push unless asked.

## Suggested skills

$to-spec $to-tickets for R1 decomposition; $implement + tdd for any code touch; $code-review + the post-round audit pattern at round end; $but for VCS; $handoff at close; $domain-modeling for CONTEXT/ADR wording; $neat-freak for consistency sweep; atomcode-research for any external-practice question (serial, one in flight).
