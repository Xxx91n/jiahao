# grill-t27 next-round task book — CI-red triage / fix round

Sole decision source: `D:\Aworker\jiahao\.scratch\grill-t27\decision-ledger.md` (D-001..D-008, all current). Execution spec: `D:\Aworker\jiahao\.scratch\grill-t27\spec-t27-disposition.md` (per-section D-ID keys; nothing outside the ledger). Upstream context: `D:\Aworker\jiahao\.scratch\grill-t26\handoffs\2026-09-24-audit-handoff.md`.

Authority boundary (unchanged): pushes to main, merges, annotated tag pushes, `gh secret set`, renew-or-expire, countersigns, forced adjudication are USER actions. The agent drafts, commits locally on its own lane, runs local verification only.

## T-0 — Pre-flight [D-001]

- `git ls-remote origin` + `gh run list --branch main --limit 3` — record tip + latest workflow conclusions (last observed: origin/main `0ca482f7`, run 36030223375 failure, 6-leg surface per GOAL.md).
- Confirm defer-0070 pending (pending-evaluation; owner Xxx91n) in `docs/deferred-registry.json`; do not touch defer-0071.
- Open a dedicated GitButler branch for t27; leave parallel lanes untouched. `but commit` only with explicit path/hunk allowlist + `git show --name-only` verify (ADR-0083 D-C).

Suggested skills: gitbutler.

## T-1 — Test-leg fixes [D-004]

- `test/sentinel-ownership.test.js` D2b: temp-named file + `fs.rename` over target (deterministic new inode; MoveFileEx analogue on Windows). Assertion body + `src/sentinel.js` untouched.
- `test/adr-0079-wiring.test.js` D5: `spawnSync(process.execPath,[npmCli,'pack','--dry-run'])`; npmCli via dual-layout probe (`dirname(execPath)/node_modules/npm/bin/npm-cli.js` + `dirname(execPath)/../lib/node_modules/npm/bin/npm-cli.js`) + PATH fallback. Assertion body untouched.
- Forbidden: degrade-to-skip, relaxed assertions, bare `spawnSync('npm.cmd')`, `shell:true`+args array.

Suggested skills: tdd.

## T-2 — Corpus restore-step integrity [D-002, D-003]

- `.github/workflows` restore step: extract to temp dir → validate required-file set against the git-versioned manifest (`bench/polygraph/thresholds.json` `private_corpus` — consume it, never hardcode a file list) → mismatch: delete dir → probe absent → four gates UNVERIFIABLE + `::error` annotation → placement via atomic `mv`.
- Probe contract untouched (ADR-0040 D2); corpus content never enters git.
- Local rehearsal: feed a missing- `mr-probes.jsonl` tarball and a complete tarball; assert UNVERIFIABLE vs real run.

Suggested skills: tdd; neat-freak (workflow/registry congruence).

## T-3 — Secret-refresh package (human handoff) [D-002]

- Build full tarball of `private/bench-corpus/` (must include `mr-probes.jsonl`), base64 it, draft the exact `gh secret set JIAHAO_BENCH_CORPUS_B64` command + verification steps; hand to owner — the write is owner-side.
- Register base64→OIDC channel as a deferred-registry row (not this round's work).

Suggested skills: none beyond gitbutler for the draft artifacts.

## T-4 — Bookkeeping rows [D-003, D-005, D-007, D-008]

- `trend-inventory` `kind:fix` row + `governance_tooling_diff` — reason line quotes the ADR-0040/0061 D-F anchor clause verbatim.
- New deferred-registry successor row (referenced later as successor_defer_id): subject = corpus-gate UNVERIFIABLE degrade pending secret refresh; owner Xxx91n; trigger = 10 consecutive UNVERIFIABLE runs OR review_at 2026-10-15 (whichever first) → forced adjudication (refresh / accept permanent degrade / approve fail-flip); pre-registered hook: first real trigger → mint ADR-0061-style revision ADR.
- Append reopen-trigger errata entries (t27-side, append-only — t26 pinned artifacts untouched): cx/evd/rr naming (unseal-for-other-reason / real-defect evidence); wave-1 evidence-index (claim-unverifiable → appended erratum to terminal wave).
- defer-0070 closure procedure (event-driven, fires on first conclusion=success origin/main run): seven-field closure row — run_id / conclusion / verifiable_composition / degradation_semantics / degradation_cause / successor_defer_id / closure_rule_verbatim. Successor row must exist BEFORE the closure row references it. Degraded green registers as yellow grade.

Suggested skills: neat-freak; domain-modeling (any new registry-term naming).

## T-5 — Closeout + convergence measurement [D-006, D-007]

- Round evidence battery; claim-point freshness verified at the report commit; terminal wave; `.scratch/grill-t27/SEAL` (seal + recorded_at, registered non-anchoring class).
- Measurement: capture waves under t25-legacy grouping (baseline-comparable) + shadow count under the refined anchored definition; per-claim-commit freshness outcomes (first-pass / recapture / stale-retained); total commits. Raw data → round-facts.json; definitions+verdict → ledger; validity/threats/shadow/baseline → round report (analytic-generalization wording, n=1 limits).
- If a success run lands mid-round: execute the T-4 closure procedure for defer-0070.
- USER: `adjudicated/grill-t27` tag push co-naming the seal sha (absence → declaration-only degrade + recorded state, never silent).

Suggested skills: neat-freak; handoff (round-end).
