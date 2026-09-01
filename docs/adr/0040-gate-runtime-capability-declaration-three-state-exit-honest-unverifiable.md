# ADR-0040: Gate Runtime Capability Declaration — requires Closed Enum, Three-State Exit, Honest UNVERIFIABLE Degradation

Status: Accepted
Date: 2026-09-01

References: ADR-0023 (degradation vocabulary scope), ADR-0027 (pre-registered coupling guard),
ADR-0031 (tier vocabulary reserved for decision severity), ADR-0034 (gates.json registry,
decision-evidence separation), ADR-0038/0039 (runtime-artifact surface boundary).

## Context

The ADR-0039 impl audit found a class-level defect, not a two-gate symptom: gate scripts
assume the repo tree exists at module load. scripts/check-probes.js module-level requires
bench/polygraph/node-bridge.js, which is outside the npm files whitelist; inside an
installed tarball the gate dies with a bare MODULE_NOT_FOUND stack and exit 1. exit 1 is
also the code a gate returns when it RAN and caught a violation — a failure-category
confusion: crash and verdict share one code, so a missing environment is
indistinguishable from a detected lie. The defect is class-level: run-gates.js itself
module-requires check-bench-thresholds.js, which (with check-coverage.js) reads docs/adr/
- out of the tarball since ADR-0039.

