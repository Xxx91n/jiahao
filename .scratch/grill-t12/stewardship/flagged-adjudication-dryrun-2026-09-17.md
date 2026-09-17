# Flagged-adjudication dry-run — 2026-09-17 (ADR-0073 D-D, ledger D-004 R-a)

Protocol exercise executed while nothing rides on it. Input: the live
`~/.jiahao-evidence` chain (31 pairer-instrument lane records), segmented via
`scripts/pairer-lane-telemetry.js` (snapshot:
`./pairer-lane-telemetry-2026-09-17.json`).

## Step 1 — provenance classification (ADR-0073 D-A mechanical rule)

| class | count |
|---|---|
| organic | 0 |
| automated_harness | 29 |
| synthetic_selfcheck | 2 |
| unclassified | 0 |

Reproduce: `node scripts/pairer-lane-telemetry.js --json` → `.provenance.counts`.

## Step 2 — exclusion rules applied

Review population = flagged items with provenance class `organic`
(`flagged_by_class.organic`). `synthetic_selfcheck` flagged records are marked
self-tests — they are telemetry, not adjudication subjects (the W-2 fix:
exclusion is now set-membership against the registered self-test set, not a
name pattern). `automated_harness` flagged items are harness traffic —
pipeline-health evidence only, never promotion inputs. `unclassified` items
cannot enter any organic count but remain on the chain.

## Step 3 — flagged population after exclusion

- flagged total: 2 (`exit-report` family, sessions t11-live-regcheck-s2, -s3)
- flagged by class: organic=0, automated_harness=0, synthetic_selfcheck=2, unclassified=0
- **post-exclusion population: EMPTY**

## Step 4 — pre-set adjudication criteria (ADR-0072 D-D, registered)

- FP iff an independent re-parse yields claim == evidence, OR the family
  assignment fails on re-parse.
- TP iff claim and evidence stay both present and unequal with the family
  intact.
- Disagreement resolves toward FP; authority is not the owner alone
  (independent second line, ADR-0072 D-D tier-2).

Applied to the empty set: no adjudications performed. Verdict counts: FP=0,
TP=0 — by vacuity, recorded, not computed evidence.

## Step 5 — recorded decision

**Outcome: post-exclusion population empty.** The adjudication machine ran;
there was nothing to adjudicate. The two synthetic flagged records remain on
the chain (labeling, not deletion — chain untouched). No promotion-relevant
fact was produced; the organic flagged evidence leg stays pending. Per the
registered rule, no synthetic traffic was created to make the exercise
productive.

## Do-not (held)

- The promotion gate stays frozen; this dry-run is rehearsal, not evaluation.
- Harness flagged items would also exit the review population under the same
  rule (they are not organic) — none existed today.
