# grill-t23 round-complete handoff (2026-09-22)

For the next session (grill-t24 or any successor). Branch `grill-t23-docs`
is local-only — **never pushed** (D-006: push not authorized). Base
`688e113`; tip = the final fixpoint commit.

## What landed

- **Cap amendment (pre-registered channel)**: ADR-0082 records
  policy-before-value; ADR-0039 D3 live anchor `340,000 -> 380,000`;
  `defer-0067` discharged-by-trigger; `defer-0068` registered the
  second_reviewer slot for the 2026-12-15 tide.
- **Brand assets**: `docs/assets/brand/` 11 rasters from the deterministic
  Pillow pipeline `.scratch/grill-t23/build-brand-assets.py` (source:
  user-side GPT image, halo variant derived, no white fringe).
- **Pure-SVG visual system**: `docs/assets/hero.svg`,
  `diagrams/dual-profile.svg`, `diagrams/verification-ladder.svg`, four
  badges — gate `.scratch/grill-t23/check-svg-assets.cjs`.
- **README preserve-refresh** (`README.md` + `README-zh-CN.md`): centered
  logo (dark/light), local SVG badges, hero/diagram images, verdicts
  at-a-glance table; all wiring-pinned fragments intact; h2 parity holds;
  zh baseline re-pinned to `8effaaf`.
- **`.github/` templates** under the declared carve-out + `ci.yml` parity.
- **Repo metadata**: description + 7 topics set via `gh repo edit`,
  verified live. Social preview is **manual-upload** (no API) — guide in
  `docs/assets/README.md`.

## Round state

- jest: all suites green; gate:all exit 0; pack-smoke under the amended
  cap; liveness exit 0; coverage anchored at base `688e113`.
- facts canon `.scratch/grill-t23/round-facts.json` + report
  `.scratch/grill-t23/reports/2026-09-22-report.md` in sync.
- trend row `grill-t23-front-face` registered in
  `docs/governance/trend-inventory.json` (carve_out_used:1, 5 R2 files,
  deferred_entry defer-0068, mechanism_output_diff = g6 replay).

## Known carry-forward / watch items

1. **defer-0068** discharges at the 2026-12-15 second-reviewer tide.
2. **Social preview**: user must upload `docs/assets/brand/social-preview.png`
   in repo Settings (manual, no API).
3. **Burn-rate advisory at 4 consecutive carve-out rounds** — the next
   round should prefer R3 surfaces; another R2 touch is legal but will
   re-fire the warning.
4. **GitButler index desync + sweep hazard**: `git status`/`ls-files` can
   show committed files as `D`-staged and never-commit files as `A`. Two
   commits this round accidentally absorbed never-commit files (`a2e5571`
   via basename grep, `51a66d3` via the staged `A` pool); both reverted
   with worktree bytes restored. Before porcelain-based evidence legs run
   `git reset -q HEAD`; before any commit, diff the staged set against an
   explicit intended-path allowlist. `recapture-clean-tree.cjs` is the
   post-commit Disclosed Re-Capture channel — run it after closeout.
5. **Regen-fixpoint order** (this round's exact recipe): commit content ->
   `build-round-facts --round <slug>` -> `build-rewrite-map` -> facts
   re-collect -> `--report` splice -> commit all three. The map cites
   `battery_as_of_commit`, so regen must run *after* the collect that
   embeds it; the citations field converges because the sha row is
   replaced in place.
6. **but-commit id lists**: enumerate explicitly — never grep-match a
   basename (a basename collision committed never-commit files this
   round; see report disclosures).

## Reproduce

```sh
node .scratch/grill-t23/capture-battery.cjs   # verbatim battery re-run
node .scratch/grill-t23/recapture-clean-tree.cjs  # post-commit clean-tree
node .scratch/grill-t23/check-svg-assets.cjs      # SVG gate
python .scratch/grill-t23/build-brand-assets.py   # deterministic regen
```
