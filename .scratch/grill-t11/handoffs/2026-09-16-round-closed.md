# grill-t11 handoff - round closed (verdict landed)

Date: 2026-09-16 | Branch: grill-t11-docs | Commits: wnx (prior), vyr (R1 docs), xvw (R2 action)

## State

- R1 doc round committed BEFORE any measurement (ordering contract held):
  ADR-0072 + ERRATA E-6 + ADR-0047/0067/0070 appendices + delegation template
  + measured-present word slot + defer-0052 + trend-inventory row +
  decision-ledger-t11.md anchor + instrument seq 18 + test/adr-0072-wiring.
- R2 re-measurement: PASS on all pre-registered steps (b2 method + lane
  exercise). Record: .scratch/grill-t11/readiness/b2-remeasurement-2026-09-16.md;
  chain event seq 19. README "## Readiness status (ADR-0072)" block is live.
- All green: jest 68/1088, gate:all exit 0, pack-smoke PASS (305,755 B),
  instrument --check OK, anchors/inventory/deferred/host-contracts/adr-index OK.

## Stop points (require owner action, not agent)

1. claude-code hook registration on the owner host = bake-window opener.
   Modifies user host config -> separate owner confirmation required
   (ADR-0072 D-C). NOT done.
2. First real lane-bearing Stop event -> flip claude-code transcript_file
   present -> measured-present (host-contracts.json + claim homes sentence-1
   parenthetical update, same-commit; the wiring seed for it lives in
   adr-0072-wiring "capability-label semantics fix").
3. Promotion review after the bake window (G1..G4 with the tier-2 second
   line per the amended G2).

## Do-not

- Never push (not asked). Never rewrite instrument history (seq 6-13 proxy
  signatures stay verbatim; E-6 is the disclosure channel).
- Never hang "performance characteristics not established" without its own
  pre-registration.
- Never synthesize bake traffic; never let single-operator traffic support a
  population FP claim.

## Watch

- defer-0052 (round tally) + defer-0051 (cap review) ride the 2026-12-15
  tide. The trend-anchor advisory already fired (streak 5) - non-blocking.


## Addendum 2026-09-17

Item 1 (owner-confirmed claude-code hook registration) is DONE - owner granted
authority in-session. Details in reports/2026-09-16-report.md addendum +
instrument seq 20. Hooks live in ~/.claude/settings.json against
~/.jiahao/pkg (stable tarball install). Evidence root: whichever of ~ or
~/.claude the hook env resolves (flags planted in both; check
.jiahao-evidence under both). Bake window is OPEN - real sessions accumulate
lane records now. Remaining = items 2 and 3 only.
