# ADR-0057: Test-Layer Skip Honesty and Suite-Count Assertion

Status: Accepted
Date: 2026-09-10

References: ADR-0023 (degradation vocabulary), ADR-0034 (gate registry; D5
amendment handled via defer-0026), ADR-0040/0041 (three-state exit, exit-2
UNVERIFIABLE), ADR-0056 (the caller of this skip discipline).

## Context

Jest suites executed inside gate:all as the `test` gate (gates.json order 100)
until ADR-0058 (D-F/D-I) removed the gate and retired the slot; they now run in
the independent CI test job. Inside the aggregated gate output they had no
independent visibility: no per-suite account of skipped counts, no assertion
that the expected number of suites was collected. Jest's describe.skip carries
no reason parameter, and GitHub treats skipped jobs as Success (emmer.dev;
GitHub docs, Troubleshooting required status checks), so a silently swallowed
collection (bad config, `.only` residue, async-define swallowing) reads green.
The johal.in postmortem (GitLab CI 16.9: a rule change silently skipped 72% of
test jobs, the pipeline stayed green, and untested services shipped, ~$42k)
fixes the remediation pattern: the test gate asserts the JUnit suite count,
and absent result files fail the gate.

ADR-0040 gives the gate layer a rigorous tri-state; this ADR ports that
contract to the test-runner layer, where exit 2 does not exist. The runner-layer
equivalent of UNVERIFIABLE is: skip is a first-class, reason-carrying result,
skip counts are visible, and unexpected skips turn red.

## Decision

### D-A - Skip carries a verdict and a reason

Every skipped test goes through a shared helper that forces an explicit reason
string; bare `.skip` without a reason is forbidden. A static scan
(scripts/check-skip-reasons.js, registered in gates.json under the ADR-0027
same-commit coupling satisfied by this ADR) fails the run on any reason-less
skip. Precedents: pytest -rs, Rust #[ignore = "reason"], AuditBuffet AB-000302.

### D-B - Degradation must never fake green

When ADR-0056 D-C resolves a suite to tier `none`, that suite must report at
least one skipped test: a suite that executes zero tests and reports zero
skips is a test-authoring bug, not a pass. A wiring test locks this.

### D-C - The test gate asserts the suite count

Jest runs with JUnit output (via the existing gate wrapper), the `test` gate
asserts the collected suite count against a registered expectation, and
`--passWithNoTests` defaults to the fail-closed value. A silent collection
failure or skipping cascade fails the gate the same way the johal.in
test_gate.sh asserts expected suite counts.

### D-D - Independent test job deferred (defer-0026)

Splitting `test` into a CI job parallel to gate:all with an always() summary
job is deferred: it requires amending ADR-0034 D5 (single-entrypoint wording),
updating the check-ci-wiring.js blocklist, and evaluating defer-0004 (whose
presence condition a multi-job ci.yml would satisfy). defer-0026 is registered
in docs/deferred-registry.json with scripts/check-ci-jobs.js as verified_by.

Amended 2026-09-12 by ADR-0058 (D-F/D-G/D-H/D-I): D-D is activated. `npm test`
is split out of `gate:all` into an independent CI test job
(`JIAHAO_TEST_TIER=public`) with an `always()` success-only `summary` job
(`needs: [gate-all, test]`); the test gate (order 100) is physically removed
from `docs/gates.json` and the slot retired; ADR-0034 D5 is narrowed to the
gate layer. See ADR-0058 for the nine grill-round decisions.

## Rejected Alternatives

### Folding skip honesty into ADR-0056

Rejected. One ADR carries one decision family (Nygard; MADR "one AD per ADR";
Azure multi-phase split). Corpus tiers and skip honesty answer different
Context forces; ADR-0056 references this document instead.

### Splitting the CI job immediately

Rejected. Premature: ADR-0056/0057 land inside the existing test gate first,
then the single-entrypoint amendment stands on settled ground.

### Adopting the marketplace alls-green action

Rejected for the round that eventually lands D-D: a self-written always()
summary checking needs.*.result (GitHub discussion #26822) has no third-party
supply-chain surface; the dependency judgement is recorded here so the future
round does not re-litigate it.

## Consequences

- gates.json gains one gate (skip-reason scan) in the implementation round;
  the ADR-0027 same-commit coupling is satisfied by this ADR.
- New glossary terms: Skipped-Is-A-Verdict, Unskippable Summary,
  Suite-Count Assertion. CONTEXT.md updated.
- defer-0026 enters the deferred registry (yearly cadence).

## Acceptance

- This ADR exists and is listed by the generated README ADR index.
- CONTEXT.md contains the new glossary terms; defer-0026 is registered and
  passes the deferred gate.
- No source or gate file is changed in this document round.
- The handoff task book carries the implementation scope and verification
  closure for the next round.

## Post-audit 2026-09-11 (two-axis review + industry research)

- Found: `check-skip-reasons.js` exempted the reason-forcing choke point by
  matching message text; rewording the message would silently disable the
  exemption. Fixed: rules carry stable `id`s and the exemption keys on id.
- Found: README suite/test counts were stale (35/36 suites, 518/527 tests);
  updated to 48 suites / 647 tests so the committed metric matches the
  suite-count gate.
- Citation-strength note: the pytest precedent cited for skip reasons is a
  *convention* (`reason` is optional there), not a hard gate; Jest itself has
  no fail-on-skip (jest#8321, closed unimplemented). This gate fills a real
  industry gap; the rationale stands, the citation strength is downgraded.
- Industry check (atomcode research): the static `.skip/.only` scan overlaps
  ~80% with eslint-plugin-jest `no-disabled-tests`/`no-focused-tests`, and a
  40-line hand-rolled JUnit reporter overlaps jest-junit. Both swaps were
  considered and rejected: this repo has no ESLint toolchain and keeps a
  zero-extra-dependency, minimal-supply-chain constraint (same rationale as
  rejecting alls-green in D-C). The reason-enforcing helper +
  tier-required-skip semantics have no industry wheel at all.
