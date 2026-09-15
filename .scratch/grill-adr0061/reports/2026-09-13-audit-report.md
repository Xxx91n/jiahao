# ADR-0061 Implementation Round - Audit Report (2026-09-13)

Auditor: second-party audit agent (independent of the repair window).
Scope: branch `adr0061-impl` (HEAD `01c113899f397202162ae4b96ad07ee64ed6fce8`) vs fixed point `adr0061-doc` (`031a3a747c9b05463c87bc0587d331baf2de3e53`, = merge-base). 6 commits.
Authority: `.scratch/grill-adr0061/decision-ledger.md` (D-001..D-006) + `.scratch/grill-adr0061/handoffs/next-round.md` (Standing Task Book T-1..T-6).
Self-report under audit: `.scratch/grill-adr0061/reports/2026-09-13-report.md`.

**Method.** The report's self-description was treated as a claim, never as evidence. Every hard-acceptance command was re-run by the auditor; every key claim was re-derived from repository artifacts (file existence, source read, hash recomputation, gate-registry inspection). Two-axis review (Standards + Spec) was run via two independent sub-agents.

---

## 1. Hard acceptance re-run (auditor-executed)

| # | command | report claim | auditor measurement | verdict |
| --- | --- | --- | --- | --- |
| A1 | `npx jest --runInBand` | 54 suites / 720 tests green | 54 suites / 720 tests, exit 0 (35.8s) | PASS |
| A2 | `node scripts/run-test-gate.js --expected-suites 54` | exit 0 | exit 0, `OK: 54 suites, 720 tests, 0 skipped` | PASS |
| A3 | `node scripts/run-gates.js` | exit 0, 22 entries, 4 unverifiable | exit 0, 22 entries, 4 unverifiable (ci-mode absence) | PASS |
| A4 | `npm pack --dry-run --json` | 211,617 B / 93 files < 230,000 B | 211,617 B / 93 files < 230,000 B | PASS |
| A5 | `node scripts/instrument.js --check` | OK; chain valid through seq 10; conditional, expires 2026-12-11 | OK; `rules f6c6c843c4ad4151`; `state authoritative`; conditional / 2026-12-11 / CAPA-0060-judge-flip-rate | PASS |
| A6 | `node scripts/check-deferred.js` | OK, 32 entries | OK, 32 entries | PASS |
| A7 | `node scripts/build-adr-index.js --check` | in sync (63) | `README ADR index in sync with docs/adr` | PASS |
| A8 | `node scripts/build-governance-anchors.js --check` | (not in report top-level state) | exit 0, `OK - 4 artifacts, digests in sync` | PASS (extra) |
| A9 | working tree | clean except 1 untracked reverify artifact | `?? bench/polygraph/results/reverify-20260913.json` only | PASS |

**Pack smoke detail (A4).** The gate itself asserts the cap: `pack-smoke` reports `budget 211617 < 230000 bytes (ADR-0039 D3)` and, separately, the packaged-surface contract `excludes jiahao-mcp/ + test/ + docs/adr; includes src/SKILL.md + scripts/install.js + docs/gates.json + CONTEXT.md`. Both halves reproduce.

---

## 2. Declaration -> Evidence -> Conclusion (per report claim)

