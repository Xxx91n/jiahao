# ADR-0041: Exit-Semantics Unification — Narrowed Exit-2, Three-Code Space with Structured stderr Prefixes, Consumer-Side Registry Wiring, Order-Preserving Lane Integration

Status: Accepted
Date: 2026-09-02

Amends: ADR-0040 (D4 message specification corrected: the ::error annotation line moves
to stdout with comma-separated properties; see D5)

References: ADR-0027 (pre-registered coupling guard), ADR-0028 (hook-domain exit-2 = block
precedent), ADR-0029 D5 (pre-registered upgrade channel), ADR-0031 (wiring assertion
discipline), ADR-0033 (deferred registry semantics), ADR-0034 (gates.json registry,
three-face alignment, decision-evidence separation), ADR-0038 D2 (maintainer-tree/CI-only
contract), ADR-0040 (capability probing, three-state exit contract).

## Context

The ADR-0040 audit found a class-level semantic defect: exit 2 carries three incompatible
meanings at once - (a) ADR-0040's probed-capability-absence UNVERIFIABLE (capability.js),
(b) fail-closed configuration/parse failure (check-corpus-freshness.js:92,
check-mr-probes.js:187/189, check-probes.js:142/149), and (c) CLI usage error
(bench-gate.js:204, check-probes.js:132, check-mr-probes.js:165). The run-gates aggregator
collapses the distinction (r.code !== 0), so a gate that never ran is indistinguishable
from a gate that ran and caught a violation - the exact failure category this project
exists to detect.

The audit also found that ADR-0040 D4's prescribed message channel itself violates the
GitHub workflow-command protocol (spec-level defect): ::error lines are written to stderr
with space-separated properties, but the official protocol requires stdout with
comma-separated properties (::error title=UNVERIFIABLE,gate=<name>,requires=<cap>::msg).
An annotation on the wrong channel never renders; the "primary visibility channel" was zero.

The audit's H1 claim ("probe-corpus/judge-bias not registered in gates.json") was
re-verified against the current tree during this grill round: both gates ARE registered
(check-probe-corpus order 155, check-judge-bias order 170) and both call
requireCapabilities. The audit statement was based on an earlier ref; the discrepancy is
recorded honestly rather than silently resolved either way.

