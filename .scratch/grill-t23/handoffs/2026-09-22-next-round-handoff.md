# grill-t23 -> grill-t24 handoff - LANDED (2026-09-22)

Round: **cap amendment (ADR-0082) + GitHub front face** - closed, audited, repaired, verified, merged, pushed.

## Landed state

- PR #9 merged into `main` at merge commit `c526de3` (https://github.com/Xxx91n/jiahao/pull/9); `origin/main` carries the full t23 chain with original SHAs preserved (commit-map citations stay valid).
- Local `main` synced to `c526de3`; workspace clean.
- `grill-t23-docs` deleted locally (integrated) and on GitHub. GitButler archive refs pruned (`gb-local/grill-t11|t12|t21|t22|t23-docs`) - t11/t12 were NOT SHA ancestors but content-verified as fully landed (2-dot diff vs main = branch ~58k lines BEHIND; unique payloads already on main under rewritten SHAs; sole unique bytes were a stray `jiahao-0.0.1.tgz` artifact and a stale 09-17 host-settings backup - both judged worthless, recoverable ~90d from local object store if ever needed).
- GitHub branches now: `main` only. Local refs: `main` + gitbutler internals only.

## Audit chain (all on main now)

- Round report: `.scratch/grill-t23/reports/2026-09-22-report.md`
- First audit: `.scratch/grill-t23/reports/2026-09-22-audit.md` - PASS WITH FINDINGS (T4-C-1..C-9)
- Repair verification: `.scratch/grill-t23/reports/2026-09-22-repair-verification.md` - PASS; all nine dispositions artifact-verified, acceptance re-run green (77/1307, gate:all 0, pack 340,472 < 380,000)
- Audit handoff: `.scratch/grill-t23/handoffs/2026-09-22-audit-handoff.md` (pre-repair; its disposition list is now fully resolved)

## Pending absorb at grill-t24 T-0

Uncommitted files this audit window produced (commit them first, per precedent):

- `.scratch/grill-t23/reports/2026-09-22-repair-verification.md`
- `.scratch/grill-t23/handoffs/2026-09-22-next-round-handoff.md` (this file)
- `.scratch/grill-t23/audit-evidence/` - NEVER commit (never-commit class)

Committing the two docs will make rewrite-map/round-facts go stale - run the regen fixpoint after absorb: `node scripts/build-round-facts.js --round grill-t24` (or absorb under t23 facts if convention dictates), `node scripts/build-rewrite-map.js`, re-collect, splice, commit; loop until `--check` green.

## Carry-forward / standing items

- `defer-0068`: pending-evaluation to 2026-12-15 tide; countersign recorded citing the t23 audit. Do not close early.
- `defer-0066`: instance 4 resolved-in-t23-harness; instances 1-3 still open.
- Social preview: manual upload pending - `docs/assets/brand/social-preview.png`, guide in `docs/assets/README.md`.
- Burn-rate advisory: 5 carve-out rounds now - strongly prefer R3/runtime surfaces.
- CI-only gates (`bench-gate`, `ci-wiring`, `mr-probes`, `probes`): capability-absent locally; need CI-mode evidence. `defer0004`/`defer0026` in `check-ci-jobs.js` exit-1 leg unchanged.
- GitButler lessons (proven twice): index desync (`git reset -q HEAD` resync) + `A`-pool sweep bypassing id filters - defense is explicit path allowlist + post-commit `git show --name-only` check. Codified in report + audit report.
- Cap state: `340,472 < 380,000` (headroom 39,528 B); anchor = ADR-0039 D3 amended by ADR-0082.

## Suggested grill-t24 directions (pick one with user)

1. **Evidence-freshness discipline**: the "committed artifact froze at run-1 red" class - ADR clause or capture-battery rule (legs re-captured after last fixpoint, or table names run-N provenance).
2. **Never-commit scope formalization**: labeled-paths vs regex-class mismatch (ref-assets slipped through) - one ledger decision closes it.
3. **defer-0066 burn-down**: harness-consolidation round to close remaining instances.
4. **GitButler-interop ADR**: codify allowlist + post-commit inspection discipline.
5. **R1/R3 runtime round** (burn-rate relief): any product-surface work avoids a sixth carve-out round.

## Reproduce acceptance

```
node scripts/run-test-gate.js --expected-suites 77   # 77/1307/0
node scripts/run-gates.js                            # exit 0; 4 capability-absent disclosed
node scripts/check-pack-smoke.js                     # 340,472 < 380,000
node scripts/build-round-facts.js --round grill-t23 --check --report .scratch/grill-t23/reports/2026-09-22-report.md
node scripts/build-rewrite-map.js --check            # 2321 citations
node scripts/build-governance-anchors.js --check     # 18 artifacts
node scripts/check-deferred.js                       # 62 entries
```