| # | Report claim | Repo evidence (auditor-derived) | Conclusion |
| --- | --- | --- | --- |
| C-1 | T-1: `bench-corpus` probe requires existing AND non-empty dir; absent/empty -> exit 2 UNVERIFIABLE | `src/shared/capability.js:52-55` `corpusTierPresent()` returns false when `readdirSync(dir).length===0`; wired at `:76-78`; comment cites ADR-0061 D-F amending ADR-0040 D1 | **CONFIRMED** |
| C-2 | T-1: ADR-0040 D1 amended same-commit | ADR-0040 D1 text amended inside `843fed7` (same commit as the code change) | **CONFIRMED** |
| C-3 | T-1: `gate:all` now asserts the cap via single-sourced `packCapBytes()` | `scripts/check-pack-smoke.js:40` defines, `:104` exports, consumed by `test/adr-0038-wiring.test.js:12,52`; `pack-smoke` is gate #196 in `docs/gates.json`; no duplicate cap constant remains | **CONFIRMED** |
| C-4 | T-2: ADR-0062 ships; policy section before value section | `docs/adr/0062-...md`: D-A (policy) precedes D-C (value) | **CONFIRMED** |
| C-5 | T-2: cap derived `ceil_to_10_000(M_latest x 1.10)` = 230,000 from trend `205,741->206,288->206,501->207,768->208,655` | ADR-0062:55-59 records the 5-row table; `:65-66` states the rule; arithmetic verified: ceil_to_10_000(208,655 x 1.10) = ceil_to_10_000(229,520.5) = 230,000 | **ARITHMETIC CONFIRMED; SCOPE FLAGGED (S-1)** |
| C-6 | T-2: explicit non-retro-application, citing withdrawn 5567bd8 | ADR-0062 D-D `:74-79` present; `restatement_of: 5567bd8` recorded on seq 6 | **CONFIRMED** |
| C-7 | T-2: ADR-0039 D3 one-shot M anchor -> periodic trend anchor | ADR-0039 `:14-17` now carries both the historic 200,000 and the amended 230,000 under a periodic trend anchor; `:93-94` records the amendment | **CONFIRMED** |
| C-8 | T-2: D-E countersigned by `Xxx91n` via ADR-0047; seq 6 `criteria_change`, `restatement_of 5567bd8`, event_hash `17de5b7c...0355` | seq 6 present: `kind=criteria_change`, `second_reviewer=Xxx91n`, `restatement_of=5567bd8`, full hash `17de5b7c8b765216c40f35b429e368f181073ba8ae212f760640a51847060355` | **CONFIRMED (but see S-4: independence nominal)** |
| C-9 | T-3: `judgeSurfaceText()` slices `## Verifier Profile` -> EOF; missing heading THROWS | `src/instrument-identity.js:67` heading const, `:69` fn, `:87` used instead of whole-file; fail-closed throw verified by `test/adr-0061-wiring.test.js` / `test/adr-0063-wiring.test.js` | **CONFIRMED** |
| C-10 | T-3: `rules_digest` -> `f6c6c843...c6154` pinned | `src/instrument-identity.json` `rules_digest = f6c6c843c4ad4151f709345d86079f4a5e0c7d216305155f75e7329638bc6154`; `instrument --check` reads `rules f6c6c843c4ad4151` | **CONFIRMED** |
| C-11 | T-3: P-A1 dance - quarantine seq 9, reverify ledger seq 5, conditional sign-off seq 10, `Xxx91n != Euiop1` | seq 9 `quarantine`; `bench/polygraph/reverify-ledger.json` seq 5 `conformity=indeterminate, n=26, hash=60127eb658d4bfc1e2fab0408507d804c8d52fde65258271cfac22a542263e01`, identity carries `f6c6c843...`; seq 10 `conditional_signoff`, `second_reviewer=Xxx91n != reviewer Euiop1` | **CONFIRMED** |
| C-12 | T-3: plain `--signoff` REFUSED (exit 1), no mutation | guard at `src/instrument-identity.js:288-302` requires quarantined state + pass tail; report's honest deviation statement reproduces the gate's intent | **CONFIRMED (deviation honestly reported)** |
| C-13 | T-4: seq 7 `record_only_change` tags model_checkpoint/model_identity out-of-service, path P-A1, deadline 2026-12-11 | seq 7 present (`record_only_change`), pairs with seq 8 `record_signoff` (`record_seq: 7`); defer-0035 in `docs/deferred-registry.json` | **CONFIRMED (see S-5: not code-enforced)** |
| C-14 | T-4: seq 8 countersigned by reviewer != author Euiop1 | seq 8 `record_signoff`, `second_reviewer=Xxx91n` | **CONFIRMED (data-level; see S-5)** |
| C-15 | T-4: append-only, no rewrite; no new state-machine kinds; hash chain verified | history grows 1->10 with intact `prev_hash` links; `instrument --check` OK; kinds used (`record_only_change`/`record_signoff`/`quarantine`/`conditional_signoff`) pre-exist | **CONFIRMED** |
| C-16 | T-5: `docs/governance/` git-tracked OUTSIDE the tarball whitelist; 4 artifacts | `git ls-files docs/governance` returns 5 files (4 artifacts + `anchors.json`); `package.json` `files` whitelist does NOT include `docs/governance` | **CONFIRMED** |
| C-17 | T-5: tarball-absence assertion | `test/adr-0061-governance-anchors.test.js:41` and `test/adr-0038-wiring.test.js:39` both assert no `docs/governance` path in the packed surface | **CONFIRMED** |
| C-18 | T-5: `anchors.json` + regen-and-diff `--check`, write and `--check` share one path | `scripts/build-governance-anchors.js --check` exit 0, 4 artifacts in sync | **CONFIRMED (but gate-scoping gap: S-2)** |
| C-19 | T-5: ADR-0059 ledger pointer line amended (C-1); defer-0024 minimal unlock (C-2) | pointer amendment present; defer-0024 unlock recorded in its check-in | **CONFIRMED (but C-2 bar: S-3)** |
| C-20 | T-5 / D-003..D-006: defer-0035/0037/0038 registered in the tide | `docs/deferred-registry.json` now 32 entries; `adr-0033` inventory assertion extended to `defer-0038`; `check-deferred` OK | **CONFIRMED** |
| C-21 | Cross-cutting negative requirement: **no assertion deleted or weakened** | Diff review of every touched test: all edits are **re-anchors** (`200,000` -> `230,000`; id/status arrays extended `+2`); superseded literals retained (`expect(adr).toContain('200,000')`). No `expect` removed, no bound loosened, no `skip` added. | **CONFIRMED - the prior audit's V-class weakening did NOT recur** |
| C-22 | Report's own "Honest notes"/"Findings" (authorization not persisted; `seq=` logs first `record_only_change`; bias-probe under gitignored `.scratch/`) | All three independently reproduced by reading source/`.gitignore` - see Section 4 | **CONFIRMED (honest self-report)** |

