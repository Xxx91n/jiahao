# grill-t25 round handoff — public-clone verifiability + merged sweep (2026-09-24)

Round state: the t25 round's local work is complete at the tip of the
`grill-t25-fix` stack (built on `grill-t25-docs`). Full narrative +
disclosures: `D:\Aworker\jiahao\.scratch\grill-t25\reports\2026-09-24-report.md`.
Evidence: `D:\Aworker\jiahao\.scratch\grill-t25\evidence\` (every file carries
a `captured-at-head` line; see `clone-acceptance.txt` for the public-clone
acceptance trio).

## What landed

- Clone-degradable rewrite-map verification: absent `gb-local/*` old-side refs
  degrade `--check`/`--verify`/write to exit 2 UNVERIFIABLE via the registered
  `capability.exitUnverifiable` channel; `--published-only` asserts the
  clone-verifiable subset and is the `rewrite-map-published` gate.
- `docs/adr/0084-*.md` (six clauses), the ADR-0083 pointer line, the
  `old-side-refs` capability (enum + probe + HINTS), suite count 78->79
  (`ci.yml`, README count lines, era literals, zh mirror same-commit +
  baseline re-pin).
- Sweep: `defer-0070` (CI-red history), `defer-0071` (generalized monitoring),
  `bbf5259` Re-Execution Prior registration, 10 countersign labels
  (ID-level-only, return 2026-12-15), secret-scan commit-message surface,
  t25 trend row with `governance_tooling_diff`.
- Ordering invariant generalized: `.scratch/grill-tNN/evidence/` is
  non-anchoring for every NN (cross-round evidence commits are regen-class).
- Human-authority package drafted:
  `D:\Aworker\jiahao\.scratch\grill-t25\human-authority-package.md`.

## Open items for the next round / the human

1. **Human action (ADR-0084 D-E tag timing)**: push the annotated
   `adjudicated/grill-t25` tag naming the landed tip sha. Until then the
   ADR-0069 tag legs stay red on a public clone — by design, disclosed.
2. **Human action**: the human-authority package (renew-or-expire template,
   countersign binary, ratchet-brake meta-rule) awaits adjudication.
3. `defer-0070` closes on the first green CI run; `defer-0071` review_at
   2026-12-15; countersign labels return at the same window.
4. `check-ci-jobs` stays red until defer-0004 lands (carried expectation).

## Traps the next round should know (learned this round, all in evidence)

- **Anchoring commits force a full re-capture wave.** Any edit outside
  `*/evidence/` + NON_ANCHOR moves the freshness anchor; committed evidence
  headers must name a sha at-or-after it. Land ALL anchoring edits before
  the closing wave; the landing tail is evidence/map commits only.
- **A leg's own write poisons later legs.** Each evidence file's
  `captured-at-head` is a new citation site; mid-battery `--check`/jest legs
  see uncovered tokens. The buffered-run-then-write convention
  (`.scratch/grill-t25/recapture-final.cjs`) keeps every leg's capture-time
  state settled: run all legs with results buffered, write files at the end.
- **Map regen reads worktree bytes.** Regenerating while a scanned file is
  pending-modified covers the pending token, not the committed one — the
  clone then sees coverage gaps. Regen only on a clean worktree.
- **Index/tree divergence**: `but uncommit` leaves files staged; `ls-files`
  sees them, `ls-tree HEAD` does not. Unstage before regen.
- **Allowlist grep on basenames sweeps neighbors.** `clean-tree` matched
  prior rounds' `audit-evidence/` files; always allowlist by full path.
- **canon as_of is terminal-stale by design.** `round-facts.json` embeds the
  collect-time map count; the closing wave's own header sites grow the map.
  The committed `--check --report` leg records the green at the wave anchor;
  the tip drift is disclosed, not a defect.
