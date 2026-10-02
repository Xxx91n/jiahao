# grill-t35 → next-session handoff (audit loop closed, lane not yet landed)

- Date: 2026-10-01
- Written by: the audit window (rounds 1–4). It has not modified implementation code and has not landed, pushed, or reordered anything.
- Round status: **second-party audit PASSED in round 4.** The lane is landable. It has not been landed.
- Why this file is named `…-loop-close-handoff.md` and not `…-audit-handoff.md`: `check-audit-surface.js` selects in-scope artifacts by `/^\d{4}-\d{2}-\d{2}-(audit|report)/`, so an audit-named handoff becomes the newest in-scope artifact and is then required to carry a coverage attestation. Naming around that defect is itself evidence for owner-action (c) below.

## Read first, in this order

1. `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-audit-report-r4.md` — the pass verdict, the battery, and the four follow-ups. Everything the other three rounds found is closed or dispositioned here.
2. `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-report.md` — the round report, including §"The shared shape across all three", which is the most transferable output of the whole loop.
3. `D:\Aworker\jiahao\.scratch\grill-t35\handoffs\2026-10-01-impl-handoff.md` — §Reproduce before trusting, §Open owner-actions. The implementer's own handoff, now internally consistent.
4. Rounds 1–3 for history only, not for open items: `…\2026-10-01-audit-report.md`, `…\r2.md`, `…\r3.md`.

