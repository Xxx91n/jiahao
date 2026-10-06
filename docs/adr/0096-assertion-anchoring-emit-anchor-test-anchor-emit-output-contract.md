# ADR-0096: Assertion Anchoring — Emit-Side Anchor Contract, Test-Side Set Anchor, and the Emit Output Contract (grill-t38)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-10-06
- Ledger: `.scratch/grill-t38/decision-ledger.md` — D-001..D-005 (all current)
- Spec: `.scratch/grill-t38/spec-t38-assertion-anchoring.md` — §S-0..§S-11 (the sole drafting specification)
- Relates: ADR-0095 — the round contract; this ADR is the second authority source of the status-inventory leg, per ADR-0095 D-A.
- Refines (Declaration channel; the referenced files are **not** edited): t37-D-005.5, ADR-0085, and ADR-0091 D-E — carried item by item in D-E.

## Context

The round object is one sentence: **every committed claim about a tree state must declare the anchor at which it was evaluated, and the verification mechanism judges by that declared anchor rather than by the present world.**

Two defects in this repository share one shape. **P-1** is the claim-side missing anchor: a report's coverage block carries a `run_id` whose `tree_sha` is not the carrier commit's tree, and the consuming leg judged by the present world rather than by the declared tree. **P-2** is the test-side missing anchor: the pin-ancestry evaluation is bound to the transient `HEAD`, so the same tree reads red or green depending on when it is evaluated. They are two projections of one defect — an evaluation whose declared anchor and actual measurement anchor can diverge — and this ADR merges them into the single proposition "evaluation anchor".

**Ontology: bitemporal.** The valid-time is the *measured tree* — the anchor. The transaction-time is the *carrier commit* — the commit that carries the claim. Under this split, **moving a carrier's tree is not lying**: a claim was true of the tree it measured at valid-time, and a later commit that changes the tree does not falsify it. The only defect is a claim whose **declared anchor ≠ its actual measurement anchor** — a claim that names one tree and measures another. This is why the repair is an anchor declaration and not a prohibition on tree movement.

**Three sections, each independently amendable.** This ADR carries three sections — **§P-1** (emit side, D-P1), **§P-2** (test side, D-P2), and **§N-3** (emit output contract, D-N3) — and each is drafted so that it can be amended on its own without editing the other two. The cross-cutting effect semantics (forward-only, the revision carryover chain, the analogy labels) live in D-E, deliberately outside the three, so that amending a mechanism section never silently re-legislates the effect layer and vice versa. Carrier discipline is inherited: this ADR does not amend ADR-0091/0092/0093 — a new file is created because the round's force-field (assertion anchoring) differs from the observer/enum-surface force-fields of those ADRs, and bundling them would hide the dispute inside an unrelated amendment (grill-t38 D-001.12; the t37-D-006 bundling defence).

## Decision

### D-P1 — §P-1 Emit-side anchor contract (independently amendable)

**The unified anchor field.** Blocks append an `anchor={tree_sha, ref_context, mode}` field (additive, schema v1.1); `run_id` retains its artifact-addressing function unchanged. The schema evolves additively only — no field is renamed or removed, and the version is bumped.

- **`ref_context` enum**: {lane-tip, merge-base, origin/main, workspace-merge, **live-set**}. `live-set` is added by D-P2's set-anchor ruling (the set of resolvable live branches at emit time).
- **`mode` closed enum**: {tree-internal read, working-tree read}. This inherits ADR-0093 D-6's discipline — *which tree* and *which read* are two fields, and collapsing them is how a working-tree read comes to be read as a tree-internal one. The enum is closed: a future dirty *degree* may not be added to it (see below).

**Disambiguation: three rules for the dual authority source.** The block now carries two anchors-in-embryo — `anchor.tree_sha` and `run_id`'s second segment — and a consumer could read either. The three rules:

1. **Authority split.** `anchor.tree_sha` is the **anchor authority** — the leg reads only it to judge the anchor. `run_id` is the **addressing authority** — it uniquely names the artifact file (including `pickDerivation` matching). **The consumer leg is forbidden to reverse-derive `tree_sha` from `run_id` for anchor judgment.** Deriving the anchor from the address is how the address silently becomes the authority.
2. **Mismatch is red.** If `anchor.tree_sha ≠ run_id`'s second segment, the emission is self-contradictory and the leg **FAILs with the independent reason `anchor_run_id_tree_mismatch`**. It never silently picks one of the two: a silent choice is a verdict spoken about an object the other field names.
3. **Legacy transition.** Blocks emitted before this ADR's registration commit, which carry no `anchor`, take the **legacy `run_id` path plus a `::warning`** (yellow disclosure). After the registration commit, a block missing `anchor` is **malformed** — the transition is by version (`firstCommitMs`, the mechanism already in `check-status-inventory.js`), not by a runtime escape hatch.

**Dirty semantics.** `mode = working-tree read` is honestly named: *the anchor names the lineage commit (valid-time); the rows are a read of the working tree above that commit (transaction-time).* The **dirty degree** — how far the working tree diverges — is recorded in `runner_ctx.dirty` (already present per t37-D-005.2) and is **forbidden in the `mode` enum**. A closed enum that grows a severity value is no longer an enum, and the honest reading is already carried by the mode value plus the runner context.

**`ref_context` is an observation-context record, not an evaluation input.** Its value is the entity name that `HEAD` resolved to at emit time (including `live-set`). It records *what the emitter saw*, and the consumer's evaluation domain is still the §P-2 set anchor. A `ref_context` value must not become a hidden evaluation ref: reading it as the judged ref is the F-4 misreading this sentence exists to prevent.

**Prose intermediate form.** A prose sentence that carries a mechanically-judgeable value **MUST parenthesize a `run_id` back-reference** — the AS 3110 dual-dating shape, where the local date is attached to the specific value-bearing item. Narrative sentences are **non-load-bearing**: prose that carries no value is not required to cite. The mechanical fallback for the parenthetical obligation (a `run_id`-reference existence check) is registered as a deferred row and is **not** enumerated this round — one round does not build two enumeration surfaces (t37-D-001 M-D).

**Dual-time disclosure sentence.** The block discloses, in its own terms, that it is a bitemporal artifact: the anchor is the valid-time tree, the carrier commit is the transaction-time, and a stale-but-correctly-anchored block is **a dated claim, not a lie**. This sentence is the mechanical form of the Facts-Canon as-of channel, and it is why a corrigendum is cheaper than a re-derivation.

**Consumption contract (the assertion leg).** The leg judges two things, separately:

- **Member reconciliation (truth domain)** — the block's rows equal the **complete member set of the anchor tree re-derived from the block's own `run_id` artifact**. The artifact-selection authority is the block's own `run_id`; a different run's artifact on the same tree is a **drift observation surface** (a yellow diff disclosure, never red — a member difference between two runs on one tree is flaky/environmental, not a transcription error, and calling it red would be a false conviction). `prefer-HEAD` is **retired from the assertion domain**: the `HEAD` tree artifact leaves the assertion domain and becomes a drift observation surface (present-and-diffing → `::warning`). The reconciliation object is the joint designation `anchor.tree_sha + run_id` — `run_id` names the artifact file, `anchor` names the measured tree.
- **Freshness (date domain)** — an independent assertion, embedded **inside the same leg** (a second assertion beside member reconciliation, independently judged, with its own error line and its own reason): no claim-surface mutation in the interval `(anchor, carrier.parent]`, and the anchor must be an ancestor of `carrier.parent`. The classifier `lastClaimMutation` is **lifted from `check-post-land.js` into `scripts/shared/`** — one implementation, two callers (ADR-0092 D-M1: two scanners is one scanner too few; the t34 escape byte escaped through exactly that seam). It is not a separate wave-close leg (the E-25 dual-channel disease) and not a ritual sentence (the security.txt counterexample — a ratchet obligation must be a mechanical assertion).
- **Carrier undetermined (degradation).** When the leg runs pre-commit and `carrier.parent` is undecidable, the interval upper bound degrades to `HEAD@run` and the output discloses "carrier undetermined; interval = (anchor, HEAD@run]"; the E-19 ritual guarantees a settled-tree re-check before declaring.
- **restack seam.** If a restack rewrites the sha so the anchor no longer resolves, that is a **yellow disclosure, not red** — otherwise a restack is an automatic false conviction, re-enacting the pre-D-PRE defect. This is written here explicitly.
- **`UNVERIFIABLE`.** An anchor artifact that is unavailable or incomplete is **`UNVERIFIABLE` (exit 2, the honest channel)** — neither red nor green. This is the C-1 honest channel: "the anchor tree has no complete artifact" is *underivable*, not a failure.
- **Freshness red is verdict-level, not line-level.** A freshness red does **not** enter the C-1 line-level closed reason set (the t37-D-003 two-field separation spirit); the two assertions carry two independent reason vocabularies. This is legislated here explicitly.
- **v1 coverage.** The anchoring semantics cover **`status-inventory` only** this round. Absorbing `audit-coverage` / `post-land-verify` anchoring is the next round's independent enumeration surface, registered as a deferred row (the t37-D-006.5 form) — one round does not build two enumeration surfaces (t37-D-001 M-D). Because the unified anchor field is already legislated, spreading it later costs zero schema change.

