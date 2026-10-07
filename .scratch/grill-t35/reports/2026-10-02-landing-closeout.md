# grill-t35 landing closeout — post-land verification, first recorded green block

- Date: 2026-10-02
- Writer: the grill-t36 session (recording agent); the landing act was authorized
  by the owner ruling recorded in .scratch/grill-t36/decision-ledger.md D-001/D-002
- Landed: lane grill-t35-impl onto origin/main — public tip moved
  78d8a14c (grill-t34 covering map regen) -> 23ca68eb (grill-t35 convergence wave)
- Same wave also lands lane grill-t35-docs — the round ledger/spec/handoff docs,
  this closeout artifact, and the covering rewrite-map regen (E-17: map LAST)

## What this wave did

1. but land grill-t35-impl --yes — 14 commits landed and pushed to origin/main.
2. node scripts/check-post-land.js --post-only -> exit 0. The post_land segment
   followed pre_land to green on the true landed tip: that transition is the
   t35 acceptance evidence and the first real execution of the post-land ritual.
3. This closeout artifact plus a regenerated post-land-verify block (below).
4. rewrite-map regenerated LAST so the published line is described by the map
   that ships with this wave (published_tip now names 23ca68eb).

## Public CI residual reds — two lists (run 36966020763 at 23ca68eb)

Eliminated by this wave (were red on 23ca68eb, expected green once this lane lands):

- 209 rewrite-map-published — phantom citation rows (see registered defect below).
- 231 post-land-sentinel — the newest committed block still recorded post_land
  red against the pre-landing tip; superseded by the block in this artifact.

Persisting declared-in reds (not eliminated, not regressions):

- 196 pack-smoke — tarball over the ADR-0039 D3 cap of 470000; owner-action (a),
  an ADR amendment is the only lawful fix (derived cap 530000 stands).
- 8 corpus legs UNVERIFIABLE — owner-action (b): the corpus tarball lacks
  mr-probes.jsonl against the versioned manifest; refresh deadline 2026-12-15.
  Public CI green is NOT claimable until that refresh (spec-t35 sec.9).

## Registered defect: phantom citation rows (defer + reason -> grill-t36)

The map committed at 23ca68eb was regenerated inside a workspace that also had
the unlanded grill-t35-docs lane applied, so it recorded citation rows keyed to
files absent from the public commit tree (.scratch/grill-t35/GOAL.md et al).
Detection worked as designed — leg 209 caught the false attestation on the
first public run — but the generation side lacks front-hygiene:
build-rewrite-map.js enumerates the combined workspace tree (ls-files union
ls-tree HEAD), an object that is never the public object. This is the same
family as the grill-t36 round object: the instrument baked its own observation
surface into the artifact it produced.

Disposition: defer to grill-t36 with reason — a generation-side fix is an
enumeration-surface / tool-contract change that must travel through an ADR
declaration (t35-D-003 delta2 channel), not through a landing wave.
[Documented-Decision Closure: defer+reason, not silent backlog]

## Sentinel boundary note

The 231 red on 23ca68eb is the designed stale-block mechanism stacked on an unclosed
wave: the previous block honestly recorded post_land red for the pre-landing
tip. This artifact carries the first block whose post_land segment records a
verified green on the landed public tree — the sentinel mechanism now produces
a real end-to-end green record for the first time.

## Wave verification block

<!-- post-land-verify v1 -->

<!-- segment: pre_land -->
```json
{
  "object": "workspace merge tree (will-land simulation; merge-group semantics localized, ADR-0092 D-PRE)",
  "last_claim_mutation": "291825244e60071fbaeb2ce9c3dac39335552529",
  "wave_commits": 770,
  "ran_at": "2026-10-02T05:17:36.700Z",
  "subset": [
    "map-freshness tip coverage (authority, ADR-0092 D-M2)",
    "doc-hygiene over the tip tree committed .scratch markdown (D-M1)",
    "orphan-ancestry strict-pin resolution",
    "README/zh-CN pairing scan vs committed baseline (D-P2)"
  ],
  "checks": [
    {
      "name": "doc-hygiene",
      "status": "pass",
      "detail": "437 committed .scratch markdown file(s) clean",
      "files": 437
    },
    {
      "name": "readme-pairing",
      "status": "pass",
      "detail": "12 registered unpaired commit(s) over 411 scanned; ratchet holds",
      "scanned": 411
    },
    {
      "name": "map-freshness",
      "status": "pass",
      "detail": "[map-freshness] OK: tip map (worktree) covers 36 claim commit(s) (0 uncovered citation(s), 4049 map row(s)) - authority per grill-t35 D-005 / [map-freshness] advisory skipped (audit-time surface; run with --advisory to fold it in) - ADR-0092 D-M2"
    },
    {
      "name": "orphan-ancestry",
      "status": "pass",
      "detail": "[orphan-ancestry] OK - 133 pin(s) / 24 unique sha(s) ancestral of HEAD; trigger: ok (workspace descends from last seal b9396688d (.scratch/grill-t31/SEAL)); 3 errata-exempt"
    }
  ]
}
```

<!-- segment: post_land -->
```json
{
  "object": "landed public tip (origin/main)",
  "tip": "23ca68ebcc703508ba990e7fe485c57762d161b6",
  "ref": "origin/main",
  "fetched": true,
  "wave_range": "whole tip tree",
  "ran_at": "2026-10-02T05:19:05.969Z",
  "subset": [
    "map-freshness tip coverage (authority, ADR-0092 D-M2)",
    "doc-hygiene over the tip tree committed .scratch markdown (D-M1)",
    "orphan-ancestry strict-pin resolution",
    "README/zh-CN pairing scan vs committed baseline (D-P2)"
  ],
  "checks": [
    {
      "name": "doc-hygiene",
      "status": "pass",
      "detail": "433 committed .scratch markdown file(s) clean",
      "files": 433
    },
    {
      "name": "readme-pairing",
      "status": "pass",
      "detail": "12 registered unpaired commit(s) over 409 scanned; ratchet holds",
      "scanned": 409
    },
    {
      "name": "map-freshness",
      "status": "pass",
      "detail": "[map-freshness] OK: tip map (HEAD) covers 36 claim commit(s) (0 uncovered citation(s), 4049 map row(s)) - authority per grill-t35 D-005 / [map-freshness] advisory skipped (audit-time surface; run with --advisory to fold it in) - ADR-0092 D-M2"
    },
    {
      "name": "orphan-ancestry",
      "status": "pass",
      "detail": "[orphan-ancestry] OK - 133 pin(s) / 24 unique sha(s) ancestral of HEAD; trigger: ok (workspace descends from last seal b9396688d (.scratch/grill-t31/SEAL)); 3 errata-exempt"
    }
  ]
}
```
