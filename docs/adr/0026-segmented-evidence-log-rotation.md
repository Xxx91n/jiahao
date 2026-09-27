# ADR-0026: Segmented Evidence Log — Rotation + Cross-Segment Anchoring + Base-Seq Naming

## Status

Accepted (2026-08-28)

## Context

ADR-0013 established the cross-turn hash chain on `.jiahao-evidence`, but the
implementation drifted from the mental model it assumed: the file is a single
JSON array, and every `commit` does `readFileSync` + merge + full-file rewrite
(O(n) read + O(n) write + O(n) verifyChain per turn). ADR-0016's verifyTail
equivalent never existed; ADR-0022 hardened the detector payload but left the
sink unbounded in both size and write amplification.

Three atomcode research runs (2026-08-28; Kafka/PostgreSQL WAL/SQLite WAL/
journald FSS/CloudTrail digest chain/Rekor/LSM O'Neil 1996/Schneier-Kelsey
1998/gatecrash migration writeup/RAMCloud, multi-engine cross-verified)
established the industry answer: Segmented Log (immutable sealed segments,
single active segment, size-triggered rollover) + cross-segment anchoring
(CloudTrail `previousDigestHashValue` / relay-shell `--segment` semantics),
with in-lock directory-rescan allocation and base-seq (Kafka base-offset)
file naming.

Locating mental model (unchanged since ADR-0001): jiahao is a second-party
auditor whose evidence log must be append-only, tamper-evident, and
fail-closed verifiable (ADR-0013/0022/0024). A store that rewrites history on
every commit contradicts the premise that history is immutable.

## Decision

### D1 — Segmented log with cross-segment anchoring (form A)

`.jiahao-evidence` becomes a directory of segment files. Sealed segments are
never rewritten (physical append-only); only the active segment accepts
appends. Each non-genesis segment begins with a `segment_anchor` record:

    { kind: 'segment_anchor', segment_format_version: 1, seq_start, prev_segment_hash, prev_segment_count, prev_segment_bytes, created_at, prev_hash, event_hash }

- `prev_segment_hash` = SHA-256 of the previous segment file's bytes
  (CloudTrail digest-chain precedent; space-domain checksum, not a Merkle
  tree — Rekor/MMR explicitly rejected for a local zero-dependency plugin).
- `prev_segment_count` / `prev_segment_bytes` are successor-anchored stats
  (a segment's own anchor can never know its final size; journald header
  in-place updates were the cited anti-pattern). They are a pre-check
  layer, not an integrity guarantee — final word is still the hash chain.
- Hash-chain continuity is unchanged: anchor.prev_hash = tail event_hash of
  the previous segment; verifyChain over the concatenation of all segments
  remains valid end-to-end.

### D2 — Rotation trigger: pure 256 KiB byte threshold

Active segment is rolled when `statSync` reports >= 256 KiB and new records
are pending (checked inside the ADR-0024 narrow lock). Byte-first, no
timer: matches Kafka/LoraDB/gatecrash, and a JIT plugin has no resident
process to own a time trigger. No retention/deletion policy in this ADR.

### D3 — Segment naming: base-seq, zero-padded `%020d.jsonl`

Filename = global sequence number of the segment's first record
(`seq_start`, Kafka base-offset style). Sequence numbers are allocated
inside the flock by re-scanning the directory and taking max+1. The
directory is the only source of truth — no CURRENT/pointer file
(RocksDB CURRENT cited as the counter-example). Scan errors are fail-loud:
only ENOENT (directory absent, fresh install) may start numbering at 0;
any other I/O error aborts the append (AletheiaDB precedent).

Cross-check property: filename number must equal the anchor's `seq_start`
and the sum of all earlier segments' record counts — renaming or copying
segments is caught without hashing file contents.

Records keep their per-record `timestamp` (audit semantics) and do not
carry timestamps in filenames (journald clock-rollback auto-rotate and the
atlanhq Windows 15 ms collision incident cited as reasons time must never
be a naming key).

