# Rewrite-map generator spec — `scripts/build-rewrite-map.js` → `docs/rewrite-map.json`

Registered under ADR-0074 D-C (ledger t13 D-003); the classification contract
was re-based on declared facts by ADR-0089 (grill-t32). This document is the
spec; the generator lands in R2. The map is the single translation point for
pre-rewrite SHA citations — append-only record files are never edited to add
pointers, and this file is never hand-edited.

## Inputs

- **New side (published)**: `git rev-list origin/main` — the post-rewrite
  commit sequence.
- **Old side (pre-purge, local-only)**: `git rev-list` over the retained
  pre-rewrite refs (`gb-local/grill-t12-docs` and any other `gb-local/*` tip
  that carries pre-purge objects), minus commits already in the new side.
  Discovery rule: a `gb-local/*` ref is old-side iff it has commits not on
  `origin/main` AND contains no published-side rewritten commit or the
  published tip — post-purge working branches descend from those objects
  even when they carry unpublished work or predate the current tip (the
  tip-only test goes stale once `origin/main` advances past the rewrite
  region). The prior map's `commits[].new`/`published_tip` supply the
  anchor; the first generation falls back to the tip test.
- **Doc citations**: the union of `git ls-files` and
  `git ls-tree -r HEAD --name-only` over tracked docs (`*.md`, `*.json`,
  `*.txt` under `docs/`, `CONTEXT.md`, `README.md`, `AGENTS.md`,
  `.scratch/**`) scanned for hex strings matching `/\b[0-9a-f]{7,40}\b/` —
  each hit recorded as `{file, line, sha}`. Enumeration is the UNION of the
  index and the committed tree (the F-1 lesson: GitButler's virtual index
  lags HEAD by committed files, so an index-only scan silently misses
  tracked docs). Untracked worktree files are deliberately NOT scanned — a
  doc joins the tracked surface only via a commit, so the map regen that
  follows the doc commit picks it up.

## Alignment algorithm

1. Build the old→new commit map by aligning commit *messages* (subject, then
   body-normalized full message on subject collisions) between the old-side
   and new-side sequences. GitButler rewrites preserve messages, so message
   identity is the join key; the script must fail loudly on a subject that
   matches more than once per side (ambiguous — refuse to guess).
2. Commits present in both sides with the same SHA → `same` (below the
   boundary `1ca81f5` the map may omit them or emit them as `same`; emit them
   — explicit is auditable).
3. Old-side commits with no new-side counterpart → `new: null` (removed by
   the purge); new-side commits with no old-side counterpart (e.g. `a6729a9`,
   `051744a`) are recorded under `published_only`.
4. The two registered empty commits (`b73e558`/`kxo`, `e54c267`/`wko`) are
   still ordinary old→new pairs; their emptiness is a property of the new
   commit, asserted by the map's `verify` mode, not a special class.

## Doc-citation classification (ADR-0089 declared-facts contract)

For every `{file, line, sha}` hit, class derives from four declared facts —
ref topology is only a qualifier, never the verdict:

1. **pair/removed tables** — the `commits`/`removed` join above.
2. **pinned published_tip ancestry** — `rev-list --objects <newRef>` at the
   pinned tip.
3. **object existence** — `git cat-file` (existence, type, size); everything
   runs under `GIT_NO_REPLACE_OBJECTS=1` (replace semantics never enter
   declared facts).
4. **orphan-cites registry membership** — `docs/governance/orphan-cites.json`
   latest-`registered_at` adjudication.

| class | binding fact |
| --- | --- |
| `rewritten` | pair-table hit → `resolved_to` = new-side counterpart |
| `published-unchanged` | in the pinned-tip ancestry set |
| `local-only` | exists locally, no published/pair hit, no orphan adjudication — `label` is a short role string, never content metadata (minimal disclosure, ADR-0074 D-C) |
| `orphaned-cite` | latest registry entry adjudicates `disposition: "orphaned"` — terminal while the registry says so |
| `unresolved` | object absent from the DB **and** unregistered — hard red: any such row fails `--check` |

