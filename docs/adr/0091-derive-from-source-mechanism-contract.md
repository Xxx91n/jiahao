# ADR-0091: Derive-from-Source Mechanism Contract — Test Manifest, Sentinel Declaration Regions, Audit Checklist, Coverage Block, and Argv Retirement (grill-t34)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-09-30
- Ledger: `.scratch/grill-t34/decision-ledger.md` — D-001, D-002, D-004, D-005 (all current)
- Spec: `.scratch/grill-t34/spec-t34-derive.md` §2, §4, §6
- Forward supersession: t33 ledger D-004(iii)① — the hand-synced double-write
  residual form registered there is explicitly superseded by the derived
  surfaces this ADR registers (amendment naming, not implicit obsolescence).

## Context

The declared counts (README declaration sentences, the CI call-line literal)
and the audit re-run surface were hand-maintained: every suite-bearing change
demanded a manual, convention-only sync, and the drift class recurred (E-25;
the t34 baseline itself carried a live instance — a doc-phase commit citing a
new hash without a same-commit map regen, invisible to CI because CI had not
run since). Authority pattern: ADR-0043 Cluster-1 — a derived artifact's
authority = registration + generator + freshness check. No new authority
class is minted here.

## Decision

### D-A — The committed count manifest (single source)

`docs/test-manifest.json` is the committed derived count fact source
(lockfile pattern: committed, hand-edit forbidden, regenerate + diff). Two
independent channels: enumeration (`jest --listTests` — the suites count
derives here, never from JUnit: a JUnit-derived suites field is the forbidden
circular shape) and junit (the generator's blessed battery run via the
jest-junit-lite reporter; its tests attribute counts pending tests and is
tier-invariant). `scripts/build-test-manifest.js` is the generator;
`--check` regenerates and diffs with `generated_at` excluded (D-008 weak
self-consistency); `published_tip` pins origin/main under the established
re-pin rhythm.

### D-B — Sentinel declaration regions

The four declaration sentences (two in README.md, two mirrors in
README-zh-CN.md) became marker-sentinel generated regions owned by the same
generator (ADR-0043 D-B spliceRegion precedent: missing, inverted, or
duplicate sentinels fail closed). Count declarations are no longer
hand-editable surfaces; the zh-CN re-pin tax of ADR-0079 D6 continues to be
budgeted at every count regen.

### D-C — Argv retirement and the gate's dual-channel reconciliation

`run-test-gate.js` drops `--expected-suites` entirely; the registered
expectation is the committed manifest. The ci.yml call line is bare
`node scripts/run-test-gate.js` (same commit as the gate rewrite). Post-jest
the gate asserts collected == manifest on both channels (suites against the
enumeration channel, tests against the junit channel); the gate no longer
reads README — declaration checking is the static leg's job. The six wiring
pins of ADR-0057/0058/0080/0081/0082/0083 were re-anchored to the new form in
the same round (re-anchors, not new mechanisms); the manifest never enters
the package files list (ADR-0039 D3 headroom precedent, wiring-asserted).

### D-D — The static freshness leg and the masking-class kill

`check-test-manifest` (registered leg) recomputes the enumeration at gate
time and asserts both READMEs' sentinel regions equal the manifest-derived
text — independent of any jest result, so a red battery cannot hide
declaration drift and a green battery cannot hide a stale manifest (the E-25
fail-fast masking class dies here). Its output never implies battery status.

### D-E — The audit re-run surface: checklist, coverage block, surface leg

`scripts/build-audit-checklist.js` derives `docs/governance/audit-checklist.json`
from ci.yml via the shared zero-dep parsers (every job's ordered run lines);
`--check` regenerates and diffs. `emit` prints the checklist commands for
the auditor to paste into the report's machine-readable coverage block
(`<!-- audit-coverage v1 -->` + a fenced JSON array) and attest — the auditor
declares what they ran; the generator never co-signs result truth. The
`audit-surface` leg asserts the latest in-scope audit report's block is a
superset of the checklist; temporal scope follows commit-date effectiveness —
reports predating this ADR's landing (all t33 reports) are never
retro-convicted, and t34's own report is the first block-carrying report.

### D-F — Interim clause retirement

The AGENTS.md manual audit-self-consistency clause (t33 D-004(i)) retired in
the same commit as the mechanism it anticipated — no coexistence window. The
clause's pointer names this ADR.

## Registered transfers (floor, not ceiling)

The transfer-list items this round registered instead of absorbing (the
homogeneity test: same change class + same enforcement authority):

- defer-0078 — skip-attribution measurement protocol (R-6/LOOP-2 N-3), t35
  candidate;
- defer-0079 — claim-commit map pairing recipe;
- defer-0080 — R2-F4 exists_at leg;
- defer-0081 — F-11 dedupe/refactor of the shared CI parsers;
- defer-0082 — settle-window + advisory batch (t32 carry-over);
- defer-0083 — t27/t28 registration-surface asymmetry + errata_exemptions
  drift class (E-26 is a fresh instance of the same class).

Nothing registered may be silently dropped; new admissions pass the same
test.

## Boundaries

No count-equality assertions exist anywhere in the derived surfaces; totals
are outputs of the derivation, never registered literals. The blessed-run
trust is named: the manifest's junit numbers are true because the generator's
run is honest — the response is the two non-simultaneous assertion windows
(the static leg and the post-jest reconciliation), not an open window.
