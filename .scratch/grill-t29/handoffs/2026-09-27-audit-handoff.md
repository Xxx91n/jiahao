captured-at-head: 691eb48d6aaeae92701e06c1e492598f7dcc8eb4

# grill-t29 audit handoff — second-party audit loop closed (PASS)

For the next agent picking up this repository's grill cycle. Audit lane:
`grill-t29-audit`. Substantive round tip: `691eb48d` on `grill-t29-impl`.

## What this session did

- Loop-1 audit (report at .scratch/grill-t29/reports/audit-report.md): FAIL,
  return-to-fix — the terminal wave c2768fc8 landed stale-at-commit
  (rewrite-map regenerated before the final re-pin), post-seal claim
  b61d7951 added more unmapped cites; HEAD was red (legs 208/209, jest ×2).
- Loop-2 re-audit (.scratch/grill-t29/reports/2026-09-27-reaudit-report.md):
  same acceptance battery re-run by the auditor at the true tip — all green;
  every A-1..A-9 + process finding disposition verified against repo state.
  PASS; round accepted for closeout.

## Current state (verified, not self-described)

- SEAL re-issued: declares 68c8ec2f87d4a48ea67bc81c5d1575845ea47a42; all
  seal invariants green (evaluateRound t29: 7 claims / 0 bad / freeze 0).
- ERRATA E-17 registers the wave-ordering defect + the new convention:
  re-capture -> regen -> verify -> declare.
- taxonomy errata_exemptions holds the auditor-pin orphan (b61d7951) under
  E-17, pending-confirmation, expires 2026-12-15 (the tide date).
- Machinery now: 41 gate legs (220-223 added this round), 1419 tests, 184
  shipped js incl. scripts/derive-anchoring-footer.js (the footer derivation
  tool — use it, never hand-type footers).
- Audit captures (untracked, nc-001): .scratch/grill-t29/audit-evidence/rerun/
  (loop-1 red-state record) and rerun2/ (loop-2 green evidence).
- gitbutler lanes: grill-t29-docs (72008299) -> shared history ->
  grill-t29-audit (68e23d9b + this file + reaudit report + map resync) ->
  grill-t29-impl (..691eb48d). origin/main advanced +1 mid-round; the round
  ran on the c7ae4f81 base by contract — rebasing is a separate decision.

## Next grill direction (suggested)

1. **grill-t30 is the tide round** (owner-side, 2026-12-15): the t29 packet
   stages F-8 retro-ratification, seq-13, ratchet-brake, F-12
   errata-vs-reseal, adjudicated/grill-t27 tag, and the 20-entry countersign
   queue — plus defer-0072..0075 dispositions. Agent work = draft prep only.
2. **Candidate grill target for a fix-side round:** the E-17 ordering
   convention exists only as prose + erratum — the wave script itself has no
   mechanical enforcement of "regen last". A grill could probe: can the
   wave-closeout leg assert map-freshness-at-commit mechanically?
3. **Watch-item:** errata_exemptions entries are immediately effective while
   pending-confirmation — a second auditor could adversarially test the
   lapse/ratify boundary (defer-0074 approval-surface decision is adjacent).

## Suggested skills for the next agent

- `$code-review` / `$grill` skills (grill/ engineering + productivity dirs)
- `$handoff` at closeout; `gitbutler` skill for all writes (explicit
  allowlists + [ANCHORING] footer via scripts/derive-anchoring-footer.js
  --ids); verify landed sets with `git show --name-only`.
- context-mode ctx_* tools for all file writes and large-output commands.

## Redacted / boundary notes

- No secrets handled this session. No pushes, no tags, no human-authority
  acts executed or queued by the agent.
- The zz worktree pool (.scratch/** nc-001 examiner artifacts) stays
  uncommitted by convention — do not sweep it.