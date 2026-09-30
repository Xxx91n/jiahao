# grill-t33 audit handoff — 2026-09-30 (second-party audit window → next grill)

Audit window completed the owner-authorized completion loop (direct-fix small
findings → loop-audit → land+push → cleanup → this handoff). This doc is the
pickup point for the next grill round (t34 direction candidates at the end).

## Context restore (read in this order)

1. `D:\Aworker\jiahao\.scratch\grill-t33\reports\2026-09-30-report.md` — fix-window
   report **+ LOOP-3 Addendum** (authoritative round state: R-7, R-6 closure,
   wave-1 tree-repair disclosure with full sha mapping, declared settled-tree verdicts).
2. `D:\Aworker\jiahao\.scratch\grill-t33\reports\2026-09-30-audit-report.md` — LOOP-1
   audit (F-1..F-9, R-1..R-6 rework list, O-1..O-3 owner decisions).
3. `D:\Aworker\jiahao\.scratch\grill-t33\reports\2026-09-30-reaudit-loop2-report.md` —
   LOOP-2 re-audit (per-item verdicts, N-1..N-3 process notes).
4. `D:\Aworker\jiahao\.scratch\grill-t33\handoffs\2026-09-30-closeout.md` +
   `D:\Aworker\jiahao\.scratch\grill-t33\handoffs\baseline.md` — closeout notes, T-0 recon.
5. `D:\Aworker\jiahao\.scratch\grill-t33\decision-ledger.md` +
   `D:\Aworker\jiahao\.scratch\grill-t33\spec-t33-correction.md` — D-001..D-004 authority chain.
6. `AGENTS.md` t33 clauses (countersign-queue authority, baseline-CI, audit self-consistency D-004(i)).

Lane: `grill-t33-docs` on base `754e53c2` (grill-t32 post-land rewrite-map regen,
origin/main at round start). Final wave shas + the amend disclosure live in the
fix-report Addendum; do not re-derive them.

## What the completion loop changed (beyond the fix window's waves)

- R-7: declared counts 1579→1580 at the four declaration points; adr-0074
  published_tip re-pin 68fb225b→754e53c2 (disclosure chain appended).
- R-6 closed as wording-true-for-scope; skip-count variance series 11/3/7/0
  recorded as environment-dependent; declared number unchanged (D-001 negative req).
- Wave-1 received a disclosed tree amend (wave-1-exact rewrite-map generated in a
  temporary worktree at that tree, sim-verified 0 errors) + footer reword 6→7
  files — the D-005 post-restack ritual, per the "not silently amended" convention.
- Wave-4 (content repairs) and wave-5 (claim surfaces + covering map, landed via
  the same disclosed commit-then-amend mechanics) close the round.

## Verification contract for the next window

Settled-tree gates must be green before any new claim work:
`node scripts/run-gates.js` (exit 0; ci-mode legs `ci-wiring`/`bench-gate`/
`probes`/`mr-probes` stay UNVERIFIABLE locally — keep them distinct from PASS),
`node scripts/run-test-gate.js --expected-suites 90` (exit 0, 1580 total),
`node scripts/build-rewrite-map.js --check` + `--published-only`,
`node scripts/check-map-freshness.js`, `node scripts/check-anchoring-footer.js`.
Evidence captures live under `.scratch/grill-t33/audit3-evidence/`
(never-commit, nc-001). After landing, public CI is the institutional evidence
surface; the tip run at round start was red (`36530594835`, failing step =
run-test-gate README count assertion — E-25), so the first green run after
landing is itself a registered milestone.

## t34 direction candidates (ranked)

1. **Declared-count single source (defer-0076, review 2026-10-15)** — generator-side
   derivation of the README declared counts so the E-25 drift class (battery total
   vs declared count) cannot recur; this round's R-7 is the second instance.
2. **R-6 measurement protocol (LOOP-2 N-3)** — environment-controlled skip
   attribution (public-clone simulation + ci-mode simulation, per-suite/per-test
   skip reporting) to mechanize the "skips 7 corpus-bound tests" claim surface.
3. **Audit-surface mechanization** — generated checklist that always includes the
   full CI test-job command surface; retires the interim D-004(i) manual clause.
4. **Claim-commit map pairing recipe** — the map scan enumerates index/HEAD files
   only, so claim commits need commit-then-amend mechanics (hit in wave-1 and
   wave-5); document the recipe or add generator support for a staged-content scan.
5. **Post-land re-pin follow-up (t32-land pattern)** — once this round lands,
   origin/main advances past `754e53c2`: the map published_tip and the adr-0074
   pin will need the standard post-land regen + re-pin in a follow-up commit.

6. **Countersign rejection pre-registration (registered transfer, t33 D-001(c))** —
   pre-register the reject-branch exit semantics (ADR-0090 carrier): non-retroactivity,
   disposition menu as default floor, status transition, and the countersign-overdue
   ratchet leg. *(added 2026-09-30 by the t34 E-26 repair — this row was omitted from
   the original registered candidate list; see ERRATA E-26; original ranking untouched)*

## Suggested skills

- `$grill-with-docs` (or `$grill-me`) to open t34 from the candidates above.
- `$but` for lane operations (commit allowlists + derived `[ANCHORING]` footer,
  `but land --yes` for landing, `but pull` for merged-lane cleanup).
- `$code-review` for the next second-party audit pass.
- `$handoff` again at t34 close.

## Owner-only acts remain (grill-t29 F-7)

Errata adjudication, re-seal authorization, trigger interpretation, waiver
issuance. The agent reports state; it never issues these verdicts.
