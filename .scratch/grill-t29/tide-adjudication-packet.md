# grill-t29 Tide Adjudication Packet

Round: grill-t29 (t28-audit disposition round)
Prepared: 2026-09-27 (agent-side draft — nothing below has been executed)
Owner authority: Xxx91n
Tide date: 2026-12-15 (defer-0074 anchor; defer-0075 carries the capacity observation)

## Purpose and ground rules

This packet stages every pending human-authority decision for the
2026-12-15 tide, front-loading the five substantive adjudications
identified by the grill-t29 decision ledger (D-005): F-8
retro-ratification, seq-13 standing-grant adjudication, ratchet-brake
adoption, F-12 errata-vs-reseal, and the `adjudicated/grill-t27` tag.
The countersign queue rides as routine bulk at the end.

**Nothing in this packet has been executed.** No tags exist, no
verdicts are recorded, no countersigns are appended, no registry rows
have been closed. The agent registered machinery and drafts only; the
owner adjudicates. Each item states its options both directions, gives
the agent's recommendation explicitly marked as non-binding, and ends
with a signature line.

Foundation: this packet extends (does not replace)
`.scratch/grill-t28/human-authority-package.md`, which carried the
seq-13 adjudication, amendment acceptance, expired-by-default
generalization, seq-13 grant-body decision, tag adjudication memo,
countersign queue expansion, and ratchet-brake carryover. Where this
packet repeats those items, the t28 rationale applies unchanged; the
t29 additions are the exception-channel context (ADR-0086) and the
F-12 seal-integrity case.

Discharge paths: items marked **tide** discharge at the 2026-12-15
entity-level review; items marked **interim-eligible** may be discharged
early by owner bulk action without waiting for the tide (the capacity
pressure is the owner's call, not the schedule's).

---

## Item 1 — F-8: retro-ratification of the `claim_surfaces.exceptions` registrations (tide)

**Context.** The t28 second-party audit recorded F-8: the fix round
appended `reports/audit-report.md` to `freshness.claim_surfaces.exceptions`
as a bare string, bypassing a deviation channel that did not yet exist
— a process-improvement defect (ERRATA E-15 records it as
channel-enablement, not a freeze violation; the append never touched
sealed evidence). Under ADR-0086 the field is now exception-channel: the
entry is re-registered as an object
`{path, status: pending-confirmation, requested_by, reason, expires_at:
2026-12-15, scope}` — registered and effective immediately by the
channel contract, pending your adjudication. A second pre-existing entry
(`handoffs/next-round.md`, registered by ADR-0085 itself) is under the
same channel; its ratification rides with its carrier ADR's countersign
(item 6), not here.

**Options.**

| Option | Meaning | Consequence |
|---|---|---|
| Ratify | The exception stands; `reports/audit-report.md` may rest on the claim surface | Entry status -> `ratified` (owner action), expires_at kept at the tide; audit-report commits stay bookkeeping-free as intended |
| Revoke | The exception is withdrawn | The file classifies back as a claim; the 2026-09-26 audit-wave commits touching it become claim commits — claim-point evaluation re-runs against them; a revoke entry stays as terminal history |

**Recommendation (agent, non-binding):** Ratify. The audit report is
examiner work product — under never-commit `audit-evidence/` would be
wronger (it IS a committed claim-surface artifact); the exception is the
honest classification. The procedural defect is already recorded in
E-15; revoking it now would misclassify the artifact rather than punish
the append.

Both directions honest: ratify accepts that agent-side registration was
procedurally thin (mitigated now by the channel); revoke signals that
unratified agent registrations carry no force — at the price of
reclassifying artifact residence, not reversing anything.

Owner action (if ratify): set the entry `status` to `ratified` in
`docs/governance/surface-taxonomy.json` (freshness.claim_surfaces.exceptions[1]).
If revoke: set `status` to `revoked` — the channel lapses it immediately.

Signature: ____________________  Date: ____________

---

## Item 2 — seq-13 standing-grant adjudication, three-way (tide)

**Context.** Carried verbatim-forward from the t28 package (item 1):
ADR-0079 defined the standing grant for live-run evidence; seq-13 of the
grill runbook exercised it. The owner's three-way fork remains open:
(i) **fold back** — the seq-13 exercise stands and is folded into the
grant's standing authority; (ii) **rescind/revocation** — the exercise
is voided and the grant language tightened; (iii) **expired by default**
— the grant lapsed under the default-expiry clause and no live authority
remains. The t28 package items 2–4 (template-amendment acceptance,
expired-by-default generalization to seq-12+, grant-body decision) are
components of whichever direction you take and are re-staged here as a
single adjudication.