**The two-anchor-class boundary sentence.** Two classes of anchor coexist and **must not be read as one**:

- **Tip anchors** (map coverage, pairing scan) — the authority semantics *must* be evaluated against the tip.
- **Snapshot anchors** (`status-inventory` blocks, run evidence) — historical-claim semantics, evaluated against the declared tree.

This sentence exists to prevent the misreading that "everything is anchored now, so nothing need chase the tip". Anchoring the snapshot class does not un-anchor the tip class.

**L-1 self-reference boundary.** A block must not describe the tree that covers its own carrier — the anchor names the *measured* tree, and the report lands *outside* its own claim. This is the same family as "a commit cannot contain its own sha". The anchoring semantics resolve the P-1 paradox without touching L-1: the block's own landing is not part of its claim.

**Rejected and recorded.** `run_id` as an implicit anchor (the anchor semantics buried in a concatenated string, silently shifting when a segment is added); `anchor`+`run_id` double-write redundancy (a cross-version semantic-equality obligation with no benefit); a synthetic measurement commit anchor (manufacturing an anchor form after the fact — the manufacturing violation of the round's own defect definition); and `dirty ⇒ UNVERIFIABLE` (structural dead code).

### D-P2 — §P-2 Test-side set anchor (independently amendable)

**The evaluation anchor is a set.** The pin-ancestry evaluation anchor is the **set of resolvable `refs/heads/*` ∪ `refs/gitbutler/*` live branches at evaluation time**. A pin is **green iff it is an ancestor of ANY named branch in the set**. The workspace merge commit is **structurally excluded** from the anchor set.

**Implementation: the shared default is redirected.** The change is made inside the shared implementation's default value, not at the call sites: `orphanAncestry`'s default ref moves from `HEAD` to "an explicitly passed ref is respected (the fixture escape hatch is retained); absent an explicit ref, derive the live-branch set". The full live-call-site set is four — `check-orphan-ancestry.js`, `check-classification-consistency.js`, `adr-0085-wiring.test.js`, `adr-0086-wiring.test.js`, all passing `{}` — so one default change fixes all four and the callers need zero changes (ADR-0092 D-M1 execution form). **Callers are forbidden to pass their own anchor**: two call-site anchors that drift re-enact the t34 seam; the derivation must sink into the shared implementation.

**Tree-read / lineage double-ref separation.** Tree-read surfaces (`lastSealRecord` and the like) keep `HEAD`/`workspace_ref` unchanged; **only** lineage evaluation uses the set. This is the mechanical landing of ADR-0093 D-6's two-field discipline, and it is written in both ADR-0096 and ADR-0093 to prevent the F-delta confusion (a set ref used on a tree-read surface).

**Empty / unresolvable set → `UNVERIFIABLE`.** If the set is empty or entirely unresolvable, the verdict is **`UNVERIFIABLE` (exit 2, the honest channel)** — neither red nor green.

**Residual window (churn-during-apply) = instrument transient.** A residual red caused by churn during apply is a **yellow disclosure** (reusing the D-P1 drift observation surface), **not** a registered errata class and **not** a true signal. The pre-registered reopen condition (carried on a deferred row): the same `tree_sha` shows residual reds on N consecutive gate runs above the noise threshold → the errata question reopens under the pre-registered condition (the t27-D-003 form). This is not a self-reversal of the D-P1 errata veto — the errata veto is against issuing a licence for a claim violation; what is judged here is the observation *time point*.

**ADR-0085 "ancestor of HEAD" refinement sentence.** The standing leg evaluates the **declared anchor set**; the `HEAD` semantics **at the claim point** are unchanged (this triggers ADR-0085's own promotion hook). This is a refinement, not a redirection.

**Failure modes.** **F-α — dead-lane false green**: a pin that is an ancestor only of a dead lane reads green. Mitigation: the anchor is the *resolvable* live-branch set at evaluation time; long-term retention of a dead lane triggers a pre-registered narrowing/upgrade path. **F-β**: a residual red → the residual-window clause above. **F-γ — public-clone object absence**: a pre-existing condition, disclosed honestly, not widened.

**Rejected and recorded.** `merge-base` as a single anchor (a lane-only pin becomes a structural false conviction); binding to any single transient ref (the GitHub merge-queue #46757 incident shape); using the set ref on a tree-read surface (F-delta); turning the residual window directly into an errata class or a true signal (yellow disclosure + pre-registered reopen only); and enumerating HEAD-bound tests beyond the pin-ancestry family this round (one round does not build two enumeration surfaces). The fixture explicit-ref escape hatch must not be sealed (the `freshness-checker` synthetic-repo semantics are preserved).

### D-N3 — §N-3 Emit output contract (independently amendable)

**`emit` prints the full pasteable block.** `emit` prints the complete pasteable artifact — the `<!-- audit-coverage v1 -->` marker, a JSON fence, and the bare `commands` array as one unit. `extractCoverage` is unchanged (the fence content is still a bare array). This is the same-family convergence as `build-status-sentinel`'s `renderSentinel`.

**Advisories are split out.** Advisories leave the `emit` channel: an independent **`--advisories`** subcommand prints the text list (the human channel). `docs/governance/audit-checklist.json`'s `advisories` field remains the authoritative source; the report's prose disclosure section is unchanged (the block carries only the command list). The `emit` channel must not mix advisories (one channel with two payloads is the structural lesion); advisories must not go to stderr (the disclosure surface is not a diagnostic — the D-M2 persistent-visibility obligation).

**The legislative sentence.** "**emit 输出形即注册契约，改形走 Declaration**" — the emit output form is the registered contract; changing the form rides a Declaration.

**The co-signs boundary sentence.** The sentinel marker and the fence are the block's **format carrier**, not claim content; the claim content (the command list) and the attest act (paste + naming) remain the auditor's; the generator **never co-signs** — the boundary is **result truth**, not extended to the format carrier. (ADR-0091 D-E + t34-D-004(ii) are the supporting text.)

**Loop-back pinning test.** A loop-back pinning test joins the existing `test/audit-checklist.test.js` or `test/audit-surface.test.js` (the wiring family is an existing surface, not a new enumeration surface): `emit` stdout → `extractCoverage` must be green; the assertion is that the fence content is a non-empty string array whose elements align with `checklist.commands`.

**Same-commit obligation.** The `emit` reshape + the pinning test + this ADR section + the `_doc`/AGENTS.md wording land in a **single commit** (D-005.5, verbatim fulfillment of D-001.10's "the fix is one commit"; this is also the ADR-0095 D-B universal clause's second projection).

**Zero historical retro.** Measured: every committed block from t34/t36/t37 is a bare array, and an object-shell block was never committed. The drift lived only between `emit`'s output and the consuming leg, so fixing `emit` closes the loop. **No forward-only exemption clause is needed and no corrigendum is issued.**

**Rejected and recorded.** Relaxing the consuming leg to accept an object shell (weakens fail-closed and legalizes a dual read — ADR-0083 D-003); a half fix that leaves `emit` as a bare array (the residual hand-wrapping surface is the N-3 lesion's recurrence point); `emit` self-testing as the pinning test (self-assertion is not an independent assertion surface); and creating a new `adr-0091-wiring.test.js` (the file does not exist — a false dwelling).

### D-E — Effect semantics: forward-only, the revision carryover chain, and the analogy labels

**Forward-only, three clauses.** (1) Anchoring takes effect from this ADR's registration commit and does not retroactively convict (the pre-convention law). (2) The `anchor` field **MUST NOT** be back-filled (this closes the escape hatch — a back-filled anchor is a manufactured anchor). (3) A stale-but-correctly-anchored block is **a dated claim, not a lie** (the mechanical form of the Facts-Canon as-of channel; a corrigendum is cheaper). Together these three are the anti-escape-hatch triple: without any one of them, anchoring becomes a retroactive licence for stale blocks.

**Revision carryover chain (item by item, via the Declaration channel).**

- **t37-D-005.5 (revised)** — the status-inventory assertion leg's comparison domain changes from "re-derive at the current run" to "**re-derive the declared anchor tree**" (the anchor = the block's self-declared `anchor.tree_sha`). The `run_id.tree_sha` field already exists; the consumption semantics change. The revision rides the Declaration channel explicitly (the t33-D-002(vi) precedent: a narrowing rides a Declaration, not a ledger rewrite). The anchor-tree re-derivation uses a throwaway worktree (reusing `check-post-land.js`'s `materialize` mechanism — verified at implementation time).
- **AGENTS.md E-19 (annotation-level revision, docs lane)** — the tip-anchor surface (map/manifest) keeps its settled-tree `--check` unchanged; the snapshot-anchor surface's semantics are rewritten to "confirm the latest report's anchor assertion holds" rather than "regenerate the block to the present".
- **D-001.9 → D-P2's set form** — the "single constant" of D-001.9 is carried by the set form of D-P2; the original text is retained and the carrier changes (a Declaration refinement sentence). **D-001.10 → D-N3's full block** — the "bare array" of D-001.10 is carried by D-N3's full block; the fence content-layer obligation is unchanged and the output wrapper is refined (a Declaration refinement sentence). Both are refinements, not redirections.
- **ADR-0085 "ancestor of HEAD"** — the refinement sentence in D-P2. **ADR-0091 D-E emit contract** — the refinement in D-N3. **D-002.5 joint designation** — the refinement in D-P1 ("anchor.tree_sha + run_id joint designation").

**Two analogy labels (analogy, not isomorphism).** The two external precedents cited in this ADR are **analogies**, named as analogies and **not** claimed to be isomorphic (the ADR-0092 D-PRE "analogy named as analogy" discipline):

- **Prometheus staleness** — the precedent that an out-of-date sample is orthogonal to a false one (staleness is a freshness property, not a truth property); this is the analogy for D-P1's "stale-but-correctly-anchored is not a lie".
- **Audit as-of dating** — the precedent that a report is dated to its evidence date; this is the analogy for D-P1's dual-time disclosure and the prose back-reference.

The PCAOB AS 3110 main text was not read (HTTP 403); the audit-report-date semantics stand at the summary level plus the ACCA/ISA-315 second-hand layer, and the citations here must be read at that level.

## Registered transfers (floor, not ceiling)

The deferred rows this round registers (landed to `docs/deferred-registry.json` in the landing wave, task T-9):

| Row | Trigger | review_at | Source |
|---|---|---|---|
| N-4 landing-channel contract obligation | deadline + §9 process-fact reference; the selection is an owner act | after the landing wave | D-001.11 |
| HEAD-bound live-eval test full enumeration | the historical-enumeration-form boundary sentence is in this ADR | next round | D-P2 (D-003.5) |
| residual-window measurement | same `tree_sha`, N consecutive residual reds → errata reopen | first measurement | D-P2 (D-003.6) |
| prose parenthetical existence mechanical fallback (M-D class-4 candidate) | parenthetical degradation evidenced | next round | D-P1 (D-004.5) |
| F-5 run_id matrix dimension (register the gap + the over-declared comment only; do not re-legislate) | any workflow shows `matrix:` | 2026-04-30 | ADR-0095 D-C |
| F-11 mismatch pre-computation | first real declared-vs-inferred mismatch, or gate-battery timeout (same anchor as t37-D-003.7) | 2026-04-30 | ADR-0095 D-C |


> **review_at divergence (grill-t38 landing wave, disclosed).** The F-5 and F-11 rows above carry the ledger literal `2026-04-30`; the committed registry row holds `2027-04-30`, because `scripts/check-deferred.js` (ADR-0033 D4) fails STALE on any `review_at` before the run date and `2026-04-30` predates this wave (2026-10-06). The one-year shift preserves the ledger month/day and is registered here for owner adjudication rather than silently reconciled.

Registry ids minted for these six rows in the landing wave (task T-9): N-4 landing-channel obligation = `defer-0086`; HEAD-bound live-eval enumeration = `defer-0087`; residual-window measurement = `defer-0088`; prose parenthetical backstop = `defer-0089`; F-5 run_id matrix dimension = `defer-0090`; F-11 mismatch pre-computation = `defer-0091`.

## Boundaries

- **Vetoes, recorded.** P-2 errata-class exemption (a licence for an already-fired non-hermetic test — it collides with "registered-absence is distinguishable" and Bazel's hermeticity law); process-only solutions (ADR-0083 D-C: a discipline can be bypassed, a contract cannot); the (b) narrowing that leaves P-2 at its old semantics (the contract and its first consumer decouple, re-enacting V9); the (c) exclusion of N-3 (splitting one force-field across two rounds); the merge-base single anchor; binding to any single transient ref; `run_id` as an implicit anchor; anchor/run_id double-write; a synthetic measurement commit; `dirty ⇒ UNVERIFIABLE`; relaxing the consumer to accept an object shell; the half-fixed bare-array `emit`; `emit` self-testing; a false new test dwelling; and `source_adr` array expansion this round.
- **Failure modes, recorded.** D-P2's F-α/F-β/F-γ; D-P1's F-1..F-6 (old-block accumulation, double-write drift, dirty-gap misreading, `ref_context` becoming a hidden evaluation ref, mode-enum growth, prose parenthetical degradation); D-N3's F-emit-1..4 (output-form re-drift, mis-pasting outside the fence position, advisories disclosure degradation, co-signs misreading).
- **Registered not closed.** The three effect clauses are the anti-escape-hatch triple; removing any one is a contract change. The v1 coverage is `status-inventory` only; the other anchoring surfaces are the next round's. The analogy labels are analogy, not isomorphism, and the audit-date citations are summary/second-hand level.
- **Implementation-time gaps, honestly registered.** The GitButler `ref_context`/lane ref value stability under restack jitter is unmeasured; the anchor-tree re-derivation cost is unmeasured (if it exceeds the CI budget, it must be tiered — the gates leg re-derives at the anchor while the test leg only validates the anchor — and that tiering is not designed yet); the D-005 legacy dirty-tree re-derivation semantics are carried over unchanged and not legislated under anchoring; and the all-red-day snapshot volume with the `anchor` increment is unmeasured (expected constant-level).

## Human-only adjudication points

Errata adjudication, the residual-window reopen, the landing-channel selection (N-4), and the promotion of any analogy to a contract are OWNER acts. This ADR's machinery reports state; it never issues those verdicts. The agent registers and reports; it never self-certifies.
