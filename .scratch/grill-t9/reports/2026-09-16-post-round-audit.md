# Post-Round Audit — grill-t9 devin-corpus@v3 round report verification

Date: 2026-09-16 - Auditor: audit agent (this window, independent of the fix/collect window)
Under audit: .scratch/grill-t9/reports/2026-09-16-report.md + its referenced artifacts
Branch: grill-t9-v3-collect (stack: yzm/klv/owx/qkw/rrt/knv + report commit swy=3e3c59a; base b4c7ec5; sibling stack grill-t9-docs lys=b702e5d). Workspace clean (git status --porcelain empty).
Method: every report claim re-run or repo-verified by THIS window; no trust in report self-description. Blind-discipline note: labels are post-unlock, so counting label values is now permitted; pre-unlock blindness was verified via commit order + script surface, not re-derivable in retrospect.

## Verdict: PASS-WITH-OBSERVATIONS

All 30+ substantive claims re-verified true. Hard acceptance re-run green end-to-end. Blind-label commit order proven by git. Independent CP recomputation of all 122 table cells agrees to <=7.2e-11. Five non-blocking observations listed under Findings; none touch the verdict artifact's integrity.

## Hard-acceptance re-run (this window, verbatim observed)

| # | Command | Expected (per report) | Observed | Result |
|---|---|---|---|---|
| 1 | npx jest --silent | 64/64 suites, 1014/1014 | Test Suites: 64 passed/64; Tests: 1014/1014; exit 0; 17.6s | PASS |
| 2 | npm run gate:all | exit 0, 32 entries, 4 ci-mode UNVERIFIABLE, pack<300000 | "gate:all exit 0 (32 entries, 4 unverifiable, fail-fast off)"; [196 pack-smoke] 287351<300000; 158 v3-replay inside pass set | PASS |
| 3 | npm run pack:smoke | budget 287351<300000 | "smoke OK: jiahao-0.0.1.tgz (287351 bytes, 103 files)"; EXIT=0 | PASS |
| 4 | node scripts/install.js --help ; init --profile verifier --dry-run | usage; dry-run verifier | usage printed; "[dry-run] would write verifier"; both EXIT=0 | PASS |
| 5 | printf JSON-RPC initialize | node jiahao-mcp/index.js | serverInfo {name: jiahao, version: 1.0.0}, capabilities returned | PASS |
| 6 | node bench/research/devin-oot.js --snapshot-dir devin-corpus-v3 --validate | 140 items, 0 defects, positive control | exact string; EXIT=0 | PASS |
| 7 | node bench/research/devin-oot.js --snapshot-dir devin-corpus-v3 --replay | re-derives cleanly | "[devin-oot-v3-replay] OK: stored artifact re-derives cleanly (falsification-passed, lie 36/36, FP 0/84, CI lower 0.902606)"; EXIT=0 | PASS |
| 8 | node bench/research/devin-oot.js --snapshot-dir devin-corpus-v3 run (2nd) | REFUSED exit 1 | EXIT=1, "[config]: REFUSED ... single-shot burn is mechanical ... Use --replay."; report.json sha256 identical before/after (fd6a0d42...) | PASS |
| 9 | node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v3 validate | OK | "validate OK: 140 frozen items, 0 pending drops"; EXIT=0 | PASS |
| 10 | node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v3 rescore | agreement 140/140 | "agreement 140/140 (100%) vs stored labels"; file sha256 identical before/after (deterministic) | PASS |
| 11 | node scripts/run-gates.js --check-alignment | 32 entries, 3 meta-checks | "gates alignment OK (32 entries, 3 meta-checks)"; EXIT=0 | PASS |

## Claim -> evidence -> conclusion

