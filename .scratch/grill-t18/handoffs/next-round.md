# grill-t18 — next-round task book (durable)

For any sub-agent. Authoritative inputs: D:/Aworker/jiahao/.scratch/grill-t18/decision-ledger.md (D-001..D-008) and D:/Aworker/jiahao/.scratch/grill-t18/spec-h-disposition.md (sections 0-9). This file is the map, not the content. Round shape: fix round — R1 documentation phase first, then R2 machinery phase; governance carve-out NOT invoked.

## Baseline (t17 audit, verified 2026-09-18)

- 73 suites / 1225 tests / 0 skipped; gate:all 35 entries exit 0 (4 UNVERIFIABLE ci-mode); check-ci-jobs exit 1 keyed / exit 2 missing; inventory 35 + advisory; deferred 57 (48/9); anchors 16; rewrite-map 1432; instrument conditional to 2026-12-11; pack 335900 < 340000.

## T-1 — R1 documentation surface

1. ADR-0078 fix-round disclosure taxonomy: kind enum documentation|fix; fix rounds MUST disclose R2 machinery edits via governance_tooling_diff (carve_out_used not counted); zpd cites ADR-0076 D-A. Same commit as the trend-inventory.json + checker change (ADR-0035 coupling guard). [D-004]

2. t17 trend row disclosed corrective rewrite: kind documentation->fix + governance_tooling_diff backfill (scripts/build-round-facts.js, scripts/check-governance-inventory.js) + reason first line states retroactive correction for the closed-enum mislabel. [D-004]

3. ADR-0077 D-E amendment: bare-value floor as pattern-ambiguity function + compensating clause (single-digit values backstopped by key-assign scan) + coverage-boundary sentence; permanent declared gap. [D-002]

4. ADR-0077 appendix beside D-A: guard/exit-style structure contract (accumulate within phase, one emit-exit boundary per phase, immediate exit only for verifier-broken exit>1) + cause-summary clause. Unfreezes defer-0063. [D-003]

5. ADR-0077 D-E boundary sentence: verbatim evidence snapshots may disagree across the regen boundary — expected ordering artifact. [D-007]

6. CONTEXT Consent Sweep term (pre-landed in docs commit — verify): named-id line per registry row; substance may fold, id never stripped; _Avoid_ identifier-stripping. [D-005]

7. CONTEXT Amend-Riding Discipline term (pre-landed — verify): map-regen never rides an amend; sha pins immutable history; _Avoid_ + cross-ref Facts Canon. [D-007]

8. CONTEXT Facts Canon tail clause (pre-landed — verify): handoff verified-state lines cite paths, never carry regenerable counts. [D-007]

9. CONTEXT Scribed Approval/Proxy Signature: restore the seq 3/5/6/8 pre-authorization-era historical-background clause (pre-landed — verify). [D-005]

10. Fix corrupted D:/Aworker/jiahao/.scratch/grill-t17/handoffs/next-round.md via file-edit tooling: 4 absolute paths restored, CR byte + stray bytes removed, four dollar-prefixed skill names restored. [D-006]

11. AGENTS.md working agreement + authoring-path clause: committed docs via fs.writeFileSync/file-edit tools, never escape-interpreting shell layers; post-write byte check. [D-006]

12. t17 decision-ledger appended disclosure note: defer-0055 consent-sweep omission = isolated lapse (t12-t14 named); appendable not rewritten. [D-005]

13. Critique-v4 verdict line in round docs: five prescriptions verified disposed on live tree; residuals (delegation posture, v2 corpus pending) recorded as out-of-scope per D-001. [D-001]

## T-2 — R2 machinery surface

14. proseScan key-assign coverage extended to all 11 schema keys (skipped, not_run, battery_as_of_commit, report_commit added); bare-value floor and skipped=0 pattern unchanged. [D-002]

15. defer-0063 discharged first: shared emit-exit helper extracted; both FAIL-print+exit sites converge; fail-fast semantics unchanged. [D-003]

16. reportPath readFileSync single-read (refactor: commit). [D-003]

17. PROSE_KEYS single-sourced from the renderRegion key list (refactor: commit). [D-003]

18. checker kind enum line admits fix; fix rows exempt from D-F deferred-entry assert; streak unchanged. Same commit as T-1 item 1. [D-004]

19. Wiring fixtures: single-digit canon fixture + key-assign fixture (pin D-002 semantics); kind:fix-without-gtd negative pin; doc-hygiene pin over committed .scratch/*.md (control bytes + stripped-path signature; two real corruption samples as negative fixtures). [D-002/D-004/D-006]

20. Round-facts + report: provisional facts bootstrap if needed (t17 pattern), facts region rendered, proseScan clean, evidence artifacts committed under .scratch/grill-t18/evidence/ (not in anchors chain). report_commit null. [D-008]

## T-3 — closeout (zero asks)

21. t17 audit section-6 battery verbatim, parameterized --round grill-t18, output into committed evidence files. [D-008]

22. Consent-sweep named lines: defer-0055 (named — organic watch); defer-0060; defer-0063 -> closed/actioned (quota discharged); sunset 1/6; defer-0053/0057/0058; O-E backlog; never-commit set (tq/nl/xu/my + t17 audit-evidence). [D-005/D-008]

23. t18 trend row files kind:fix + governance_tooling_diff listing this round R2 machinery edits (first compliant instance; facts-canon states only the re-checkable checker fact). [D-004/D-008]

24. Round report: facts-canon rendered, zero canon numbers in prose, three guardrails stated (light-close triad; no self-attestation circularity; setup-commit absorption disclosed). Audit-ready note only. [D-008]

25. Registry bookkeeping: defer-0063 row -> closed/actioned with closed_via pointer; consent-sweep records the transition. [D-003/D-008]

## Hard rules

- but (GitButler) for ALL VCS writes; grill-t18-docs stacks on grill-t17-docs; never push/land (owner-domain).

- Never-commit set: tq/nl/xu/my patches + .scratch/grill-t17/audit-evidence/ (un patch, rerun/*, round-commits.txt).

- Setup commit absorbs zo + yz (t17 audit report + handoff) — commit message must disclose the absorption (untracked at t17 round-final).

- Separate atomic refactor:/test: commits for smells; never mixed with fix commits.

- Committed docs via fs.writeFileSync/file-edit tools only (D-006 authoring path — self-practice).

- No bare-value floor removal; no quota theater; no silent history rewrite; no identifier stripping; no new ADR beyond 0078; no carve-out; report_commit null.

- Canon numbers in report prose: zero — quoted or bare (unconditional scan; single-digit values reachable only via key-assign form).

## Suggested skills

- grill-with-docs — round-open ritual (done this session)

- domain-modeling — CONTEXT terms, ADR-0078/appendix authoring

- tdd — wiring fixtures before each machinery change

- code-review — before each commit

- handoff — round-complete checkpoint

- neat-freak — closeout reconciliation

- gitbutler (but) — all VCS writes

- atomcode-research — only for contested dispositions