**Options.**

| Option | Meaning | Consequence |
|---|---|---|
| Fold back | seq-13 exercise affirmed; grant text stays | Standing authority confirmed; template amendment accepted; grant body ratified |
| Rescind / revoke | seq-13 exercise voided | Grant-body decision reverses; dependent evidence runs lose authority; ADR-0079 amendment required narrowing the grant |
| Expired by default | No standing authority exists today | Grant text is historical; future exercises need fresh grants; seq-12+ default-expiry generalization confirmed as doctrine |

**Recommendation (agent, non-binding):** as drafted in the t28 package —
fold back is consistent with the exercised history; expired-by-default is
the cheapest doctrine if you want the grant to carry no live authority.
Rescission is the expensive middle path and buys little the default
doesn't already give.

Both directions honest: fold back blesses a live exercise (convenient,
slightly loose doctrine); expired-by-default keeps every future exercise
fresh-granted (tight doctrine, more ceremony).

Owner action: record the verdict in the seq-13 grant file and the
ADR-0079 grant body; if expired-by-default, mark the grant lapsed with
today as the lapse acknowledgment date.

Signature: ____________________  Date: ____________

---

## Item 3 — ratchet-brake adoption (tide)

**Context.** Carried from the t28 package (item 7): the burn-rate
counter on carve-outs (`carve_out_used` in diff_semantics) is in place;
the open decision is adopting the **ratchet-brake** doctrine — after N
consecutive carve-out rows the next round must be a documentation-only
round, i.e., the diff-semantics budget ratchets rather than resting at a
fixed ceiling. The trend inventory makes the streak mechanically
visible; the brake is the policy that consumes it.

**Options.**

| Option | Meaning | Consequence |
|---|---|---|
| Adopt | Two consecutive carve-out rows force the next round documentation-only | Burn rate self-limits; machinery rounds can't quietly chain |
| Decline | The counter stays advisory | No forced alternation; relies on owner attention at planning time |

**Recommendation (agent, non-binding):** adopt — the counter already
exists, and the brake is exactly the kind of pre-committed friction that
keeps governance rounds honest. Decline is legitimate if you'd rather
keep planning discretion manual.

Signature: ____________________  Date: ____________

---

## Item 4 — F-12: t28 SEAL missing `recorded_at` — registered erratum vs re-seal (tide)

**Context.** `git show HEAD:.scratch/grill-t28/SEAL` reads
`seal: c9fda727f9eb1ca33e70b80eec5a2d9135feb29f` with **no `recorded_at`
line** — the t28 seal declared its anchor but omitted the registration
date the ADR-0085 shape requires. The seal was committed; the omission
is a metadata defect on a sealed artifact, not an integrity failure —
the declared sha is ancestral and the freeze holds. grill-t29 hardened
the ordering machinery so the missing date can no longer silently
mislead: `recorded_at` absent/invalid now falls back to the SEAL file's
commit date for last-seal ordering (F-3), and the same-day tie goes to
natural round order (F-5).

**Options.**

| Option | Meaning | Consequence |
|---|---|---|
| Registered erratum (recommended) | ERRATA row names the omission; commit-date fallback covers ordering; seal stands as committed | History untouched; defect honest and visible; matches "stale metadata downgrades, never invalidates" (ADR-0085) |
| Owner re-seal | New SEAL supersedes with seal + recorded_at | Two-step ceremony: supersede file + freeze of the old record; heavier but gives a byte-correct seal |

**Recommendation (agent, non-binding):** registered erratum — the
ordering hole is now mechanically covered, the seal's declared sha is
sound, and a re-seal buys byte-correctness at the price of a second
declaration ceremony. If you want the artifact byte-correct regardless,
the re-seal path is honest too — it just costs the full declaration
cycle.

Owner action (if erratum): record the E-17-class row in
`docs/governance/ERRATA.md`. If re-seal: issue the superseding SEAL at
the tide and freeze the prior record.

Signature: ____________________  Date: ____________

---

## Item 5 — `adjudicated/grill-t27` tag (interim-eligible / tide)

**Context.** Carried from the t28 package (item 5): the co-naming
convention (`adjudicated/<round>` annotated tag whose message pins the
bare sha) awaits an owner-side tag for grill-t27's seal
(`seal:` sha per `.scratch/grill-t27/SEAL`). Tag issuance is a human act
— the agent does not push or tag (WORKFLOW §4.2; this runbook item has
always been owner-scoped).