This ADR is the product of one grill round with seven serial atomcode researches
(all high-confidence, source lists archived in the round's research reports):
Q1 package scope (A), Q2 semantic domain boundary (A), Q3 exit-code space (C),
Q4 registry wiring ownership (A), Q5 lane merge order (A), Q6 migration compatibility (A),
Q7 glossary curation (B with promotion rule).

## Decision

- D1 Three-in-one scope (Q1-A). Exit-semantics unification, the ADR-0040 D4 message
  amendment, and the H1 wiring-ownership ruling are decided together: they are three faces
  of one exit contract. Splitting them across rounds leaves live contradictions (a fixed
  annotation channel whose aggregation still folds exit 2 into fail).
- D2 Narrowed domain and single meaning (Q2-A). Exit 2 has exactly one meaning -
  probed-capability-absence - and that meaning binds ONLY gates registered in
  docs/gates.json and their src/shared/ dependencies. Tool scripts outside the registry
  (install.js, resolve.js, eval-ab.js, collect-holdout.js, kappa.js, reverify.js,
  verify-evidence.js, ...) make no exit-code promise until they join the orchestration
  surface, at which point they pass through an ADR-0029-D5-style pre-registered channel.
  Rationale anchors: ADR-0028's hook-domain/gate-domain isolation precedent; Bazel
  constrains test rules, not sh_binary; Python Click/argparse exit-2-is-usage CLI
  convention for free scripts; systemd per-unit SuccessExitStatus.
- D3 Three-code primary channel + structured-stderr auxiliary channel (Q3-C). The primary
  contract stays exactly three codes: 0 pass / 1 fail / 2 capability-absent-unverifiable.
  Everything displaced from the old over-loaded exit 2 (thresholds/parse failure, config
  error, usage error) moves to exit 1, and fail-path stderr MUST begin with a
  machine-matchable prefix drawn from a closed enum: [usage]: / [config]: / [internal]:.
  This generalizes the FAIL-CLOSED: prefix already present in four gate scripts and the
  ADR-0040 two-line message pattern; precedent: Bazel TEST_INFRASTRUCTURE_FAILURE_FILE
  ("only for testing infrastructure, not a general mechanism" - auxiliary channels are
  closed and purpose-scoped too). sysexits 64-78 subclassing stays rejected (ADR-0040 R6,
  reinforced by grep/git-diff/tar/k8s-probe/SLSA-VSA two-three-code minimalism).
- D4 Registry wiring is a consumer-side duty (Q4-A). gates.json is the orchestration-side
  single fact-source (ADR-0034 D1); registration and ci.yml wiring belong to the
  orchestration side, while script implementers remain stewards (consulted, may review).
  Industrial consensus: K8s CRD registered platform-side vs controller implementation;
  Bazel BUILD declaration vs .bzl implementation; GitHub reusable-workflow caller pin;
  Nx plugins must be registered into nx.json to take effect. The impl round verifies the
  exact-commit registration state of probe-corpus/judge-bias and records the audit-vs-tree
  discrepancy; wiring assertions (ADR-0031 D1) lock both gates' requireCapabilities wiring
  so a future parallel-implementer omission fails red. deferred-registry is NOT the right
  container: deferred holds design-undecided items (Q4 research, ADR-0033 semantics), not
  existing-but-unwired facts.
- D5 ADR-0040 D4 amendment (fixes the spec-level protocol defect). On exit 2 the gate
  emits two lines: line 1 (machine) goes to STDOUT as a protocol-valid annotation -
  ::error title=UNVERIFIABLE,gate=<name>,requires=<capability>::msg (comma-separated
  properties; %/%0A/%0D escaping per the workflow-command spec); line 2 (human) stays on
  stderr. capability.js and the D7(b) spawn-lock assertions must be updated in the same
  commit. ADR-0040's D4 text is annotated with an Amended-by pointer rather than rewritten,
  preserving the decision trail.
- D6 Order-preserving cumulative integration (Q5-A). The five stacked lanes merge in
  dependency order - adr0036-impl -> adr0037-0038-impl -> adr0039-impl -> grill-adr0040b ->
  adr0040-impl - each step gated by a green npm run gate:all before the next proceeds.
  Merge Queue FIFO, GitLab merge-train cumulative pipelines, stacked-PR bottom-to-top,
  and Trunk-Based Development all confirm this shape; reverse order was falsified locally
  (validateRequires treats a missing requires array as schema violation exit 1, not
  UNVERIFIABLE, so reverse order creates a necessarily-red intermediate state plus ADR
  number/inversion).
- D7 Hard cutover, no grace period (Q6-A). The gate scripts are a maintainer-tree/CI-only
  internal toolchain (ADR-0038 D2); every consumer (run-gates, ci.yml, wiring assertions,
  runbook) lives in this repo and upgrades in the same commit (ADR-0034 D5 three-face
  alignment). Grace-period mechanisms (K8s 3 releases, Terraform MINOR->MAJOR, Go GODEBUG,
  Rust editions) exist for external ecosystems that cannot upgrade in lockstep; with zero
  external consumers, a grace period is pure cost and literaly preserves the defect
  (Postel critique). Dual-track and feature-flag compromises keep three-meaning exit-2
  alive one more round and violate D2 (registry scripts' behavior class must not be
  environment-variable-dependent). wiring assertions lock the new semantics in the same
  commit; test assertions that silently depend on the old exit-2 semantics are the
  internal Hyrum list and must be updated in that commit.
- D8 Curated glossary with promotion rule (Q7-B). Six terms that are consumed by 2+
  decisions and will appear in the impl round enter CONTEXT.md now (primary/secondary
  channel, consumer-driven constructor granularity, domain-scoped exit contracts,
  order-preserving cumulative validation, internal-toolchain-no-grace-period, Hyrum
  sufficient-users premise). The remaining research terms stay defined inside this ADR
  (ADR text is the definition carrier per Nygard/MADR; SSOT, no double definition).
  Promotion rule henceforth: a term enters CONTEXT.md the first time it is sharpened
  in-session (grill discipline: capture as it happens), but research-background terms
  wait for a second ADR to reference them.

## Consequences

- One contract, one meaning: exit 2 becomes unambiguous at the aggregation surface.
- CI annotations for UNVERIFIABLE become actually visible (stdout protocol fix).
- New wiring assertions make registry-omission a red state, not a silent one.
- The five-lane integration is no longer ad hoc; merge order is a decided contract.
- CONTEXT.md grows by 6 terms instead of 16; signal density preserved.

## Rejected alternatives

- R1 sysexits 64/70/78 subclassing of exit 1 (Q3-B) - contradicts ADR-0040 R6, adds
  aggregator columns no consumer matches on; sysexits' own man page concedes ambiguity.
- R2 three codes without stderr prefixes (Q3-A) - "config broken, never ran" and "ran,
  caught violation" become machine-indistinguishable inside exit 1, the mirror image of
  the broad-predicate defect ADR-0040 R2 rejected; free-form text parsing violates the
  machine-fact-source discipline.
- R3 dual-track deprecation window (Q6-B) - keeps three-meaning exit 2 alive for one more
  round; the DEPRECATED: prefix would have no consumer.
- R4 feature flag JIAHAO_EXIT_SEMANTICS (Q6-C) - violates D2 (registry-internal scripts'
  behavior class must not be environment-gated); industry feature gates (GODEBUG, Rust
  editions) exist for external ecosystems jiahao does not have.
- R5 reverse or batched lane merge (Q5-C/B) - reverse order falsified locally
  (must-be-red intermediate state + ADR inversion); batched merging defers three-face
  alignment and widens the attribution surface from one lane to five, against
  fail-closed/honest-evidence discipline. No industrial precedent (merge trains parallelize
  cumulative validation, never skip it).
- R6 H1 via deferred-registry or returned-to-implementer (Q4-C/B) - deferred is the wrong
  semantic container (it holds design-undecided items, not existing-but-unwired facts);
  returning wiring to implementers creates responsibility drift across parallel lanes with
  zero recurrence-prevention mechanism.
- R7 full glossary import or zero-import (Q7-A/C) - full import dilutes the 108-term
  glossary (+9% bulk on 1166 lines, Gruber minimal-commitment violation); zero-import
  contradicts the grill/domain-modeling discipline of capturing terms as they are
  sharpened.
