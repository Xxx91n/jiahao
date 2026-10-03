# ADR-0093: Observer Equivalence Contract — Byte Surface, Instrument Non-Intrusion, Claim-Surface Role Separation, and Generation Surface (grill-t36)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-10-02
- Ledger: `.scratch/grill-t36/decision-ledger.md` — D-001 (revised: the member table is amended by D-003), D-003..D-007 (all current)
- Spec: `.scratch/grill-t36/spec-t36-observer.md` §2-§5 (the sole implementation specification)
- Amends: ADR-0092 D-M1 — the two blind spots that clause declared open are the subject of D-1 and D-2 below
- Relieves: the filename selectors registered by ADR-0091 D-E and ADR-0092 D-S1 (see D-5)

## Context

The round object is one sentence: **the observer is part of the observed — assert
it.**

Four separate defects in this repository's own governance machinery shared one
shape, and not one of them was a bug inside a check. Each was a check whose
_observation surface_ was narrower than, or different from, the surface its
verdict was spoken about.

1. **The corruption scanner's blast radius was smaller than its name.** ADR-0092
   D-M1 declared two blind spots open rather than papered over them: callers
   chose which files were scanned, and at the M-7 measurement no caller scanned
   `scripts/**` at all; and the signature set had no branch for a mid-file
   U+FEFF. That declaration is why the two holes were locatable at all.
2. **The instrument mutated the tree it measured.** `scripts/check-g6-publish.js`
   overwrote `bench/research/out/g6-publish-replay.json` on every run, so a gate
   leg dirtied a tracked file as a side effect of observing it. The recorded
   `tarball.size` in the committed log described an earlier tree than the one
   shipping it, and no leg asserted that the recorded value equals a fresh
   measurement.
3. **Role was inferred from filename shape.** `check-audit-surface` and the
   post-land sentinel's closeout selector both decided what an artifact _was_ by
   matching its name. A file asserting examiner status without carrying the token
   was invisible to the very leg whose job is to police the audit surface — the
   trust-domain forgery boundary sits in the consumer, not in the label.
4. **The generator read a wider scope than its assertion target.** The t35
   landing closeout produced _phantom rows_: `build-rewrite-map.js` ran against
   the GitButler workspace merge tree, enumerated citations from files on
   unlanded lanes through `git ls-files`, and baked those citations into a map
   that claimed to describe the landed public tip. The public leg caught it (209
   rewrite-map-published). D-002 registered it as `defer+reason` against this
   round rather than fixing it inside a repair wave, because the fix is an
   enumeration-surface and tool-contract change, and those ride a declaration.

Three properties made the class durable enough to need a contract rather than a
habit. The multi-lane landing model means the tree a gate observes and the tree
the public receives are different objects. The documentation surface grows during
landing, so an artifact committed inside the tree it describes can invalidate its
own description. And every one of these checks was **green and correct about the
wrong object** — none of them failed, which is exactly why each survived a
battery.

What follows binds the four into one contract with four members, M1 through M4.
Each member carries a numbered declaration, and this ADR counts those
declarations under its own `N of M` total, independent of ADR-0092's existing
count: this ADR adds to the governance surface, it does not renumber what is
already committed. The defer-0030 subordination strengthening distributed across
the members below is a real declared subject of this ADR, required by spec §9,
but it is prose inside these declarations rather than a separately numbered one.

## Decision

### D-1 — Byte-surface equivalence: the enumeration surface

**Declaration 1 of 6 — the enumeration-surface contract change is declared here,
not made silently** (grill-t36 D-004, wave one; Δ2).

The scanner's caller-selected scope is withdrawn. The enumeration surface becomes
every tracked text file in the tree:

- **Primary criterion** — the `gitattributes` `text` attribute. **Fallback** — NUL
  sniffing, for files no attribute speaks for. **Disclosed skip** — oversized
  files are skipped, and the skip is a _disclosure of a capability boundary_, not
  an exemption. The boundary is named here on purpose, so the skipped set cannot
  rot into a silent allowlist; `check-secret-scan`'s oversized disclosure is the
  in-repo precedent.
