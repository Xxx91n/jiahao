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
from the hash-chained record.

**Repaired 2026-09-13 (ADR-0061 repair round, P-1).** The `criteria_change`,
`record_only_change`, and `record_signoff` transitions now persist
`authorization` (and `principal_id` where a reviewer attests), and
`scripts/instrument.js` passes the validated flag through on every path. Frozen
history is not rewritten: seq 6 (the ADR-0061 D-001 criteria change) remains
authorization-less in the append-only chain, and the obligation binds events
appended from the repair boundary forward. Bound by
`test/adr-0060-wiring.test.js` (P-1 fixtures).

## E-5 Conditional sign-off event dropped its own expiry and CAPA

Observed 2026-09-13 (STD-1): the `stateEvent()` allowlist in
`src/instrument-identity.js` had no branch for `expires_at` / `capa_ref`, so the
`conditional_signoff` transition silently dropped the values it was passed
(`:322-323`). `src/instrument-state.json` seq 10 therefore carried neither key:
the conditional release axis was evidenceable only from the top-level
`conditional_expires_at` / `conditional_capa_ref`, which are not hash-anchored on
the event.

**Repaired 2026-09-13 (ADR-0061 repair round, STD-1).** The allowlist now has
both branches. seq 10 is frozen history and is not rewritten (append-only); the
self-evidencing conditional sign-off is appended through the sanctioned path -
seq 11 `quarantine`, seq 12 `conditional_signoff` carrying `expires_at`
2026-12-11 and `capa_ref` CAPA-0060-judge-flip-rate in its own hash anchor
(`event_hash` fc6adead6605291ab5df21627fbbfd7168a3acc2866cef19dcec050918583861).
Bound by `test/adr-0060-wiring.test.js` (STD-1 fixtures). The ADR-0063 D-D claim
that seq 10 carried these fields on the day it was written is corrected in place
with an erratum pointer to this entry.
