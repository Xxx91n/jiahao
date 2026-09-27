# grill-t19 — next-round task book (durable)

For any sub-agent. Authoritative inputs: D:/Aworker/jiahao/.scratch/grill-t19/decision-ledger.md (D-001..D-010, all current) and D:/Aworker/jiahao/.scratch/grill-t19/spec-t19-disposition.md (sections 0-12). This file is the map, not the content. Round shape: fix round — R1 documentation phase first, then R2 machinery phase; carve-out NOT invoked (a kind:fix row discloses machinery via governance_tooling_diff by definition). t20 (README round) opens only on t19's post-disposition baseline.

## Baseline (t18 audit, verified 2026-09-19)

- PASS WITH FINDINGS: all 16 hard-acceptance items re-ran green, zero tracked diffs after regen; A-1..A-8 filed.
- 73 suites / 1244 tests / 0 skipped; gate:all 35 entries (4 ci-mode UNVERIFIABLE, 1 advisory); deferred 57; anchors 17; instrument 27; rewrite-map 1447; pack 337695 < 340000; liveness (pack/extract/install help/init dry-run/MCP initialize) all passed.
- Audit inputs (untracked at t18 round-final): D:/Aworker/jiahao/.scratch/grill-t18/reports/2026-09-19-audit.md + D:/Aworker/jiahao/.scratch/grill-t18/handoffs/2026-09-19-audit-handoff.md — setup commit absorbs both with disclosed message (t18 precedent).

## T-1 — t19 R1 documentation surface

1. t18 decision-ledger T-3 consent-sweep: restore the defer-0060 named line via Disclosed Repair — repair line leads with the retroactive-repair declaration (omission + spec pre-scoping reason; who/when). [D-002]

2. t18 report sweep paragraph: restore the defer-0060 named line (same repair declaration). [D-002]

3. t18 report: add the export-misreport by-design note (incl. the SCHEMA_KEYS surface). [D-002]

4. t18 report: rewrite the green-throughout sentence into the true statement + add wrx/wsl to the commit-chain paragraph. [D-002]

5. ADR-0078 D-A: append the streak-semantics sentence (kind:fix rows outside both streak populations — skip-not-reset). Same commit as T-2 items 12-13 wiring (ADR-0035 coupling guard). [D-003]

6. ADR-0077 D-A.1 appendix: one clarifying sentence (missing input artifact = unsatisfied recorded at the phase boundary, never an early exit; the three-value contract grows no class). [D-004]

7. Convention sentence registered (ADR-0078 D-A or the gtd section): 'no carve-out used' is expressed by carve_out_used:0 with the field omitted, never by an empty files list. [D-005]

8. CONTEXT sync verify (pre-landed in the docs commit): Disclosed Repair / Disclosed Re-Capture / Non-Interpolating Channel / Bilingual Mirror terms; Governance Trend Anchor + Consuming-Row Exit clauses. [D-002/D-003/D-004/D-006/D-007]

9. A-3 re-capture: re-run the missing-file check via execFileSync arg-array (no string layer); fresh verbatim output written to the same evidence file via fs; retroactive-repair line in ledger + report declares the first capture void (invocation-layer corruption); corrupted bytes absorbed as the negative fixture for the new .txt signature leg. [D-006]

10. Cascade regen after t18 repairs (anchors, rewrite-map, round-facts) riding plain commits — Amend-Riding not triggered. [D-002]

11. Setup commit absorbs vl + ns (t18 audit report + audit handoff) — message discloses the absorption (untracked at t18 round-final). [D-001]

12. Critique registration line in round docs per D-001 (register critique-v4 completion result). [D-001]

## T-2 — t19 R2 machinery surface

13. build-round-facts.js: main() body try/catch -> 'verifier broken' + exit 2 (covers JSON.parse corrupt artifact, spliceRegion throw, execFileSync, requireCapabilities). FIRST R2 COMMIT = anti-rot quota smell ticket discharged (ordering + ledger registration line). [D-004]

14. build-round-facts.js :201 missing-factsFile -> drift/unsatisfied channel: report phase skipped, single boundary exit 1 at :216 (behavior-equivalent). [D-004]

15. check-governance-inventory.js:193-194 kind guard: kind:fix rows transparent to both streaks. Same commit as T-1 item 5. [D-003]

