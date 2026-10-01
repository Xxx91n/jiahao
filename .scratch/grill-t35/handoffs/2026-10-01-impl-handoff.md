# grill-t35 implementation round → next-session handoff

- Date: 2026-10-01
- Lane: `grill-t35-impl`
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

## Open owner-actions (do NOT self-mint)

1. **Corpus tarball refresh** - the secret tarball lacks `mr-probes.jsonl` against
   the versioned manifest. Refresh deadline: 2026-12-15 cadence. Until then
   **public CI green is NOT claimed** - it is conditional on this refresh.
2. **Pack-cap amendment** - the shipped tarball measures 471,521 packed bytes
   against the ADR-0039 D3 cap of 470,000 (over by 1,521). The trend-derived
   figure is `ceil_to_10_000(471,521 x 1.10)` = 530,000, but bumping a cap is
   only ever an ADR. The `pack-smoke` / `adr-0038-wiring` leg is therefore RED
   and is reported red.
3. **Last-wave residual window** - the F-6 narrowing is minutes, not zero. The
   residual is adjudicated by the post-land ritual; an expired refresh deadline
   escalates through the errata channel.

## Boundary state (reproduce before trusting)

```
node scripts/run-test-gate.js                          # 1628/1629; the 1 red IS the pack cap
node scripts/check-post-land.js --pre-only --no-fetch # exit 0 - all four subset checks green
node scripts/check-post-land.js --post-only --no-fetch# exit 1 - origin/main still carries R-A/R-B/R-C
node scripts/build-rewrite-map.js --check             # exit 0
node scripts/check-governance-inventory.js            # exit 0
node scripts/build-readme-pairing-baseline.js --check # exit 0
npm pack --dry-run --json                             # 471,521 bytes vs 470,000 cap
```

The single red test is `test/adr-0038-wiring.test.js` D1 (pack cap). It is NOT
a defect in this round's work; it is the registered owner-action above. Do not
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
