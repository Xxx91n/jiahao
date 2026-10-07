# Handoff: grill-t36 → grill-t37 (implementable residue closed; three owner acts open)

## Current State

- **The audit window implemented and pushed.** Five commits landed across three lanes, all pushed to `origin`. `origin/main` is **untouched** at `0f58ba60` (2026-10-02 grill-t35 landing closeout).
- **Every implementable finding from the five audit loops is closed and independently re-verified.** What remains is **three owner acts** and the t36 closeout ritual.
- **Audit report**: `D:\Aworker\jiahao\.scratch\grill-t36\reports\2026-10-03-audit-report.md` (§10 is loop 5). Round report: `D:\Aworker\jiahao\.scratch\grill-t36\reports\2026-10-02-report.md`. Both UNTRACKED, per the nc-001 convention.
- **The lane is NOT cleared to land into `origin/main`.** Three owner acts stand, and `check-post-land-sentinel` still needs the E-17/E-19 closeout ritual.

### Independence break — read this first

Loops 1-4 were audit-only: no implementation authority, no commits, no pushes. **At loop 5 the owner authorised this window to implement the residue.** That breaks the separation of duties the report was written under.

- Every loop-5 commit carries a footer naming the audit window as the implementer, so the claim surface records who did the work.
- **The findings are unaffected.** §1-§9 stand as written, including the loop-1..4 FAIL verdicts. No finding was closed by the party that raised it without a named re-verification command — §10b lists them.
- Disclosed in §10a of the audit report, not absorbed.

### What was implemented (loop 5)

| Finding            | Change                                                                                                                                                                      | Re-verification                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **M-13**           | `docs/adr/0093-observer-equivalence-contract.md` D-2: `The base enumeration…` → `M1's base enumeration…` + the D-4 divergence named. D-1 declares both bases.               | `build-adr-index --check` exit 0; single non-duplicated edit                                        |
| **M-13**           | `scripts/build-doc-hygiene-baseline.js` + `docs/governance/doc-hygiene-baseline.json`: new `enumeration_surface.base_scope`. Generator emits it, so `--write` cannot drift. | `build-doc-hygiene-baseline --check` exit 0 (9 instances / 1594 files); `adr-0076-wiring` 78 passed |
| **m-4**            | ADR-0093 line count re-derived → `493 lines per wc -l`. File also gained its trailing newline, so the report's parenthetical is gone.                                       | `wc -l` = 493; committed blob ends `2d2d 3e0a`                                                      |
| **loop-4 residue** | `src/shared/tracked-surface.js` + `test/adr-0087-wiring.test.js` (left uncommitted by the implementer)                                                                      | comments only; both suites green                                                                    |

### Version control — final state

| Lane              | Commits                             | Pushed to                             |
| ----------------- | ----------------------------------- | ------------------------------------- |
| `grill-t36-docs`  | 6 (`zqn` is loop 5)                 | `origin/grill-t36-docs` @ `c4361bb3`  |
| `grill-t36-impl`  | 7 (`mnl`, `rpv`, `ozu` are loop 5)  | `origin/grill-t36-impl` @ `65fe0daf`  |
| `grill-t36-fixes` | 3 stacked on impl (`yru` is loop 5) | `origin/grill-t36-fixes` @ `8da36b02` |

- `but push` pushed **lanes only**. `origin/main` = `0f58ba60`, verified unchanged after the push.
- **Branch cleanup**: `gitbutler/target` deleted from `gb-local` (proved `merge-base --is-ancestor … origin/main` first). The other five candidates (`grill-t32/33/34-docs`, `grill-t35-docs`, `grill-t35-impl`) turned out to be **already-deleted stale tracking refs** — `git ls-remote --heads gb-local` shows only the three t36 lanes, `gitbutler/workspace`, and `main`. `git remote prune` ran on both remotes. **The t36 lanes were not deleted** — they are unlanded.
- `check-anchoring-footer` → exit 0, **155 post-registration commits verified** (was 150 at loop 4).

### Hard acceptance (loop 5, final)

