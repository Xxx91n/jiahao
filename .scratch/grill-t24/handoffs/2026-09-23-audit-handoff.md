# grill-t24 audit handoff - PENDING AUDIT (2026-09-23)

Round report: `D:/Aworker/jiahao/.scratch/grill-t24/reports/2026-09-23-report.md`
Round evidence: `D:/Aworker/jiahao/.scratch/grill-t24/evidence/` - verbatim captures under the `captured-at-head` provenance header.
Auditee branch: `grill-t24-docs` (base `c526de3`), local-only, never pushed.

## Mandatory scope lines (ADR-0083 D-E - audit-window inheritance)

This audit window MUST include all three check lines in scope and record a
verdict for each (first live firing is registered as `defer-0069`):

1. **evidence-freshness ordering check** - for every committed capture in
   `.scratch/grill-t24/evidence/`, the `captured-at-head` sha must be
   at-or-after the freshness anchor (the last commit whose diff touches
   anything outside {evidence dir, faithful mechanism-output regenerations}).
   Mechanical form: `test/adr-0083-wiring.test.js` ordering pin +
   `git merge-base --is-ancestor <anchor> <header-sha>`.
2. **never-commit label coverage** - every path class labeled never-commit
   is carried by a `docs/governance/never-commit.json` rule (id-referenced),
   and no committed tree path outside the enumerated LEGACY set matches an
   active rule. Rerun: the `never-commit-sweep.txt` leg + the wiring suite's
   tracked-tree leg.
3. **commit file-list conformance** - every round commit's
   `git show --name-only` output vs the declared allowlist in its message/
   ledger row; any mismatch is a disclosed incident, not a silent fix.

## What to verify live

- `node scripts/run-test-gate.js --expected-suites 78` (suite-count sync;
  the wiring suite asserts the ci.yml literal equals the live glob).
- `node scripts/check-governance-inventory.js --coverage-base c526de301c5d2d25e653bc910a80a9ae56dd252a`
- `node scripts/build-rewrite-map.js --check` / `build-governance-anchors.js --check` / `build-round-facts.js --round grill-t24 --check --report <report>` / `build-adr-index.js --check`.
- `node scripts/check-pack-smoke.js` + the liveness chain in `liveness.txt`.
- `node scripts/check-deferred.js` (63 entries; defer-0069 pending-evaluation).

## Carry-forward / standing

- `defer-0069` discharges when this audit names the three lines + verdicts.
- `defer-0068` rides to the 2026-12-15 tide (second-reviewer countersign).
- `defer-0066` instances 1-3 open.
- Burn-rate advisory: prefer R3 surfaces next round.

