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

## E-6 second_reviewer=Xxx91n is a delegated signature under standing authorization (disclosure)

Observed 2026-09-16 (锐评 v4 prescription #1, dispositioned grill-t11 P-1): the
instrument chain's `second_reviewer=Xxx91n` attestations are executed by the
main agent under the owner's standing authorization, recorded verbatim
on-event from seq 10 forward ("以后所有全部人工同意，你作为主Agent代替人类签名Xxx91n").
Affected events: seq 6 and seq 8 carry the value inside the E-4
authorization-persistence defect window (the field was not persisted on those
event kinds), and seq 10, 12, 13 carry it with the authorization verbatim
on-record; the registered critique anchored on seq 13's criteria_change. The
registered wording: these are **delegated second-line review, ID-level +
delegation-level independence** - the reviewer id differs from the executing
agent's, but the signing entity is the same agent acting under delegation;
there is no entity-level second line on those events.

Boundary note on the existing grant (P-2 companion): the standing
authorization is open-ended - it carries no scope and no expiry. Under the
Bounded Delegation rule (ADR-0072 D-E) that is a defect in the grant itself;
the forward rule and the pre-staged bounded-renewal template at
docs/governance/delegation-renewal-template.md force renew-or-expire at the
next authorization-bearing event.

Frozen history is never rewritten (seq 6/8/10/12/13 stay verbatim on the
append-only chain); this entry is the correction record. Bound by
test/adr-0072-wiring.test.js.

## E-7 seq-27 record_signoff authorization carries no literal expiry token (registered defect)

Observed 2026-09-18 (grill-t17 D-004 disposition of the t16 audit residue):
the seq-27 `record_signoff` event's authorization ("批准，给你权限 - owner
chat approval 2026-09-18 covering the two unbundled asks (seq-24 record
sign-off + defer-0051 packet ratification)") is scope-bounded to two named
tasks — a self-exhausting expiry equivalent — so the event is
**substantively compliant**; but it carries no literal `expiry:` token,
which is a **literal defect**, registered so a temporary grant cannot
precedent-normalize into a permanent privilege.

Correction (the frozen hash chain is untouched): expiry=任务耗竭 — the
authorization lapses when the two named tasks complete — is recorded here
as the correction record; seq-27 itself stays verbatim on the append-only
chain.

Convention sharpened forward: signoff-class authorizations carry the
literal `scope:`+`expiry:` tokens in the authorization field — the
bounded-grant template at docs/governance/delegation-renewal-template.md
already existed; verbatim use was the missing step (E-4/E-5 pattern: the
obligation binds events appended from the registration boundary forward).
Not gated in the instrument CLI: the authorization field is verbatim human
text, not a machine-readable field.
