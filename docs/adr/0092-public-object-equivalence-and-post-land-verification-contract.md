# ADR-0092: Public-Object Equivalence and the Post-Land Verification Contract (grill-t35)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return-by: 2026-12-15
- Date: 2026-10-01
- Ledger: `.scratch/grill-t35/decision-ledger.md` - grill-t35 D-002..D-008 (all current)
- Spec: `.scratch/grill-t35/spec-t35-equivalence.md` (the sole implementation specification)
- Amends: ADR-0087 and ADR-0089 (coverage semantics - see D-M2); ADR-0079 (baseline-pin semantics - see D-P1)

## Context

grill-t34 closed its audit green. The public branch was red.

Four defects had landed and survived: a committed handoff carried an escape-eaten
`0x08` byte; the bilingual mirror's baseline pin named a lane sha that does not
exist in public history; the rewrite-map was stale for four landed commits; and
the corpus manifest disagreed with its tarball. The next round's T-0 baseline
caught them - roughly seventeen hours after they became public.

The common cause is not four bugs. It is that the object every check verified was
the LANE TREE at declare time, while the object the public received is the LANDED
TIP after the landing rewrite. Every local check was green and correct about the
wrong object. This ADR fixes the object, not the four symptoms.

Four consequences make the gap durable enough to need a contract rather than a
habit: the GitButler multi-lane model rewrites history on landing, so a sha that
was valid in the lane can be unrepresentable in public history; the documentation
surface grows during landing, so an artifact committed inside a per-commit
assertion's own tree can invalidate that assertion; and the public CI job cannot
be the blocking check for its own tip, because CI observes the tree only after
it is already public.

## Decision

### D-M1 - One doc-hygiene scanner, two callers

The corruption scanner moves out of its test file into `scripts/shared/doc-hygiene.js`
and both the wiring test and `scripts/check-post-land.js` call it. Two copies of a
scanner is one scanner too few, and the t34 escape byte escaped through the seam
between them.

The signature set is extended with exactly one new predicate, derived from the
evidence rather than guessed: a TAB that is not at the start of its line. The R-A
file carried TWO eaten characters, not one - `0x08` where `$but land --yes` was
intended and `0x09` (TAB) where `$trend-inventory.json` was intended. The t18 set
exempted TAB outright, which is precisely why the second byte escaped a battery
that caught its sibling. Measured across the tracked text corpus at registration,
the predicate has exactly one hit and that hit is the corrupt file itself: the
added strength costs no false positives.

The scanner's C1 range and em-dash test are written as `\u` escapes rather than
literal characters. A literal C1 character is the byte class this round exists to
repair; a scanner that cannot represent its own target class safely is a scanner
one shell round-trip away from corruption.

**Scope and signature limits, declared here because this clause otherwise
overstates them.** The set above is not an exhaustive byte sanitizer and its
blast radius is narrower than "the corruption scanner" suggests. Two blind spots
are open by declaration: **scope** — callers choose which files are scanned, and
at the M-7 measurement `scripts/**` was in no caller's scope, so a governance
script could carry corruption no caller would look at; **signature set** — a
mid-file U+FEFF (`EF BB BF`, the `Out-File -Encoding utf8` prefix) is in neither
the control-byte branch nor the C1 branch, and `docHygiene` returns no hit for a
real file carrying one. Closing either one changes the scanner's contract and
belongs in its own ADR round, not in a repair wave. Until that happens the
supportable claim is "the known instances are repaired", never "byte corruption
is closed" — which is the sentence this round wrote into the code and now writes
here, because the round that shipped M-7 was the round repairing byte corruption.

### D-M2 - map-freshness: tip-map authority, per-commit demoted to advisory

**Declaration 1 of 3 - the enumeration-surface contract change is declared here,
not made silently** (grill-t35 D-003 Δ2).

(Audit note, round 3: an earlier draft of this note read "of 4" while the body
carried three numbered declarations, and it described the labels inaccurately -
it named defer-0030 as one of the numbered items although defer-0030 carries no
number, and described the TSA decision as "folded in" although TSA is its own
numbered declaration. A count sentence maintained beside the labels it describes
drifts the moment a label moves; that is the rot class this round removed
elsewhere. The numbered declarations are therefore now counted FROM the labels:
this section is 1, the anti-masking two-segment read is 2, and the no-TSA
decision with its armed trigger is 3. The defer-0030 subordination
strengthening below is a real declared subject of this ADR and is required by
spec §9, but it is prose inside D-M2 rather than a separately numbered
declaration - it is not folded into any of the three, and it is not a fourth
label. A grep for "Declaration N of M" must return exactly M hits for each M,
which is the property to check if this note is ever edited again.)