Grill-round research (atomcode, six serialized rounds, Exa+Tavily+AnySearch with primary-
source fetches): ESLint exit 0/1/2, pytest exit 0-6 (3=INTERNAL_ERROR,
5=NO_TESTS_COLLECTED), Bazel exit 32/36/37/38 + TEST_INFRASTRUCTURE_FAILURE_FILE,
sysexits EX_UNAVAILABLE(69)/EX_SOFTWARE(70)/EX_TEMPFAIL(75), LSB init-script 5/6,
systemd Condition* fixed verb set (RFE #31833 rejected custom conditions), K8s Pending vs
CrashLoopBackOff, pytest marker registration, Rust check-cfg, POSIX capabilities(7) closed
enum, OpenGL vendor-extension strings as the open-vocabulary anti-pattern, GNU autoconf
("encapsulate in a macro"), ci-info/@npmcli/ci-detect, junit XML skipped/error/failure
isolation, RFC 9457 problem details, journald MESSAGE-not-for-parsing, go test -json
envelope-vs-Output, GitHub workflow commands, npm error-vs-crash roadmap. Threads:
failure-category separation ("did not run" is not "ran and degraded"), closed registered
vocabularies with controlled evolution, narrow predicates (bugs must not masquerade as
missing environments), and decision-evidence separation preserved in aggregation.

## Decision

D1 Capability declaration field. docs/gates.json gains per-gate `requires: string[]`
drawing from a CLOSED enum with four initial capabilities, which jointly cover all 18
current gates:
- repo-tree: a git worktree is present (git rev-parse succeeds / .git exists); no version
  or HEAD-state checks. Consumers: gates-coupling, drift, adapters-golden,
  host-contracts, bench-thresholds, bench-gate, corpus-leak.
- bench-corpus: private/bench-corpus/ directory exists; no fingerprint/count validation
  (that remains with the leak/freshness/schema gates). Consumers: bench-gate,
  probe-corpus, probes, judge-bias, corpus-leak, corpus-freshness, mr-probes.
- docs-adr: docs/adr/ directory exists. Consumers: gates-coupling, bench-thresholds.
- ci-mode: CI env var present (GITHUB_ACTIONS or CI non-empty). Consumers: ci-wiring,
  bench-gate/probes/mr-probes --ci modes.
Adding a capability requires an ADR (same-commit coupling guard, ADR-0027 pattern)
in which the capability name appears verbatim (content anchor). An unregistered name in a
requires array is a REGISTRY VIOLATION (fail-closed at gates-alignment/schema level),
never an exit 2: a word absent from the dictionary is illegal, not "unverifiable"
(closed-world assumption; pytest strict-markers precedent).

D2 Probe helper and load order. src/shared/capability.js (zero-dependency; src/shared is
already inside the tarball whitelist) exports requireCapability(name). Every gate probes
declared capabilities BEFORE loading runtime dependencies (the check-mr-probes.js
corpus-checks-then-judge-require pattern generalized; check-probes.js converts its
module-level node-bridge require to a deferred require). run-gates.js pre-checks each
gate's requires via the same helper. The helper answers only EXISTENCE, never content
correctness (fingerprints, thresholds, counts belong to their own gates).

D3 Three-state exit semantics, narrow predicate. Gate exit codes: 0 = pass, 1 = violation
found, 2 = UNVERIFIABLE (a declared capability is deterministically absent). Pinned
wording: exit 2 may ONLY occur on a code path where capability probing executed and
received a deterministic negative answer. Probe exceptions, external-command failures, IO
errors (EACCES etc.), and helper/gate bugs are NOT translated to exit 2 — Node crashes as
exit 1 and exposes the bug honestly (semver precedent: pytest 3 INTERNAL_ERROR; Bazel 37
internal vs 36/38 environment; sysexits 69/70/75 distinct; Rust panic-vs-Result; Midori
abandonment-for-bugs). There is no "transient" bucket: existence probing is boolean; an
error that prevents even asking is crash-surface.

D4 Two-line degradation message. On exit 2 the gate writes to stderr, in order:
  line 1 (machine): ::error title=UNVERIFIABLE gate=<name> requires=<capability>::msg
for GitHub-Actions annotations, isomorphic to the existing ADR-0034 D2 ::warning
discipline. Rationale: at the GitHub step layer exit codes collapse to zero/nonzero —
the annotation is the primary visibility channel for exit 2. run-gates aggregates to a
single annotated line (GitHub annotation caps: 10/step, 50/job) plus per-gate detail in
  plain log lines.

D5 Aggregator semantics. run-gates lists UNVERIFIABLE as its own column, counted
separately from violations (pytest skip-is-listed-separately precedent) and never merged
into failures nor silently skipped; --fail-fast skips gates whose capabilities are
absent. Aggregator-side pre-check shall NEVER be the only defense: per-gate npm aliases
and direct script invocation (the audit's exact reproduction path) must degrade
identically. Decision-evidence separation (ADR-0034 D3) is preserved: gates report,
policy (caller/CI) decides.

D6 degradation.schema.json unchanged. env-unavailable does NOT join the degradation kind
enum (truncation/scan-skip/timeout/null): that vocabulary's semantic domain is "ran but
degraded"; environment absence is "did not run" — a different domain. Acid test:
recording env-absence as a degradation kind manufactures a false positive ("I ran,
partially blind") and violates the honesty law and every-kind-has-a-consumer rule
(ADR-0023 D3). Machine attribution lives in run-gates' per-gate result object as
status: 'unverifiable' (a sibling of the skipped-* statuses), not in the degradation
schema.

D7 Regression locks (sampled + mechanical anchor). (a) jest unit tests pin the helper
(probe verdicts, unknown-name rejection, message assembly). (b) Spawn-level assertions
on four representative gates — one per capability — asserting exit 2 plus the two-line
honest message (inverts the ADR-0039-audit finding: deleting a gate's try/catch / early
require ordering turns a test red). (c) Tarball smoke keeps its ADR-0038 role:
pack/install/require — it locks installability, not runtime behavior (packtester/npm-docs
position: smoke tests cannot observe runtime exit semantics). (d) A static wiring anchor,
extending the adr-0031/0034/0036 wiring-assertion pattern: every gate's source genuinely
calls requireCapability with names equal to its gates.json requires entry. (d) covers
all 18 gates mechanically and future gates at zero marginal cost; full 18x spawn
replication is rejected as marginal-information-negative and a new-gate test tax.

D8 Deferred: a local-file:<path> escape form for one-off custom gates is registered as
deferred-registry entry defer-0008, unfreeze condition = a real gate requiring an
arbitrary-path capability appears. Unconstrained escapes slide toward an expression
language (systemd X- prefix is reserved namespace, not an open verb).

## Rejected

R1 Point-fixing only the two probe gates (check-probes/check-mr-probes): the defect is
class-level (run-gates itself mis-requires; gates-coupling/bench-thresholds read
docs/adr); the next new gate would hit the same wall.
R2 Broad predicate (translate every probe-adjacent failure into exit 2): ESLint-style
folding makes "your config is broken" and "the tool crashed" indistinguishable; violates
the honesty law; contradicted by pytest/Bazel/sysexits internal-error codes.
R3 Making every gate runnable inside the tarball: conflicts head-on with ADR-0038/0039
(tarball = wheel-equivalent, 200,000-byte measured budget, corpus gates maintainer/CI-
only BY DESIGN). Consumer demand unproven (defer-0007 precedent).
R4 Inline probing copied into each gate: 15 replicas rot; autoconf mandates macro
encapsulation; ci-info exists precisely to kill inline environment sniffing; violates
DRY and the repo's wiring-assertion discipline.
R5 Aggregator-only precheck: per-gate aliases and direct script runs bypass run-gates —
exactly the audit's reproduction path. systemd/pre-commit get away with manager-only
surfaces because their execution ALWAYS flows through the manager; jiahao's does not.
R6 sysexits-style granular codes (64-78): codes are non-portable, communities repeatedly
report the contract unenforced, and two consumers (gate:all, CI) need exactly three
bits of signal: ok / violation / cannot-verify.
R7 Adding env-unavailable to degradation.schema.json: cross-domain extension — the schema
owns "perceived degradation of something that ran"; "did not run" belongs to the exit
surface and aggregator. (Orchard: do not stretch a vocabulary across a semantic domain;
jarhalab: SARIF never grades JUnit results.)
R8 Full 18-gate spawn replication: redundant suites harm maintainability (Google TSE'22);
Trautsch 2019 finds no significant unit-vs-integration detection gap here; the static
wiring anchor covers the matrix mechanically.

## Consequences

docs/gates.json gains the requires field (impl round fills all 18 entries);
scripts/check-gate-params.js and check-ci-wiring.js assert the field set; a new
test/adr-0040-wiring.test.js carries the static anchor and the four spawn locks.
docs/deferred-registry.json gains defer-0008. CONTEXT.md gains the Gate Capability
Declaration and UNVERIFIABLE terms. The audit's intact-list: existing exit-2 usage inside
check-mr-probes/check-probes is already compatible with D3 and needs no migration.

## Sources (research of the grill round; fetched/verified)

systemd.unit(5) Condition verbs; systemd#31833; pytest exit codes + skip/xfail docs;
junitxml testmoapp + jarhalab; Bazel run/scripts + test-encyclopedia + #23878; sysexits.h
(FreeBSD); rust-cli exit-code chapter (panic=101); Rust check-cfg blog + book; Cargo
features; capabilities(7); OpenGL registry rules (rules.html) + Vulkan extensions;
GitHub Actions workflow commands; journald fields; go test -json; kubectl-conventions;
12-factor logs; RFC 9457; packtester; npm files-whitelist docs; Fowler TestPyramid;
Google SWE book ch11 (80/15/5); Google TSE'22 redundant-test harm; Trautsch 2019;
Namin & Andrews suite-size finding; Cristian exception taxonomy; Saltzer & Schroeder;
closed-world assumption (CWA/OWA/PCWA); object-capability (Dennis & Van Horn).
