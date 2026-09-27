# grill-t13 T-3 audit passed → next round handoff (2026-09-17)

State: `grill-t13-r1` stacked on `grill-t13-docs`; commits …`rwk` (T-3 audit
FAIL report) + `uqk` (fix round) + this audit-pass report/handoff pending.
Working tree clean except intentionally-untracked
`.scratch/grill-t13/audit-evidence/r2-round-diff.patch` (audit review copy;
contains F-1 fixture literals — NEVER add/commit it). No push performed.

T-3 verdict: PASS after one bounce. Reports:
`.scratch/grill-t13/reports/2026-09-17-t3-audit.md` (FAIL findings F-1..F-9)
and `.scratch/grill-t13/reports/2026-09-17-t3-reaudit.md` (PASS, all
dispositions verified). Independence grade declared: weak-independent
(different session, same toolchain).

## Rerunnable state (all verified this session)

- `node scripts/run-test-gate.js --expected-suites 71` → 71/71, 1148 tests
- `node scripts/run-gates.js` → exit 0, 35 entries, 4 ci-mode unverifiable
- `node scripts/check-secret-scan.js` → 3 rules 0 hits, enum union 851/859/859
- `node scripts/build-rewrite-map.js --check|--verify` → 1182 citations, 15 pairs
- `node scripts/check-deferred.js` → 52 entries (48 live, 4 closed/actioned)
- `node scripts/instrument.js --check` → OK; seq 24 pending_signoff
- `node scripts/check-pack-smoke.js` → OK, 322314 < 340000

## Next-round agenda (owner decision ordering)

1. **Present the push request (D-005e)**: disclosure/claim-class artifacts are
   re-verified + audit-passed — the "不推送=披露未生效" dependency is now
   eligible to present to owner. Push itself remains owner-only order.
2. **defer-0051 live legs**: ADR-0071 review_at 2026-12-15 → pinned-protocol
   re-measurement (`npm pack --dry-run --json`, size field) + second_reviewer
   countersign. Reopened by T-3 F-4; do not let it silently close again.
3. **instrument seq 24** pending human sign-off.
4. Standing cadence (T-4 register): defer-0053 (frozen unfreeze), defer-0055
   quarterly organic watch (organic=0 baseline; six-months-zero closes_if),
   defer-0057 (t13 tally → next trend-anchor), defer-0058 (per-round
   net-increment review), O-E backlog.
5. Next grill direction suggestion: diversity N/M preregistration before any
   promotion review (ADR-0073 D-D frame) — organic leg still 0, gate frozen.

## Known traps (carried + new)

- ctx_execute /tmp is per-call ephemeral; multi-step scratch work in ONE call.
- ctx sandbox `process.execPath` is Bun — never spawn node via it; call `node`
  from a real shell or jest silently fails all suites.
- GitButler index lags HEAD: `git ls-files` (850) < `git ls-tree HEAD` (857)
  silently — any enumeration over "tracked files" must union both (scanner now
  does; other tools making the same assumption are suspect).
- range-diff hunk bodies contain the redacted literal — never tee into artifacts.
- `.jiahao-evidence` is a segmented DIRECTORY; verdict-gate exits 0 silently
  when `.jiahao-active` absent (session-scoped).
- Rewrite-map is generated — regen after any doc edit adding SHA citations.
- Registry terminal statuses need closed_at/closed_via or
  actioned_at/actioned_via; check-deferred enforces.
- secret-scan scans committed BYTES: fixture literals must be runtime-
  assembled, never contiguous in source.

## Suggested skills

`$but` (all VCS), `$code-review` (any future diff audit), `$implement`/`$tdd`
for T-4 items if picked up.
