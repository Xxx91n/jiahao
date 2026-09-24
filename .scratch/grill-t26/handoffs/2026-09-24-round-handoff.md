# grill-t26 round handoff

- Round: grill-t26 (anchor-semantics round; fix kind)
- Lane: `grill-t26`; docs lane `grill-t26-docs` carries the task book (`9674439f`)
- Base: `bde0570b` (origin/main at round start)
- Report: `.scratch/grill-t26/reports/2026-09-24-report.md`
- Normative carrier: `docs/adr/0085-anchor-semantics-claim-point-seal-boundary.md`
- Terminal seal: `.scratch/grill-t26/SEAL` (declares the report-commit sha; verify with `scripts/evidence-freshness.js`)

## What the next agent needs to know

- Freshness is two-layer now (ADR-0085): claims are checked at their commit point against the floor (last hard-anchoring commit strictly before the claim); a round is closed by `.scratch/grill-<id>/SEAL` pinning the last substantive commit. The live-HEAD-walk invariant is retired whole — do not re-add per-suite walk logic; `scripts/evidence-freshness.js` is the single implementation and `surface-taxonomy.json` `freshness` block is the registry.
- Round-scoped suites carry `{id, base}` + assertions only. A round needing different walk semantics declares a Metz deviation in its ledger and inlines locally — never conditionals in the shared checker.
- New rounds register `{id, base}` in `freshness.rounds` and get their wiring suite from the t26 pattern (`test/adr-0085-wiring.test.js` conditional seal block self-activates when the seal lands).
- `captured-at-head` headers must name the durable non-workspace tip: `git log -1 --invert-grep --grep='^GitButler Workspace Commit' --format=%H` — never `git rev-parse HEAD` under GitButler (ephemeral merge object, never reaches a public clone).
- GNU tar on Windows parses `C:\...` as `<host>:<path>` — extract tarballs with a relative filename inside the temp dir (see `capture-battery.cjs`).
- Trend-row coverage is cumulative: the latest row's `governance_tooling_diff.files + mechanism_output_diff.files` must cover every R2 file in `git diff --name-only <earliest-coverage-base>..HEAD`.
- `README-zh-CN.md` translation baseline re-pins as a second-step commit naming the README-touching commit sha (ADR-0079 D6 rhythm); count lines sync same-commit.

## t27 scope stub (reserved — not executed this round)

- Triage the three CI-red suite legs: `adr-0069-wiring` (tag-resolution exit-128 under Actions), `sentinel-ownership` (environment-sensitive assertion), `adr-0079-wiring` (public-history SHA pin). Per leg: degrade-or-fix.
- `defer-0070` closes on the first green origin/main workflow run — record the run id; review_at 2026-10-15, owner Xxx91n.
- Measure convergence cost under the new semantics: waves-per-round vs the t25 20+ baseline; report in the t27 ledger.

## Human-authority items (agent did not perform)

- Push `origin/main` / merge `grill-t26` / `grill-t26-docs`.
- Push annotated tag `adjudicated/grill-t26` naming the SEAL-declared sha (same-round lag bound, ADR-0085 D-C.4).
- Adjudicate the `adjudicated/grill-t25` drift (tag names `bde0570b`, seal declares `8e177d24` — recorded `drift`, pre-contract artifact).
- Entity-level countersigning / renew-expire decisions.

## Suggested skills for the next round

- `$implement` (grill/engineering) for TDD-at-seam work.
- `gitbutler` (`but`) for all version-control writes — dedicated lane, explicit ids, `git show --name-only` reconciliation after every commit.
- `handoff` (grill/productivity) at closeout.
- `atomcode-research` for external lookups (one session at a time, resume-anchoring on failure).
- `codegraph` for repository exploration where indexed.
