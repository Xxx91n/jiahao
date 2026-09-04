# ADR-0044: Claim-Directed Falsification — Mechanical Falsifiability Core Rule and Falsification Record

Status: Accepted
Date: 2026-09-04

References: ADR-0007 (hash chain), ADR-0013 (cross-turn hash chain and
idempotency), ADR-0027 (pre-registered threshold discipline), ADR-0028 D2
(regen-and-diff), ADR-0029 D5 (durable rejection re-evaluation), ADR-0031
(wiring assertions and gate tiers), ADR-0033 (deferred registry), ADR-0034
(gates.json single entrypoint), ADR-0036 (capable-optimizer threat model),
ADR-0040 (capability probing and three-state exit), ADR-0041 (closed stderr
prefixes and order-preserving lane integration), ADR-0043 (fact-source spine
and derived artifacts).

## Context

The next architecture gap is not a missing gate but a missing claim boundary.
Existing gates verify implementation artifacts, but they do not uniformly
bind a claim to an executable falsification attempt. The following facts are
the evidence set for this decision:

- Current gate model: 19 entries in `docs/gates.json`; `npm run gate:all`
  returns exit `0/1/2`; `2` is narrowly capability-absent UNVERIFIABLE
  (ADR-0040/0041).
- Current evidence model: `EvidenceLog` is append-only and hash-chained with
  `valid/invalid/missing`-shaped verdict surfaces available from existing
  gates, but no `falsification_record` schema exists.
- Current capability model: `src/shared/capability.js` defines a closed
  `CAPABILITIES` enum (`repo-tree`, `bench-corpus`, `docs-adr`, `ci-mode`) and
  is consumed by every registered gate.
- Current LLM-judge seam: verdict-gate and bias checks already treat judge
  output as advisory/calibrated, not primary deterministic proof.

Industry research this round confirms the template family is already mature:
AgentClaimGuard-style structured claims, hexisteme-style executable falsifier
conditions, Promptfoo-style JSON + JUnit + exit-code CI gates, and a
deterministic-checker-first rule because LLM judges are not reliable primary
falsifiers. The project adopts the reusable shape, not a new dependency.

## Decision

### Cluster 1 — Claim-Directed Falsification as the incremental mental model

- **D-A (one model, no new wheel)**: Claim-Directed Falsification is the next
  single mental model. It names the boundary between "a claim" and "the
  executable attempt to falsify that claim". It reuses gates.json,
  `capability.js`, `run-gates.js`, and `EvidenceLog`; no new runtime library
  is added.
- **D-B (claim identity is registry-anchored)**: a claim carries a stable
  `claim_id` and a `claim_type` drawn from a closed enum in the implementation
  round. The existing capability enum is the first `claim_type` family; any
  new family requires an ADR naming it verbatim.

### Cluster 2 — Mechanical Falsifiability Rule and claim classification

- **D-C (Mechanical Falsifiability Rule)**: a load-bearing claim is accepted
  only if it has an executable `falsification_cmd` whose exit code is
  deterministic. A claim without such a command is not verified; it is
  classified and handled explicitly.
- **D-D (three-way classification)**: every key claim is classified as
  `mechanically-falsifiable`, `declared-unverifiable`, or `deferred`.
  Mechanically falsifiable claims enter the falsification gate. The other two
  classes use the ADR-0033 deferred boundary or the ADR-0040 UNVERIFIABLE
  channel rather than pretending to be proven.
- **D-E (deterministic checker first)**: falsification evidence is produced by
  deterministic commands. LLM/judge output is advisory and calibrated, never
  the primary falsification decision.

### Cluster 3 — falsification record and evidence tri-state

- **D-F (five-tuple record)**: a `falsification_record` has exactly
  `claim_id`, `claim_type`, `falsification_cmd`, `exit_code`, `falsified`.
  No additional fields are normative in this ADR.
- **D-G (evidence tri-state)**: `falsified` is one of `valid`, `invalid`, or
  `missing`. `valid` means the claim survived the falsification attempt;
  `invalid` means the attempt falsified it; `missing` means the attempt did
  not produce evidence.