- **One implementation, `trackedTextFiles(root)`**, in a shared library. Callers
  pass a root and nothing else. A caller that may narrow the surface is the
  **The consumer surface and the base are declared, both sides.** This
  enumeration base (index UNION tree, via `trackedTextFiles`) is shared with the
  M4 generation surface (D-6). The M2 tracked-surface snapshot (D-4) uses a
  different base: `git ls-files` (index only), because it runs inside gate
  execution where the working tree IS the index being mutated. Naming both bases
  and both consuming sides here is mandatory: an M4 fix that arrived as a silent
  beneficiary of a widening recorded here would be an unregistered contract change,
  and the defer-0030 subordination would be weakened without a line of it being
  edited. Three widenings are declared independently — the any-offset FEFF
  predicate, the bidi family, and this full-surface enumeration — so that no
  single label can be read as covering two of them (ADR-0083 D-003, dual-reading).

The assertion leg extends the existing surfaces rather than opening a new one: the
jest wiring pin's enumeration regular expression is replaced by
`trackedTextFiles()`, `check-post-land`'s subset is replaced likewise, and
`post-land-sentinel.test.js` gains positive and negative FEFF/bidi fixtures with
byte-offset assertions in the p-3 regression-lock shape. The blocking tier does
not drop.

**Wording discipline, the highest-risk clause in this section.** The two blind
spots ADR-0092 D-M1 named are closed by this declaration. The class they were
instances of remains open: known instances are repaired, never closed. Any
sentence that merges the two violates this ADR, and the prohibition runs in both
directions — declaring the holes closed does not license claiming the class
closed, and knowing the class stays open does not license leaving the named holes
open.

Amending ADR-0092 D-M1's declaration paragraph into the closed state is a
mandatory item **inside** the implementation wave, not a deferrable follow-up:
while two ADRs describe the same blind spots in different states, both readings
are available and ADR-0083 D-003's dual-reading ban applies.

Rejected and recorded, so a later reader does not re-open them by accident:
enumerating by file-extension set; pure sniffing with no attribute criterion;
path-carve-out exemptions; an in-code allowlist; opening a new `gates.json` leg
(the visibility argument would put it near order 232 and would need an ADR-0076
D-B carve-out); demoting blocking to advisory; regenerating the ratchet every
wave; and admitting the zero-width family.

### D-2 — Byte-surface equivalence: the signature set

**Declaration 2 of 6 — the signature-set contract change is declared here, not
made silently** (grill-t36 D-004, wave two; Δ2).

### D-3 — Instrument non-intrusion: the replay-log artifact contract

**Declaration 3 of 6 — the artifact contract registered by ADR-0065 D-B.3
changes here, and the change is declared rather than made silently** (grill-t36
D-006; Δ2, channel one of two).

`scripts/check-g6-publish.js` stops overwriting its own evidence. The default path
computes and does not write: the replay is generated to memory or to a temporary
surface, diffed against the committed artifact, and a mismatch exits 1. An
explicit `--write-log` mode writes. This is the `prettier --check` / `--write`
family: verification and mutation are two commands, not one command with two
outcomes.

**Artifact semantics, adjudicated rather than assumed.** `bench/research/out/g6-publish-replay.json`
is a _derived evidence log_, not a locked baseline. The locked baseline is
`g6-publish-fixture.json`, which ADR-0050 makes append-only. A compare failure is
therefore an **evidence-staleness alarm** — the committed log no longer describes
the current replay, so it is explicitly regenerated and committed — and **not**
replay drift; replay correctness is asserted at tiers a/c against the fixture.
`scripts/build-round-facts.js:62` reads this file as a fact source, which is what
decides the next point: **rewriting the ignored location is rejected**, because
that would move the evidence out of the tree under judgement.

The `gates.json` `_doc` text for the g6 leg is updated **in the same commit** as
this declaration. Otherwise the gates-coupling and alignment legs go red on a
text mismatch — fixing the lesion would redden an unrelated leg, which is the
self-referential entanglement this ordering exists to prevent.

The currently dirty `g6-publish-replay.json` is material evidence from the t35
round, not noise. Its disposition is an explicit regeneration commit, or being
finalized by the repair commit itself. Discarding it, or leaving it dangling, is
forbidden.

### D-4 — Instrument non-intrusion: the tracked-surface wrapper

**Declaration 4 of 6 — the wrapper contract changes, and the shared enumeration
base with D-1 is declared here** (grill-t36 D-006; Δ2, channel two of two).

