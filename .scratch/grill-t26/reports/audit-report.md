# grill-t26 audit report — second-party audit window

- Auditor: audit agent (separate window; no fix authority)
- Date: 2026-09-24
- Scope: grill-t26 anchor-semantics round (report at .scratch/grill-t26/reports/2026-09-24-report.md; ledger D-001..D-005; spec spec-t26-disposition.md)
- Lane under audit: `grill-t26` tip 2ac1f00a (durable non-workspace), base bde0570b; docs lane grill-t26-docs @9674439f
- Method: independent re-run of the acceptance battery + repo-artifact spot checks + dual-axis code review (Standards/Spec sub-agents) + per-D evidence mapping. Audit captures: .scratch/grill-t26/audit-evidence/ (untracked, per audit-evidence convention).

## 1. Hard acceptance — independently re-run at 2ac1f00a (not trusted from the report)

| leg | command (verbatim) | audit result |
|---|---|---|
| compile-class | `node --check` over evidence-freshness.js + capture-battery.cjs + 4 test files | all CHECK-OK; pure-JS repo, no build step |
| jest full | `npx jest` | 81/81 suites, 1359/1359 tests, 0 skipped — matches canon exactly |
| gate-all | `node scripts/run-gates.js` | EXIT 0 (36 entries, 4 UNVERIFIABLE ci-mode — disclosed) |
| governance-inventory | `node scripts/check-governance-inventory.js --coverage-base bde0570b…` | EXIT 0 |
| check-deferred | `node scripts/check-deferred.js` | EXIT 0 |
| adr-index | `node scripts/build-adr-index.js --check` | EXIT 0 |
| rewrite-map | `node scripts/build-rewrite-map.js --check` | EXIT 0 (resynced post-seal, as predicted by D-E) |
| rewrite-map-published | `node scripts/build-rewrite-map.js --published-only` | EXIT 0 |
| anchors | `node scripts/build-governance-anchors.js --check` | EXIT 0 (18 artifacts) |
| pack-smoke | `node scripts/check-pack-smoke.js` | EXIT 0 |
| pack+liveness | `npm pack` → tar extract → install.js --help / init -y --dry-run → jiahao-mcp initialize | tarball 350309 bytes (= canon); all probes 0; initialize returns protocolVersion 2024-11-05 result |
| freshness-eval | `evaluateRound` over t24/t25/t26 | t24 seal 8e177d241 tag=absent; t25 seal 8e177d241 tag=drift; t26 seal 53bff916d inFlightClean capturesAtSealOk freezeViolations=0 tag=absent; 0 claimFailures, 0 unregisteredClaims |
| clean-tree | `git status --porcelain` | only ?? audit-evidence dirs (prior rounds + this audit) — no tracked modifications |

Audit captured-at-head: 2ac1f00ab253d2c167a7d4e0b3e039e526f07a39 on all legs.

## 2. Claim → evidence → conclusion

