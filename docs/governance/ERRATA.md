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

## E-8 grill-t26 audit ACCEPTED-AS-IS: cx/evd/rr identifier naming (reopen-trigger registered)

Observed 2026-09-25 (grill-t27 D-005 residual-scope bookkeeping): the t26
dual-axis review dispositioned the audit's mysterious-identifier finding
(provenance legs named cx/evd/rr across the 0083/0084 wiring suites) as
ACCEPTED-AS-IS - a judgement call: rename churn is not worth a
sealed-machinery diff. The disposition stays terminal and the pinned t26
claim artifacts are NOT edited; this erratum appends the reopen trigger
from the t27 side (append-only correction channel, D-005(ii)):

reopen-trigger: reopen iff the sealed machinery is unsealed for another
reason, OR evidence shows the naming difference causes a real defect.

## E-9 grill-t26 audit ACCEPTED-AS-IS: report evidence-index tabulates wave-1 (reopen-trigger registered)

Observed 2026-09-25 (grill-t27 D-005 residual-scope bookkeeping): the t26
round report's evidence index tabulates wave-1 (all EXIT 0) while the
committed evidence files are the terminal wave carrying the 3
regen-boundary red legs - disclosed in SEAL/commit/handoff, and the t26
audit dispositioned it ACCEPTED-AS-IS (the committed report is a pinned
claim artifact; post-hoc edits would rewrite a claim). The disposition
stays terminal; this erratum appends the reopen trigger from the t27 side
(append-only, D-005(ii)):

reopen-trigger: reopen iff the index error makes a claim unverifiable; the
correction is then an appended erratum pointing at the terminal wave, never
an edit of the pinned report.

## E-10 - grill-t27 report freshness row vs committed terminal-wave evidence

The t27 report section 2 freshness row ('all rounds clean; t27 pre-seal evaluated 0
claims') describes the claim-commit-time capture only. The committed terminal
wave (captured-at-head 5cb2a9fe) and the audit-window re-evaluation both show
`claimFailures: 1` for grill-t27 - the 13 `header < floor` flags produced when
`but move grill-t27 --above grill-t27-docs` rebased the lane and orphaned the
pre-restack `a1776dde` capture heads. The flags are honestly disclosed in the
SEAL comments + ledger D-010; the SEAL's phrase 'disclosed in the ledger
addendum + report' is half-accurate - the pinned report never carries them.
Correction channel: this erratum, per the append-only rule for pinned claim
artifacts (disposition of the t27 second-party audit, F-2).

## E-11 - grill-t27 ledger D-009 commit count

Ledger D-009 records 'Total landed commits on the grill-t27 lane: 10 (incl.
claim commit + SEAL + post-seal regen)' - a claim-time projection stated as
final. The landed lane holds 13 commits (+1 on grill-t27-docs = 14); the count
omits the SEAL-declared last-substantive 5cb2a9fe (zh-CN baseline re-pin after
the restack) plus the regen cfcdda8d and terminal-wave 67521393 commits.
Corrected count (audit-window re-verified): 13 lane commits + 1 docs-lane
commit, plus 3 disclosed undone commits (sweep a9d60dc5, first SEAL + first
post-seal regen). (t27 audit F-3.)

## E-12 - stale non-ancestral sha in pinned t27 artifacts

The pinned handoff `2026-09-25-handoff.md` and the claim commit's embedded
evidence still name `a1776dde` - non-ancestral after the lane restack. The
operational copies are corrected in `handoffs/next-round.md` (bookkeeping
channel); the pinned artifacts stay byte-stable per the append-only rule.
(t27 audit F-6.)
## E-13 - ADR approval-surface drift: bare `- Status: Accepted` form since t15 (unregistered, pending confirmation)

Observed 2026-09-26 (grill-t28 D-002 disposition of critique V7 finding 1):
ADR-0076 through ADR-0085 in the bare form (0076, 0077, 0078, 0079, 0080,
0081, 0083, 0084, 0085 - ADR-0082 keeps the older countersign-slot form
via defer-0068) carry `- Status: Accepted` with no `second_reviewer`
countersign slot. Archaeology (grill-t28 D-002 record): the bare form was
born at ADR-0076 (t15, commit e03324e3) as an ADR-FORMAT.md
minimal-template adoption artifact - no decision record exists in the
t15/t16 ledgers, specs, reports, audit reports, or PR history. Two
approval forms therefore coexisted unregistered from t15 until this
entry.

Registration (pending-confirmation wording - the accidental-stripping
characterization is NOT asserted as adjudicated fact): the
`second_reviewer` countersign obligation is presumed subsisting on all
nine ADRs; the bare form since t15 is registered here as unregistered
drift pending entity-level adjudication. The nine ADRs merge into the
countersign queue (10 -> 19 rows) for the 2026-12-15 entity-level tide,
tracked by defer-0074; each affected ADR carries an appended
pointer-annotation line naming this erratum. NO new ADR is minted -
archaeology proved nobody decided the form change; the sole reversal
path (consensus evidence for the bare form surfacing later) is
pre-registered as a lightweight registration ADR. Whether the errata
adoption itself needs the same-level approval as the original
ratification is reserved to the human authority.

Audit-PASS (first-line self-check) is never stated as substituting the
second-line countersign (IIA three-lines model). Bound by
test/adr-0084-wiring.test.js.