### D4 — Read path: verifyTail hot path + verifyFull cold path

- `verifyTail()`: reads only the active segment (plus `statSync` of the
  previous segment) and checks: anchor present, `prev_segment_hash` matches,
  `prev_segment_bytes` matches stat size (O(1) fail-fast pre-check), then
  the in-segment hash chain. This is the default verification callers use.
- `verifyFull()`: every segment, every cross-link, filename/seq cross-check.
- Missing anchor where one is required = chain corruption (fail-closed);
  never silently degrade to in-segment-only verification.
- Cold full verification ships as `scripts/verify-evidence.js` (`--full`
  flag selects verifyFull; default verifyTail). It is NOT wired into the
  per-turn verdict-gate (ADR-0019/0013 latency budget).

### D5 — Legacy migration (transparent, gatecrash pattern, three hardenings)

An existing `.jiahao-evidence` plain file is upgraded on first launch of
the new code, inside the same narrow lock:

1. Read + parse the legacy array. 
2. Verify the legacy chain BEFORE migrating (Schneier-Kelsey breakpoint
   semantics):
   - chain valid → write records verbatim into genesis segment
     `00000000000000000000.jsonl` (no anchor on genesis).
   - chain broken at index >0 → migrate everything, nothing dropped;
     append a `legacy_migration` marker record after the tail carrying
     `broken_at`. Prefix remains trusted, suffix flagged suspect.
   - chain broken at index 0 AND active profile is the blocking
     verifier → refuse migration: legacy file untouched, log enters
     read-only legacy mode, loud stderr warning.
3. Rename the original file to `.jiahao-evidence.legacy.bak` AFTER the
   new segments are fully written; the .bak is never auto-deleted
   (journald/CloudTrail corrupted-file-retention norm).
4. Migration failure at any step → nothing is created, nothing deleted,
   stderr warning, degraded read-only legacy mode.

Zero interaction is required (ESLint migrate-config / Chromium prefs /
gatecrash precedent); a standalone CLI migration command was rejected —
in a JIT hook context it would never be run.

### D6 — Rejections (do not re-propose)

- Whole-file rewrite as the steady-state write path (current behavior;
  O(n) write amplification, breaks append-only, gatecrash's post-mortem).
- Multi-file JSON-array form (no industrial precedent; same rewrite window
  as the status quo).
- Single-file logical segments (journald FSS tag objects prove the marker
  concept but nobody ships them without physical rotation; loses
  per-segment archive/verify/lock separation).
- Timestamp / UUID / composite filenames (clock-rollback and 15 ms
  Windows-resolution collisions; UUID destroys ordering).
- In-place seal markers or header counters (journald header-mutation
  anti-pattern; breaks hash-once purity).
- Compaction of audit segments (deletes evidence; use retention/archive
  later if ever needed).
- Merkle trees / MMR / Rekor-style transparency: O(log n) proofs buy
  nothing for a local read path, add real dependency weight.
- External anchoring (RFC 3161 / OpenTimestamps / off-host digest mirroring)
  to defeat tail truncation: acknowledged open risk, deferred to a future
  ADR — orthogonal to storage shape.

## Consequences

- Write path becomes O(1) append + periodic bounded rotation scan instead
  of O(n) full rewrite; the stop-hook latency budget stops degrading as the
  log grows.
- Idempotency sidecar `.jiahao-evidence.keys` is unchanged and remains the
  restart-safe dedup store.
- `readAll()` transparently concatenates segments so ADR-0018 kappa / gate
  scoring consumers are unaffected; hooks that read the raw file must go
  through the EvidenceLog factory (verdict-gate to be switched).
- Rotation bump: at 256 KiB and a few KiB per turn, failure most likely to
  surface is a torn last line in the active segment; recovery = truncate
  to the last valid line (Kafka CRC precedent, to be implemented).

