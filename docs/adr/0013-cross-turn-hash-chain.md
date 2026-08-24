# ADR-0013: Cross-Turn Hash Chain with Composite Idempotency Key

- Date: 2026-08-24
- Status: Accepted
- Supersedes (partially): ADR-0012 D4 "Idempotent Evidence Round"

## Context

ADR-0012 D4 implemented per-turn `replace-not-append` semantics with
`prev_hash=null` on every turn (single-turn hash chain). The scope target was
"runtime gate state file", not tamper-evidence across turns.

Atomcode research (12 queries / 11 full fetches / 3 engines, 5 angle
categories) across hasp, Zion ADR-0004, hermes-agent #487, OpenFang
whitepaper, BackendBytes (Stripe idempotency patterns), techinterview LLD
audit logging, WorkOS audit trail, IETF draft-sharif-agent-audit-trail,
RFC 9162 (Certificate Transparency v2), and arXiv 2606.04990 (agent trace
evidence taxonomy) established three facts:

1. **Identification bug (must fix):** `src/gate.js` `recordHash()` excludes
   `prev_hash` from the hash input (`hash = H(canonical_fields)`). Within a
   single-turn chain this is benign; under a cross-turn chain it becomes a
   real attack surface — anyone deleting a segment of records and re-pointing
   the next record's `prev_hash` field produces an `event_hash` that still
   verifies, since the hash itself never covered that field. Three
   independent industry implementations (Zion ADR-0004, techinterview LLD,
   hasp) all include the previous record's hash in the hashed body:
   `hash = H(canonical_fields || prev_hash)` (Crosby & Wallach 2009
   construction).

2. **Cross-turn chain is the industry consensus shape for agent audit.**
   OpenFang crates/openfang-runtime/src/audit.rs, hermes-agent proposal
   #487, and hasp's audit.jsonl all use a single global chain with
   `session_id` as a record field, not chain-per-session. Zion's
   chain-per-restart choice is the outlier; jiahao's threat model differs
   because the verifier (not the audited agent) holds chain-tail write
   authority, so resume-after-restart does not violate the trust boundary.

3. **Idempotency in Stripe-style systems requires a composite business key
   + first-writer-wins atomicity.** BackendBytes (Stripe patterns):
   `(tenant_id, key)` composite unique constraint + `ON CONFLICT DO NOTHING`
   + retry returns the stored result. For jiahao, the natural composite is
   `(session_id, turn_id, tool_seq)` where `tool_seq` is the per-turn stable
   tool index already tracked by gate.js as `gate_id`
   (`det-0`/`chk-1`/`llm-0`). Same key → skip append (do NOT recompute or
   overwrite); new key → append.

## Decision

### D1 — Fix the hash input: include prev_hash

`recordHash(record)` becomes `H(canonicalJSON(record_minus_event_hash) ||
prev_hash)`. The "circular dependency" concern from ADR-0007 is not real:
`prev_hash` is known before hashing (it is exactly the previous record's
`event_hash`); circularity only arises from including `event_hash` itself.
This is the Crosby & Wallach (2009) form used by Zion ADR-0004 / hasp /
techinterview LLD.

### D2 — Cross-turn append-only evidence chain

`.jiahao-evidence` becomes append-only (no full-file overwrite). Each turn
starts with `kind: "turn_init"` carrying `{session_id, turn_id,
first_prev_hash}`, chained onto the previous turn's tail hash. Subsequent
records within the turn chain linearly. Per-session chain is rejected in
favor of a single global chain with `session_id` field — matches the
OpenFang / hermes-agent #487 "Global with session_id as a field" pattern
and is compatible with the existing verdict-gate's "read whole file" model.

### D3 — Composite idempotency key

`Idempotency-Key = SHA256(session_id || "|" || turn_id || "|" || tool_seq)`.
Stored per record. On write: atomically check composer (in-memory set +
on-disk sidecar `.jiahao-evidence.keys` for crash recovery); if key exists,
skip append with no rewrite. Same-turn second fire of `Stop`/`SubagentStop`
hook hits the same key and is a no-op. This is the Stripe/BackendBytes
pattern, with the upgrade path (ADR-0007's existing federation section)
unchanged.

### D4 — verifyChain on every read

`verdict-gate` stops reading the evidence file silently. Every read
calls `verifyChain()` and, on chain break, treats the file as corrupted
(block in verifier profile; advisory-only in generator profile). Hasp's
"a chain you never verify is just a log" is the design principle.
Cost: O(n) per read; trivially fast at expected log sizes (hundreds to
thousands of records).

### D5 — What we explicitly do NOT adopt

- **Merkle tree (RFC 9162)** — linear chain is sufficient for internal
  audit; Merkle exists for third-party external inclusion proofs
  (Zion ADR-0004 §"linear is enough for compliance").
- **HMAC / Ed25519 signature per record** — attribution layer, deferred
  to ADR-0007's existing upgrade path.
- **External anchoring / notarization** — protects cross-host truncation;
  out of scope for single-host jiahao. techinterview LLD's "publish
  tip-hash to external notary" pattern is the documented upgrade path.
- **JSONL append format** — file stays a JSON array, replace-not-append.
  Cross-turn chain is orthogonal to file format. Staying JSON-array keeps
  the existing crash-recovery model (atomic rename per write) and avoids
  partial-line corruption.

## Consequences

- `src/gate.js`: `recordHash` changes hash input; `writeEvidence` accepts
  the idempotency key and skips on collision; `readEvidence` runs
  `verifyChain()` unconditionally.
- `hooks/jiahao-verdict-gate.js`: chain-corruption is elevated to blocking
  severity in verifier profile (same level as missing evidence), advisory
  in generator profile.
- `test/*.test.js`: new cases — recordHash includes prev_hash, cross-turn
  chain verifies, `turn_init` boundary produced, composite key dedup
  works across Stop/SubagentStop re-fire, chain break propagates to gate
  verdict.
- `.jiahao-evidence.keys` new sidecar file (append-only line-per-key,
  atomic rename on write).
- Existing pre-ADR-0013 `.jiahao-evidence` becomes invalid against the new
  hash formula; first write under the new schema commits a fresh genesis.
  Documented breaking change.

## Upgrade paths (deferred, all unchanged from ADR-0007/0012)

- **Ed25519 per-record signatures** for attribution (who wrote this
  record).
- **Signed tree-head publication to Rekor / external notary** for
  cross-host audit federation.
- **TIKA/privacy filters** on stored payload fields if PII ever enters
  evidence records.

## Out of scope

- Implementation of D1-D5. This ADR is design; the implementation grill
  lands it.
- Benchmark regression. See ADR-0015 for detector baseline.