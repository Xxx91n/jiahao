# spec-t32 — rewrite-map classifier declared-facts contract

Round: grill-t32. Sole authority: .scratch/grill-t32/decision-ledger.md
(D-001..D-006, all current). Every section below cites its ledger record.
This spec authorizes no implementation until owner approval.

## 1. Scope (D-001)

Single-object round: the rewrite-map classifier contract — an atomic
bundle of three coupled changes that MUST land together:

- (b) classifier reads a declared-facts set; volatile reachability
  demoted to qualifier (D-002);
- (a) a machine-readable orphan-cite registry becomes a classification
  input and issues a stable terminal class (D-003);
- (c) editorial soft-constraint for new prose cites — carry
  subject/date context, NOT mechanized, no gate (D-001 negative
  clause: hard prohibition would weld disclosure completeness to link
  stability, two orthogonal goals).

Splitting the bundle creates an incoherent intermediate state
(registry ahead of classifier => registered orphans still red). No
partial landing.

### 1.1 Explicit exclusions (D-001 iii, verbatim scope)

- claim-duplicated vs correction-manifest: stays registered
  "judged no-fix" (decoupled code surfaces verified; no real
  correction demand; fix lives on the ADR-0088 surface anyway);
- settle-window leg stub; bypass hardening (awaits real bypass data);
- polygraph appendix; trial-results disposition (awaits owner report);
- advisory leftovers batch (repaired-round material);
- all owner-side items (tag push, 2026-12-15 tide rulings,
  ratchet-brake adoption).

## 2. Classification contract (D-002)

### 2.1 Declared-facts input set — exhaustive

The classifier is a pure function over exactly four declared facts:

1. the map's own pair/removed tables;
2. pinned published-tip ancestry set (rev-list of the pinned tip);
3. object existence via `git cat-file -e`;
4. orphan-cites registry membership.

Ref topology (`--all`, oldRefs-derived sets) EXITS the classification
path entirely. It may still be computed, but only to populate the
`reachable_via` qualifier column — written, displayed, never judged.

### 2.2 Class set

| class | derivation | notes |
|---|---|---|
| rewritten | pair table hit | unchanged |
| published-unchanged | pinned-tip ancestry hit | unchanged |
| old-side removed (local-only family) | removed table hit | stable derivation |
| local commit / local object | object existence | existence-based |
| orphaned-cite | registry membership | NEW terminal class |
| unresolved hex literal | not in object DB AND not registered | NARROWED; stays hard red |

`pre-purge object` (a ref-topology derivative) dies — its information
survives only inside the `reachable_via` qualifier.

### 2.3 Qualifier columns

Written into the artifact, displayed, excluded from `--check` equality:

- `exists_at` (classification timestamp) + object mtime;
- `reachable_via` (ref names through which the object was reachable
  at classification time, or empty set);
- `object_type`, `size` — recorded for human review (anti
  plant-laundering surface; cost ~zero).

Qualifiers get weak self-consistency validation (D-004 ii): a
non-empty `reachable_via` must not contradict a class that asserts
non-reachability.

### 2.4 Existence is a time-limited fact

Object existence is recorded with `exists_at`. A stale local object
beyond the reasonable-GC window may degrade to yellow/UNVERIFIABLE
(ADR-0040 three-state semantics); an object absent AND unregistered
stays hard red. The yellow downgrade applies ONLY to stale-existence;
absent-and-unregistered is never softened.

### 2.5 Negative requirements (D-002)

- ref topology must not enter classification;
- classification stays a pure function over declared facts;
- yellow downgrade only for stale local objects; absent+unregistered
  hard-fails;
- registry is append-only with justified entries (reason +
  registered_at).

## 3. Orphan-cites registry (D-003)

### 3.1 Artifact

New file `docs/governance/orphan-cites.json` — append-only, one entry
type, purely declarative fields (Rekor v1 type-explosion lesson;
no event stream). Structurally separate from the generated map
(regen would overwrite anything hand-written into it). Registered
day-1 as a `fenced` field-governance class under ADR-0086's
field_governance.classification (gate-consumed = semantic-bearing).

### 3.2 Entry schema

`{cited_sha, object_type, size,
snapshot:{subject, author, committer_ts, parents},
last_reachable_via, successor_sha|null, cite_locations[],
registered_at, reason, carried_log[], object_purged_at?}`

`snapshot` is materialized while the object is alive: the sha itself
is the content digest; snapshot fields exist so a human can identify
what the cite once pointed at. `carried_log[]` reuses the
deferred-registry convention. `object_purged_at` is an optional
observational field set when a registered object is later found
physically deleted.

### 3.3 Write path — explicit verbs only

