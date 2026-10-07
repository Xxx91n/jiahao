# grill-t32 loop-2 audit report — repair window — 2026-09-29

Audited object: lane `grill-t32-docs` repair window — 3 commits on top of the
14 already audited: wave-1 repair (spec gaps + hygiene + errata + annotate),
wave-2 adjudicated semantics (D-007/8/9), wave-3 closeout (report + handoff +
anchors + map regen). Merge-base: main.
Trigger: owner-ordered re-audit of the repair closeout claims.
Prior artifacts: `D:\Aworker\jiahao\.scratch\grill-t32\reports\2026-09-29-audit-report.md`
(loop-1 audit), `...\reports\2026-09-29-repair-report.md`,
`...\handoffs\2026-09-29-repair-closeout.md` (claim artifacts under audit).
Examiner captures (never-commit, nc-001):
`.scratch/grill-t32/audit-evidence/rerun/loop2-reaudit-2026-09-29.txt`.
Verdicts, seals, repair authorization: owner-side, as always.

## 1. Acceptance re-run (settled tree, post last but mutation)

| Leg | Claimed | Independently re-run | Result |
|---|---|---|---|
| `npx jest` | 89/89, 1570/1570 | **89/89 suites, 1570/1570 tests** (842.7s; orphan-cites battery = 20 cases incl. annotate, D-007, D-008, D-009 cases) | TRUE |
| `--check` | 3624 cites | OK: map in sync (3624 doc citations classified) | TRUE |
| `--published-only` | OK | PUBLISHED-ONLY OK: 3624 covered, ancestry verified vs origin/main | TRUE |
| `check-orphan-registration` | 466-entry registry | OK: no over-grace unregistered orphans; registry consistent | TRUE |
| `check-map-freshness` | 13 claim commits | OK: 13 claim-surface commits tree-internal | TRUE |
| `check-anchoring-footer` | 91 commits | OK: 91 post-registration commits verified | TRUE |
| `npm run pack:smoke` | 437949B | OK: 437949 < 470000B, 158 files | TRUE |
| `install.js --help` | liveness | exit 0, usage printed | TRUE |
| `run-gates.js` | exit 0, 43 legs, 4 UNVERIFIABLE | exit 0; same 4 ci-mode capability-negative legs (ci-wiring/bench-gate/probes/mr-probes); rewrite-map, rewrite-map-published, orphan-ancestry, test-git-hermetic, anchoring-footer, map-freshness, orphan-registration, governance-anchors, governance-inventory all PASS | TRUE |
| ANCHORING footers | — | `derive-anchoring-footer.js --commit` on the 3 new shas: 3/3 MATCH (lane total 17/17 verified) | TRUE |

## 2. Repair-item verification (F-1..F-13 from loop-1)

| Item | Required repair | Evidence found | Conclusion |
|---|---|---|---|
| F-1 AGENTS.md soft-constraint | working-agreement clause | AGENTS.md:107 — NEW-prose bare-SHA cites SHOULD carry subject/date context; editorial, no gate, never retro-edits | LANDED |
| F-2 errata back-pointers | ERRATA record + errata_ref on degraded population | E-22 authored (degraded-population documentary record); annotate verb; 188 copies + 1 backfill appended — but see **R2-F1** | LANDED with defect |
| F-3 stale non-goal | conditional replace-ref wording | generator-spec:130 — refs/replace/ OPTIONAL, --replace-ref only, all reads NO_REPLACE-isolated | LANDED |
| F-4 migration figures | standing correction | E-23: v1 committed-parent truth 1042/105/0-unresolved-class; "618" in no committed artifact; matches audit's independent measurement exactly | LANDED, accurate |
| F-5 stale commit list | disclosure | folded into E-23 | LANDED |
| F-6 dead import / facade overclaim | remove + honest header | forRoot import gone from build-rewrite-map.js; facade header states the real two-seam boundary | LANDED |
| F-7 scanDocTokensAt env/seam | NO_REPLACE + injected | routed via gitAt (NO_REPLACE env). Note: gitAt does NOT dispatch _execOverride — the seam for that path is root-parameterized fixtures. "injectable" is thin wording; env isolation landed | LANDED (wording caveat) |
| F-8 successor subject-only | adjudicated narrowing | D-009: author+subject fail-closed (author on name<email>, ts stripped), committer_ts/parents observational; spec SS3.3 + ADR-0089:129 synced; D-003(iv) marked revised-by-D-009 preserving original text; battery case at test/orphan-cites.test.js:321 | LANDED |
| F-9 unageable->stage-3 | adjudicated clock | D-007: stage-2 warning fires at first sight (`unageable:true`, build:395-398); stage-3 clock on qualifier exists_at carried forward via stabilizeExistsAt (build:691-700, 773); missing exists_at itself fail-closed red (leg:80-82); battery case at :487 | LANDED |
| F-10 committed qualifiers | same-run consistency | D-008: checkMapConsistency runs consistencyErrors on committed + regenerated (build:705-708, 783); tamper is gate-visible; battery case at :408 | LANDED |
| F-11 helper duplication | deferred observation | registered in repair report; not silently dropped | DISPOSED (deferred) |
| F-12 covers() signal loss | explicit signals | leg:56 returns 'ambiguous'; :68-69 emit distinct stage-3 errors for ambiguous match and lookup failure; fail-closed | LANDED |
| F-13 fixture ambient env | env threading | facade forRoot(root,{env}): o.env pins ambient env, NO_REPLACE composed over it (facade:35-43) | LANDED |

