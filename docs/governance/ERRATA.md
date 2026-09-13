# ERRATA - recorded corrections to governance artifacts

ADR-0061 D-E (Witnessed Digest Anchor): this file is an authoritative copy in
git-tracked storage outside the npm tarball whitelist. Digests live in
`anchors.json`, checked by `node scripts/build-governance-anchors.js --check`.

## E-1 Withdrawn ADR-0039 cap amendment (commit 5567bd8)

An amendment that applied ADR-0039 D3 formula to the *current* tarball size,
and cited a narrowing-round M of ~199,943 bytes that does not exist in
ADR-0039, was **withdrawn**. Retained as the anti-pattern reference for the
pre-registered gate-amendment procedure. Superseded by ADR-0062 (policy before
value; periodic trend anchor; cap 200,000 -> 230,000).

## E-2 Falsified size estimate (~50 KB)

The original taskbook estimate of < 60 KB for the npm tarball was computed on a
stale tree and is physically unreachable while `docs/adr` rides the artifact.
Replaced by the measured-anchor budget (ADR-0039 D3).

## E-3 Corpus capability predicate (ADR-0040 D1)

D1 read "private/bench-corpus/ directory exists". Amended 2026-09-13 (ADR-0061
D-F) to "exists AND is non-empty", so a stale/partial CI restore degrades to
exit 2 UNVERIFIABLE instead of running its gates red.

## E-4 Human-authorisation text not persisted on criteria_change / record_signoff

Observed 2026-09-13: `scripts/instrument.js` requires `--authorization` (min 10
chars) for a human sign-off, but the `criteria_change` and `record_signoff`
branches of `src/instrument-identity.js` do not write it into the event (only the
`signoff` branch does). The guard fires but the verbatim authorisation is dropped
from the hash-chained record. Not repaired this round (outside T-1..T-5 scope).
