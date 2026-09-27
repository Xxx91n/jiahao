# G6 impact assessment — pairer as v3 adjudication object (grill-t8, ADR-0069 D-F)

Question: what changes for the G6 equivalence + publish gates when the v3
verdict object changes from the frozen LR port to the claim-evidence pairer?

## Answer: nothing — the gates never see the pairer.

- The G6 gates (`g6-publish`, pack smoke, equivalence replay) adjudicate the
  SHIPPED artifact only: `src/port/score.js` + `src/port/g6-manifest.json`,
  sha256-frozen since 8807a61 and anchored by tag `adjudicated/devin-corpus-v2`.
- The pairer (`bench/research/capa-pairer.js`) is a bench-side research
  artifact under `bench/` — the tarball boundary (ADR-0038 D2) already
  excludes it; the pack-smoke gate confirms bench/ never ships.
- The pairer never enters the product path while unadjudicated: no
  detector.js integration (separate gated decision, judge-seam FP gate),
  no src/ residency, no manifest role.
- Therefore: G6 gate definitions unchanged; the frozen port keeps passing
  its own gates; the publish gate's equivalence contract is untouched.

## What DOES change (registered, non-G6)

- v3 adjudication reads pairer states, not port verdicts (ADR-0069 D-E.1-2).
- The port keeps running as zero-verdict telemetry beside the pairer —
  disclosure reports only (D-B.1-2).
- A future v3 PASS lands on main with its own fact line; only then does a
  follow-up decision weigh whether anything pairs into the product seam.
