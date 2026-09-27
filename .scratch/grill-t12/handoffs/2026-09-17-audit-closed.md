# grill-t12 handoff — audit round closed (verdict: claims VERIFIED; 1 gate-red defect bounced)

Date: 2026-09-17 | Branch: grill-t12-docs @ 7266b1f | Audit report: ../reports/2026-09-17-audit.md

## State

- Hard acceptance independently re-run by audit: jest 69/69/1112 exit 0; public tier
  1105+7skip; gate:all exit 0 (33 entries, 4 ci-unverifiable); pack-smoke 311,515 B;
  instrument authoritative (seq 21, bounded scope+expiry); deferred 50; anchors 11;
  inventory 33; host-contracts 17; adr-index 73; telemetry organic=0/harness=29/
  selfcheck=2/unclassified=0, G1=false. All match the round report.
- Scratch-env liveness re-proven on repo hooks: activate injects verifier ruleset;
  Stop no-evidence exit 2; Stop+transcript lands flagged shadow lane record
  (exit-report claim2/ev0) and still blocks; sweep exit 0; real chain unchanged at 31.
- Provenance classifier implementation reviewed line-by-line vs ADR-0073 D-A:
  faithful (registered sets → session→project-dir map → scripted-driver skeleton →
  conservative unclassified); no record deleted; organic leg honestly 0.
- Process discipline verified: R1 docs before R2 actions; gitignore rules before
  untracks; ADR-0070 append-only amendment; frozen surfaces untouched; nothing on
  origin (gb-local is the GitButler-internal local-path remote).

## Bounce-back (to fix window; audit does not fix)

- **F-A**: README.md:307 `- \`test/\` — 68 test suites, 1088 tests` is stale —
  contradicts L214's `1112 tests across 69 suites`. `node scripts/run-test-gate.js
  --expected-suites 69` (the ci.yml:97 CI test-gate command, NOT covered by
  gate:all) fails at tip: `FAIL: README (Architecture) declares 1088 tests / 68
  suites, actual 1112 tests / 69 suites` (ADR-0056/0057 machine check). txr's
  stale-count repair updated the Develop line but missed the Architecture line in
  the same file.
  - Fix: README:307 → `` `test/` — 69 test suites, 1112 tests ``.
  - Ride-along (same file, same drift class, non-blocking): README:26 "frozen at
    0 real events" → "0 organic events" (post-ADR-0073-D-B precision).
  - Re-run checklist after fix (the full §一 set):
    `node scripts/run-test-gate.js --expected-suites 69` (the escape point —
    mandatory), `npx jest --silent`, `JIAHAO_TEST_TIER=public npx jest --silent`,
    `npm run gate:all`, `node scripts/instrument.js --check`, telemetry re-run.
  - Report-table improvement to adopt: add run-test-gate to the standard round-close
    verification list — it is the gate that catches the stale-count class.

## Carry into next round (registered, not defects)

1. Organic leg = 0: G1 counts organic only; bake corpus needs real usage
   (defer-0055 watch; synthetic traffic forbidden).
2. defer-0053 collection-side provenance field (write-time, instrument agenda).
3. defer-0054 pre-commit scanner selection (gitleaks class).
4. Diversity N/M values pre-register BEFORE any promotion review (ADR-0073 D-D
   framework; values are pre-review parameters, not deferred rows).
5. W-B/O-系 audit observations available for pickup: README:27 paraphrase vs the
   verbatim evidence layer; jest parallel flake signal (O-A); intermediate-commit
   redness convention (O-B); telemetry export breadth (O-E); trailing newlines (O-D).
6. Promotion gate untouched and frozen; no evaluation requested or performed.

## Next grill direction (suggested)

Organic-bake accumulation round or later audit checkpoint: re-run segmented
telemetry, disposition defer-0053/0054/0055, and — only when organic flagged
items exist — run the adjudication protocol for real under ADR-0072 D-D criteria
+ tier-2 second line. Prerequisite for any promotion talk: N/M pre-registration.

## Do-not (unchanged)

Never push unless asked. Never rewrite instrument history. Never count
harness/self-check traffic toward G1. Never create synthetic bake traffic.
Host-config changes need a separate owner confirmation. but (GitButler) for all
VCS writes; `git status` misleads under GitButler — `but status` / `git ls-tree
HEAD` are authoritative.

## Suggested skills

$implement for the F-A one-line fix (with the mandatory re-run list);
$code-review + audit pattern at re-close; $but for VCS; $handoff at close.
