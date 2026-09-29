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

## E-14 - seq-13 standing grant default-expiry annotation (pending confirmation)

Observed 2026-09-26 (grill-t28 D-004 disposition of critique V7 finding
4): seq-13 (`criteria_change`, authorization "以后所有全部人工同意，你
作为主Agent代替人类签名Xxx91n") is an open-ended standing grant that
predates the expired-by-default convention. This entry is the append-only
annotation channel; the grant body stays verbatim on the frozen hash
chain (POA discipline - registered authorizations are never modified in
place).

Annotation (pending owner endorsement, pending-confirmation wording):
unadjudicated at the 2026-12-15 tide => inert for events after that
date; frozen history untouched. The three-way adjudication draft (renew
with expiry / expire / exemption with expiry) is staged in
.scratch/grill-t28/human-authority-package.md for the owner.

Auto-inert is a safety-engineering convention, not universal law
(the durable-POA counterexample) - hence the pending-confirmation form;
no agent unilateral expiry or generalization (a criteria-change-level
act, needs second_reviewer + review_at). Bound by
test/adr-0072-wiring.test.js.

## E-15 - claim_surfaces.exceptions registered agent-side without a channel (t28 audit F-8)

Observed 2026-09-27 (grill-t29 T-2 disposition of t28 audit F-8): the
t28 fix round appended reports/audit-report.md to
claim_surfaces.exceptions as a bare string. The registration intent was
correct (the second-party audit report legitimately rests on the claim
surface; residence is not adjudication) but procedurally defective: no
registered deviation channel existed to hold the append, so it bypassed
the schema that now exists. Recorded as a process-improvement /
channel-enablement defect - NOT a freeze violation: the append touched
registry bookkeeping, never sealed evidence or a SEAL file.

Disposition: re-registered through the exception channel as
status: pending-confirmation / expires_at: 2026-12-15 (ADR-0086 D-B);
owner ratify/revoke is item 1 of the t29 human-authority package.

## E-16 - t28 report "180+" claim imprecise; ADR-0084 second appended line disclosed (F-9/F-10)

Observed 2026-09-27 (grill-t29 T-8): .scratch/grill-t28/reports/
2026-09-26-report.md claimed "node --check over 180+ shipped .js"; the
verified count is 161. The claim artifact is sealed, so the correction
rides the fix round as a forward commit to that file, bound to exactly
that commit via a for_commit exception-channel entry
(pending-confirmation, expires_at 2026-12-15) - not a history rewrite.

Same round discloses F-10: ADR-0084 carries a second appended line
("queue now runs 19 rows") reconciling the stale "(10 entries)"
bullet alongside the E-13 pointer line. The append was registered at
landing time but was not called out in the t28 report; it is named here.

Bound by test/adr-0086-wiring.test.js.
## E-17 - terminal-wave ordering defect: rewrite-map regenerated before the final re-pin (grill-t29 audit A-1)

Observed 2026-09-27 (grill-t29 second-party audit, fix-window rework): the
terminal wave commit c2768fc8 regenerated docs/rewrite-map.json while the
evidence headers still pinned bd10ef66, then re-pinned all captures to
f9bcc13f inside the same commit - the committed tree was stale at landing
("docs
ewrite-map.json is stale", legs 208/209 red at audit HEAD). The
"green terminal" the round report cited measured a pre-re-pin intermediate
tree that existed in no commit. Root cause: the post-claim re-capture
convention lacks a "regen derived artifacts AFTER the final pin" step.

Repair path (fix window, this lane): the wave commit was uncommitted
pre-push (t27 precedent), the defect corrected by regenerating the map
only after all pins and doc cites were final, and the wave+SEAL re-issued
at the true terminal tip. The stale window (c2768fc8..HEAD at audit time)
is disclosed in the round report deviations (P-1/P-2); the discarded
commit shas remain reachable only as objects - disclosed, not hidden.

Convention tightening: the terminal-wave order is now explicit -
re-capture first, derived-artifact regen last, verify --check/--published-
only against the post-commit tree, then declare. Owner may elect to keep
the E-numbering or fold this into a process note; registered here per the
audit window's recommendation.

Bound by test/adr-0086-wiring.test.js + the 208/209 legs themselves.

## E-18 - grill-t30 closeout orphans: discarded wave sha + pre-restack fix sha cited in claim artifacts (audit A-2/A-3)

Observed 2026-09-27 (grill-t30 second-party audit FAIL, fix window): two
orphaned shas remained cited in the committed round artifacts after the
closeout waves were rebuilt via `but uncommit` (t29 precedent, pre-push):

- `52e857f5` - the discarded first terminal wave (seal-declares-78bbb3b8
  generation). Cited at `.scratch/grill-t30/reports/2026-09-27-report.md`
  line ~114 as the subject of the leg-224 closeout defect disclosure.
  Live counterpart lineage: the rebuilt seal wave `a15e8c0f` (SEAL
  declares substantive anchor `cba768aa`). The cite is retained in prose
  because it names the object the defect report is about; this erratum is
  its registration. Its map row is honestly labeled
  `unresolved hex literal` - not rewritten.
- `189e4e80` - the pre-restack sha of the leg-224 fix that landed as
  `cba768aa` after the uncommit/re-commit sequence. Cited at report
  §3.1 item 0 and handoff lines 7-8. Corrected in place (prose rebind
  to `cba768aa`, t29 `bd10ef66` precedent) by the repair wave; the
  orphan is recorded here. Handoff lines 7-8 additionally stated the
  SEAL declares `189e4e80` while the committed SEAL names `cba768aa`
  (audit A-3, claim-accuracy defect) - corrected by the same rebind.

Process note (audit P-1): the red this erratum closes is the same failure
class leg 224 was built for - stale-at-audit map after a wave rewrite. The
repair discharges grill-t28 D-005 (post-restack orphan ritual) for these
two objects.

Bound by the erratum convention and leg 219 (orphan-ancestry): neither
orphan sits on a pin_patterns line, so no errata_exemptions row is
required - the registration is documentary.
## E-19 - grill-t30 closeout orphans, second recurrence: intermediate seal/claim waves + audit-lane pin (loop-2 re-audit)

Observed 2026-09-27 (grill-t30 loop-2 re-audit, fix window): the same
E-17/leg-224 drift class recurred a third time inside the repair window
itself. The tail rebuild that replaced seal wave `ad5a6393` + claim wave
`7aa9391d` with the README-sync chain orphaned both; report rev-2
section 3.3 cites them by sha in prose ("discarded waves ... remain
objects" - the disclosure is factual, the cites are kept) while the map
labels drifted to `unresolved hex literal`. Their live counterparts are
the successor waves re-landed on `grill-t30-impl` (named by role, not
sha - the successors' own shas shifted again under this rebuild, the
class's whole point).

Full orphan roster cited by committed round artifacts across the
rebuilds (all pre-push, objects retained, disclosed): `a15e8c0f`,
`d6ffb5b8`, `703b935d`, `8942e2d8` (audit-report pin, exemption
registered), `ad5a6393`, `7aa9391d`, `c22c01ae` (re-audit pin,
exemption registered), `9b47afdf` (the first audit commit, superseded
by its byte-identical re-lands on grill-t30-audit), plus the superseded
waves of THIS rebuild (`cf5e42c7`, `8a6855f3`, `0c9b1c94`, `08a2ab9a`)
which are cited only in commit messages and pool prose - not in
committed doc files.

Same event, audit lane: the loop-2 re-audit report pins
`captured-at-head: c22c01ae` = the audit-lane content tip at re-audit
entry. Any further tail rebuild (which this repair performs) restacks
the audit lane and orphans that commit - prospectively registered in
freshness.orphan_ancestry.errata_exemptions (file+sha bound, E-19).

Convention tightening (the auditor's Reading B, adopted): the wave-
closeout order gains an explicit final leg - after the LAST but mutation
(commit/uncommit/move/restack) settles and before declaring, re-run
`node scripts/build-rewrite-map.js --check` against the settled tree.
Three recurrences (E-12, E-17, E-19) all lived in exactly that gap.
Recorded in AGENTS.md wave-closeout bullet.

Bound by the erratum convention and leg 219; pin-side exemptions carry
the mechanical part.

## E-20 - grill-t31 restack orphans: report cites pre-restack wave shas; SEAL lineage comment cites pre-restack seal (audit A-1)

The t31 audit (`.scratch/grill-t31/reports/2026-09-28-audit-report.md`)
found committed round artifacts citing commits that the closeout-tail
restack orphaned:

- `.scratch/grill-t31/reports/2026-09-28-report.md` L22-23 cite
  `d7ddd772` (governance closeout, re-landed as `636f274b`) and
  `6e2334bf` (folded into the terminal claim wave) — pre-restack objects.
- `.scratch/grill-t31/SEAL` lineage comment cites `49700fac` (the first
  seal commit, uncommit-ed during the disclosed repair) and `d7ddd772`.
  The `seal:` pin itself names `f4ea1a38` — live and ancestral; only the
  comment prose holds orphans.
- The repair-window restack itself orphaned a second generation: seal
  commits `nwo`/`uoq`/`mut` (162da5d2, declared b0504f28 before the
  evaluate.js residue commit surfaced), claim-wave commits `mpk`
  (12cf8e5a), `srr`, `wlr`, `uur` (4c0fa399) — cited only in the SEAL
  prose comment and this entry; objects retained, disclosed.

None sits on a pin_patterns line (`seal:`/`captured-at-head:`), so no
errata_exemptions row applies; this documentary entry is the
registration. The objects are retained in the object store; the rewrite
map classifies them `unresolved hex literal` and `--check` is green
again on the regenerated map.

The same erratum records three report prose nits (fixed text, not
re-edited — claim artifacts stay as-committed): "6 lib modules" should
read 7 (tools/lib has seven files); the "24/24 defect checks" figure is
the check-FILE count (8 per workbench); the wave table omits in-registry
docs commits `c50518ea` and `453d13f7` which rode the same lane.

Disposition: repair-window wave fixes the live defects (VERIFY_RE byte,
spans exclusion, binding hard errors, matrix vacuity) and regenerates
the map; this entry + a decision-ledger repair record carry the
documentation half.

## E-21 - grill-t31 repair handoff appendix: stale seal field (audit F-R2-2)

The repair appendix of `.scratch/grill-t31/handoffs/2026-09-28-handoff.md`
(L99) states "Seal re-issued: `seal: b0504f28` (post-repair substantive
tip)". That sentence froze an intermediate state: two residue commits
(`aab0a3b4`, `b9396688`) landed after it was drafted, and the terminal
SEAL file declares `b9396688d9f06f8d3349202582bb141576a89d77` (seal
commit `be81e11a` on the t31 lane). The stale sentence names the docs
wave tip `b0504f28` — a real commit but not the declared tip.

No correction is applied to the committed handoff text (claim artifacts
are immutable once committed; E-20 registers the orphan family this
lineage produced). This entry is the standing correction:

- `seal:` declared tip = `b9396688` (see `.scratch/grill-t31/SEAL`),
  not `b0504f28`.
- Topology: `87192ded` impl -> `b0504f28` docs -> `aab0a3b4` impl
  residue -> `b9396688` docs residue -> `be81e11a` SEAL -> claim wave.

## E-22 - grill-t32 cutover: 187 degraded registry entries - the purge-population documentary record (audit F-2)

The grill-t32 cutover backfill registered 187 cited SHAs whose objects are
absent from the object store (the pre-purge citation population - sanitized
history rewrote them out; objects cannot resolve, so no live snapshot is
possible). These entries carry the degraded form: snapshot=null,
object_purged_at set at registration time, and now errata_ref=E-22 appended
via the orphan-cites annotate verb (append-only: each degraded sha received
a newer adjudicating copy carrying the back-pointer; originals untouched).

This entry is the standing disclosure that population points to: the 187
cites are historical claims to objects destroyed by the purge or never
present - registration-as-orphaned is the correct terminal state, not a
repair backlog. If any of these objects ever regains refs, the recorded
path is register --revive (append, latest registered_at wins), not entry
re-editing. Live-snapshot entries (90 at cutover) intentionally carry no
errata_ref - they are live-object registrations, not this disclosure's
subject.

## E-23 - grill-t32 closeout accuracy: migration-diff figures + commit list (audit F-4/F-5)

The committed round report (.scratch/grill-t32/reports/2026-09-28-report.md)
and ADR-0089 cutover notes cite a migration diff of local-only 1040->7,
unresolved 618->0, rewritten 104->105. Those v1-side endpoints are not
reproducible from the committed cutover parent; they mix the round-open
baseline (b06f4a97: 1040/104) with the cutover parent. The committed-parent
truth (map inside 1f6bd1fd^):

- v1 at cutover parent: doc_refs 3609; rewritten 105; published-unchanged
  2462; local-only 1042 (= unresolved-hex-literal label 1034 + pre-purge
  object 1 + local object 7). v1 carried no unresolved CLASS - unresolved
  was a label under local-only; the claimed 618 appears in no committed map.
- v2 (current): doc_refs 3611; rewritten 105; published-unchanged 2463;
  local-only 8; orphaned-cite 1035; unresolved 0. The honest semantic delta
  is the label->class promotion: the 1034 dead-label rows + 1 pre-purge row
  moved to orphaned-cite (1035), the 7 live local objects kept local-only
  (8 after later claim-file regens), rewritten unchanged at 105.

The same erratum records the closeout document's stale commit enumeration
(nww->kxx squash, mzm->mzmz rename, sor+tts unlisted; tts landed after the
report commit). Claim artifacts are immutable once committed - this entry
is the standing correction.

