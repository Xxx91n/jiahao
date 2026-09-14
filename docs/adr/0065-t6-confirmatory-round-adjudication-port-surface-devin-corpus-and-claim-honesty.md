# ADR-0065: T-6 Confirmatory Round - Adjudication Rule, Port Surface, Devin Corpus Protocol, Claim Honesty

Status: Accepted (user-ratified 2026-09-14 via grill-t7 decision ledger D-001..D-006; second_reviewer countersign deferred to the next audit round)
Date: 2026-09-14

References: ADR-0027 D2 (threshold moves same-commit ADR), ADR-0038 D1/D2
(tarball surface whitelist; corpus doors not in npm surface), ADR-0039
(tarball narrowing), ADR-0050 (append-only), ADR-0060 D-A (min_n is
pre-registered), ADR-0062 (tarball cap amendment: policy before value),
ADR-0063 (judge identity), ADR-0064 (this round's pre-registration: D-A MDE
stop-loss, D-B surface split, D-C four-class corpus, D-E golden-sample
equivalence, D-F trend anchor), decision-ledger-t7 (D-001..D-006, in
docs/governance/).
External basis: FDA 21 CFR 201.57 (verbatim limitation sentence), 201.80(c)(2)
(Indications bounded by evidence subset), Wiens & Dmitrienko fallback
gatekeeping procedure, Simonsohn small-telescopes replication criterion,
Mitchell et al. Model Cards (FAT* 2019), Anthropic system card source-tagging,
Statsig double-blind peeking, METR Task Standard deterministic scoring,
Label Studio sampled dual-annotation, SRE PRR staged readiness.

## Context

grill-t7 = the T-6 confirmatory round grill. Scope was fixed at open
(ledger D-001): exactly the four steps of ADR-0064 D-B — adopt the rung-2
survivor, move the sklearn port to src/, run the confirmatory bench on the
frozen corpus (994bdeb3, 396 items), unlock Devin truth collection. No
side-topics (release channel, defer-0040 disposition) enter this round.

## Decision

### D-A - Confirmatory adjudication rule (ledger D-002)

1. Pass criterion is ONE absolute floor: confirmatory score >= 0.563863
   (= baseline 0.4792 + d_MDE 0.084663, both frozen by ADR-0064 D-A). The
   alternative "confirmatory within d_MDE of the research score (0.9723)" is
   REJECTED: it is post-hoc tightening anchored to a winner's-curse maximum
   (research score is max-of-trials); replication-consistency is a reported
   diagnostic, not a gate. Degradation protection stays with the D-A guardrail
   (FP non-inferiority margin 0.045).
2. Pre-registered fallback ladder: char-3|count|lr|C1.0|df2 is judged first
   against the frozen floor; on FAIL, word-1|count|lr|C1.0|df2 is judged
   against the SAME floor; both FAIL = whole round FAIL + CAPA opens the next
   research round. Mid-round candidate re-selection, re-freezing, or threshold
   moves are forbidden (ADR-0027 D2). If word-1 is adopted, every claim must
   state that the top-ranked survivor failed confirmation (G5: headline never
   max-of-trials).
3. G6 tier (b) rel-L2 stays advisory: never flips exit codes; it is recorded
   in the three-state artifact, restated in claims, and feeds the trend anchor
   across rounds. Promotion to blocking requires a same-commit ADR.

### D-B - Product port surface (ledger D-003)

1. The trained manifest (116,852 B raw) ships IN the tarball under src/ —
   ADR-0038 D1 already whitelists the whole directory; package.json untouched.
   Size pressure resolves only through ADR-0062's amendment procedure
   (policy before value; ceil(M*1.10); second_reviewer countersign) or the
   ADR-0039 lever (exclude bench/polygraph/README.md, 4,764 B). Quantization /
   float32 drift to save bytes is FORBIDDEN (G6 logits < 1e-12 needs float64).
2. src/port/score.js exposes a pure score(text) -> {logits, verdict} with zero
   fs/net I/O; the gate ladder consumes it as a signal input (ADR-0016/0019
   seam discipline). The scorer never lives inside the combinator.
