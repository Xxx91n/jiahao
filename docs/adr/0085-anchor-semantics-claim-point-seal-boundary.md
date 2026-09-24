# ADR-0085: Anchor Semantics — Claim-Point Pinning, the Terminal Seal Boundary, the Declaration/Tag Co-Naming Contract, the Explicit Drift Code, and the Retirement of the Live-HEAD-Walk Invariant (grill-t26 anchor-semantics round)

- Status: Accepted
- Date: 2026-09-24
- Ledger: `.scratch/grill-t26/decision-ledger.md` — grill-t26 D-001..D-005 (all current)
- Spec: `.scratch/grill-t26/spec-t26-disposition.md` (execution spec: machinery first, prose second, battery third, report, terminal wave, SEAL)

## Context

The ADR-0083 D-A ordering invariant made evidence freshness mechanical — every committed capture had to name a sha at-or-after the last anchoring commit evaluated at HEAD — but its granularity was wrong. Walking `BASE..HEAD` at every evaluation made every non-exempt commit anchor: authored prose, machinery, claim commits, and even another round's bookkeeping all moved the floor, so a sealed-feeling round kept demanding re-capture waves. grill-t25 paid twenty-plus non-anchoring waves to the treadmill, and a round's own audit report could itself move the anchor — a claim about freshness invalidating the freshness it asserted. The invariant was correct; its evaluation point was wrong. Two separations fix it: freshness is enforced at the points where a verdict is written (claim-point pinning), and a round's evidence window is frozen by an explicit terminal boundary (the seal) instead of by "whatever HEAD happens to be". One ADR carries both layers plus the authority contract, because they are one semantics (ledger D-001: the over-codification bound forbids splitting).

## Decision

### D-A — Two-layer anchor semantics (ledger D-003)

1. **Floor-anchor (claim-point layer).** A commit is a *claim commit* of round `R` when its diff touches `R`'s registered claim surfaces. At claim commit `C`, every committed capture in `R`'s evidence directory at `C` must name a sha at-or-after the *floor* — the last commit strictly before `C` touching a file outside the registered non-anchoring classes **and** outside the claim surfaces. A pure claim commit never raises the floor: a claim asserts state; it does not change what the evidence must be fresh against. This is the treadmill fix — consecutive claims no longer force waves between them.
2. **Seal-anchor (terminal layer).** The seal pins the last commit touching *any* non-exempt file — claim commits count, because the seal names the round's last substantive act. At the declaration commit the in-flight invariant is mechanically verifiable: walking `BASE..declaration`, the last seal-anchor must equal the declared sha.
3. **Stale is a metadata downgrade, not invalidity.** Intermediate captures may sit below the current floor; they lose the right to support the round's green conclusion but their bytes remain a point-in-time record (ADR-0083 D-A.5 carried over). The blocking checks are the claim point and the seal point only — there is no continuous HEAD evaluation.
4. **Semantic position is point-in-time.** A capture asserts "this ran at header sha", never "this is still true". Freshness at a claim point is recency at that point, not continuity between points (RFC 3161 timestamp analogue).

### D-B — The SEAL declaration carrier (ledger D-002/D-004)

1. `.scratch/grill-<id>/SEAL` carries exactly two fields: `seal: <sha>` and `recorded_at: <date>`. The declaration commit rides the registered non-anchoring class (`freshness.non_anchoring_classes.seal_file`) — the class is effective this round, including for the declarations it classifies.
2. **Post-seal freeze:** a commit after the declaration touching the sealed evidence directory, or a second touch of the SEAL file itself, turns the suite red. The sealed suite becomes a regression sentinel.
3. **Back-registration, not back-dating.** The grill-t24 and grill-t25 declarations were written this round naming the mechanically derived seal-anchor `8e177d24`; `recorded_at` is the writing date; no historical bytes were rewritten; the file's comment line reads as a back-registration.

### D-C — Declaration/tag co-naming, drift, degrade, lag bound (ledger D-002)

