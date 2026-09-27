<!-- Added under the grill-t23 governance carve-out (ADR-0076); disclosed in the round ledger. -->

## What this changes

<!-- one or two sentences -->

## Evidence

<!-- the command(s) you ran and what they printed — paste output, don't
     paraphrase. A claim without a rerun is not yet a result. -->

```sh
# e.g. npm test / node scripts/check-drift.js / node scripts/run-test-gate.js
```

## Checklist

- [ ] Claims in this PR cite evidence (a command output, a file:line, or an
      adjudicated record) — not "should work".
- [ ] If this touches `README.md`, `README-zh-CN.md` was updated per ADR-0079
      and its `translation-baseline` will be re-pinned in the follow-up commit.
- [ ] No new npm package content beyond what ADR-0039 D3's tarball budget
      allows (`node scripts/check-pack-smoke.js` passes).
- [ ] Verdict wording uses the closed enum where applicable
      (PASS / FAIL / ESCALATE / NOT VERIFIED).