**Options.**

| Option | Meaning | Consequence |
|---|---|---|
| Issue | `git tag -a adjudicated/grill-t27 <seal-sha> -m 'adjudicated seal <sha>'` | Tag state: co-named (the message must carry the bare sha — annotation without it reads as drift, per the t28 tag-drift fixture) |
| Decline / defer | No tag | `tag.state` stays `absent` — a valid state; the seal stands on its committed declaration alone |

**Recommendation (agent, non-binding):** issue at the tide alongside
the queue adjudication — the co-naming is cheap and it exercises the
D-C byte-equivalence precondition end-to-end. Declining is also valid;
the seal is self-contained without the tag.

Signature: ____________________  Date: ____________

---

## Item 6 — countersign queue, routine bulk (interim-eligible / tide)

**Context.** The bare-form countersign queue merged to 19 entries at
t28 (10 original explicit-slot + 9 bare `- Status: Accepted` additions:
ADR-0076..0085 family). ADR-0086 joins it this round -> **20 entries**
pending entity-level confirmation. All are ID-level-only `Status:
Accepted` rows awaiting the entity-level countersign; none carries an
expired-by-default defect beyond the documented bare-form drift (E-13 /
defer-0074). Every ADR in the queue passed its own wiring suite and its
round's acceptance battery.

The queue (as registered at t29):

- ADR-0064 through ADR-0074 (the original 10 — defer-0074 anchor)
- ADR-0076, ADR-0077, ADR-0078, ADR-0079, ADR-0080, ADR-0081, ADR-0083,
  ADR-0084, ADR-0085 (the bare-form nine)
- ADR-0086 (this round — registry field governance)

**Options.**

| Option | Meaning | Consequence |
|---|---|---|
| Bulk ratify | All 20 countersigned in one authority act | Queue empties; defer-0074 (and the capacity observation defer-0075) close at or before the tide |
| Per-entry | Each ADR adjudicated individually | More granular verdicts; slower |
| Partial | Ratify the uncontested set, hold named ones | Held entries stay `pending-confirmation` against their own expiry |

**Recommendation (agent, non-binding):** bulk ratify, with any contested
ADR carved out individually. The queue exists precisely so routine
confirmation doesn't consume tide capacity; the substantive calls are
items 1–5.

Both directions honest: bulk ratify spends one authority act on twenty
confirmations (efficient, coarse); per-entry is the tighter audit trail
(slower, fine-grained).

Signature: ____________________  Date: ____________

---

## Context items (no signature required — owner awareness)

- **Carve-out burn-rate (advisory, spec §7):** 5 consecutive documentation
  rounds used the governance carve-out — the trend-inventory advisory
  fired this round and is discharged as `observed, closed` (the counter
  itself is the mitigation; the ratchet-brake policy above it is item 3
  for the tide). (grill-t29 audit A-4a: this row was omitted at draft;
  registered here on repair.)
- **Tide capacity (defer-0075):** 20 countersign entries + 5 substantive
  items is a real load; routine items are interim-eligible for early
  bulk ratification if you want the tide lighter.
- **defer-0072 (`JIAHAO_BENCH_CORPUS_B64` refresh):** still pending —
  the bench corpus gate stays UNVERIFIABLE until the corpus env is
  restored; owner-side credential/secret channel.
- **defer-0073 (OIDC channel migration):** still pending owner action.
- **E-16 disclosure (this round):** the t28 report's `180+` prose claim
  corrected to 161 via the for_commit-scoped exception; ADR-0084's
  second appended queue line is now named.
- **F-6 residual window:** between a mutating act (restack/undo) and the
  next gate evaluation the orphan-ancestry leg cannot see — the
  post-restack ritual in AGENTS.md is the human contract covering that
  window. Registered as standing-surface documentation, not machinery.

## Discharge checklist (for the tide)

- [ ] Item 1 verdict recorded (entry status set)
- [ ] Item 2 verdict recorded in seq-13 grant + ADR-0079 body
- [ ] Item 3 adoption recorded
- [ ] Item 4 disposition recorded (erratum row or re-seal)
- [ ] Item 5 tag issued (or deferral noted)
- [ ] Item 6 queue discharged (bulk / per-entry / partial)
- [ ] defer-0074 + defer-0075 closed in the registry
- [ ] Post-tide `node scripts/check-deferred.js` green