---

## 3. Two-axis review (Standards | Spec) - findings, auditor-verified

Both axes ran as independent sub-agents over `git diff adr0061-doc...adr0061-impl`. Findings below are **only those the auditor re-verified against artifacts**.

### Standards axis

| ID | Severity | Finding | Auditor verification |
| --- | --- | --- | --- |
| STD-1 | **High** | `src/instrument-state.json` seq 10 physically lacks `expires_at` / `capa_ref`, contradicting ADR-0063 D-D which asserts them as recorded | **VERIFIED.** `stateEvent()` (allowlist `src/instrument-identity.js:140-181`) has **no branch** for `expires_at`/`capa_ref`, so the values passed at `:322-323` are silently dropped. Confirmed: `('expires_at' in seq10)===false`, `('capa_ref' in seq10)===false`. The top-level `conditional_expires_at`/`conditional_capa_ref` still carry them, so the expiry guard (`:544`) works - **but the hash-anchored event no longer evidences its own expiry/CAPA** |
| STD-2 | **High** | `CONTEXT.md:1170` still reads `measured-anchor budget 200,000 bytes per ADR-0039` while this branch amended the cap to 230,000 | **VERIFIED.** `CONTEXT.md:1170` unchanged; ADR-0039 `:14-17` now reads 230,000. This is the documented "update CONTEXT.md inline" rule (domain.md) and the exact V-4 stale-claim class the previous audit raised |
| STD-3 | **Medium** | seq-10 `authorization` is a standing delegation of signing authority (`以后所有全部人工同意，你作为主Agent代替人类签名Xxx91n`), `principal_id == instrument_id == Euiop1` | **VERIFIED verbatim from the event.** The P-A1 guard is satisfied nominally while the record cannot distinguish a human signer from a self-signed agent. This is the *tension* P-A1 was built to close, now re-instantiated by the authorization content itself |
| STD-4 | **Low (judgement)** | Primitive Obsession: three parallel scalar copies (`principal_id`/`instrument_id`/`authorization`) for one "who authorised whom, on what authority" record | VERIFIED as style observation; repo overrides (no documented standard violated) |
| STD-5 | **Low (judgement)** | Mild Shotgun Surgery / Divergent Change: `docs/adr/0039` edited in 4/6 commits; `src/instrument-state.json` touched by 3 commits for 3 concerns | VERIFIED; inherent to a multi-task governance round |
| STD-6 | Not a finding | `packCapBytes()` is genuine single-sourcing (repo overrides the Middle-Man smell) | VERIFIED: one definition, one export, two consumers; no duplicate constant |

### Spec axis