- **D-H (append-only, hash-chain compatible)**: falsification records enter
  the existing append-only `EvidenceLog` or its implementation-round
  successor without replacing the hash chain or idempotency discipline.

### Cluster 4 — falsification gate and first twin batch

- **D-I (reuse 0/1/2)**: the future `falsification` gate uses exit `0` for a
  green falsification run, `1` for a deterministic falsification breach, and
  `2` only for probed capability absence. This does not broaden ADR-0040.
- **D-J (structural first batch)**: the implementation round registers 12
  `falsification-twins`, selected first for structural killing power, not
  statistical coverage.
- **D-K (single entrypoint)**: when implemented, the gate registers in
  `docs/gates.json` and runs through `npm run gate:all`; `ci.yml` is not
  edited.

### Cluster 5 — document boundary and content anchors

- **D-L (content anchors)**: every numeric threshold, field name, `defer` id,
  `R` number, and glossary term in this ADR is an anchor for a later
  implementation-round wiring test.
- **D-M (document round only)**: this round records the decision. It does not
  implement `check-falsify.js`, twin corpus content, or registry writes.

### Rejected alternatives (durable; re-evaluation triggers per ADR-0029 D5)

- **R1** adding a property-based-testing framework for falsification. The
  current repository has no need for a new dependency; `spawnSync`-driven
  checks plus a closed registry cover the same claim boundary. Re-open if
  falsification inputs require random-input shrinking beyond the existing
  fixtures.
- **R2** making an LLM judge the primary falsifier. Reflect and judge-bias
  evidence shows LLM judging is not a reliable sole gate. Re-open only if a
  calibrated judge is later demonstrated as an independent second opinion,
  never as the only signal.
- **R3** using a statistical threshold as the first falsification gate. The
  first batch is structural because it can catch one concrete counterexample.
  Re-open after the structural gate has a stable operational history.
- **R4** creating a separate claim registry JSON before implementation. A new
  fact source is not needed until the implementation round defines its
  consumers. Re-open if claims gain cross-module consumers that gates.json
  cannot address.
- **R5** implementing `check-falsify.js` and the first twins in this document
  round. This would violate the task boundary and make the ADR unverifiable as
  a document artifact. Re-open in the next implementation round.
- **R6** extending exit-code semantics beyond `0/1/2` for falsification
  results. This would repeat the broad-predicate defect rejected by ADR-0040.
  Re-open only if a new exit class is necessary and is pre-registered through
  ADR-0029 D5.

### Deferred (ADR-0033 boundary; not implemented this round)

- `defer-0044-01` implement `check-falsify.js` and register `falsification` in
  `docs/gates.json`; unfreeze when the implementation round begins.
- `defer-0044-02` define and commit the first 12 `falsification-twins` with
  their `claim_id`/`claim_type`/`falsification_cmd` entries; unfreeze with
  the implementation round.
- `defer-0044-03` add statistical falsification metrics and threshold
  enforcement; unfreeze after `defer-0044-01` has a green structural gate.

## Consequences

- A claim with no executable falsification path cannot be reported as a green
  fact; it must be explicitly classified.
- The implementation round has a fixed contract and cannot drift into a
  parallel stats/eval system without amending this ADR.
- No runtime dependency or CI workflow changes are introduced in this round.
- CONTEXT.md gains seven glossary terms and the Decision Log gains one ADR
  entry.

## Acceptance

- [ ] `npm test` exits `0` with the current test count.
- [ ] `npm run gate:all` exits `0`; no confirmatory gate fails, and only the
  four known `ci-mode`-required gates may report UNVERIFIABLE.
- [ ] `node scripts/build-adr-index.js --check` exits `0` and reports the
  README ADR index in sync.
- [ ] `git diff --check` is clean.
- [ ] CONTEXT.md contains all seven new terms and ends with
  `*End of Glossary*`.
- [ ] Decision Log lists ADR-0044.
- [ ] README generated ADR index includes ADR-0044.
