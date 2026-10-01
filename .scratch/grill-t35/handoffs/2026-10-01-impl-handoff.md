# grill-t35 implementation round → next-session handoff (POST-AUDIT-REWORK)

- Date: 2026-10-01
- Lane: `grill-t35-impl`
- Status: **audited FAIL, reworked.** The D-004 audit returned 2 blocking +6 major;
  all were reproduced against the tree and fixed. See the rework section of the
  round report for the disposition table.
- Round object: **public-object equivalence** - the object a check verifies must
  BE the object the public receives
- Sole spec: `D:\Aworker\jiahao\.scratch\grill-t35\spec-t35-equivalence.md`
- Round report (full evidence): `D:\Aworker\jiahao\.scratch\grill-t35\reports\2026-10-01-report.md`
- Carrier: `D:\Aworker\jiahao\docs\adr\0092-public-object-equivalence-and-post-land-verification-contract.md`
- Ledger: `D:\Aworker\jiahao\.scratch\grill-t35\decision-ledger.md` (D-001..D-008, all current)
- Task book: `D:\Aworker\jiahao\.scratch\grill-t35\handoffs\next-round.md`

## What landed

| leg | mechanism | state |
|---|---|---|
| R-A | escape-eaten bytes repaired fix-forward + scanner widened | done, verified |
| R-B | pin demoted to display-form + zero-sha pairing scan with ratchet baseline | done, verified |
| R-C | tip-map coverage promoted to blocking authority; per-commit demoted to audit-time advisory | done, verified |
| D-004/D-007 | `scripts/check-post-land.js` + `scripts/check-post-land-sentinel.js`, two-segment block | done, verified |
| D-003 d2 | pairing enumeration surface on the advisory leg; ADR-declared | done |
| D-003 d3 | R-D corpus drift filed as owner-action in the round report, NOT the registry | done |
| D-003 d4 | defer-0079 partial absorption declared with explicit residual | done |
| D-008 | ADR-0092, order 230/231, shared lib, glossary terms, E-27, defer-0078 check-in | done |

## What the rework changed (audit-driven)

| id | was | now |
|---|---|---|
| B-1 | `post_land` judged the WORKSPACE (28 commits/3891 rows) while reporting itself as the landed tip | judges the NAMED tip tree (25 commits/3813 rows); both children take `--root` |
| B-2 | sentinel wave range was the whole round, so the block invalidated itself | bounded by the declared `pre_land.last_claim_mutation`; sha validated as claim-surface ancestor |
| M-1 | doc-hygiene copied, old copy still in `adr-0076-wiring` without the mid-line TAB branch | single shared definition; the R-A hole is closed in jest and CI |
| M-2 | pack numbers wrong (471,521 / 432,782); derived cap did not follow from its input | figure restated as a measurement with a revision label, never a constant; the derived cap is stable at 530,000 (see owner-actions) |
| M-3 | spec §9 gate 1 marked `met` against contradicting evidence | **NOT MET**, with the reason stated |
| M-4 | `fileTracked` loosening undeclared and untested | declared in the code comment and pinned by two tests |
| M-5 | mirror unenumerated (6 citations, 0 map rows); `613a2471` unregistered | `README*` prefix enumerated (6 rows); `613a2471` correctly NOT an orphan - E-28 |
| M-6 | `gate:all` never run; leg 229 regression | `gate:all` run this wave; the coverage-block question is answered honestly in the report |

## Reproduce before trusting

Every figure below is a **measurement taken at the labelled revision**, not a
property of the project. The pack size in particular grows with the tree, so a
next-session agent who re-measures will get a LARGER number than the one printed
here and that is expected, not a discrepancy. What must not vary between two
places in this file is the *set* of figures — that is what the round-3 audit
(M-8) caught here: three pack numbers, two "boundary" blocks, both stale.

```sh
git rev-parse --short HEAD                  # the revision these figures describe
node scripts/run-test-gate.js               # 1636 tests; the 1 red IS the pack cap
node scripts/check-post-land.js --pre-only --no-fetch   # exit 0 - all four subset checks green
node scripts/check-post-land.js --post-only --no-fetch  # exit 1 - origin/main still carries R-A/R-B/R-C
node scripts/build-rewrite-map.js --check                # exit 0
node scripts/check-governance-inventory.js               # exit 0
node scripts/build-readme-pairing-baseline.js --check    # exit 0
npm pack --dry-run --json                  # packed size vs the 470000 cap (owner-action)
```

