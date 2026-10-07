# ADR-0100: Mutable Claim-Surface Governance — The Append-Only Round-Frozen Task Book, the Pointer Degradation, the Drift-Declaration Registry as a Classifier Input, and the Gate-Close Condition (grill-t39)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-10-07
- Ledger: `.scratch/grill-t39/decision-ledger.md` — D-002 (current), D-007.1/.2, D-008.2/.5; round scope D-001.2 (the S-224 line)
- Spec: `.scratch/grill-t39/spec-t39.md` — §S-2, §S-7 (the sole drafting specification; not an authority source)
- Supersedes (scoped): ADR-0085 D-D.2's `claim_surfaces` **exception scope** only — the literal-path exception on `handoffs/next-round.md` narrows to the single pointer line, and round-frozen task-book files enter the claim surface. ADR-0085's two-layer anchor semantics, its `rounds[]` registry, and every other clause stand unchanged, and **ADR-0085 is not edited** (the ADR-0089-on-ADR-0074 scoped-succession form).
- Relates: ADR-0086 D-A (fenced-field governance — the channel this narrowing rides), ADR-0089 D-A/D-D (the declared-facts input set this ADR extends; the register-verb discipline it copies), ADR-0093 D-4/D-6 (declared facts and the legitimacy boundary), ADR-0095 D-B (the same-commit clause), ADR-0098 D-G (the sibling enumeration-surface boundary, drawn from the other bank), ADR-0092 D-M2 (why the per-commit embedded form was withdrawn and must not be re-minted)

## Context

The rewrite map's tip-coverage authority (ADR-0092 D-M2 / grill-t35 D-005) asserts that the
map committed at the published tip covers every citation appearing in any claim commit on
the line. The assertion presumes the cited **file** keeps the cited **line**. One surface in
this repository violates that presumption by design: the standing next-round task book,
`.scratch/grill-<id>/handoffs/next-round.md`, is rewritten every round — it is the round's
handoff to its successor, and rewriting is its function.

