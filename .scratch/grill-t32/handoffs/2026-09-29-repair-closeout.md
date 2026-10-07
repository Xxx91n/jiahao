# grill-t32 audit-repair closeout — 2026-09-29

Repair window for the second-party audit (`2026-09-29-audit-report.md`).
Disposition table + evidence: `2026-09-29-repair-report.md` (same dir tree).

## State

- Lane `grill-t32-docs`, two repair commits on top of the audited 14:
  `b83c39cf` (wave-1: R1–R4 spec gaps + R6 hygiene + E-22/E-23 errata +
  annotate verb + 188 errata_ref appends) and wave-2 (R5 adjudicated
  semantics: D-007 unageable first-seen clock, D-008 committed-map
  consistency, D-009 author+subject successor invariants).
- All R1–R6 routed findings disposed; F-11 (generator/helper refactor)
  deferred as a registered observation, not silently dropped.
- Acceptance re-run on the settled tree: jest 89/89 & 1570/1570, --check /
  --published-only / orphan-registration / map-freshness / anchoring green,
  pack:smoke + install liveness green, run-gates exit 0 (4 ci-mode legs
  UNVERIFIABLE by capability design).
- Decision ledger: D-007/008/009 `current` (owner-adopted 2026-09-29);
  D-003(iv) annotated revised-by-D-009.

## Disclosed deviations (repair round)

- E-19 instance: wave-1 initially committed while an audit-report temp-path
  hex segment (`fc14edf…`) registered as an uncovered cite — caught by the
  new committed-map consistency check + map-freshness leg, repaired via
  degraded backfill + amend into wave-1. Disclosed in the repair report.
- Mechanism-output drift `bench/research/out/g6-publish-replay.json` left
  uncommitted (gate-run side effect, same as prior rounds).

## Owner-side / next window

- ADR-0089 entity-level countersign: 2026-12-15 tide.
- Deferred observations: F-11 refactor batch; errata_exemptions bare-sha
  drift (tide-bound); t27/t28 audit-handoff asymmetry.
- Suggested next grill direction per audit handoff: settle-window leg +
  advisory-leftovers batch (grill-t33 candidate).

## Suggested skills for the next session

- `$implement` — next repair/impl round.
- `$grill-me` / `$grill-with-docs` — if a fresh grill round follows.
- `[$but]` (gitbutler) — all version control; allowlist + derived footer.
- `code-review` — dual-axis recheck of repair diffs.
- `atomcode-research` — external lookups / adjudication research.

## Non-authority notice

This closeout reports state and disposition; verdicts (seal, merge,
adjudication of outstanding items) remain owner acts.
