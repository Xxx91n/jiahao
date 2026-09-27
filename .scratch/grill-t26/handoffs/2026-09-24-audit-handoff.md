# audit handoff — grill-t26 audit window → grill-t27 (CI-red triage round)

## Audit verdict

**PASS（附非阻断发现）** — grill-t26 anchor-semantics round verified by independent re-run, not by the report's self-description.

- Audit report (full claim→evidence→conclusion table, D-001..D-005 mapping, dual-axis review findings, process-violation list): `D:\Aworker\jiahao\.scratch\grill-t26\audit-evidence\audit-report.md` (untracked, audit-evidence convention).
- Audit's own captures at durable tip `2ac1f00a`: `D:\Aworker\jiahao\.scratch\grill-t26\audit-evidence\*.txt` — jest 81/81 + 1359/1359 re-run green; 9 mechanical legs all EXIT 0; npm pack 350309 bytes = canon; liveness probe green; evaluateRound: t24 seal 8e177d241/absent, t25 seal 8e177d241/drift (recorded), t26 seal 53bff916d/inFlightClean/absent.

## State at audit close

- Lane `grill-t26` tip `2ac1f00a`, base `bde0570b`; docs lane `grill-t26-docs` @`9674439f`. Nothing pushed — push/merge/tag remain human actions.
- SEAL `D:\Aworker\jiahao\.scratch\grill-t26\SEAL` declares `53bff916d798adbb0b8219f822b1ffdc88df070b`; freeze verified (0 violations); `adjudicated/grill-t26` tag still pending human push (same-round lag bound, ADR-0085 D-C.4).
- This audit handoff lands on dedicated lane `grill-t26-audit` — a claim-surface commit (handoffs/ is a registered claim surface); post-seal claim commits evaluate at their own point, no freeze breach (freeze covers evidence/ + SEAL only).

## Non-blocking findings for adjudication / t27 candidacy

From the audit's dual-axis review — none invalidate shipped claims; routing is the user's call (fix-window rework vs ledger):

1. Seal-anchor wording: spec/ledger say "last anchoring commit", implementation + ADR-0085 D-A.2 seal last *substantive* (claims count). Adjudicate the wording divergence.
2. `messageHasSha` computed but unasserted — tag co-naming is target-only today; a right-sha/wrong-message tag would report co-named.
3. `freshness.rounds[]` registry unconsumed by suites (BASE literals hardcoded; `roundConfig` exported-unused); values verified consistent — drift risk is future-only.
4. adr-0085-wiring conditional seal block (`if r.seal.present`) could go unconditional now that t26 is sealed.
5. commitFiles() catch-all returns [] — fail-open edge inside a fail-closed checker.
6. Judgement calls: provenance-header legs still verbatim twins across 0083/0084 suites; lastFloorAnchor/lastSealAnchor duplicate walks; `claim_surfaces.exceptions` decorative; identifier nits.

Process disclosures (reported, not ratified): capture-battery liveness leg's `$` line is a prose label (AGENTS evidence convention: verbatim argv or marked display-form); the round report's evidence-index tabulates wave-1 while committed evidence is the terminal wave (the 3 regen-boundary reds are disclosed in SEAL/commit/handoff); the GitButler-workspace walk-filter is un-ledgered.

## Next grill direction — grill-t27 (unchanged from the round's own stub, audit-confirmed)

1. Triage the three CI-red suite legs at the landed tip: `adr-0069-wiring` (git-tag resolution exit-128 under Actions), `sentinel-ownership` (environment-sensitive assertion), `adr-0079-wiring` (public-history SHA pin). Degrade-or-fix per leg.
2. `defer-0070` closes on the first green origin/main workflow run — record the run id; owner Xxx91n, review 2026-10-15.
3. First live measurement of the claim-point+seal semantics' convergence cost (waves-per-round vs the t25 20+ baseline) — t27 IS the firing ground; record in the t27 ledger.
4. Human-side carry-over: `adjudicated/grill-t26` tag push naming the SEAL sha; the `adjudicated/grill-t25` drift adjudication is human scope.
5. Optional: fold the audit findings (1-6 above) into t27 scope if the user ratifies them.

## Suggested skills for the next session

- `$implement` (grill/engineering) — TDD at the seam for any fix legs.
- `diagnosing-bugs` — the three CI-red legs are environment-sensitive; reproduce before fixing.
- `gitbutler` (`but`) — all version-control writes; dedicated lane; explicit file/hunk ids; `git show --name-only` reconciliation after every commit (ADR-0083 D-C).
- `handoff` (grill/productivity) — this file's successor at t27 closeout.
- `atomcode-research` — external lookups (one session at a time, resume-anchoring on failure).
- `codegraph` — repo exploration where indexed.

## Operational notes (verified this session)

- `captured-at-head` = durable non-workspace tip: `git log -1 --invert-grep --grep='^GitButler Workspace Commit' --format=%H` — never `git rev-parse HEAD` under GitButler.
- Under Bun-sandboxed ctx_execute, `process.execPath` is bun — resolve npm via PATH (`npm pack` in shell), not via `dirname(execPath)/node_modules/npm`.
- GNU tar on Windows parses `C:\...` as `<host>:<path>` — extract with a relative filename inside the temp dir.
- Terminal-wave evidence headers are citation sites: rewrite-map legs record the regen-boundary red verbatim; the map resyncs in the post-seal regen commit (disclosed shape, ADR-0085 D-E).