Measured set (one set, one revision — see the pack row in owner-actions for the
exact byte figure and the revision it was taken at):

| quantity | value |
|---|---|
| tests | 1636 (1635 pass, 1 fail = the pack cap) |
| test suites | 95 |
| packed size | measured; grows with the tree — re-measure, do not copy a stale figure |
| derived cap | 530,000 — **stable across every measurement this round** |

## Open owner-actions (do NOT self-mint)

1. **Corpus tarball refresh** - the secret tarball lacks `mr-probes.jsonl` against
   the versioned manifest. Refresh deadline: 2026-12-15 cadence. Until then
   **public CI green is NOT claimed** - it is conditional on this refresh.
2. **Pack-cap amendment** - the shipped tarball measures over the ADR-0039 D3 cap
   of 470,000 at every measurement this round (169 entries). The byte figure
   itself is deliberately NOT written here: it grows with the tree, so a stale
   copy in a trusted artifact is a defect, not a convenience - see M-8. Run
   `npm pack --dry-run --json` for the current value. The decision input that
   IS stable is the trend-derived cap, `ceil_to_10_000(size x 1.10)` =
   **530,000**, which came out identical at every measurement. Bumping a cap is
   only ever an ADR; the `pack-smoke` / `adr-0038-wiring` leg stays RED and is
   reported red.
3. **Last-wave residual window** - the F-6 narrowing is minutes, not zero. The
   residual is adjudicated by the post-land ritual; an expired refresh deadline
   escalates through the errata channel.

The single red test is `test/adr-0038-wiring.test.js` D1 (pack cap). It is NOT
a defect in this round's work; it is the registered owner-action below. Do not
"fix" it by bumping the cap without an ADR.

## For the next session

1. **Landing this lane is the point.** post_land is red precisely because the
   repairs are not public yet. Land, push, then re-run `check-post-land.js` and
   expect post_land to follow pre_land to green. That transition is the round's
   acceptance evidence.
2. **`scripts/check-map-freshness.js` is the authority**; `--advisory` reaches the
   demoted per-commit form (~5 min, audit-time only). Do not re-promote the
   per-commit form to blocking - D-005 withdrew it as structurally unsatisfiable.
3. **E-19 discipline**: after any claim-surface change, regenerate in the order
   anchors → rewrite-map → audit-checklist → test-manifest, then run the gate.
   A mid-round red from stale derived surfaces is expected; the ROUND-FINAL state
   is what must be green.
4. **Count-free pins**: several wiring suites now READ derived counts instead of
   restating literals. If you add an ADR, do not re-introduce a hardcoded
   `NN architecture decision records` or a bare `toHaveLength(N)` on inventory
   rows - that is the rot class this round removed.
5. **`--coverage-base` is per-round** (ADR-0081 D-A). A new round re-anchors it;
   the registry-row base is a DIFFERENT literal and is not the same thing.

## Suggested skills

- `but` - all VCS writes; explicit change-ID allowlist per commit, then
  `git show --name-only <sha>` to confirm the landed set matches the intended set
- `implement` - the round spec is the only implementation authority
- `domain-modeling` - CONTEXT.md glossary work (T-9) if further terms are added
- `neat-freak` - pre-closeout cleanliness pass
- `handoff` - the next session's handoff
- `atomcode-research` - ONLY for a substantive external-evidence gap, serially
  (one run in flight per session)

## Standing reminders

- Four red lines: do not rewrite history / do not silently change a tool contract
  (the ADR is the channel) / do not self-declare public green / the sentinel
  SUBORDINATES to defer-0030 second-party audit and never replaces it.
- Owner-only surfaces: corpus refresh, errata adjudication, waivers, tide
  dispositions, cap amendments. The agent reports state, never a verdict.
- Assertion-object identity: pre_land asserts the workspace will-land tree;
  post_land asserts the landed public tree. They are different objects and
  neither may stand in for the other.
- Evidence counts in committed prose use split form ("N captures + 1 fixture").
