# ADR-0076: Round Edit-Surface Taxonomy, the Governance Carve-Out, the Sunset-Counter Durable Home, and Spec-Code Bidirectional Pinning (grill-t15 disposition + mechanism round)

- Status: Accepted
- Date: 2026-09-18
- Ledger: `.scratch/grill-t15/decision-ledger.md` — grill-t15 D-001..D-007 (all current); the governance copy is `docs/governance/decision-ledger-t15.md`
- Spec: `.scratch/grill-t15/spec-disposition-mechanisms.md`

## Context

The grill-t14 audit closed PASS-with-findings (F-1..F-5 plus nits). This round converts the audit residue into registered dispositions and durable mechanisms rather than prose-only answers. Three of them need machine form: the ADR-0075 D-C sunset counter needs a state host that cannot rot with the ledger; the rewrite-map spec-code pair needs drift detection in both directions; and the documentation-round edit boundary needs to stop being a sentence people argue about — F-4 is the seed: a doc round edited shipped gate tooling and `zero_product_diff` read broader than reality because the boundary existed only as prose.

## Decision

### D-A - The three-surface round edit taxonomy (ledger D-005)

**Decision**: every git-tracked file belongs to exactly one of three edit surfaces, machine-readable at `docs/governance/surface-taxonomy.json` with `scripts/surface-taxonomy.js` as the computing authority:

- **R1 runtime** — the `scripts/install.js` static require() closure (`install.js` + `resolve.js` + the `src/` files they reach + `package.json`). Implementation-round territory absolutely; a documentation round may never touch it and no carve-out exists for it.
- **R2 governance** — the machinery: `scripts/` outside the closure (check-*, build-*, run-*, collect-*, derive-*, eval-*, instrument.js, pairer-lane-telemetry), `bench/`, `hooks/`, `jiahao-mcp/`, `schemas/`, `private/`, `.github/`, `test/` outside wiring tests, dotfiles and lockfiles. Implementation-round territory; a documentation round touches it only through the D-B carve-out.
- **R3 documentation** — `docs/**`, `CONTEXT.md`, `README.md`, `AGENTS.md`, `.scratch/**`, `adapters/**`, `test/adr-*-wiring.test.js`. Free in a documentation round.

The R1 set is enumerated by the closure scan, never by hand — `test/adr-0076-wiring.test.js` re-derives the closure and asserts the taxonomy list is exactly it, so the classification cannot drift silently (a manual list is a lie waiting to happen). The product boundary is the require closure, not the package `files[]` list — packaging contents and product surface are different questions.

`zero_product_diff` is redefined to mean *no R1-surface file touched* (historical rows keep their meaning). A governance-machinery diff is recorded on the independent `governance_tooling_diff` dimension — both may be true at once, which is exactly the F-4 shape: `scripts/build-rewrite-map.js` classifies R2, so the t14 doc-round edit left R1 untouched, `zero_product_diff` stays honest, and the tooling diff is disclosed on the new field.

### D-B - The governance carve-out (ledger D-005)

**Decision**: a documentation round may touch an R2 file only through the registered carve-out, gated three ways:

1. **Necessity** — the justification names the triggering artifact; only what the round's own artifact truthfulness requires qualifies.
2. **Disclosure** — the trend-inventory row carries `governance_tooling_diff:{files, reason}` and the round's ADR names the change in its Decision section.
3. **Burn-rate** — the row carries `carve_out_used`; two consecutive carve-out rounds raise one advisory warning that never blocks.

The check is *recomputed, not trusted*: `scripts/check-governance-inventory.js` re-derives every listed file's surface from the taxonomy authority and hard-fails on an R1 file or a mislabeled row — a declaration cannot declare itself true.

**First invocation.** The defer-0004 bundle (R2) is the first registered use: the narrowed re-defer requires the `check-ci-jobs.js` predicate to match the new trigger — a permanently-SATISFIED verifier is the alert-fatigue anti-pattern D-003 bans — so the t15 row records `carve_out_used:1` with the baseline: consecutive counting starts here. This ADR's own bootstrap necessarily edited R2 files to create the mechanism — `scripts/surface-taxonomy.js` (new), `scripts/check-governance-inventory.js` (the recompute), `scripts/build-governance-anchors.js` (the artifacts list), `.github/workflows/ci.yml` (suite-count parity) — mechanism creation, disclosed here, not a carve-out use (the mechanism did not yet exist to be invoked). The grill-t14 row is annotated retroactively under the new semantics as a pre-mechanism disclosure (`carve_out_used:0`).

### D-C - The sunset counter durable home (ledger D-002)

**Decision**: `docs/governance/sunset-counter.json` is the single state host for the ADR-0075 D-C path-A counter, admitted to the ADR-0061 anchors regen-and-diff chain. The decision ledger degrades to an append-only audit trail. Single writer = round disposition; telemetry produces evidence only (measurement vs bookkeeping separation). Registered semantics: `organic_events > 0` resets the count with an explicit `reset_events` entry — never a silent overwrite; a missed check-in is not a zero — the counter freezes and records a `missed_check_ins` entry; activation latches one way after ledger-first ordering and only SUGGESTS the already-scheduled strategic review (ADR-0035 D6) — it never amends, closes, or exempts anything. ADR-0075 D-C carries a pointer line to this artifact; defer-0055 stays pointer-only; no registry row hosts the counter (the defer-0060-as-host form was rejected — the id landed on the CI channel instead, see D-E).