The assertion lives at `scripts/run-gates.js` as wrapper-level instrumentation.
It is **not** a new `gates.json` leg, and the reason is an observation-point
argument rather than a visibility one: a leg is structurally unable to observe the
other legs, and an observation point in the wrong place is the same argument that
rejected a CI leg in t35-D-L1. These two rejections are the same in shape and
different in substance — one is about where a thing can see, the other about who
can see what — and they are written separately here so they are not read as one.

- **Entry zero point.** At `gate:all` entry, take a tracked-content hash baseline
  of the **current working tree**. The assertion is "this run mutated no tracked
  file", not "the tree is clean". A pre-existing dirty surface is registered as
  the zero point verbatim — neither penalized nor swallowed — which is what keeps
  this compatible with the standing obligation never to discard blindly.
  **The secondary form was not activated.** M2 lands in its primary form. The
  D-001 secondary-form clause — ignore paths plus independent assertions over
  committed values, where the independent assertion must read the _committed_ value
  — is not activated by this ADR, and it is retained forward-only rather than
  deleted. Its two clauses survive unexercised: a write to an ignored path does not
  count toward the wave's last-claim-mutation timestamp arithmetic, so ignoring a
  path cannot mask a claim by moving the clock; and an ignored-path artifact does not
  enter the split-form evidence count. A reader who finds these clauses here should
  know they describe a road not taken, not a rule in force.

Whether the implementation wave lands this wrapper before the claim wave or
alongside it is an owner discretion point.

`check-test-git-hermetic` (order 222) is the sibling-leg precedent: jest
hermeticity and gate-orchestration hermeticity are different observation points
and neither substitutes for the other. The implementation wave reads that script's
internals before fixing the wrapper's shape, since the base may be reusable.

### D-5 — Claim-surface role separation: the role registry

**Declaration 5 of 6 — the enumeration-surface and consumer contract changes here
are declared, not made silently** (grill-t36 D-005; Δ2).

Role attribution moves from filename pattern to a **committed registry**,
`docs/governance/claim-surface-roles.json`, mapping path to a role in the closed
enum {examiner, implementer, mechanical}. `check-audit-surface` (order 229) and the
post-land sentinel's closeout selector consume the registry instead of matching
filenames.

- **Unregistered claim-surface artifact = red.** This is fail-closed, and it is a
  _reverse_ assertion. The anti-forgery boundary lives in the consumer: a file
  claiming examiner status that has no examiner row in the registry is invisible
  to leg 229 by construction, so asserting the registry cannot catch it and only
  the fail-closed direction can (SLSA's Mini-Shai-Hulud lesson: inside a trust
  domain, a declared fact is not a verified fact). A new artifact and its registry
  row land in the same commit.
- **Anti-self-labelling.** Rows in the examiner class enter an exception-channel
  lifecycle (`requested_by` / `expires_at` / owner-ratify): the agent may request,
  never self-certify — the ADR-0086 form, "the agent registers and reports; it
  never self-certifies". The effectiveness gate may hang on countersign
  completion, making the second pair of eyes a precondition of the row taking
  effect rather than a parallel system. Each row carries `declared_by` as well, so
  the declaration rests on two surfaces, in the same shape as git's
  `author`/`committer` pair.
- **Field-level governance, three classes, inherited from ADR-0086.** The
  path→role mapping is **fenced**. Adding or removing examiner rows is
  **exception-channel**. `_doc` / `source_adr` / `schema_version` are
  **Migration is a single commit, no coexistence window.** The filename regular
  expression and the registry leg retire together. Two mechanisms reading the same
  surface across a window is dual reading, which ADR-0083 D-003 forbids, and a
  coexistence window is how a registry comes to be trusted before it has been
  tested.