- `npx jest` → `Test Suites: 1 failed, 98 passed, 99 total; Tests: 1 failed, 1694 passed, 1695 total`. Sole red `test/adr-0038-wiring.test.js` — the **declared** ADR-0039 D3 pack cap. **The undeclared-red class is empty.**
- **26 gate legs: 4 red / 22 green**, the same four as loops 1-4: `check-post-land --post-only`, `check-post-land-sentinel`, `check-map-freshness` (default), `check-pack-smoke`.
- `npm pack --dry-run` exit 0, 174 files; `check-pack-smoke` `smoke OK … CLI dry-run plan matched`. `git diff --check` exit 0. No stray artifacts (`*.tgz`, `.codex-tmp/`, `commit.sh` all absent).

## Three owner acts — none is agent-implementable

1. **M-9 — ADR-0094 cap anchor.** Fully disclosed; ADR-0094's D-C is **unchanged**. `M_latest = 476,450` (169 files, t35 tip); the ADR's own draft-time re-measure read 497,415; the live surface is **500,374**. Applying the sanctioned `ceil_to_10_000(M_latest × 1.10)` to the live number yields **560,000**. Signing as drafted **would** clear leg 196 (500,374 < 530,000, headroom 29,626), but the anchor is contradicted twice inside its own document. Needs a ruling on which surface the anchor keys to, then a re-derivation — **not a hand-typed cap**.
   - Also unresolved here: **ADR-0094's status line.** The worktree carries an uncommitted rewrite that deletes _"Drafting is not ratification: this ADR takes effect only when the owner signs it…"_ and replaces it with `Status: Accepted — ID-level-only, awaiting entity-level countersign`. Mechanically conformant with the registered countersign-queue form (`countersign-queue` 6/6), but the guard sentence is gone. **This diff was deliberately NOT committed** — it is an owner decision. It is the only tracked modification left in the worktree.
2. **P-13 — Baseline-CI.** The round report names the gap (`**Public CI status**: NOT QUERIED IN THIS ROUND`). `D:\Aworker\jiahao\AGENTS.md` (grill-t33 D-003(iv)) requires the origin/main tip's latest public run conclusion **and the failing step name**. Five windows declined to query the CI provider. Produce it or issue an explicit waiver — a named gap is honest, an undischarged standing clause is not.
3. **m-5 — register the audit report.** `check-audit-surface` selects from `docs/governance/claim-surface-roles.json` (ADR-0093 D-5); it still resolves `.scratch/grill-t35/reports/2026-10-01-audit-report.md`. The gate's own rule: _"the registering agent may request a row, never self-certify one."_ **Do not let an agent self-register.** The report's `audit-coverage v1` block is a verified superset (28 checklist items, 64 entries, 0 missing) and passes the moment it is registered.

## Next Session Scope

1. **Do not re-run the loop-5 battery as discovery.** It is recorded in §10e with commands. Re-run it only to confirm a change you made.
2. **T-10 closeout, when the owner acts land** — this is the round's own next step, not an audit finding: map regen **LAST** on the settled tree → `build-rewrite-map.js --check` **and** `--published-only` against the settled tree (E-19) → closeout report carrying a fresh `post-land-verify` sentinel block. That is the only thing that clears `check-post-land-sentinel` (stale t35 block + `ran_at` predating the last claim mutation).
3. **Landing `grill-t36` into `origin/main`** is an owner act. Before it: `check-map-freshness` (default) and `check-post-land --post-only` will only go green once the tree is the public tip. `pack-smoke` stays red until ADR-0094 is signed.
4. **m-4b (disclosed, not fixed)**: the loop-4 ADR-0093 edit converted 10 markdown emphasis spans `*x*` → `_x_` and re-indented 6 list items, none of it part of the D-1 correction it claimed. Cosmetic and gate-clean. **Left rather than blanket-reverted** because a revert would discard the D-1 correction sharing the same diff. Decide explicitly or leave it.
5. **P-16 (open)**: the unrecorded host memory ceiling. Full-suite totals on this machine are **not stable** — 1695 / 1695 / **1663** / 1695 across loops 1-5, the 1663 run dying on `Out of memory, malloc failed` at 1.89 GB free of 15.9 GB. Affected suites pass isolated (`orphan-cites` 21 tests ~102 s, `adr-0084-wiring` 18 tests ~105 s). **Quote free memory alongside any full-suite total.** Two windows have recorded a performance observation as a "timeout" with no timeout occurring — measure before characterising.

## Next Grill Direction (grill-t37)

**A hand-written status surface cannot be the authority on its own accuracy — and the correct repair for an untrue claim depends on whether the prose or the mechanism is wrong.**

