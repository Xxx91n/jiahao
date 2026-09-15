# ADR-0048: Metrological Ledger, Record Tier, Content Anchor, and Commit Discipline

Status: Accepted
Date: 2026-09-05

References: ADR-0013 (hash chain), ADR-0017 (human adjudication), ADR-0027
(pre-registered thresholds and content anchor), ADR-0028/0043 (derived-artifact
discipline), ADR-0030 (reverification runbook and dead-man clock), ADR-0031
(gate tiers and observational tier), ADR-0046 (instrument identity and
quarantine state machine), ADR-0047 (impact-tiered change control).

## Context

ADR-0047 froze the four impact tiers (identity, corpus, threshold,
schedule_gate) but left the implementation round thin in five places: the
reverify ledger is a telemetry snapshot, not a metrological record; the
`schedule_gate -> record` tier has a classifier but no record event; the
change-surface fact source has only same-commit coupling, not a content anchor;
the ADR-0045/0046/0047 document chain was committed as one bundle; and three
signing commands share a validation skeleton over heterogeneous payloads. This
document round sharpens those edges with the industry-anchored models from five
serial atomcode researches (atomcode-q1..q5). It records decisions and glossary
terms only; it changes no source, gate, schema, or executable wiring surface.

## Decision

### D-A - The reverify ledger is metrological: as-found/as-left double column

`bench/polygraph/reverify-ledger.json` upgrades from a telemetry snapshot to an
as-found/as-left ledger. `as-found` is the judge's observed distribution on the
frozen gold-set before any adjustment (kappa, flip rate, score distribution,
drift versus the previous as-left); `as-left` is the same gold-set re-scored
after an adjustment action (rebaseline or criteria change); `observed delta` is
as-left minus as-found within a cycle and as-found(current) minus
as-left(previous) across cycles. Each row anchors the instrument identity
triple and records sample size with a Wilson 95% flip-rate interval
(Clopper-Pearson exact near 0/1 or n below 30; Wald forbidden); kappa carries a
percentile-bootstrap confidence lower bound. This is the prerequisite that
keeps defer-0019 (data-driven calibration interval) pending-evaluation until
the ledger has cycles, samples, and the anchor set.

### D-B - The record tier is an append-only audit event, not a third state

`schedule_gate` changes emit a `record_only_change` event on the existing
append-only hash chain (same chain, different state); the
authoritative/quarantine state-machine projection does not consume it. The
record carries before/after values, the identity triple summary, maker/reviewer
identity anchors, event and logging timestamps, a certify/approve attestation
with a mandatory reason, `prev_hash`, and an escalation hook (classifier
boundary drift promotes to a quarantine-lane event). The record's own
lightweight lifecycle (`pending_signoff -> certified`) lives in the record
layer's event fields and approval projection, not in the instrument state
space. The state machine stays two-state; no `recorded` third state.

### D-C - The change surface gains a vocabulary content anchor

`docs/change-surface.json` keeps its same-commit coupling and adds a
machine-anchored vocabulary block to ADR-0047 (the registering ADR) declaring
the canonical tokens (`identity/corpus/threshold/schedule_gate`,
`quarantine/rebaseline/criteria-change/record`, `certify/approve`) and their
prose aliases. A guard mirrors `scripts/check-bench-thresholds.js`: every
canonical token must appear verbatim in the source ADR's anchor block, and the
same-commit guard tightens from "any docs/adr/*.md changed" to "the source_adr
file itself changed". The anchor asserts whole-word literal existence and never
parses semantics; behavior correctness stays with the wiring test.

### D-D - The document/implementation chain splits at one commit per acceptance lock

The ADR-0045/0046/0047 document chain is re-landed at one commit per round
boundary: each document round is one commit (pure docs, green at zero cost),
and each implementation round is one commit containing exactly the four-piece
set: implementation, wiring test, gates.json registration, and defer
activation/removal. A pure-document ADR has only the document commit. Every
commit stays green; bisect resolves to a semantic unit; reverting a decision
does not drag unrelated work. The already-committed bundle is re-landed under
this discipline before push; this document round does not perform the history
rewrite.

### D-E - Converge the boundary parse, keep the effect layer explicit

The shared human-signoff payload (`reviewer`, `attestation`,
`second_reviewer`) converges to a parse-once input type at the CLI boundary
(parse, don't validate); the surface-to-response/attestation table and guard
already live in `src/change-surface.js`. The three signing commands keep their
heterogeneous effect payloads and transition events explicit; the
`record_only_change` command stays a separate command object sharing only the
boundary parse and the write channel. A full command factory is rejected until
a genuinely isomorphic fourth authoritative-signing command appears; adding a
`kind`/`mode` parameter with conditional branches is the failure signal.

## Rejected alternatives

- A single-snapshot reverify with an interval field (keeps ADR-0047 D-F's
  precondition vacuous).
- A `recorded` third state in the instrument state machine (mixes documentary
  and authority semantics; ADR-0046 already rejected a third state).
- A generation pipeline or external vocabulary registry for about fifteen
  tokens (prose cannot be generated; a full registry is unneeded weight).
- Over-atomic per-file commit splitting (breaks the every-commit-green
  invariant).
- A full command factory for three heterogeneous signing commands (the Metz
  "wrong abstraction" signal).

## Consequences

- The next implementation round activates defer-0020 (metrological ledger),
  defer-0021 (record-only change event), and defer-0022 (vocabulary content
  anchor); it re-lands the document chain per D-D and applies D-E while landing
  those three.
- `CONTEXT.md` gains Metrological Ledger, Record-Only Change, and Vocabulary
  Anchor.
- The README ADR index rebuilds to 48 records; `test/adr-0033-wiring.test.js`
  extends the seed inventory to 19 entries.

## Acceptance

- `docs/deferred-registry.json` parses and defer-0020/0021/0022 are anchored by
  this ADR (source_adr file exists and each id appears in this text).
- `npm run deferred:gate`, `npm run adr:gate`, and the full Jest suite pass.
- No source, gate, schema, or executable wiring surface changes in this
  document round.
