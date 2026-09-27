# spec-t26-disposition — grill-t26 execution spec (semantics round)

Round: **grill-t26** — anchor-semantics rework of the evidence-freshness invariant. Sole decision source: `.scratch/grill-t26/decision-ledger.md` (D-001..D-005, all current). Four atomcode research runs informed the records; refinements are folded into the cited D-IDs — nothing outside the ledger.

Invariant motivation (verbatim): 我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## 1. Round topology (D-001)

- **t26 = anchor-semantics round only.** The public-CI red-leg triage (defer-0070) is a separate round (t27) — invariant-change work and mechanical triage do not share a round (merge axes: does the protected invariant change / shared verification surface / human authority required).
- t27 doubles as the first live firing ground for the new semantics' convergence cost: its anchoring commits exercise the sealed/post-seal regime for real.
- During t26, defer-0070 is held in quarantine shape: the red legs stay registered, executed, non-blocking-by-designation, with owner + review date — the alert-fatigue literature pattern, honestly disclosed.
- Anti-ratchet obligation (D-001): the new mechanism MUST register what it retires — the retired object is the cross-round recursive-invalidation (live-HEAD-walk) invariant and its re-capture waves, retired whole, not partially (D-004 negative).
- Rejected by research (recorded): per-round anchor namespace alone (isolates but does not remove waves); bind-to-capture's-own-anchor (loses freshness detectability — stale ≠ invalid).

## 2. Seal boundary — the lower layer (D-002)

- **SEAL declaration**: a committed in-repo declaration per round (candidate form `.scratch/grill-tNN/SEAL`) naming the sha of the LAST anchoring commit of that round — the pinned anchor, not the tip. Post-seal suite logic: `anchor := declared sha` replacing the BASE..HEAD live walk.
- **Declaration commit is registered non-anchoring**; at declaration time "no anchoring commit in flight" is mechanically verifiable (walk BASE..declaration: last anchoring commit must equal the declared sha).
- **Tag co-naming**: the `adjudicated/<round>` annotated tag co-names the SAME sha; the tag message pins the bare sha (byte-equivalence is the comparison precondition).
- **Divergence = explicit drift code** (Anchor Failure Tri-State precedent: expected_missing/unreadable class), never silent degrade. **Tag absent** = degrade to declaration-only + the absence recorded as state (SCT-before-inclusion analogue) — never fail-closed.
- **No backfill**: historical tag-less rounds get no retroactive tags (ADR-0050 Forward Sealing). The lag bound SEAL-declaration -> tag push is declared explicitly (MMD analogue; carried convention: within the same round, human-pushed).
- ADR disclosure: the γ shape is recorded as a structural analogy to three precedents (TUF role separation / transparency checkpoint co-signing / RFC 6962 SCT), not verbatim citation.

## 3. Intra-round granularity — the upper layer (D-003)

- **Claim-point evaluation**: the freshness check evaluates AT each claim-bearing commit, not at HEAD continuously. Claim surfaces are a registered closed enum = round-dir `reports/` + `handoffs/` (the green-verdict-bearing surfaces; the V6 catch was a handoff claim beside stale bytes).
- At claim commit C: every committed capture in the round's evidence dir at C must name a sha ≥ the last anchoring commit strictly before C. Intermediate captures may persist stale-labeled — stale is a metadata downgrade, not invalidity.
- **Seal-point check stays independent** of claim-point checks — the two verifications never merge (claim-fresh ≠ seal-fresh; the Red Hat/Miasma reverse-failure precedent).
- **Compensation 1**: unregistered claim-like files produce a warning signal (fail-closed signaling, not silent pass) — the Mastra "attestations without enforcement is theater" lesson.
- **Compensation 2/3** land mechanically: terminal seal wave + stale-labels-nonblocking.
- Semantic position: point-in-time validity, not continuous validity (Sigstore RFC 3161 analogue); claims pin evidence, evidence does not chase anchors. The cost lands on the claim-maker, not the anchor-land.
- Rejected: continuous chase (no industrial precedent, cost proven); terminal-only (claim points lose the guardrail — the IETF-named largest gap).

## 4. Legacy sealing (D-004)

- t26 writes `.scratch/grill-t24/SEAL` and `.scratch/grill-t25/SEAL`, each carrying dual fields `seal: 8e177d24` + `recorded_at: <writing date>` — the sha is mechanically derived from the suites' current evaluation, not hand-picked.
- This is **back-registration, not back-dating**: the declaration is new bytes; no historical commit is rewritten.
- The non-anchoring registration of declaration commits takes effect THIS round — otherwise the round's own seal commits become new anchors (self-poisoning regression).
- Post-seal role: the two suites freeze as regression sentinels (characterization-test analogue — change detectors, not correctness judges); rewriting sealed evidence bytes turns red.

## 5. Implementation topology (D-005)

- **Shared checker, single source**: the freshness algorithm (anchoring classification / claim-point detection / seal resolution / evaluate-at-commit) is implemented once, in the `scripts/` R2 machinery surface — explicitly NOT `src/shared/` (R1 require-chain is the shipped product surface).
- Round-scoped suites carry only config `{BASE, EVD, SEAL}` + assertion texts; adr-0083/0084-wiring suites migrate to the shared checker (no third copy, no in-place divergence).
- `surface-taxonomy.json` gains the `claim_surfaces` closed enum + the SEAL-declaration class registration (mechanism_outputs closed-enum precedent).
- **Four hedges**: (1) the checker carries its own fixture unit tests (OPA _test.rego analogue — correlated failure intercepted pre-merge); (2) a checker change must run ALL round-scoped suites = full regression as dry-run; (3) Metz fallback — a round needing genuinely different walk semantics declares deviation and inlines locally, never piles conditionals into the shared checker (wrong-abstraction prevention); (4) claim_surfaces closed enum + unregistered-claim warning.
- Disclosed trade: a shared bug is a correlated failure across suites — accepted and hedged, per the recorded D-005 terms.

## 6. Mechanics & closeout

- kind: **fix** (R2 machinery + governance registrations; every machinery hand-edit listed in `governance_tooling_diff`, ADR-0078 obligation).
- Normative carrier: a new ADR (next number 0085) carries the two-layer semantics; ADR-0083 D-A and ADR-0084 D-C receive pointer lines only, per the append-only amendment convention.
- CONTEXT.md glossary additions under domain-modeling discipline: the seal boundary and claim-point terms.
- Within-round order: machinery first (checker + registry + suite migration + legacy SEAL declarations), then normative prose, then the round battery, report (claim point), terminal wave, and the t26 SEAL declaration; transitional red windows before migration lands are disclosed, never hidden.
- defer-0070 stays pending through t26; its entry may carry the three failing suite names as quarantine detail (bookkeeping, not scope creep).
- Human actions (unchanged authority boundary): the `adjudicated/grill-t26` tag push co-naming the seal; human-authority-package items stay human-domain.

## 7. Negative union

No agent-executed tag push / merge / renew-or-expire / entity signing; no third copy of the walk algorithm; no rewriting of historical commit bytes or sealed evidence; no claim-surface additions outside the registered enum without a same-commit registry update; no stale-bytes-beside-green-claim at claim points or seal; no metrics-layer ratchet rules; no seal declaration without recorded_at; no folding t27's CI triage into this round; no silent divergence between declared seal sha and tag sha.
