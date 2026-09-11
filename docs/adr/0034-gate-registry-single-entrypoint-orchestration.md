# ADR-0034: Gate Registry & Single Entrypoint — gates.json, gate:all Aggregation Semantics, Three-Face Alignment

Status: Accepted
Date: 2026-08-30

## Context

jiahao's governance spine is "fact-sourcing" (ADR-0033): every
governance object carries a machine fact-source JSON, a fail-closed
checker, and the ADR-0027 couplingViolation guard. The one object that
never entered the spine is the inventory of the gates themselves: six
gates exist as independent npm scripts (bench:gate, probes:gate,
coverage:gate, deferred:gate, drift, host-contracts) whose wiring is
hand-maintained in three places — package.json scripts,
.github/workflows/ci.yml run lines, and .githooks/pre-commit — with no
machine checking them against each other. The failure mode already
materialized once: ci.yml silently omitted coverage:gate and
deferred:gate (found by audit, caught by no tool). A missing-gate
silently-passing state is exactly the class of failure this project
exists to detect: "A project that ships 'pre-registered thresholds'
without a machine that enforces them is committing the exact failure
mode it exists to detect" (ADR-0027). Agents must not self-certify;
neither may the gate inventory.

This ADR is the product of one grill round with five serial atomcode
researches (all high-confidence):

- Q2 orchestration shape — academic: arXiv:2608.17824 (validation-gate
  formalization V_S, code-primacy single source of truth),
  arXiv:2603.15676 (evidence-driven release); industry: Bazel BUILD +
  bazel test single entry, pre-commit framework single manifest,
  GitLab required checks, wireit (rejected: new devDependency).
- Q3 execution semantics — academic: DO-178C evidence completeness,
  Yoo & Harman 2012 TCP survey, Elbaum FSE 2014 Google pre/post-submit
  layering; industry defaults verified at primary sources: pre-commit
  fail_fast=false, jest "Run all tests (default)", pytest, Nx
  --nxBail default false, Gradle --continue/--fail-fast discussion
  #6513, Bazel --keep_going (DAG family), GNU make -k, GitHub Actions
  annotation limits (10 warnings/step, 50/job — official docs).
- Q4 ordering mechanism — academic: TCP/APFD, trusted computing base
  self-check-first (trusting-trust, POST, Secure Boot CRTM),
  ISO 26262 self-test; industry: Bazel analysis-before-execution,
  Terraform validate-before-plan, Kubernetes initContainers, systemd
  After=, GitLab stages/.pre, GitHub Actions needs, GNU make order-only
  prerequisites (and its warning against relying on textual order).
- Q5 CI-side drift guard — academic: RIVA arXiv:2603.02345 (drift =
  consistency verification of declared vs deployed), policy-as-code
  arXiv:2601.05555, IaC-drift security literature (GenSecOps: 67% of
  cloud breaches from misconfiguration); industry: actionlint/zizmor
  (CI config as machine-checked code; tj-actions lesson), codegen
  drift-gate precedent family (stringer "won't compile if stale",
  cozystack, midaz), platform-template governance (Riftmap two-deploy
  lesson), GitHub required workflows (org-scoped, solves a different
  problem), pre-commit.ci.
- Q7 pre-commit relation — academic/industry: Google SWE book ch.14 +
  Testing Blog, Meta diff-time CI, pre-commit framework philosophy
  (never a pytest hook; "consider running that in CI too"), trunk.io
  layer model, lint-staged, HN "Pre-commit hooks are broken"
  (212 pts), ArchitectViewMaster >5s bypass threshold, Drew 2014 alarm
  fatigue (88.8% FP), dev.to block-no-verify (AI agents systematically
  use --no-verify), Xygeni security analysis.

## Decision

### D1 Gate registry is the fifth machine fact-source

`docs/gates.json` (sibling to thresholds.json / coverage-map.json /
host-contracts.json / deferred-registry.json). One entry per gate:
{name, command, tier, source_adr, order}. tier vocabulary reuses
ADR-0031 D3 exactly (confirmatory / observational /
deferred-with-unfreeze; no new terms). guard tier is not a gate tier:
confirmatory fails the run, observational/deferred record and never
block. Changes to gates.json require a same-commit ADR via the
reused ADR-0027 couplingViolation guard (cfgRel=docs/gates.json).
Existence-based anchoring per ADR-0033.

### D2 Single entrypoint: scripts/run-gates.js, npm run gate:all

One zero-dependency thin CLI + pure core (ADR-0029 D4 shape). The
runner reads gates.json, executes entries in order, and emits one
aggregated process exit code. Advisory/band warnings aggregate into a
single ::warning:: line (ADR-0027 D3 discipline against the GitHub
10-annotation/step limit). CI calls this entrypoint exactly once.

### D3 Execution semantics: run-all-then-aggregate, --fail-fast opt-in

Default is complete-run: every gate executes, the summary reports all
breaches at once; --fail-fast is an explicit opt-in (pytest -x /
jest --bail / Nx --nxBail alignment). Two governing mental models:

- Decision/evidence separation: a confirmatory failure terminates the
  *decision* (exit non-zero is already decided), not the *evidence
  collection* — a partial run is a partial audit record.
- Orthogonality statement (recorded to prevent future regression):
  ADR-0004's short-circuit is a *rung-internal* semantics (cheaper
  mechanism first within one verification target); gate:all is a
  *cross-gate* family of independent sibling checks (no task-dependency
  graph). The two are orthogonal by construction; neither may be
  invoked to justify the other.

