# ADR-0089: Rewrite-Map Classifier Declared-Facts Contract — Orphan-Cite Registry, Lifecycle Ladder, and the Atomic Cutover (grill-t32)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-09-28
- Ledger: `.scratch/grill-t32/decision-ledger.md` — grill-t32 D-001..D-006 (all current)
- Spec: `.scratch/grill-t32/spec-t32-classifier.md`
- Supersedes (scoped): ADR-0074 D-C's classification input surface and class enum only — see §Scoped succession below; the map artifact, its append-only discipline, and the completeness invariant survive.

## Context

The rewrite map (ADR-0074 D-C) classifies every hex citation in tracked docs.
Its classifier is driven by ref topology: an object's class is decided by which
refs happen to reach it at generation time. Restacks, `but move`, ref cleanups
and merges routinely flip labels between `local-only` subkinds and
`unresolved`-adjacent states without any underlying fact changing — the
grill-t31 repair window produced four generations of label churn on the same
objects (D-011 lineage), and two disclosure-only regen commits exist solely to
absorb that churn. Meanwhile genuinely dead citations — SHAs whose objects no
longer exist anywhere — hide inside the same `local-only` bucket as live local
work, and the reference channel (`ERRATA.md` prose, `errata_exemptions`
pin-file entries) is the wrong shape to hold them: policy-shaped TTL entries
describing historical facts.

This round re-bases the contract on declared facts instead of ambient
topology, introduces a machine-readable orphan-cite registry as a
classification input, and lands the change as one atomic cutover.

## Considered options (carrier)

- **α — new ADR (this record) + scoped succession pointer on ADR-0074.**
  Chosen. The change is a contract, not a patch: it redefines the
  classification basis, adds a governance artifact, and adds a gate leg.
- **β — in-place revision of ADR-0074.** Rejected: 0074 is an Accepted,
  user-ratified record; rewriting its approved semantics in place is the
  silent-reshape defect class (the V7 critique family). Approved surfaces are
  never edited into new meaning.
- **γ — registry-only** (record the new rules in surface-taxonomy /
  gates.json without an ADR). Rejected: fenced-surface changes ride an ADR +
  countersign (ADR-0086 D-A); a registry-only change would be exactly the
  unrecorded-semantics drift the field-governance round exists to prevent.

## Decision

### D-A — The classifier is a pure function over four declared facts (ledger D-002)

The classification of each doc citation resolves the cited token to an object
identity, then derives the class from exactly this set:

1. the map's own `commits[]` (pair) and `removed[]` tables;
2. the pinned `published_tip` ancestry set (`rev-list --objects` of the pinned
   tip);
3. object existence via `git cat-file -e` on the resolved object;
4. membership in the orphan-cite registry (`docs/governance/orphan-cites.json`).

Ref topology (`--all`, oldRefs-derived reachability) **exits the decision
path**. It may still be computed — it populates the `reachable_via` qualifier
— but it is written and displayed, never judged.

### D-B — Class set (ledger D-002 ii)

| class | derivation |
|---|---|
| `rewritten` | pair-table hit (`commits[].old`), `resolved_to` = new-side sha |
| `published-unchanged` | pinned-tip ancestry hit |
| `local-only` | object exists; labels differentiate: `old-side removed` (removed-table hit), `local commit` / `local object` (existence) |
| `orphaned-cite` | registry membership, latest-`registered_at` entry adjudicates as `disposition: "orphaned"` |
| `unresolved` | object absent from the DB **and** unregistered — fail-closed; presence of any `unresolved` row fails `--check` |

`pre-purge object` dies as a class/label — its information survives only
inside `reachable_via`. `unresolved` is narrowed: it no longer absorbs
objects that merely stopped being reachable; absent-and-registered is
`orphaned-cite`, absent-and-unregistered is the only `unresolved`.

### D-C — Qualifier columns (ledger D-002 iii, v)

Each `doc_refs` row additionally carries qualifiers — recorded, displayed,
excluded from `--check` equality (D-F):

- `exists_at` — the classification timestamp;
- `object_mtime` — committer/tag time for commit/tag objects, loose-file
  mtime for loose blob/tree objects, `null` when the object has no
  determinable time (packed non-commit);
- `object_type`, `object_size` — `cat-file -t` / `cat-file -s` results, for
  human review (a planted orphan cannot launder into a normal class without
  its type and size being on the record);
- `reachable_via` — the set of ref names (minus `gitbutler` internals and
  `refs/replace/`) through which the object was reachable at classification
  time; possibly empty.

