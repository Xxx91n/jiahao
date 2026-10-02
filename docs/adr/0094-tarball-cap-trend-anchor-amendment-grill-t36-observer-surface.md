# ADR-0094: Tarball-Cap Trend-Anchor Amendment for the grill-t36 Observer Surface (draft for owner sign-off)

Status: Accepted as a RULING (owner decision recorded in grill-t36 decision
ledger D-009(a), 2026-10-02: the amendment channel and the derivation below
are approved) — and PENDING OWNER SIGN-OFF FOR EFFECTIVENESS. Drafting is not
ratification: this ADR takes effect only when the owner signs it and the
ADR-0039 D3 literal is moved by that act. Until then ADR-0039 D3 keeps
`470,000` and leg 196 pack-smoke stays honestly red.
Date: 2026-10-02

Amends (on sign-off, and only this): ADR-0039 D3 — the periodic trend-anchor
cap literal moves from `470,000` to `530,000`. No second constant is created;
the live anchor keeps exactly one home, the `out.size < N bytes` literal in
ADR-0039 D3. References: ADR-0062 (the pinned amendment policy this follows),
ADR-0066 / ADR-0071 / ADR-0082 (the accept-now-countersign-later and
armed-band precedents), ADR-0087 (the immediately prior amendment of the same
literal, to 470,000). Deliberately NOT folded into ADR-0093: a cap amendment
is a gate-value change wearing no membership costume, and ADR-0093 is an
enum-surface contract (grill-t36 D-009(a) negative requirement).

## Context

At grill-t36 T-0 the public CI run on origin/main carried `[196 pack-smoke]
FAIL` as a declared-in red: the measured tarball was 476,450 bytes against
the ADR-0039 D3 cap of 470,000 bytes. This is the second consecutive round in
which that red has been disclosed rather than closed — grill-t35 named it in
its two-list closeout, and the only lawful way to move it is a pre-registered
cap amendment, because the assertion itself must not be weakened (ADR-0062
D-A clause 3).

The owner ruling (grill-t36 D-009(a)) approves the amendment through this
independent ADR, pins the measurement protocol, derives the value, and
requires the not-a-retro-application declaration below. What remains is the
owner's signature on this draft: an agent writing the amendment is not the
act that makes it effective.

## Decision

### D-A - Amendment policy (procedure precedes the value; this section is textually first so that time order is reading order)

1. A pre-registered gate value is amended only by an ADR that (a) states the
   policy before the value, (b) derives the value from a measurement taken
   under the pinned protocol, (c) carries an explicit not-a-retro-application
   declaration, and (d) holds an open `second_reviewer` slot whose review rides
   the deferred-registry tide at 2026-12-15.
2. The trigger stays the PERIODIC TREND ANCHOR: each implementation round
   records the measured M; the cap is reviewed against the trailing trend.
   This firing runs through the channel the owner ruling registered, which is
   a declared trigger of the same policy, not a new one.
3. No assertion is deleted or weakened to make the gate pass; the cap moves and
   nothing else. The evidence artifact contract, the pack-surface assertion,
   and the 196 leg's confirmatory tier are untouched by this amendment.
4. Effectiveness is the owner's act. The agent drafts and reports; it does not
   sign. The ADR-0039 D3 literal changes in the same commit as the sign-off,
   never before it.

### D-B - Measurement protocol (pinned; unchanged from ADR-0062 D-B)

- Command: `npm pack --dry-run --json`
- Field: `size` (packed tarball bytes) — not `unpackedSize`.
- Toolchain for this measurement: npm 11.19.1, Node v24.11.0.
- Reported alongside the value: `entryCount`, so a size move with a file-count
  move is legible instead of an anonymous delta.

### D-C - Value (derived from the registered measurement)

M_latest = **476,450 bytes** (the measurement the owner ruling registered,
taken under the protocol above at the t35 landing tip, 169 files).

`ceil_to_10_000(476,450 x 1.10) = ceil(524,095) = 530,000`

**New cap: 530,000 bytes**, effective on sign-off.

Draft-time re-measure for the record (same protocol, taken on this draft's
tree with the README ADR index already regenerated): **497,415 bytes / 174
files**. Headroom against the proposed cap is therefore
530,000 − 497,415 = 32,585 bytes, above the 2,048-byte trigger band, and the
round's own documentation-surface growth is recorded as the reason the live
number sits above M_latest. The amendment-time M_latest stays 476,450 — the
re-measure rule keys the pre-change surface, per ADR-0082 D-C.

**Not-a-retro-application declaration (D-D).** This amendment does NOT
retro-bless the 476,450-byte measurement or any earlier over-cap reading.
Those readings remain over-cap readings under the cap in force when they were
taken: this is repaired history, not excused measurement, in ADR-0082 D-C's
sense. The red legs recorded on the public CI runs while 470,000 was the live
anchor stay recorded red.

### D-E - Review slot

The `second_reviewer` countersign slot is OPEN at drafting. It rides the
deferred-registry tide at review_at 2026-12-15 — accept-now-countersign-later
per the ADR-0066/0071/0082 precedent — and the registry row for it is minted
at sign-off with the next free id (reserved here as `defer-0085`, the next
free id at drafting time; the id is not registered in the registry until this
amendment takes effect, so no row exists for a value that is not yet live).

## Rejected

- Folding this amendment into ADR-0093's body: rejected in the ledger
  (grill-t36 D-009(a)); a gate-value change inside an enum-surface contract
  makes the contract's declaration count carry an unrelated payload.
- A self-chosen margin, a different formula, or a one-shot value: the pinned
  trend anchor `cap = ceil_to_10_000(M_latest x 1.10)` is the only sanctioned
  derivation, and 530,000 is its arithmetic output, not a target picked to fit
  today's tarball.
- Rewriting 476,450 (or any earlier breach) as an acceptable measurement:
  forbidden by D-D above and by the D-001 rule that a breach is repaired
  history.
- Narrowing the tarball instead of amending: rejected in the ledger as the
  no-hedge variant — compression postpones the registered exit without
  discharging it.
- Reading this amendment as restoring public CI green: explicitly forbidden.
  Even after 196 pack-smoke goes green under the new anchor, the corpus legs
  remain UNVERIFIABLE (mr-probes.jsonl absent from the secret tarball,
  deadline 2026-12-15) and the public-green claim stays blocked by that
  condition alone. The corpus refresh is an owner-only action and its
  deadline is a ceiling, not a schedule.

## Consequences

- On sign-off, `out.size < 530,000 bytes` becomes the single live anchor in
  ADR-0039 D3, parsed by `scripts/check-pack-smoke.js` and consumed by
  `test/adr-0038-wiring.test.js` through the shared `packCapBytes()` helper —
  one home for the number, no duplicated literal.
- Until sign-off the settled draft tree measures 497,415 bytes against the
  live 470,000 cap, so leg 196 and the adr-0038 wiring test stay red BY
  DESIGN:
  a draft that turned the gate green before it was signed would be a gate
  moved by drafting, which is exactly the mutation D-A clause 4 forbids.
- M_latest for the next trend evaluation becomes the measurement taken at
  sign-off, recorded under the pinned protocol with its file count.
- The countersign owed at the 2026-12-15 tide is the second reviewer's, not
  the drafting agent's; this ADR reports state and does not issue that verdict.

