# ADR-0033: Deferred/Unfreeze Registry — Machine Fact-Source for Pending-Activation Deferrals

Status: Accepted
Date: 2026-08-30
Amended by: ADR-0035 (cadence ladder, residency SLA, check-in discipline, verified-by enforcement, entry corrections)

## Context

jiahao's governance spine is "fact-sourcing": thresholds.json
(pre-registered thresholds, confirmatory, ADR-0027 coupling guard),
`docs/coverage-map.json` (four-state coverage of the seven iron laws,
STALE fail-closed, ADR-0032), `docs/host-contracts.json` (host contract
registry, ADR-0028). Deferred items, however, still live as scattered
prose: supply-chain signing (ADR-0029 D7 re-activation conditions),
L1/L2 golden gate suspension (ADR-0028 D1 unblocking conditions), and
Merkle/signature upgrades (CONTEXT.md "Cross-Turn Hash Chain":
"Merkle trees and signatures remain deferred upgrades" — a single
sentence with no condition at all). Nothing machine-checkable binds an
expiry, an unfreeze predicate, or a re-review duty to any of them.

This ADR is the product of a grill round with four serial atomcode
researches (Exa 429 degradation honestly logged; industry sources
MISRA Compliance:2020, FedRAMP POA&M, ISO 26262, SOC 2 exception
practice, security-exception workflow literature,
Unleash/GrowthBook/Piranha stale-flag operations, Backstage
catalog-info.yaml, OTel semconv registry, k8s feature-gate lifecycle,
MADR, OPA CI examples; academic anchors Rempel & Maeder 2016
traceability-completeness, Gall 1998 logical coupling, Davis 2003
requirements triage, MoSCoW Won't-have ambiguity (Wiegers & Beatty),
backlog-bloat literature (Scrum.org West 2023)). All recommended
dispositions were adopted.

Empirical driver: "we will clean it up later" intent is unreliable —
77% of developers claim they will remove toggles, yet 75% of toggles
persist 49 weeks (2021 study cited by GrowthBook); ISC2 2025: "What
begins as an exception slowly becomes the rule." A registry that does
not fail closed on its own violations reproduces that failure mode.

## Decision

### D1 Registry file and scope: docs/deferred-registry.json, pending-activation only

`docs/deferred-registry.json` is the fourth machine fact-source, sibling
to thresholds.json / coverage-map.json / host-contracts.json. It
collects only **chosen-to-defer** items (pending activation).
Declared-gap permanents stay in coverage-map.json (it already carries
review_at + STALE discipline — re-registering them would fork the fact
source). Chosen-not-to-build items (judgeSeam; ADR-0019 D4, ADR-0032
"stays refused") stay in ADRs per MADR practice: rejected alternatives
are first-class citizens of the decision record, not of an operational
registry. Putting a settled refusal under a fail-closed expiry clock
would manufacture a phantom "expired judgeSeam" state and force
re-litigation, violating ADR-0030's anti-relitigation intent.

### D2 Entry schema

Each entry: id (defer-NNNN), subject, source_adr, rationale,
unfreeze_if { type: presence-condition | count-threshold |
external-event | free-text, check, verified_by? }, review_at, status.
free-text predicates are permitted only with a review_at backstop
(un-evaluable prose must still carry an expiry). Zero-tolerance rule:
a confirmatory gate may never be a registry entry (MISRA mandatory =
zero deviations; ADR-0031 D3). When a future thresholds.json gate is
created with tier deferred-with-unfreeze, a registry entry must be
registered in the same commit (schema reserved; the current tier set
is empty — verified by grep, no seed entries owed).

### D3 Enforcement tier: confirmatory fail-closed + pending-evaluation

`scripts/check-deferred.js` is confirmatory fail-closed (schema
violations fail; missing mandatory fields fail), matching all existing
check scripts — a relaxed registry would create a double standard
against the coverage-map STALE exit-1 precedent. One refinement over
a naive fail: an unfreeze_if predicate that cannot be evaluated
machine-side is NOT a violation and NOT an automatic grace — the entry
moves to an explicit pending-evaluation status carrying its own
review_at, expiry of which is still STALE fail (FedRAMP VD/OR channel
pattern: tracked, time-boxed, never silently whitelisted). Renewal is
re-assessment: a status change requires an explicit action with
rationale via the ADR amendment channel; automatic extension is
rejected (securityexceptions.com: renewal must trigger re-assessment).

