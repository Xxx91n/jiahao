# ADR-0072: Readiness Verdict (Usable + Testable), Pre-Registered Re-Measurement (b2 Method + Lane Exercise), Owner-Dogfood Bake Protocol, ADR-0070 Tier-2 Amendment, and Critique Dispositions P-1/P-2/P-4/P-5

Status: Accepted (user-ratified 2026-09-16 via grill-t11 decision ledger D-001..D-005; second_reviewer countersign deferred to the next audit round - the ADR-0065/0066/0067/0069/0070 ratification pattern)
Date: 2026-09-16

References: ADR-0069 D-D (the b-line readiness contract this round executes), ADR-0070 (the conviction lane; its frozen promotion gate is amended at D-D and its claim sentence 1 at D-F below), ADR-0067 (appended appendix, P-4), ADR-0047 (appended note, P-1), ADR-0040 (capability three-state vocabulary), ADR-0061 D-E (governance anchors; the t11 ledger joins under this ADR), ADR-0062/0066/0071 (frozen-artifact amendment discipline precedent), ADR-0033/0035 (deferred-registry row discipline), decision-ledger-t11 (.scratch/grill-t11/decision-ledger.md - git-tracked; the governance copy is docs/governance/decision-ledger-t11.md).

## Context

grill-t10 shipped the CAPA pairer on the hook-side conviction lane in shadow mode with a frozen shadow->enforce promotion gate, and the post-round audit closed PASS-WITH-OBSERVATIONS with every blocking finding repaired. The owner's question for this round: can the product be formally taken out for use and actually tested, and is there a built artifact?

Ledger D-001 bounds the round to two agenda surfaces: (1) the readiness adjudication plus its gap dispositions, and (2) the four open critique-v4 prescriptions - P-1 proxy-signature appendix, P-2 delegation expiry, P-4 INDETERMINATE claim treatment, P-5 failure-family prior. 锐评 #3 (v2 contamination registry) is verified already landed - record-only, not re-decided. Out of bounds this round: the deferred 45-entry cadence review, the b4 npm discussion (ADR-0011 stands), the promotion flip (the bake window physically gates it at 0 real events).

Ordering contract (D-005, discipline-forced): pre-registered docs -> measurement -> declaration. Never parallel, never reordered. R1 is this document round; R2 is the action round that executes D-B and lands D-G wording only on pass.

## Decision

### D-A - Readiness verdict: formally usable and testable (ledger D-002)

The verdict is YES, in the layered sense only: the discipline scaffold installs through the declared Tier-1 channel, the verifier gate runs with blocking semantics, and the conviction lane runs end-to-end in shadow mode. The verdict does NOT assert detector effectiveness on real traffic (the frozen promotion gate holds 0 real events; the bake window has not started) and does NOT imply the shadow->enforce gate passed.

The declaration wording is sequenced AFTER the current-artifact re-measurement record exists (measure-then-declare): the same round measures first, then announces. Rejected inside the decision: declaring without re-measuring the current artifact (the Squad-class failure - source tests green does not mean the installed artifact works); post-hoc exemptions to the pre-registered measurement discipline are forbidden; the clean environment is mandatory and is not narrowed to the dev host.

### D-B - Pre-registered re-measurement plan (b2 same-method + lane exercise)

Method is the b2 pattern (.scratch/grill-t8/readiness/b2-install-measurement.md), executed against the artifact the declared channel currently serves:

1. Clean environment: an empty HOME and an empty work dir - no repo checkout, no prior .jiahao-* state.
2. Install: `npx --yes github:Xxx91n/jiahao init --profile verifier -y` exits 0 and writes `verifier` to the clean HOME's .jiahao-profile (the probed persistence marker lands alongside).
3. Gate chain: `.jiahao-active` set in the clean config dir; a mock Stop stdin payload `{"session_id": ..., "stop_hook_active": false}` without transcript_path -> the installed `hooks/jiahao-verdict-gate.js` blocks (exit 2) on no-evidence; one evidence record appended through the installed `src/evidence-log.js`; re-fire -> allow (exit 0).
4. Lane chain (the t10 surface under measurement): a mock transcript JSONL carrying a known claim/evidence contradiction (exit-report family: the closing claims one exit code, the tool_result stream shows another); a mock Stop payload carrying `transcript_path` -> exactly one `source: pairer-instrument` record lands on the chain with `detector.shadow === true` and `detector.pairer.state === 'flagged'`; the shadow record must NOT satisfy the no-evidence check (the gate keeps blocking - shadow telemetry never enters the severity matrix).