Qualifiers get weak-consistency validation, not equality: a non-empty
`reachable_via` against a class that asserts non-reachability
(`orphaned-cite`, `unresolved`) is flagged; a null `exists_at`, an
`object_type` outside the git enum, or a committed map claiming a class the
recomputation derives differently are errors.

### D-D — The orphan-cite registry (ledger D-003)

New artifact `docs/governance/orphan-cites.json`:

- append-only JSON, `{schema_version, _doc, entries: []}`; entries are never
  edited or deleted — supersession is a newer `registered_at` entry;
- registered day-1 as `fenced` in ADR-0086's `field_governance.classification`
  — gate-consumed therefore semantics-bearing (see §File-level registration
  below);
- one entry type, purely declarative fields — no event stream:

```
{cited_sha, object_type, size,
 snapshot: {subject, author, committer_ts, parents} | null,
 last_reachable_via: [], successor_sha: <sha>|null, cite_locations: [],
 registered_at, reason, carried_log: [],
 object_purged_at?, errata_ref?, disposition: "orphaned"|"revived"}
```

`snapshot` is materialized while the object is alive — the sha is the content
digest; the snapshot exists so a human can later identify what the cite
pointed at. `object_purged_at` is an appended observation: a registered orphan
later found physically deleted keeps its entry, marked — audits do not report
it as fresh damage. `disposition:"revived"` is how resurrection is recorded:
an appended entry; the classifier then falls back to existence-fact
classification (orphaned-cite is a verdict on current fact, not a permanent
brand). `errata_ref` back-points degraded entries at their ERRATA.md record.

Write path — explicit verbs only (`scripts/orphan-cites.js`):

- `register <sha> [--successor <sha>] [--replace-ref]` — appends one entry
  after machine verification: the cited object exists; a named successor
  exists and is reachable, and the entry's snapshot fields are
  consistency-checked against the successor object; `--replace-ref`
  additionally materializes `refs/replace/<old>` and the entry records that
  choice. Whenever replace refs exist, **all** classifier object reads run
  under `GIT_NO_REPLACE_OBJECTS=1` — replace semantics would silently
  re-introduce environment-driven classification through the side door.
- `backfill [--dry-run] [--checkpoint <file>]` — the one-shot migration:
  enumerates currently-orphaned citations, registers live objects with full
  snapshots and purged ones in degraded form (`object_purged_at` +
  `errata_ref`). Idempotent; dry-run reports and writes nothing.
- The classifier NEVER writes the registry. Registration is a deliberate act;
  detection hooks live in the post-restack / settled-tree flow — when
  `reachable_via` turns empty while the object is still present, registration
  is due.

Adjudication: multiple entries per `cited_sha` resolve by latest
`registered_at`; older entries remain history (append-only, never edited).

Separation of roles: the registry feeds the classifier (machine-readable);
`ERRATA.md` feeds humans (prose); neither embeds the other.
`errata_exemptions` is NOT reused — wrong domain (pin-file orphans), wrong
lifecycle (`expires_at` auto-lapse), wrong class (exception-channel).

### D-E — Lifecycle: three-stage escalation + the orphan-registration leg (ledger D-004)

Over a map's `doc_refs` qualifiers, where the cited object exists and
`reachable_via` is empty:

1. under the age threshold → silent (transient tolerance — restack
   mid-states are normal);
2. over the age threshold, unregistered → a yellow `note` on the map's
   warning channel ("orphan window open — register while the object is
   alive"); a warning without a deadline is suppressed debt, so stage 2
   always escalates;
3. past the registration grace period, still unregistered → the standalone
   `orphan-registration` gate leg goes red;
4. object absent AND unregistered → `unresolved` rows are hard red inside
   `--check` (fail-closed core).

Leg separation is structural: `--check` stays a pure artifact-consistency
comparison (declared facts only, hermetic); `orphan-registration` asserts the
living obligation. They are never merged — artifact equality and
obligation-due are different assertion kinds.

Registered constants (named, adjustable, order-of-magnitude aligned with
`gc.pruneExpire` ≈ 2 weeks):

- `ORPHAN_AGE_DAYS = 14` — the transient-tolerance window (stage 1 -> 2);
- `ORPHAN_REGISTER_GRACE_DAYS = 7` — grace past the age threshold before the
  leg goes red (stage 2 -> 3);
- leg id: `orphan-registration`, order 225, confirmatory tier, source this
  ADR.

Age basis: the object's own time (`committer_ts`/`tagger_ts`, else loose-file
mtime, else undeterminable → treated as over-age: the obligation is
register-while-alive, so an unagable object is conservatively past stage 1).
Both the classifier and the leg accept an injectable `now()` so the ladder is
tested without sleeps or clock patching.

