# ADR-0086: Registry Field Governance — Fenced / Editorial / Exception-Channel Classes and the Pending-Confirmation Lifecycle (grill-t29 audit-disposition round)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-09-27
- Ledger: `.scratch/grill-t29/decision-ledger.md` — grill-t29 D-001..D-006 (all current)
- Spec: `.scratch/grill-t29/spec-t29-disposition.md` (execution spec: machinery first, prose second, battery third, report, SEAL)

## Context

The grill-t28 second-party audit (PASS with findings) caught a class the
existing contracts could not express: `surface-taxonomy.json` mixes
semantics-bearing fields gates consume (`claim_surfaces.closed_enum`,
`seal.fields`, `orphan_ancestry.*`), deviation bookkeeping
(`claim_surfaces.exceptions`, `orphan_ancestry.errata_exemptions`), and
provenance (`_doc`, `source_adr`, `rounds`) — with no machine-readable
statement of which is which. The audit then found the machinery drifting
around that ambiguity: private regex copies beside the registered table
(F-1/F-2), an unguarded `recorded_at` ordering (F-3), an enumerator that
could not see a whitespace-mangled pin (F-4), and an exception entry
(`reports/audit-report.md`) appended agent-side with no channel to hold it
(F-8). The t28 D-003(v) fence said "the closed claim enum rides an ADR" —
a fence by declaration. This ADR makes the fence inherited: the taxonomy
itself declares each field's governance class, and two legs enforce it.

## Decision

### D-A — Three classes, machine-checkable (ledger D-002(i))

Every field of `docs/governance/surface-taxonomy.json` carries exactly one
class, declared in the top-level `field_governance.classification` map
(nested, longest-prefix resolution; a string value classifies a subtree):

- **fenced** — semantics-bearing: consumed by gates/verifiers to decide
  verdicts. Changes ride an ADR + countersign. Members:
  `seeds`, `surfaces`, `round_permissions`, `diff_semantics`,
  `reclassifications`, `freshness.claim_surfaces.closed_enum`,
  `freshness.claim_surfaces.scope`, `freshness.claim_surfaces.unregistered_signal`,
  `freshness.non_anchoring_classes`, `freshness.seal.fields`,
  `freshness.seal.tag_convention`, `freshness.orphan_ancestry.artifact_scope`,
  `freshness.orphan_ancestry.pin_patterns`, `freshness.orphan_ancestry.workspace_ref`,
  and `field_governance` itself (self-classification: the block is fenced).
- **exception-channel** — deviation entries: `freshness.claim_surfaces.exceptions`,
  `freshness.orphan_ancestry.errata_exemptions`. Entries are objects under
  the lifecycle in D-B.
- **editorial** — bookkeeping/provenance: `_doc`, `source_adr`,
  `schema_version`, `mechanism_outputs`, `freshness.rounds`,
  `freshness.seal.retires`, `freshness.claim_surfaces`/`orphan_ancestry` `._doc`
  and `source_adr`. Free edits.

The t28 D-003(v) `claim_surfaces` fence is MIGRATED here: the closed enum
is fenced, its `exceptions` field is the channel — one rule source.

### D-B — Pending-confirmation lifecycle (ledger D-002(ii), D-003)

Every exception-channel entry is an object carrying
`status / requested_by / reason / expires_at / scope` plus an optional
binding (`path`, or `sha`/`file`/`errata` for errata exemptions, or
`for_commit` pinning an entry to exactly one commit):

1. Registration is effective immediately — `pending-confirmation` entries
   govern the scenario they cover from the moment they land.
2. `expires_at` is mandatory on every entry; no wildcard scopes
   (`scope`/`path` carry no `*?%[]{}`).
3. **Auto-lapse:** a `pending-confirmation` or `ratified` entry past
   `expires_at` is inert — it suppresses nothing — and fails the
   completeness leg until adjudicated, renewed, or removed. Expiry forces
   action; it never silently converts to permanent.
4. `revoked` and `lapsed` are terminal records: honest history, never
   effective.
5. Owner-only actions: **ratify / revoke / delete / narrow**. The agent
   registers and reports; it never self-certifies. Reversal path: a new
   ADR supersedes.
6. **Commit-date effectiveness:** an entry governs a commit iff it was
   effective on that commit's own date — consistent with ADR-0085's
   evaluation-at-commit-point. Lapse withdraws future coverage; it does
   not retro-convict a commit made under an effective entry. `revoked`
   entries cover nothing (revocation is retroactive by owner verdict).
7. `for_commit` narrows an entry to one commit sha — the surgical form for
   a single permitted act (used for the F-9 sealed-report correction).

### D-C — Enforcement legs (ledger D-002(v))

Two new confirmatory gate legs in `docs/gates.json`:

- `exception-channel` (order 220): every channel entry is complete (the
  five required fields, closed status enum, ISO expiry, literal scope),
  and no effective-class entry is past expiry.
- `classification-consistency` (order 221): every taxonomy leaf is
  classified; every classified path exists; and the REAL consumers run
  under a recording proxy — every dotted path actually read must resolve
  and be classified (phantom-read and consumption-drift detection).

Two further legs land under this round's ledger authority (the convention
they enforce is registered in AGENTS.md, not a new ADR):

- `test-git-hermetic` (order 222): every git write op in `test/**.js`
  routes through `test/helpers/git-hermetic.js` (inline identity +
  config-source isolation; the F-14 candidate's CI-failure class).
- `anchoring-footer` (order 223): post-registration round-lane commits
  carry `[ANCHORING] <files>` equal to `git show --name-only` —
  replayable self-description, forensic not preventive (ledger D-006).

### D-D — Self-audit (ledger D-003(v))

New normative semantics introduced by this ADR — enumerated, per the
self-audit obligation:

1. The three-class field taxonomy and its mechanical enforcement (new).
2. The pending-confirmation lifecycle incl. auto-lapse, commit-date
   effectiveness, and `for_commit` binding (new).
3. Exception entries become objects with mandatory `expires_at` (schema
   change to `claim_surfaces.exceptions` + `errata_exemptions` entry form).
4. `check-orphan-ancestry`'s private pin/seal copies are replaced by the
   registered table; `recorded_at` ordering gains the commit-date fallback
   (F-1..F-5 hardening — repair, not new semantics).
5. No governance of `evaluateRound`'s sealed-round verdicts changes; the
   F-8 exception is re-registered through the channel pending owner
   ratification at the 2026-12-15 tide (defer-0075 carries the tide-
   capacity observation).

This ADR joins the countersign queue (bare `- Status:` approval-surface
form, ERRATA E-13 queue merged 10 -> 19 -> 20 with this entry) — pending
entity-level adjudication, never self-certified.

## Consequences

- A new taxonomy field cannot be consumed silently: unclassified reads
  fail `classification-consistency` (coverage + consumption legs).
- An exception without `expires_at` or with a wildcard scope cannot
  register; a lapsed entry is red until the owner acts — expiry forces
  adjudication.
- `check-orphan-ancestry` now enumerates loosely, parses strictly, falls
  back on commit date for undated seals, natural-sorts round dirs, and
  binds exemptions prefix-aware — F-1..F-5 closed.
- The F-8 `reports/audit-report.md` registration is honest: it is an
  exception-channel entry `pending-confirmation` (ERRATA E-15 records the
  procedural defect of its original append), and owner ratify/revoke is
  item 1 of the t29 human-authority package.
- Wiring pin: `test/adr-0086-wiring.test.js` (registration, channel
  semantics, legs, conventions, packet shape).