Do not re-litigate closed findings. If you need the audit trail, `D:\Aworker\jiahao\.scratch\grill-t35\audit-evidence\` holds 61 raw captures + 0 fixtures across the four rounds, referenced by path and count from the reports.

## The one action that completes this round

The round's acceptance evidence does not exist yet, because it can only exist after landing. `post_land` is red today for the honest reason — the public tip `78d8a14c` still carries R-A's control bytes, lacks the pairing baseline, and predates the map regen.

Land `grill-t35-impl`, push, then re-run `node scripts/check-post-land.js --no-fetch` and watch `post_land` follow `pre_land` to green. That transition is the round's proof, and it is also the first real execution of the post-land ritual this round wrote — so if anything about the contract is still wrong in practice rather than in tests, it will surface there and not in a fixture. After the landing mutation, re-run `--check` against the settled tree before declaring anything (E-19); the interval between a workspace rewrite and evaluation is the exposure window.

## Owner actions — four, none mintable by an agent

| | action | figure / deadline | status |
|---|---|---|---|
| a | Pack-cap amendment ADR | derived cap **530,000**, stable across six measurements (474,291 → 476,450). The byte count is a measurement at a revision; the cap is the decision input. | unminted, correctly |
| b | Corpus tarball refresh | `mr-probes.jsonl` against the versioned manifest; deadline **2026-12-15** cadence. Until then public CI green is not claimable. | unminted; root verified from CI run 36743467940 |
| c | Examiner/implementer classifier conflation | `check-audit-surface.js` and `check-post-land-sentinel.js` cannot tell examiner prose from implementer prose by filename. Needs an ADR, not a patch. | open by design |
| d | spec §9 "四处显式声明" reading | The ADR declares four subjects and numbers three, and says so plainly. Ruling needed: four labels, or four declared subjects? | open; my reading is substance-satisfied, letter-divergent |

## Follow-ups from the pass — all closed in the post-pass wave

The owner authorised the audit window to make these fixes directly, then re-run the identical battery. All three are done; what follows is where they landed, not what remains.

1. **f-1 closed** — ADR-0092 D-M1 now declares the scanner's two blind spots (caller-chosen scope, which left `scripts/**` unswept at the M-7 measurement; and the signature set, which contains no branch for a mid-file U+FEFF) and states the limit on what may be claimed until a successor ADR closes them: the known instances are repaired, never that byte corruption is closed.
2. **f-2 closed** — `test/post-land-sentinel.test.js` now counts every `Declaration N of M` label in ADR-0092 and asserts the stated total equals the actual label count and the ordinals are exactly 1..M. The ADR's self-check is no longer prose beside the thing it describes.
3. **f-3 closed by removal, not refresh** — the fix for a stale measurement is not a fresher measurement. This handoff and the round report's prose table now carry commands plus stable qualifications (exit codes, which test is the one red) and keep exactly one number: the derived cap 530,000, which does not move across the whole measurement range. The round report's prose table was also re-pointed at the settled tree — it had described `ff4964f3` for four waves while the machine block beneath it described something else, which is the p-1/R2-1 class this round named and then lived inside.

## One more thing t36 should inherit

The regeneration made a residual visible: **a post-land-verify block can never describe the rewrite-map that covers the block.** The block reports the worktree map's row count; pasting the block edits the claim file, which changes the citation set, which requires regenerating the map, which changes the row count the block just recorded. E-17's "map LAST" ordering resolves it operationally — the map is always the freshest artifact and `--check` proves sync — but the block's own `map row(s)` field is permanently one regen behind its containing tree. That is not a defect to fix so much as a self-reference to name, in the same family as "a commit cannot contain its own sha". Worth a sentence in the successor ADR so nobody "fixes" it by pinning a number that must drift.

## Next grill direction — t36

The through-line of four rounds is not "the code was wrong". It is that **a verification instrument whose own surface is unasserted will eventually certify a falsehood, and it will do so most reliably while it is busy fixing something.** Every blocker in this loop was that: pre_land asserting the lane while claiming the public tip; a sentinel reading its boundary from the artifact it was auditing; a "class closed" claim backed by one sample; a byte-corruption repair wave that shipped new byte corruption through its own write path.

t36 object, stated as a contract shape: **the observer is part of the observed — assert it.**

Three concrete members, in the order I would take them:

1. **Byte-surface equivalence.** Close the two declared blind spots as their own ADR round: decide whether the corruption battery covers the tracked byte surface (all text, including `scripts/**` and `src/**`) or only `.scratch/*.md`, and whether U+FEFF and its siblings join the signature set. This is the unfinished half of t35's object: t35 fixed *which tree* is asserted; this fixes *which bytes* are asserted. M-7 is the existence proof that the hole bites, and it bit the repair tooling.
2. **Instrument non-intrusion.** `check-g6-publish.js` rewrites a tracked artifact on every run, so `gate:all` cannot run without dirtying the tree it is meant to be judging — reproduced four times in four waves, and it is how an undeclared R2 file entered a claim commit (round-2 R2-3). E-19's "evaluate the settled tree" rule is not satisfiable while the measurement mutates the tree. Options include writing to an ignored path and asserting the committed value as a separate check, or making the leg compare rather than rewrite.
3. **Role-separated claim surfaces.** Owner-action (c) — the classifier cannot distinguish examiner from implementer, and it now reaches into document naming. Fold in the coverage-attestation question: leg 229 has been green largely because examiner files are what it selects.

Also worth carrying, cheaper than any of the above: promote the class-vs-sample rule from this round's report into `AGENTS.md` as a standing evidence clause, next to the existing split-form and bare-SHA clauses. It is the single most reusable thing this loop produced, it currently lives in a round artifact that the next round has no obligation to read, and it is the rule that would have prevented three of the four rounds' blockers.

## Reproduce before trusting

Commands and their **qualifications**, not measurements. Every byte count written in this loop went stale inside the commit that recorded it (M-2, R2-5, M-8, and this handoff's own first draft), so no measurement is restated here. Exit codes are stable properties of the contract rather than measurements, so those are given.

```sh
git rev-parse --short HEAD                   # lane tip; HEAD itself is the GitButler workspace commit
node scripts/run-test-gate.js                # exit 1; the ONE red is test/adr-0038-wiring.test.js D1, the pack cap
node scripts/check-post-land.js --pre-only --no-fetch          # exit 0 - all four subset checks green
node scripts/check-post-land.js --post-only --no-fetch         # exit 1 - origin/main still carries R-A/R-B/R-C
node scripts/check-post-land-sentinel.js     # exit 1, and that is the whole point: post_land only, ZERO staleness or timing errors
node scripts/check-map-freshness.js --tip HEAD                 # exit 0 - tip-map authority, 0 uncovered citations
node scripts/check-map-freshness.js --tip 78d8a14c             # exit 1 - the tip genuinely lacks the mirror rows; correct until landing
node scripts/build-rewrite-map.js --check                      # exit 0
node scripts/build-rewrite-map.js --published-only --check     # exit 0
node scripts/build-readme-pairing-baseline.js --check          # exit 0 - 12 registered, ratchet holds
node scripts/check-governance-inventory.js                     # exit 0
node scripts/check-governance-inventory.js --coverage-base 78d8a14c   # exit 0 - the round-2 failure class
node scripts/check-anchoring-footer.js                         # exit 0 - each footer equals git show --name-only
node scripts/check-test-git-hermetic.js                        # exit 0
node scripts/check-audit-surface.js                            # exit 0, but see owner-action (c): it selects an EXAMINER artifact
npm pack --dry-run --json                                      # over the registered cap; see owner-action (a)
node -e "console.log(require('./scripts/check-pack-smoke').packCapBytes())"   # 470000 - registered, not measured
```

The one figure that does not move, and therefore the only one worth writing down: the **derived cap is 530,000** at every measurement taken in this loop, because `ceil_to_10_000(M x 1.10)` lands on 530,000 for every M from 474,291 through the current tree. That is the decision input for owner-action (a); the byte count is not.

Class-level byte check, because that is the M-7 lesson: enumerate every non-binary tracked file and count `EF BB BF` occurrences, leading and mid-file. This window measured **0 across 1,571 files** — re-run it rather than trusting that line, since the round that wrote the byte-corruption contract is the round that shipped new byte corruption through its own write path.

## Standing reminders for the next window

- Four red lines held for four rounds: no history rewrite; no silent tool-contract change (the ADR is the channel); no self-declared public green; the sentinel subordinates to the second-party audit channel (defer-0030) and never replaces it.
- Human-only adjudication stayed human: cap amendment, corpus refresh, errata, waivers, tide dispositions, and the spec §9 reading were all reported, not decided, by the agent. That posture is why this loop converged instead of escalating.
- `bench/research/out/g6-publish-replay.json` was left modified in the working tree by this window's `gate:all` run and is not `.scratch`. Do not `but discard` it blind — the same reasoning that kept four audit windows from touching it applies to anyone inheriting a dirty tree here.
- Evidence counts stay in split form (this window: 16 captures + 0 fixtures; loop total 61 + 0). Pack figures are measurements with a revision label, never constants.

## Suggested skills

- `but` — landing and pushing this lane, with the explicit change-ID allowlist and the `git show --name-only` landed-set check that this round passed 134 commits of.
- `code-review` — for t36's three members; the two-axis split is what made rounds 1–4 legible, and Standards caught the duplicated scanner that Spec did not.
- `domain-modeling` — CONTEXT.md already carries the four t35 terms; t36 adds byte-surface and instrument-intrusion language, and the class-vs-sample clause belongs in the glossary before it belongs in a rule.
- `grilling` — before writing t36's spec. Each of its three members has a real shape choice that is cheaper to argue now than to re-audit later.
- `neat-freak` — before closeout, and specifically for the residue question: `.scratch/grill-t13`–`t23` carry hundreds of uncommitted `audit-evidence` files from earlier windows; that pool is now background noise in every `but status` and deserves a decision.
- `research` / `atomcode-research` — only if the byte-surface scope question needs external practice (lint baselines, corpus-scoped scanners). t35's research pass paid for itself; do not spend it on a question the repo can answer by measurement.