Every row also carries `qualifiers` (volatile metadata, exempt from `--check`
equality but weak-consistency-checked): `exists_at` (classification instant),
`object_mtime` (committer_ts for commits/tags, loose-file mtime else),
`object_type`, `object_size`, `reachable_via` (display refs at generation
time — written and displayed, never judged). A non-empty `reachable_via` on a
class asserting non-reachability (`orphaned-cite`, `unresolved`) is flagged.

**Completeness invariant**: every hex citation in tracked docs receives a
class. An unclassified citation is a new inconsistency and fails `--check`.

**Scan exemptions**: `docs/rewrite-map.json` (self) and
`docs/governance/orphan-cites.json` (the registry's hex literals are payload
fields — cited_sha, snapshot.parents, successor_sha — not claims; scanning
them would recurse each registered orphan's ancestor chain into the map).

## Output shape

```json
{
  "schema_version": 2,
  "_doc": "ADR-0074 D-C + ADR-0089: append-only, tool-generated single translation point. …",
  "generated_by": "scripts/build-rewrite-map.js",
  "generated_at": "<ISO-8601>",
  "published_tip": "051744a7a1b4027a42720814c819bf051e0831a8",
  "boundary": { "shared_base": "1ca81f5…", "old_tip": "2c93a30…", "new_counterpart": "3454d13…" },
  "sides": { "old_refs": ["gb-local/grill-t12-docs", "…"], "new_refs": ["origin/main"] },
  "commits": [ { "old": "05fa697…", "new": "2e9cdc9…", "subject": "…" } ],
  "published_only": [ { "new": "a6729a9…", "subject": "…" } ],
  "warnings": [ { "sha": "…", "file": "…", "line": 0, "age_days": 0, "kind": "orphan-window-open" } ],
  "doc_refs": [ { "file": "docs/adr/00xx-….md", "line": 12, "sha": "…", "class": "rewritten|local-only|published-unchanged|orphaned-cite|unresolved", "resolved_to": "…|null", "qualifiers": { "exists_at": "…", "object_mtime": 0, "object_type": "commit|tag|tree|blob|null", "object_size": 0, "reachable_via": [] } } ]
}
```

`--check` equality domain (ADR-0089 D-F): declared facts only — `class`,
`pair`, `resolved_to`, `counts` (plus the other stable fields). Exempt but
still written: `generated_at`, `warnings`, and each row's `qualifiers`
(timestamp/ref-topology churn must not make the map permanently dirty).
Abbreviated SHAs in `doc_refs` are resolved to full 40-char object names where
unambiguous; ambiguous abbreviations fail `--check`. Presence of any
`unresolved` row is hard red regardless of equality.

## Modes

- default: write `docs/rewrite-map.json` (append-only: existing entries are
  preserved verbatim; new citations append new rows).
- `--check`: regenerate in memory and diff the stable domain — exit 1 on any
  declared-fact drift (map stale, unclassified citation, ambiguous alignment,
  any `unresolved` row, or a qualifier contradiction).
- `--verify`: assert each `commits` pair shares its subject, each `empty`
  claim re-derives (`git show --stat` empty), and the boundary trees are
  identical (`git diff old_tip new_counterpart` empty).
- `--published-only`: committed-map internal consistency verifiable on a
  fresh clone — coverage, five-class enum, counts, published-side ancestry,
  zero `unresolved`, and registry consistency for `orphaned-cite` rows.

## Non-goals / guards

- No `refs/replace/` is written or read (ledger D-003 rejection).
- The map never expands `local-only` rows beyond SHA+label.
- Zero runtime dependencies (Node stdlib + `git` subprocess only) — same
  profile as every other gate script.
- Hand-built or hand-edited rows are forbidden; `--check` failing on a hand
  edit is the intended behavior.