The per-commit embedded-map invariant is STRUCTURALLY UNSATISFIABLE under this
landing model and is therefore withdrawn as a blocking assertion. The true root:
a lane-era commit's embedded map was correct for its own lane tree; when the docs
branch linearized, that same commit's tree grew a documentation surface, so the
embedded map froze while the tree grew underneath it. Per-commit self-consistency
is not drift that regeneration fixes - it cannot hold once a lane commit is
rebased onto a tree that did not exist when it was written. Rewriting the four
affected commits is forbidden (forward-only), so the invariant had to move, not
the history.

In its place, **tip-map coverage is the authority and is blocking**: the map
committed at the published tip must cover the citation set of every claim commit
on that line, taken as a union. A live registry at the front of the line is
restack-immune by construction - nothing frozen inside a historical commit can
defeat it. The four historically-broken commits self-heal through the tip map
with ZERO exemption entries, and no historical commit is amended.

The per-commit check is retained whole and demoted to an **audit-time advisory**,
exported and surfaced through `scripts/build-audit-checklist.js` so the auditor
attests its state (the ADR-0091 mechanism). It is not a gate. Demotion is
explicit because an advisory nobody reads is the same as a deleted check, and the
known-unsatisfiable class must stay visible rather than disappear with the code.

THREE consequences of the union shape are load-bearing and were established by
measurement, not preference. The first version of this ADR listed two; the third
(a real coverage loosening) was added after the round-2 audit, and its omission is
exactly the kind of quiet widening the round exists to prevent:

- The union key is `file + sha`, NOT `file + line + sha`. Inside one tree the line
  number is stable and worth pinning, which is why the generator uses it; across a
  union of commits it is not, because unrelated prose inserted above a citation
  moves it. Keying the union by line demanded a row per line-position ever occupied
  and reported 185 false reds where 2 real ones existed.
- sha identity is PREFIX-AWARE. The union spans trees where one object is cited at
  different abbreviation lengths (grill-t33 wrote a 7-char form where the map holds
  the 8-char form). String equality called an already-registered citation
  uncovered. This is the same prefix rule `evidence-freshness.js` already applies
  to pins, used here for the same reason.
- **A TRACKED-FILE SCOPE CLAUSE (`fileTracked`).** A citation is covered when the tip
  map carries a row for its file+sha, OR when its FILE carries any tip-map row at
  all. The second clause exists because the tip map is GENERATED FROM THE TIP, so
  it cannot carry a row for a citation the tip no longer contains: when a round
  re-pins a field, the historical commits that cited the OLD value would otherwise
  demand a row at a line the tip has retired, which the generator cannot produce
  by construction. **This is a real loosening and is declared as one.** It is
  scoped to files the tip map still carries, so a citation in an untracked file
  still fails; both branches are pinned by tests in `test/map-freshness.test.js`.
  Measured on this tree at registration: 0 citations fell in the untracked-file
  case, and all 7 that the clause admitted were retired-line relocations in one
  tracked file. Per-tree row discipline is untouched and stays with
  `build-rewrite-map.js --check` inside the tree it describes.

This is declared as a **revision of ADR-0087/ADR-0089 coverage semantics**, and as
a **strengthening of the defer-0030 subordination**: tip-map authority enlarges the
self-reference surface (the registry now judges the whole line rather than one
tree), so second-party audit priority rises. The advisory is *subordinate to and
never a replacement for* that audit; its scope is narrowed to the advisory block
plus spot checks of block contents.

Deterministic regeneration run twice (E-17) is promoted from accompanying
discipline to a **precondition for the authority holding**: a negative assertion
('this citation is not in the map') may only be backed by deterministic
regeneration, never by passive absence.

### D-P1 - README/zh-CN pairing: a historical pairing scan with a ratchet baseline

**Declaration 1 (continued) - where the Δ2 enumeration change lands.** The
pairing-scan surface registered above is extended here, in the same declaration, so
there is one numbered declaration rather than two.

The mirror's drift pin is withdrawn as an assertion object. It named a lane sha;
restacking orphaned the pin, and re-pinning to another sha only relocates the same
fragility. It survives as a **display-form provenance line** naming the sha the
mirror was synced against - a point-in-time record, not something asserted over.
The 'exists and is an ancestor' assertion becomes advisory.

In its place the D6 assertion is a **historical pairing scan with zero sha names
in the logic**: enumerate every commit on the published line whose changed-file set
contains `README.md` and assert the same set also contains `README-zh-CN.md`. Because
the rule names no sha, a restack that renames every sha cannot invalidate it.