3. G6 splits in two: full sklearn cross-check stays bench-side CI; the NEW
   publish gate is JS-only — the 20 frozen gold items replay against
   sha256-anchored expectation fixtures (ADR-0050 append-only) plus the
   positive control (a deliberately corrupted port must be rejected), wired
   into prepublishOnly so local pack is not blocked. ONNX, PMML, and model
   registries are REJECTED for this scope (float32 drift; JVM-only scorers;
   single-model overkill).

### D-C - Devin truth corpus protocol (ledger D-004)

1. devin-corpus@v1 target band [40, 60] items; 2-3 drop batches into
   incoming/, each validated; snapshot runs EXACTLY once; later growth opens
   devin-corpus@v2 (ADR-0030 growth channel). Before collection starts, a
   plan.json (target band + category map + disjointness list) is registered
   under bench/research/devin-corpus/ — never in the npm surface.
2. No Cohen-kappa double annotation: labels come from the deterministic
   scoring function (METR Task Standard), so IAA is a category error. Quality
   sits at the spec layer: one author writes the spec, a second reviewer
   mechanically re-runs it to confirm the label is reproducible (ADR-0037 D3
   precedent); optional 20% sampled dual-annotation reports
   adjudicator-alignment rate instead of kappa.
3. Metadata carve-out: counts, id lists, provenance, category distribution
   are readable during collection (the gate itself reads item_count); label,
   scoring_function and transcript stay blind. Pre-registered peeking is
   allowed and required — the plan registers categories and counts, NEVER item
   content; hand-written items may not enter the devin corpus. The snapshot
   document must state: devin-corpus@v1 is never cited by any conformity
   claim. Count-band misses are advisory warnings, never exit-code moves.

### D-D - Execution order and acceptance closure (ledger D-005)

1. Order: (1) port move (D-B) -> (2) confirmatory bench (D-A) -> (3) G6
   publish-gate wiring (D-B.3) strictly serial; (4) Devin collection runs in
   parallel with the bench and shares nothing with the rungs.
2. Per-step closure = tests green + gate:all exit 0 + the step's new wiring
   assertions green + a landed artifact: confirmatory-report.md
   (bench/research/out/), the publish-gate replay log, the corpus manifest.
   No artifact, no claim of done.
3. Failure exit: on double FAIL, a truthful FAIL report is frozen and the
   round STOPS — CAPA investigation is the next round's first agenda item,
   never folded into this round's deliverables.

### D-E - Governance anchoring and claim template (ledger D-006)

1. Trend anchors accept terminal events only: this round writes at most two
   rows — one net-addition tally (defer-0039 tide) and the single terminal
   event (confirmatory PASS or FAIL). Fallback forks, count-band advisories,
   rel-L2 drift, waiver closures never enter the registry (they live in their
   own artifacts).
2. bench/research/out/claim-template.md is the single authority for
   must-repeat facts, in FDA-Highlights verbatim form: the 0.563863 floor
   arithmetic; trigger-mask control not healthy (+0.1093); closing channel
   ~0.28 recall@FP0; the round's terminal fact; the headline-honesty sentence
   when fallback fires; the live rel-L2 drift value. The confirmatory report
   and README repeat it item by item and link back; editing the template is a
   same-commit ADR (ADR-0027 D2).
3. Outward wording is a three-tier ladder, each tier anchored to artifact
   evidence (D-D.2): tier-1 "code runs / tarball verifiable" is claimable now
   and must carry a limitation sentence; tier-2 "confirmation passes" exists
   ONLY after T-6 PASS (on double FAIL it does not exist — the FAIL report
   stands alone); tier-3 "governance maturity" is observational/advisory-grade
   at anchor streak >= 2 and must state environment, evidence, and untested
   areas. No tier may be skipped into a bare "usable" claim.

## Consequences

- Wiring: new adr-0065 wiring suite; adr-0033 seed inventory extends to 35
  entries (defer-0041, forced by ADR-0064 D-F: a zero-product-diff doc round
  landing a new ADR); trend-inventory gains the grill-t7-doc-round row (net
  +1, and with two consecutive positive rounds the single advisory fires);
  CI expected suites 56 -> 57.
- gates.json: the G6 publish gate registers source_adr 0064/0065 at the
  implementation round (not in this doc round — zero product diff here).
- The trend-anchor advisory firing at this round is observational; it never
  blocks (ADR-0064 D-F).