| ID | Severity | Finding | Auditor verification |
| --- | --- | --- | --- |
| SPEC-1 | **Medium** | D-001 pinned the derivation to a **3-point** trend (`205,741->206,288->206,501`); ADR-0062 substitutes a **5-row** table including `207,768` and `208,655`, whose 5th row is sourced only to a commit message | **VERIFIED.** Ledger D-001(2) says 3 points; ADR-0062 D-C `:51-59` has 5 rows. Mitigating: `ceil_to_10_000(207,768 x 1.10) = ceil(228,544.8) = 230,000` **equals** the value from `208,655`, so the extra row does not drive the outcome - it is unsourced scope, not a wrong number |
| SPEC-2 | **Medium** | T-5 "machine-generated digest links with a regen-and-diff check" is **jest-scoped, not gate-scoped**: `build-governance-anchors.js --check` appears in no `docs/gates.json` entry and no `package.json` script | **VERIFIED.** 22 gate names enumerated; none invokes governance-anchors. The check runs only inside `test/adr-0061-governance-anchors.test.js`. Since a fresh clone runs gates via `gate:all`, anchoring is enforced in the test lane but not the gate lane |
| SPEC-3 | **Medium** | D-005 C-2 (defer-0024 minimal unlock) leans on "git-tracked commit" as the witness, while D-005's explicit negative forbids treating git as a tamper-proof ledger | **VERIFIED** as recorded in the check-in; the cross-domain witness remains deferred (not re-opened) |
| SPEC-4 | **Low** | `.github/workflows/ci.yml` suite count `52 -> 54` and README `704 -> 720` bundle T-1's growth into the T-3 commit window | VERIFIED; required by ADR-0057 D-C, ordering only |
| SPEC-5 | **Low** | `ERRATA.md` E-4 documents the pre-existing `--authorization` drop (out of T-1..T-5 scope, self-declared) | VERIFIED; correctly disclosed rather than silently folded in |
| SPEC-6 | Not a finding | No assertion deleted or weakened (C-21); `defer-0035/0037/0038` present | VERIFIED |

**Axis summary.** Standards: 6 findings, worst = STD-1 (event omits its own expiry/CAPA while the ADR asserts it). Spec: 6 findings, worst = SPEC-1 (unsourced 5th trend row / ledger-vs-ADR trend-width divergence). No finding invalidates a hard-acceptance result.

---

## 4. Process violations (reported separately; NOT retroactively endorsed)

These are the report's own admissions, independently reproduced by the auditor. They are **acknowledged, not excused**:

1. **`--authorization` validated then dropped (P-1).** `parseSignoffArgs` demands `--authorization` (min 10 chars) for every signoff path, but only `signoff` / `conditional_signoff` / `record_signoff` persist it. `criteria_change` (`scripts/instrument.js:395-404`) and `record_only_change` (`:430`) consume the flag and **omit it from the payload** - the verbatim human authorisation for the D-001 criteria change (seq 6) is therefore absent from the hash-chained record. Confirmed by reading the two transition blocks.
2. **`record()` mis-reports its own seq (P-2).** `scripts/instrument.js:448-449` finds the **first** `record_only_change` in history and logs its seq, not the one just written - cosmetic, but misleading in an audit trail.
3. **Signoff anchors point at untracked storage (P-3).** The bias-probe artifact lives under `.scratch/` (gitignored: `.gitignore` line `.scratch`), yet seq 10 anchors `bias_probe_hash 99a20aae...9904`. A hash in the permanent record therefore references storage no clone can reproduce - an open tension with ADR-0061 D-E (self-declared).
4. **Task-book deviation, handled correctly (P-4).** The book prescribed a plain `--signoff` for T-3; the ADR-0060 D-E guard refuses it under an `indeterminate` tail, so `--conditional-signoff` was used. The report **disclosed this in writing** rather than smoothing it. Auditor verdict: acceptable - the alternative was an unreachable requirement; the resulting state matches the pre-change conditional certification.

---

## 5. Verdict

**The round's hard acceptance REPRODUCES CLEANLY.** All 9 auditor-executed checks (Section 1) pass. Every T-1..T-5 deliverable is physically present (Section 2, C-1..C-22). The single most important negative requirement - *no assertion deleted or weakened* - holds: unlike the previous round (which contained the 5567bd8-class violation), this diff contains only re-anchors (C-21).

The report is **substantially truthful**: its numeric claims, hash claims, and its own "Honest notes" all verify. It is not a smoothed narrative.

However, the round is **NOT clean-pass**. Four findings require remediation before the governance record can be called sound, all at document/record level (none breaks the build or the gate ladder):

- **STD-1 / P-1 (High):** the hash-chained record for seq 6 and seq 10 does not actually contain the evidence the ADRs say it contains (seq 6: authorisation; seq 10: `expires_at`/`capa_ref`).
- **STD-2 (High):** `CONTEXT.md:1170` carries a stale live cap - the recurrence of a class the previous audit already flagged.
- **SPEC-2 (Medium):** `anchors.json` regen-and-diff is not wired into `gate:all`.
- **SPEC-1 (Medium):** the trend-row provenance vs the ledger's 3-point derivation is unreconciled in the ADR text.

