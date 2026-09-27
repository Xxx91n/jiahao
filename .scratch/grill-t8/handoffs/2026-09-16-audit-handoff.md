# grill-t8 AUDIT handoff — 2026-09-16 (audit window → next round)

## What the audit established

Independent re-verification of the merged CAPA+readiness round
(.scratch/grill-t8/reports/2026-09-16-report.md). Full audit:
.scratch/grill-t8/reports/2026-09-16-audit-report.md.

- All hard acceptance re-ran green: jest 63/63 suites 987/987 tests,
  gate:all exit 0 (31 entries, 4 ci-mode unverifiable baseline), pack-smoke
  285,333 B < 300 KB.
- Every report claim verified with repo-level evidence: anchor tag
  annotated @8807a61 naming construct misalignment; sha256 freeze
  (score.js ffc61319…, g6-manifest 7ed23909…, blob==HEAD); pairer
  sha256 2383d75f pinned into eval-plan + plan, re-derived fail-closed in
  loadPlanV3; 24/24 pairer tests, 11/11 v3-plan tests, 16/16 probes;
  per-item v2 join = 31 lie flagged / 109 honest consistent / 0
  undetermined; install channel + verdict gate BOTH branches reproduced
  live on the installed artifact (block exit 2 / allow exit 0).
- Boundaries held: no v3 data; port byte-frozen zero-verdict; probes
  categorical-only; nothing cites v2 by conformity; doc-before-impl
  ordering proven by commit timestamps.

## Verdict: PASS-WITH-CONDITIONS

Round fidelity is clean. However the pinned adjudicated object carries a
real defect plus a collection-seam gap — both must close BEFORE any v3
collection:

- F1 pairer claim over-capture (fabricates flagged-on-honest; see audit
  report §4 for live reproductions). Fix = new artifact → new sha256 pin
  under same-commit ADR + fail-closed probe rows.
- F2 collect-devin-corpus.js doesn't know devin-corpus-v3 (closed enum
  exits 1) — the next-round command in round-closed-2026-09-16.md fails
  today; collection-time enforcements unwired.
- F3–F7 doc/registry nits listed in the audit report §4.

## Next grill direction (suggested)

grill-t9 = repair round: repair order R1 (pairer fix + re-pin + probes) and
R2 (v3 collection wiring) as the bullseye candidates; only after R1+R2 land
does the v3 collection/adjudication round become startable. Alternative on
the table: unified governance backlog (D-012) remains deferred but is the
standing alternative if the user prefers.

## Never do

Move the anchor tag; touch frozen port artifacts; read spec.check/labels in
the pairer; cite v2/v3 by conformity; run v3 collection before the F1/F2
repair lands and re-verifies.

## Suggested skills

$implement for the repair order · tdd (failing probe rows first) ·
$code-review on the fix · grilling for the next-round bullseye · $but for
all VCS writes.
