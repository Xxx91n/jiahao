# grill-t32 loop-2 audit handoff — 2026-09-29

Re-audit of the audit-repair window on `grill-t32-docs` (3 commits:
wave-1 spec gaps+hygiene+errata+annotate, wave-2 D-007/8/9 semantics,
wave-3 closeout). Loop-2 report: `.scratch/grill-t32/reports/2026-09-29-reaudit-report.md`.
Examiner captures: `.scratch/grill-t32/audit-evidence/rerun/loop2-reaudit-2026-09-29.txt`
(never-commit, nc-001).

## Verified state

- Acceptance: all repair-closeout claims re-verified TRUE — jest 89/89 &
  1570/1570 (battery 20), --check/--published-only 3624, orphan-registration
  OK (466), map-freshness 13, anchoring 91, pack:smoke 437949B, run-gates
  exit 0 (4 ci-mode UNVERIFIABLE, registered degrade).
- Commits: +3 on the audited 14; ANCHORING derived+MATCH 17/17; no push.
- R1–R6: all disposed (F-11 correctly deferred as registered observation).
- D-007/8/9: all `current` in ledger; ADR-0089 + spec SS3.3 synced;
  D-003(iv) revised-by-D-009 marker present with original text preserved.

## Findings for owner adjudication (loop-2)

- R2-F1 annotate predicate hole: live blob (snapshot:null, no purge mark)
  received an E-22 copy — one-off over-annotation; append-only means the
  correction is itself an append or an erratum, plus predicate fix
  `!e.object_purged_at -> skip` and a null-snapshot-live fixture test.
- R2-F2 pending orphan obligation: pre-amend wave-1 sha cited 4x in committed
  claim artifacts — live, unreachable, unregistered; stage-3 ~2026-10-20.
  Note: --successor fails closed (subject reworded by the amend), so the
  route is plain registration or an errata-exempt pin.
- R2-F3 recurrence note: repair-report printed --check=3618 vs settled 3624
  (claim-file self-referential count drift, same class as F-4).
- R2-F4 observation: exists_at qualifier is forgeable via committed-map edit
  and carried forward; sanity-bounding it is a future-leg candidate.

## Next grill direction (suggestion, not adjudication)

grill-t33 candidate scope: (a) R2-F1/R2-F2 repair round — annotate predicate
fix + superseding/errata route for the live-blob copy + b83c39cf disposition;
(b) settle-window leg + advisory-leftovers batch (from loop-1 handoff);
(c) exists_at sanity bound (R2-F4) if owner wants the clock anchored.
Owner-side tides unchanged: ADR-0089 countersign 2026-12-15; F-11 refactor
observation; t27/t28 audit-handoff asymmetry; errata_exemptions drift.

## Non-authority notice

This handoff reports verified state and suggested direction; seals, verdicts,
and repair authorization remain owner acts.
