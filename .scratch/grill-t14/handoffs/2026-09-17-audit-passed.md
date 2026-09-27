# Handoff — grill-t14 audit PASSED with findings (2026-09-17)

## State (updated post-land)

Audit window over stack grill-t14-docs{kkr,pyq,pry} + grill-t14-r2{svn,slz,ryu,xzq,rtk,lll,mvy}
on base a8e0bdb. Verdict: PASS — every report claim verified against repo truth;
all gates re-ran green at HEAD (72 suites/1167 tests, gate:all exit 0,
pack-smoke 325192<340000, instrument chain OK, anchors 13 in sync).

**LANDED 2026-09-17**: the whole stack + audit artifacts + post-land map regens are on
`origin/main` = `9682916` (owner-authorized merge+push via `but land --whole-stack`).
All merged branches deleted (local t14 pair auto-unapplied; gb-local mirrors
t13-docs/t13-r1/t14-docs/t14-r2/t14-mapfix removed). gb-local/grill-t11-docs +
grill-t12-docs kept — they are the rewrite-map old-side anchors, never delete.

Full audit report: D:\Aworker\jiahao\.scratch\grill-t14\reports\2026-09-17-audit-pass.md
Round diff captured at: D:\Aworker\jiahao\.scratch\grill-t14\audit-evidence\round-diff.patch
(stays UNCOMMITTED — sha literals would pollute citation scans, same rule as the
t13 patch at tq).

## Findings carried forward (owner adjudication items)

- F-1: defer-0051 closed with owner_ratification pending — D-002 sequence
  deviation, disclosed everywhere; rejection reopens. Owner decides accept or
  reopen when answering Ask B.
- F-2: docs/rewrite-map-generator-spec.md lacks the union(ls-files, ls-tree
  HEAD) enumeration text — amend Inputs bullet next doc round.
- F-3: defer-0055.sunset_trigger_pointer restates the clause — pure-pointer
  tighten on next registry touch.
- F-4: scripts/ shipped-file edit inside doc round disclosed; zero_product_diff
  wording stretch logged.
- F-5: O-E consent-confirm thin.
- Nits: stale generator FAIL message; catch{} on corrupt prior map;
  wiring-test duplicate defer-0059 assertion/describe placement; gen-docs.cjs
  hardcoded ROOT.

## Still pending (unchanged owner asks, unbundled)

1. Ask A (record-type): instrument seq-24 sign-off —
   node scripts/instrument.js --record-signoff --record-seq 24 --reviewer <owner-id> --attestation approve --authorization "<verbatim>" --reason "<reason>"
2. Ask B (judgmental): ratify .scratch/grill-t14/evidence/defer-0051-evidence-packet.json
   (signatures.owner_ratification {verdict, signer, reason, signed_at}; rejection reopens defer-0051 — also settles F-1).

## Forward agenda / next grill direction

- Sunset counter (ADR-0075 D-C path A): 1/6 as of 2026-09-17; organic>0 resets;
  lifecycle independent of defer-0055. Grill candidate: the counter's durable
  home — it currently lives only in the ledger check-in trail; decide whether
  it needs a registered field or stays ledger-borne.
- defer-0004 + defer-0026 SUGGEST advisories (check-deferred reports conditions
  SATISFIED): human activation review is a pending agenda item.
- Next trend-anchor evaluation at the defer-0039 tide (2026-12-15); defer-0057
  tally row closes there.
- ADR-0075 Status carries 'second_reviewer countersign deferred to the next
  audit round' — this audit round is that slot; countersign lands when the
  owner ratifies the audit outcome.
- Spec-sync discipline: this audit caught a half-landed spec amendment (F-2);
  consider a wiring or lint check that a disclosed generator repair is matched
  by a spec diff hunk.
- Standing: defer-0053/0055/0057/0058 cadence + O-E backlog per standing agenda.
- Push done this round (owner-authorized). NOTE: `docs/rewrite-map.json` is
  stale-on-tip by construction — every land advances origin/main past the
  committed published_tip; the next round's first regen re-syncs (a8e0bdb's
  committed map pointed at 051744a the same way). CI on main has been red on
  every recent push (t10..t14) — structural/pre-existing, candidate standing
  topic if CI truth matters to the owner.

## Process lessons from the merge (recorded, not ratified)

- `but commit` without explicit change IDs sweeps ALL uncommitted files — the
  t13 forbidden patch (r2-round-diff.patch, fixture literals tripping
  secret-scan R1/R2) entered commit 1c58786 and reached origin/main before
  detection. Purged by owner-approved force-push to 6133510; tree verified
  clean (secret-scan 0 hits, patch absent). LESSON: always pass explicit IDs;
  the two audit-evidence patches stay untracked forever (they are still on
  disk, uncommitted, as required).
- uncommit leaves files staged in the git index (`A` state) where ls-files
  enumeration picks them up — verify `git status` shows ?? after uncommit.

## Suggested skills

- $implement for F-2/F-3 follow-up edits if the owner wants them now.
- grilling / grill-with-docs for the sunset-counter-home question.
- handoff at next closeout; but for all VCS writes; never git commit raw.
