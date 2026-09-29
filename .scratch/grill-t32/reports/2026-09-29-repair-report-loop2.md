# grill-t32 audit-repair loop-2 report — 2026-09-29

Trigger: loop-2 re-audit (`2026-09-29-reaudit-report.md`) confirmed all wave-1/2
claims TRUE and returned two findings + two observations. Owner adjudicated
both routes:

- R2-F1 -> correction-append + E-24 errata (predicate fix + fixture test either way)
- R2-F2 -> plain registration without `--successor`

## Disposition

| Finding | Disposition | Evidence |
|---|---|---|
| R2-F1 annotate predicate admitted a live null-snapshot blob (ab92813e41f7…) | Predicate now keys degraded = `object_purged_at` set (orphan-cites.js ~L404); correction append removes errata_ref from the entry's latest view (append-only, original E-22 copy stays in history); E-24 documents the mis-annotate; battery gains a live-null-snapshot regression case | `oc.cmdAnnotate` fixture test; `node scripts/orphan-cites.js check` OK (468 entries) |
| R2-F2 pre-reword sha `b83c39cf` cited 4x by repair artifacts | `orphan-cites.js register b83c39cf --reason …` (no `--successor` — D-009 author+subject is correctly fail-closed against a reworded commit); row now `orphaned-cite`, permanently settled | `register` appended; map row orphaned-cite |
| R2-F3 report printed `--check` 3618 vs settled 3624 | Standing correction in E-24 (same self-referential drift class as E-23): settled figure = 3624 at `lus` | `--check` re-run |
| R2-F4 exists_at equality-exempt clock-basis forgery | Observation logged to grill-t33 candidates (E-24 tail); no code change in this window | E-24 |

## Loop-2 deviations disclosed

- The correction append means the registry's E-22-linked population is
  count-correct in latest view (187) while history retains the 188th copy —
  the disclosure lives in E-24 item 1, not in a rewrite.
- Wave-4 closeout: this report + ERRATA E-24 + registry appends +
  reaudit report/handoff (auditor claim files) land in one commit with the
  map regenerated last (index-visible ordering, E-17/E-19 discipline).

## Acceptance re-run (loop-2 settled tree)

- `npx jest`: 89/89 suites, 1571/1571 tests green (battery now 21 cases)
- `node scripts/build-rewrite-map.js --check` / `--published-only`: OK
- `node scripts/check-orphan-registration.js`: OK (468-entry registry consistent)
- `node scripts/check-map-freshness.js` / `check-anchoring-footer.js`: green
- `npm run pack:smoke` / `node scripts/install.js --help`: green
- `node scripts/run-gates.js`: exit 0, 4 ci-mode UNVERIFIABLE (registered degrade)