This is not hypothetical; it is the live red on gate leg 224 at the time of drafting
(run_id
`gates.f41af2f7bfdc61b74f4dcbebfaa841e79066533c.HEAD.dirty.2026-10-07T06-52-44.620Z`,
gauge: the `map-freshness` leg's own FAIL line, order 224): four claim commits cite lines
45 and 86 of `.scratch/grill-t38/handoffs/next-round.md`, and the file's current version
carries **no** hex citation at all — 103 lines shrank to 40 in the grill-t38 finalization
commit `fa654a05` (2026-10-06, "grill-t38 定稿归档"), leaving **8** uncovered union rows
(2 distinct `file:line:cited_sha` facts × 4 claiming commits)
(gauge: `check-map-freshness.js` `checkTipCoverage().missing`, same run_id as above).

Any "recompute the map → land it" loop re-opens this hole at the moment of landing, because
the next round rewrites the file again. The defect is therefore **structural**: a mutable
event source was being consumed as if it were an immutable one.

## Decision

### D-A — The task book becomes append-only and round-frozen

- **Round-name freeze.** A task book is created once per round and is **never rewritten**.
  Successive rounds author new files; old ones stay byte-stable as history.
- **The fixed-name file degrades to a single-line pointer.** `handoffs/next-round.md` keeps
  its name and loses its content: one line naming the dated authoritative file. This is the
  W3C dated-version / latest-version dual-URL shape (cited at search level, ledger D-002
  honest gap): the stable address resolves, the dated address is the record.
- **Why, in one sentence:** *a materialized view must not overwrite the event history it
  projects* (event-sourcing). The pointer is the materialized view; the dated files are the
  events.
- **Coverage is deliberately minimal.** The only surface this clause governs is the
  fixed-name `next-round.md` face. Specs, reports, and dated handoffs are already unique-named
  and are untouched — widening past the measured hole is the over-codification this
  repository's own bound forbids.

### D-B — The fenced narrowing, and the channel it rides

Putting round-frozen task books **on** the claim surface and narrowing the exception to the
pointer line is a change to ADR-0085's `claim_surfaces` fenced enumeration. It therefore
rides the ADR-0086 D-A channel: **an ADR (this one) plus a countersign**, and it may **not**
be landed as a task-book convention edit. The countersign is pending the 2026-12-15
entity-level tide; the narrowing is not self-certified.

Mechanically this is a scoped succession, declared here and **not** written into ADR-0085's
body (the ADR-0089-on-ADR-0074 precedent): ADR-0085's approval surface is not edited by its
successor.

### D-C — The Drift-Declaration Registry (漂移声明注册表)

Existing drift is cleared by a registry, `docs/governance/drift-declarations.json`.

**Statutory wording (the only permitted form):** a *登记的行级漂移声明* — a registered
line-level drift declaration — *consumed by the classifier as a declared fact*. The words
**豁免 (exemption) and waiver are forbidden** for this artifact (ADR-0093 D-4's wording law;
D-002.3). Naming matters here because the artifact is permanently adjacent to a bypass-shaped
hole.

**Placement — the decisive design point.** The registry is a **classifier input**, not a leg
predicate. It joins the ADR-0089 D-A declared-fact set as the registered-drift fact, and the
generator materializes declared occurrences from it into the same occurrence set the tree
scan produces. It is **not** an exemption branch inside `check-map-freshness.js`: a bypass in
the judging path is an always-open escape hatch, which is precisely the rejected pure-(b)
form.

**Entry shape** (append-only; entries are never edited or deleted; supersession is a newer
`registered_at` entry, exactly the ADR-0089 D-D form):

```
{ id, file, line, cited_sha,
  cited_by: <claim commit sha>,
  overwritten_by: <commit sha that removed the line>,
  cite_locations: [ { file, line, text: <restored line verbatim> } ],
  registered_at: <ISO date>, declared_by, reason }
```

- `registered_at` **replaces** `expires_at`. There is **no TTL and no auto-lapse**: a
  registered historical fact does not expire, and a lifecycle that silently lapses is the
  rejection reason for reusing `errata_exemptions`.
- The **overwriting source commit** and the **restored line text** are mandatory per entry:
  an entry that names only a gap is a claim, while an entry carrying the bytes that were lost
  is evidence.
- **Deduplication rule, stated because "8 rows" and "2 rows" are both true:** eight
  declaration entries are registered (one per claiming commit, satisfying the ledger's
  逐条登记), and they materialize into two map occurrence keys (one per
  `file:line:cited_sha` fact). One fact asserted by four commits is one fact with four
  claims, not four facts.

### D-D — The gate-close condition (pre-registered, mechanical)

Without a closing condition, D-C silently degrades into a standing channel. So:

> **Any registry entry added after the landing commit is a red-level signal** — it indicates
> the append-only discipline (D-A) has been violated.

The anchor is **derived, not declared**: the landing commit is the commit that *added*
`docs/governance/drift-declarations.json`, resolved by the same `--diff-filter=A` mechanism
`check-map-freshness.js` already uses for its own registration anchor. A registry cannot name
its own commit, and no self-referential field is invented.

### D-E — Atomic landing (one commit)

**The authority pair (declared, ADR-0095 D-A form).** Leg 224's authority source becomes
**ADR-0092 D-M2 + this ADR (D-C/D-D)**: the tip-coverage *semantics* stay ADR-0092's, while
the input set it judges and the closing condition on that input are legislated here. The
declaration is additive and `docs/gates.json` keeps the single `source_adr` value it already
carries, because `source_adr` is a fenced governance field whose array form needs an ADR plus
a countersign (ADR-0095 D-A) - which this round does not have and does not pretend to have.

The (a) half (append-only reform) and the (b′) half (registry + classifier input) land in
**one commit**, per ADR-0089 D-G's backfill → classifier → regen family and ADR-0095 D-B's
same-commit clause. Splitting them re-creates at landing instant the leg-208/224 red-green
treadmill this round exists to end — the two halves are one contract seen from two sides.

Inside the commit the **step order is legislated** (D-007.2): narrative and mechanism first,
derived artifacts last, with `docs/rewrite-map.json` regenerated as the final step, then
`--check` and `--published-only` both clean before any declaration. **"Narrative first,
derived second" is a step order plus adjacent-commit order; it is never a licence to break
the atomic commit apart.**

### D-F — The existing population, measured

Measured at drafting time rather than assumed:

- the two distinct line facts are **both** recoverable from commit `32af9b5f` (2026-10-05),
  whose version of the file still holds line 45
  ``(`68c8ec2f`, grill-t29 evidence) transiently falls out of ancestry during`` and line 86
  ``- `main` after landing: t35 closeout base `0f58ba60` + all t36/t37 lane``;
- the overwriting commit is `fa654a05` (2026-10-06, grill-t38 定稿归档);
- both cited objects exist and are ancestors of the published tip, so the materialized rows
  classify as `published-unchanged` — the drift is in the **citing line**, never in the cited
  object;
- the residual recorded in the ledger ("2 of 8 restored, 6 to verify") is now **closed by
  measurement**: the remaining six are the same two line facts re-claimed by the other two
  commits, and all eight entries are registrable from `32af9b5f`. This narrows the ledger's
  gap statement by evidence; it does not revise the decision.
- `fe190b65` (2026-10-04) stays on the **existing orphan channel**: it is re-registered
  through `scripts/orphan-cites.js register`, an explicit verb — and it is **not** folded
  into this adjudication, because it is an independent mechanical fact (D-002.6).

### D-G — The boundary sentence (registered, not self-reversing)

> Registration adjudicates **the line-level fact at the observation time point** — the line
> disappeared because of a declared overwrite. It does **not** issue a licence for a breach.

The same shape was drawn in t38-D-003.6 (a residual window is a yellow disclosure plus a
pre-registered reopen, never an errata). Writing the boundary into the ADR body is what stops
a later reader from using D-C as a general-purpose "claims may go stale" clause.

### D-H — The dual-enumeration-surface boundary argument

This round opens two new enumeration surfaces that must not be read as one family
(the grill-t37 D-001 M-D constraint). The table and the four axes of difference are written
in ADR-0098 D-G and mirrored here from this side: this registry governs **claim-surface
history** (a red-level signal, consumed by the classifier, adjudicating a past line fact),
while the coinage triage channel governs **style triage** (an advisory list, generator-side,
adjudicating a living vocabulary obligation, with no blocking leg by design). The pairing is
registered as two force-fields, not as one "registry" theme.

## Consequences

- Tip-map coverage stops depending on a mutable file staying put; the historical line is
  carried by a declared fact instead of by the tree.
- The task book's append-only form becomes the standing contract, and the pointer keeps every
  existing reader path working (`handoffs/next-round.md` still resolves).
- Leg 224's pre-registered red window closes **only** at the D-E atomic commit: from this
  ADR's landing until that commit the red is disclosed, expected, and not repaired by hand
  (D-008.4 — intermediate commits may be red).
- The wiring pin is `test/drift-declarations.test.js` plus the leg-224 fixtures in
  `test/map-freshness.test.js`, which must cover **both directions** — a red-side fixture
  proving the check still bites when an unregistered line vanishes, and a green-side fixture
  proving a registered declaration clears it (a one-sided fixture would test only the fix).
- **Red-light response stays a human call:** a gate red on the orphan-ancestry or
  drift-consumption path means no new claims and no seal; choosing rebuild / re-seal /
  declared-drift is an owner act (AGENTS.md post-restack ritual).

## Registered transfers (floor, not ceiling)

| Item | Exit | Content |
|---|---|---|
| the grill-t39-prep lane (`2df61d4e`, deliberately not landed) | **resolved by this ADR, item by item (D-007.1)** | `2026-10-07-loop-handoff.md` §7/§8 land with a trailing pointer line; the `rewrite-map.json` hunk is **discarded** and regenerated last inside D-E; the `orphan-cites.json` hunk is **discarded and re-done through the explicit `register` verb** — the registration surface is a deliberate act and must never be "regenerated" like a derived artifact (ADR-0089 D-D) |
| pointer-line exception ratification | **owner countersign queue** | D-B's fenced narrowing is pending-confirmation at the 2026-12-15 tide |

## Boundaries

- **Vetoes, recorded:** a pure in-leg exemption channel (a standing escape hatch, colliding
  with ADR-0093 D-4 and re-enacting a rejected lifecycle); a "one-off" waiver with no
  mechanical closing condition; **any** wording of this artifact as 豁免/waiver; treating the
  two halves as separable commits; and re-minting the withdrawn per-commit embedded-map
  invariant (ADR-0092 D-M2 — the class of invariant that cannot hold under multi-lane
  landing).
- **Refinement, not reversal:** D-001.2 framed S-224 as a two-way choice; D-002 (ratified as
  c′) is a **refinement** of that framing, and the ledger records it as such so the account is
  not double-readable.
- **Forward-only:** history is never rewritten to make old rows resolvable; the restored line
  text lives in the registry, and the historical commits self-heal through the tip map.
- **Honest gaps, registered not closed:** the W3C persistence-policy clause numbers were read
  at search level and betterer through a secondary layer (ledger D-002); the six non-distinct
  entries' byte-identity is guaranteed by reading them from one tree object (`32af9b5f`), which
  is evidence about that tree, not about any other lineage.

## Human-only adjudication points

The fenced narrowing's countersign (D-B), the pointer exception's ratification at the tide,
and any red-light response on the drift-consumption path (rebuild / re-seal / declared-drift)
are OWNER acts. This ADR's machinery reports state; it never issues those verdicts.
