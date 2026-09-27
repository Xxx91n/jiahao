# Rewrite-map generator spec — `scripts/build-rewrite-map.js` → `docs/rewrite-map.json`

Registered under ADR-0074 D-C (ledger t13 D-003). This document is the spec;
the generator lands in R2. The map is the single translation point for
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

## Doc-citation classification

For every `{file, line, sha}` hit, resolve `sha` against the object set:

- `rewritten` — sha names an old-side commit with a `new` counterpart; record
  `{sha, class: "rewritten", resolved_to: <new-sha>}`.
- `local-only` — sha names an object reachable only from pre-purge refs or
  the local object store; record `{sha, class: "local-only", label}` — label
  is a short role string (e.g. "t11 registration commit"), **never** content
  metadata (minimal disclosure, ADR-0074 D-C).
- `published-unchanged` — sha names a commit/blob in published history
  unchanged; record `{sha, class: "published-unchanged"}`.

**Completeness invariant**: every hex citation in tracked docs receives a
class. An unclassified citation is a new inconsistency and fails `--check`.

## Output shape

```json
{
  "schema_version": 1,
  "_doc": "ADR-0074 D-C: append-only, tool-generated single translation point. Regenerate: node scripts/build-rewrite-map.js; verify: --check.",
  "generated_by": "scripts/build-rewrite-map.js",
  "generated_at": "<ISO-8601>",
  "published_tip": "051744a7a1b4027a42720814c819bf051e0831a8",
  "boundary": { "shared_base": "1ca81f5…", "old_tip": "2c93a30…", "new_counterpart": "3454d13…" },
  "sides": { "old_refs": ["gb-local/grill-t12-docs", "…"], "new_refs": ["origin/main"] },
  "commits": [ { "old": "05fa697…", "new": "2e9cdc9…", "subject": "…" } ],
  "published_only": [ { "new": "a6729a9…", "subject": "…" } ],
  "doc_refs": [ { "file": "docs/adr/00xx-….md", "line": 12, "sha": "…", "class": "rewritten|local-only|published-unchanged", "resolved_to": "…|null" } ]
}
```

`generated_at` is the only volatile field; `--check` compares everything else
(regen-and-diff). Abbreviated SHAs in `doc_refs` are resolved to full 40-char
object names where unambiguous; ambiguous abbreviations fail `--check`.

## Modes

- default: write `docs/rewrite-map.json` (append-only: existing entries are
  preserved verbatim; new citations append new rows).
- `--check`: regenerate in memory and diff — exit 1 on any drift (map is
  stale, or a doc citation is unclassified, or an alignment is ambiguous).
- `--verify`: assert each `commits` pair shares its subject, each `empty`
  claim re-derives (`git show --stat` empty), and the boundary trees are
  identical (`git diff old_tip new_counterpart` empty).

## Non-goals / guards

- No `refs/replace/` is written or read (ledger D-003 rejection).
- The map never expands `local-only` rows beyond SHA+label.
- Zero runtime dependencies (Node stdlib + `git` subprocess only) — same
  profile as every other gate script.
- Hand-built or hand-edited rows are forbidden; `--check` failing on a hand
  edit is the intended behavior.
