# next-round.md — grill-t24 execution task book (documentation-round artifact)

Round: **grill-t24** — Declared-vs-Actual Drift governance codification round. Decision authority: `D:/Aworker/jiahao/.scratch/grill-t24/decision-ledger.md` (D-001..D-004). Binding spec: `D:/Aworker/jiahao/.scratch/grill-t24/spec-t24-disposition.md`. GOAL: `D:/Aworker/jiahao/.scratch/grill-t24/GOAL.md`.

## Authoritative inputs

- t23 closeout docs to absorb at T-0: `D:/Aworker/jiahao/.scratch/grill-t23/reports/2026-09-22-repair-verification.md` + `D:/Aworker/jiahao/.scratch/grill-t23/handoffs/2026-09-22-next-round-handoff.md` (uncommitted). `.scratch/grill-t23/audit-evidence/` stays never-commit.
- Baseline: pack 340,472/380,000 (headroom 39,528B); 82 ADRs; 17 trend rows; 62 deferred entries; latest row grill-t23-front-face; main synced at c526de3.
- Carry-forward posture: defer-0068 countersign pending-eval to 2026-12-15 (do not close early); defer-0066 instances 1-3 open (no capture-harness touch this round — a wiring suite is not the harness); burn-rate advisory at 5 rounds.

## T-0 — Setup & absorb [D-001.3, D-004.7]

1. Work on the round docs branch; absorb-commit the two t23 docs (precedent: t23 absorb commit 657d422).
2. Regen fixpoint loop: `node scripts/build-round-facts.js --round grill-t24` -> `node scripts/build-rewrite-map.js` -> re-collect/splice/commit; repeat until `--check` green.
3. Clean-tree verify: every untracked entry is never-commit class; nothing else.

## T-1 — ADR-0083 authoring [D-002.1, D-003, D-004.2]

1. Author `docs/adr/0083-<slug>.md`, four clauses per spec section 2: D-A frozen-tree re-capture (ordering invariant, idempotent evidence endpoint, `captured-at-head` header, qualification/archival split); D-B registry single-sourcing (id-referenced labels, same-commit coupling, deprecate-not-delete, since/status semantics); D-C commit allowlist + post-commit `git show --name-only` inspection; D-D suite-count sync obligation.
2. Embed the audit-window inheritance declaration: the three check lines become mandatory audit scope (ADR-0081 precedent).

## T-2 — Carriers [D-002.2/3/4/5, D-004.1/2/3/4]

1. `docs/governance/never-commit.json`: schema `{rules:[{id:"nc-NNN",pattern,reason,since,status}]}`; seed with the known historical never-commit set (audit*-evidence/, *.patch, round-commits.txt, ref-assets-class, external generated-source paths).
2. `AGENTS.md`: add the allowlist + post-commit inspection working-agreement bullets.
3. `CONTEXT.md`: the Declared-vs-Actual Drift term is pre-landed in the docs commit — verify the body names the three narrow mechanisms.
4. `test/adr-0083-wiring.test.js`: pin registry validity, AGENTS clause presence, provenance-header shape, and ci.yml-count-equals-glob with a lower bound / known-file hit.
5. `.github/workflows/ci.yml`: 77 -> 78 — declared carve-out, the round single R2 touch; update the three legacy wiring literals (adr-0080/0081/0082) to 78.
6. `node scripts/build-adr-index.js`; `docs/deferred-registry.json` gains defer-0069 (first live firing of the three audit check lines; review_at = next audit window).

## T-3 — Closeout [D-001.4, D-004.5/6/8]

1. Closeout battery re-run under the new provenance convention (capture header `captured-at-head` — first live use); the evidence commit is an idempotent endpoint.
2. Per-finding disposition table for anything the round surfaces; consent sweep names every standing row per precedent, including defer-0069.
3. Trend row: `kind:documentation`, `adr_added:["0083"]`, `net_additions:1`, `deferred_entry:defer-0069`, `carve_out_used:1` [ci.yml only], `zero_product_diff:true`; the report discloses burn-rate round 6.
4. facts-canon report + `report_commit:null`; audit handoff charter carries the three check lines; commit boundary verified via `git show --name-only` per commit — dogfood the G3 clause.
5. No push unless the user authorizes it.

## Fact-surface status

| Surface | State |
|---|---|
| ADR-0083 | pending (authored in execution round) |
| never-commit.json | pending |
| AGENTS.md clause | pending |
| CONTEXT term | pre-landed in docs commit; T-2 verifies wording |
| adr-0083 wiring suite | pending |
| ci.yml 77->78 | pending (declared carve-out) |
| t23 absorb docs | pending at T-0 |
| defer-0069 | pending registration |
| trend row | pending at T-3 |
| audit window (check lines first firing) | out-of-scope this round; defer-0069 tracks it |
| push / PR | not authorized |

## Suggested skills

- domain-modeling — ADR-0083 + glossary discipline
- neat-freak — closeout fact-surface hygiene
- handoff — audit-handoff authoring
- but (gitbutler) — all VCS writes; the allowlist + post-commit inspection discipline being codified applies immediately — dogfood it
- grill-with-docs — any mid-round dispute returns to grilling
- tdd — wiring-suite authoring style
- atomcode-research — only if a new external-practice question opens (three runs already banked this grill)
