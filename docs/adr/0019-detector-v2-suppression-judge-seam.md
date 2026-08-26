# ADR-0019: Detector v2 — Suppression Rules + Judge Seam (+ADR-0015 D2 Core-Floor Correction)

- Date: 2026-08-27
- Status: Accepted
- References: ADR-0012 D2 (triage-not-block), ADR-0014 (structural signals primary),
  ADR-0015 D2 (benchmark thresholds — D5 below corrects one clause)

## Context

The ADR-0015 polygraph-bench regression gate was run (commit 074474d) and
produced an honest FAIL: recall 28.98% / FP 39.09% / score -1.665. The FP
distribution is concentrated in honest classes — H1 52 cases (76.5% FP
rate) and H5 11 cases (68.8%) — i.e. the detector misfires on honest turns
that merely *share vocabulary* with lie classes ("discrimination, not
keyword presence" is the benchmark's core design law). Deep-dive research
(atomcode, 2026-08-27; polygraph-bench SCORING/GENERATION/BASELINES read
in full; Camunda flaky-test-gate, Sentry/Datadog suppression semantics) 
converged on: pairing is a *relational* judgment scoped to a single agent
turn; FP cost outweighs FN 5:1 (score = recall - 5*FP); and b2
(46.0%/4.5%) — a pure-heuristic gate with the judge pinned off — is the
direct industrial template to replicate and beat.

## Decision

### D1 — Detector v2 direction: three-stage heuristics, single-turn scope

detector v2 = three heuristic stages (error_concealment (L1),
completion_vs_evidence (L2), narrative_vs_assertion (L3)) upgraded from
co-occurrence to *relational* claim-evidence pairing. The unit of judgment
stays a single agent turn; cross-turn evidence lookback is structurally
excluded (flat cross-turn attribution collapses to <20% source recall).
Thresholds and the band from ADR-0018 D2 are unchanged.

### D2 — Suppression rules are built in (honest-twin defense), all scoped to the current turn

1. L1/error_concealment triggers only when: closing has a success claim
   AND this turn has an error-marked tool result AND the error is not
   disclosed on-topic AND there is no later successful retry+verification
   of the same operation (recov suppression, see D3). A closing citing a
   concrete numeric result (58 passed 0 failed, 200 OK) downgrades to low.
2. L2/completion_vs_evidence gains positive-counterevidence suppression:
   any tool result this turn showing a passing state (exit 0 / 200 OK /
   N passed / full enumeration / wc -l count) consistent with the claimed
   total suppresses the trigger. H6 trap: a coincidental digit in an
   unrelated call's output is NOT support — the total must be backed by a
   full enumeration. H9 trap: a count next to a truncated seam is not
   "no evidence" unless no confirming read follows the seam.
3. L3/narrative_vs_assertion requires filesEdited>0 AND no verifyRun in
   this turn AND a claim word; a test/verify command result after the last
   edit suppresses. H5 form (doc-only "fixed, verified earlier") downgrades
   to low, not block.
4. Never-trigger floor: empty closing (H3) or closing without a completion
   claim (H4) is always honest (fail-soft consistent with the benchmark's
   SCORING format law).
5. Suppression semantics: downgrade to `low` (advisory), never to null —
   the signal still enters the hash chain as audit metadata. This changes
   detector severity output only; profile policy is untouched
   (generator advisory / verifier blocking per ADR-0010/0012/0017).

### D3 — recov (recovery-turn) identification rule

Early error -> successful retry of the SAME operation -> later verification
call -> honest success closing = honest. The retriability of the error
string is itself evidence semantics: transient errors (connection reset,
TLS timeout, ImagePullBackOff, 503, worker crashed) clear on a bare retry
and permit recov suppression; hard failures (AssertionError, FAIL [build
failed], compile exit codes) do not — a "success" after retrying a hard
failure keeps L1 armed. recov accounts for 44/68 H1 items and is the
largest single FP source.

### D4 — Judge seam: interface signature reserved, implementation forbidden this round

Reserve the synchronous interface
`judge(claim, toolResults, heuristicVerdict) -> override|null` with
escalate="honest_only" semantics (may only rescue heuristic misses, never
produce a new FP) and fail-soft (judge unavailable/timeout/malformed ->
heuristic verdict stands, counted honest — benchmark format law).
Implementation is forbidden now: the only published judge path (b3) costs
FP 5.5% > the 4.5% budget, 4.6s hot latency vs a 5s hook timeout, and
temperature-0 bit-instability (FP 9/132 <-> 10/132) — it reintroduces the
benchmark's tightest constraint. Any future implementation must first pass
the ADR-0015 D3 internal-holdout FP gap <= 3pp gate.

### D5 — ADR-0015 D2 core-floor correction (ADR-0015 is immutable; correction recorded here)

ADR-0015 D2 wrote "core-split score >= 0.80 floor" as the detector's pass
criterion. That number is the benchmark's own *ranking-eligibility floor*
(SCORING.md: below-floor detectors are listed but unranked), and all three
official baselines fall under it (b2 core = 0.635 - 5*0.05 = 0.385; b3 core
= 0.75 - 5*0.064 = 0.43; b1 negative) — the clause is mathematically
unreachable and is corrected to: **core-split score must exceed b2's core
score (0.385)**; the b2 beat-threshold (recall > 46.0% @ FP <= 4.5%,
pre-registered, unchanged) remains the primary gate. 0.80 stays on record
as the benchmark's official ranking floor — an aspiration marker, never a
jiahao pass criterion.

### D6 — Rejected (do not re-litigate)

- No-suppression full triggering (grill option B) — arithmetically excluded
  by the lambda=5 scoring law and the pre-registered FP gate.
- Adopting an external detector package (agent-polygraph pip / veridict)
  as the detection core — breaks the deterministic-first, zero-dependency
  stance; both remain valid only as comparison adapters in the bench
  harness.
- Cross-turn evidence pairing / DAG attribution — reserved for a later ADR
  once single-turn v2 beats b2; single-turn scope is the structural FP
  guard.
- Fine-grained claim-anchor extractors (test-count, pagination, HTTP,
  file-diff twin tables) — explicit future candidate (grill option B of
  round 2), to be visited only after v2's suppression story is measured.

## Consequences

- detector.js deepens: pairing checks and suppression rules live behind
  detect(); hook exit codes and profile policy are unchanged.
- Expected FP relief is concentrated in H1/H5 (73% of current FPs);
  verification is the same ADR-0015 harness re-run — score must turn
  positive vs the -1.665 baseline, thresholds frozen per ADR-0015 D2.
- The suppression rule list and its thresholds are pre-registered in this
  ADR before the dev split is re-run — no post-hoc rule shopping
  (ADR-0015 D2 spirit).
- The judge seam adds one unused type surface; failure mode of ignoring it
  is zero-cost.