16. Shared governance_tooling_diff shape check -> presence-implies-non-empty (files MUST be a non-empty string[] whenever gtd exists, any round kind); kind:fix gtd-presence check (:127) unchanged. [D-005]

17. Wiring pins: positive (doc+carve, fix, doc+carve still fires burn-rate); negative (fix net_additions>0 does not feed the doc streak); negatives x2 (kind:fix + {files:[]} fails; documentation + {files:[]} fails); .txt hygiene leg over committed .scratch/**/*.txt carrying ONLY the path-LF-break signature (corrupted sample as fixture — md control-byte set does NOT transfer). [D-003/D-005/D-006]

## T-3 — t19 closeout

18. t18 audit section-6 battery verbatim re-run (--round grill-t19) into committed evidence + clean-tree assertion. [D-001]

19. Consent-sweep named lines: every standing registry row touched keeps a named-id line; the defer-0060 line records its restoration + status; remaining standing rows per registry at close. [D-001/D-002]

20. t19 trend row: kind:fix + governance_tooling_diff listing this round's R2 machinery files (non-empty); zero_product_diff evaluated honestly per ADR-0076 D-A. [D-001]

21. Round report: facts-canon rendered, zero canon numbers in prose, retroactive-repair registrations item-by-item, quota discharge line (ordering + registration), zero-drift streak fact registered. report_commit null. [D-001/D-002/D-003/D-004]

## T-4 — t20 forward (README documentation round; opens on t19's baseline)

22. ADR-0079 bilingual-mirror convention: D1 dual filename EN-primary + zh-CN mirror; D2 autonym language-switch line; D3 translation-baseline commit-hash HTML comment; D4 'English original prevails' arbitration; D5 zh-CN tarball-cap exemption citing ADR-0039 D3. Anti-quota-theater sentence in ADR-0079 + t20 report ('the ADR exists because the convention needs a policy home — the streak feed is a disclosed fact, not the motive'). ADR-0038/0039 pointer lines only if needed. [D-010/D-007]

23. README.md full IA redesign per spec section-8 skeleton: every pinned block byte-identical; honesty banner before '## What it does'; '## What it does' + '## Readiness status (ADR-0072)' stay at ##; 'Verifier deployment discipline' section name untouched; '## Measurement record' parent demoting confirmatory/v1/v2/v3/lane/reproduce one level (verbatim); ADR index folded into <details> (blank line after every <summary>; no GitHub Alerts inside folds); wiring verdict is the arbiter on ordering. [D-008]

24. README.zh-CN.md created: autonym switch line (English | 中文, current language bold and unlinked), translation-baseline commit-hash HTML comment, structurally aligned, pinned blocks translated with 'English original prevails' pointers; git-tree only, never in tarball. [D-007]

25. Pure-text face: 2-3 static non-numeric badges; no assets/readme/ directory; discretionary Mermaid profile-flow diagram in Architecture only. [D-009]

26. t20 trend row: kind:documentation + adr_added:["0079"] + net_additions:1; if machinery touched, carve_out_used:1 + non-empty governance_tooling_diff.files (D-005 shape). [D-010]

## Hard rules

- but (GitButler) for ALL VCS writes; grill-t19-docs stacks on grill-t18-docs; never push/land (owner-domain).

- Never-commit set: tq/nl/xu/my patches + .scratch/*/audit-evidence/ trees + round-diff patches + round-commits.txt (t17/t18/t19 audit evidence all excluded).

- Committed docs via fs.writeFileSync/file-edit tools only; post-write re-read + byte-check (authoring-path convention).

- Battery commands with backslash-bearing args run through Non-Interpolating Channel (arg arrays / script files), never string layers.

- Verbatim evidence is never byte-patched — repairs are Disclosed Re-Captures; closed-round doc repairs are Disclosed Repairs with the declaration triple.

- No kind overloading (README never rides the fix row); no quota theater; no silent history rewrite; no identifier stripping; report_commit null.

- Canon numbers in report prose: zero.

## Suggested skills

- grill-with-docs — round-open ritual (done this session)

- domain-modeling — CONTEXT terms, ADR-0077/0078/0079 authoring

- tdd — wiring fixtures before each machinery change

- code-review — before each commit

- handoff — round-complete checkpoint

- neat-freak — closeout reconciliation

- gitbutler (but) — all VCS writes

- atomcode-research — only for contested dispositions

- beautify-github-readme + readme-crafter — t20 README execution