### D-F — `--check` comparison domain (ledger D-004 ii, iii)

Byte-stable equality: `class`, `pair`/`resolved_to`, and `counts` only.
Exempt from equality (still written, still weak-consistency-checked):
`exists_at`, `reachable_via`, `object_type`, `object_size`, `object_mtime`,
`generated_at`.

`--check` never mutates and never registers. Unregistered orphans it finds
are reported as backlog with a "run `orphan-cites.js backfill`" hint — the
registration act is always explicit.

### D-G — Atomic cutover (ledger D-005 v)

One migration, one commit: explicit `backfill` run (all currently-orphaned
cites — live snapshots where objects survive, degraded + ERRATA back-pointer
where purged) → classifier and legs landed → single full regen under the new
semantics → committed together: the registry entries, the map under bumped
`schema_version: 2`, and the migration diff as the disclosure artifact
(drift rows individually visible). No per-row migration, no dual-version
coexistence — those are online-service patterns, inapplicable to a
regenerable derived artifact.

### D-H — Clone-face reshape (ledger D-005 vi)

`--published-only` widens: besides coverage/class-enum/count/ancestry it now
also asserts published-side classification and registry-consistency —
`orphaned-cite` rows must resolve to a committed registry entry adjudicating
`orphaned`, and no `unresolved` rows may be present. Both are computable from
committed files alone (the registry is a tracked doc), so the
clone-verifiable surface grows. Existence assertions remain
maintainer-scoped (ADR-0040/0084 degrade model: absent `old-side-refs`
degrades to exit 2 UNVERIFIABLE, never red).

### D-I — File-level registration in field_governance (machinery note)

`field_governance.classification` is a dotted-path map over taxonomy fields;
a governance *file* is not a taxonomy leaf. This ADR registers the file-level
form: a classification key that is a repo-relative path
(`docs/governance/orphan-cites.json`) classes that file; the
`classification-consistency` leg's staleness clause resolves such keys
against the git-tracked file set (a deleted file cannot keep a registration)
instead of the taxonomy tree. Coverage and consumption clauses are
unchanged — they govern taxonomy fields.

### D-J — Reserved: change_id (declared-not-proven, ledger D-001 ii)

The registry schema reserves room for a stable change-identifier should one
be introduced later. No day-1 persistence contract is invented now.

## Consequences

- Classification becomes reproducible: the same committed inputs produce the
  same classes; label churn from ref choreography collapses into the
  `reachable_via` qualifier, where it is visible but harmless.
- Dead citations become a registered, auditable population instead of a
  label; the 2026-12-15 tide and audits can enumerate them mechanically.
- The orphan window has a deadline everywhere it is observed: transient →
  yellow-note → red leg; no indefinite warning sink.
- A doc citing a never-existent or now-purged object fails `--check` until
  disclosed in the registry — disclosure is the price of the cite.
- `refs/replace/` becomes usable for orphan resolution without leaking
  mutability into classification (`GIT_NO_REPLACE_OBJECTS=1` discipline).
- Wiring pin: `test/adr-0089-wiring.test.js`; acceptance battery:
  `test/orphan-cites.test.js` (real-git fixtures via
  `test/helpers/git-hermetic.js`, ~5% fault-injection seam through the git
  facade, injected `now()`).
- This ADR joins the countersign queue (bare `- Status:` approval-surface
  form, ERRATA E-13 queue 20 -> 21 with this entry) — pending entity-level
  adjudication, never self-certified.

## Cutover notes (landed with the migration commit)

- **Registry self-citation**: `docs/governance/orphan-cites.json` is exempt
  from the doc-citation scan (alongside `docs/rewrite-map.json`). Its hex
  literals — `cited_sha`, `snapshot.parents`, `successor_sha` — are payload
  fields, not claims; scanning them would chase every registered orphan's
  unreachable ancestor chain into the map.
- **Token-to-entry adjudication order**: exact `cited_sha` match wins over
  prefix expansion; prefix expansion across several distinct cited_shas is
  ambiguous only when their latest entries' dispositions differ (same-verdict
  collisions still answer) — ambiguity can only be allowed to fail closed,
  never to shadow a same-verdict registration.
- **Purge observations**: a registered live-snapshot object that later
  disappears from the object store gets an appended degraded entry carrying
  `object_purged_at` (backfill re-run writes it) — marked, not fresh damage;
  an unmarked purge is a leg violation.
- **Migration diff (v1 → v2)**: `local-only` collapsed 1040 → 7 rows
  (dead-token labels became `orphaned-cite` under registry coverage, 1035
  rows), `unresolved` 618 → 0, schema_version 1 → 2, every row gained the
  `qualifiers` block.