Pass requires every step green. Pre-registered downgrade trigger: any step failing on the current artifact downgrades the self-description to "install path has a known issue (see the measured record)" - the same fail branch registered in ADR-0069 D-D b2 - and the D-G declaration block does not land. Repairing the wording after observing a failure is forbidden.

The record lands at `.scratch/grill-t11/readiness/` (a b2 sibling record: commands + observed outputs + verdict) and on the instrument-state chain as a record_only_change event.

### D-C - Bake protocol (ledger D-003)

- Bake subject: owner dogfooding on claude-code. Registering the jiahao hooks + init on the owner host is what opens the bake window; real usage then accumulates lane records.
- Host-config boundary: claude-code hook registration on the owner machine modifies user host configuration and REQUIRES a separate owner confirmation before any action; nothing in this ADR or the readiness verdict implies it.
- measured-present upgrade: the first real lane-bearing Stop event on claude-code flips that host's `transcript_file` reachability from `present` to `measured-present` (the D-F word slot). Until then `present` reads documented-to-deliver only.
- Evidence discipline: claim wording is evidence-tiered ("measured on one operator, one host"); single-operator dogfood traffic supports plumbing-health claims only and never a diverse-population FP claim; external third-party telemetry returns are a bonus source, never a hard dependency; synthetic bake traffic is forbidden.
- Registered non-blocking agenda: transcript-reachability research on codex/copilot/qoder (their stop-payload shape is `unverifiable` today).

### D-D - ADR-0070 amendment: tier-2 independent second-line review precedes the enforce flip (ledger D-003)

