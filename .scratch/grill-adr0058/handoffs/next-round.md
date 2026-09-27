# Handoff — ADR-0058 Implementation Round (defer-0026 Landing)

Date: 2026-09-12
Branch: codex/adr0058-impl (new branch off origin/main)
Preceded by: grill-adr0058 doc round (decision-ledger.md, 10 current entries)

## Decision-ledger coverage

All 10 current entries (D-001 through D-009, D-008 contains Q8a+Q8b) are
recorded in .scratch/grill-adr0058/decision-ledger.md and codified in
docs/adr/0058-ci-test-job-independence-and-gate-layer-entrypoint-narrowing.md.

## Implementation phases

### Phase 1 — ci.yml three-job split + gates.json + scripts

**Covers: D-001, D-002, D-004, D-005, D-006, D-007, D-008, D-009**

1. **gates.json: delete test gate entry (order 100)**
   - D-006 companion (1): physically remove the test gate entry from gates.json
   - D-009: leave order 100 as a gap — do NOT renumber, do NOT add tombstone
   - ADR-0058 D-I: record "order 100 retired, do not reuse" in prose (already done)

2. **ci.yml: three-job structure**
   - D-006 companion (2): split current single job into:
     - `gate:all` job: runs `npm run gate:all` (remaining gates only, test gate removed from gates.json)
     - `test` job: runs `npm test` + `node scripts/run-test-gate.js --expected-suites 48` (suite-count wrapper migrated here)
     - `summary` job: `if: always()` + success-only whitelist (D-002)
   - D-007: `summary: needs: [gate:all, test]` — full-set aggregation
   - D-002: summary green = each needed job result strictly equals `success`; failure/cancelled/skipped/unknown = red
   - D-008: test job sets `JIAHAO_TEST_TIER: public` in env block
   - D-008: test job does NOT reference `JIAHAO_BENCH_CORPUS_B64`
   - D-008: ADR-0058 prose records symmetric tier contract (already done)
   - D-005: gate:all occurrence count stays 1 (check-ci-wiring.js)

3. **check-ci-jobs.js: presence expansion**
   - D-004: expand to assert: test job exists + summary job exists + summary uses always()
   - D-004: stays zero-dependency, exit-code evaluator (ADR-0035 D6)
   - D-003: defer-0004 evaluation runs here — output SATISFIED (then human chooses: activate/re-defer/close)

4. **check-ci-wiring.js: blocklist update**
   - D-005: test job running `npm test` is NOT blocked (it is outside gate:all now)
   - D-005: gate:all occurrence count assertion stays 1
   - D-006: `run-test-gate.js` token removed from blocklist (test gate no longer in gates.json)

5. **ADR-0034 D5: wording amendment**
   - D-005: narrow D5 to "gate:all is the single entrypoint for the gate layer; test job is an independent CI-layer consumer that does not go through gate:all"

6. **test/adr-0057-wiring.test.js: re-anchor D-C assertion**
   - D-006 companion (3): change D-C anchor from order-based to name-based (test gate is no longer in gates.json; assert suite-count wrapper exists in ci.yml test job)

7. **test/adr-0058-wiring.test.js: created (seed already written)**
   - D-004: anti-pattern assertions (path-filter absent, skipped!=success, gate:all no test step, JIAHAO_TEST_TIER=public, no bench corpus secret in test job)
   - D-006: test gate not in gates.json, order 100 absent
   - D-009: order 100 is retired

8. **test/adr-0033-wiring.test.js: extend seed inventory**
   - Add defer-0027 (ADR-0016 D4 verifiable-log wheels) to the deferred-registry seed inventory (now 21 entries)

9. **README ADR index rebuild**
   - Run: `node scripts/build-adr-index.js` (ADR-0058 is entry 58)

### Phase 2 — defer-0004 evaluation + ADR-0016 D4 registration

**Covers: D-003**

1. **defer-0004 evaluation**: run expanded check-ci-jobs.js → output SATISFIED (ci.yml now has dedicated test job + always() summary job). Record evaluation result. Human chooses three-exit disposition (activate / re-defer + update rationale / close). D-003: this is NOT auto-activation.

2. **defer-0027 registration**: ADR-0016 D4 sub-item (i) verifiable-log wheels already registered in deferred-registry.json as pending-evaluation/yearly/review_at 2027-09-01 (done in doc round). Verify entry is well-formed.

3. **D-003 constraints**: do NOT touch defer-0003 or defer-0024. Do NOT harvest external-event items. Sub-items (ii)(iii) stay in ADR-0016 prose.

### Phase 3 — Verification + commit

**Covers: D-001 (serial discipline), all D-xxx (acceptance)**

1. `npm test` (serial): all suites pass including adr-0058-wiring.test.js
2. `npm run gate:all`: all gates pass (4 UNVERIFIABLE ci-mode-only expected)
3. `npm run corpus:drift`: fingerprints OK
4. `npm pack --dry-run`: clean
5. `git diff --check`: clean
6. All written files UTF-8 no BOM, LF
7. Commit via `but` on branch codex/adr0058-impl

## Standing rules

- gates.json changes must ride the same commit as their ADR (ADR-0027 coupling guard)
- Shell for ctx batches = bash; file edits via ctx_execute Node fs; verify BOM/LF after writes
- Never commit bench/probe/run residue; private corpus stays out of the clone (ADR-0038 D2)
- Push ONLY after implementation round's final audit passes
- Do NOT touch other agents' uncommitted work (.githooks/*, .gitignore, bench/polygraph/results/*, mr-artifacts/*)
- After every documentation round, commit that round's doc artifacts before the next implementation round starts (project working agreement)

## Required-check deployment (human procedure, NOT automated)

D-004: "summary is required check" is NOT machine-asserted. After ci.yml lands:
1. Use `gh api` to audit: compare required contexts vs latest PR check-runs
2. Configure branch protection: set `summary` as the ONLY required check
3. Remove any previously-required check names (e.g. the old single-job name)
4. Record the deployment in ADR-0058 prose (acceptance section update)

## Next grill direction (after impl round completes)

- D-001: decision-rule change-management policy (ADR-0049 leftover) is the next doc round
- Optional: reverify.js option-clump refactor (metrology config object)
- defer-0026 unfreeze: update deferred-registry.json status after ci.yml lands + check-ci-jobs.js passes

## Suggested skills

- grill/engineering/improve-codebase-architecture (implementation guidance)
- grill/engineering/code-review (audit after impl)
- grill/productivity/handoff (closeout)
- gitbutler (version control: but commit, but status, but diff)
- atomcode-research (industry wheel check before any new custom tooling)
- domain-modeling (if new terms emerge during impl)
- neat-freak (doc cleanup after impl round)
