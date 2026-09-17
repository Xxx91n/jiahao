# grill-t12 handoff — re-audit closed (verdict: PASS; record-level closure stands)

Date: 2026-09-17 | Branch: grill-t12-docs @ rys (a375dbc) | Reports: ../reports/2026-09-17-audit.md (findings) + ../reports/2026-09-17-reaudit.md (rework verification)
Supersedes: 2026-09-17-audit-closed.md (the bounce handoff — its repair order was executed and re-verified)

## State

- Rework commit `rys` verified scope-clean: README three fixes + report addendum +
  g6 replay refresh only. Bounced items F-A / W-A / W-B all confirmed fixed by
  re-run, not by claim.
- Escape point closed: `node scripts/run-test-gate.js --expected-suites 69`
  (ci.yml:97) now exits 0 at tip — `OK: 69 suites, 1112 tests, 0 skipped`.
- Full §一 acceptance re-run green at tip: jest 69/69/1112; public 1105+7skip;
  gate:all exit 0 (33/4-ci-unverifiable, pack-smoke 311,488 B < 340,000);
  instrument authoritative (seq 21); deferred 50; anchors 11; inventory 33;
  host-contracts 17; adr-index 73; telemetry organic=0/harness=29/selfcheck=2/
  unclassified=0, G1=false, real chain 31.
- Nothing pushed (origin still main-only); workspace clean; all VCS writes via but.

## Process improvement landed (from the bounce)

- The round report now carries an "Audit rework addendum" recording the root
  cause: run-test-gate was absent from the close-out verification table (it is
  the CI job wrapper at ci.yml, not one of the gate:all 33). **Standard for all
  future round closes: include `node scripts/run-test-gate.js --expected-suites
  <n>` in the re-run checklist.**

## Carry into next round (registered, not defects)

1. Organic leg = 0: G1 counts organic only; bake corpus needs real usage
   (defer-0055 watch; synthetic traffic forbidden).
2. defer-0053 collection-side provenance field (write-time instrument agenda).
3. defer-0054 pre-commit scanner selection (gitleaks class).
4. Diversity N/M values pre-register BEFORE any promotion review (ADR-0073 D-D
   framework; values are pre-review parameters, not deferred rows).
5. Hygiene agenda (from audit observations, recorded in reports):
   O-A jest parallel flake (shared fixed-name temp dirs — register as a deferred
   item if it recurs; unique-dir fix is the shape), O-B intermediate-commit
   redness convention, O-E telemetry export breadth, O-D trailing newlines.
6. Promotion gate untouched and frozen; no evaluation requested or performed.

## Next grill direction (suggested)

Organic-bake accumulation round or later audit checkpoint: re-run the segmented
telemetry, disposition defer-0053/0054/0055, and — only when organic flagged
items exist — run the adjudication protocol for real under ADR-0072 D-D criteria
+ tier-2 second line. Prerequisite for any promotion talk: N/M pre-registration.
Hygiene pickup candidate: unique temp dirs for jest fixture suites (O-A).

## Do-not (unchanged)

Never push unless asked. Never rewrite instrument history. Never count
harness/self-check traffic toward G1. Never create synthetic bake traffic.
Host-config changes need a separate owner confirmation. but (GitButler) for all
VCS writes; `git status` misleads under GitButler — `but status` / `git ls-tree
HEAD` are authoritative.

## Suggested skills

$implement + $tdd for defer-0053 (write-time field is a schema-evolution seam)
or the O-A temp-dir fix; $code-review + audit pattern at close; $but for VCS;
$handoff at close.