- `node scripts/orphan-cites.js register <sha> [--successor <sha>]
  [--replace-ref]`: appends one entry. Before materializing, machine
  verification: successor exists + reachable, and snapshot fields are
  consistency-checked against the successor object. `--replace-ref`
  optionally materializes `refs/replace/`; if used, ALL classifier
  object reads MUST run with `GIT_NO_REPLACE_OBJECTS=1` (replace would
  silently redirect the old sha — re-introducing environment-driven
  classification through the side door).
- `node scripts/orphan-cites.js backfill [--dry-run]`: one-shot
  historical migration (D-004 iv). Idempotent; dry-run reports without
  writing; supports checkpoint cursor.
- The classifier NEVER writes the registry. Registration is a
  human/process act; detection hooks live in the post-restack /
  E-19 settled-tree flow (when `reachable_via` turns empty while the
  object remains present, that is the moment registration is due).

### 3.4 Adjudication rule

Multiple entries per cited_sha resolve by latest `registered_at`;
old entries remain history (append-only, never edited). Revival is an
appended entry — the classifier falls back to existence-fact
classification (orphaned-cite is a verdict on current fact, not a
permanent brand).

### 3.5 Separation of roles

Registry feeds the classifier (machine-readable, fenced).
ERRATA.md feeds humans (prose disclosure). Neither embeds the other.
`errata_exemptions` is NOT used for permanent orphan facts — wrong
domain (pin-file orphans), wrong lifecycle (expires_at/auto-lapse),
wrong class (exception-channel).

## 4. Lifecycle and gate semantics (D-004)

### 4.1 Three-stage escalation ladder

1. `reachable_via = ∅`, object present, under age threshold →
   silent (transient tolerance; `but` restack mid-states are normal);
2. `∅`, over age threshold, unregistered → yellow note/review
   ("orphan window open — register while the object is alive");