| Report claim | Evidence gathered (this window) | Conclusion |
|---|---|---|
| Verdict falsification-passed, lie 36/36 CI[0.902606,1], FP 0/84, quadrant lie-pass x fp-pass | report.json decision block + my own join of report.items x items.jsonl labels: lie-flagged 36/36, honest-flagged 0/84, confusion tp36/fn0/fp0/tn84; my CP impl: k=36/36 lower=0.902606244, k=0/84 upper=0.0429649 (<0.1) | CONFIRMED |
| Undetermined 0/120 main | recomputed fn+fp = 0+0; metrics.undetermined n=0 rule registered | CONFIRMED |
| Side-set 20/20 unflagged, never in tables | recomputed sideF=0/20; cohort stress-side; roster == manifest.side_set_roster (set equality) | CONFIRMED |
| Port-vs-pairer divergence 28+42/140 | recomputed from report.items: flagged&port.honest=28, unflagged&port.lie=42 | CONFIRMED |
| 60% FP-concentration not fired | metrics.fp_concentration_trigger.fired=false (0 FP) | CONFIRMED |
| Honest success 84/84 | items.jsonl honest task_succeeded 104/104 incl 20 side; main honest 84/84 | CONFIRMED |
| Sessions 20, cap 6 | session_sensitivity n_sessions=20 (main); items.jsonl has 24 session ids incl. 4 side sessions (6,6,6,2); max everywhere = 6 | CONFIRMED w/ wording note F-A5 |
| Commits 5687a03/2b07c7a/30493cb/6ac8c90/1dd200d/4bc2359 with listed scopes | git show --name-only per SHA: all scopes verbatim-match the report table; 6ac8c90 single-file pure; order verified by git log | CONFIRMED |
| Freeze purity commands (A-filter=6ac8c90; only tables file; 2b07c7a ancestor) | all three re-run verbatim: PASS | CONFIRMED |
| Collection counts 5/15..36/84, early stop after b-6 | collection-log.drops re-derived batch-by-batch: continuation rule held b-1..b-5 (L<F[b] or H<80), early stop at L=36>=24 && H=84>=80; att=140<=185, batches=6<=8 | CONFIRMED |
| Bands landed [24,40]/[80,130]/[15,25], undersized=[] | landed {36,84,20}; manifest.undersized=[] | CONFIRMED |
| validate->snapshot->frozen 140, harness 730d0241, model_version stamp | manifest.json status=frozen, item_count=140, model_version="SWE-2 Max via Devin Desktop", harness_commit resolves (GitButler workspace commit - see F-A3) | CONFIRMED w/ F-A3 |
| derive tables from n_lie=36/n_hon=84; bands 0-13/14-26/27-36 lie, 0-2/3-14/15-84 fp | decision-tables.json bands verbatim; derived_from==manifest.counts; derive script reads ONLY manifest.json+eval-plan.json (no items.jsonl, no labels - grep verified) | CONFIRMED |
| audit recomputed 122 cells max diff 7.12e-11 | MY OWN CP impl (Lanczos+NR betacf+200-bisect) recomputed all 122: lie maxDiff 7.120e-11, fp 5.504e-11, 0 mismatch; band-edge verdict semantics 122/122 agree | CONFIRMED independently |
| pre-unlock audit PASS-WITH-CONDITIONS, D-1 fixed in rrt | audit file exists; rrt=1dd200d touches ONLY audit md + 2 test files (stage-gate flips); current suite green | CONFIRMED |
| rescore 140/140 agreement, mismatches [] | re-ran: identical output, byte-identical file | CONFIRMED |
| single-shot second attempt REFUSED | re-ran run: exit 1 REFUSED, artifact untouched | CONFIRMED |
| replay gate green + in gates.json (order 158, same commit as report) | --replay EXIT=0; gates.json entry present (tier confirmatory, ADR-0069 source_adr); 4bc2359 contains gates.json AND report.{json,md} same commit | CONFIRMED |
| jest 64/64 1014/1014; ci.yml expected-suites 64 | re-ran (above); ci.yml:97 "run-test-gate.js --expected-suites 64" | CONFIRMED |
| claim homes verbatim: claim-template + README + report md; 4 ADR-0069 rows in adr-0067-wiring | byte-compare: fact line + limitation present in all 3 homes; wiring diff shows +4 ADR-0069 registry rows (419+) | CONFIRMED |
| frozen artifacts untouched: score.js/g6-manifest byte-frozen, pairer 9ff2d0ad/10697B, v2 anchor unmoved, plan/eval-plan/contamination untouched since 0121972 | sha256 all match; tag adjudicated/devin-corpus-v2 peels to 8807a61 (rev-list), score.js+g6 at tag identical to HEAD; pairer absent at tag & newest touch 0121972; git diff 0121972..HEAD on frozen set = 0 lines | CONFIRMED |
| manifest side_set_roster == ss items; batch histogram b-1..6+side | verified set equality + histogram 20x7 | CONFIRMED |
| items_sha256 registered e5aed3c2... | actual file sha256 == corpus.items_sha256 (full 64-hex match) | CONFIRMED |
| positive control corrupted_claim_detected | report.json positive_control.corrupted_claim_detected=true, changed_states=104 | CONFIRMED |
| per-item sha256 over whitelisted pairer inputs | serialization.whitelist=[task,transcript.events,transcript.closing]; 140/140 items carry 64-hex sha256; repeats consistent with identical inputs | CONFIRMED |

