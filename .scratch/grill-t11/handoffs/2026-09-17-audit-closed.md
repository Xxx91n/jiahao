# grill-t11 handoff — audit round closed (audit verdict: functional claims VERIFIED; 1 hard standards finding bounced)

Date: 2026-09-17 | Branch: grill-t11-docs @ 7a7e971 | Audit report: ../reports/2026-09-17-audit.md

## State

- Round verdict (usable+testable, measure-then-declare): independently re-measured by audit —
  clean-env npx github: install exit 0; installed-artifact liveness (activate inject / mode-tracker /
  Stop no-evidence exit 2 / flagged shadow lane record + still blocks / idempotent re-fire) all reproduced
  on ~/.jiahao/pkg with scratch CLAUDE_CONFIG_DIR, zero real-chain writes.
- jest 68/68/1088, public 1081+7skip, gate:all exit 0 (33 entries, 4 ci-unverifiable), pack-smoke PASS,
  instrument authoritative (seq 18/19/20), anchors 10 / inventory 33 / deferred 46 / host-contracts 17 /
  adr-index 72 — all re-run green.
- All D-001..D-005 landed; ERRATA E-6 / ADR-0047,0067,0070 appendices / P-2 forward rule already operative
  (seq 18-20 authorizations carry scope+expiry) / P-5 Re-Execution Prior in CONTEXT / README layered
  declaration / measured-present slot reserved-unused. Ordering machine-asserted (wiring test asserts
  block absent @vyr, present @xvw).

## Bounce-back (to fix window; audit does not fix)

- F-A1: jiahao-0.0.1.tgz committed at root by 05fa697 — violates derived-artifact convention
  (precedent abadc3a; already stale: HEAD packs 306,449 vs committed 305,755). Fix: uncommit + gitignore
  /*.tgz. Re-run checklist after fix: npm run gate:all, node scripts/instrument.js --check,
  git ls-files | grep tgz (expect empty).

## Carry into next round (registered, not defects)

1. measured-present flip NOW DUE: 3 real lane records on ~/.jiahao-evidence post-registration
   (9e73c467 21:32Z, 9b625010 21:35Z, a82305f1 21:42Z — observed/undetermined/shadow, non-regcheck
   sessions). Execute the flip: host-contracts.json claude-code transcript_file present→measured-present
   + three claim homes sentence-1 parenthetical, same commit (wiring seed: adr-0072 "capability-label
   semantics fix").
2. W-1 substrate note: bake runs npm-pack of unpushed HEAD, declaration measured npx github: @c861084.
   Hook-path delta ~nil (only instrument-state.json data + check-host-contracts.js validator differ),
   but decide whether a substrate-conformity statement belongs in the next claim edit.
3. W-2 corpus hygiene: t11-live-regcheck-* flagged records sit on the real chain; exclusion is
   naming-convention only. Consider a structural marker for wiring-verification records vs bake traffic.
4. O-2: host settings backup lives in git-tracked .scratch (host topology disclosed, no live secrets).

## Next grill direction (suggested)

Bake-window stewardship round: first real-traffic adjudication — the lane now has real undetermined
records; agenda = (a) execute the measured-present flip, (b) adjudication-criteria dry-run on the
existing flagged population (regcheck records exercise the exclusion rule for real), (c) decide the
bake-corpus counting checkpoint cadence before promotion review becomes live. Do NOT open promotion
evaluation (gate stays frozen; single-operator traffic supports plumbing-health claims only).

## Do-not (unchanged)

- Never push unless asked. Never rewrite instrument history. Never hang reserved labels without
  pre-registration. Never synthesize bake traffic. but (GitButler) for all VCS writes.

## Suggested skills

$to-spec + $to-tickets if the next round decomposes; $implement+tdd for the flip (same-commit wiring
seed exists); $code-review + post-round audit pattern at close; $but for VCS; $handoff at close.
