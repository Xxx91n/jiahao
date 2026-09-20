# grill-t20 — next-round task book (durable)

For any sub-agent. Authoritative inputs: D:/Aworker/jiahao/.scratch/grill-t20/decision-ledger.md (D-001..D-005, all current) + D:/Aworker/jiahao/.scratch/grill-t20/spec-t20-disposition.md (sections 0-8) + inherited charter D:/Aworker/jiahao/.scratch/grill-t19/decision-ledger.md (D-007..D-010) + D:/Aworker/jiahao/.scratch/grill-t19/spec-t19-disposition.md (sections 7-10). This file is the map, not the content. Round shape: single kind:documentation round — zero R2 machinery touched (carve_out_used absent, gtd absent). [Disclosed Repair, 2026-09-20, audit C-1: two R2 files were in fact touched - see the trend-row backfill and the t20 audit report]

## Baseline (t19 audit, verified 2026-09-19)

- PASS WITH FINDINGS: all 19 battery legs re-produced identical exit codes; 73 suites / 1262 tests / 0 skipped; pack 339573 < 340000; 17 anchors / 1566 rewrite-map citations / 57 registry entries / 27 instrument entries; clean tree verified live.
- B-1..B-7 filed (none blocking); the audit absorb pair sits untracked: D:/Aworker/jiahao/.scratch/grill-t19/reports/2026-09-19-audit.md + D:/Aworker/jiahao/.scratch/grill-t19/handoffs/2026-09-19-audit-handoff.md.

## T-1 — documentation surface (setup + B dispositions + ADR)

1. Setup commit absorbs pz + kv (t19 audit report + audit handoff, untracked at audit-final) — message discloses the absorption. [D-005]

2. ADR-0079 bilingual-mirror convention authored: D1 dual filename EN-primary + zh-CN mirror; D2 autonym language-switch line; D3 translation-baseline commit-hash HTML comment; D4 'English original prevails' arbitration; D5 zh-CN tarball-cap exemption citing ADR-0039 D3; D6 same-commit sync discipline + drift pin semantics (t20 D-004). Anti-quota-theater sentence in ADR-0079 + t20 report. ADR-0038/0039 pointer lines only if needed. [t19 D-010 + D-004]

3. B-4 + B-5 deferred-registry rows created in docs/deferred-registry.json: B-4 pending-evaluation, trigger 'when the exit contract next opens, add the precision clause' (collect() red-suite -> exit-2 conflation); B-5 pending-evaluation, trigger 'when an arg-validation convention next forms' (--report bare-arg asymmetry). [D-001/D-005]

4. B-2 convention sentence in AGENTS.md working agreement beside the authoring-path clause: a captured-evidence '$' line names the verbatim argv or is explicitly marked display-form. [D-005]

5. B-6 Disclosed Repair on D:/Aworker/jiahao/.scratch/grill-t19/handoffs/2026-09-19-round-complete.md '18 evidence files' wording — declaration triple (ambiguity, qzk committed 17 under evidence/, grill-t20, 2026-09-20). [D-005]

6. CONTEXT verify (pre-landed in the docs commit): Bilingual Mirror term carries the sync-discipline + drift-pin clause (t20 D-004). [D-004]

7. capture-battery.cjs fixes (R3): $ labels name the verbatim argv or marked display-form (B-2); duplicate round-facts leg + unused WIN var removed (B-3); new git-status clean-tree leg producing committed clean-tree.txt (B-7). [D-005]

## T-2 — README front-face surface

8. README.md full IA redesign per spec section-3 skeleton (inherited t19 D-008): language-switch line -> title + one-line value -> badges -> honesty banner (pinned failed-verdict block verbatim, before '## What it does') -> What it does -> Readiness status (ADR-0072) at ## -> Install ('Verifier deployment discipline' name untouched; threat-model subsection) -> Verification Ladder -> hosts/protection tiers table -> Usage -> Distribution boundary -> '## Measurement record' parent (confirmatory/v1/v2/v3/lane/reproduce demoted one level, verbatim) -> Develop + Architecture (ADR index folded into <details>) -> License. Blank line after every <summary>; no GitHub Alerts inside folds; wiring verdict is the ordering arbiter. [t19 D-008]

