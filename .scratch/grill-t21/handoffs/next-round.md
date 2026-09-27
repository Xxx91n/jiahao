# grill-t21 — next-round task book (durable)

For any sub-agent. Authoritative inputs: D:/Aworker/jiahao/.scratch/grill-t21/decision-ledger.md (D-001..D-004, all current) + D:/Aworker/jiahao/.scratch/grill-t21/spec-t21-disposition.md (sections 0-6). Audit inputs: D:/Aworker/jiahao/.scratch/grill-t20/reports/2026-09-20-audit.md + D:/Aworker/jiahao/.scratch/grill-t20/handoffs/2026-09-20-audit-handoff.md. This file is the map, not the content. Round shape: single kind:documentation round WITH declared carve-out (carve_out_used:1 + non-empty gtd.files on the t21 row).

## Baseline (t20 audit, verified 2026-09-20)

- PASS WITH FINDINGS: 20/20 audit legs reproduced; suite 74/1271/0; pack 339518 < 340000 (482B headroom); 17 anchors / 1703 rewrite-map citations / 59 registry entries / 27 instrument entries; clean tree; drift pin green at rest (533e97b).
- C-1 is the blocking-severity registration defect: two R2 files touched (ci.yml suite-parity 73->74; README-zh-CN.md residual) while the t20 row + four authority docs claim zero R2.

## T-1 — documentation surface (setup + record repairs + ADR + registry)

1. Setup commit absorbs sk (audit report) + nv (audit handoff), untracked since the audit — message discloses absorption. [D-001]

2. ADR-0080 authored: README-* predicate into R3 + the residual-rule gap record (root doc file unclassified by any R3 rule) + wide-form rationale (benign false-inclusion) + explicit NO standing ci.yml suite-parity exemption + pointer back to ADR-0076 (supersede-adjacent note, 0076 untouched). [D-003]

3. t20 trend-row backfill (docs/governance/trend-inventory.json): carve_out_used:1; governance_tooling_diff.files = ['.github/workflows/ci.yml','README-zh-CN.md']; reason's FIRST line names the retroactive correction under t21 audit C-1 + the field-name/content mismatch + pointers to the four Disclosed Repairs + the t21 taxonomy amendment. Row keeps t20-time truth. [D-002]

4. Four zero-R2 prose claims -> Disclosed Repair triples (reason+when+who): t20 decision-ledger D-001 line; spec-t20-disposition sections 0/1/8; .scratch/grill-t20/handoffs/next-round.md; .scratch/grill-t20/reports/2026-09-20-report.md. Each rewritten to 'R1 zero-touch + two R2 files retro-acknowledged via carve-out'. [D-001/D-002]

5. C-2 + C-3 + C-4 + C-7-report repairs: dangling host-contracts.txt citation repaired (host-contracts runs inside gate-all leg); canonical anti-quota sentence ('the ADR exists because the convention needs a policy home - the streak feed is a disclosed fact, not the motive') into the t20 report via Disclosed Repair; CONTEXT.md Bilingual Mirror term filename README.zh-CN.md -> README-zh-CN.md (x2); t20 report '18 evidence files' -> split form via Disclosed Repair. [D-001/D-004]

6. C-6 ratchet defer row in docs/deferred-registry.json: ONE merged row, harness-hardening class; body itemizes 4 individually-closable instances (recapture clone -> shared leg; capNode() single derivation; robust NPMCLI; C1 regex -> \u0080-\u009f copy-safe); four elements (owner/deadline/acceptance/recurrence->split trigger); ratchet 'only shrinks'. CONSTRAINT: registry diff requires a same-commit ADR change (ADR-0027 couplingViolation) — land this row in the same commit as ADR-0080 and name the new defer id inside ADR-0080 text (existence anchoring). Serves as t21 deferred_entry. [D-004]

7. C-7 convention in AGENTS.md working agreement (beside the B-2 line): sentence WITH positive+negative example + boundary — 'evidence counts write split form ("17 captures + 1 fixture"); bare totals forbidden where a capture/fixture split exists'; mechanical position = checklist tick in the closeout/audit loop; effectiveness lookback registered for the next two rounds. [D-004]

8. CONTEXT verify (pre-landed in this docs commit): Trend Anchor disclosed-repair clause + Deferred Registry merged-ratchet clause. [D-002/D-004]

## T-2 — machinery surface (declared carve-out)

9. scripts/surface-taxonomy.js: README-* predicate rule into R3 (wide form anchored on the README-prefix convention; exact width settled at write time, rationale in ADR-0080). [D-003]

10. scripts/build-governance-anchors.js: t20 decision-ledger admission (the owed admission; anchors 17->18). [D-003]

11. Wiring pins: new test/adr-0080-wiring.test.js (or extend adr-0076 wiring) pinning classifyPath('README-zh-CN.md') === 'R3' + README.md still R3 + the four-instance defer row exists. C-5 fixes land here too (stale '76/77/78' titles -> '79'; 'D6 semantics' pin renamed). [D-003/D-004]

12. Cascade regen riding plain commits: adr-index 79->80 (inside <details>), anchors digests, rewrite-map, round-facts, adr-0033 seed inventory (59->60), any count pins. [D-001]

## T-3 — closeout

13. Section-6 battery verbatim re-run '--round grill-t21' through the Non-Interpolating Channel (audit capture.cjs at .scratch/grill-t20/audit-evidence/capture.cjs reusable verbatim); committed evidence incl. clean-tree leg. [D-004]

14. Consent-sweep named lines: defer-0060 standing; defer-0064/0065 pending-evaluation (review 2026-12-15); new C-6 ratchet row; sunset counter; never-commit set. [D-004]

15. t21 trend row: kind:documentation + adr_added:["0080"] + net_additions:1 + carve_out_used:1 + gtd.files non-empty (the round's OWN R2 touches: surface-taxonomy.js, build-governance-anchors.js, + any others) + zero_product_diff:true + deferred_entry (C-6 row). [D-001/D-003/D-004]

16. Round report: facts-canon rendered, zero canon numbers in prose, per-finding closure table (C-1..C-7 each -> fixed/deferred/converted/rejected-with-rationale), C-6 ratchet row + C-7 convention landing disclosed, report_commit null. [D-004]

## Hard rules

- but (GitButler) for ALL VCS writes; grill-t21-docs branch; never push/land (owner-domain).
- Never-commit set: *.patch, round-commits.txt, .scratch/*/audit-evidence/ trees (incl. grill-t20).
- Committed docs via fs.writeFileSync/file-edit tools only; post-write re-read + byte-check.
- '$' lines in captured evidence name the verbatim argv or are marked display-form (B-2 convention).
- Evidence counts in committed prose use split form (C-7 convention).
- All t20 corrections are disclosed (Disclosed Repair triple / reason first-line naming) — zero silent edits to history.
- t20 row records t20-time truth; the t21 taxonomy amendment is forward-looking.
- Registry diff requires same-commit ADR (ADR-0027) — C-6 row + ADR-0080 same commit, defer id named in ADR text.
- report_commit null; canon numbers never in prose; verbatim evidence never byte-patched.
- Mirror sync live: any README.md touch syncs README-zh-CN.md same commit + re-pin (ADR-0079 D6).

## Suggested skills

- grill-with-docs — round-open ritual (done this session)
- domain-modeling — CONTEXT clauses, ADR-0080 authoring
- tdd — adr-0080 wiring pins before/with the taxonomy edit
- code-review — before each commit
- handoff — round-complete checkpoint
- neat-freak — closeout reconciliation
- gitbutler (but) — all VCS writes
- atomcode-research — only for contested dispositions
