# ADR-0056: Test Corpus Tiering and Clean-Clone Integrity

Status: Accepted
Date: 2026-09-10

References: ADR-0027 (pre-registered coupling guard, D9 fingerprint discipline),
ADR-0033/0035 (deferred registry), ADR-0038 D2 (runtime-artifact surface boundary:
the private corpus is a maintainer/CI asset and never enters the published clone),
ADR-0040/0041 (capability declaration, exit-2 tri-state), ADR-0056's sibling
ADR-0057 (test-layer skip honesty).

## Context

Eight Jest suites (test/adr-0030, adr-0031, adr-0033, adr-0036, adr-0037,
detector, probe-gate, judge-seam) read the maintainer-private bench corpus
directly (bench/polygraph/results, mr-artifacts, private/bench-corpus).On a
fresh clone `npm test` fails in all eight while passing 139/139 in the
maintainer working directory. The gate layer already degrades honestly
(ADR-0040: absent `bench-corpus` capability -> exit 2 -> UNVERIFIABLE), but
those suites bypass run-gates entirely, so a clean clone is red instead of
degraded. This contradicts the published capability contract.

Six serialized atomcode research rounds (2026-09-10) established the
industrial shape: the successful projects run TWO tiers, a public committed
fixture tier and a private full tier (SQLite TH3, LLVM External/, BIG-bench
Lite, Go all.bash -short seeds). Skip-only degradation (option A1) triggers
two documented anti-patterns: GitHub treats skipped jobs as Success
(emmer.dev, GitHub docs) and reason-less skips decay into
never-anywhere-executed tests (promethyn skip-sweep, AuditBuffet AB-000302).
Committing the full corpus as the only tier (option A2) would violate
ADR-0038 D2 and create a second truth drifting from the private corpus
(Multigrid fixture-drift failure mode).

## Decision

### D-A - Test-capability probe

test/helpers/corpus-gate.js exports resolveCorpus() returning a three-valued
`{ tier: 'full' | 'public' | 'none' }`, reusing the probe semantics of
src/shared/capability.js ('bench-corpus' presence) extended with public-fixture
presence. A resolution is computed once per suite, before any corpus read.

### D-B - Public fixture corpus

A minimal, deterministic, in-house-authored fixture corpus is committed under
test/fixtures/corpus/: one to two items per category including an explicit
nasty-row catalogue, with a SHA fingerprint recorded alongside (ADR-0027 D9
discipline applies: a dataset change requires re-baselining the fingerprint).
The content is authored, not redacted from the private corpus, keeping the
license boundary clean (BIG-bench licensing lesson).

### D-C - Tiered execution of the eight suites

Each corpus-dependent suite branches on resolveCorpus(): tier `full` runs
against the private corpus; tier `public` runs against the committed fixtures
(a real execution, a real green); tier `none` skips through the ADR-0057
reason-carrying skip helper. No suite may read the private corpus without a
tier resolution first.

### D-D - Maintainer-side full-tier recurrence

On the maintainer host (or any host holding the private corpus), a recurring
full-tier run compares fixture-tier and full-tier outcomes and reports drift;
the fixture fingerprint is its anchor. This is the TH3-shaped counterpart to
the public tier: the public tier proves clean-clone integrity, the full tier
remains authoritative.

## Rejected Alternatives

### Skip-only degradation (A1)

Rejected. Runs into the skipped=success trap and reason-less skip rot; the
publishable contract becomes "we never verify on a clean clone".

### Committing the full corpus as the single tier (A2)

Rejected. Violates ADR-0038 D2 and creates fixture drift between a synthetic
copy and the authoritative private corpus.

### Deferring clean-clone integrity until CI is multi-job

Rejected. The defect is user-visible today; the CI topology question
(independent test job) is tracked separately by defer-0026 in ADR-0057 D-D.

## Consequences

- A fresh clone runs the corpus-dependent suites against the public fixtures
  and is genuinely green; only the pathological "both tiers absent" case
  degrades, and it degrades loudly (ADR-0057).
- New maintenance artifact: the fixture fingerprint and its re-baseline duty.
- New glossary terms: Corpus Tier, Public Fixture Corpus. CONTEXT.md updated.
- Imposes the ADR-0057 skip-discipline contract on tier `none`.

## Acceptance

- This ADR exists and is listed by the generated README ADR index.
- CONTEXT.md contains the new glossary terms.
- No source or gate file is changed in this document round.
- The handoff task book carries the implementation scope and verification
  closure for the next round.

## Post-audit 2026-09-11 (two-axis review + industry research)

- Found: `corpus-tier-drift.js` only compared counts and demoted an inverted
  outcome (public passing more than full) to a log note. Fixed: an inverted
  outcome is now DRIFT (exit 1), and the suite list is derived from every
  test file requiring `test/helpers/corpus-gate`, so a newly tiered suite can
  no longer escape the recurrence gate.
- Found (scope creep, removed): the round accidentally committed maintainer
  run artifacts (`bench/polygraph/results/metrics-*.json`,
  `probe-metrics-*.json`, `mr-artifacts/*`); removed - the private corpus
  contract (ADR-0038 D2) keeps run residue out of the published clone.
- Industry check (atomcode research): no library provides corpus tiering +
  SHA fingerprints + downgrade-only env override; the pattern is golden-file
  culture (Jest snapshots, insta, cupaloy) applied to input corpora - the
  hand-rolled resolution is the minimal correct shape.
