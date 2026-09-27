# grill-t19 — GOAL (closed 2026-09-19)

Two-track round opened 2026-09-19.

## Track A — t18 audit disposition — DONE
Audit: D:/Aworker/jiahao/.scratch/grill-t18/reports/2026-09-19-audit.md (PASS WITH FINDINGS).
A-1..A-8 disposed: adjudications landed (A-4/A-6/A-7/A-8 convention-boundary
amendments on ADR-0077/0078 + checker machinery), rework R-1..R-7 executed
(Disclosed Repairs on the closed t18 documents, A-3 Disclosed Re-Capture,
missing-input boundary route, quota discharged at the first R2 commit),
§1 battery re-ran verbatim parameterized --round grill-t19 with committed
evidence + clean-tree assertion. Round report:
.scratch/grill-t19/reports/2026-09-19-report.md.

## Track B — GitHub README front-face — deferred to t20
Skills: beautify-github-readme + readme-crafter. Requirements (owner): clean/tidy, bilingual CN+EN, user-facing, stop the current mess.
Status: NOT STARTED this round by design - the Bilingual Mirror work is
t20 scope and opens only on the landed t19 baseline (ledger D-007; the
CONTEXT glossary entry is the only in-scope artifact here).

## Hard rules
- No source/runtime edits during the grill phase; no alternate goals.
- One question at a time; every confirmed substantive decision appended to decision-ledger.md on the spot.
- Files via fs.writeFileSync/file-edit only; byte-verify after write (D-006 authoring path).
- but for all VCS writes; stack on grill-t18-docs. Never-commit set preserved.