ADR-0070 D-B criterion G2 is amended by this ADR under the registered amendment discipline (the ADR-0062/0066/0071 precedent; the frozen gate's other three criteria are untouched):

- before: "every flagged item owner-reviewed: FP = 0 (a review disagreement counts as an FP - the conservative direction)"
- after: "every flagged item re-reviewed by an independent second line before the flip is evaluated: FP = 0 (FP adjudication authority is not the owner alone; a review disagreement counts as an FP - the conservative direction)"

Pre-set adjudication criteria for flagged-item review (registered now, against post-hoc rationalization): a flagged item is a FALSE POSITIVE iff an independent re-parse of the same transcript yields claim value == evidence value, or the flagged claim text does not actually assert the flagged family's quantity (family mis-assignment); it is a TRUE POSITIVE iff the re-parse keeps both values present and unequal and the family assignment holds. Any disagreement between the owner review and the second-line review resolves toward FP (the conservative direction, unchanged).

This amendment is part of why "usable for real testing" cannot read as gate-passed: the gate's human-judgement leg is now deliberately two-party.

### D-E - Critique-v4 dispositions (ledger D-004; all four land, none deferred)

- P-1 proxy signature (锐评 #1): docs/governance/ERRATA.md gains E-6 and ADR-0047 gains an appended note, disclosing that `second_reviewer=Xxx91n` on the instrument chain is a proxy signature executed by the main agent under the owner's standing authorization - the registered wording is "delegated second-line review, ID-level + delegation-level independence". The disclosure covers every event carrying that second_reviewer value (seq 6, 8, 10, 12, 13); the critique anchored on seq 13. Frozen history is never rewritten; ERRATA is the sole append-only correction channel.
- P-2 delegation expiry (锐评 #2): forward rule - from the next authorization-bearing event after this ADR's registration commit, every exercise of delegated signing authority must carry explicit scope + expiry. The existing open-ended grant is not rewritten; E-6 carries its registered boundary note. The pre-staged bounded-renewal template lives at docs/governance/delegation-renewal-template.md; the next signoff-class event (signoff / conditional_signoff / criteria_change / record_signoff) must attach a completed renewal - renew with scope+expiry, or record expiry. The renew-or-expire act is forced by rule, not negotiated under pressure.
- P-4 INDETERMINATE claim treatment (锐评 #4): ADR-0067 gains an appended appendix registering the de facto treatment - the indeterminate verdict's fact line already enjoys equal mechanical binding (the per-mention binding rule and its exemption registry apply identically); the reserved downgrade label "performance characteristics not established" stays reserved-not-displayed, because hanging it is a new claim action requiring its own pre-registration. Not this round.
- P-5 failure-family prior (锐评 #5): the CONTEXT.md term "Re-Execution Prior (重执行先验)" already landed in this round's closeout commit (ISA-240.31 form: dated snapshot, n computed from the authoritative artifact, detection bias disclosed, no frequency extrapolation). Record-only - verified present.

### D-F - Capability-label semantics fix (ledger D-002(5) + D-005(3)) - the lightest honest form

1. _doc clarification: test/fixtures/host-contracts.json `_doc` now states verbatim that `present` means "documented to deliver" - a documentation claim, never a live measurement - and defines the new slot.
2. Enum addition, no surgery: the `transcript_file` value set gains the `measured-present` word slot (scripts/check-host-contracts.js TRANSCRIPT_FILE + the _doc definition). The slot is reserved: no contract carries it until the first real claude-code lane-bearing Stop event lands (D-C).
3. Claim wording: the ADR-0070 D-E registered sentence 1's parenthetical "currently `present` only for claude-code" is superseded in the claim homes by "currently `present` (documented to deliver, not live-measured) only for claude-code" - the amended sentence lands in README.md, bench/research/out/claim-template.md, and bench/research/out/devin-oot-v3-report.md in this commit; ADR-0070 keeps its registered body and carries the appended amendment note; the wiring constants update in the same commit.

### D-G - Pre-registered declaration wording (dormant until the D-B record exists)

On D-B pass, README gains this block verbatim (layered; every line tagged by evidence source):

    ## Readiness status (ADR-0072)

    - [installed-artifact measured] The Tier-1 channel installs in a clean environment and writes the profile flag (record: `.scratch/grill-t11/readiness/`).
    - [installed-artifact measured] The verifier Stop gate blocks on missing evidence and allows on evidence, end-to-end on the installed artifact.
    - [installed-artifact measured] The conviction lane runs stdin `transcript_path` -> adapter -> pairItem -> shadow record on the installed artifact.
    - [documented] The lane runs in shadow mode only - flagged items are telemetry, never blocks. The shadow->enforce promotion gate is frozen at 0 real events; "usable for real testing" declares the bake window may start collecting, not a gate pass.
    - [documented] Per-host transcript reachability is documented (claude-code: `present` = documented to deliver); bake traffic begins with owner dogfooding after a separate host-config confirmation.

On D-B failure the D-B downgrade clause fires instead and this block never lands. The block is registered here and only here until the record exists.

### D-H - Delivery boundary and round surface (ledger D-005)

R1 (this document round) lands: this ADR; ERRATA E-6; the ADR-0047 appended note; the ADR-0067 appended appendix; the ADR-0070 amendment note; the delegation forward rule plus the pre-staged bounded-renewal template; the capability-label fix (D-F); the registry/inventory/anchors/ADR-index sync; and the wiring-test seeds. R2 (the action round) executes D-B, lands D-G on pass or fires the downgrade on failure, records the result on the evidence chain plus the readiness sibling record, then stops at the D-C host-confirmation gate. The round's net-addition summary row is defer-0052; the t11 ledger joins anchors.json under this ADR.

## Rejected

- Declare readiness without re-measuring the current artifact (the Squad-class failure: source tests green != installed artifact works).
- Post-hoc wording repair on a failed re-measurement (the downgrade is pre-registered, not negotiable after the fact).
- Enum rename/surgery on the reachability labels (a reserved word slot is the lightest honest form; renaming `present` would falsify what the registry already recorded).
- Synthetic bake traffic; external telemetry as a hard dependency; owner-only FP adjudication at the flip (D-D).
- Rewriting seq 13 or any frozen history; P-1 as an ADR-only note (ERRATA is the sole append-only correction channel).
- Hanging the reserved "performance characteristics not established" label this round (a new claim action - needs its own pre-registration).
- Hook registration on the owner host without a separate owner confirmation (D-C).
- The deferred cadence review, the b4 npm discussion, and the promotion flip this round (ledger D-001 boundary).

## Consequences

- The D-G declaration block is registered-but-dormant until the D-B record exists - measure-then-declare is now machine-shaped, not just a promise.
- ADR-0070 G2 requires an independent second line before any enforce flip is evaluated; the bake window feeds the gate, never substitutes for it.
- defer-0052 lands as this round's net-addition summary row; docs/governance/decision-ledger-t11.md joins the anchors under this ADR; the README ADR index rebuilds; an instrument-state record_only_change event registers the doc round.
- docs/governance/delegation-renewal-template.md is pre-staged; the next authorization-bearing event carries scope+expiry or records expiry.
- test/adr-0072-wiring.test.js seeds the frozen surfaces: the verdict, the plan, the protocol, the amendment, the four dispositions, the dormant D-G block, and the ceremony rows.

## Acceptance

- `node scripts/build-adr-index.js --check`, `node scripts/build-governance-anchors.js --check`, `node scripts/check-governance-inventory.js`, `node scripts/check-deferred.js`, `node scripts/check-host-contracts.js` all exit 0.
- `npx jest test/adr-0072-wiring.test.js` green; the amended claim sentence asserts identically across the three claim homes.
- `node scripts/instrument.js --check` verifies the hash chain with the t11 registration event appended.
