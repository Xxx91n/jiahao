# grill-t32 T-0 baseline recon

captured-at-head: b06f4a970e8b0f005fee6cc22a68f2ad2a12b580
(origin/main at round open; workspace tip 36eaf052 = GitButler Workspace Commit
over lane grill-t32-docs carrying the docs commit 13a20c94)

## Rewrite-map current shape (scripts/build-rewrite-map.js, 531 lines)

- schema_version: 1; generated_by pinned; committed map published_tip =
  67785a34 (the t31 regen commit's own tip — i.e. one regen behind origin/main
  b06f4a97 already).
- Class enum today: `rewritten | local-only | published-unchanged`.
  `local-only` subkinds ride the `label` field: "old-side commit (removed by
  purge)" / "local commit" / "pre-purge object" / "local object" /
  "unresolved hex literal".
- Classification is ref-topology-driven: commitPool = new+old log union;
  objSorted = rev-list --objects over newRef + oldRefs + --all; prefixLookup
  resolves abbreviated tokens; 'ambiguous' aborts the run (fail-loud, kept).
- Committed map now: 3600 doc_refs = 2456 published-unchanged / 104
  rewritten / 1040 local-only (1034 unresolved-hex rows over 276 unique
  tokens, 264 abbreviated; 5 local-object; 1 pre-purge object; 0 old-side
  removed). The 276 unregistered dead tokens are the backfill population.
- `--check` status at baseline: RED — stale map (t32 doc cites landed after
  the last regen). This is pre-existing drift, not a regression; T-8 closes
  it under the new semantics per the cutover order.

## Wiring pins to touch

- test/rewrite-map.test.js: CLASSES 3-enum; schema_version===1 pin;
  counts.doc_refs_by_class 3-key shape; known-anchor class assertions
  (05fa697→rewritten, 051744a/1ca81f5→published-unchanged); gate-entry pin.
- test/adr-0074-wiring.test.js: ADR-0074 verbatim pins (incl. three-class
  wording), generator-spec pins, README "88 architecture decision records",
  anchors.json/trend/deferred pins. README index goes 88 -> 89.
- test/map-freshness.test.js: fixture mapJson carries the 3-key
  doc_refs_by_class — new enum members extend the fixture shape.
- .github/workflows/ci.yml: `--expected-suites 87` → bumps by the number of
  new test files this round lands (battery + wiring suite).
- test/adr-0086-wiring.test.js: classification-block pins; leg orders
  220-223 — orphan-registration leg takes order 225 (after map-freshness
  224, which already asserts committed-map freshness per claim commit).

## Environment facts

- gc.pruneExpire: unset → git default ≈ 2 weeks (the constants' magnitude).
- Repo scale: 752 commits on --all; 17 refs (13 non-gitbutler); rev-list
  --objects origin/main = 8139 objects in ~160 ms — per-ref object-set
  enumeration for the reachable_via qualifier is cheap.
- Stray root residue present and untracked: map-before.json +
  map-committed.json (931,470 B each, 2026-09-28) — D-011 debug residue,
  queued for removal at T-10.
- Untracked .scratch audit-evidence pools (23 entries) are nc-001
  never-commit examiner work product — untouched this round.

## Registration plan deltas discovered

- field_governance.classification is a dotted-path map over
  surface-taxonomy.json fields only; its staleness leg requires classified
  paths to resolve inside the taxonomy. A file-path key
  ("docs/governance/orphan-cites.json") does not resolve there — the
  checker needs a small clause-(b) extension so file registrations resolve
  against the git-tracked file set instead (named in ADR-0089).
- New leg `orphan-registration`: order 225, confirmatory, source_adr
  ADR-0089, requires ["repo-tree","old-side-refs"] (classifier-consistent:
  it evaluates the committed map's reachable_via qualifiers, which exist
  only where the old side is present).
- freshness.rounds needs the grill-t32 row, base = b06f4a97 (above).
