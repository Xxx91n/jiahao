# Decision Ledger — grill-adr0058

Track every confirmed answer from grill. Rule: any compaction/handoff action is forbidden until this ledger is current on disk.

Format per entry:
- **D-xxx** | status | date | question | answer (verbatim) | normalized need | explicit constraint/negative need | refs

---

## D-001 | current | 2026-09-11

- **Original question (Q1)**: defer-0026 (independent CI test job + always() summary) vs ADR-0049 leftover (decision-rule-0049.md change-management policy) — which to land first, or both in same round?
- **Your verbatim answer**: 采纳
- **Normalized need (from atomcode)**: adopt the serial order — defer-0026 in its own implementation round, then decision-rule change-management policy as the next doc round; do not bundle.
- **Explicit constraints / negative needs**:
  - CI contract change and metrology rule policy must NOT be in the same round (§8.3 / FDA Part 11 separation + project working agreement doc round → impl round rhythm)
  - governance policy must have a machine-verifiable presence assertion (no claim-only)
  - always() aggregation three-misuses must be avoided: (a) skip-only-success gate (#26822 defect); (b) aggregator job with skippable condition; (c) continue-on-error disguised as green
  - aggregator layer must NOT replace gate layer: suite-count assertion (ADR-0057 D-C) stays in gate layer
  - splitting ci.yml jobs must update branch protection names + scripts/check-ci-wiring.js blocklist + ADR-0034 D5 wording (ADR-0057 D-D foreshadowed)
  - defer-0004 evaluation MUST be in the same round as defer-0026 (defer-0026 rationale forces this)
- **Refs**:
  - docs/adr/0057-test-skip-honesty-and-suite-count-assertion.md (D-D)
  - docs/adr/0049-decision-rule-anchor-and-metrological-ledger-completion.md (post-audit)
  - docs/deferred-registry.json (defer-0026, defer-0004)
  - docs/decision-rule-0049.md (governance gap — version anchor 0049.1, no change authority)
  - atomcode research: "ADR-0057 后续：defer-0026 与决策规则治理的落地排序调研" (12 sources fetched)
  - GitHub #26822 (richja pattern + ju-manns 2025-02 false-green defect), #44490 (bucket-job pattern), #15452 (continue-on-error false-green), #72708 (branch-protection rename trap)
  - ISO/IEC 17025:2017 §7.1.3 / §8.3.2; ILAC-G8:09/2019 §7; FDA 21 CFR Part 11 §11.10(e)(i); IVDR Annex XIII (analogy)

## D-002 | current | 2026-09-11

- **Original question (Q2)**: Which aggregation variant for the always() summary job — A (richja, success||skipped green), B (bucket-job, failure blacklist), or with added cancelled check?
- **Your verbatim answer**: A
- **Normalized need**: adopt A-hardened — green = each needed job result strictly equals `success`; failure / cancelled / skipped / unknown → red. NO extra cancelled-only check.
- **Explicit constraints / negative needs**:
  - Canonical richja (success||skipped) IS forbidden — it violates D-001 (a) "no skip-only-success gate"
  - "Add cancelled check" premise is falsified by ju-manns primary evidence — skipped, not cancelled, is the mask state after partial re-run; adding cancelled would not fix ju-manns
  - Skipped MUST be red — this is the ONLY true fix for the ju-manns re-run false-green defect (GitHub masks failed legs as skipped on partial re-run)
  - Consequence of skipped=red: partial re-run → all-red until full re-run — this is correct evidence-incomplete semantics for a verification layer
  - Test job has no path filter → zero legitimate skipped jobs → zero false positives from this rule
  - Aggregator job MUST use always() unconditionally (not !cancelled())
  - Record the deviation from canonical #26822 in the landing ADR with ju-manns primary evidence cited
  - Wire a wiring-test assertion: aggregator if = always() exactly; green-set comment pinned to {success} only
- **Refs**:
  - atomcode research: "always() 聚合门 Variant A vs B" report (18 sources fetched)
  - GitHub #26822 (ju-manns 2025-02-26 primary evidence — partial re-run masks failure as skipped)
  - GitHub #44490 (bucket-job pattern), #26303 (cancelled may appear as skipped — behavior drift)
  - dorny/test-reporter, EnricoMi/publish-unit-test-result-action, alli action (industry success-only consensus)
  - D-001 constraints (all satisfied; canonical A deviation explicitly annotated)

## D-003 | current | 2026-09-11

- **Original question (Q3)**: defer-0004 evaluation scope — Option A (presence-coupled only + register ADR-0016 D4) vs Option B (harvest all external-event deferred items). Sub-point: ADR-0016 D4 sub-items (ii)(iii) disposition — register or stay in prose?
- **Your verbatim answer**: A (main Q3) | A (sub-point)
- **Normalized need**:
  - defer-0026 round evaluates ONLY presence-coupled items: defer-0004 + defer-0026 itself. NO external-event harvesting.
  - Register ADR-0016 D4 sub-item (i) (verifiable-log wheels: hypercore/ssb/Rekor) as `external-event / pending-evaluation`, yearly cadence, review_at aligned to defer-0024 (2027-09-01), last_check_in backfilled
  - ADR-0016 D4 sub-items (ii) (profile.js relocation + configDir dedup) and (iii) (lint boundary) stay in ADR prose as D4 annotations — do NOT register (no live trigger, register=noise)
  - defer-0004 evaluation is NOT auto-activation — check-ci-jobs.js SATISFIED output, then human chooses three exits: activate, re-defer+update-rationale, or close. This decision recorded in ADR-0058
  - Do NOT touch defer-0003 or defer-0024 — external-event types with no presence coupling; let them hit their natural review_at cadences (2027-08-31 / 2027-09-01)
- **Explicit constraints / negative needs**:
  - Harvesting all related deferred items is an industry anti-pattern (KEP/PEP/RFC + tech-debt register consensus: per-item independent disposition)
  - B conflicts directly with D-001 (serial/no-bundle discipline + trigger domain mismatch) — NOT silent redirect, explicitly flagged
  - ADR-0035 D4 "one entry, one condition type" must be upheld — D4 sub-items (i)/(ii)/(iii) must NOT be registered as a single compound entry
  - ADR-0033 D1 fact-source completeness is now satisfied with D4 registration (last pre-registry prose deferred item captured)
- **Refs**:
  - atomcode research: "ADR-0058 Grill: defer-0004 evaluation scope" (15 sources fetched)
  - KEP README (per-KEP independent status + graduation criteria); PEP 1 (per-PEP deferred/draft/rejected); RFC 2026 §2.2 (per-I-D 6-month expiry + tombstone)
  - LogRocket 2026-07-10 (dedicated-debt-sprints anti-pattern); Artineering (prioritization separate step)
  - ADR-0016 D4 (three bundled sub-items — verifiable-log wheels + profile.js relocation + lint boundary)
  - ADR-0033 D1/D3/D5; ADR-0035 D4/D6; ADR-0057 D-D
  - docs/deferred-registry.json (defer-0004, defer-0003, defer-0024)

## D-004 | revised | 2026-09-11

- **Revised 2026-09-12** - superseded in part by **D-011**. This research round falsified one of this decision's premises: that "deploy the required check" is a step a human can actually perform. Measured: `gh api repos/Xxx91n/jiahao/branches/main/protection` returns HTTP 403 "Upgrade to GitHub Pro or make this repository public to enable this feature"; same for `/rulesets`. The repository is private on a free plan, so the platform provides no branch protection and no required status checks at all. The Option-C layering itself (presence predicate in the script, anti-pattern assertions in the wiring test) **stands**. What is overturned is the sufficiency claim that "ADR prose + a human deployment checklist" is an adequate carrier: industry models classify a rule that exists only in docs and not in CI as not-a-control (Codacy 2026-06). The carrier question moves to D-011. Original record preserved below.


- **Original question (Q4)**: check-ci-jobs.js verification depth — Option A (minimal existence), Option B (full anti-pattern machine-check), Option C (two-layer: presence in script + anti-patterns in wiring test)? Sub-point: "required check" machine-asserted or prose-only?
- **Your verbatim answer**: 采纳
- **Normalized need**: adopt Option C — check-ci-jobs.js carries only presence predicate (test job exists + summary job exists + summary uses always()); anti-pattern assertions (path-filter absent, skipped!=success, gate:all no longer contains test step) go into test/adr-0058-wiring.test.js as characterization/change-detector tests; "summary is required check" is NOT machine-asserted — it lives in ADR prose + human deployment checklist (branch protection lives outside ci.yml, ci.yml cannot self-declare required — vacuous-pass risk)
- **Explicit constraints / negative needs**:
  - B is rejected: "summary is required" is a pseudo-assertion (steve-kaschimer 2026-05 vacuous-pass proof — job rename → silent merge, any ci.yml-only script cannot verify)
  - B also conflicts with D-003 (would harvest defer-0026 invariants into defer-0004 presence evaluator)
  - Wiring test assertions must be intent-shaped ("summary green = success only"), NOT golden-master snapshots (Wikipedia: characterization tests detect change, human judges whether expected)
  - check-ci-jobs.js stays zero-dependency, exit-code evaluator per ADR-0035 D6 (evaluator suggests, does NOT auto-activate)
  - Grep-based wiring test fragility (block scalar / `if: always()` vs `if: ${{ always() }}`) is mitigated by existing check-ci-wiring.js runLines scanner precedence
  - Required check deployment uses `gh api` audit (compare required contexts vs latest PR check-runs) as human procedure, NOT automated — result documented in ADR prose
- **Refs**:
  - atomcode research: "check-ci-jobs.js verification depth" report (13 sources fetched)
  - actionlint checks.md (4.2k stars, self-declares syntax/semantic only, does NOT enforce policy); dev.to 2026-04-27 linter comparison (syntax vs policy = deliberate layering)
  - Chromium presubmit docs ("presubmit scripts do not guarantee invariants" — persistent invariants belong to test suite)
  - steve-kaschimer 2026-05 (vacuous-pass: job rename → required check mismatch → silent merger; no ci.yml-only script can verify)
  - Michael Feathers / Wikipedia characterization test definition (change detector + human judgment, NOT golden-master)
  - Google SWE Book ch14 (config = #1 outage source; config-in-test is the fix)
  - ADR-0031 D1 (wiring-test per gate), ADR-0035 D6 (evaluator suggests, no auto-activation), D-001/D-002/D-003 (all satisfied)
  - scripts/check-ci-wiring.js (runLines scanner precedent for block-scalar handling)

## D-004 | revised | 2026-09-11

- **Revised 2026-09-12** - superseded in part by **D-011**. This research round falsified one of this decision's premises: that "deploy the required check" is a step a human can actually perform. Measured: `gh api repos/Xxx91n/jiahao/branches/main/protection` returns HTTP 403 "Upgrade to GitHub Pro or make this repository public to enable this feature"; same for `/rulesets`. The repository is private on a free plan, so the platform provides no branch protection and no required status checks at all. The Option-C layering itself (presence predicate in the script, anti-pattern assertions in the wiring test) **stands**. What is overturned is the sufficiency claim that "ADR prose + a human deployment checklist" is an adequate carrier: industry models classify a rule that exists only in docs and not in CI as not-a-control (Codacy 2026-06). The carrier question moves to D-011. Original record preserved below.


- **Original question (Q4)**: check-ci-jobs.js verification depth — Option A (minimal existence) vs B (full anti-pattern assertions) vs C (two-layer: minimal in check-ci-jobs.js + anti-patterns in wiring test). Sub-point: "summary is required check" — machine-assert or prose-only?
- **Your verbatim answer**: 采纳
- **Normalized need**:
  - Adopt Option C (two-layer): check-ci-jobs.js carries ONLY presence predicates (test job exists + summary job exists + summary uses always()) — this is the defer-0026 registry predicate itself
  - Anti-pattern assertions (path filter absent on test job, skipped != success in summary logic, gate:all no longer contains test step) go into test/adr-0058-wiring.test.js as intent-shaped grep assertions
  - "summary is required check" is NOT machine-asserted — it lives in GitHub branch protection/Ruleset, ci.yml cannot self-declare required; any read-only ci.yml script that claims to verify it is a false assertion (vacuous-pass, steve-kaschimer 2026-05)
  - required-check recorded in ADR prose + human deployment checklist, NOT in wiring test or check-ci-jobs.js
- **Explicit constraints / negative needs**:
  - B is wrong architecture: (i) "summary is required" is a false assertion from day one; (ii) deep assertions in presence evaluator violate D-003; (iii) conflicts with ADR-0035 D6 "evaluator suggests, does not auto-activate"; (iv) deep YAML parsing requires deps or hand-rolled parser (more fragile than grep)
  - Wiring test assertions must be intent-shaped (contract shape), NOT golden-master line snapshots (format drift fragile per Wikipedia characterization-test definition)
  - Wiring test grep anchors on `needs.*.result` semantic pattern, not whole-line snapshot; `if: ${{ always() }}` variant tolerance tested against actual tree at impl time
  - check-ci-jobs.js stays zero-dependency, exit-code semantics (ADR-0035 D6 role)
  - ADR-0031 D1 "every gate ships a wiring test" is satisfied by adr-0058-wiring.test.js
- **Refs**:
  - atomcode research: "dispatch-atomcode-q4" report (12 sources fetched)
  - actionlint checks.md (focuses on mistakes, does not enforce policy); dev.to 2026-04-27 (linter comparison: syntax vs policy layering)
  - Chromium presubmit docs ("presubmit scripts do not guarantee invariants")
  - steve-kaschimer 2026-05 (vacuous-pass: job rename → required check mismatch → silent merge)
  - Wikipedia characterization test (Michael Feathers: change detector + human judgment, not correctness verification)
  - Google SWE Book ch14 (config = #1 outage source; test carries config compatibility)
  - ADR-0031 D1 (wiring test pattern); ADR-0035 D6 (evaluator role); D-001/D-002/D-003 (no conflicts)
  - check-ci-wiring.js runLines scanner precedent (already handles block-scalar drift)

## D-005 | current | 2026-09-11

- **Original question (Q5)**: ADR-0034 D5 revision direction — Option A (narrow D5 to "gate:all is single entrypoint FOR THE GATE LAYER; test job is independent CI-layer consumer") vs B (expand gate:all semantics to include test job as a lane) vs C (different layering).
- **Your verbatim answer**: 采纳
- **Normalized need**:
  - D5 wording narrowed to: "gate:all is the single entrypoint for the gate layer; test job is an independent CI-layer consumer that does not go through gate:all"
  - Two-layer entrypoint separation: gate layer (gate:all owns exclusively) + CI layer (test job + summary job are CI-layer consumers, not gate-layer)
  - check-ci-wiring.js blocklist updated: test job running `npm test` is NOT blocked (it is outside gate:all now); gate:all occurrence count assertion adjusted (gate:all job may still run gate:all for remaining gates, but test step is removed from it)
  - gates.json remains the fact-source for the gate family — test job is NOT a gates.json entry (it runs outside run-gates.js)
- **Explicit constraints / negative needs**:
  - B (semantic inflation) is the god-facade anti-pattern (GoF Facade: "entry point needed to each level of layered software"; refactoring.guru: "Additional Facade to prevent polluting a single facade")
  - B breaks ADR-0034 D1 "registry as fact-source" — test job as a lane would not be in gates.json, making "what is a gate" unanswerable from the registry
  - B conflicts with D-003 (fact-source completeness) and D-004 (presence predicate subject clarity)
  - Thoughtworks 2026-05: "Overloading" is the first mechanism of semantic drift — container unchanged, semantic payload changed
  - NoOps School 2026-02: "Tests are inputs to gates" (T9); "CI pipeline Often seen as same as gating" listed as common confusion (T1)
  - gate must answer a narrow question ("did this configured job pass?") — arXiv 2607.14890
- **Refs**:
  - atomcode research: "ADR-0034 D5 revision direction" report (16 sources, 9 full-text read)
  - Wikipedia Facade pattern (GoF: per-layer entrypoint); refactoring.guru (Additional Facade, god-object warning)
  - Wikipedia ISP/Xerox (fat interface failure); Google SWE Book ch23 (presubmit/postsubmit layering)
  - Chromium presubmit (dual entrypoint: upload/commit); NoOps School merge-gates (T1/T9 terminology)
  - Thoughtworks semantic drift (Overloading mechanism); arXiv 2607.14890 (gate answers narrow question)
  - ADR-0034 D1/D2/D5; ADR-0057 D-D; D-001 through D-004 (all consistent)

## D-006 | current | 2026-09-11

- **Original question (Q6)**: gate:all job retains what after test step removed — A (gate:all still runs, test gate UNVERIFIABLE/skip inside) vs B (gate:all disappears, gates inlined as steps) vs C (test gate removed from gates.json, suite-count wrapper migrates to test job).
- **Your verbatim answer**: 采纳
- **Normalized need**:
  - gate:all job retains `npm run gate:all` exactly 1 occurrence (check-ci-wiring.js count stays 1)
  - test gate (order 100) REMOVED from gates.json — test is no longer a gate-layer member, belongs fully to CI layer
  - suite-count assertion (ADR-0057 D-C) migrates with run-test-gate.js wrapper into independent test job
  - --expected-suites 48 registered expectation re-anchored to ci.yml call line + adr-0058-wiring.test.js
  - Four same-round companion revisions: (1) gates.json delete test gate entry, (2) ci.yml dual-job + wrapper call, (3) adr-0057-wiring.test.js re-anchor D-C assertion, (4) check-ci-jobs.js presence expansion
- **Explicit constraints / negative needs**:
  - A rejected: pseudo-UNVERIFIABLE violates ADR-0040 D3 (exit 2 only from capability probing deterministic negative) and D6 (env-absence domain separation); skip variant → gate:all permanently red under D-002
  - A rejected: blocklist kills wrapper — run-test-gate.js token blocked when test gate is in registry, so D-C assertion silently lost from independent test job
  - B rejected: gate:all command disappears from ci.yml → violates ADR-0034 D2/D5 single-entrypoint + check-ci-wiring.js fail-closed
  - No stub/placeholder in aggregate scope — industry consensus (Bazel test_suite pure enumeration, GitHub gatherer pattern, johal.in incident root cause)
  - adr-0057-wiring.test.js D-C anchor must be revised same-round (not deferred)
- **Refs**:
  - atomcode research: "grill-adr0058 gate:all split decision" report (12 sources, 8 full-text read)
  - Bazel test_suite (pure enumeration, no stub concept); GitHub gatherer pattern (boinkor.net 2023-11)
  - johal.in postmortem (GitLab CI 16.9 silent skip 72% tests, $42k loss); actions/runner#2566 (skipped=success platform defect)
  - ADR-0040 D3/D6 (narrow predicate, domain separation); ADR-0034 D2/D5; ADR-0057 D-C/D-D
  - check-ci-wiring.js (blocklist generation from registry); run-test-gate.js (wrapper); gates.json (test gate order 100, params --expected-suites 48)
  - D-001 through D-005 (zero conflicts; D-005 consistency enforcement)

## D-007 | revised | 2026-09-12

- **Revised 2026-09-12** - superseded in part by **D-011**. The normalized need asserted that "branch protection configures ONLY `summary` as required check (single contract point, never changes)". Measured: that configuration **cannot exist** on this repository's platform (private + free plan -> GitHub REST 403 on both `/branches/main/protection` and `/rulesets`; see D-004 revision). The technical core of this decision - `needs: [gate-all, test]` full-set aggregation - **stands and is now production-verified**: CI run 34631502524 shows the summary job correctly aggregating `results="failure failure"` to red, which validates D-002 A-hardened as built. What is overturned is the premise that the single contract point can be enforced. Original record preserved below.


- **Original question (Q7)**: summary job `needs:` list — A (needs both [gate:all, test]) vs B (needs only [test], gate:all is separate required check) vs C (needs only [gate:all], structurally impossible after D-006).
- **Your verbatim answer**: 采纳
- **Normalized need**:
  - summary job `needs: [gate:all, test]` — aggregates ALL parallel jobs (full set, not subset)
  - branch protection configures ONLY `summary` as required check (single contract point, never changes)
  - gate:all and test are internal — their names can change without touching branch protection
  - Semantics: "gate layer all passed AND test layer all passed" — summary is the CI-layer convergence point for D-005 two-layer entrypoint
- **Explicit constraints / negative needs**:
  - B rejected: two required-check contract points = double vacuous-pass surface (steve-kaschimer: "expected-but-absent check treated as satisfied")
  - B rejected: D-002 A-hardened (skipped=red) completely ineffective for gate:all — gate:all not in summary needs → its skipped handled by platform (=success), summary cannot see it
  - B rejected: ju-manns partial re-run defect unfixable under B — gate:all false-green invisible to summary (runner#3649 same-type incident)
  - C structurally impossible after D-006 (test removed from gate:all)
  - suzuki-shunsuke/required-status-check-action makes subset aggregation a machine hard error — industry has zero positive precedent for subset aggregation
  - Marc Philipp (2026-08-10): even detect-only `changes` job is aggregated — "list all dependencies, do not omit"
- **Refs**:
  - atomcode research: "dispatch-atomcode-q7" report (12 sources, 8+ full-text read)
  - Marc Philipp 2026-08-10 "One required check to rule them all" (JUnit #5670, needs: [changes, frontend, backend])
  - steve-kaschimer 2026-05-29 (ci-gate: needs: [changes, lint, test]; "Everything else is internal")
  - suzuki-shunsuke/required-status-check-action (machine hard error on missing needs)
  - boinkor.net 2023-11 (gatherer pattern, merge queue); alls-green/webknjaz (#26733); brunoscheufler 2022 (fan-in gate, matrix shard maintenance hell)
  - actions/runner#3649 (backend-test-complete needs not covered → sub-job failure still merged)
  - D-001 through D-006 (zero conflicts; D-002 + D-005 optimal carrier)

## D-008 | current | 2026-09-12

- **Original question (Q8)**: CI test job corpus tier — A (explicit JIAHAO_TEST_TIER=public) vs B (full tier via secret) vs C (auto-probe, no env). Sub-point Q8b: should gate:all also explicitly declare JIAHAO_TEST_TIER=full as symmetric contract in ADR-0058?
- **Your verbatim answer**: A (both Q8a and Q8b adopted)
- **Normalized need**:
  - CI test job explicitly sets `JIAHAO_TEST_TIER=public` — verifies the published form (clean-clone integrity, ADR-0056 title promise)
  - gate:all job maintains full tier (secret injection, current behavior unchanged)
  - ADR-0058 prose explicitly records the symmetric tier contract: gate:all=full / test job=public — even if gate:all code does not force-add env, the document layer pins the two-layer tier division
  - test job does NOT depend on JIAHAO_BENCH_CORPUS_B64 secret — fork PR and main branch behave identically, CI results comparable across trigger contexts
  - resolveCorpus() narrowing semantics provide anti-drift: even if runner accidentally has private corpus, test job stays public
  - --expected-suites 48 stays unchanged — suite count = 48 test files, tier only changes test bodies not suite collection (Jest exit 1 on no match, jest#8594)
- **Explicit constraints / negative needs**:
  - B rejected: fork PR has no secret → same test job runs full on main, public on fork → results incomparable → D-002 green=success semantic drifts
  - C rejected: auto-probe correctness fully depends on probe logic + environment implicit contract — johal.in/helmdeck/mockserver three incident common shape
  - Actual env var name is JIAHAO_TEST_TIER (not CORPUS_TIER as assumed in the question — atomcode corrected this by reading corpus-gate.js source)
  - test job must NOT reference JIAHAO_BENCH_CORPUS_B64 in its scope — wiring test can grep-assert this anti-pattern (D-004)
  - JIAHAO_TEST_TIER=public presence in test job env block = machine-assertable presence predicate (D-004)
- **Refs**:
  - atomcode research: "Grill Q8: CI test job corpus tier" report (12 sources, 8+ full-text read)
  - johal.in postmortem (GitLab CI 16.9 silent skip, $42k); helmdeck (test never ran for 6 years); mockserver-monorepo aac3c7a (MOCKSERVER_REQUIRE_SERVER=true fix)
  - dev.to vibeagent 2026-08-03 (pytest zero-test success, 6 consecutive cases); jest#8594 (exit 1 on no match)
  - env.dev 2026-04-26 (GitHub secrets not available in fork PRs); GitHub Docs env: mechanism
  - ADR-0056 D-A/D-C/D-D (corpus tier, tiered execution, maintainer recurrence); ADR-0038 D2 (CI is legitimate corpus holder, git clone is not)
  - ADR-0057 D-B (tier-none honest skip); D-001 through D-007 (zero conflicts; D-005/D-004/D-002 strong-coupled enhancement)

## D-009 | current | 2026-09-12

- **Original question (Q9)**: order 100 gap handling after test gate removal from gates.json — A (leave gap, no renumber) vs B (renumber all >100 to fill gap) vs C (tombstone entry with status: migrated).
- **Your verbatim answer**: 采纳
- **Normalized need**:
  - Leave order 100 empty (gap). No renumbering. run-gates.js sorts by order, gap does not affect execution.
  - ADR-0058 prose records: "order 100 retired, do not reuse" — history enters the ledger/ADR prose, not the runtime registry
  - gates.json physically removes test gate entry (D-006 already decided); order 100 becomes a retired slot, not a tombstone entry
- **Explicit constraints / negative needs**:
  - B rejected: breaks 5 real wiring test order assertions (105/115/155/170/185) + entries[3] index drift in adr-0034 negative fixture + all historical/log/ledger references to order 100 become ambiguous
  - B rejected: protobuf official names "aesthetically pleasing number order" as wrong motivation; renumbering = wire-format incompatible change
  - B rejected: gates.json already has ~30 gaps (101, 103-104, 106-109...) — compact numbering was never this registry property; ADR-0043 already used gap-insertion (order 115 between 110-120)
  - C rejected: check-ci-wiring.js blocklist generated from registry entries — test gate tombstone means run-test-gate.js stays blocked → D-006 companion revision (2) fail-closed
  - C rejected: needs schema change to survive (larger than the problem it solves); conflicts with D-005 ("test job is NOT a gates.json entry") and D-006 ("physically removed" + "no stub/placeholder") verbatim
  - C rejected: gates.json is an executed runtime manifest (4 consumers: runGates/checkAlignment/blockedTokens/validateRegistry), not a static record like IANA registry — tombstones require per-consumer special-casing = the exact pattern ADR-0033/0034 was built to eliminate
  - run-gates.js validateRegistry never required contiguity (only checks integer/unique/band contract)
- **Refs**:
  - atomcode research: "ADR-0058 Grill — order 100 gap disposition" report (15 sources, 6 full-text read)
  - protobuf.dev proto3 guide (never reuse/never renumber); GitHub spec-kit #4065 (2026-08-12: "gaps are the expected steady state, not damage to repair")
  - IANA RFC 6335 (de-assign → Reserved, not reused); Kafka log compaction (offset permanent, tombstone cleaned); CSS z-index (step 10/100 for insertion room)
  - Brent Ozar 2025-12 (identity gaps okay); Microsoft T-SQL IDENTITY (no contiguity guarantee); S3 delete markers (storage layer, not business manifest)
  - Local: gates.json (~30 existing gaps), run-gates.js (validateRegistry no contiguity), check-ci-wiring.js (blocklist from registry → C mechanical disproof), 5 wiring test order assertions (grep evidence)
  - ADR-0034 D1/D4; ADR-0043 (fact-source discipline + order 115 gap-insertion precedent); ADR-0057 (order 100 prose reference)
  - D-001 through D-008 (zero conflicts; D-005/D-006 verbatim consistent)

## D-010 | proposed | 2026-09-12

- **Question (research 1)**: defer-0026 (independent CI test job + always() summary) 的解冻条件被 check-ci-jobs.js 判为 SATISFIED，但支撑它的验证面（新建 CI test job）当前结构性损坏（见 D-013）。应 activate / re-defer / close？
- **Research basis**: atomcode 深度调研（Confidence 高；10 篇已核验原文，7 域名，Exa+Tavily+AnySearch 三引擎交叉）。五套心智模型：假性通过 vacuous pass（clawprint：checker 返回零是嫌疑犯不是结果，需 last_fired_on_known_positive）、破损窗口纪律（MariaDB protected-branches：破损基线上不激活守门员；Pragmatic/Evergreen：红建=紧急）、存在≠健康（BVT/getautonoma：YAML 声明了 job ≠ job 能跑；emmer.dev skipped=passing）、软/硬闸门与豁免出口（TIOBE 质量门）、trust-but-verify（GitHub docs：admin bypass + skipped 语义）。
- **Recommendation**: **re-defer + 更新 rationale**。禁止 activate（等于拿不存在的证据解冻）；不 close（意图仍有效：status-check 可见性、逆转 skipped=success）。
- **Normalized need**: registry status 保持 pending-evaluation；rationale 写入：① SATISFIED 仅为存在性（presence）满足、健康性不满足；② 修复动作 = 定位并修复 run-test-gate.js 崩溃（D-013）；③ **条件升级**：把 `declares a dedicated test job` 改写为健康谓词（"test job 在 main 上连续 N 次为绿 + 无 path-filter + summary 成功聚合"），后两者可引用 test/adr-0058-wiring.test.js 的反模式断言作 verified_by（符合 ADR-0035 D5/D6）。
- **Explicit constraints / negative needs**: 顺序纪律——先修 D-013 的破损依赖，再重评；在验证面不可信时 activate 被禁止；不得把存在性判定当作健康证据。
- **Refs**: atomcode 报告「解冻条件被判满足、但支撑它的验证面损坏/不可强制执行」；docs/deferred-registry.json (defer-0026)；ADR-0035 D6；ADR-0058 D-F/D-G；scripts/check-ci-jobs.js；test/adr-0058-wiring.test.js

## D-011 | proposed | 2026-09-12

- **Question (research 1)**: defer-0004（generated ci.yml from gates.json）的解冻条件同样被判 SATISFIED；且其隐含前提「summary 作为唯一 required check」在本仓库平台**不可能成立**（私有 + 免费套餐 → GitHub REST 403）。如何处置？
- **Research basis**: 同 D-010 + GitHub plans 官方页 / about-protected-branches / community discussion #174400（免费私有无分支保护，GitHub 员工确认）。
- **Recommendation**: **re-defer + 重写条件**（不 activate）。原条件文本是**有缺陷的条件（defective condition）**，不是被满足的条件。三个出口需你拍板：
  - (i) 保硬：升级 GitHub Pro / 转公开仓库 / 自托管 GitLab CE 或 Gitea（分支保护在这些平台免费可用）；
  - (ii) **显式降级为软门（约定层）**：summary 对 main 连续 N 次绿 + 人工核验清单 + 本地/预推送脚本；必须写明这是 TIOBE 意义上的软门降级、代价是质量下滑可能溜过，**不得与 required check 等价表述**；
  - (iii) close：仅当团队决定「永久接受无强制验证」（前提废止，条目 moot）。
- **Explicit constraints / negative needs**: 不得静默把 prose 载体当作控制；CONTEXT.md（Success-Only Aggregator 词条）与 ADR-0058 D-G 中「serves as the only required check」类表述必须随本决策修订；close 是「前提永不可能发生」的事实结论，不是「满足」。
- **Refs**: atomcode 报告（同上）；CONTEXT.md Success-Only Aggregator 词条；ADR-0058 D-D/D-G；docs/deferred-registry.json (defer-0004)；docs/adr/0034 D5

## D-012 | proposed | 2026-09-12

- **Question (research 2)**: 修复子代理把可执行的验收项（start-alive）声明为不可执行、并把本地闭环当作已绿签署；独立审计代理同样只跑本地、漏判 CI 破损。应建立什么问责与纠偏机制？
- **Research basis**: atomcode 深度调研（Confidence 高；15 篇来源，9 次全文抓取）。五套心智模型：自述与证据分离（ISO 19011 objective/audit evidence；rfd_method "summary is a prediction, terminal output is a measurement"）、独立复算（IEEE 1012 技术/管理/财务三重独立性；DO-178C with independence；maker-checker 四眼）、非符合性/CAPA（ISO 9001:2015 §10.2：纠正→根因→纠正措施→**有效性验证**→关闭；ISO APG：无审计证据即无非符合性）、证据可采性（FDA ALCOA；ISO 19011 verifiable）、CI 作为唯一事实源。LLM 实证：假成功占失败 45–48%（tau2-bench）/ 75.8%（AppWorld）；LLM judge AUROC ≤0.65/0.54；自偏好偏置（arXiv:2410.21819）；tool-use hallucination 自识别率 11.6%。
- **Recommendation**: F5 按**非符合性（NC）走 CAPA 闭环**，不得只记录不处置。纠正=重跑 start-alive 并留证据（已执行）；根因=为何把可执行项声明为不可执行（含审计代理同样漏判 CI 的覆盖面缺陷）；纠正措施（结构性，非「要求诚实」）：(a) 验收清单每项必须标注**验证通道**，本地通道与 CI 通道分离；(b) 「不可执行」类声称必须走 ADR-0040 三态语义并提供探测证据，禁止口头降级；(c) 审计任务书必须含 CI 层验证通道项，且审计须声明验证边界；(d) 引入 oracle provenance 门槛（independent 才可计数）。有效性验证=下一轮审计复跑同一套验收 + CI 绿联合签署。
- **Explicit constraints / negative needs**: 防复发必须结构性强制，不得依赖「要求主体诚实」（实证：自验证统计上不可靠）；同一「本地闭环」上的不同执行者不算独立复算——本项目已有 Verifier Deployment Discipline 三层，本次事件暴露其边界（缺 CI 层通道）。
- **Refs**: atomcode 报告「自述完成但实际未验证」；CONTEXT.md False Completion Syndrome / Verifier Deployment Discipline 词条；ADR-0044 claim-directed falsification；ADR-0034 decision-evidence separation；.scratch/grill-adr0058/reports/2026-09-12-audit-report.md §5 F5

## D-013 | proposed | 2026-09-12

- **Question (new P0 finding)**: ADR-0058 D-006 把 test gate 从 gates.json 物理移除后，`scripts/run-test-gate.js:16` 仍调用 `requireCapabilities('test')`；该调用按 ADR-0040 D1 从 gates.json 查 gate 条目 → 抛 `Error: gate "test" missing from docs/gates.json (ADR-0034 D1)`，exit 1。该 wrapper 现在**只在 CI test job 运行**（本地 `npm test` 直跑 jest、`gate:all` 已不含 test gate），故本地验收全绿而 CI test job 永久红。已本地复现 + CI 日志双证。如何处置？
- **Evidence**: 本地 `node scripts/run-test-gate.js --expected-suites 49` → 上述报错，exit 1；CI run 34631502524 job `test` → 同报错，exit 1；job `gate-all` → `gate:all exit 1 (21 entries, 0 unverifiable)`（corpus-leak/corpus-freshness/mr-probes 红，属既存）；job `summary` → `results="failure failure"` 正确聚合为红。
- **Recommendation**: 需要一次 **ADR-gated 修复**（ADR-0040 D1：能力枚举为 CLOSED，能力声明变更须由 ADR 逐字命名）。方向待你拍板：(i) 把 `requireCapabilities('test')` 改为按 test job 真实所需能力声明（public tier 下应为 `repo-tree`，不含 bench-corpus），并由 ADR 明确「test job 无 gates.json 条目时如何声明能力」；(ii) 或按 ADR-0040 D1 引入并逐字命名一个新能力（如 `ci-test-job`）。任一方案必须同变更内补：CI test job 转绿证据 + wiring test 断言（禁止同类回归）。
- **Explicit constraints / negative needs**: 不得把本项当作「既有问题」——12/12 运行全红中，test job 的红是**本轮引入的新回归**；gate-all 的 corpus 类红为既存，不得混谈。修复前不得以 CI 红为由启用任何 required check。
- **Refs**: CI run 34631502524；scripts/run-test-gate.js:16；src/shared/capability.js:76；docs/gates.json；ADR-0040 D1；ADR-0058 D-F；test/adr-0057-wiring.test.js

---

## 结算表（closing round, 2026-09-12）

> 本表为**追加**，不修改上述任何原记录（审计纪律：不改写历史）。状态取值：
> **implemented** = 已落地且有证据；**deferred** = 未拍板/未实施，仍开放；**stale** = 前提被实测证伪或被后续决策取代。

| 决策 | 原状态 | 结算 | 证据锚点 |
|------|--------|------|----------|
| D-001 | current | **implemented（排序部分） / deferred（治理政策轮未开）** | 本轮仅 ADR-0058；治理政策仍为下一文档轮（handoff §5） |
| D-002 | current | **implemented** | ci.yml `if: always()` + `!= "success"` + `seen==expected`；生产验证 run 34631502524 聚合 `failure failure` 为红 |
| D-003 | current | **implemented** | registry 仅新增 defer-0027；defer-0003/0004/0024 状态未变；check-ci-jobs 仅 SUGGEST |
| D-004 | revised | **stale**（被 D-011 部分取代） | `gh api .../protection` → 403；Option-C 分层仍立，**充分性主张**被推翻 |
| D-005 | current | **implemented** | `docs/adr/0034:137` inline 修订；`gate:all` 出现次数=1 |
| D-006 | current | **implemented** | gates.json 无 test gate；wrapper 迁入 test job 且 **exit 0**（R8） |
| D-007 | revised | **stale（技术核心 implemented，强制部分不可实施）** | `needs: [gate-all, test]` 已生产验证；branch protection 平台 403 |
| D-008 | current | **implemented** | `test.env = JIAHAO_TEST_TIER: public`；test job 无 BENCH_CORPUS_B64 |
| D-009 | current | **implemented** | gates.json `order 100` 缺席、无 tombstone、不重编号 |
| D-010 | proposed | **deferred（待拍板）** | 未实施；defer-0026 仍 `status=deferred` |
| D-011 | proposed | **deferred（待拍板）** | 未实施；required-check 载体未定 |
| D-012 | proposed | **deferred（部分落地）** | 报告已采用「验证通道」列；CAPA 政策未立 |
| D-013 | proposed | **implemented** | ADR-0058 R8 + 5 条回归锁；wrapper exit 0 |

### 发现项登记表（A / B / R 三类）

| 编号 | 结算 | 证据 |
|------|------|------|
| A1 | **implemented** | ADR-0058 R8；`run-test-gate.js` 改内联声明；wrapper exit 0 |
| A2 | **deferred（人工闸门）** | ADR-0058 R10；需重建 `JIAHAO_BENCH_CORPUS_B64` |
| A3 | **implemented** | ADR-0058 R9；`seen == expected` 计数守卫（9 组输入真值表） |
| A4 | **implemented** | ADR-0058 R11；ADR-0057 Context 改过去时 |
| A5 | **implemented** | ADR-0058 R12；`.gitignore` 加 `mr-artifacts/` |
| A6 | **stale**（前提被证伪，已撤回） | 提交 blob 始终 LF；`git ls-files --eol` 全 `i/lf w/lf` |
| B1 | **implemented** | ADR-0058 R14（转义）+ R16（回归锁）；咬合测试 REVERTED 必红 |
| B2 | **implemented** | ADR-0041 D2 inline amendment + 头部 `Amended by:` 同步 |
| B3 | **implemented** | ADR-0058 R11/R12 补齐；wiring 测试标签对齐；R1..R16 连续 |
| B4 | **implemented** | CONTEXT.md Gate Capability Declaration 覆盖两种载体 |
| B5 | **implemented** | wiring 测试断言收紧（双引号形式 + 守卫语义） |
| B6 | **implemented** | 返修报告 §1 移除 D-012 并加更正注 |
| B7 | **implemented** | ADR-0058 R13；ci.yml 恢复步失败安全诊断（`bash -e` 5 场景验证） |
| R1 | **implemented** | ADR-0058 R16；两处回归锁（adr-0041 / adr-0058 各一） |
| R2 | **implemented** | ADR-0041 头部 `Amended by:` 已命名 ADR-0058 R8 |
| R3 | **deferred（人工闸门）** | CI 仍 12/12 红；需 secret 写权限 |

### 归档

本轮全部工作底稿（reports / handoffs / decision-ledger / evidence / audit-backup）**随 `.scratch/grill-adr0058/` 一并归档**。`.scratch/` 为 gitignored，不入库（ADR-0038 D2 / 仓惯）；入库的事实源为 `docs/adr/0058-*.md`（含 R1-R16 与 Implementation status）与 `CONTEXT.md` 词表。
