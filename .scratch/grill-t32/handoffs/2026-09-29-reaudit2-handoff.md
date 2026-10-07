# grill-t32 loop-3 audit handoff — 2026-09-29

Re-audit of wave-4 (loop-2 repair) on `grill-t32-docs` — 18 lane commits total.
Report: `.scratch/grill-t32/reports/2026-09-29-reaudit2-report.md`.
Captures: `.scratch/grill-t32/audit-evidence/rerun/loop3-reaudit-2026-09-29.txt`.

## Verified state

- Wave-4 claims all TRUE on the settled tree: jest 89/89 & 1571/1571
  (battery 21), --check/--published-only 3636, registry 468 consistent,
  map-freshness 14, anchoring 92 (+ wave-4 derive MATCH), pack:smoke 438029B,
  run-gates exit 0 (4 ci-mode UNVERIFIABLE, registered degrade).
- R2-F1: annotate predicate keys `object_purged_at`; ab92813e latest view
  corrected via append-only correction; E-24 discloses; regression test at
  test/orphan-cites.test.js:321.
- R2-F2: b83c39cf registered plain (no successor — D-009 correctly
  fail-closed on the reworded commit); cites classify orphaned-cite; settled.
- R2-F3: E-24 item 3 corrects 3618 → 3624.
- R2-F4: deferred to grill-t33 candidates (E-24 tail), as adjudicated.
- No new findings this loop. The audit↔repair convergence held: every defect
  surfaced by audit is now either fixed, adjudicated-deferred, or
  standing-corrected in ERRATA.

## Next grill direction

grill-t33 candidates (all registered, owner picks):
- exists_at sanity-bound leg (R2-F4) — bound first-seen stamp vs commit
  times so committed-map qualifier edits cannot reset the stage-3 clock.
- F-11 generator/facade helper dedupe + build-rewrite-map.js refactor batch.
- Settle-window leg + advisory-leftovers batch (carried from loop-1).
- t27/t28 audit-handoff asymmetry; errata_exemptions bare-sha drift.
Owner-side tides: ADR-0089 entity countersign 2026-12-15.

## Non-authority notice

State report only; seal/verdict/push authorization are owner acts.
