# grill-t34 T-0 baseline recon note (D-001)

Captured: 2026-09-30, by the t34 implementation sub-agent (fix/dev lane).
Scope guard: only registered ledger items (D-001..D-005, all current)
enter the round; the not-in-round list in handoffs/next-round.md is honored.

## Baseline-CI clause (standing)

- `gh api repos/Xxx91n/jiahao/actions/runs` top run: workflow `ci`,
  head_sha 89b92487 (origin/main tip, post-t33), event push,
  status completed, conclusion **success**, created 2026-09-30T04:50:45Z.
  Failing step: none (green).
- Prior two runs (68fb225b, 754e53c2 on 2026-09-29) were failure runs from
  the pre-t33-land window; superseded by the green tip run.
- Re-check due again at wave closeout (T-12).

## Four README declaration sites (sentinel targets, D-002(ii))

1. README.md:337 — Develop sentence, inside the npm-test code comment:
   `npm test                              # 1580 tests across 90 suites (full corpus tier; the public tier skips 7 corpus-bound tests with reasons, ADR-0056)`
2. README.md:356 — Architecture bullet: `- \`test/\` — 90 test suites, 1580 tests`
3. README-zh-CN.md:280 — zh mirror of (1), same npm-test comment line.
4. README-zh-CN.md:295 — zh mirror of (2): `- \`test/\` —— 90 test suites, 1580 tests`

Both languages currently declare 1580 tests / 90 suites.

## ci.yml call line (argv retirement target, D-002(iii))

- .github/workflows/ci.yml:107: `node scripts/run-test-gate.js --expected-suites 90`
  (comment line 106 cites ADR-0057 D-C). Retires to bare
  `node scripts/run-test-gate.js` in the same commit as the gate rewrite.

## Enumeration channel (T-1 input)

- `npx jest --listTests` at the working tree: **90 files**, all under
  `test/` (0 outside). Matches the declared suite count and the
  `test/` directory count (90 .test.js files).
- jest config surface: package.json `jest` block holds only
  `testPathIgnorePatterns: ["node_modules", ".scratch"]` (default testMatch).

## Live JUnit counts (D-002(i) blessed-run input)

- CI-authoritative at the tip: the green run at 89b92487 executed
  `run-test-gate.js --expected-suites 90` (public tier) and passed its
  declared==live assertions — live = 90 suites / 1580 tests, public tier
  skips 7 corpus-bound tests (ADR-0056).
- Local full-corpus battery (background rerun, completed; log at
  `.scratch/grill-t34/baseline-gate-run.log`, never-commit evidence):
  junit header tests=1580 failures=2 skipped=0, 90 testsuite elements,
  Time 559.5 s, gate EXIT=1.
- Historical local reference (t17 era): 73 suites / 1225 tests — superseded.

## Pre-existing red at baseline (disclosed, not repaired mid-round)

The 2 local failures are both in `test/rewrite-map.test.js`:
"--check green with old-side refs, exit-2 UNVERIFIABLE on a clone" and
"--published-only asserts the clone-verifiable subset everywhere".

Root cause (verified): the t34 doc-phase lane commit d3adbd95 added
`.scratch/grill-t34/` claim-surface docs citing a bare SHA
(GOAL.md cites 89b92487) without a same-commit rewrite-map regen — the
committed map contains zero grill-t34 doc_refs and does not contain
89b92487. CI is green only because it last ran at 89b92487, i.e. BEFORE
the doc-phase commit; the drift was never CI-visible. This is the exact
hand-sync drift class the derive-from-source round mechanizes.

Disposition (ADR-0083 D-C): disclosed here, not silently patched; the
E-17/E-19 closeout regen (rewrite-map LAST, then re-check after the last
but mutation) is the repair surface. Until then the round's intermediate
state carries this disclosed red (allowed: intermediate commits may be
red; round-final must be green).

## Next-free ids

- ADR: max 0089 → next free **0090** (rejection disposition contract),
  **0091** (derive-from-source mechanism contract).
- deferred-registry: max defer-0077 → next free **defer-0078..0083**.
- gates.json `entries[]`: max order 225 (orphan-registration) → new-leg
  order slots **226+**.
- gates.json entry shape: {name, command, tier, source_adr, order, params,
  requires}. ci-mode-requiring legs (stay UNVERIFIABLE locally): ci-wiring(1),
  bench-gate(150), probes(160), mr-probes(175).

## Environment notes

- Local node runs use the full corpus tier (no JIAHAO_TEST_LIMIT/TIER env);
  CI test job pins JIAHAO_TEST_TIER: public (ci.yml:96).
- test-artifacts/, probe-artifacts/, mr-artifacts/ are gitignored.
- pre-commit-user hooks are bypassed by but commits by construction; the
  map-freshness gate leg (order 224) is the authority — rewrite-map regen
  follows the E-17/E-19 closeout order (manifest → checklist → anchors →
  rewrite-map LAST), then re-check after the last but mutation.