### D-D - Spec-code bidirectional pinning (ledger D-004)

**Decision**: when an authoritative spec governs a generator, its wiring test pins the semantic contract points bidirectionally — mechanism vocabulary only, never prose, line numbers, section order, full sentences, or SHAs. Executed on the rewrite-map pair this round: `docs/rewrite-map-generator-spec.md`'s Inputs bullet now registers the union(`git ls-files`, `git ls-tree -r HEAD`) enumeration plus the untracked-worktree convention (settles F-2), and `test/adr-0074-wiring.test.js` asserts both the spec-side vocabulary and the generator's `ls-files`/`ls-tree` call sites — a unilateral drift on either side reads red. No new `gates.json` entry: wiring tests already ride `gate:all` and registering a gate would violate proportionality. The convention is registered here as the pre-answer for the second spec-code pair.

### D-E - Round surface and registrations (ledger D-001/D-003/D-006/D-007)

- `defer-0026` (independent CI test job + always() summary) — **actioned** via ADR-0058 D-F/D-G (all four predicates SATISFIED), with a `limitation` field on the row: the required-check deployment remains a repository-admin action (platform 403) and CI green is an environmental condition (ADR-0058 R10) — neither is the deferred work, and *actioned* does not endorse the whole carrier problem.
- `defer-0004` (bare-shell renderer) — **re-defer narrowed**, landing in the R2 bundle commit: new trigger `ci.yml spans multiple workflow files OR any job declares a matrix OR job count > 3`; status stays deferred; `verified_by` stays `scripts/check-ci-jobs.js` with the predicate rewritten to match (the D-B carve-out's first use).
- `defer-0055` — `sunset_trigger_pointer` tightened to a pure pointer (audit F-3).
- `defer-0060` — **new row**: the permanently-red CI gate-all channel — `JIAHAO_BENCH_CORPUS_B64` secret regeneration (the tarball must expose `bench-corpus/mr-probes.jsonl` at `JIAHAO_CORPUS_DIR`) plus the same-source 403 required-check deployment; both repository-admin actions. `type=external-event`, `status=pending-evaluation`, `cadence_tier=quarterly`, `review_at=2026-12-15`, no `verified_by` (decorative assertions on non-evaluable rows are theatre). Rationale folds the 403 carrier and records that defer-0026's limitation is historical — this row is the sole live tracker of the 403 issue. **id note**: defer-0060 was the rejected D-002 sunset-row placeholder name and never landed; the id belongs to the first lander. A same-commit pointer line lands on ADR-0058 R10/R13.
- `defer-0061` — net-addition tally row (+1: this ADR) per the D-006(a)(i) convention.
- Governance artifacts: `sunset-counter.json` and `surface-taxonomy.json` land; `decision-ledger-t15.md` joins the anchors chain; CONTEXT.md carries Round Edit Surface + Governance Carve-Out + the amended Sunset Trigger (absence is not zero); README index rebuilt (76 records); AGENTS.md carries one pointer line.
- **Owner asks (unbundled, frozen text)** — Ask A: instrument seq-24 sign-off (record-type; open since t13). Ask B: defer-0051 evidence-packet ratification (judgmental; a rejection reopens the row — settles audit F-1 on the owner's answer). Bookkeeping annotations only: the ADR-0075 second_reviewer countersign lands when the owner ratifies the t14 audit outcome; defer-0060 is a tracked row — the owner action is its `unfreeze_if`, not a decision ask.
- R2 needed-content frozen here: the defer-0004 predicate wording and registry row JSON (above) and the ask packet texts (below).
- R2 status (2026-09-18): the defer-0004 bundle landed - narrowed `unfreeze_if` + `scripts/check-ci-jobs.js` predicate rewrite (`defer0004` = multi-workflow / any-matrix / >3 jobs; the live shape reports unmet so the deferral stays valid without a permanently-firing SUGGEST) + predicate wiring tests with positive and negative fixtures. First registered D-B carve-out use; the trend row records `governance_tooling_diff` + `carve_out_used:1` (baseline: counting starts here).

Ask A packet (frozen): "Please sign off instrument record seq-24 (`record_only_change`, 2026-09-17T09:42:07Z) — a record-type sign-off on the t13 T-3 fix-round instrument event; no verdict content is adjudicated by this signature."

Ask B packet (frozen): "Please ratify or reject the defer-0051 evidence packet `.scratch/grill-t14/evidence/defer-0051-evidence-packet.json` (`npm pack --dry-run --json` -> 324711 < cap 340000, weak-independent countersign `devin-subagent-t14-countersign`). Ratification finalizes the row's closed status; rejection reopens it — both exits are pre-registered."

## Consequences

- The edit boundary is now executable: a documentation round that touches R2 without a registered carve-out fails `check-governance-inventory`, and the taxonomy's R1 list self-verifies against the live require closure.
- `zero_product_diff` can no longer be stretched over gate tooling — the F-4 wording stretch is structurally closed by the independent `governance_tooling_diff` dimension.
- The sunset counter survives ledger rewrites, audit passes, and defer-0055's own lifecycle (watchdog independence).
- Burn-rate advisories give the carve-out a ratchet: two consecutive uses surface to the owner without ever blocking a round.
- Spec-code pairs now have a pre-registered convention: pin mechanism vocabulary bidirectionally, never prose.