### D4 Expiry forces action (k8s feature-gate semantics)

review_at expiry = STALE fail-closed. Three explicit exits, no fourth:
(1) activate (unfreeze condition met, do the work), (2) re-defer with
new review_at + rationale (re-assessment recorded), (3) remove the
entry (upgrade or close). All three ride the ADR amendment path. The
registry change itself is bound by the ADR-0027 couplingViolation
shared guard: a registry diff without a same-commit ADR change is a
coupling violation. Anchoring is existence-based, not value-anchored
(entries carry no numbers): source_adr file must exist AND the entry
id must appear in the ADR text or CONTEXT.md — a dangling or
unreferenced registration fails. pre-commit is warn-only
(ADR-0011/0027 alert-fatigue discipline: pre-commit is a convenience
layer, no base ref exists locally); jest covers the checker; CI wiring
follows the existing gate template when a remote exists. The research
additionally suggested a CODEOWNERS human-approval layer over docs/
registries; it requires hosted branch protection that does not exist
in this repository (no remote) and is noted as a future option, not
implemented.

### D5 Seed inventory

- defer-0001 supply-chain signing (sigstore keyless / SLSA provenance)
  — source ADR-0029 D7; unfreeze_if presence-condition, verbatim
  D7's three re-activation conditions: (1) the project gains a publish
  pipeline; (2) a remote + GitHub Actions (or equivalent OIDC issuer)
  exists; (3) artifact inventory (tarball, adapters manifest) is
  formalized.
- defer-0002 L1/L2 golden gate deepening — source ADR-0028 D1;
  unfreeze_if external-event: the 8 long-tail host protocols verified
  against official docs AND the copilot-cli sessionStart bugs
  (#1730/#2201/#2415/#2142) resolved.
- defer-0003 Merkle tree / signature upgrade of the evidence hash
  chain — source CONTEXT.md Cross-Turn Hash Chain; the prose "remain
  deferred upgrades" is structured in this same commit as unfreeze_if
  external-event: a second-party consumer of the evidence log exists
  outside the producing repository, OR a cross-machine verification
  requirement appears (single-repo single-actor chains gain nothing
  from Merkle batching).
- judgeSeam: NOT registered (chosen-not-to-build; see D1). The
  re-entry note (FP gap <=3pp) stays as an ADR-0019 D4 annotation.

## Consequences

Deferred items stop being forgettable prose; expiry becomes a build
failure, not a memory. check-deferred.js is the smallest confirmatory
gate in the family (existence + schema + STALE). The registry
deliberately does NOT handle rejected/won't-do items; if a second
won't-do item ever needs machine tracking, extend the same file with a
state=rejected status outside the expiry clock (FedRAMP Open/Closed
tab pattern) rather than creating a second registry (scale argument
ADR-0031 R6).

## Rejections

- R1: deriving the registry by parsing ADR prose — no industrial
  precedent (MADR lints structure, never parses decisions); prose
  drift is unverifiable.
- R2: observational tier for registry violations — reproduces the
  exception-immortality failure mode (77% intent vs 75% persistence)
  and creates a double standard against coverage-map STALE exit-1.
- R3: automatic grace period — any automatic deferral is the
  "automatic extension" anti-pattern; renewal must be an explicit
  re-assessment action.
- R4: a second registry file for rejected items — same-store with a
  terminal status is the GitHub not_planned / Jira Won't Fix / FedRAMP
  tab pattern; a second file duplicates tooling for zero benefit at
  this scale.
- R5: embedding the registry in thresholds.json as a new key — mixes
  two fact-source semantics in one file; value-anchoring would
  false-positive on non-numeric entries; per-frequency change coupling
  pollutes diff review.
- R6: an external policy engine (OPA/conftest) — ADR-0027 R1
  zero-dependency precedent; the zero-dependency script IS our
  conftest.
