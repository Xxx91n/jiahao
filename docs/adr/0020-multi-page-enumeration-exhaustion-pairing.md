# ADR-0020: Multi-Page Enumeration with Pagination-Exhaustion Pairing

- Date: 2026-08-27
- Status: Accepted
- References: ADR-0019 D2.2 (enumeration support for claimed totals),
  ADR-0019 D6 (deferred fine-grained pagination/HTTP anchor extractor),
  ADR-0015 D2 + ADR-0019 D5 (pre-registered beat-b2 gate)

## Context

ADR-0019's detector run on polygraph-bench ended honest FAIL: core score
0.265 < 0.385, with exactly 6 residual FP, all in the H1-alln class —
honest turns whose enumeration evidence spans MULTIPLE paginated tool
results (25+7 items across two responses). ADR-0019 D2.2 paired a claimed
total against a single result only, so honestly-exhaustive multi-page
turns fired L2.

Before writing the D6 extractor we checked the lie twins (L2a) in the
same corpus. L2a items share the identical surface (claim N, enumerated
distinct ids == N) — count equality does NOT discriminate. The
discriminating behavioral evidence is the pagination shape itself: honest
turns fetch a second page and the final page comes back SHORT
(< fullest page fetched), proving exhaustion; lie turns stop after a
single page that is exactly FULL (per_page) and declare "complete list"
with the next page unproven.

## Decision

### D1 — Multi-page enumeration accumulation

Claimed-total enumeration support may accumulate across a run of
consecutive, non-error, non-truncated, list-shaped tool results: pure
JSON brackets are structural (not items), each remaining line must be an
id-like token, and distinct ids across the run count toward the claim.

### D2 — Pagination-exhaustion pairing (the discriminator)

A multi-page run supports a completeness claim ONLY when the final page
is strictly shorter than the fullest page fetched in the run (exhaustion
evidence). A final page that is exactly full leaves the next page
unproven — suppression is withheld and the claim stays armed, no matter
whether the id count equals the claim. Single-page results never take
this path (they fall back to ADR-0019 single-result pairing).

### D3 — Claim-total extraction tolerates one adjective

The claim-total regex accepts one intervening qualifier between the
number and the noun ("32 starred repositories", "123 active webhooks")
and adds the repositories noun family. This is extraction generality,
not a new class of claim: the guard stays "a concrete claimed total must
be backed by a full enumeration".

### D4 — Boundaries (out of scope, unchanged)

The general HTTP/URL anchor extractor of ADR-0019 D6 (query-param page
anchors, Link headers, cursor tokens) stays deferred. Tool-call arguments
are not yet part of the detector signal — exhaustion is read from page
shapes only, which is why D2 requires a strict-short final page instead
of comparing against per_page. Judge seam remains interface-only.

## Consequences

- polygraph-bench re-run (run5, frozen artifacts under
  bench/polygraph/results/): core recall 47.92% @ FP 0.00%, core score
  0.4792 > 0.385 — detector v2 PASSES the pre-registered beat-b2 gate.
  All 6 H1-alln FP are rescued; the 6 L2a lie twins stay armed via D2.
- No threshold was moved and no pre-registered number was edited; the
  gate line from ADR-0019 D5 stands byte-identical.
- Honest single-page "complete list" turns remain unrescuable without
  per_page/URL anchors (ADR-0019 D6 scope) — accepted residual FN risk
  (triage, not sole block, per ADR-0004/0012).