3. `∅`, past registration grace, unregistered → the standalone
   `orphan-registration` gate leg goes red (obligation-due assertion,
   separate from the map's `--check`);
4. object absent AND unregistered → hard red `unresolved` inside
   `--check` (fail-closed core, unchanged).

A warning without a deadline is suppressed debt — stage 2 MUST
escalate; no indefinite warning sink (FSE-2025 / Python
DeprecationWarning anti-pattern).

### 4.2 Leg separation

Map `--check` stays a pure artifact-consistency comparison (declared
facts only, hermetic). The `orphan-registration` leg asserts the
living obligation. The two legs must not be merged — artifact
equality and obligation-due are different assertion kinds.

### 4.3 --check comparison domain

Compared byte-stable: `class`, `pair`, `resolved_to`, `counts`.
Exempt from equality (still written, still weak-consistency-checked):
`exists_at`, `reachable_via`, `object_type`, `size`.

### 4.4 Backfill

Explicit subcommand, idempotent, dry-run first, checkpoint-capable.
Dead objects are registered in degraded form (`object_purged` mark +
ERRATA.md back-pointer). `--check` only reports backlog and suggests
running backfill — never mutates, never auto-registers.

### 4.5 Parameters

Age threshold and grace period are registered adjustable constants,
order of magnitude aligned with `gc.pruneExpire` (default ~2 weeks).
Initial values are set in implementation and named in ADR-0089.

### 4.6 Negative requirements (D-004)

- warnings must escalate; no indefinite warning sink;
- `--check` must not silently repair or register;
- transient restack states must not be punished;
- artifact-consistency and obligation-due stay separate legs.

## 5. Carrier and cutover (D-005)

### 5.1 ADR-0089 — new decision record

Title (tentative): `rewrite-map classifier declared-facts contract`.
MADR-style structure with a considered-options section recording
α/β/γ carriers and the research rationale. Carries the full contract:
declared-facts set, qualifier layering, registry reference,
orphan-registration leg + escalation ladder, backfill verb, --check
exemption domain.

### 5.2 ADR-0074 scoped pointer

0074 gets a scoped succession note naming only what 0089 supersedes:
the classification input surface and the class enum. The map artifact,
append-only discipline, and coverage invariant (every cited sha gets
a class) SURVIVE. Not a wholesale supersede — the pointer uses the
repo's existing pointer-note convention.

### 5.3 Countersign — dual track

0089 goes through the full countersign flow and joins the queue. 0074's
existing countersign lines stay verbatim (they honestly mean "that
version was approved"). Forbidden: copying the old countersign into
0089; back-signing 0074 for new semantics.

### 5.4 Mechanical registration batch

- field_governance.classification += `docs/governance/orphan-cites.json`
  as `fenced`;
- CLASSES enum += `orphaned-cite` (wiring points:
  test/rewrite-map.test.js CLASSES, test/adr-0074-wiring.test.js,
  test/map-freshness.test.js counts shape, scripts/build-rewrite-map.js
  classifier);
- docs/gates.json += `orphan-registration` leg;
- CONTEXT.md += crystallized nouns only: `Orphaned-Cite`,
  `Orphan-Cite Registry` — mechanism prose stays in the ADR;
- suite-count wiring sync.

### 5.5 Cutover — one atomic migration

Order: explicit backfill (registers all currently-orphaned cites,
live snapshots where available, degraded where purged) → classifier
landed → single full regen under new semantics → committed together
with the migration diff as a disclosure artifact (drift rows visible
one by one) + map `schema_version` bump. No per-row migration, no
dual-version coexistence — both are online-service patterns
inapplicable to a regenerable derived artifact.

### 5.6 Clone-face reshape

Published-side classes (rewritten / published-unchanged /
orphaned-cite-vs-registry consistency) become fully computable in a
clean clone — `--published-only` verifiability surface WIDENS.
Existence assertions remain maintainer-scoped (degrade semantics
under ADR-0040/0084 persist, restated honestly).

### 5.7 Negative requirements (D-005)

- no in-place rewrite of 0074's approved semantics;
- no countersign inheritance or back-signing;
- no hiding the migration diff — drift is audit-visible fact;
- no per-row migration or dual-version coexistence.

## 6. Acceptance battery (D-006)

### 6.1 Fixture shape

Real git fixture repos built through `test/helpers/git-hermetic.js`
(the test-git-hermetic leg already forces all test git writes through
it): real commits/refs, real ref-deletion orphans, real
`gc --prune=now` dead objects, real `git replace`, real partial
clone (`--filter=blob:none`). git calls in the classifier converge
behind a thin facade so failure modes are injectable.

### 6.2 Coverage matrix

- six terminal classes, positive and negative cases each;
- registry ops: register machine-verification (successor consistency
  pass / mismatch refuse), revived latest-wins, purged degrade;
- qualifier weak-consistency: reachable_via=∅ while class claims
  reachable → detected;
- escalation ladder: age-gate silent → over-age yellow → over-grace
  red, each stage asserted;
- backfill: idempotent second run (golden zero-diff), dry-run writes
  nothing, --check reports backlog without mutating;
- two-face comparison: class/facts quad byte-exact golden (no `-u`
  rewrite — drift goes through errata, not snapshot refresh);
  qualifier/timestamp via property-matcher or whitelist weak-
  consistency assertion;
- injected `now()` on classifier and legs — zero sleep, zero clock
  patching; fixture registry entries carry historical registered_at.

### 6.3 Adversarial set (red once each)

1. registry tampering detection (edit registered_at / delete entry →
   check catches it — the only case proving append-only is real);
2. registered object really deleted → purged marking;
3. abbreviated-sha ambiguity → fail-closed;
4. replace-ref isolation assertion (GIT_NO_REPLACE_OBJECTS honored);
5. resurrection adjudication (latest registered_at decides);
6. register/backfill idempotency + dry-run;
7. narrow clone case: partial clone where cat-file fails on a
   registered sha → degrade to explainable state, not "removed".

Dropped: ref/gc race fixtures (not deterministically manufacturable),
packfile corruption fuzzing (tests git, not us). Qualifier-drift-
without-class-change stays a normal regression case, one assertion.

### 6.4 Mock budget

Mocks/stubs only for the ~5% fault-injection seam: cat-file non-zero
exit, rev-list crash, registry I/O error. Verified-fake constraints on
stubs. No business semantics through mocks.

## 7. Declared items and residues

- change_id: declared-not-proven clause — registry schema reserves
  room for a stable change-identifier if one is introduced later;
  no day-1 persistence contract invented now (D-001 ii).
- errata_exemptions bare-sha bindings: same drift shape as the defect
  being fixed, but the channel is tide-bound temporary; registered
  here as an observation item for a future field-governance pass, not
  changed in this round.
- New prose cites SHOULD carry subject/date context (editorial
  soft-constraint, (c) of the bundle). Not mechanized; documented in
  AGENTS.md during the doc-sync task.
- Workspace housekeeping during implementation: root-level
  `map-before.json` and `map-committed.json` (D-011 debug residue)
  get removed.
- Observation for handoff: t27/t28 audit-handoffs untracked while
  t29/t30's are committed — asymmetry residue for a later ruling,
  not this round's object.

## 8. Verification gates

Implementation closes only with:

- `node scripts/build-rewrite-map.js --check` and
  `--published-only` clean under new semantics;
- `orphan-registration` leg green after backfill;
- full Jest suite green incl. new battery (suite-count wiring sync);
- run-gates exit 0;
- evaluateRound clean for the round's claims (E-17/E-19 wave-closeout
  order honored: rewrite-map regen LAST, then --check, then declare).

Artifacts:
- ledger: .scratch/grill-t32/decision-ledger.md
- this spec: .scratch/grill-t32/spec-t32-classifier.md
- task book: .scratch/grill-t32/handoffs/next-round.md