Loop 5 was the first window to _edit_ rather than _report_, and it produced the sharpest evidence yet for the second half of this question.

**The prose half is a confirmed class.** Nine instances, all in this round, none visible to `check-anchoring-footer`, `check-test-manifest`, `check-claim-surface-roles`, or any of the 26 gate legs: B-1 (hand-typed `PASS` over a red gate), B-2 (hand-written red list missing an entry no gate could catch), M-10 (a report asserting a restored edit that never happened), M-2 (a report claiming a source edit whose string has never existed in the repo), M-1 (an allowlist denial seven lines from its own disclosure), M-13 (one statement updated, its twin missed), m-4 (a carried number never re-derived), and two more in the loop-5 record below.

**The prose-editing failure mode has a measured cost.** M-11's comment was rewritten **three times**. v1 named a compensating test that did not exist. v2 named a file that spawns the script rather than implementing the branch, plus an ADR section defining no such concept. **v3 succeeded — by describing the mechanism the code actually implements** (`declaredTreeAt` → null → `commitTip` → `tip`), which the audit then verified clause by clause. M-8 took the same path: loop 3 fixed a comment and created an ADR divergence; loop 4 fixed comment **and** ADR together. **Prose-editing converges only when the mechanism is right.** That distinction is the grillable object.

**Loop 5 added three fresh instances of the prose class, all self-inflicted, which makes it the right evidence base:**

- A commit message claimed _"the file now ends with a newline"_ while the committed bytes did not. Caught by byte-comparing the committed blob against the worktree.
- The same commit's message arrived with literal `\n` sequences instead of newlines **and no `[ANCHORING]` footer at all** — because the message was passed through a shell argument. Caught by `git log -1 --format=%B | grep -c ANCHORING` = 0 against the derived footer.
- A bare `but commit` (no id list) was issued, which is the exact pattern `AGENTS.md` forbids. The tool refused and created nothing, but the attempt belongs on the record.

**The unifying observation**: in every instance, the writer and the verifier shared a tool, and the tool did not disagree with itself. **A commit's own description is a claim surface, and the tool that writes it is not the tool that checks it.**

Two grill questions, the second load-bearing:

1. **Can the status surface be derived instead of written?** A gate that runs the battery, collects non-zero exits, and emits the red set as the _only_ admissible source for a report's status column. Sub-questions: **Scope** — CI-leg and wave-time status are different surfaces (`check-post-land` is deliberately not a CI leg, ADR-0092 D-S1); covering both, or leaving the wave-time half as prose and recreating B-1 in a narrower room? **Predicate** — exit code alone is insufficient: `check-map-freshness --worktree` and its default form judge _different trees_ and disagree by design; does the inventory record `(command, exit, judged-surface)`? **Pre-landing reds** — B-1's red was legitimate (the tip tree lacked an artifact the workspace had); the inventory must express "red, expected-until-landing, reason" without that becoming a free-text hatch. What is the _mechanical_ test for a legitimate expectation?
2. **When a claim and a mechanism disagree, which is authoritative — and can the answer be derived rather than adjudicated?** The v1/v2/v3 sequence shows a comment rewritten twice against a mechanism that was fine, while the coverage stayed genuinely lost; the audit could only resolve it by hand-reading `declaredTreeAt` and the fixture's `mapJson()`. **That hand-check is what to mechanise.** Candidates to grill, none obviously right: a gate failing when a comment names an absent symbol (would have caught v1 and v2 mechanically); a gate failing when a comment cites an ADR section that does not define the concept (v2's `D-6 declared-tree coverage`); a rule that `[ANCHORING]` footers and commit-message claims are verified by a mechanism independent of the writer; or a convention that any claim/mechanism divergence is _registered as a limitation_ rather than edited away — ADR-0093's Known Limitations discipline being the precedent, where a declared limitation is a _registered_ narrowing, owner-ratified.

**Sizing, stated as an owner call.** The narrow version — "gate on a comment citing an absent symbol" — is small, has a clean precedent, and would have caught 2 of 3 M-11 versions. But it catches the _symptom_ (a dangling reference), not the failure that produced it (repairing prose instead of the mechanism, twice, while coverage stayed lost). M-13 is the residual proof that even a correct-looking fix leaves a twin behind unless something enumerates the sites. **Two further candidates loop 5 surfaced, both cheap and both unclaimed:** (a) _commit-message claims are a claim surface_ — the `[ANCHORING]` footer contract already exists and is derived by a tool, so extending it to the body is incremental rather than new machinery; (b) _`but commit` without an explicit id list should be refused by tooling_, since the prohibition currently lives only in prose and this window still managed to issue one.

