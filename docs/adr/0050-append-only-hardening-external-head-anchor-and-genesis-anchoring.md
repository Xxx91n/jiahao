# ADR-0050: Append-Only Hardening, External Head Anchor, and Genesis Anchoring

Status: Accepted
Date: 2026-09-07

References: ADR-0007 (tamper-evidence boundary), ADR-0013 (cross-turn hash
chain), ADR-0022 (censoring/degradation contract), ADR-0023 (registry
evolution discipline), ADR-0026 (segmented evidence log and segment anchors),
ADR-0033/0035 (deferred registry), ADR-0040 (gate capability declaration),
ADR-0043 (derived artifact and prefix vocabulary), ADR-0049 (decision-rule
anchor and metrological ledger).

## Context

ADR-0013/0026 left the append-only evidence chain self-anchored. The hash chain
proves that the records in hand link to each other, but it cannot prove that a
head or tail segment once existed and was removed. Two gaps remain in
`src/evidence-log.js`: `verifyFull()` skips the anchor check for the first
directory segment, so the genesis/first record (`prev_hash = null`) is
unconstrained, and there is no off-chain tip pointer, so a tail-truncated chain
still reads as "valid but shorter". Six serial atomcode researches (Q1-Q6)
cross-checked the industry templates for single-host append-only hardening.
This document round records decisions and glossary terms only; it changes no
source, gate, schema, or executable wiring surface.

## Decision

### D-A - Adopt an external head anchor sidecar plus an independent genesis anchor

An off-chain tail anchor sidecar `evidence-head.json` records
`{latest_seq, total_count, head_hash}` and is atomically updated after each
commit; an independent genesis anchor records the expected first-record hash
outside the chain data. `verifyTail()`/`verifyFull()` compare against both.
This is the external-head-anchor family (sidecar head anchor, AuditChainHead,
git ref/reflog, and Logcrypt's "store only the latest verification value"); it
detects head/tail truncation that a self-anchored hash chain cannot, at zero
new dependencies. Merkle trees and forward-secure sealing are rejected-for-now
as overkill for a single-host local tool.

### D-B - The genesis anchor is an install-time protected anchor file

The genesis anchor is an install-time protected anchor file, written at
upgrade time to record the existing chain's first-record hash and read-only
thereafter. A compile-time constant is rejected because it cannot retrofit an
already-shipped chain and its rotation failure mode (public-key pinning
history) is worse than the protection it buys. An external second copy
(transparency log, timestamp, DNS TXT, or second host) is deferred as
defer-0024 behind a cross-machine verification requirement. Old chains keep
verifying under old rules; the anchor is additive input, following the
add-new-anchor-without-breaking-old-chain migration precedent.

### D-C - Anchor failures reuse the route and add a structured integrity subtype

Anchor verification failures reuse the existing chain-corruption double route
(verifier blocks, generator advises; ADR-0013 D4) and add a structured subtype
only. `anchorProblems()` string arrays upgrade to
`{code, field, expected, actual}[]` under a new `KNOWN_ANCHOR_STATUS` registry
in the integrity domain, never in `KNOWN_DEGRADATION_KINDS` (whose `truncation`
is input censoring, a benign degradation, not a log attack). Anchor absence is
tri-state, not boolean: `never_anchored` (not a failure; records an unanchored
window analogous to `coverage: partial`), `expected_missing` and `unreadable`
(fail-closed), plus `hash/bytes/count` mismatch codes (fail-closed). This is
the DNSSEC four-state and OpenTelemetry "severity is routing, event name is
debugging" split.

### D-D - Existing chains are forward-sealed, never backfilled

Existing chains gain the independent anchor by forward sealing. A sealing
record is appended whose hash pins the current head; the verifier declares the
guarantee start point (block N / time T); records before the seal remain
verifiable under old rules, records after the seal enjoy head/tail truncation
detection. Backfill/recompute of old hashes is rejected: it breaks the
append-only non-rewritable commitment, splits old and new verifiers, and is
irreversible. The guarantee is directional (forward-integrity): unforgeable
after the anchor point, detectable-but-not-preventable before it. The
frozen-log plus final-head migration is the model.

### D-E - The tail anchor is written record-first, anchor-later

The tail anchor sidecar is written record-first, anchor-later. The segment
write fsyncs before the anchor file; the anchor file carries a version and
checksum against its own torn write. On crash, an anchor-behind-chain state is
recoverable (rescan the tail and advance); an anchor-ahead or count-mismatch
state is fail-closed (route via D-C). Anchor-first is rejected because a crash
between anchor and record loses a confirmed record while claiming completeness.
The manifest/index write-first template (LevelDB/RocksDB MANIFEST, Kafka index,
Solr tlog) is the model.

### D-F - This round lands the minimal anchor closure only

This round lands only the minimal anchor closure (A-prime): install-time
genesis anchor file, tail anchor sidecar, structured `KNOWN_ANCHOR_STATUS`,
existing-chain forward seal, and their wiring tests. Defer-history
materialization (ADR-0048 D-D registration-to-activation diff) and the
check-corpus-leak EISDIR/ENOENT race-fix split are separate rounds, each with
its own acceptance. Acceptance is compile, package (`npm pack --dry-run
--json`), live process (`instrument.js --check/--classify` and
`verify-evidence --full` on a real chain), then per-platform test closure; any
failing round reverts alone. Small-batch and self-contained-release discipline
underpin the slice.

## Rejected alternatives

- Merkle tree, signature, or forward-secure sealing for a single-host chain
  (overkill; external witness deferred as defer-0024).
- Compile-time constant genesis (cannot retrofit existing chains; worse
  rotation failure).
- Backfill/recompute old hashes (violates append-only; irreversible).
- Anchor-first write order (confirmed-data-loss crash window).
- Independent top-level failure channel (no "dependency unreachable" state for
  a local file; leave for the external-witness upgrade).
- Bundling history materialization and the race-fix into this round (scope
  creep breaks rollback and attribution).

## Consequences

- The next implementation round wires D-A through D-F in `src/evidence-log.js`
  (and the reverify ledger path), adds `test/adr-0050-wiring.test.js`, and
  keeps defer-0024 pending.
- `CONTEXT.md` gains External Head Anchor, Genesis Anchor File, Anchor Failure
  Tri-State, Forward Sealing, and Record-First Write Order.
- The README ADR index rebuilds to 50 records;
  `test/adr-0033-wiring.test.js` extends the seed inventory to 18 entries.

## Acceptance

- `docs/deferred-registry.json` parses and defer-0024 is anchored by this ADR
  (source_adr file exists and the id appears in this text).
- `npm run deferred:gate`, `npm run adr:gate`, and the full Jest suite pass.
- No source, gate, schema, or executable wiring surface changes in this
  document round.