**Selector release, named.** The filename selectors registered by **ADR-0091 D-E**
(the audit-surface coverage extractor and its checklist consumer) and **ADR-0092
D-S1** (the post-land sentinel's closeout selector) are superseded: role
attribution is now registry consumption, not pattern matching. The named path
enumeration `CLAIM_RE` is **retained** — a range assertion is not a role
assertion, and dropping it would widen what the sentinel treats as claim surface.
Filename freedom is thereby restored: naming an artifact no longer changes its
governance, which is the end of the lesion.

Rejected and recorded: front-matter self-declaration (a self-labelling hole, and
it widens the enumeration surface); directory split (the same disease in new
clothing, plus `CLAIM_RE` hardcoding migration cost); filename-token
strengthening (already disconfirmed in t35); a grandfather exemption (leg 229 is
blind to all history, and a wildcard exemption violates the exemption rule); and
the ratchet-backfill shape (M3's problem is wrong sampling, not noise — a
different disease from M1's baseline, and the mechanism does not transfer).

**Expected growth of the closed set is pre-registered**: owner discretionary
decisions, `second_reviewer` countersign records, and similar classes may need
rows. The closed set does not open on convenience.

### D-6 — Generation-surface equivalence: the generator's read scope

**Declaration 6 of 6 — the enumeration-surface and tool-contract change is
declared here, not made silently** (grill-t36 D-003; Δ2).

**The generator's read scope must equal the object its assertion is about.** This
is the generator-side extension of D-PRE's principle that an object is named by
its assertion context.

The defect it answers is phantom rows: `build-rewrite-map.js` enumerated
citations on a merge tree containing unlanded lanes (`git ls-files` union
`ls-tree HEAD`), baking references to files that never existed publicly into a
map that claimed to describe the public tip. The public leg detected it; D-002
registered it as `defer+reason`, and this declaration is where that obligation is
discharged.

- **Primary fix** — bind the enumeration surface to the assertion object: the
  generation path moves to the `scanDocTokensAt`-shaped tree-internal form. The

## Known limitations

### L-1 — The block cannot describe the map that covers it

A `post-land-verify` block can never describe the rewrite-map that covers it, in
the same family as the fact that a commit cannot contain its own sha. This is a
structural property of a self-describing instrument, not a defect awaiting a
fix, and it is registered here rather than in `CONTEXT.md` because decontextualized
canonisation amplifies exactly the misreading this round named: a reader would
take it for a repairable bug and go fix it.

**Boundary restated, in both directions.** The claim is scoped to the
block↔map pair and to nothing else. M4's generator defects are ordinary
repairable defects and are required to be repaired — C2's do-not-fix clause is
barred from the map generator (D-6).

**Forward pointer.** If a second self-covering instance of this shape appears,
promotion to a `CONTEXT.md` term is considered at that point. Not before.

### L-2 — What each member does and does not close

- **M1** — the named blind spots are closed by declaration; the byte-corruption
  class remains open. Repaired, never closed.
- **M2** — the assertion covers the window it runs in and nothing outside it. A
  narrowing, not a closure.
- **M3** — the registry's fail-closed direction catches an unregistered claim
  artifact. It does **not** make role attribution forgery-proof: inside one trust
  domain a declared fact is not a verified fact. The anti-forgery guarantee here
  is partial technical independence at most, and the countersign is an
  effectiveness gate on a row, not a semantic guarantee about its content.
- **M4** — genuinely closable: the phantom-rows shape stops being generable. This
  is stated separately from M1 precisely so the two closability claims are never
  read as one claim.
- **Oversized tracked text files** remain unscanned by M1, by declared capability
  boundary. The disclosure is the boundary; nobody may convert it into a quiet
  allowlist.

### L-3 — An unrelated whole-repo snapshot is not covered by the never-commit

convention

`.scratch/grill-t6/audit/b7ccbeb/` is a whole-repo snapshot from an earlier
round, tracked as-is; it is neither an audit-evidence capture tree nor a
claim-surface artifact, so the nc-001 ignore pattern (`.scratch/*/audit*-evidence/`,
`.scratch/*/audit-backup/`) does not and must not cover it. It is registered
here as its own residue class so the non-coverage reads as a decision rather
than an oversight. Disclosed hazard, not a defect to repair: the snapshot
carries a jest-haste-map naming-conflict history, so a residue class that no
automated rule governs is also a class nothing watches. Any future disposition
of it is an owner act.

## Consequences

- The observation surface of every mechanism this ADR touches is now named by a
  declaration, and three of them (tracked-text enumeration, the claim-surface role
  registry, the wrapper's tracked-surface assertion) plus M4's `generated_from`
  field are new enumeration surfaces entering second-party audit scope under
  defer-0030.
- A caller can no longer narrow a scanner's scope, so a governance script in
  `scripts/**` is scanned like any other tracked text. That is the intended
  strengthening and it is also the one that put `scripts/**` inside a scanner
  that lives in `scripts/` — a self-referential expansion of the assertion
  surface, which is why the defer-0030 restatement appears in D-1 rather than
  once at the end.
- The g6 replay log stops being rewritten by the act of checking it, so the
  round-facts fact source stops drifting under its own consumers.
- Filename tokens stop carrying governance meaning, which retires the incentive
  to encode role in a name and removes the class of artifact whose name lied about
  its content.
- The map stops describing trees it never read, so a public map's coverage claim
  becomes checkable against a named tree rather than against whatever workspace
  happened to be open.
- Cost, recorded because it was previously unbounded: a full-surface scan plus a
  per-leg snapshot is more work per gate run than either predecessor. The ratchet
  baseline bounds the first at the size of the committed baseline; the wrapper's
  per-leg checkpoint bounds the second at leg count times tracked-file count.
- Residual, registered not closed: the items in L-1 and L-2, and the oversized-file
  capability boundary.

## Human-only adjudication points

Errata adjudication, registry row deletion, examiner-row grant, countersign
completion, and the decision to promote L-1 to a `CONTEXT.md` term are OWNER acts.
This ADR's machinery reports state; it never issues those verdicts. The agent
registers implementer and mechanical rows and reports; it never self-certifies an
examiner row, and no statement in this ADR should be read as granting that
authority.
file already carries two read disciplines, a merging-tree `scanDocTokens()` and
a tree-internal `scanDocTokensAt(root, ref)`; they unify onto the tree-internal
form.

- **Secondary fix** — the derived artifact carries a `generated_from:{tree-ish,
mode}` provenance field, in the buildinfo shape. This turns "which tree does
  this map describe" into a machine-assertable self-certifying hook for
  `--published-only` (SLSA's `completeness.materials` and Quarkus's SBOM, which
  split manifests by assertion purpose, are the precedents).
- **Lane isolation is demoted to an optional discipline**, not an independent fix.
  A discipline can be bypassed; a contract cannot. Same reasoning as ADR-0083 D-C.

**Boundary against M1's closability, stated because the two are easy to conflate.**
M1 pins "repaired, never closed": a self-asserting scanner is one step short of
its own object by construction, so its residual is structural. M4's binding
assertion is machine-decidable and **can be genuinely closed** — the phantom-rows
shape stops being generable. The two forms are different in kind and **must not
be worn interchangeably**: an M4 fix does not make the byte-corruption class
closable, and M1's never-closed residual does not license leaving a generable
phantom row in place. Equally, the ratchet-baseline mechanism does not transfer:
phantom rows are a false-positive red leg, not always-green noise.

**Boundary against the C2 self-reference clause.** Phantom rows are an ordinary
repairable generator defect. The C2 clause — that a structural drift number must
not be "fixed" — does **not** apply to the map generator and may not be cited
there.

**The legitimacy boundary criterion.** A tree has no absolute legitimacy: the
legitimacy of an asserted object is a function of the assertion context, i.e. of
which object the consumer is authorized to judge. `pre_land` reading the merge tree
is legitimate; map generation reading the merge tree is not. Same tree, different
assertion domain — that is the boundary, and it is why "the tree was fine" is not
an answer.

<!-- APPEND-MARKER -->

**editorial**.

- **The registry is a declared-facts surface, not a derived one.** Role attribution
  is a discretionary fact with no mechanical source — if it were derivable, M3
  would not exist. It therefore carries **no `generated_from` field**; adding one
  would be dressing a declaration as a derivation. A rule change rides a
  Declaration; adding a row of an existing role rides exception-channel plus the
  tide. The two layers are written apart on purpose, because fused they produce
  either frozen governance or silent governance.

**Backfill** is one commit registering every existing implementer and mechanical
artifact. It is a semantic registration, not a pardon: commit-date effectiveness
does not reach backwards to absolve. The registry absorbs the ratchet's
monotonicity: **rows are only added, never deleted**; deleting a row requires the
owner plus Δ2; a row may be archived but not erased, because honest history
requires the row to remain readable.

**Mixed-role artifacts carry a split obligation.** An artifact that contains both
examiner prose and a mechanical or implementer payload is split into two
artifacts, each separately registered — the SOC2 evidence-separation principle
applied to workpapers. One file cannot hold two roles, because the registry maps a
path to one role and a lie-by-omission is exactly what M3 exists to make
impossible.

**The registry is itself an asserted object.** Every registered path exists in the
tree, every claim-surface artifact has a row, and every role value is inside the
closed enum. The assertion leg is a new leg or joins the order-221 family; that
placement is an implementation-wave decision.

**Defer-0030 subordination restated.** The registry is a new enumeration surface
and enters audit scope. The direction of the change is the tightening one:
examiner artifacts and the second-party audit are bound more tightly to each
other, not less.

<!-- APPEND-MARKER -->

- **Per-leg checkpoints.** Recompute after each leg. Attribution granularity is
  two-layer — leg number plus file. The changed-path list is not expanded into a
  full diff.
- **Snapshot object** — the whole tracked tree (`git ls-files` index∪tree plus
  content hash, the same enumeration base as D-1's `trackedTextFiles`). The
  untracked surface is excluded by construction; ignoring untracked files is the
  ignore mechanism's existing division of labour, not a narrowing of this one.
- **Result line.** A synthetic `[- tracked-surface]` PASS/FAIL row enters the
  results table. Its tier is **confirmatory blocking** and does not drop to
  advisory.
- **No "legitimate tracked write" exemption channel.** The legitimate exits are an
  ignored path or the compare form of D-3. A gate leg that must write to a tracked
  path has a contract problem, and the exemption would be where it went to hide.

**This Declaration is a precondition for the satisfiability of the E-19 settled-
tree evaluation.** The interval between a workspace rewrite and its evaluation is
the F-6 exposure window; an evaluation performed inside that interval measures a
tree that is no longer the tree the wave settled on. Landing this wrapper is what
makes "settled" a checkable state rather than an adjective.

**Residual disclosure.** The wrapper asserts that nothing changed _inside_ the
window; it asserts nothing about outside the window. This is a narrowing, not a
closure, in the same shape as F-6's wording constraint.

<!-- APPEND-MARKER -->

- **Mid-file U+FEFF joins the set**, asserted as the byte-level `EF BB BF`
  triplet and **not** in the decoded-string layer — the p-3 two-unit lesson: one
  unit everywhere, or the reported offset is not replayable.
- **The FEFF predicate is explicitly widened to any offset**, by its own declared
  widening, separate from the two widenings named in D-1.
- **The bidi directional-control family is taken in by this same declaration, on
  purpose**: U+202A-202E, U+2066-2069, U+200E, U+200F, U+061C. Trojan Source
  (CVE-2021-42574) is the external class; the in-repo reason to act on it here is
  that _the rendering form of a governance document is the assertion carrier_, so
  a bidi sequence can reorder a sentence's visual meaning — "never closed" can be
  made to read as "closed" on the page, which is the one surface a reader trusts
  without inspecting bytes.
- **Not taken**: the zero-width family, U+00A0, and U+00AD. This is a bilingual
  repository and those have legitimate uses here; admitting them would violate the
  `measured, not guessed` criterion the ratchet baseline is registered under.
  They are registered for future evaluation in the deferral registry. The
  registered-set mechanism stays open — a new class is admitted by measurement,
  not by assertion.
- **Fixtures containing bad bytes travel the registration-exception channel.**
  Without it, a full-surface enumeration detonates the test fixture corpus.

<!-- APPEND-MARKER -->

original disease in a new location: an observer that selects what it will not
look at asserts about a sample while its verdict is phrased about the
population.

- **M1's base enumeration is `git ls-files` over the union of index and tree.**
  The index alone is not authoritative (t30 F-1 precedent), so the union is the
  floor and neither half may be used alone. This is the base for the D-1 static
  scan only (`trackedTextFiles`); the M2 runtime snapshot (D-4) uses `git ls-files`
  (index only), as D-1 declares. "The base enumeration" is therefore qualified
  wherever it appears — D-1 names both, and `doc-hygiene-baseline.json`'s
  `enumeration_surface.base` describes M1's scanner, not the wrapper's.

Existing violations are absorbed by a **committed ratchet baseline** at
`docs/governance/doc-hygiene-baseline.json` — an entry-type registration
exception — generated once with `--write` and re-verified with `--check` on every
wave thereafter. The baseline is regenerated deliberately, never per wave; a diff
of the baseline does not overwrite the baseline.

<!-- APPEND-MARKER -->