| # | report claim | independently observed evidence | verdict |
|---|---|---|---|
| C1 | suites 81 / passed 1359 / skipped 0 | own jest rerun at 2ac1f00a: 81/81, 1359/1359 | CONFIRMED |
| C2 | pack_bytes 350309 | own npm pack: 350309 bytes, 114 files | CONFIRMED |
| C3 | instrument_entries 27 | src/instrument-state.json history length = 27 | CONFIRMED |
| C4 | rewrite_map_citations 2785 | docs/rewrite-map.json doc_refs at claim commit 53bff916 = 2785 (now 2817 after post-seal regen — point-in-time canon, consistent) | CONFIRMED |
| C5 | registry_entries 65 | docs/deferred-registry.json total entries = 65 | CONFIRMED |
| C6 | anchors_count 18 | docs/governance/anchors.json artifacts = 18 | CONFIRMED |
| C7 | battery_as_of_commit 9fcf682e | commit exists; wave-1 evidence at that commit all headers 9be511b0, all EXIT 0 | CONFIRMED |
| C8 | report_commit null by design | round-facts.json report_commit: null | CONFIRMED |
| C9 | shared checker scripts/evidence-freshness.js (D-005) | file exists 296 lines; classification order evidence>seal>bookkeeping>regen>claim>anchoring fail-closed; Metz clause in header L11-14; evaluateRound exported | CONFIRMED |
| C10 | taxonomy freshness block (claim_surfaces closed enum reports/+handoffs/ w/ next-round.md exception; non-anchoring classes; rounds t24/t25/t26) | surface-taxonomy.json freshness block verified verbatim incl. retires registration | CONFIRMED |
| C11 | fixture suite 7 legs | test/freshness-checker.test.js: 7 test() legs matching the described set | CONFIRMED |
| C12 | 0083/0084 suites migrated (no re-rolled walk) | both require ../scripts/evidence-freshness once; call evaluateRound with {id, base} config; 23/19 tests | CONFIRMED |
| C13 | t24/t25 SEALs: seal 8e177d24 + recorded_at 2026-09-24, honest back-registration | both files verified; commit 0c75ad8c classified [seal] non-anchoring | CONFIRMED |
| C14 | ADR-0085 normative carrier D-A..D-E | all five clauses present; D-A.2 substantive-inclusion; D-C.4 lag bound same-round human; D-C.5 no-backfill | CONFIRMED |
| C15 | pointer lines ADR-0083 D-A / ADR-0084 D-C | 0083:24 amendment line; 0084:30 amendment line | CONFIRMED |
| C16 | CONTEXT.md glossary Claim Point + Seal Boundary | CONTEXT.md L2428 / L2440 | CONFIRMED |
| C17 | claim commit 53bff916 = report+handoff+facts+map regen; floor 9be511b0 | git show --name-only: exactly those 4 files; classification claim+bookkeeping+regen; floor verified = 9be511b0 (last anchoring strictly before); captures at that commit name 9be511b0 ≥ floor | CONFIRMED |
| C18 | landing tail D-E order | post-claim commits: 3225ca31 regen → 7e556310 terminal wave → 8439970e SEAL → efebc1c1/2ac1f00a regen-only; all non-anchoring per checker | CONFIRMED |
| C19 | SEAL declares 53bff916; freeze active | .scratch/grill-t26/SEAL dual fields; live eval inFlightClean=true (declared == derived last seal-anchor) | CONFIRMED |
| C20 | t25 tag drift recorded; t24 absent; t26 absent pending human push | tags: t25→bde0570b vs seal 8e177d24 = drift; t24/t26 absent | CONFIRMED |
| C21 | defer-0070 quarantine: owner + review 2026-10-15 + three named suites | deferred-registry.json entry carries last_check_in naming adr-0069-wiring/sentinel-ownership/adr-0079-wiring | CONFIRMED |
| C22 | trend row kind:fix adr_added[0085] cumulative R2 diff | trend-inventory.json t26 row verified; names evidence-freshness.js + fixture + ci.yml 79→81 etc. | CONFIRMED |
| C23 | expected-suites 81 in ci.yml; README 85 records; published_tip bde0570b | ci.yml --expected-suites 81; README L364 '85 architecture decision records' + L449 ADR-0085 entry; rewrite-map.published_tip=bde0570b | CONFIRMED |
| C24 | no agent tag push/merge | only adjudicated tags: t25 (pre-existing) + devin-corpus-v2; nothing new pushed | CONFIRMED |
| C25 | evidence wave-1 12/12 green at 9be511b0 | git show 9fcf682e:<evidence files>: headers 9be511b0, EXIT 0 | CONFIRMED |

## 3. D-001..D-005 implementation evidence

