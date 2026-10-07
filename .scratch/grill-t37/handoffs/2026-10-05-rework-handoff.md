# grill-t37 Rework Handoff — 2026-10-05

Lane `grill-t37-fixes` (above `grill-t37-impl`). Commits:

- `9afe3d62a91f129b881095f8e68880e8c43e33e4` (`rmx`) — audit rework: F-1 trend
  row + F-2/F-3/F-4/F-7 fixes + orphan-cites fixture clock + derived resyncs +
  audit-artifact registry rows (13 files).
- rework closeout commit — this handoff + the rework report + their registry
  rows.

Full evidence and the §6 verbatim re-run table:
`.scratch/grill-t37/reports/2026-10-05-rework-report.md`.

## State for the next party

Settled-tree truth after rework: **1740 jest pass / 1 fail**
(`adr-0038` pack-cap baseline only — the audit's success criterion met and
beaten: orphan-cites healed, not merely disclosed); `gate:all` 51 legs =
44 pass / 3 fail / 4 unverifiable (all three fails are standing baseline /
landing-gated reds enumerated in report §4); assert leg reconciles this
report's blocks once committed.

## Routing

| Item | Lane / owner | Note |
| --- | --- | --- |
| ADR-0095 + `status-inventory` registration in `docs/gates.json` | `grill-t37-docs` | The leg currently runs standalone with two expected bootstrap warnings; registration removes them. |
| F-5 `run_id` matrix dimension | owner | Latent while no matrix jobs exist; spec already names the CI form. |
| F-6 s2 comparison domain | owner (ADR-0095 material) | The audit measured member-tail/string-literal collection as wider than the spec's name-declaration surface. |
| F-8 command/exit outside member identity | owner | Normalization vs comparison-domain hole — adjudication. |
| F-9 T-0 tier-fill legislation | `grill-t37-docs` | |
| F-10 contract-vocab enumeration base (44 measured vs all docs JSON) | owner | |
| F-11 mismatch precomputation | owner | |
| pack-cap sign-off | owner | NEW FACT: tarball is **530,570 B** — the draft ADR-0094 ceiling of 530,000 is already exceeded by this tree; the amendment may need a higher number before sign-off. |
| `map-freshness` orphan registrations | landing / owner | Rows exist on this lane; leg asserts the published tree — clears on landing. |
| `post-land-sentinel` `pre_land` refresh | owner | Standing since 2026-10-02; the refresh ritual lands the regenerated segment in the wave's closeout commit. |

## Suggested next grill (echoing the audit handoff)

`grill-t38`: audit the machinery that watches the machinery — the assert leg's
own parser and artifact-selection trust surface (F-4/F-7 were live instances
of exactly this class: `complete:false` selection, phantom-marker extraction).

No push performed; lanes are local GitButler work.
