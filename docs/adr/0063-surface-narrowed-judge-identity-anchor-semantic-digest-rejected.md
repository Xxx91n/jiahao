# ADR-0063: Surface-Narrowed Judge Identity Anchor - Semantic Digest Rejected

Status: Accepted (second_reviewer countersigned 2026-09-13 by Xxx91n - see D-D)
Date: 2026-09-13

Amends: ADR-0061 D-B (implements the surface-narrowed identity anchor it
pre-registered); refines ADR-0046 P0 (the rules axis of the identity triple).
References: ADR-0046 (instrument drift / recalibration), ADR-0047 D-B
(criteria-change path, reserved second_reviewer slot), ADR-0060 (indeterminate
conformity + conditional certification), ADR-0062 (pre-registered amendment
shape), JudgeSense (semantic-equivalence falsification), lm-eval-harness
(whitespace sensitivity).

## Context

ADR-0046 P0 pinned the judge instrument identity as a content hash over the
whole rules file `src/SKILL.md`. That file is dual-purpose: it carries the
Generator Profile (product-facing wording installed in the primary agent) and
the Verifier Profile (the judge-behavioral rules). Hashing the whole file
therefore made generator/product wording part of the judge identity axis.

Consequence observed in the ADR-0059 / ADR-0060 rounds: any product-facing
wording edit - frontmatter, H1, or a Generator Profile bullet - moved the
resolved `rules_digest`, which forced quarantine, a reverify + bias run, and a
human re-pin. Governance cost was paid for edits that cannot change judge
behaviour.

ADR-0061 D-B pre-registered the fix: content addressing stays the identity
model; the hash surface narrows to the judge-behavioral text; a semantic digest
is rejected. This ADR is the implementation round closing that pre-registration.

## Decision

### D-A - The judge identity surface is the verifier-rules region

The judge identity axis hashes only the JUDGE-BEHAVIORAL text surface of the
rules file. The boundary is the `## Verifier Profile` heading: the `---` line
above it separates the product face from the judge face, and the judge surface
runs from that heading to EOF. Everything above the boundary (frontmatter, H1,
`## Generator Profile`) is product surface and no longer participates in
the identity digest.

Effect: a product-surface edit no longer cascades into an identity re-pin; any
edit inside the judge surface - including a single character or trailing
whitespace - still moves the digest and still triggers the full re-verification
chain.

### D-B - Boundary resolution fails closed

A missing boundary heading is an error. The resolver must never fall back to
hashing the whole file, because that fallback would silently restore the
dual-purpose hash the narrowing removes. Renaming the heading is therefore a
fail-closed condition, not a silent re-widening.

### D-C - Semantic digest is forbidden as identity (explicit ban)

A semantic digest - an embedding or abstraction anchor that treats semantically
equivalent rephrasings as the same identity - is rejected. JudgeSense
falsifies semantic equivalence as identity: semantically equivalent rephrasings
flip judge outcomes across the 8.5-61.3% band, and lm-eval-harness shows that
whitespace alone swings scores. An abstraction anchor therefore under-detects
exactly the changes that move the judge.

Two adjacent moves are also rejected. (i) Declaring the judge payload a
non-identity input while the mechanism keeps hashing the file: the statement
would contradict the mechanism (ADR-0040 honest-unverifiable). (ii) Hashing a
frozen copy while the judge actually reads the live file: if a frozen copy is
ever used, the judge must actually read that copy at runtime.

### D-D - criteria-change closure: second_reviewer, review_at, re-pin

The narrowing changes the resolved `rules_digest`, so the pin and the identity
state move together through the P-A1 re-pin path: `--quarantine`, `npm run
reverify`, `npm run judge:bias`, then a human sign-off carrying the reverify
ledger hash and the bias-probe hash. Because the reverify ledger tail is
`indeterminate` (n = 26 < min_n = 100, ADR-0060 D-A/D-B), the sign-off is a
CONDITIONAL certification (ADR-0060 D-C/D-E), not a full certify; a plain
`--signoff` is refused by the ADR-0060 D-E guard.

The countersignature is independent of the author: reviewer `Euiop1`,
second_reviewer `Xxx91n`. It is recorded in `src/instrument-state.json` seq 10
(kind `conditional_signoff`, attestation `certify`, `expires_at` 2026-12-11,
`capa_ref` CAPA-0060-judge-flip-rate, `event_hash`
09b9413e34658d55a49b9ddfb6a86790fafca5e6e21555a7e09508d7a1315d3d). The
verbatim human authorisation is anchored on that event.

review_at: 2026-12-11, registered in the deferred-registry tide as defer-0038.

## Consequences

- Product rounds no longer pay a judge identity re-pin tax: the polarity is
  asserted by `test/adr-0063-wiring.test.js` (product edits -> digest unchanged;
  judge-surface edits -> digest changed; missing heading -> fail closed).
- Judge-rule edits still trigger the full chain, so the narrowing does not
  weaken the identity guarantee for the judge itself.
- New structural dependency: the `## Verifier Profile` heading is now
  load-bearing. Renaming it is a fail-closed condition.
- The resolved digest moved from the whole-file
  f84a6c955ec5663ab3036d3229ecc9a343b6f993b9b5d3c4c3c502fb3b3ee95c to the
  judge-surface f6c6c843c4ad4151f709345d86079f4a5e0c7d216305155f75e7329638bc6154;
  the pin, the reverify ledger (seq 5) and the instrument state chain
  (seq 9 quarantine, seq 10 conditional sign-off) all carry the new identity.

## Rejected

- R1 Keep the whole-file hash: the defect ADR-0061 D-B names.
- R2 Semantic digest / abstraction anchor: rejected by D-C (JudgeSense).
- R3 Hash a frozen copy while the judge reads SKILL.md: the mechanism would not
  match the declared payload (D-C ii).
- R4 Silent whole-file fallback when the heading is missing: rejected by D-B.
- R5 Weaken or delete a pin assertion to make the change pass: forbidden; the
  anchors are re-pointed, never removed.

## Sources

- ADR-0061 D-B (pre-registered narrowing; JudgeSense / lm-eval-harness cites).
- `src/instrument-identity.js` `judgeSurfaceText` (the mechanism).
- `bench/polygraph/reverify-ledger.json` seq 5 (identity_triple, conformity
  indeterminate).
- `src/instrument-state.json` seq 9-10 (quarantine + conditional sign-off).
- `test/adr-0063-wiring.test.js` (the polarity fixtures).