- **D-001 (two-round split + anti-ratchet)**: round contains semantics work only; t27 triage stub in next-round.md + handoff; retired object registered in taxonomy freshness.seal.retires + ADR-0085 title/D-D.4; defer-0070 quarantined with owner+date. EVIDENCE COMPLETE.
- **D-002 (declaration carrier + tag co-naming)**: SEAL files dual-field; declaration commits classified non-anchoring [seal]; inFlightClean mechanically verified true; tag tri-state co-named/drift/absent implemented in tagState; absent degrades declaration-only recorded; no backfill (no new tags). PARTIAL GAP: messageHasSha computed but never asserted (tag-message pin is detect-only) — see F-2. EVIDENCE COMPLETE minus F-2.
- **D-003 (claim-point pinning)**: closed enum registered; floor evaluation verified live (53bff916 floor 9be511b0); stale tolerated between claims (terminal-wave headers 3225ca31 > claim floor); seal-point check independent; unregistered-claim warning implemented + fixture-tested (leg 7); bookkeeping exempt. EVIDENCE COMPLETE. Edge note F-7.
- **D-004 (legacy back-registration)**: t24/t25 SEALs written this round; non-anchoring registration effective in-round (0c75ad8c pre-dates all t26 evaluation); freeze mechanics verified (freezeViolations=0; fixture leg 5 tests red-on-edit); sha mechanically derived (both suites' last substantive = 8e177d24). EVIDENCE COMPLETE.
- **D-005 (shared checker + registry + 4 hedges)**: checker in scripts/ not src/shared; suites config+assertions only; fixture suite exists (hedge1); Metz clause in header (hedge3); closed enum + warning (hedge4). Hedge2 (checker change runs all round suites) satisfied in substance via shared require + full-gate jest discipline, no dedicated wiring artifact — see F-3. EVIDENCE COMPLETE minus F-3 nit.

## 4. Dual-axis review findings (aggregated, unmerged)

### Standards axis
- (hard-ish, minor) capture-battery.cjs:92 `$ pack/extract/install/mcp probe` — prose label, neither verbatim argv nor marked display-form (AGENTS evidence convention; L91 marks display-form correctly).
- (judgement) Duplicated Code: provenance-header legs (HEAD_RE/committedUnder/isCapture) are verbatim twins across adr-0083/0084 suites + a third copy in the checker; lastFloorAnchor/lastSealAnchor identical walks differing only in predicate; .split('\n').filter(Boolean) ×6.
- (judgement) Speculative Generality: exported roundConfig never called.
- (judgement) taxonomy claim_surfaces.exceptions decorative — checker never reads it; real exemption rides round_bookkeeping (two sources for one exception → drift risk).
- (judgement) Mysterious names cx/evd/na/rr/caps; magic-string 'GitButler Workspace Commit' duplicated in capture-battery.cjs vs unexported WORKSPACE_SUBJECT.
- (correctness-adjacent) commitFiles() catch returns [] on ANY error — inside a fail-closed checker, a non-merge git failure silently reclassifies a commit as non-anchoring (fail-open at the edge).

### Spec axis
- F-1 seal-anchor wider than spec letter: spec/ledger say last *anchoring* commit; implementation seals last *substantive* (anchoring||claim); ADR-0085 D-A.2 sanctions the widening — wording divergence to adjudicate, behavior consistent with D-E tail design.
- F-2 tag message pin detect-only: state 'co-named' requires target==declared; messageHasSha never asserted — a right-target/wrong-message tag would report co-named.
- F-3 hedge 2 unwired as a named artifact (substance holds via shared require + full jest gate).
- F-4 freshness.rounds[] registry unconsumed: suites hardcode BASE literals; roundConfig unused; current values verified consistent (t24 c526de3 / t25 fc390d5 / t26 bde0570b) — drift risk future-only.
- F-5 conditional seal block in adr-0085-wiring (if r.seal.present) — self-activation made sense pre-seal; post-landing could be unconditional (SEAL deletion now silently deactivates those assertions).
- F-6 unregisteredClaims scans HEAD tree only — a claim-like file added+removed mid-round never warns (edge case).
- F-7 WORKSPACE_SUBJECT walk-filter is un-ledgered (engineering-correct under GitButler; disclosure nit).
- (cleared) .scratch/grill-t26/audit-evidence/ is THIS audit's artifact, not round scope creep.

## 5. Process-violation report (呈报，不追认)

1. **Evidence-convention breach (minor)**: capture-battery.cjs liveness leg emits a prose label instead of verbatim argv / marked display-form (item above). Inside the round's own committed machinery.
2. **Report evidence-index ambiguity (transparency nit)**: report §Evidence index tabulates wave-1 (all EXIT 0 at 9be511b0) without labeling it wave-1; the committed evidence files are the terminal wave (3225ca31) carrying 3 EXIT-1 legs (rewrite-map×2 inside gate-all too). The terminal red IS disclosed — SEAL comment, commit 7e556310 message, round handoff — so no concealment, but the index section itself is stale-shaped relative to the final tree.
3. **Ledger coverage nit**: the GitButler-workspace-commit walk filter (WORKSPACE_SUBJECT) is a semantics-relevant decision absent from the ledger/ADR.
4. Verified clean process-wise: but-commit file sets spot-checked (claim commit = exactly report+handoff+facts+map; seal commit = SEAL only); no pushes/tags by agent; committed-artifact edit channel (fs.writeFileSync) consistent with file states.

## 6. Verdict

**PASS — 通过（附非阻断发现）**. Every load-bearing claim in the round report reproduced against repo artifacts; the full acceptance battery is independently green at the sealed tip; D-001..D-005 all have implementation evidence; the seal/freeze/drift mechanics verify live. No finding invalidates a shipped claim.

Non-blocking findings forwarded for adjudication/t27-candidate work: F-1 wording adjudication (ADR vs ledger letter), F-2 messageHasSha assertion, F-4 registry consumption or pinning, F-5 unconditional seal block, plus Standards judgement calls (dedupe walks/provenance legs, roundConfig, exceptions field, commitFiles fail-open catch, naming). None required rework before this audit's PASS; each is listed for the user to route (fix-window rework vs ledger for t27).

Outstanding human-authority items (unchanged): push/merge lanes; push annotated tag adjudicated/grill-t26 naming 53bff916d798adbb0b8219f822b1ffdc88df070b (same-round lag bound); adjudicate the recorded adjudicated/grill-t25 drift; entity-level countersign items.

## 7. Post-audit fix round (xxx91n-authorized, 2026-09-25) — dispositions

User authorized execution as xxx91n. Fixes landed on `grill-t26-audit` (stacked above grill-t26 → grill-t26-docs; GitButler refused the parallel-lane shape because the edits depend on t26/docs-lane hunks). Commits: ac690ea4 (audit handoff) → bccdef06 (fix pack) → 9455aa18 (disclosure docs) → d972e6e2 (regen) → 1167b7be (zh-CN baseline re-pin per ADR-0079 D6).

| finding | disposition | evidence |
|---|---|---|
| F-1 seal substantive-vs-anchoring wording | ADJUDICATED — ADR-0085 D-A.2 stands (claims count); ledger D-002 addendum records the adjudication; no code change | .scratch/grill-t26/decision-ledger.md D-002 审计裁决补记 |
| F-2 messageHasSha unasserted | FIXED — tagState: co-named requires target==declared AND bare-sha annotation; else drift | scripts/evidence-freshness.js tagState; fixture leg 'tag co-naming' |
| F-3 hedge-2 unwired | RESOLVED-IN-SUBSTANCE — suites now consume the registry (roundConfig), making the registry load-bearing; full jest run exercises all round suites on any checker change | test/adr-0083/0084/0085-wiring roundConfig usage |
| F-4 rounds[] unconsumed | FIXED — roundConfig wired into all three suites with literal-pin assertions | same |
| F-5 conditional seal block | FIXED — unconditional assertions + present==true pin | test/adr-0085-wiring.test.js |
| F-6 HEAD-tree-only unregistered scan | FIXED — added --diff-filter=A history leg; transient add/remove warns | unregisteredClaims(base) + fixture leg |
| F-7 un-ledgered workspace filter | FIXED — ADR-0085 D-D.6 records the exclusion + the audit-disclosed provenance | docs/adr/0085-*.md |
| battery liveness label (process) | FIXED — marked display-form; WORKSPACE_SUBJECT single-sourced from checker | .scratch/grill-t26/capture-battery.cjs |
| commitFiles fail-open catch | FIXED — unreadable diff → null → commitInfo treats as anchoring (fail-closed) | scripts/evidence-freshness.js |
| duplicated anchor walks / gitLines / claim exceptions decorative | FIXED — shared lastAnchor(pred); gitLines helper; exceptions honored in isClaimFor | scripts/evidence-freshness.js |
| mysterious names (cx/evd/rr) | ACCEPTED-AS-IS (judgement call; rename churn not worth a sealed-machinery diff) | — |
| report evidence-index wave-1 ambiguity | ACCEPTED — committed report is the pinned claim artifact; post-hoc edits would rewrite a claim. Disclosure lives in SEAL+handoff+this report | — |

### Re-verification (same acceptance suite, at 1167b7be)

- jest: 81/81 suites, 1360/1360 tests (fixture suite grew 7→8 legs; README/zh-CN counts synced same-commit per ADR-0056/0057)
- run-gates: EXIT 0 — 36 entries, 4 UNVERIFIABLE (ci-mode absent), rewrite-map in sync (2825 citations)
- npm pack → extract → install --help → init --dry-run → mcp initialize: all 0; tarball 350845 bytes (was 350309; README edit)
- evaluateRound: t24 8e177d241/absent, t25 8e177d241/drift(messageHasSha=false), t26 53bff916d/absent — 0 claim failures, 0 freeze violations, 0 unregistered claims; the audit-handoff claim commit (ac690ea4) evaluates conformant
- git show --name-only on all five commits: landed sets == allowlists exactly

### Human-authority items — executed under xxx91n authorization (2026-09-25)

- [x] push lanes: grill-t26 (2ac1f00a), grill-t26-docs (494edab2), grill-t26-audit (1167b7be) → origin — push receipt logged
- [x] annotated tag `adjudicated/grill-t26` → 53bff916d798adbb0b8219f822b1ffdc88df070b pushed; checker now reports **co-named** (target + bare-sha annotation both pinned)
- [x] stack merged to origin/main via PR #10 → merge commit 0ca482f7 (19 commits landed)
- [x] t25-drift adjudication: **STANDS** as disclosed divergence — the pre-contract tag names landed tip bde0570b, not the seal; no backfill per ADR-0050 forward sealing + D-004; eval keeps reporting drift (messageHasSha=false, target≠declared), never silent

Deferred (by design): defer-0070 quarantine resolution (t27 direction); the local GitButler workspace still shows the merged lanes as applied — a `but pull`/sync at next round's open will reconcile.