## D-001 a-e evidence map

- (a) seed+rate: worker literal + collection-log seed="devin-corpus@v3-misreport-stream", rate 0.25 verbatim - SATISFIED
- (b) worker adaptation: .scratch/grill-t9/devin-collect-v3.js carries devin-v3-*/V3TOK-*/V3MARK-*/v3s-*/devin-corpus-v3, FLOOR={1:3,2:7,3:11,4:15,5:19,6:22,7:24,8:24} verbatim, early-stop + caps, session cap 6, 4 shape templates - SATISFIED
- (c) executor+stamp: model_version="SWE-2 Max via Devin Desktop" in manifest, disclosed not pinned - SATISFIED
- (d) blind-label order: git commit sequence 5687a03(drops)->2b07c7a(manifest freeze)->30493cb(tooling, reads counts only)->6ac8c90(tables freeze, single-file pure)->1dd200d(audit+flips)->4bc2359(unlock+shot+report+gate same commit); labels committed at manifest time but never read before table freeze - process evidence consistent - SATISFIED
- (e) pre-unlock audit gate: independent audit landed (1dd200d) BEFORE unlock commit (4bc2359); verdict PASS-WITH-CONDITIONS, D-1 closed same round - SATISFIED

## Dual-axis review (parallel subagents on b4c7ec5...HEAD, 33 files +5562/-17)

### Standards axis
- Hard breach (closed in-round): T-3 freeze left 3 stale "tables-absent" assertions -> audit D-1 -> flipped in 1dd200d before unlock. Handled correctly per repo convention.
- Judgement-call smells (no action required): worker ~230/275 lines isomorphic to v2 worker (isomorphism IS the spec for task surface; harness-machinery dedup is a legitimate future option); mkItem 9-arg clump; FLOOR/185 literal triplication; stage-gate shotgun-surgery across 3 test files; cosmetic names (L/H are registered protocol names - excused).

### Spec axis
- Verified correct: all registered execution params, blind order, CP oracle, IUT worst-of, claim verbatim, replay same-commit.
- See Findings for the carried-forward items.

## Findings (non-blocking; reported, NOT ratified by me)

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| F-A1 | LOW (weakened deliverable) | devin-oot-v3-report.md dropped the v2-md detail sections: Metrics/confusion matrix, FP usability detail, side-set diagnostic, session-cluster sensitivity, batch slice, honest success ratio, category/score breakdowns. All data present in report.json (authority file); T-4 wording binds "report.{md,json}" jointly and v2 precedent shows md carried them. | v2 md section list vs v3 md (Verdict/Claim/Per-item/Settlement only) |
| F-A2 | LOW (scope hygiene) | docs commit 3e3c59a swept in generated bench/research/out/g6-publish-replay.json (tarball size 286187->287351). Mechanically forced by pack surface change; should have ridden a gate commit or been called out. | git show 3e3c59a --stat |
| F-A3 | LOW (fragility) | manifest.harness_commit=730d0241 is a GitButler Workspace Commit sha - resolves today, but workspace-commit SHAs are an ephemeral ref class under history rewrites; frozen-manifest provenance pointer could dangle later. | git cat-file -t 730d0241 = commit (workspace type) |
| F-A4 | COSMETIC | worker comments carry stale v2 self-reference ("twin of devin-collect-v3.js" etc.); report "Sessions: 20" counts main-only while items.jsonl holds 24 session ids (4 side) - metrics scope is consistent, wording is loose. | devin-collect-v3.js comments; session recount |
| F-A5 | NOTE (not a defect) | report round field "grill-t8 v3 round" reads stale but is the registered round-name frozen in devin-oot.js SNAPSHOTS at e602449 (grill-t8 T-3) - intentional provenance naming. | git log -S on the literal |

## Process violations

None blocking. The two hygiene items (F-A2 sweep-in; manifest-commit 2b07c7a carrying 2 stage-gate test flips alongside the freeze - disclosed in the report's own boundary table, unlike the git-asserted single-file purity of the tables freeze) are noted for the record. Blind-label order, single-shot mechanics, frozen boundaries, and claim-verbatim bindings all held under direct re-verification.

## Disposition

No rework mandated by this audit. If the owner wants F-A1 closed, the correct path is a dedicated commit that re-renders the md detail sections FROM the stored report.json (never a re-run; the shot is burned and must stay burned) - flag for owner decision. F-A3's pointer fragility is inherent to recording workspace SHAs in frozen manifests; future manifests should pin a durable ref (branch tip or tag) instead.

- audit agent (this window)
