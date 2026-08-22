# ADR-0007: Hash Chain Tamper-Evidence

## Context

ADR-0004 noted that the evidence chain uses sha256 refs but has no
previous_receipt_hash linking — it is not tamper-evident. The upgrade path
was AGT's AuditChain pattern. ADR-0006 fixed the evidence contract (JSON array
parsing) but did not add tamper-evidence.

Atomcode research (24 sources, 4-source cross-validation on Q4) surveyed:
- Microsoft AGT AuditChain: linear SHA-256 hash chain with JCS (RFC 8785)
  canonical serialization, Ed25519 signatures, chain head anchored to
  Sigstore Rekor / RFC 3161 TSA
- Google Trillian / Rekor / RFC 6962 / RFC 9162: Merkle tree based
  transparency logs for public append-only logs
- Proof-or-Stop: single receipt + source state binding (not bilateral)
- IETF AIVS draft: "simplified linear variant" of CT Merkle logs

Key finding: **linear prev_hash chain is sufficient for a single JS evidence
file**. Merkle trees only add value for public transparency logs needing
O(log n) inclusion proofs. For jiahao's private evidence file (hundreds to
thousands of records), O(n) re-verification is trivially fast.

## Decision

Implement linear hash chain following the AGT AuditChain pattern:

1. **canonicalJSON()**: Zero-dependency recursive key sorting (~10 lines),
   RFC 8785 inspired. Required for deterministic hashing across implementations.

2. **recordHash()**: SHA-256 of canonicalJSON(record minus prev_hash and
   event_hash fields). These fields are excluded because they are the chain
   links themselves — including them would create a circular dependency.

3. **createEvidence()**: Each record now takes a prevHash parameter. Genesis
   record has prev_hash: null. Each record's event_hash = recordHash(record).

4. **verifyChain()**: O(n) validation — checks prev_hash linkage and
   recomputes event_hash for each record. Returns { valid, broken_at, reason }.

5. **verify()**: Maintains a running prevHash variable, threading it through
   each createEvidence call in execution order.

No Merkle tree, no signatures, no external anchoring. These are upgrade paths
when tamper-evidence beyond local file integrity is needed.

## Consequences

- Evidence chain is now tamper-evident: deletion, reordering, or modification
  of any record is detectable by verifyChain().
- Zero new dependencies — uses Node.js built-in crypto only.
- canonicalJSON adds ~10 lines; verifyChain adds ~20 lines; total diff is
  minimal and focused.
- Upgrade path: add Ed25519 signatures (for attribution) and Rekor anchoring
  (for external verifiability) when cross-organization audit is needed.
- 10 new tests covering: chain linking, broken link detection, tamper
  detection, deletion detection, reordering detection, canonical JSON
  determinism, end-to-end verify() chain validity.
- Total: 49 tests (was 39).