Tier-aware execution: --fail-fast may short-circuit only confirmatory
failures; observational/deferred entries are skipped under --fail-fast
and never block in any mode.

### D4 Ordering contract: CRTM-as-entry

order is a required integer with no default (a missing order is a
schema violation, fail-closed). Meta-checks — registry↔package.json
alignment, registry↔ci.yml wiring (D5), and the couplingViolation
guard — are first-class registry entries and must hold the minimal
order values; the runner's schema validation asserts "meta-check
entries exist and occupy the smallest orders" (structure hard-coded in
the runner, content declared in the registry — the minimal common form
of Bazel's analysis phase, Terraform validate, initContainers, and
systemd After=). Order bands are documented in the registry _doc:
0–99 meta-checks, 100+ functional gates. Ordering is unconditional;
--fail-fast and tiers govern what happens after a failure, never the
schedule itself.

### D5 Three-face alignment and the CI wiring contract assertion

Meta-check arithmetic grows from two-face to three-face:
gates.json ↔ package.json ↔ .github/workflows/ci.yml.
`scripts/check-ci-wiring.js` (zero-dependency, thin CLI + pure core)
asserts on ci.yml, line-level (no YAML parser needed at 56 lines):
exactly one run line invokes npm run gate:all (allowing flag variants
like --fail-fast), and no run line invokes any command enumerated in
the gates.json entries. The direct-invocation blocklist is generated
from the registry, not hard-coded — single source of truth. A
violation fails closed (exit 1). Negative fixtures cover if:-masked
invocations and comment-masked invocations (ADR-0029 D4 pure-core and
negative-fixture convention; ADR-0031 D1 wiring-assertion discipline:
a jest test proves the assertion's killing power). C-style generated
ci.yml is registered in deferred-registry.json with unfreeze_if:
ci.yml becomes multi-job / multi-workflow / matrixed.

Amended 2026-09-12 by ADR-0058 D-E (D-005): the single-entrypoint rule is
narrowed to the GATE LAYER. gate:all is the single entrypoint for the gate
layer and owns the gates.json members exclusively; the independent test job
is a CI-layer consumer that does not go through gate:all. The registry-to-ci
assertion is unchanged in shape (exactly one run line invokes npm run
gate:all; no run line invokes a gate command enumerated in gates.json). The
multi-job unfreeze condition above is now satisfied, so the C-style ci.yml
deferral (defer-0004) is evaluated by scripts/check-ci-jobs.js in the same
round (ADR-0058 D-003/D-004).

### D6 Per-gate npm scripts stay as aliases

bench:gate / probes:gate / coverage:gate / deferred:gate and friends
remain in package.json as debug entrypoints and for pre-commit
warn-only references. Canonicality is enforced by the D5 wiring
assertion (CI must call the single entrypoint), not by deletion.
Deprecation warnings are rejected under ADR-0027 D3 alarm-fatigue
discipline.

### D7 pre-commit untouched; three clauses pinned in docs

pre-commit keeps its ADR-0011 §3 role (fast, warn-only, information-
gain-triggered notices) and never runs gate:all in any mode: >5s
hooks empirically breed --no-verify bypass culture (HN/Lobsters
consensus, >5s threshold; dev.to evidence that AI agents use
--no-verify systematically), and warnings must stay rare (ADR-0027 D3).
Three textual disciplines: (1) explicit pre-commit budget < 1 s with
5 s ceiling; (2) level attribution — gate:all is a CI-tier machine
(presubmit/postsubmit semantics), pre-commit is an information-gain
reminder layer; (3) the AI-committer --no-verify threat model is
recorded: jiahao audits AI agents, and empirical evidence shows AI
agents bypass local hooks silently — the CI enforcement plane is the
only trustworthy one.

## Rejections

- R1: external orchestrator (wireit / nx / turbo) — ADR-0027 R1
  zero-dependency precedent; the runner is ~100 lines of stdlib code,
  a dependency buys tasks graphs we do not have (cross-gate family has
  no DAG).
- R2: bootstrap meta-checks hard-coded outside the registry (Q4-B) —
  the registry ceases to enumerate every check and couplingViolation
  cannot reach code; breaks "registry as fact source".
- R3: implicit array ordering (Q4-C) — GNU make's documented footgun
  (textual order must not be relied upon); no machine assertion is
  possible; degrades silently.
- R4: generated ci.yml with regen-diff now — ADR-0032 D2
  anti-precedent ("a renderer would hide intent drift behind a build
  step"); ci.yml is a single-consumer 56-line file, which has not
  earned a render layer. Registered as deferred uplift per D5, not
  deleted from the space of futures.
- R5: gate:all inside pre-commit in any form (block or warn-only) —
  ADR-0011 §3 convenience-layer boundary; empirically breeds
  --no-verify culture; duplicates a witnessed enforcement plane with
  an unwitnessed one.
- R6: deleting per-gate npm scripts — canonicality by assertion, not
  deletion; aliases are the standard npm-ecosystem debug affordance
  and keep ADR/README references valid.

## Consequences

Positive: the last unwitnessed governance object enters the spine;
"which gates exist" stops being tribal knowledge; CI omits a gate only
by failing red. Cost: one more fact-source plus two more checkers;
the order-bands convention is a small social convention (documented in
_doc). Impl round builds: docs/gates.json, scripts/run-gates.js,
scripts/check-ci-wiring.js, packaging of gate:all in package.json and
ci.yml, the ADR-0031 D1 wiring-assertion test, and negative fixtures.
Deferred-registry entry added for the C-uplift (generated ci.yml).