This does not admit the wash window D-006 rejected. A remediation-aware rule would
'clear' a violation whenever any later commit touches both files - which is exactly
the three-step laundering D-006 forbids ('move README alone, then patch zh, then
re-pin'), and it would have washed all twelve real violations on this line. The scan
is deliberately NOT remediation-aware.

The historical backlog is carried by a **committed, monotonically-shrinking
baseline** (`docs/governance/readme-pairing-baseline.json`), the shape industry
lint tooling converges on: forward-only registration anchor, committed baseline,
ratchet. Every entry is a real commit that a machine re-derives on every run, so
there is no prose waiver channel that can silently absorb a violation. Three
reconciliations are enforced: an unsuppressed violation fails; a stale row fails
(rows may only be REMOVED); and a mismatched anchor fails. Adding an entry is a
deliberate act that puts a diff in front of a human.

This revises ADR-0079's D3 and D6 clauses and is recorded there as an amendment
in the same wave (ADR-0083 D-003 forbids dual reading).

### D-L1 - Post-land re-verification against the landed public tree

`scripts/check-post-land.js` fetches the public branch, materializes its tip in a
throwaway worktree, and runs a **wave-bounded subset** of the battery against THAT
tree: tip-map coverage, doc-hygiene over the tip's committed markdown, strict-pin
resolution, and the pairing scan. Every land/push wave must run it - not only the
last wave, because the last wave is exactly where R-A happened.

The blocking object is the LOCAL re-verification of the landed tree. Public CI
observation keeps its trailing shape as the next round's T-0 entry (the D-002
original clause, semantically refined: an unobserved public-green tip is not a
closeout blocker, it is the next round's entry point).

**Declaration 2 of 3 - anti-masking**: the two segments are read and judged
INDEPENDENTLY (ADR-0091 D-D). A green post-land never excuses a red pre-land.
This is why they are separate segments with separate verdicts rather than one
combined status.

The closing wave's residual window is registered as an **owner-action with a
refresh deadline**; missing it escalates through the errata channel. The next
round's T-0 runs this script first (closed-loop self-healing).

This is **not** a `gates.json` CI leg, and the reason is a positioning statement,
not an omission: CI observes the tree only after it is public, so a CI job is the
wrong observation point for a pre-public check. Its assertion lives in the
sentinel leg (D-S1), which is a registry leg.

### D-PRE - Two-segment sentinel block

**Declaration 3 of 3 - no TSA, with an armed trigger.** The closeout artifact
carries `<!-- post-land-verify v1 -->` with two segments:

- `pre_land` - the will-land object (the workspace merge tree: merge-group
  semantics simulated locally), recording the wave's last claim-mutation sha, the
  run timestamp, and the subset scope. The merge-group analogy is named as an
  analogy; it is not claimed to be an industrial-standard equivalent.
- `post_land` - the landed public tip result, anchored to the tip sha it judged.

Three disclosures are mandatory and are the reason this clause exists at all:

1. **The timestamp is self-filled, therefore forensic and not preventive.** It
   catches forgetfulness - nobody re-ran the battery after the last edit. It does
   not catch forgery, because the committer and the writer share a trust domain.
2. **The forgery authority is `git show`-level replay**, not the block.
3. **No TSA (transparency services attestation) is introduced** - the trust domain
   is not separated, so a TSA signature would attest that a trusted party said so,
   adding ceremony without changing the guarantee. The armed trigger is
   pre-registered: a demonstrated forgery case against a self-declared block
   promotes this to an independent trust domain, and that promotion is a registered
   future decision, not an open question.

The assertion leg lives at the authority layer, not in a hook: a hook is
fast-feedback and bypassable (`but commit`, raw git, lane operations all skip it),
so a check that can be skipped cannot be the enforcement point (ADR-0083 D-C).

**F-6 wording constraint, stated as a narrowing and not a closure**: the pre-land
timestamp narrows the exposure window from 'indefinitely' to 'mutation-to-run
minutes', it does not eliminate it. The residual window is adjudicated by the
post-land ritual plus F-6. This ADR does not assert 'the tree did not change after
the run' - no such assertion is made or possible here.

The assertion leg asserts that `pre_land.ran_at` is not earlier than the
committer-date of the wave's last claim-surface mutation. That is the
mechanically assertable form of 'the battery ran after the last change', the same
shape as a merge queue checking that the checked SHA equals the merge-group SHA.

The sentinel block is anchored to the WAVE, not the round: one block per wave.
It applies forward from its own registration commit and never retroactively.

## Consequences

- The defect class becomes detectable at the moment it happens rather than at the
  next round's T-0. Seventeen hours of undetected red becomes one wave.
- Three historical roots self-heal with zero exemption entries: the map coverage
  roots through tip-map regeneration, the orphan pin through the display-form
  downgrade, the pairing backlog through a ratchet whose entries are tool-derived.
- The scanner that polices corruption is now shared by the test and the landing
  check, and can represent every byte class it looks for.
- Cost: the blocking map-freshness authority reads a 4 MB map and takes ~50 s.
  This is recorded because it was previously unbounded - the leg is now fast
  enough to run in CI, which is what makes the authority real. The slow per-commit
  form remains available at audit time via `--advisory`.
- Residual, registered not closed: the pre-land window is minutes, not zero; the
  corpus supply drift is an owner-action and outside the equivalence contract; and
  the closing-wave residual window carries a refresh deadline.

## Human-only adjudication points

Errata adjudication, re-seal authorization, refresh-deadline extension, and any
promotion to an independent trust domain are OWNER acts. This ADR's machinery
reports state; it never issues those verdicts.