1. The `adjudicated/<round>` annotated tag co-names the declared sha — the annotation carries the bare sha (byte-equivalence is the comparison precondition).
2. Declared-vs-tag divergence is the explicit **`drift`** code: surfaced by the checker, disclosed in the round report, never silently ignored.
3. An absent tag degrades the round to **declaration-only** status — recorded as `absent`, never fail-closed and never silent.
4. **Lag bound:** the tag push lands within the same round and is executed by the human (ADR-0084 D-E stands); the SEAL declaration is the object the tag adjudicates.
5. **No backfill:** historical rounds are never retro-tagged (ADR-0050 forward sealing). t24 stays `absent`; t25's tag names the landed tip `bde0570b` — pushed under the pre-contract convention — and stands as the recorded `drift` exemplar.

### D-D — Machinery topology and the retired-object registration (ledger D-005, D-001)

1. The shared checker is `scripts/evidence-freshness.js` (R2 machinery surface — deliberately not `src/shared/`, the shipped R1 require chain). Round-scoped suites carry `{id, base}` configuration plus assertions; the walk is never re-rolled per suite.
2. `docs/governance/surface-taxonomy.json` gains the `freshness` block: the closed `claim_surfaces` enum (`reports/`, `handoffs/`, with `handoffs/next-round.md` excepted as bookkeeping), the non-anchoring class registry (evidence dirs, the SEAL file, round bookkeeping, mechanism regen outputs), and the `rounds` registry the suites consume.
3. **Hedges.** Fixture unit tests (`test/freshness-checker.test.js`) exercise classification, floor semantics, staleness, seal resolution, freeze, and the unregistered-claim warning on a synthetic repo — a checker change runs every round-scoped suite plus its own fixtures. **Metz fallback:** a round needing genuinely different walk semantics declares the deviation in its ledger and inlines a local implementation in its own suite — never piling conditionals into the shared checker.
4. **Retired object registered.** The cross-round recursive-invalidation (live-HEAD-walk) invariant and its re-capture waves are retired *whole* — not narrowed, replaced. ADR-0083 D-A's walk form is superseded; its `captured-at-head` header contract and qualification/archival split carry over unchanged.
5. **Structural lineage (analogy, not identity):** TUF role separation — the declaration is the round's own checkpointing role, the tag the independent countersigning role; transparency checkpoints / event-sourcing — the seal freezes the prefix the suite verifies; RFC 6962 SCT-before-inclusion — the declaration commits the round to the pinned anchor before the tag countersigns it.
6. **Walk exclusions.** The rev-list drops ephemeral `GitButler Workspace Commit` subjects — workspace merge objects that never reach a public clone; they neither anchor nor count as claims. (Disclosed by the t26 second-party audit: the filter shipped un-ledgered — this line is the record. Same audit: `co-named` requires the bare-sha annotation, not merely the right target — the message pin is enforced, and `claim_surfaces.exceptions` is honored by the checker, not decorative.)

### D-E — Landing tail and report obligations

1. Landing-tail order: last anchoring commit → terminal wave (captures at-or-after the last substantive commit) → SEAL declaration (non-anchoring) → regeneration-only commits. ADR-0084 D-C's wave-only tail becomes the seal's terminal wave.
2. The round report and the round handoff are claim commits — claim conformance is verified at their commit points.
3. The report discloses: transitional red windows before migration lands; the declared-vs-tag relationship including pre-contract drift; missing capabilities in-session (research engines absent this round are named, not smoothed over).

## Consequences

- Freshness cost lands on the claim-maker, not on every commit: machinery between claims still forces fresh captures at the next claim, but consecutive claims no longer chase each other.
- A sealed round's evidence window is frozen: later rounds' commits cannot move its anchor, and post-seal evidence edits are red, not stale.
- Authority is explicit: the declaration is self-describing and checkable; the tag either co-names it, diverges as `drift`, or is `absent` — all recorded states.
- The wiring pin is `test/adr-0085-wiring.test.js` (clause set + taxonomy registration + single-source assertion + t26 evaluation state); the migrated `test/adr-0083-wiring.test.js` / `test/adr-0084-wiring.test.js` pin the sealed legacy rounds; `test/freshness-checker.test.js` pins the checker on fixtures.
- grill-t27 inherits the triage scope: the three quarantined CI-red suites (`adr-0069-wiring`, `sentinel-ownership`, `adr-0079-wiring`), `defer-0070` closure on the first green CI run, and the first live measurement of the convergence cost of this semantics.
