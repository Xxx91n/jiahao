# ADR-0030: Probe Corpus Growth Constraint — Interval Coverage Gate + Judge Reverification Runbook + Dead-Man Degradation

- Status: Accepted
- Date: 2026-08-29

## Context

ADR-0029 D3 pre-registered a growth rule for the behavioral probe
corpus: human-confirmed misses/false positives (ADR-0017 escalation)
append a corresponding probe, and either side graduating to >= 30 items
upgrades to a statistical gate. The audit of ADR-0029 surfaced a
mechanical conflict: bench/polygraph/check-probe-corpus.js enforces
"exactly once per side per iron law" (the law-dup invariant), so the
very first real growth event would fail the schema gate. The growth
rule was dead on arrival.

In the same round, the first 6-month re-verification deadline of the
judge seam (ADR-0025 D3) is falling due, with no operationalized
schedule. The generator profile's 3 advisory rules (ADR-0001/0003)
remain in a philosophical limbo: explicitly excluded from probing
(ADR-0029 D5) but never formally dispositioned.

Research basis (atomcode, two serial passes, 33 sources): Protobuf
Editions, Confluent Schema Registry check-before-accept, semver 0.x,
K8s alpha API policy, Rails schema.rb, Flyway/Alembic baseline,
MISRA C amendment/deviation, PEP 387 deprecation, Python __future__
MandatoryRelease, CA/B Forum 460-day certificate expiry, K8s PDB
budget semantics, SOC2 continuous evidence, promptfoo drift guard,
Fowler/Beck YAGNI adjudication. Key structural finding: the check
script and the corpus live in the same repo, same commit (ADR-0027),
same CI run — there are no distributed consumers, so distributed
schema-evolution machinery (Editions, Registry compatibility gates)
solves a problem domain this project does not have.

## Decision

### D1 Corpus growth enabled: interval coverage replaces exactly-once

check-probe-corpus.js drops the law-dup ("exactly once per side per
law") invariant. The existing coverage loop already enforces "at
least one per side per law", which becomes the coverage contract:
count(kind, law) >= 1. The global id uniqueness key is retained — it
is the anchor for any future compatibility gate. New probes for an
already-covered law carry a variant suffix in their id
(e.g. IL3-v2-...), mirroring MISRA amendment numbering rather than
reclaiming an older slot. A corpus structural floor is registered in
bench/polygraph/thresholds.json (probe_gates family, source_adr: 0030)
so deletion-driven shrinkage below the floor is caught by the gate.
probes.jsonl itself is untouched: all 14 existing items already
satisfy the relaxed constraint (zero data migration).

`schema_version` stays "1.0". It describes the data format, not the
checker policy; a policy change is an ADR-witnessed change
(ADR-0027 same-commit coupling is the check-before-accept this
project already has).

### D2 Deferred items with explicit unfreeze conditions (zero code)

- Schema-version dispatch (v1/v2 dialect gating, Protobuf Editions
  shape): unfreezes only when the first out-of-repo consumer appears.
- Git-history additive-only compatibility gate (Schema Registry
  shape): unfreezes when either side reaches >= 10 items or the first
  field-semantics dispute occurs; on adoption, baseline-stamp the
  current HEAD (Flyway baseline precedent), never retro-audit, and
  pre-declare the shallow-clone CI history-depth requirement.

### D3 Judge re-verification runbook (D of the combined round)

An executable runbook `npm run reverify` (scripts/reverify.js, thin
CLI + pure core, ADR-0029 D4 shape) runs the frozen judge-twins
corpus, recomputes the 4 telemetry metrics of ADR-0025 D3 with Wilson
intervals and the STALE count, and emits
bench/polygraph/results/reverify-YYYYMMDD.json. Human reads the
summary and commits the artifact; the first run also freezes the
baseline for promptfoo-style apples-to-apples delta comparison.
Evidence ledger: bench/polygraph/reverify-ledger.json, append-only,
chained entries {prev_hash, collected_at, metrics, conclusion,
adr_ref} reusing the ADR-0013/0026 hash-chain discipline. A re-verification
that changes thresholds/frequency/interval must anchor its numbers to
ADR text via the ADR-0027 content-anchor mechanism and ship in the
same commit as the ADR amendment (registry + derived config +
deviation-needs-ADR three-layer structure). A local git-hook warning
(pre-commit, warning-only per ADR-0027 alarm-fatigue discipline) fires
when a commit touches judge/bench files while the latest ledger entry
is older than 6 months. Deadlines are calendar events, not readiness
events (Rust release-train discipline): no silent extension.

### D4 Dead-man switch: degradation on schedule breach

Following Python __future__ MandatoryRelease (machine-readable
definite date, append-only, programmatically checkable) and the CA/B
Forum 460-day certificate expiry precedent (a deadline without
structural consequence changes no behavior — cf. Node EOL downloads):

- 6 months past last re-verification: soft — the reverify runbook and
  hook emit a warning banner.
- 9 months: hard — the judge seam degrades to advisory-only for
  hook-tier hosts (verdict-gate hook returns advisory semantics);
  instruction-tier hosts are already advisory-only (ADR-0028 D6).
  The banner states the recovery condition: complete the ADR-0030 D3
  re-verification and commit reverify-<date>.json.
- Bypass closure (K8s PDB semantics): the degradation state lives in
  a content-anchored artifact, so deleting state files to silence the
  switch is itself caught by the ADR-0027 anchor guard.

### D5 Generator profile disposition (MISRA Compliance:2020 shape)

The 3 advisory surface-signal rules of the generator profile are
formally dispositioned: applied, not measured, not gated, not probed.
Rationale: MISRA Advisory semantics (disapplication must be recorded,
not measured) and RFC 2119 SHOULD (deviation requires understanding
and weighing, not instrumentation). The ADR-0029 D5 pre-registered
upgrade channel (accumulated real violations + benign assets +
coupling guard) remains the only promotion path. No observability
surface is built; Goodhart evidence (MAC-Bench) says measuring
advisory compliance corrupts it.

## Consequences

- The ADR-0017/0018 calibration flywheel's first real growth event is
  now mechanically executable.
- The judge seam's long-term validity is defended by a runbook +
  ledger + hook + dead-man switch, all zero-new-dependency.
- Deferred items (D2) carry explicit unfreeze conditions so future
  reviews do not re-litigate them without new facts.

## Rejections

- R1 Edition-style schema_version dialect dispatch now: protects
  distributed artifacts/jiahao has none (Buf: "Most Protobuf users
  should ignore Editions"); adds a permanent 2x constraint-maintenance
  surface and a fail-open/fail-closed fork on unknown versions.
- R2 Git-history incremental compatibility gate now: first external
  tool dependency in a zero-dependency project; 4-5 new failure faces
  (shallow-clone CI, first-commit baseline, rename false positives,
  worktree-vs-HEAD drift); the gate's premise (existing producers and
  consumers) is absent.
- R3 semver discipline on schema_version: compatibility obligations
  start at a declared, consumed API; a 14-item unconsumed corpus is
  0.x.
- R4 Pre-writing data migration for old corpus entries: all 14 pass
  under the relaxed constraint; K8s alpha policy owes no migration.
- R5 A standalone coverage-count gate: the structural floor folds
  into probe_gates; a separate gate duplicates it.
- R6 CI-hosted or profile-embedded re-verification scheduling: no
  trusted remote CI executor exists; instruction-tier hosts do not
  self-run meta-checks; a local runbook + hook is the honest execution
  surface.
- R7 Any measurement of the generator advisory rules: MISRA/RFC 2119
  disposition-recording is the mature answer; measurement invites
  Goodhart corruption.