## Key Artifacts (Reference by Path — do not duplicate)

- Audit report (loops 1-5; §10 is loop 5): `D:\Aworker\jiahao\.scratch\grill-t36\reports\2026-10-03-audit-report.md`
- Round report (implementer's, UNTRACKED): `D:\Aworker\jiahao\.scratch\grill-t36\reports\2026-10-02-report.md`
- Prior audit, same failure shape: `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-audit-report.md`
- Spec (sole implementation spec): `D:\Aworker\jiahao\.scratch\grill-t36\spec-t36-observer.md`
- Decision ledger D-001..D-009: `D:\Aworker\jiahao\.scratch\grill-t36\decision-ledger.md`
- Task book T-0..T-10: `D:\Aworker\jiahao\.scratch\grill-t36\handoffs\next-round.md`
- Round object: `D:\Aworker\jiahao\.scratch\grill-t36\GOAL.md`
- Contract: `D:\Aworker\jiahao\docs\adr\0093-observer-equivalence-contract.md`
- Amendment awaiting sign-off: `D:\Aworker\jiahao\docs\adr\0094-tarball-cap-trend-anchor-amendment-grill-t36-observer-surface.md`
- Binding working agreement: `D:\Aworker\jiahao\AGENTS.md`
- Implementer's handoff (outside the repo): `C:\Users\ADMINI~1\AppData\Local\Temp\grill-handoffs\grill-t36-handoff-2026-10-03.md`

## Suggested Skills for Next Agent

- **`$implement`** — for T-10 closeout, driven by tdd where it touches the sentinel fixtures.
- **`$but`** — the loop-5 record shows three distinct tool traps: the bare-`but commit` prohibition is prose-only (this window still issued one), `but amend` has no `-m` (use `but reword <sha> -m "$(cat file)"`), and `but move --above` **loses uncommitted work** (it regressed `tracked-surface.js`; caught by re-reading immediately, undone with `but undo`). Write commit messages to a temp file and pass `"$(cat …)"` so newlines and footers survive.
- **`$grill-me`** / **`$grill-with-docs`** — for the t37 direction above, before any ADR is drafted. The three sub-questions are the grill; do not skip to a mechanism.
- **`$ask-matt`** — if the t37 direction is unclear after reading this handoff.
- **`research`** — only if the ADR-0094 sign-off criteria need external grounding.

## Version Control Protocol

- Lanes: `grill-t36-docs` (6) + `grill-t36-impl` (7) + `grill-t36-fixes` (3, stacked on impl); base `0f58ba60`; workspace `gitbutler/workspace`. **All three pushed to `origin` as branches. `origin/main` untouched at `0f58ba60`.**
- Rework commits belong on the existing lanes. **Do not amend the audited commits** — they are the audit object, and the round's own red mid-round commit was correctly disclosed rather than rewritten.
- `but commit` runs with an **explicit path/hunk-id allowlist** — every id named. A bare `but commit` is forbidden for round work (ADR-0083 D-C). The loop-5 attempt was refused by the tool but is on the record (§10d).
- After every commit, `git show --name-only <sha>` and verify the landed set equals the intended set. Derive the `[ANCHORING]` footer with `node scripts/derive-anchoring-footer.js --ids <id> ...`; never hand-type it, and **verify it survived** with `git log -1 --format=%B <sha> | grep -c ANCHORING`.
- Committed documentation artifacts are authored via `fs.writeFileSync` or file-edit tools only — never through escape-interpreting shell layers (grill-t18 D-006).

## Contact

- Audit window: independent for loops 1-4 (no implementation authority). **Loop 5 implemented under owner authorisation; the independence break is disclosed in §10a of the audit report.**
- Verdict across loops: **1-4 FAIL — return for rework; 4 CONDITIONAL PASS on the implementable residue; 5 implementable residue closed and re-verified, three owner acts open.** The verdict is the auditor's; the owner's acceptance or rejection is a separate act, and this handoff does not presume it.