9. Prose depth per D-002: deep rewrite of unpinned prose (per-host paragraphs -> tier-table rows; threat model -> short note; Develop/Usage shortest path; repeated promises + internal detail removed; nothing migrates to docs/). Every pinned block byte-identical; pinned phrases keep wording — wiring tests are the arbiter. [D-002]

10. Three static non-numeric badges: 'license: MIT' + 'profiles: generator | verifier' + 'channel: npx github:'. Mermaid flowchart in Architecture: generator(advisory) -> claim -> independent verifier -> 6-rung ladder -> four verdicts (render-verify; prose fallback non-blocking). [D-003]

11. README.zh-CN.md created: autonym switch line (English | 中文, current language bold and unlinked); translation-baseline commit-hash HTML comment; structurally aligned; pinned blocks translated with 'English original prevails' pointers; git-tree only, never in tarball. [t19 D-007 + D-004]

12. test/adr-0079-wiring.test.js created (R3 surface): mirror exists; switch-line pair; baseline comment 40-hex sha exists in history; shared ## skeleton; mirror absent from package files; drift pin 'git log -1 README.md' == recorded baseline. [D-004]

13. B-1 discriminating pin: [fix(+1), doc(+1)] scenario in test/adr-0076-wiring.test.js (old semantics feed+push fires advisory; new semantics transparent = silent). [D-005]

14. Cascade regen: adr-index sentinel region regenerated (78->79) inside the <details> fold; anchors + rewrite-map + round-facts regen riding plain commits. [D-001 + t19 D-010]

## T-3 — closeout

15. Section-6 battery verbatim re-run '--round grill-t20' through the Non-Interpolating Channel harness + the new committed git-status clean-tree leg (clean-tree.txt). [D-005]

16. Consent-sweep named lines: defer-0060 standing (restored in t19); new B-4/B-5 registry rows; sunset counter; never-commit set (audit-evidence trees incl. grill-t19 + patches + round-commits). [D-005]

17. t20 trend row: kind:documentation + adr_added:["0079"] + net_additions:1 + zero_product_diff:true + deferred_entry (one of the B-4/B-5 rows, satisfying ADR-0076 D-F clause-3); carve_out_used and governance_tooling_diff absent. [D-001 + t19 D-010]

18. Round report: facts-canon rendered, zero canon numbers in prose, B-disposition registrations itemized, anti-quota-theater sentence carried, report_commit null. [D-005 + t19 D-010]

## Hard rules

- but (GitButler) for ALL VCS writes; grill-t20-docs stacks on grill-t19-docs; never push/land (owner-domain).
- Never-commit set: tq/nl/xu/my patches + .scratch/*/audit-evidence/ trees (incl. grill-t19) + round-diff patches + round-commits.txt.
- Committed docs via fs.writeFileSync/file-edit tools only; post-write re-read + byte-check.
- Battery args carrying backslashes through Non-Interpolating Channel (arg arrays / script files); '$' lines name verbatim argv or marked display-form.
- Every pinned README block byte-identical; wiring tests are the ordering arbiter; 'Verifier deployment discipline' section name untouched.
- No R2 machinery edits inside t20 (build-round-facts.js untouched; B-4/B-5 live in the registry). [Disclosed Repair, 2026-09-20, audit C-1: the restraint was breached by ci.yml + README-zh-CN.md - repaired retroactively in the trend row]
- report_commit null; canon numbers never in prose; verbatim evidence never byte-patched.

## Suggested skills

- grill-with-docs — round-open ritual (done this session)
- domain-modeling — CONTEXT clause, ADR-0079 authoring
- beautify-github-readme + readme-crafter — README execution
- tdd — wiring pins (adr-0079 file, B-1 scenario) before/with the edits
- code-review — before each commit
- handoff — round-complete checkpoint
- neat-freak — closeout reconciliation
- gitbutler (but) — all VCS writes
- atomcode-research — only for contested dispositions
