# grill-t32 loop-3 audit report — wave-4 repair — 2026-09-29

Audited object: lane `grill-t32-docs` wave-4 commit `48174321` (but id oxo) —
repair of loop-2 findings R2-F1..F-4. Lane now 18 commits (14 audited + 4
repair waves). Loop-2 audit: `.scratch/grill-t32/reports/2026-09-29-reaudit-report.md`.
Repair claims: `.scratch/grill-t32/reports/2026-09-29-repair-report-loop2.md`
+ owner message.
Examiner captures: `.scratch/grill-t32/audit-evidence/rerun/loop3-reaudit-2026-09-29.txt`
(never-commit, nc-001). Verdicts/seals stay owner-side.

## 1. Acceptance re-run (settled tree, post wave-4)

| Leg | Claimed | Re-run | Result |
|---|---|---|---|
| `npx jest` | 89/89, 1571/1571 | **89/89, 1571/1571** (608.8s; battery 21 cases incl. new live-null-snapshot regression) | TRUE |
| `--check` | 3636 | OK: 3636 doc citations in sync | TRUE |
| `--published-only` | OK | OK: 3636 covered, ancestry vs origin/main | TRUE |
| `check-orphan-registration` | OK | OK: no over-grace unregistered; registry consistent | TRUE |
| `orphan-cites.js check` | 468 | OK (468 entries) | TRUE |
| `check-map-freshness` | 14 commits | OK: 14 claim-surface commits tree-internal | TRUE |
| `check-anchoring-footer` | 92 | OK: 92 post-registration commits | TRUE |
| `pack:smoke` | 438029B | OK: 438029 < 470000B | TRUE |
| `install.js --help` | exit 0 | exit 0 | TRUE |
| `run-gates.js` | exit 0, 43 legs, 4 UNVERIFIABLE | exit 0; same 4 ci-mode legs | TRUE |
| ANCHORING wave-4 | — | derive --commit MATCH (18/18 lane) | TRUE |

## 2. Loop-2 finding disposition (claim → evidence)

- **R2-F1 annotate predicate**: claim = predicate keys degraded on
  `object_purged_at`. Verified: `orphan-cites.js` ~L405 reads
  `if (!e.object_purged_at) continue` with an E-24/R2-F1 comment;
  `ab92813e41f7…` carries a correction append (2026-09-29T04:17:30Z)
  restoring latest-view errata_ref=null — 3-entry append-only history intact;
  `annotate --dry-run` now reports 0 pending; battery +1 at
  test/orphan-cites.test.js:321 ("annotate skips live null-snapshot entries").
  E-22-linked latest-view population = 187, matching E-22's own scope text.
  **LANDED.**
- **R2-F2 pre-reword sha**: claim = plain registration, no --successor.
  Verified: registry entry for `b83c39cf` (disp orphaned, live snapshot,
  successor_sha=null, reason documents supersession by `951ccf8d` via
  but reword); every map cite of the sha now classifies `orphaned-cite` —
  terminal, stage clock permanently quieted. D-009's fail-closed refusal of a
  reworded successor confirmed in the disclosed route. **LANDED.**
- **R2-F3 figure drift**: E-24 item 3 corrects 3618 → 3624 (self-referential
  claim-cite class, same as E-23). **LANDED.**
- **R2-F4 exists_at bound**: logged in E-24 tail as grill-t33 candidate; no
  code change, as adjudicated. **DISPOSED (deferred).**

## 3. Registry integrity spot-checks

- 468 entries = 466 + correction append + b83c39cf register; append-only
  preserved (no entry mutated or dropped).
- validateRegistry/leg clean; 282 unique cited shas; backfill dry-run shows
  0 pending (282 registered + 463 still-reachable + 0 errors).
- Every loop-2 claim-file cite (reaudit report/handoff, repair report loop-2,
  ERRATA E-24) resolves to a classified map row — no unregistered orphans.

## 4. Process notes

- Wave-4 bundles fix + E-24 + registry appends + auditor claim files + map
  regen-last in one commit — E-17/E-19 ordering respected (map covers the
  claim cites it is committed with; map-freshness leg green).
- ANCHORING footers: 18/18 lane commits derived+matched.
- Minor: the owner-facing closeout message says "lane 共 17 提交"; the lane
  holds 18 (14 audited + 4 waves). Message-level slip only — no committed
  artifact asserts the count.
- No push; no hidden rewrites; deviations disclosed in E-24.

## 5. Conclusion (state, not verdict)

All wave-4 claims re-verified TRUE on the settled tree. Both owner-adjudicated
routes (correction-append + E-24 for R2-F1; plain registration for R2-F2)
landed correctly and honestly. No new defects found. Outstanding owner-side:
ADR-0089 entity-level countersign (2026-12-15 tide); R2-F4 exists_at
sanity-bound leg and F-11 refactor — registered grill-t33 candidates.
