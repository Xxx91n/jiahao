# grill-t26 next-round task book — anchor-semantics round

Sole decision source: `D:\Aworker\jiahao\.scratch\grill-t26\decision-ledger.md` (D-001..D-005, all current). Execution spec: `D:\Aworker\jiahao\.scratch\grill-t26\spec-t26-disposition.md`. Context restore: `D:\Aworker\jiahao\.scratch\grill-t25\handoffs\2026-09-24-audit-handoff.md` (the treadmill observation this round answers).

Authority boundary (unchanged): pushes to main, merges, annotated tag pushes, renew-or-expire decisions, entity-level countersigning are USER actions. The agent drafts, commits locally on its own lane, and runs local verification only.

## T-0 — Pre-flight [D-001, D-004]

- `git ls-remote origin` + `git ls-remote --tags origin` — record the public tip and tag inventory (last observed: `bde0570b` + `adjudicated/grill-t25`).
- Mechanically derive the legacy seals: for the t24 suite (BASE `c526de3`, EVD `.scratch/grill-t24/evidence`) and t25 suite (BASE `fc390d5`, EVD `.scratch/grill-t25/evidence`), compute the last anchoring commit in BASE..HEAD — expected `8e177d24` for both; verify every committed capture header satisfies it before declaring.
- Confirm no in-flight anchoring commits at declaration time (walk BASE..HEAD: nothing after the declared anchor but non-anchoring).
- Open a dedicated GitButler branch for t26 work; leave parallel lanes untouched.
- Confirm defer-0070 is pending and carries owner + review date (quarantine shape, D-001).

Suggested skills: gitbutler.

## T-1 — Shared checker + registry [D-003, D-005]

- Implement the single-source freshness checker in `scripts/` (R2 machinery surface — NOT `src/shared/`, the R1 require-chain is shipped product): anchoring classification, claim-point detection, seal resolution (`anchor := declared sha` when sealed, else BASE..HEAD walk), evaluate-at-commit.
- Fixture unit tests for the checker itself (hedge 1).
- Extend `docs/governance/surface-taxonomy.json`: `claim_surfaces` closed enum = round-dir `reports/` + `handoffs/`; register the SEAL-declaration class as non-anchoring (mechanism_outputs precedent); unregistered claim-like files produce a warning signal.
- Wire the regression rule: a checker change must run every round-scoped suite (hedge 2); document the Metz fallback clause in the checker header (hedge 3).

Suggested skills: tdd; domain-modeling (registry taxonomy terms).

## T-2 — Suite migration + legacy seals [D-002, D-004, D-005]

- Migrate `test/adr-0083-wiring.test.js` and `test/adr-0084-wiring.test.js` onto the shared checker — config + assertions only; no third algorithm copy.
- Write `.scratch/grill-t24/SEAL` and `.scratch/grill-t25/SEAL`: `seal: 8e177d24` + `recorded_at: <date>` dual fields; the declaration commit rides the registered non-anchoring class — effective immediately this round.
- Disclose the registration as back-registration in the round report; no historical bytes rewritten.
- Post-seal, both suites freeze as regression sentinels — byte edits to sealed evidence must turn red.

Suggested skills: gitbutler; tdd.

## T-3 — Normative carrier + bookkeeping [D-001, D-002, D-003, D-005]

- New ADR (next number 0085) carrying the two-layer semantics: claim-point pinning + terminal seal boundary, the declaration/tag co-naming contract, the explicit drift code, the degrade rules, the lag bound, and the retirement registration (the live-HEAD-walk invariant, retired whole). Record the TUF/checkpoint/SCT lineage as structural analogy.
- Pointer lines only into ADR-0083 D-A (semantics revised) and ADR-0084 D-C (landing tail now ends on the seal declaration).
- CONTEXT.md glossary terms under domain-modeling: seal boundary, claim point (and the stale-vs-invalid distinction if not already named).
- `trend-inventory.json` row: `kind:fix`, `adr_added:["0085"]`, `governance_tooling_diff` naming every R2 machinery hand-edit.
- defer-0070 stays pending; may carry the three failing suite names (`adr-0069-wiring`, `sentinel-ownership`, `adr-0079-wiring`) as quarantine detail.

Suggested skills: domain-modeling; neat-freak (doc/code congruence on touched registries).

## T-4 — Round closeout under the new semantics [D-002, D-003]

- Round evidence battery for t26; claim-point conformance verified at the report commit; terminal wave after the last anchoring commit; `.scratch/grill-t26/SEAL` declaration (dual fields).
- Landing tail: last anchoring commit -> terminal wave -> SEAL declaration (non-anchoring) -> regen commits only.
- USER pushes `adjudicated/grill-t26` annotated tag co-naming the seal sha (bare sha in the annotation) — within the same round; absence degrades to declaration-only + recorded state, never silent.
- Round report discloses: transitional red windows before migration landed, the declared-vs-tag sha relationship, engine gaps (Tavily absent this session).

Suggested skills: gitbutler; neat-freak.

## T-5 — Hand off to t27 [D-001]

- t27 scope stub: diagnose the three CI-red suites at the landed tip (git-tag resolution exit-128, env-sensitive assertion, public-history sha pin), degrade-or-fix per the capability contract, close defer-0070 on the first green CI run — and measure the new semantics' convergence cost for real (this is the first live firing).

Suggested skills: diagnosing-bugs; gitbutler.