## 3. Loop-2 findings

**R2-F1 (substantive — annotate predicate hole).**
`cmdAnnotate` skips only `!e.object_purged_at && e.snapshot` (orphan-cites.js:405).
An entry that is LIVE but has `snapshot:null` — blobs/trees can never produce a
commit snapshot — passes the skip and receives an E-22 adjudicating copy.
Observed: `ab92813e41f7…` blob EXISTS in the store (`git cat-file -t` → blob);
its original entry is a live registration (no purge mark, snapshot null); its
E-22 copy asserts degraded-population membership it does not have. Counts
confirm: 188 annotate copies = 187 true degraded + this 1 live. E-22's own text
scopes itself to the purged population and states live entries "intentionally
carry no errata_ref" — the artifact now contradicts its own record for this sha.
Battery's "degraded only" assertion lacks a null-snapshot live fixture.
Registry remains append-only-valid; no gate red. Repair route (owner call):
superseding corrective append or E-24 erratum + predicate fix
(`if (!e.object_purged_at) continue`) + fixture case.

**R2-F2 (pending obligation — repair wave's own cited orphan).**
The repair report (x3) and closeout (x1) cite the pre-amend wave-1 sha
`b83c39cf`. It exists, is unreachable from display refs, unregistered →
class local-only, reachable_via=[] — stage-1 silent today, stage-3 red
~2026-10-20 (14d+7d) unless disposed. This is the E-18/E-19 recurrence class:
claim artifacts citing a superseded pre-rewrite sha. Convention route:
registration (note: --successor would fail closed — the amend reworded the
subject, so D-009 author+subject pairing does not hold between b83c39cf and
its landed replacement) or an errata-exempt pin — owner call.

**R2-F3 (minor — self-referential count drift, recurrence).**
The repair report's acceptance table prints "--check: 3618"; the settled
committed map holds 3624 rows (+6 = wave-3's own claim cites absorbed at the
final regen). The closeout prints the correct 3624. Same drift class as F-4:
a claim artifact embedded in the citation surface cannot print its own
settled count. Observation only; a convention clause ("at-capture" labels
or post-regen capture) is an owner decision.

**R2-F4 (observation — exists_at forgeability window).**
stabilizeExistsAt copies the first-seen stamp from the committed map.
Because qualifiers are equality-exempt and consistency does not bound
exists_at, a committed-map edit could reset or forge the stage-3 clock basis
and regen would carry it forward. Bounded by anchoring/claim-surface legs in
practice; a future leg could sanity-bound exists_at (<= registration time).
Registered as an observation, not a violation.

## 4. Process review (repair window)

- but amend of wave-1: disclosed, not silent — the fc14edf temp-path hex cite
  was caught post-commit by the new committed-map consistency check +
  map-freshness leg, repaired via degraded backfill (errata_ref E-22) folded
  back by amend, and disclosed in the repair report and commit message.
  The mechanism worked exactly as designed; the disclosure obligation was met.
- ANCHORING discipline: all 3 repair commits carry derived footers; verified.
- No push; no history rewrite beyond the disclosed amend; lane is +3 commits.
- Allowlist/git show discipline: footers match landed sets (17/17).
- One accounting nuance: the closeout lists "two repair commits" (wave-1/2);
  wave-3 (which carries the closeout itself) is the third — consistent, since
  an artifact cannot list itself pre-commit.

## 5. Conclusion (state, not verdict)

All repair-closeout acceptance claims re-verified TRUE on the settled tree.
R1–R6 routed findings: landed or correctly deferred. New findings for owner
adjudication: **R2-F1** (annotate predicate over-annotation of a live blob —
substantive, needs a repair route since append-only forbids un-appending),
**R2-F2** (b83c39cf pending orphan obligation — window-open, deadline-bound),
R2-F3/R2-F4 observations. Owner-side leftovers unchanged: ADR-0089 countersign
at the 2026-12-15 tide; F-11 refactor observation; t27/t28 asymmetry.