**Disposition: RETURN FOR REPAIR** (see Section 6). Do NOT merge, do NOT push, do NOT open a PR. The audit window does not fix; the repair window does.

---

## 6. Repair requirements + re-run checklist (for the repair window)

### Required fixes (in order)

**R-1 (closes STD-1/P-1) - persist what the ADRs claim.**
- Add `expires_at` / `capa_ref` branches to the `stateEvent()` allowlist so a `conditional_signoff` event carries its own expiry + CAPA (they are already passed at `:322-323`; the allowlist is the only blocker).
- Add the missing `authorization` propagation to the `criteria_change` and `record_only_change` transitions **or** - the cheaper, honest alternative - amend the ADRs to state that only signoff-class events persist the authorisation, and stop implying otherwise.
- Because this changes an event's hashed field set, the chain must be **re-emitted through the sanctioned path** (quarantine -> re-canonicalise -> signoff), never hand-edited. Any rewrite must be append-only-clean.
- Add a regression test: a `conditional_signoff` event in history **must** carry `expires_at`/`capa_ref`; a `criteria_change` event **must** carry `authorization` if the ADR claims it.

**R-2 (closes STD-2) - sync the glossary.** Update `CONTEXT.md:1170` to the 230,000-byte measured-anchor cap citing ADR-0039 (as amended by ADR-0062). Grep the tree for any other `200,000`-as-live-cap references introduced or left by this round.

**R-3 (closes SPEC-2) - wire the anchoring check into the gate lane.** Either register `build-governance-anchors.js --check` as a `docs/gates.json` entry, or add it to a `package.json` script that `gate:all` runs. The regen-and-diff must fail the gate on drift, not only the jest lane.

**R-4 (closes SPEC-1) - reconcile the trend table.** Either re-measure and back-fill the `208,655` row into an ADR-0039 budget-status note (per the repo's own "measure after ANY packed-file edit" rule), or annotate ADR-0062 D-C that rows 4-5 are post-`adr0061-doc` readings recorded during this round. State the trend width (3 vs 5) explicitly against D-001.

**R-5 (closes SPEC-3) - state the defer-0024 bar honestly.** In the defer-0024 check-in, record that the git-commit witness does **not** satisfy D-005's "no git-as-tamper-proof-ledger" negative, and keep the external witness open with a deadline.

**Optional (judgement, non-blocking):** P-2 (`seq=` log picks the first `record_only_change`) - fix the lookup to read the tail it just wrote; P-3 (bias-probe under `.scratch/`) - already open as a deferred tension, no new action required this round.

### Re-run checklist (mandatory after repair - the SAME Section-1 suite)

```
npx jest --runInBand
node scripts/run-test-gate.js --expected-suites 54
node scripts/run-gates.js
npm pack --dry-run --json
node scripts/instrument.js --check
node scripts/check-deferred.js
node scripts/build-adr-index.js --check
node scripts/build-governance-anchors.js --check
```
Plus the two new regression tests from R-1, and a `git status --short` cleanliness check (the only permitted untracked file remains `bench/polygraph/results/reverify-20260913.json`, regenerable byte-for-byte).

**Who fixes:** the repair window (preferred - it holds the context), or the human, after explicit approval. Per the separation-of-duties rule, the audit window does **not** touch the code. Whichever party fixes, the repair must be re-audited against Section 1 before the round can close.

---

## 7. Auditor's hard evidence appendix (commands actually run)

- `git rev-parse adr0061-doc adr0061-impl` + `git merge-base` -> fixed point pinned, diff non-empty.
- `git log --oneline adr0061-doc..adr0061-impl` -> 6 commits, each citing D-xxx.
- `git status --short` -> one untracked artifact only.
- `npx jest --runInBand` / `run-test-gate` / `run-gates` / `npm pack --dry-run --json` / `instrument --check` / `check-deferred` / `build-adr-index --check` / `build-governance-anchors --check` -> Section 1.
- Source reads: `src/shared/capability.js` (probe), `src/instrument-identity.js` (allowlist + transition), `scripts/instrument.js` (transition sites), `scripts/check-pack-smoke.js` (single-source), `package.json` (files whitelist), `docs/gates.json` (22 gate names).
- Hash recomputation: seq 6 `17de5b7c...0355`, seq 10 `09b9413e...315d3d`, reverify seq 5 `60127eb6...3e01` - all match the report.
- Two-axis review: Standards sub-agent + Spec sub-agent, both independently over the same diff; auditor re-verified every High/Medium finding above against artifacts.
