# grill-t27 second-party audit report (2026-09-25)

Auditor: independent audit window. Object: lane `grill-t27` (+ docs lane
`grill-t27-docs`) over common base `0ca482f7`, sealed tip commit `275d8974`
(post-seal tail), SEAL declaring anchor `5cb2a9fe`. Claim artifacts under
`D:\Aworker\jiahao\.scratch\grill-t27\` (report / handoff / round-facts.json /
SEAL / decision-ledger D-001..D-010 / spec-t27-disposition).

Verdict: **PASS, with findings** — every green-state claim in the report
re-verified green on independent re-run. Findings are one unimplemented spec
deliverable (F-1) plus documentation-precision items; none falsify the sealed
state. F-1..F-6 routed back to the fix window / owner adjudication per the
separation-of-duties rule; the audit window touches nothing.

## 1. Independent acceptance re-run (not trusting report self-description)

Re-ran `node .scratch/grill-t27/capture-battery.cjs` at durable head
`275d8974` (fresh captures archived verbatim at
`D:\Aworker\jiahao\.scratch\grill-t27\audit-evidence\rerun\`), then restored
the 13 pinned evidence files (`but discard` on the modified set, IDs
yrx psw kr vn lp sys lk txk trq tuq ts ss vlq) and re-ran the two legs that
the re-run itself had reddened, on the pristine committed tree:

| leg | report claim | audit re-run | verdict |
| --- | --- | --- | --- |
| jest via run-test-gate | 82/82 suites, 1367/1367 tests, 0 skipped, EXIT 0 | `Test Suites: 82 passed, 82 total` / `Tests: 1367 passed, 1367 total`, EXIT 0 | confirmed |
| gate:all | EXIT 0, 36 entries, 4 registered ci-mode UNVERIFIABLEs | EXIT 0 on pristine tree — 36 entries, UNVERIFIABLE = ci-wiring/bench-gate/probes/mr-probes only; corpus-leak/probe-corpus/corpus-freshness/corpus-classes all PASS vs real private corpus | confirmed |
| governance-inventory | EXIT 0, 36 entries, 2 advisory warnings | EXIT 0; warnings = carve-out burn-rate + ADR streak (both pre-existing advisories) | confirmed |
| check-deferred | EXIT 0, 66 entries (54 live, 12 closed/actioned) | verbatim match | confirmed |
| adr-index --check | EXIT 0 | EXIT 0 | confirmed |
| rewrite-map --check / --published-only | EXIT 0 both | EXIT 0 both on pristine tree (2903 citations — post-seal regen count; round-facts' 2836 is the claim-commit-time canon, consistent) | confirmed |
| anchors --check | EXIT 0, 18 artifacts | EXIT 0 | confirmed |
| pack-smoke | EXIT 0, 353706 B / 115 files / budget <380000 | verbatim match | confirmed |
| corpus-restore rehearsal | EXIT 0, validated 4 manifest entries, atomic placement incl. mr-probes.jsonl | EXIT 0 — `[restore-bench-corpus] validated 4 manifest file(s)`, placed 5 files (extra `fingerprints.json` tolerated per spec) | confirmed |
| liveness | EXIT 0, JSON-RPC result object | EXIT 0 — pack → extract → `install.js --help` → `init -y --dry-run` → `jiahao-mcp` answered `initialize` with a `"result"` object | confirmed |
| freshness evaluateRound | "all rounds clean; t27 pre-seal evaluated 0 claims" | claim-time capture (a1776dde) shows `claims:0,failures:0` — true at capture; terminal wave (5cb2a9fe, committed) and current rerun both show `claims:1, claimFailures:1` = the disclosed 13 `header < floor` flags (D-010) | row stale vs its own committed evidence — see F-2 |
| clean tree | verbatim capture, historical audit pool intact | verbatim capture carries the pool + `M bench/research/out/g6-publish-replay.json` (pre-existing, also in committed capture) | confirmed |
| compile | `node --check` on touched sources | OK: restore-bench-corpus.js, corpus-restore.test.js, sentinel-ownership.test.js, adr-0079-wiring.test.js, capture-battery.cjs | confirmed |

Artifact note: the battery re-run initially produced `gate-all exit 1` and two
red rewrite-map legs — caused by the battery overwriting the committed
evidence files it cites (citation drift: new headers `275d8974` vs committed
map built over `5cb2a9fe`). On the restored tree both legs and gate:all are
EXIT 0. This is the disclosed regen-boundary property, not a defect — but it
means "re-run the battery" is only valid pre-commit or with a pinned-evidence
restore afterwards (recorded for the next round).

## 2. Physical spot-checks (repo truth vs report claims)

- `D:\Aworker\jiahao\scripts\restore-bench-corpus.js` — exists; zero-dep
  (fs/path/crypto/child_process + local `src/shared/capability` `escWf`);
  ADR-0029 D4 core+CLI split (`restore()` injectable, `require.main` CLI);
  extract-to-sibling-temp → manifest validate (id+sha256) → delete+`::error`+
  exit 0 on mismatch → atomic `fs.renameSync` placement. Matches spec §2.
- `D:\Aworker\jiahao\.github\workflows\ci.yml` — restore step rewritten:
  base64 → tgz file → `node scripts/restore-bench-corpus.js`; empty-secret →
  `::warning` degrade note; `--expected-suites 82` in the test job.
- `D:\Aworker\jiahao\bench\polygraph\thresholds.json` — `private_corpus`
  manifest = 4 entries (probes/judge-twins/twins/mr-probes), each
  id+sha256+source_adr; consumed by the restore script, never hardcoded.
- `D:\Aworker\jiahao\test\corpus-restore.test.js` — 7 rehearsal legs
  (complete/partial/stale-sha/layout-drift/extra-tolerated/corrupt/manifest
  contract), jest drives `restore()` directly with injected manifest.
- `D:\Aworker\jiahao\test\sentinel-ownership.test.js` — D2b rename-over
  implant (`fs.renameSync(implant, f1)`); assertion body
  `sameFile(s0,s1)===false` untouched.
- `D:\Aworker\jiahao\test\adr-0079-wiring.test.js` — dual-layout npm-cli
  probe + PATH derivation via `where.exe`/`which` + realpath; invoke via
  `process.execPath`; assertion body (files allowlist + no zh-CN tarball
  lines) untouched.
- `D:\Aworker\jiahao\docs\deferred-registry.json` — 66 entries; `defer-0072`
  carries dual-gate trigger (10 consecutive UNVERIFIABLE runs OR
  review_at 2026-10-15 → forced adjudication) + pre-registered ADR-0061-style
  hook + owner Xxx91n; `defer-0070` still `pending-evaluation`, unfreeze
  condition unchanged ("a workflow run on origin/main concludes success").
- `D:\Aworker\jiahao\docs\governance\ERRATA.md` — E-8/E-9 appended with
  reopen-trigger lines (append-only; t26 pinned artifacts untouched).
- `D:\Aworker\jiahao\docs\governance\trend-inventory.json` — t27 `kind:fix`
  row with verbatim ADR-0040/0061 D-F anchor quote, cumulative
  `governance_tooling_diff`, `deferred_entry: defer-0072`,
  `zero_product_diff: true`.
- `D:\Aworker\jiahao\CONTEXT.md:1704` — UNVERIFIABLE entry anchors defer-0072.
- `D:\Aworker\jiahao\README.md` — 1367 tests / 82 suites declared (both
  places). `README-zh-CN.md` baseline re-pinned.
- Round diff `git diff 0ca482f7...HEAD -- src/` — empty: `zero_product_diff`
  confirmed physically (the trend row's src/ filenames are cumulative-since-
  fc390d5e bookkeeping, already in base).
- Zero new ADR — `docs/adr/` tops out at 0085; no 0086.
- Secret payload `D:\Aworker\jiahao\.scratch\.tmp-t27-secret-refresh\`
  (10312-char b64 + 7732-B tarball + staged `dest/`) is gitignored via
  `.scratch/.tmp-*` — no corpus content into git (ADR-0036 holds).
- Claim commit `2aa02dd9` file list = 13 evidence + report + handoff +
  next-round + round-facts + ledger — matches its declared surface; kkz
  (`0054aab7`) = README.md + README-zh-CN.md only (allowlist `rl krv`).
- `instrument_entries: 27` in round-facts = `src/instrument-state.json`
  `history` length — verified.

## 3. Dual-axis review ($code-review, parallel sub-agents, fixed point 0ca482f7)

### Standards

No hard violations of documented standards. Conventions hold: zero-dep argv-
array scripts, D4 core+CLI split, verbatim-argv/`display-form` capture
headers, `fs.writeFileSync` artifact writes. Judgement calls:

- **ci.yml:57** `echo "$B64" | base64 -d` runs under `bash -e`: a malformed
  secret fails the step RED, bypassing the validate-or-absent degrade — the
  report's "absent/invalid secret → UNVERIFIABLE + `::error`" overclaims for
  the malformed-base64 class (F-4).
- npm-cli.js discovery duplicated with divergent shapes
  (`adr-0079-wiring.test.js` dual-layout vs `capture-battery.cjs:88`
  single-layout `<bindir>/node_modules/npm` — silently misses unix
  `../lib/`): possible Duplicated Code, drift risk on unix hosts (F-7).
- `describe(verdict)` at `restore-bench-corpus.js:69` — possible Mysterious
  Name (jest-`describe` shadow connotation). Trivial.
- hardcoded `'jiahao-0.0.1.tgz'` at `capture-battery.cjs:91,94` — breaks
  silently on a version bump. Trivial.
- `validateCorpusDir` skips hashing when a manifest entry lacks `sha256`
  (`typeof === 'string'` tolerate-by-omission); covered today by the
  manifest-shape test leg. Latent, informational.

### Spec (spec-t27-disposition + ledger D-001..D-008)

- **(a) missing:** OIDC deferred-registry row absent — spec §2 deferred-rows
  + §3 disclosure channel (iii) unimplemented; registry gained exactly one
  entry (defer-0072). Report does not claim it, so it is an omitted
  deliverable, not a false claim (F-1).
- **(a) partial:** `governance_tooling_diff.files` omits
  `test/adr-0079-wiring.test.js` (the D5 fix is itself a spec deliverable)
  while listing `test/sentinel-ownership.test.js` — inconsistent enumeration
  (F-9, nit). Report §5 never restates the t25 "20+ waves" baseline figure
  the spec's baseline-comparability clause calls for (nit).
- **(b) scope creep:** none material — re-pins are obligated same-commit
  syncs, disclosed.
- **(c) questionable:** handoff's seven-field closure template paraphrases
  `degradation_semantics` instead of carrying the ADR-0040 verbatim quote the
  spec names (F-5, nit); D5 win32 fallback routes through `cmd.exe /d /s /c`
  — literally neither banned form, semantically adjacent to the rejected
  shell-mediated path (borderline judgement); handoff/next-round stubs name
  `a1776dde`, non-ancestral post-restack (F-6, nit — pinned artifacts,
  append-only channel applies).

## 4. Per-decision verification (D-001..D-010)

| D | claim | evidence | verdict |
| --- | --- | --- | --- |
| D-001 | scope = 6-leg triage + defer-0070 closure path + convergence first-run + t26 cleanup | all six legs fixed (see §2); defer-0070 kept open with event-driven closure path; measurement landed; cleanup registered `satisfied-by-bccdef06/9455aa18` (ledger D-001 note + spec §1) | implemented |
| D-002 | corpus restore validate-or-absent + agent-prepared secret package + OIDC row deferred-registered | script + ci.yml + manifest + 7-leg rehearsal verified; package prepared gitignored, owner-write respected | implemented except (iv): **no OIDC deferred-registry row exists** (F-1) |
| D-003 | zero new ADR + three disclosure channels | no 0086; channel (i) trend row verbatim anchor ✓; channel (ii) defer-0072 trigger+hook ✓; channel (iii) missing (F-1) | partial |
| D-004 | D2b rename-over; D5 dual-layout+PATH; assertions untouched | diffs show implant + probe; `expect` bodies byte-identical | implemented |
| D-005 | satisfied-by registration + reopen-triggers, append-only | ERRATA E-8/E-9 carry `reopen-trigger:` lines; t26 artifacts untouched | implemented |
| D-006 | dual-track measurement: legacy + anchored shadow + freshness outcomes + n=1 limits | round-facts.json carries both groupings (4 vs 1, 0 shadows, first-pass 1); report §5 carries validity/threats | implemented; baseline figure not restated (nit); "10 landed commits" inconsistent with final lane (F-3) |
| D-007 | literal defer-0070 closure on first success run; 7-field row; successor = defer-0072; yellow-grade degraded green | defer-0070 stays pending-evaluation with unchanged condition; template exists in handoff | implemented; template's degradation_semantics paraphrases rather than quotes ADR-0040 (F-5, nit) |
| D-008 | dual-gate trigger (10 consecutive OR 2026-10-15) + forced adjudication, never auto-flip | defer-0072 `unfreeze_if.check` carries it verbatim | implemented |
| D-009 | convergence definitions + verdict | definitions verbatim in ledger; raw data consistent EXCEPT "Total landed commits on the grill-t27 lane: 10" — lane actually holds 13 commits (+1 docs-lane = 14); the count omits msy (`5cb2a9fe`, which the SEAL itself declares "the last substantive commit"), syo, srp — a claim-time projection stated as final (F-3) | imprecise |
| D-010 | post-seal disclosure: restack aftermath, SEAL re-issue, sweep undo | consistent with lane history (`but` log shows the re-based shas; SEAL text discloses same items) | implemented |

## 5. Findings routed for disposition

- **F-1 (spec gap, fix-window candidate):** register the base64-tarball→OIDC
  controlled-channel row in `docs/deferred-registry.json` per spec §2/§3 and
  ledger D-002(iv)/D-003(iii); bump the adr-0033 seed-inventory pin 66→67 in
  the same commit per ADR-0057 D-C convention.
- **F-2 (doc precision, append-only erratum candidate):** report §2 freshness
  row ("all rounds clean; t27 pre-seal evaluated 0 claims") is true only of
  the claim-commit-time capture; the committed terminal wave and current
  evaluation show `claimFailures: 1` (the 13 `header < floor` flags, honestly
  disclosed in SEAL item (ii) + ledger D-010). The SEAL's phrase "disclosed
  in the ledger addendum + report" is half-accurate — the report never
  mentions the flags. Correction channel = appended erratum pointing at the
  terminal-wave evidence, never an edit of the pinned report.
- **F-3 (doc precision, erratum candidate):** ledger D-009 "Total landed
  commits … 10" vs actual 13 lane commits; decomposition omits the
  SEAL-declared-substantive `5cb2a9fe` plus the regen/wave commits.
- **F-4 (standards judgement → fix window decision):** `ci.yml` base64
  decode failure fails the step RED under `bash -e`, outside the degrade
  channel — either route decode failure into validate-or-absent (e.g. always
  hand the decoded bytes to the script, which degrades on garbage) or narrow
  the report's "absent/invalid secret → UNVERIFIABLE" wording.
- **F-5/F-6 (nits):** closure-template verbatim-quote miss; stale `a1776dde`
  in handoff stubs (append-only correction channel).
- **F-7 (judgement):** npm-cli discovery duplicated battery-vs-test with
  divergent layouts — consider one shared resolver or note battery is
  Windows-host-scoped.
- **F-8/F-9 (informational):** `describe()` naming, magic tarball name,
  sha256-absent tolerance; gtd.files enumeration inconsistency.

## 6. Process-violation review (disclosed, not ratified by me)

- Sweep commit `mkl`/`a9d60dc5` ran a bare `but commit` over the pool —
  forbidden for round work (ADR-0083 D-C); undone via `but undo`, redone as
  `kkz` with explicit allowlist `rl krv`; disclosed in report §6 + D-010.
  Verified: `kkz` (`0054aab7`) contains exactly README.md + README-zh-CN.md.
- First SEAL + first post-seal regen undone once and re-issued to pin the
  true last-substantive `5cb2a9fe` — disclosed (D-010).
- adr-0068 flake inside one battery wave — disclosed; standalone + terminal
  wave clean; my rerun did not reproduce it.
- Lane restack (`but move grill-t27 --above grill-t27-docs`) made the claim
  commit's embedded wave headers non-ancestral — the 13 `header < floor`
  flags are a true record, never repaired; disclosed SEAL + D-010 (F-2 tracks
  the report-side wording only).
- My own audit side-effects: 13 fresh captures under
  `.scratch\grill-t27\audit-evidence\rerun\` (uncommitted pool, audit
  convention); pinned `evidence\*.txt` restored to committed state via
  `but discard` (verified `git status` clean on that dir).

## 7. Bottom line

The sealed state reproduces: at durable head `275d8974` the full battery is
green on the committed tree, the four UNVERIFIABLEs are the registered
ci-mode degrade, the six CI-red legs are genuinely fixed, zero product diff,
and the owner-side tail (secret set, merges, tag, event-driven defer-0070
closure) is correctly unexecuted. F-1 is the only missing deliverable; F-2/F-3
are append-only-erratum candidates; the rest are judgement calls for the fix
window or owner adjudication.

---

# LOOP re-audit — rework window (2026-09-25, second pass)

Rework commits on the lane: `c8aaffb0` [ANCHORING] fix (7 files, allowlist
verified), `0e11845e` bookkeeping (2 files), `f7c4a1a9` regen (2 files).
All three `git show --name-only` file lists match their declared allowlists.
Ledger `D-011` records the window honestly, including the post-seal
substantive character of the work.

## Disposition re-verification (claim → evidence → verdict)

| finding | disposition | audit evidence | verdict |
| --- | --- | --- | --- |
| F-1 OIDC row | implemented | `docs/deferred-registry.json` `defer-0073` present — presence-condition unfreeze, `review_at 2026-12-25`, owner Xxx91n, pending-evaluation; registry 67 entries; `test/adr-0033-wiring.test.js` expected array carries `defer-0073` (pin 66→67 same commit); `CONTEXT.md:1708` anchors the id | verified |
| F-2 freshness row | erratum | `ERRATA.md` E-10 (lines 142-153) — names the claim-time scope, `claimFailures: 1`, the 13 flags, the SEAL phrase half-accuracy | verified |
| F-3 commit count | erratum | `ERRATA.md` E-11 (155-165) — corrected count 13 lane + 1 docs + 3 undone commits, matches `git log` | verified |
| F-4 base64 decode | implemented | `ci.yml` now `base64 -d > "$RUNNER_TEMP/bench-corpus.tgz" \|\| true` — malformed secret hands bytes to the restore script → `::error` + absent → UNVERIFIABLE (routing fix, the stronger option) | verified |
| F-5 verbatim quote | implemented | `handoffs/next-round.md` carries the corrected closure template with verbatim ADR-0040/0061 D-F anchor text, cross-referencing E-12 | verified |
| F-6 stale sha | erratum + operational copy | `ERRATA.md` E-12 (166-176); `next-round.md` now names `5cb2a9fe`; pinned artifacts byte-stable | verified |
| F-7 npm-cli dup | implemented | `capture-battery.cjs` resolves both layouts + `where.exe`/`which` PATH fallback (mirrors D5 probe) | verified w/ residual nit (below) |
| F-8 naming/magic | implemented | `describe` → `verdictSummary` (def + call site); tarball name derived from `package.json` name+version | verified |
| F-9 gtd enumeration | rejected-with-reason | ADR-0076 taxonomy: `test/adr-*-wiring.test.js` classifies R3 (doc surface); `gtd.files` enumerates R2 only — the original "omission" was correct. An attempted add was caught red by `check-governance-inventory`'s mislabeled-disclosure leg and reverted; D-011 records it | **rejection accepted** — my F-9 suggestion was wrong; the checker's catch is machinery working as designed |

## Acceptance re-run at final HEAD (`f7c4a1a9` / workspace `e78a8659`)

- `node scripts/check-deferred.js` — 67 entries (55 live, 12 closed/actioned), EXIT 0
- `node scripts/run-test-gate.js --expected-suites 82` — 82/82 suites, 1367/1367 tests, 0 skipped, EXIT 0 (73 s)
- `node scripts/run-gates.js` — EXIT 0, 36 entries, same 4 registered ci-mode UNVERIFIABLEs, 3 advisory warnings
- `build-rewrite-map.js --check` + `--published-only` — 2910 citations, both OK
- `build-governance-anchors.js --check` — 18 artifacts in sync
- `evaluateRound(grill-t27)` — seal `declared=5cb2a9fe`, `inFlightClean`, `amended=false`, `capturesAtSealOk`, `freezeViolations=0`, `unregisteredClaims=0`; `claims.bad=13` (the disclosed restack residue, now also E-10'd)
- liveness — `jiahao-mcp` answered a real JSON-RPC `initialize` result; real-corpus restore rehearsal validated 4 manifest files + atomic placement incl. `mr-probes.jsonl`
- `node --check` — OK on `capture-battery.cjs` + `restore-bench-corpus.js`
- pinned claim artifacts: `git diff 275d8974..HEAD` on report/SEAL/round-facts/evidence/pinned-handoff/spec/GOAL — empty (byte-stable); ledger diff is append-only

## Loop observations (non-blocking)

- Working-tree `evidence/*.txt` currently hold pre-rework rerun captures
  (headers `275d8974`, incl. the artifact-red `gate-all exit 1`) — uncommitted
  residue from a battery run before the rework commits; the pinned committed
  state is the green `5cb2a9fe` wave. Next round should `but discard` or
  re-capture before judging gate legs.
- `c8aaffb0` is an `[ANCHORING]` substantive commit landed post-SEAL: the
  machinery reports clean (`freezeViolations=0`, eval anchors at the
  declaration commit) and D-011 discloses rather than hides it, but the
  SEAL's "last substantive commit" phrase now points at `5cb2a9fe` while a
  newer substantive commit exists. Consistent with the append-only
  convention; flagging for owner adjudication whether the pending
  `adjudicated/grill-t27` tag should co-name the seal sha as declared or be
  re-pointed to cover the rework tip.
- `capture-battery.cjs` PATH-fallback IIFE lacks the `try/catch` the
  `adr-0079-wiring` version has — `fs.realpathSync` can throw on a stale PATH
  hit (crash, not degrade). Dev-harness scope; informational.
- `adr-0033-wiring.test.js:63` comment splices into the previous
  defer-0072 comment mid-line — cosmetic only, assertion unaffected.

## Loop verdict

Rework verified: every audit finding is either verifiably implemented or
rejected with recorded reason (F-9). The sealed state still reproduces green
at the final head. PASS stands — the round + rework window is consistent,
disclosed, and owner-side tail remains correctly unexecuted.

---

# Landing record (owner-directed, 2026-09-25)

- Stack pushed: `origin/grill-t27-docs` c9b47dab, `origin/grill-t27` (final
  `5a18ceee`). PRs: #11 (docs→main), #12 (stack top).
- PR #12 first CI run FAILED — `rewrite-map --published-only` leg:
  rework regen `f7c4a1a9` had been generated over dirty pre-rework evidence
  captures (headers `275d8974`), baking uncommitted state into the committed
  map. Reproduced locally (`--check` FAIL on clean tree). Audit-window
  repair (mechanism-output regen only, disclosed): clean-tree regen →
  commit `5a18ceee` (allowlist `so`, `git show --name-only` verified) →
  `--check` + `--published-only` + jest leg green.
- Second CI run green (gate-all/test/summary). Merged via
  `PUT pulls/12/merge-async` — the stack-PR merge endpoint; both PRs
  MERGED, main tip `c8613f55`. Branches deleted: local (but pull
  integration) + origin refs removed; `git branch`/`git branch -r` clean
  except inert `gb-local/*` mirrors.
- First origin/main run after merge: **36142965743 conclusion=success**
  (51 s) — ends the 40+ consecutive-failure history (defer-0070's
  registered unfreeze condition fired). Composition: corpus gates
  UNVERIFIABLE (stale secret still pending) + rewrite-map UNVERIFIABLE
  (clone lacks gb-local refs) → **yellow-grade** (degraded green): the
  defer-0070 seven-field closure is executable by t28 per the registered
  condition; defer-0072 keeps budgeting the degrade.
- Still owner-side (not executed by any agent window): `gh secret set
  JIAHAO_BENCH_CORPUS_B64` and the `adjudicated/grill-t27` tag decision
  (co-name declared seal `5cb2a9fe` vs cover rework tip — open
  adjudication point noted in the LOOP section).
