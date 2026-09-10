// src/evidence-log.js — EvidenceLog (ADR-0016 D1)
// Deep module hiding canonical JSON, hashing, idempotency sidecar, and chain
// verification behind a factory closure: createEvidenceLog(dir?, opts?) ->
// { append, commit, readAll, verify, verifyTail, verifyFull, clear, createRecord }
//
// Ponytail (ADR-0007): hash chain is tamper-evidence, not cryptographic
// anchoring. Upgrade path to Ed25519 + Rekor lives behind cross-host audit
// (ADR-0013), not here.
//
// ADR-0026 (segmented evidence log):
//   D1 `.jiahao-evidence` is a DIRECTORY of JSONL segments. Sealed segments
//      are never rewritten; only the active segment accepts O(1) appends.
//      Non-genesis segments begin with a `segment_anchor` record carrying
//      prev_segment_hash / prev_segment_bytes / prev_segment_count /
//      seq_start (CloudTrail digest-chain precedent).
//   D2 rotation at a 256 KiB byte threshold, checked via statSync inside the
//      ADR-0024 narrow lock; no time trigger, no retention policy.
//   D3 base-seq names `%020d.jsonl` — filename = global record count at
//      segment start (anchors count as records). Sequence is allocated by
//      in-lock directory rescan; scan errors are fail-loud (except ENOENT
//      on a fresh install).
//   D4 verifyTail() is the hot path (active segment + previous-segment
//      anchor prechecks); verifyFull() is the cold path (all segments plus
//      filename/seq cross-check). scripts/verify-evidence.js exposes both.
//   D5 legacy plain-JSON-array files migrate transparently on first write
//      (gatecrash pattern): verify-before-migrate, breakpoint semantics on
//      damaged chains, rename-last with .legacy.bak never auto-deleted.
//      Broken-at-genesis + verifier profile = refuse migration (read-only).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { evidencePath, evidenceKeysPath, profilePath } = require('./shared/paths');
const { withLockSync } = require('./file-lock'); // ADR-0024 D2a

// ADR-0023 D5 registry: degradation kinds this contract understands.
// Evolution rules: only add kinds; detail fields within a kind are
// additive-optional only; never delete or rename. Machine-checked by
// schemas/degradation.schema.json in tests.
const KNOWN_DEGRADATION_KINDS = ['truncation', 'scan-skip', 'timeout'];

// Escalation band stamped onto every record (FutureAGI 0.4-0.7, ADR-0007 research).
// Also used by the ladder in gate.js for the escalation decision.
const ESCALATION_BAND = { low: 0.4, high: 0.7 };

// ADR-0026 D2/D3 constants.
const SEGMENT_BYTES = 256 * 1024;
const SEGMENT_VERSION = 1;
const SEGMENT_RE = /^(\d{20})\.jsonl$/;

function canonicalJSON(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalJSON).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(obj[k])).join(',') + '}';
}

// ADR-0013 D1: hash input includes prev_hash (delete-middle-relink fix).
// event_hash is excluded to avoid the circular dependency.
function recordHash(record) {
  const { event_hash, ...rest } = record;
  return crypto.createHash('sha256').update(canonicalJSON(rest)).digest('hex');
}

// ADR-0051 D-A: closed persistence capability class. The anchor write path
// dispatches on this class, never on a platform string; adding a class is a
// deliberate ADR-level event.
const PERSISTENCE_CAPABILITY = Object.freeze({
  dir_sync_durable: 'dir-sync-durable',
  dir_sync_unsupported: 'dir-sync-unsupported',
});
function _isPersistenceCapability(value) {
  return value === PERSISTENCE_CAPABILITY.dir_sync_durable ||
    value === PERSISTENCE_CAPABILITY.dir_sync_unsupported;
}
// Operator declaration / probe record lives next to the profile flag in the
// config dir (ADR-0051 D-B).
const PERSISTENCE_DECLARATION_FILENAME = '.jiahao-persistence.json';
function _declaredPersistenceCapability(configDirPath) {
  try {
    const decl = JSON.parse(fs.readFileSync(path.join(configDirPath, PERSISTENCE_DECLARATION_FILENAME), 'utf8'));
    if (decl && _isPersistenceCapability(decl.declared)) return decl.declared;
    if (decl && _isPersistenceCapability(decl.probed)) return decl.probed;
  } catch (e) { /* no declaration file */ }
  return null;
}

const ANCHOR_CONFIG_FILENAME = '.jiahao-anchor.json';
const ANCHOR_DEFAULT_REANCHOR_MS = 72 * 3600 * 1000;
const ANCHOR_HARD_FACTOR = 1.5;
const ANCHOR_FRESHNESS = Object.freeze({
  fresh: 'fresh',
  stale: 'stale',
  hard_stale: 'hard_stale',
});
class ConfigLoadError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ConfigLoadError';
    this.cause = cause;
  }
}
function _isPositiveFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
function _isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}
function _readAnchorConfig(configDirPath) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(configDirPath, ANCHOR_CONFIG_FILENAME), 'utf8');
  } catch (e) {
    if (e && e.code === 'ENOENT') return { reanchorMs: ANCHOR_DEFAULT_REANCHOR_MS };
    throw new ConfigLoadError('cannot load anchor config: ' + e.message, e);
  }
  let declaration;
  try {
    declaration = JSON.parse(raw);
  } catch (e) {
    throw new ConfigLoadError('cannot parse anchor config: ' + e.message, e);
  }
  if (!declaration || typeof declaration !== 'object' || Array.isArray(declaration)) {
    throw new ConfigLoadError('anchor config must be a JSON object');
  }
  const out = { reanchorMs: ANCHOR_DEFAULT_REANCHOR_MS };
  if (declaration.reanchorMs !== undefined) {
    if (!_isPositiveFiniteNumber(declaration.reanchorMs)) {
      throw new ConfigLoadError('anchor config reanchorMs must be a positive finite number');
    }
    out.reanchorMs = declaration.reanchorMs;
  }
  if (declaration.reanchorCommits !== undefined) {
    if (!_isPositiveInteger(declaration.reanchorCommits)) {
      throw new ConfigLoadError('anchor config reanchorCommits must be a positive integer');
    }
    out.reanchorCommits = declaration.reanchorCommits;
  }
  return out;
}

function _applyAnchorInjection(base, opts) {
  const resolved = Object.assign({}, base);
  const injected = opts || {};
  if (injected.reanchorMs !== undefined) {
    if (!_isPositiveFiniteNumber(injected.reanchorMs)) {
      throw new ConfigLoadError('injected reanchorMs must be a positive finite number');
    }
    resolved.reanchorMs = injected.reanchorMs;
  }
  if (injected.reanchorCommits !== undefined) {
    if (!_isPositiveInteger(injected.reanchorCommits)) {
      throw new ConfigLoadError('injected reanchorCommits must be a positive integer');
    }
    resolved.reanchorCommits = injected.reanchorCommits;
  }
  return resolved;
}

function _resolveAnchorConfig(configDirPath, opts) {
  return _applyAnchorInjection(_readAnchorConfig(configDirPath), opts);
}

const HEAD_ANCHOR_VERSION = 1;
const GENESIS_ANCHOR_VERSION = 1;
const SEAL_SIDECAR_VERSION = 1;
const FORWARD_SEAL_KIND = 'forward_seal';
const TAIL_ANCHOR_FILENAME = 'evidence-head.json';
const GENESIS_ANCHOR_FILENAME = 'evidence-genesis.json';
const SEAL_SIDECAR_FILENAME = 'evidence-seal.json';
const KNOWN_ANCHOR_STATUS = Object.freeze({
  anchored: 'anchored',
  never_anchored: 'never_anchored',
  expected_missing: 'expected_missing',
  unreadable: 'unreadable',
  hash_mismatch: 'hash_mismatch',
  bytes_mismatch: 'bytes_mismatch',
  count_mismatch: 'count_mismatch',
  anchor_behind: 'anchor_behind',
  anchor_ahead: 'anchor_ahead',
  // ADR-0052 D-A: self-consistent chain, local witness missing/unreadable/torn.
  // Additive only — never rename or delete registry values.
  witness_unavailable: 'witness_unavailable',
});

// ADR-0052 D-D: content-anchored witness-recovery constants — an independent
// 'witness-recovery' domain, separate from the ADR-0030 judge 6/9-month
// domain. Value changes require an ADR-0052 revision. Detection-latency
// upper bound: max(access interval, patrol interval).
const WITNESS_RECOVERY = Object.freeze({
  soft_ms: 72 * 3600 * 1000,
  hard_ms: 7 * 24 * 3600 * 1000,
  consumer: 'human_auditor',
  detection_latency_bound: 'max(access interval, patrol interval)',
});
const WITNESS_DEGRADED_KIND = 'witness_degraded';
const WITNESS_RECOVERY_KIND = 'witness_recovery';
const WITNESS_HARD_STOP_CODE = 'WITNESS_HARD_DEADLINE';
function _hashAnchorTriple(latestSeq, totalCount, headHash) {
  return crypto.createHash('sha256').update(String(latestSeq) + '|' + String(totalCount) + '|' + String(headHash)).digest('hex');
}
function _hashGenesis(firstHash) {
  return crypto.createHash('sha256').update(String(firstHash)).digest('hex');
}
function _writeAnchorAtomic(file, obj, capability) {
  const tmp = file + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(obj) + String.fromCharCode(10), 'utf8');
  _fsyncFile(tmp);
  try { fs.renameSync(tmp, file); } catch (e) { try { fs.unlinkSync(tmp); } catch (e2) {} throw e; }
  _fsyncDirectory(path.dirname(file), capability);
}
function _fsyncFile(file) {
  const fd = fs.openSync(file, 'a');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
// ADR-0051 D-A: dispatch on the closed capability class. The current Windows
// no-op remains a no-op under 'dir-sync-unsupported'; POSIX hosts declare
// 'dir-sync-durable' and make the rename durable. An unknown class throws
// instead of silently guessing a recipe.
function _fsyncDirectory(dir, capability) {
  capability = capability === undefined ? _defaultPersistenceCapability() : capability;
  if (capability === PERSISTENCE_CAPABILITY.dir_sync_unsupported) return;
  if (capability !== PERSISTENCE_CAPABILITY.dir_sync_durable) {
    throw new Error('unknown persistence capability class: ' + String(capability));
  }
  const fd = fs.openSync(dir, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function _defaultPersistenceCapability() {
  return process.platform === 'win32'
    ? PERSISTENCE_CAPABILITY.dir_sync_unsupported
    : PERSISTENCE_CAPABILITY.dir_sync_durable;
}
// ADR-0051 D-B: installation/upgrade probe. Records the OBSERVED class only;
// a passing fsync is not proof the platform made the directory entry durable,
// so an operator declaration stays authoritative when the probe is
// inconclusive.
function probePersistenceCapability(dir) {
  try {
    const fd = fs.openSync(dir, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return PERSISTENCE_CAPABILITY.dir_sync_durable;
  } catch (e) {
    return PERSISTENCE_CAPABILITY.dir_sync_unsupported;
  }
}
// Resolution order: injected (test seam) > operator declaration > recorded
// probe > platform default.
function resolvePersistenceCapability(injected, configDirPath) {
  if (_isPersistenceCapability(injected)) return injected;
  return _declaredPersistenceCapability(configDirPath) || _defaultPersistenceCapability();
}
function readTailAnchor(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) {
    if (e && e.code === 'ENOENT') return { status: KNOWN_ANCHOR_STATUS.never_anchored, anchor: null };
    // ADR-0052 D-A: missing/unreadable witness is not corruption.
    return { status: KNOWN_ANCHOR_STATUS.witness_unavailable, anchor: null };
  }
  try {
    const anchor = JSON.parse(raw);
    const checksum = _hashAnchorTriple(anchor.latest_seq, anchor.total_count, anchor.head_hash);
    if (!anchor || anchor.version !== HEAD_ANCHOR_VERSION ||
        typeof anchor.latest_seq !== 'number' || typeof anchor.total_count !== 'number' ||
        typeof anchor.head_hash !== 'string' || anchor.checksum !== checksum) {
      return { status: KNOWN_ANCHOR_STATUS.unreadable, anchor: null };
    }
    return { status: KNOWN_ANCHOR_STATUS.anchored, anchor: anchor };
  // ADR-0052 D-A: a torn (unparseable) witness file is witness_unavailable;
  // a present-but-wrong checksum/version stays in the corruption family above.
  } catch (e) { return { status: KNOWN_ANCHOR_STATUS.witness_unavailable, anchor: null }; }
}
function writeTailAnchor(file, latestSeq, totalCount, headHash, capability, updatedAt, witness) {
  capability = capability === undefined ? _defaultPersistenceCapability() : capability;
  const checksum = _hashAnchorTriple(latestSeq, totalCount, headHash);
  const anchor = {
    version: HEAD_ANCHOR_VERSION,
    latest_seq: latestSeq,
    total_count: totalCount,
    head_hash: headHash,
    checksum: checksum,
    // ADR-0051 D-C: audit annotation — the class explains crash semantics of
    // this anchor write (e.g. why anchor_behind is expected on this host).
    persistence: capability,
    updated_at: updatedAt || new Date().toISOString(),
  };
  if (witness && typeof witness === 'object') {
    anchor.witness_breakpoint_index = Number.isInteger(witness.witness_breakpoint_index)
      ? witness.witness_breakpoint_index
      : null;
    anchor.witness_breakpoint_detected_at = typeof witness.witness_breakpoint_detected_at === 'string'
      ? witness.witness_breakpoint_detected_at
      : null;
    anchor.witness_post_detection_evidence_appends = Number.isInteger(witness.witness_post_detection_evidence_appends)
      ? witness.witness_post_detection_evidence_appends
      : 0;
  }
  _writeAnchorAtomic(file, anchor, capability);
}
function readGenesisAnchor(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) {
    if (e && e.code === 'ENOENT') return { status: KNOWN_ANCHOR_STATUS.never_anchored, anchor: null };
    // ADR-0052 D-A: missing/unreadable witness is not corruption.
    return { status: KNOWN_ANCHOR_STATUS.witness_unavailable, anchor: null };
  }
  try {
    const anchor = JSON.parse(raw);
    const checksum = _hashGenesis(anchor.first_hash);
    if (!anchor || anchor.version !== GENESIS_ANCHOR_VERSION ||
        typeof anchor.first_hash !== 'string' || anchor.checksum !== checksum) {
      return { status: KNOWN_ANCHOR_STATUS.unreadable, anchor: null };
    }
    return { status: KNOWN_ANCHOR_STATUS.anchored, anchor: anchor };
  // ADR-0052 D-A: a torn (unparseable) witness file is witness_unavailable;
  // a present-but-wrong checksum/version stays in the corruption family above.
  } catch (e) { return { status: KNOWN_ANCHOR_STATUS.witness_unavailable, anchor: null }; }
}
function writeGenesisAnchor(file, firstHash, capability, generation) {
  capability = capability === undefined ? _defaultPersistenceCapability() : capability;
  const checksum = _hashGenesis(firstHash);
  // ADR-0052 D-E: generation increments on every controlled rebuild.
  const anchor = {
    version: GENESIS_ANCHOR_VERSION,
    first_hash: firstHash,
    checksum: checksum,
    persistence: capability,
    updated_at: new Date().toISOString(),
  };
  if (generation !== undefined) anchor.generation = generation;
  _writeAnchorAtomic(file, anchor, capability);
}
function _hasForwardSeal(records) {
  return Array.isArray(records) && records.some(function (r) { return r && r.kind === FORWARD_SEAL_KIND; });
}

// ADR-0053 D-A: with periodic re-anchoring there can be many seals; the last
// one is the re-anchor reference point.
function _lastForwardSealIndex(records) {
  let idx = -1;
  for (let i = 0; i < records.length; i++) {
    if (records[i] && records[i].kind === FORWARD_SEAL_KIND) idx = i;
  }
  return idx;
}
// ADR-0053 D-B: a seal is an acceptable fallback witness only when its
// in-chain coordinates match the record it pins. Otherwise there is no
// "last good seal" and the ADR-0052 witness-unavailable path stays fail-closed.
function _acceptableSeal(records) {
  if (!Array.isArray(records)) return null;
  const idx = _lastForwardSealIndex(records);
  if (idx < 1) return null;
  const seal = records[idx];
  const pinned = records[idx - 1];
  if (seal.sealed_seq !== idx - 1 ||
      seal.sealed_total_count !== idx ||
      !pinned || typeof pinned.event_hash !== 'string' ||
      pinned.event_hash !== seal.sealed_head_hash) return null;
  return { record: seal, index: idx, post_seal_count: records.length - 1 - idx };
}
function _makeForwardSealRecord(sealed) {
  const rec = {
    kind: FORWARD_SEAL_KIND,
    sealed_head_hash: sealed.sealed_head_hash,
    sealed_seq: sealed.sealed_seq,
    sealed_total_count: sealed.sealed_total_count,
    timestamp: typeof sealed.timestamp === 'string' ? sealed.timestamp : new Date().toISOString(),
    prev_hash: sealed.sealed_head_hash,
  };
  rec.event_hash = recordHash(rec);
  return rec;
}

// ADR-0013 D3: composite idempotency key SHA256(session|turn|tool_seq).
function idempotencyKey(sessionId, turnId, toolSeq) {
  const raw = String(sessionId || '') + '|' + String(turnId || '') + '|' + String(toolSeq || '');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Chain integrity check WITHOUT touching fs. The first record must chain to
// genesis (prev_hash === null). Used for materialized arrays and legacy files.
function verifyChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) {
    return { valid: false, broken_at: -1, reason: 'empty or non-array chain' };
  }
  let expectedPrev = null;
  for (let i = 0; i < chain.length; i++) {
    const record = chain[i];
    if (record.prev_hash !== expectedPrev) {
      return { valid: false, broken_at: i, reason: 'prev_hash mismatch at index ' + i };
    }
    if (record.event_hash !== recordHash(record)) {
      return { valid: false, broken_at: i, reason: 'event_hash mismatch at index ' + i };
    }
    // ADR-0031 D5: present-but-invalid provenance fails the record.
    const pp = provenanceProblems(record);
    if (pp.length) {
      return { valid: false, broken_at: i, reason: 'provenance invalid at index ' + i + ' (' + pp.join(',') + ')' };
    }
    expectedPrev = record.event_hash;
  }
  return { valid: true };
}

// Like verifyChain but the FIRST record's prev_hash is unconstrained — used
// for per-segment link checks where a non-genesis segment starts at the
// previous segment's tail hash (ADR-0026 D1/D4).
function verifyLinks(records, offset) {
  const base = offset || 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (i > 0 && r.prev_hash !== records[i - 1].event_hash) {
      return { valid: false, broken_at: base + i, reason: 'prev_hash mismatch at index ' + (base + i) };
    }
    if (r.event_hash !== recordHash(r)) {
      return { valid: false, broken_at: base + i, reason: 'event_hash mismatch at index ' + (base + i) };
    }
    const pp = provenanceProblems(r);
    if (pp.length) {
      return { valid: false, broken_at: base + i, reason: 'provenance invalid at index ' + (base + i) + ' (' + pp.join(',') + ')' };
    }
  }
  return { valid: true };
}

// ADR-0031 D5 evidence provenance (optional additive, SLSA extension-field
// semantics): absent on old records and semantically identical to an
// unrecognized field. Verification adds a PRESENT-BUT-INVALID check only —
// absent is never an error. Shape:
//   provenance.builder   { profile, rules_version, thresholds_fp, hook }
//   provenance.recipe    { gate_id, gate_type, ladder_rung?, degradation_kind? }
//   provenance.materials { claim_sha256, tool_results_digest, session_anchors?, prev_hash }
// Hex fields (fp/digest/sha256) must be lowercase hex when present.
const HEX_RE = /^[0-9a-f]{4,128}$/;
function _provShape(o, fields, hexFields, label, problems) {
  if (o === undefined) return;
  if (!o || typeof o !== 'object' || Array.isArray(o)) { problems.push(label + ':not-object'); return; }
  for (const k of Object.keys(o)) {
    if (fields.indexOf(k) < 0) { problems.push(label + '.extra:' + k); continue; }
    const v = o[k];
    if (hexFields.indexOf(k) >= 0) {
      if (typeof v !== 'string' || !HEX_RE.test(v)) problems.push(label + '.' + k + ':not-hex');
    } else if (k === 'session_anchors') {
      if (!Array.isArray(v) || v.some(a => typeof a !== 'string')) problems.push(label + '.session_anchors:not-string-array');
    } else if (k !== 'ladder_rung' && typeof v !== 'string') {
      problems.push(label + '.' + k + ':not-string');
    } else if (k === 'ladder_rung' && typeof v !== 'string' && typeof v !== 'number') {
      problems.push(label + '.ladder_rung:bad-type');
    }
  }
}
// provenanceProblems(record) -> string[] ([] = ok). Only fires when the
// record actually carries provenance; the hash chain stays byte-identical
// for records without it.
function provenanceProblems(record) {
  const problems = [];
  if (!record) return problems;
  if (record.provenance === undefined) return problems;
  const p = record.provenance;
  if (!p || typeof p !== 'object' || Array.isArray(p)) { return ['provenance:not-object']; }
  for (const k of Object.keys(p)) {
    if (k !== 'builder' && k !== 'recipe' && k !== 'materials') problems.push('provenance.extra:' + k);
  }
  _provShape(p.builder, ['profile', 'rules_version', 'thresholds_fp', 'hook'], ['thresholds_fp'], 'builder', problems);
  _provShape(p.recipe, ['gate_id', 'gate_type', 'ladder_rung', 'degradation_kind'], [], 'recipe', problems);
  _provShape(p.materials, ['claim_sha256', 'tool_results_digest', 'session_anchors', 'prev_hash'], ['claim_sha256', 'tool_results_digest', 'prev_hash'], 'materials', problems);
  return problems;
}

// ADR-0013 D2: turn_init boundary record (moved from gate.js, ADR-0016 D1).
function createTurnInit(sessionId, turnId, prevHash) {
  return {
    kind: 'turn_init',
    session_id: sessionId,
    turn_id: turnId,
    first_prev_hash: prevHash || null,
    timestamp: new Date().toISOString(),
    prev_hash: prevHash || null,
    event_hash: null, // filled below
  };
}
function finalizeTurnInit(init) {
  init.event_hash = recordHash(init);
  return init;
}

function segmentName(seq) { return String(seq).padStart(20, '0') + '.jsonl'; }

function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

// Torn-tail recovery (ADR-0026 Consequences, Kafka CRC precedent): only the
// FINAL line of the ACTIVE segment may be a torn write; any other
// unparseable line is corruption and throws.
function readSegment(segPath, tolerateTornTail) {
  const lines = fs.readFileSync(segPath, 'utf8').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const records = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      records.push(JSON.parse(lines[i]));
    } catch (e) {
      if (tolerateTornTail && i === lines.length - 1) break;
      throw new Error('corrupt line ' + i + ' in ' + path.basename(segPath));
    }
  }
  return records;
}

// ADR-0026 D3: the segment directory is the only source of truth (no
// CURRENT/pointer file). Fail-loud: only ENOENT (fresh install) yields an
// empty list; any other scan error aborts the caller (AletheiaDB precedent).
function listSegments(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (e) {
    if (e && e.code === 'ENOENT') return [];
    throw e;
  }
  const segs = [];
  for (const n of names) {
    const m = SEGMENT_RE.exec(n);
    if (m) segs.push({ seq: parseInt(m[1], 10), name: n, path: path.join(dir, n) });
  }
  segs.sort((a, b) => a.seq - b.seq);
  return segs;
}

function createEvidenceLog(overrideConfigDir, opts) {
  const o = opts || {};
  const rotateBytes = typeof o.rotateBytes === 'number' ? o.rotateBytes : SEGMENT_BYTES;
  const now = typeof o.now === 'function' ? o.now : Date.now; // ADR-0052 D-D: injectable recovery clock
  let witnessGateBusy = false; // breakpoint-record recursion guard
  const ep = overrideConfigDir
    ? path.join(overrideConfigDir, '.jiahao-evidence')
    : evidencePath();
  const kp = overrideConfigDir
    ? path.join(overrideConfigDir, '.jiahao-evidence.keys')
    : evidenceKeysPath();
  const stagingDir = ep + '.migrating';
  // ADR-0051: explicit configuration (test seam / operator declaration) is
  // resolved once; otherwise the effective class is decided per anchor write
  // so a platform change mid-process keeps ADR-0050 semantics.
  // Resolution of an explicit or declared class is captured once; when
  // neither exists the platform default stays dynamic per anchor write so a
  // mid-process platform override keeps ADR-0050 semantics.
  const configuredCapability = _isPersistenceCapability(o.capability)
    ? o.capability
    : _declaredPersistenceCapability(path.dirname(ep));
  const configuredAnchor = _resolveAnchorConfig(path.dirname(ep), o);
  function persistenceCapability() {
    return configuredCapability || _defaultPersistenceCapability();
  }
  function anchorConfig() {
    return Object.assign({}, configuredAnchor);
  }
  let legacyReadOnly = false; // ADR-0026 D5 refusal state (per instance)

  function note(msg) {
    try { process.stderr.write('jiahao evidence-log: ' + msg + '\n'); } catch (e) { /* sink */ }
  }

  function statKind() {
    try {
      const st = fs.statSync(ep);
      return st.isDirectory() ? 'dir' : 'file';
    } catch (e) { return 'none'; }
  }

  // Default profile is the blocking VERIFIER — an absent profile file means
  // verifier (hooks/jiahao-profile.js default), so broken-at-genesis legacy
  // chains refuse migration by default (ADR-0026 D5).
  function isVerifierProfile() {
    const pp = overrideConfigDir ? path.join(overrideConfigDir, '.jiahao-profile') : profilePath();
    try { return fs.readFileSync(pp, 'utf8').trim() !== 'generator'; }
    catch (e) { return true; }
  }

  function legacyBakPath() {
    const first = ep + '.legacy.bak';
    if (!fs.existsSync(first)) return first;
    for (let i = 1; ; i++) {
      const p = first + '.' + i;
      if (!fs.existsSync(p)) return p;
    }
  }

  function readConcat() {
    const segs = listSegments(ep);
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      const recs = readSegment(segs[i].path, i === segs.length - 1);
      for (let j = 0; j < recs.length; j++) out.push(recs[j]);
    }
    return out;
  }

  // Legacy plain-JSON-array read path (ADR-0026 D5 read-only legacy mode).
  function readLegacy() {
    try {
      const raw = fs.readFileSync(ep, 'utf8').trim();
      if (raw.length === 0) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) { return null; }
  }

  function readAll() {
    const kind = statKind();
    if (kind === 'none') return null;
    if (kind === 'file') return readLegacy();
    try {
      const out = readConcat();
      // readAll() nulls on corruption (fail-closed); verifyFull explains why.
      return out.length > 0 ? out : null;
    } catch (e) { return null; }
  }

  // ADR-0026 D5: three-hardening transparent migration.
  //   1. All staging/renames happen inside the narrow commit lock.
  //   2. Schneier-Kelsey breakpoint semantics: chain is verified BEFORE
  //      migrating; broken chains keep every record and receive a
  //      `legacy_migration` marker; nothing is silently dropped.
  //   3. The legacy file is renamed to .legacy.bak only AFTER the staged
  //      replacement is fully written; the .bak is never auto-deleted.
  function migrateLegacy() {
    let parsed = null;
    try {
      const p = JSON.parse(fs.readFileSync(ep, 'utf8'));
      if (Array.isArray(p)) parsed = p;
    } catch (e) { /* unparseable legacy file */ }
    const verdict = (!parsed)
      ? { valid: false, broken_at: 0, reason: 'legacy evidence file is not a JSON array' }
      : (parsed.length === 0 ? { valid: true } : verifyChain(parsed));
    if (!verdict.valid && verdict.broken_at === 0 && isVerifierProfile()) {
      legacyReadOnly = true;
      note('refusing to migrate legacy evidence: chain broken at genesis and ' +
        'profile is the blocking verifier. File left untouched at ' + ep +
        ' — log is read-only until an operator inspects it.');
      return false;
    }
    const records = parsed || [];
    const lines = records.map(r => JSON.stringify(r));
    if (!verdict.valid) {
      const last = records.length > 0 ? records[records.length - 1] : null;
      const mark = {
        kind: 'legacy_migration',
        broken_at: verdict.broken_at,
        reason: verdict.reason || null,
        timestamp: new Date().toISOString(),
        prev_hash: last && typeof last.event_hash === 'string' ? last.event_hash : null,
      };
      mark.event_hash = recordHash(mark);
      lines.push(JSON.stringify(mark));
    }
    const bak = legacyBakPath();
    try {
      fs.rmSync(stagingDir, { recursive: true, force: true });
      fs.mkdirSync(stagingDir, { recursive: true });
      if (lines.length > 0) {
        fs.writeFileSync(path.join(stagingDir, segmentName(0)), lines.join('\n') + '\n', 'utf8');
      }
      fs.renameSync(ep, bak);
      fs.renameSync(stagingDir, ep);
      note('legacy evidence migrated to segmented log; original kept at ' + bak);
      return true;
    } catch (e) {
      note('legacy migration failed (' + e.message + ') — staying read-only');
      try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e2) {}
      try { if (statKind() === 'none' && fs.existsSync(bak)) fs.renameSync(bak, ep); } catch (e3) {}
      legacyReadOnly = true;
      return false;
    }
  }

  // Returns true once the segmented layout is usable. Also completes a
  // migration that crashed between the two renames (ADR-0026 D5 recovery).
  function ensureSegmented() {
    const kind = statKind();
    if (kind === 'dir') {
      try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) {}
      return true;
    }
    if (kind === 'none') {
      if (fs.existsSync(stagingDir)) {
        try { fs.renameSync(stagingDir, ep); }
        catch (e) { note('migration recovery failed: ' + e.message); return false; }
      }
      return true;
    }
    return migrateLegacy();
  }

  function headAnchorPath() { return path.join(path.dirname(ep), TAIL_ANCHOR_FILENAME); }
  function genesisAnchorPath() { return path.join(path.dirname(ep), GENESIS_ANCHOR_FILENAME); }
  function sealSidecarPath() { return path.join(path.dirname(ep), SEAL_SIDECAR_FILENAME); }

  function readSealSidecar() {
    let raw;
    try { raw = fs.readFileSync(sealSidecarPath(), 'utf8'); }
    catch (e) { return null; }
    try {
      const sidecar = JSON.parse(raw);
      if (!sidecar || sidecar.version !== SEAL_SIDECAR_VERSION ||
          !Number.isInteger(sidecar.seal_index) || sidecar.seal_index < 1 ||
          !Number.isInteger(sidecar.sealed_seq) || sidecar.sealed_seq !== sidecar.seal_index - 1 ||
          sidecar.sealed_total_count !== sidecar.seal_index ||
          typeof sidecar.sealed_head_hash !== 'string' ||
          typeof sidecar.seal_timestamp !== 'string' ||
          !Number.isInteger(sidecar.post_seal_count) || sidecar.post_seal_count < 0) {
        return null;
      }
      return {
        record: {
          sealed_head_hash: sidecar.sealed_head_hash,
          timestamp: sidecar.seal_timestamp,
        },
        index: sidecar.seal_index,
        post_seal_count: sidecar.post_seal_count,
      };
    } catch (e) { return null; }
  }

  function _sealRecordMatches(sealRecord, pinned, seal) {
    return sealRecord && sealRecord.kind === FORWARD_SEAL_KIND &&
      sealRecord.sealed_seq === seal.index - 1 &&
      sealRecord.sealed_total_count === seal.index &&
      pinned && typeof pinned.event_hash === 'string' &&
      pinned.event_hash === seal.record.sealed_head_hash;
  }

  function _sealForHotPath(segs) {
    const seal = readSealSidecar();
    if (!seal) return null;
    if (!Array.isArray(segs) || segs.length === 0) return null;

    let segIndex = segs.length - 1;
    while (segIndex > 0 && segs[segIndex].seq > seal.index) segIndex -= 1;
    const seg = segs[segIndex];
    let recs;
    try { recs = readSegment(seg.path, segIndex === segs.length - 1); }
    catch (e) { return null; }
    const localIndex = seal.index - seg.seq;
    if (localIndex < 0 || localIndex >= recs.length) return null;
    const sealRecord = recs[localIndex];

    let pinned = null;
    if (localIndex > 0) {
      pinned = recs[localIndex - 1];
    } else if (segIndex > 0) {
      try {
        const previousRecs = readSegment(segs[segIndex - 1].path, false);
        pinned = previousRecs.length > 0 ? previousRecs[previousRecs.length - 1] : null;
      } catch (e) { return null; }
    }
    return _sealRecordMatches(sealRecord, pinned, seal) ? seal : null;
  }

  function writeSealSidecar(seal) {
    if (!seal) {
      try { fs.unlinkSync(sealSidecarPath()); } catch (e) {}
      return;
    }
    _writeAnchorAtomic(sealSidecarPath(), {
      version: SEAL_SIDECAR_VERSION,
      seal_index: seal.index,
      sealed_seq: seal.index - 1,
      sealed_total_count: seal.index,
      sealed_head_hash: seal.record.sealed_head_hash,
      seal_timestamp: seal.record.timestamp,
      post_seal_count: seal.post_seal_count,
    }, persistenceCapability());
  }

  function _tailState(records) {
    if (!Array.isArray(records) || records.length === 0) return null;
    const last = records[records.length - 1];
    return {
      latest_seq: records.length - 1,
      total_count: records.length,
      head_hash: last && typeof last.event_hash === 'string' ? last.event_hash : null,
      first_hash: records[0] && typeof records[0].event_hash === 'string' ? records[0].event_hash : null,
    };
  }

  function _tailStateFromSegments(segs, activeRecs) {
    const last = segs[segs.length - 1];
    const total = last.seq + activeRecs.length;
    let firstHash = null;
    if (segs.length === 1) {
      firstHash = activeRecs.length > 0 && typeof activeRecs[0].event_hash === 'string' ? activeRecs[0].event_hash : null;
    } else {
      try {
        const firstRecs = readSegment(segs[0].path, false);
        firstHash = firstRecs.length > 0 && typeof firstRecs[0].event_hash === 'string' ? firstRecs[0].event_hash : null;
      } catch (e) { firstHash = null; }
    }
    return {
      latest_seq: total - 1,
      total_count: total,
      head_hash: activeRecs.length > 0 && typeof activeRecs[activeRecs.length - 1].event_hash === 'string' ? activeRecs[activeRecs.length - 1].event_hash : null,
      first_hash: firstHash,
    };
  }

  function _anchorProblem(code, field, expected, actual) {
    return { code: code, field: field, expected: expected, actual: actual };
  }

  // ADR-0052 D-B: every machine-readable witness problem names its consumer
  // (the human auditor in the current single-host deployment).
  function _witnessProblem(field, actual, seal) {
    const p = _anchorProblem(KNOWN_ANCHOR_STATUS.witness_unavailable, field, null, actual);
    p.consumer = WITNESS_RECOVERY.consumer;
    // ADR-0053 D-B: with a seal present, verification falls back to the last
    // good seal; the recovery window is the post-seal tail, bounded by the
    // re-anchor interval — not the whole chain. No new status (D-C).
    if (seal) {
      p.fallback = 'last_good_seal';
      p.recovery = {
        sealed_seq: seal.index - 1,
        sealed_total_count: seal.index,
        sealed_head_hash: seal.record.sealed_head_hash,
        post_seal_count: seal.post_seal_count,
      };
    }
    return p;
  }

  function _externalAnchorProblems(state, sealFn) {
    const seal = sealFn ? sealFn() : null;
    const out = [];
    const tailRead = readTailAnchor(headAnchorPath());
    const genRead = readGenesisAnchor(genesisAnchorPath());
    const tailAnchored = tailRead.status === KNOWN_ANCHOR_STATUS.anchored;
    const genAnchored = genRead.status === KNOWN_ANCHOR_STATUS.anchored;

    if (tailRead.status === KNOWN_ANCHOR_STATUS.witness_unavailable) {
      out.push(_witnessProblem('tail_anchor', tailRead.status, seal));
    } else if (tailRead.status === KNOWN_ANCHOR_STATUS.unreadable) {
      out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.unreadable, 'tail_anchor', null, tailRead.status));
    } else if (tailRead.status === KNOWN_ANCHOR_STATUS.never_anchored) {
      // ADR-0052: a missing tail witness on a sealed chain is witness loss
      // (migrated from expected_missing; the value stays in the registry).
      if (genAnchored || seal) out.push(_witnessProblem('tail_anchor', 'missing', seal));
      else out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.never_anchored, 'tail_anchor', null, null));
    } else if (state) {
      if (tailRead.anchor.total_count !== state.total_count) {
        out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.count_mismatch, 'tail_anchor.total_count', state.total_count, tailRead.anchor.total_count));
      } else {
        if (tailRead.anchor.latest_seq < state.latest_seq) {
          out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.anchor_behind, 'tail_anchor.latest_seq', state.latest_seq, tailRead.anchor.latest_seq));
        } else if (tailRead.anchor.latest_seq > state.latest_seq) {
          out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.anchor_ahead, 'tail_anchor.latest_seq', state.latest_seq, tailRead.anchor.latest_seq));
        }
      }
      if (tailRead.anchor.head_hash !== state.head_hash) {
        out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.hash_mismatch, 'tail_anchor.head_hash', state.head_hash, tailRead.anchor.head_hash));
      }
    }

    if (genRead.status === KNOWN_ANCHOR_STATUS.witness_unavailable) {
      out.push(_witnessProblem('genesis_anchor', genRead.status, seal));
    } else if (genRead.status === KNOWN_ANCHOR_STATUS.unreadable) {
      out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.unreadable, 'genesis_anchor', null, genRead.status));
    } else if (genRead.status === KNOWN_ANCHOR_STATUS.never_anchored) {
      if (tailAnchored || seal) out.push(_witnessProblem('genesis_anchor', 'missing', seal));
      else out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.never_anchored, 'genesis_anchor', null, null));
    } else if (state) {
      if (genRead.anchor.first_hash !== state.first_hash) {
        out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.hash_mismatch, 'genesis_anchor.first_hash', state.first_hash, genRead.anchor.first_hash));
      }
    }

    return out;
  }

  function _formatAnchorProblems(problems) {
    return problems.map(function (p) {
      let s = p.field + ': ' + p.code;
      if (p.expected !== undefined && p.actual !== undefined) s += ' (expected ' + p.expected + ', actual ' + p.actual + ')';
      if (p.fallback) s += ' [fallback: ' + p.fallback + ']';
      return s;
    }).join('; ');
  }

  function _fatalAnchorProblems(problems) {
    return problems.filter(function (p) {
      // ADR-0053 D-B: a witness problem with an acceptable last-good seal
      // degrades verification to the seal rather than failing it outright.
      if (p.fallback === 'last_good_seal') return false;
      return p.code !== KNOWN_ANCHOR_STATUS.never_anchored && p.code !== KNOWN_ANCHOR_STATUS.anchor_behind;
    });
  }

  function _fallbackMeta(problems) {
    for (let i = 0; i < problems.length; i++) {
      const p = problems[i];
      if (p && p.fallback === 'last_good_seal') {
        return {
          fallback: 'last_good_seal',
          consumer: p.consumer,
          recovery_window: p.recovery,
        };
      }
    }
    return null;
  }

  function _freshnessMeta(records, seal) {
    const cfg = anchorConfig();
    const basis = seal === undefined ? _acceptableSeal(records) : seal;
    const tail = readTailAnchor(headAnchorPath());
    let anchorTs = Number.NaN;
    if (tail.status === KNOWN_ANCHOR_STATUS.anchored &&
        tail.anchor && typeof tail.anchor.updated_at === 'string') {
      anchorTs = Date.parse(tail.anchor.updated_at);
    }
    if (!Number.isFinite(anchorTs) && basis && basis.record) {
      anchorTs = Date.parse(basis.record.timestamp);
    }
    if (!Number.isFinite(anchorTs)) {
      return { freshness: ANCHOR_FRESHNESS.fresh, verdict: 'pass' };
    }
    const ageMs = now() - anchorTs;
    if (ageMs >= cfg.reanchorMs * ANCHOR_HARD_FACTOR) {
      return { freshness: ANCHOR_FRESHNESS.hard_stale, verdict: 'fail' };
    }
    if (ageMs >= cfg.reanchorMs) {
      return { freshness: ANCHOR_FRESHNESS.stale, verdict: 'warn' };
    }
    return { freshness: ANCHOR_FRESHNESS.fresh, verdict: 'pass' };
  }

  function lastGoodSeal() {
    let records;
    try {
      records = readConcat();
    } catch (e) {
      return null;
    }
    const seal = _acceptableSeal(records);
    if (!seal) return null;
    return {
      sealed_seq: seal.index - 1,
      sealed_total_count: seal.index,
      sealed_head_hash: seal.record.sealed_head_hash,
      post_seal_count: seal.post_seal_count,
    };
  }

  function _writeTailAnchorForChain(records) {
    const state = _tailState(records);
    if (!state || state.head_hash === null) return;
    const genRead = readGenesisAnchor(genesisAnchorPath());
    if (genRead.status === KNOWN_ANCHOR_STATUS.anchored &&
        genRead.anchor.first_hash !== state.first_hash) return;
    if (_hasForwardSeal(records) || genRead.status === KNOWN_ANCHOR_STATUS.anchored) {
      const bp = _activeBreakpoint(records);
      const extras = {
        witness_breakpoint_index: bp ? bp.index : null,
        witness_breakpoint_detected_at: bp ? bp.record.detected_at : null,
        witness_post_detection_evidence_appends: bp ? _postDetectionAppends(records, bp.index) : 0,
      };
      writeTailAnchor(headAnchorPath(), state.latest_seq, state.total_count, state.head_hash, persistenceCapability(), new Date(now()).toISOString(), extras);
    }
    writeSealSidecar(_acceptableSeal(records));
  }

  // ADR-0053 D-A: opts.reanchorCommits — re-anchor after this many post-seal
  // records; opts.reanchorMs — seal TTL, re-anchor once the last seal is
  // older than this many ms (both optional, either may trigger). With a TTL
  // trigger and no new data, the tail-anchor freshness timestamp renews
  // without a new seal. Default (no opts) keeps the one-time seal behavior.
  function sealForwardIfNeeded(opts) {
    opts = opts || {};
    if (!ensureSegmented()) return { status: 'corrupt', reason: 'could not ensure segmented layout' };
    const cfg = _applyAnchorInjection(configuredAnchor, opts);
    let existing;
    try { existing = readConcat(); }
    catch (e) { return { status: 'corrupt', reason: e.message }; }
    if (existing.length === 0) return { status: 'empty' };
    const first = existing[0];
    const firstHash = first && typeof first.event_hash === 'string' ? first.event_hash : null;
    if (firstHash === null) return { status: 'corrupt', reason: 'chain first record has no event_hash' };
    const genRead = readGenesisAnchor(genesisAnchorPath());
    if (genRead.status === KNOWN_ANCHOR_STATUS.unreadable) {
      return { status: 'corrupt', reason: 'genesis anchor is unreadable' };
    }
    // ADR-0052 D-A: a torn witness is never rewritten silently.
    if (genRead.status === KNOWN_ANCHOR_STATUS.witness_unavailable) {
      return { status: 'witness_unavailable', reason: 'genesis anchor torn — recover via the ADR-0052 rebuild command' };
    }
    if (genRead.status === KNOWN_ANCHOR_STATUS.anchored && genRead.anchor.first_hash !== firstHash) {
      return { status: 'corrupt', reason: 'genesis anchor does not match chain first record' };
    }
    if (genRead.status === KNOWN_ANCHOR_STATUS.never_anchored) {
      // ADR-0052 D-C: on a sealed chain a missing genesis anchor is witness
      // loss, never an occasion for a silent rewrite (the pre-0052 hole).
      if (_hasForwardSeal(existing)) {
        return { status: 'witness_unavailable', reason: 'genesis anchor missing on a sealed chain — recover via the ADR-0052 rebuild command' };
      }
      writeGenesisAnchor(genesisAnchorPath(), firstHash, persistenceCapability());
    }
    const wasSealed = _hasForwardSeal(existing);
    let status = wasSealed ? 'already_sealed' : 'first_seal';
    if (wasSealed) {
      const reanchorCommits = typeof cfg.reanchorCommits === 'number' ? cfg.reanchorCommits : null;
      const reanchorMs = typeof cfg.reanchorMs === 'number' ? cfg.reanchorMs : null;
      const lastIdx = _lastForwardSealIndex(existing);
      const appended = existing.length - 1 - lastIdx;
      const sealTs = Date.parse(existing[lastIdx] && existing[lastIdx].timestamp);
      const ageMs = isNaN(sealTs) ? Infinity : now() - sealTs;
      const dueByCommits = reanchorCommits !== null && appended >= reanchorCommits;
      const dueByTtl = reanchorMs !== null && ageMs >= reanchorMs;
      if (dueByCommits || dueByTtl) {
        if (appended > 0) {
          const head = existing[existing.length - 1];
          const headHash = head && typeof head.event_hash === 'string' ? head.event_hash : null;
          if (headHash === null) return { status: 'corrupt', reason: 'chain tail has no event_hash' };
          const rec = _makeForwardSealRecord({
            sealed_head_hash: headHash,
            sealed_seq: existing.length - 1,
            sealed_total_count: existing.length,
            timestamp: new Date(now()).toISOString(),
          });
          commit(function () { return [rec]; }, { skipRotation: true });
          try { existing = readConcat(); }
          catch (e) { return { status: 'corrupt', reason: e.message }; }
          if (!_hasForwardSeal(existing)) return { status: 'corrupt', reason: 'forward seal append did not persist' };
          status = 'reanchored';
        } else {
          // No new data: freshness renews via the tail-anchor rewrite below
          // (updated_at refreshes); the chain itself stays untouched.
          status = 'freshness_renewed';
        }
      }
    }
    if (!wasSealed) {
      const head = existing[existing.length - 1];
      const headHash = head && typeof head.event_hash === 'string' ? head.event_hash : null;
      if (headHash === null) return { status: 'corrupt', reason: 'chain tail has no event_hash' };
      const rec = _makeForwardSealRecord({
        sealed_head_hash: headHash,
        sealed_seq: existing.length - 1,
        sealed_total_count: existing.length,
        timestamp: new Date(now()).toISOString(),
      });
      commit(function () { return [rec]; }, { skipRotation: true });
      try { existing = readConcat(); }
      catch (e) { return { status: 'corrupt', reason: e.message }; }
      if (!_hasForwardSeal(existing)) return { status: 'corrupt', reason: 'forward seal append did not persist' };
    }
    _writeTailAnchorForChain(existing);
    const state = _tailState(existing);
    return {
      status: status,
      sealed_total_count: state ? state.total_count : existing.length,
      sealed_seq: state ? state.latest_seq : existing.length - 1,
      sealed_head_hash: state ? state.head_hash : null,
    };
  }

  function _readBoundedActiveState() {
    let segs;
    try { segs = listSegments(ep); }
    catch (e) {
      note('segment scan failed — refusing bounded append: ' + e.message);
      return null;
    }
    if (segs.length === 0) {
      return { segs: segs, activePath: null, recs: [], total: 0, tail: null, firstHash: null };
    }
    const active = segs[segs.length - 1];
    let recs;
    try { recs = readSegment(active.path, true); }
    catch (e) {
      note('active segment read failed — refusing bounded append: ' + e.message);
      return null;
    }
    const total = active.seq + recs.length;
    const tail = recs.length > 0 && typeof recs[recs.length - 1].event_hash === 'string'
      ? recs[recs.length - 1].event_hash
      : null;
    let firstHash = null;
    if (segs.length === 1) {
      firstHash = recs.length > 0 && typeof recs[0].event_hash === 'string' ? recs[0].event_hash : null;
    } else {
      try {
        const firstRecs = readSegment(segs[0].path, false);
        firstHash = firstRecs.length > 0 && typeof firstRecs[0].event_hash === 'string' ? firstRecs[0].event_hash : null;
      } catch (e) { firstHash = null; }
    }
    return {
      segs: segs,
      activePath: active.path,
      recs: recs,
      total: total,
      tail: tail,
      firstHash: firstHash,
    };
  }

  function _legacyBreakpointBounded(segs, activeRecs) {
    if (!Array.isArray(segs) || segs.length === 0) return null;
    let recs = activeRecs;
    if (segs.length > 1) {
      try { recs = readSegment(segs[0].path, false); }
      catch (e) { return null; }
    }
    return Array.isArray(recs) ? recs.find(function (r) { return r && r.kind === 'legacy_migration'; }) : null;
  }

  function _boundedWitnessScan(state, seal) {
    if (!state || state.recs.length === 0 || !seal) return null;
    const genRead = readGenesisAnchor(genesisAnchorPath());
    if (genRead.status === KNOWN_ANCHOR_STATUS.anchored &&
        genRead.anchor.first_hash !== state.firstHash) return null;
    const genDown = genRead.status === KNOWN_ANCHOR_STATUS.witness_unavailable ||
                    genRead.status === KNOWN_ANCHOR_STATUS.never_anchored;
    const tailRead = readTailAnchor(headAnchorPath());
    const tailDown = tailRead.status === KNOWN_ANCHOR_STATUS.witness_unavailable ||
                     tailRead.status === KNOWN_ANCHOR_STATUS.never_anchored;
    if (!genDown && !tailDown) return null;
    let bp = null;
    let post = 0;
    if (tailRead.status === KNOWN_ANCHOR_STATUS.anchored && tailRead.anchor &&
        Number.isInteger(tailRead.anchor.witness_breakpoint_index)) {
      bp = {
        record: { detected_at: tailRead.anchor.witness_breakpoint_detected_at },
        index: tailRead.anchor.witness_breakpoint_index,
      };
      post = Number.isInteger(tailRead.anchor.witness_post_detection_evidence_appends)
        ? tailRead.anchor.witness_post_detection_evidence_appends
        : 0;
    }
    return { tailDown: tailDown, genDown: genDown, bp: bp, postDetectionAppends: post };
  }

  function _witnessPreCheckBounded(state, seal) {
    if (witnessGateBusy || legacyReadOnly) return;
    if (statKind() !== 'dir') return;
    if (!state) {
      note('witness scan failed: bounded append state is unavailable; appends are refused until the store is readable');
      return;
    }
    let scan = null;
    try { scan = _boundedWitnessScan(state, seal); }
    catch (e) {
      note('bounded witness scan failed: ' + e.message + '; appends are refused until the store is readable');
      scan = { tailDown: true, genDown: true, bp: null, postDetectionAppends: 0 };
    }
    if (!scan || !scan.bp) return;
    const nowMs = now();
    const detectedMs = Date.parse(scan.bp.record.detected_at);
    const postDetectionAppends = scan.postDetectionAppends;
    const age = nowMs - detectedMs;
    if (age > WITNESS_RECOVERY.hard_ms && postDetectionAppends >= 1) {
      const err = new Error('witness unavailable past the hard deadline (' + WITNESS_RECOVERY.hard_ms + 'ms) with ' +
        postDetectionAppends + ' unverified post-detection append(s) — stop and recover via the ADR-0052 rebuild command');
      err.code = WITNESS_HARD_STOP_CODE;
      throw err;
    }
    if (age > WITNESS_RECOVERY.soft_ms) {
      note('WITNESS UNAVAILABLE for ' + Math.floor(age / 3600000) + 'h (soft deadline ' +
        (WITNESS_RECOVERY.soft_ms / 3600000) + 'h) — explicit degraded write continues; consumer: ' +
        WITNESS_RECOVERY.consumer + ' (ADR-0052)');
    }
  }

  function _readKeysSidecar() {
    const seen = new Set();
    try {
      fs.readFileSync(kp, 'utf8').split('\n').forEach(function (k) { if (k.trim()) seen.add(k.trim()); });
    } catch (e) { /* no sidecar yet */ }
    return seen;
  }

  function _updateSealSidecarPostCount(delta) {
    const seal = readSealSidecar();
    if (!seal || delta <= 0) return;
    seal.post_seal_count += delta;
    writeSealSidecar(seal);
  }

  function _writeBoundedTailAnchor(total, head, bp, postDetectionAppends) {
    const genRead = readGenesisAnchor(genesisAnchorPath());
    if (!readSealSidecar() && genRead.status !== KNOWN_ANCHOR_STATUS.anchored) return false;
    if (genRead.status === KNOWN_ANCHOR_STATUS.anchored) {
      const state = _readBoundedActiveState();
      if (!state || state.firstHash !== genRead.anchor.first_hash) return false;
    }
    writeTailAnchor(headAnchorPath(), total - 1, total, head, persistenceCapability(),
      new Date(now()).toISOString(), {
        witness_breakpoint_index: bp ? bp.index : null,
        witness_breakpoint_detected_at: bp ? bp.record.detected_at : null,
        witness_post_detection_evidence_appends: bp ? postDetectionAppends : 0,
      });
    return true;
  }

  function appendBounded(newRecords) {
    const initial = _readBoundedActiveState();
    commit(function () { return newRecords; }, { boundedAppend: true, initial: initial });
  }

  function append(newRecords) { appendBounded(newRecords); }

  // --- ADR-0052 D-B..D-D: witness-unavailable degraded-append policy --------
  function _makeWitnessDegradedRecord(prevHash, witnesses, nowMs) {
    const rec = {
      kind: WITNESS_DEGRADED_KIND,
      detected_at: new Date(nowMs).toISOString(),
      witness: witnesses,
      consumer: WITNESS_RECOVERY.consumer,
      prev_hash: prevHash,
    };
    rec.event_hash = recordHash(rec);
    return rec;
  }

  // The last witness_degraded breakpoint not yet answered by a
  // witness_recovery record. The recovery clock starts at its detected_at.
  function _activeBreakpoint(records) {
    let bp = null, recovered = -1;
    for (let i = 0; i < records.length; i++) {
      if (records[i] && records[i].kind === WITNESS_DEGRADED_KIND) bp = { record: records[i], index: i };
      if (records[i] && records[i].kind === WITNESS_RECOVERY_KIND) recovered = i;
    }
    if (!bp || recovered > bp.index) return null;
    return bp;
  }

  // Witness state over a materialized chain. Down = missing or torn local
  // witness on a sealed, self-consistent chain.
  function _witnessScan(records) {
    if (records.length === 0 || !_hasForwardSeal(records)) return null;
    const firstHash = records[0] && typeof records[0].event_hash === 'string' ? records[0].event_hash : null;
    const genRead = readGenesisAnchor(genesisAnchorPath());
    if (genRead.status === KNOWN_ANCHOR_STATUS.anchored &&
        genRead.anchor.first_hash !== firstHash) return null; // corruption family owns this
    const genDown = genRead.status === KNOWN_ANCHOR_STATUS.witness_unavailable ||
                    genRead.status === KNOWN_ANCHOR_STATUS.never_anchored;
    const tailRead = readTailAnchor(headAnchorPath());
    const tailDown = tailRead.status === KNOWN_ANCHOR_STATUS.witness_unavailable ||
                     tailRead.status === KNOWN_ANCHOR_STATUS.never_anchored;
    if (!genDown && !tailDown) return null;
    return { tailDown: tailDown, genDown: genDown, bp: _activeBreakpoint(records), records: records };
  }

  // Pre-lock append policy: stop hard at the deadline, warn past the soft one
  // (out-of-chain, stderr). Throws past the caller, never swallowed.
  function _witnessPreCheck() {
    if (witnessGateBusy || legacyReadOnly) return;
    if (statKind() !== 'dir') return; // never-sealed / legacy paths unchanged
    let scan = null;
    try {
      scan = _witnessScan(readConcat());
    } catch (e) {
      // ADR-0052 D-C: a witness scan that cannot prove the witness is
      // healthy is still witness-down; never let the degraded policy
      // disappear on a read error.
      note('witness scan failed: ' + e.message + '; appends are refused until the store is readable');
      scan = { tailDown: true, genDown: true, bp: _activeBreakpointSafe(), records: [] };
    }
    if (!scan || !scan.bp) return;
    const nowMs = now();
    const detectedMs = Date.parse(scan.bp.record.detected_at);
    const postDetectionAppends = _postDetectionAppends(scan.records, scan.bp.index);
    const age = nowMs - detectedMs;
    if (age > WITNESS_RECOVERY.hard_ms && postDetectionAppends >= 1) {
      const err = new Error('witness unavailable past the hard deadline (' + WITNESS_RECOVERY.hard_ms + 'ms) with ' +
        postDetectionAppends + ' unverified post-detection append(s) — stop and recover via the ADR-0052 rebuild command');
      err.code = WITNESS_HARD_STOP_CODE;
      throw err;
    }
    if (age > WITNESS_RECOVERY.soft_ms) {
      note('WITNESS UNAVAILABLE for ' + Math.floor(age / 3600000) + 'h (soft deadline ' +
        (WITNESS_RECOVERY.soft_ms / 3600000) + 'h) — explicit degraded write continues; consumer: ' +
        WITNESS_RECOVERY.consumer + ' (ADR-0052)');
    }
  }

  function _activeBreakpointSafe() {
    try { return _activeBreakpoint(readConcat()); } catch (e) { return null; }
  }

  function _postDetectionAppends(records, bpIndex) {
    let count = 0;
    for (let i = bpIndex + 1; i < records.length; i++) {
      const r = records[i];
      // Only ordinary evidence appends count toward the hard-stop. Seals,
      // segment anchors, and recovery records are bookkeeping, not evidence.
      if (r && !r.kind) count += 1;
    }
    return count;
  }

  // ADR-0052 D-E: controlled genesis-anchor rotation behind the ADR-0017
  // human review gate. Records the disposition in append-only evidence,
  // increments the anchor generation, and forces full verification including
  // the formerly degraded tail. Acknowledgment alone clears nothing.
  function rebuildGenesisAnchor(options) {
    const rb = options || {};
    if (typeof rb.reviewer !== 'string' || rb.reviewer.length === 0 ||
        typeof rb.reason !== 'string' || rb.reason.length === 0 ||
        rb.approval !== true) {
      const err = new Error('rebuild requires the human review gate: reviewer, reason, and explicit approval (ADR-0017 / ADR-0052)');
      err.code = 'WITNESS_REBUILD_UNAUTHORIZED';
      throw err;
    }
    if (!ensureSegmented()) {
      const e0 = new Error('segmented layout unavailable — cannot rebuild');
      e0.code = 'WITNESS_REBUILD_FAILED';
      throw e0;
    }
    const records = readConcat();
    if (records.length === 0) { const e1 = new Error('nothing to rebuild: empty chain'); e1.code = 'WITNESS_REBUILD_FAILED'; throw e1; }
    const chainCheck = verifyChain(records);
    if (!chainCheck.valid) {
      const e2 = new Error('rebuild refused: chain is not self-consistent (' + chainCheck.reason + ') — witness rebuild never whitewashes corruption');
      e2.code = 'WITNESS_REBUILD_FAILED';
      throw e2;
    }
    const genRead = readGenesisAnchor(genesisAnchorPath());
    const prevGen = genRead.status === KNOWN_ANCHOR_STATUS.anchored &&
      typeof genRead.anchor.generation === 'number' ? genRead.anchor.generation : 0;
    const generation = prevGen + 1;
    const sealBasis = _acceptableSeal(records);
    const lastGoodSeal = sealBasis
      ? {
          sealed_seq: sealBasis.index - 1,
          sealed_total_count: sealBasis.index,
          sealed_head_hash: sealBasis.record.sealed_head_hash,
          post_seal_count: sealBasis.post_seal_count,
        }
      : null;
    const bp = _activeBreakpoint(records);
    witnessGateBusy = true; // the audit disposition write must bypass the hard stop
    try {
      commit(function (chain, prevHash) {
        const rec = {
          kind: WITNESS_RECOVERY_KIND,
          reviewer: rb.reviewer,
          reason: rb.reason,
          approval: true,
          generation: generation,
          last_good_seal: lastGoodSeal,
          prev_generation: prevGen,
          detected_at: bp ? bp.record.detected_at : null,
          recovered_at: new Date(now()).toISOString(),
          prev_hash: prevHash,
        };
        rec.event_hash = recordHash(rec);
        return [rec];
      });
    } finally { witnessGateBusy = false; }
    writeGenesisAnchor(genesisAnchorPath(), records[0].event_hash, persistenceCapability(), generation);
    _writeTailAnchorForChain(readConcat());
    const full = verifyFull();
    if (!full.valid) {
      const e3 = new Error('rebuilt but forced full verification failed: ' + full.reason);
      e3.code = 'WITNESS_REBUILD_VERIFY_FAILED';
      throw e3;
    }
    return {
      status: 'rebuilt',
      generation: generation,
      last_good_seal: lastGoodSeal,
      prev_generation: prevGen,
      verify: full,
    };
  }

  // ADR-0024 D2a: everything below runs inside ONE narrow lock (ep + '.lock').
  // make(chain, prevHash) receives the materialized concatenated records
  // (anchors included) plus the chain tail hash; it returns records to
  // append ([] = no-op). Lock failure degrades to an unlocked write
  // (best-effort invariant: hooks never block).
  function commit(make, opts) {
    opts = opts || {};
    const boundedAppend = !!opts.boundedAppend;
    if (boundedAppend) {
      _witnessPreCheckBounded(opts.initial || _readBoundedActiveState(), readSealSidecar());
    } else {
      _witnessPreCheck();
    }
    const run = () => {
      if (legacyReadOnly) { note('read-only legacy mode — append dropped'); return; }
      if (!ensureSegmented()) return;
      let existing;
      let total;
      let tail;
      let segs;
      let activePath;
      let boundedState = null;
      if (boundedAppend) {
        boundedState = _readBoundedActiveState();
        if (!boundedState) return;
        existing = boundedState.recs;
        total = boundedState.total;
        tail = boundedState.tail;
        segs = boundedState.segs;
        activePath = boundedState.activePath;
      } else {
        try {
          existing = readConcat();
        } catch (e) {
          note('store corrupt — refusing to write: ' + e.message);
          return;
        }
        total = existing.length;
        tail = existing.length > 0 ? existing[existing.length - 1].event_hash : null;
        try { segs = listSegments(ep); }
        catch (e) { note('segment scan failed — refusing to write: ' + e.message); return; }
        activePath = segs.length > 0 ? segs[segs.length - 1].path : null;
      }

      let made = make(existing, tail) || [];
      let bp = null;
      let postDetectionAppends = 0;
      // ADR-0052 D-C: first append after witness loss prepends the degraded
      // breakpoint record inside the SAME locked write.
      if (!witnessGateBusy && !legacyReadOnly) {
        const scan = boundedAppend
          ? _boundedWitnessScan(boundedState, readSealSidecar())
          : _witnessScan(existing);
        if (scan && !scan.bp) {
          const bpRec = _makeWitnessDegradedRecord(tail, { tail_anchor: scan.tailDown, genesis_anchor: scan.genDown }, now());
          // The caller's first record still points at the old tail; re-link
          // it onto the breakpoint (not yet persisted, re-hash is safe).
          if (made.length > 0 && made[0] && made[0].prev_hash === tail) {
            made[0].prev_hash = bpRec.event_hash;
            made[0].event_hash = recordHash(made[0]);
          }
          made = [bpRec].concat(made);
          if (boundedAppend) bp = { record: bpRec, index: total };
        } else if (boundedAppend && scan && scan.bp) {
          bp = scan.bp;
          postDetectionAppends = scan.postDetectionAppends;
        }
      }
      if (!Array.isArray(made) || made.length === 0) return;

      const seen = _readKeysSidecar();
      (boundedAppend ? boundedState.recs : existing)
        .filter(r => r && r._idem).forEach(r => seen.add(r._idem));

      const relink = {}; // old event_hash -> re-hashed value after a rotation splice
      const applied = [];
      for (const rec of made) {
        if (!rec) continue;
        if (rec._idem && seen.has(rec._idem)) continue; // first-writer-wins
        let tailIsAnchor = typeof tail === 'string' && tail.length > 0;
        // A record chained onto a hash that was relocated by an earlier
        // rotation splice in THIS commit gets re-linked transparently.
        if (tailIsAnchor && typeof rec.prev_hash === 'string' &&
            Object.prototype.hasOwnProperty.call(relink, rec.prev_hash)) {
          rec.prev_hash = relink[rec.prev_hash];
        }
        if (tailIsAnchor && rec.prev_hash !== undefined && rec.prev_hash !== tail) {
          note('skipping record ' + JSON.stringify(rec.gate_id) +
            ' — prev_hash mismatch (expected ' + tail + ', got ' + rec.prev_hash + ')');
          continue;
        }

        // ADR-0026 D2: byte-threshold rotation, evaluated before each write.
        if (activePath && fs.existsSync(activePath)) {
          let size = 0;
          try { size = fs.statSync(activePath).size; } catch (e) {}
          if (size >= rotateBytes && !(opts.skipRotation)) {
            _fsyncFile(activePath);
            const anchor = {
              kind: 'segment_anchor',
              segment_format_version: SEGMENT_VERSION,
              seq_start: total,
              prev_segment_hash: sha256File(activePath),
              prev_segment_count: readSegment(activePath, true).length,
              prev_segment_bytes: size,
              created_at: new Date().toISOString(),
              prev_hash: typeof tail === 'string' ? tail : null,
              event_hash: null,
            };
            // Fail-closed carry-over: a `legacy_migration` marker means the
            // pre-marker chain contains a verified break. Seal that fact on the
            // anchor so verifyTail stays consistent with verifyChain/verifyFull
            // after rotation — otherwise a rotation would silently flip a
            // permanently-broken chain back to valid on the hot path.
            const legacy = boundedAppend
              ? _legacyBreakpointBounded(boundedState.segs, boundedState.recs)
              : existing.find(function (r) { return r && r.kind === 'legacy_migration'; });
            if (legacy) anchor.legacy_breakpoint = { broken_at: legacy.broken_at, reason: legacy.reason || null };
            anchor.event_hash = recordHash(anchor);
            activePath = path.join(ep, segmentName(total));
            fs.writeFileSync(activePath, JSON.stringify(anchor) + '\n', 'utf8');
            tail = anchor.event_hash;
            total += 1;
            applied.push(anchor);
            tailIsAnchor = true;
            // Splice the pending record onto the new segment's anchor so the
            // concatenated chain stays valid across the boundary.
            rec.prev_hash = anchor.event_hash;
            if (Object.prototype.hasOwnProperty.call(rec, 'event_hash')) {
              const oldHash = rec.event_hash;
              rec.event_hash = recordHash(rec);
              if (typeof oldHash === 'string') relink[oldHash] = rec.event_hash;
            }
          }
        }

        if (!activePath) {
          fs.mkdirSync(ep, { recursive: true });
          activePath = path.join(ep, segmentName(total)); // total === 0 on genesis
        }
        fs.appendFileSync(activePath, JSON.stringify(rec) + '\n', 'utf8');
        applied.push(rec);
        if (rec._idem) seen.add(rec._idem);
        tail = rec.event_hash;
        total += 1;
      }
      if (applied.length === 0) return;
      if (activePath) _fsyncFile(activePath);

      if (boundedAppend) {
        if (bp) {
          for (const rec of applied) {
            if (rec && !rec.kind) postDetectionAppends += 1;
          }
        }
        if (_writeBoundedTailAnchor(total, tail, bp, postDetectionAppends)) {
          _updateSealSidecarPostCount(applied.length);
        }
      } else {
        // Full-rewrite sidecar with the union set (bounded by unique turn keys).
        const allKeys = existing.concat(applied).filter(r => r && r._idem).map(r => r._idem);
        fs.writeFileSync(kp, allKeys.join('\n') + '\n', 'utf8');
        _writeTailAnchorForChain(existing.concat(applied));
      }
    };
    try { withLockSync(ep, run, { retries: 40, retrySleepMs: 10 }); }
    catch (e) { try { run(); } catch (e2) { /* sink broken — drop */ } }
  }

  // Chain integrity over a materialized array (unchanged legacy contract).
  function verify(chain) { return verifyChain(chain); }

  function verifyLegacyFile() {
    try {
      const raw = fs.readFileSync(ep, 'utf8').trim();
      if (raw.length === 0) return { valid: false, broken_at: -1, reason: 'legacy evidence file empty' };
      return verifyChain(JSON.parse(raw));
    } catch (e) {
      return { valid: false, broken_at: -1, reason: 'legacy evidence unreadable: ' + e.message };
    }
  }

  // Anchor field checks shared by verifyTail/verifyFull.
  function anchorProblems(anchor, prevSeg, expectedSeq, externalChecks) {
    const problems = [];
    if (!anchor || anchor.kind !== 'segment_anchor') {
      problems.push(_anchorProblem('segment_anchor_missing', 'kind', 'segment_anchor', anchor && anchor.kind));
      if (Array.isArray(externalChecks)) problems.push.apply(problems, externalChecks);
      return problems;
    }
    if (anchor.legacy_breakpoint) {
      problems.push(_anchorProblem('legacy_breakpoint', 'legacy breakpoint', null, 'broken_at ' + anchor.legacy_breakpoint.broken_at));
    }
    let prevBytes = null;
    let prevRecs = null;
    try { prevBytes = fs.statSync(prevSeg.path).size; } catch (e) { problems.push(_anchorProblem(KNOWN_ANCHOR_STATUS.unreadable, 'prev_segment', null, e.message)); }
    if (prevBytes !== null && anchor.prev_segment_bytes !== prevBytes) {
      problems.push(_anchorProblem(KNOWN_ANCHOR_STATUS.bytes_mismatch, 'prev_segment_bytes', anchor.prev_segment_bytes, prevBytes));
    }
    try {
      const actualHash = sha256File(prevSeg.path);
      if (anchor.prev_segment_hash !== actualHash) problems.push(_anchorProblem(KNOWN_ANCHOR_STATUS.hash_mismatch, 'prev_segment_hash', anchor.prev_segment_hash, actualHash));
    } catch (e) { problems.push(_anchorProblem(KNOWN_ANCHOR_STATUS.unreadable, 'prev_segment_hash', null, e.message)); }
    try {
      prevRecs = readSegment(prevSeg.path, false);
      if (anchor.prev_segment_count !== prevRecs.length) {
        problems.push(_anchorProblem(KNOWN_ANCHOR_STATUS.count_mismatch, 'prev_segment_count', anchor.prev_segment_count, prevRecs.length));
      }
    } catch (e) { problems.push(_anchorProblem(KNOWN_ANCHOR_STATUS.unreadable, 'prev_segment_records', null, e.message)); }
    if (expectedSeq !== null && anchor.seq_start !== expectedSeq) {
      problems.push(_anchorProblem('seq_start_mismatch', 'seq_start', expectedSeq, anchor.seq_start));
    }
    if (prevRecs) {
      const prevTail = prevRecs.length > 0 ? prevRecs[prevRecs.length - 1].event_hash : null;
      if (anchor.prev_hash !== prevTail) problems.push(_anchorProblem(KNOWN_ANCHOR_STATUS.hash_mismatch, 'prev_hash', prevTail, anchor.prev_hash));
    }
    if (Array.isArray(externalChecks)) problems.push.apply(problems, externalChecks);
    return problems;
  }
  // ADR-0026 D4 hot path: active segment + previous-segment anchor
  // prechecks (O(active segment) once the previous segment is hashed).
  function verifyTail() {
    const kind = statKind();
    if (kind === 'file') return verifyLegacyFile();
    if (kind === 'none') return { valid: false, broken_at: -1, reason: 'no evidence segments' };
    let segs;
    try { segs = listSegments(ep); }
    catch (e) { return { valid: false, broken_at: -1, reason: 'segment scan failed: ' + e.message }; }
    if (segs.length === 0) return { valid: false, broken_at: -1, reason: 'no evidence segments' };
    const active = segs[segs.length - 1];
    let recs;
    try { recs = readSegment(active.path, true); }
    catch (e) { return { valid: false, broken_at: -1, reason: e.message }; }
    if (recs.length === 0) return { valid: false, broken_at: -1, reason: 'active segment empty' };
    const seal = _sealForHotPath(segs);
    if (segs.length === 1) {
      const chainResult = verifyChain(recs);
      const external = _externalAnchorProblems(_tailStateFromSegments(segs, recs), function () { return seal; });
      const fatal = _fatalAnchorProblems(external);
      if (fatal.length > 0) return { valid: false, broken_at: -1, reason: _formatAnchorProblems(fatal) };
      if (!chainResult.valid) return chainResult;
      const fb = _fallbackMeta(external);
      return Object.assign({}, chainResult, fb || {}, _freshnessMeta(recs, seal));
    }
    const external = _externalAnchorProblems(_tailStateFromSegments(segs, recs), function () { return seal; });
    const problems = anchorProblems(recs[0], segs[segs.length - 2], null, external);
    const seqOnly = problems.filter(function (p) { return p.code === 'seq_start_mismatch'; });
    const others = problems.filter(function (p) { return p.code !== 'seq_start_mismatch'; });
    const fatal = _fatalAnchorProblems(others);
    if (fatal.length > 0) {
      const bp = recs[0] && recs[0].legacy_breakpoint;
      return { valid: false, broken_at: bp ? bp.broken_at : -1, reason: _formatAnchorProblems(fatal) };
    }
    void seqOnly;
    const link = verifyLinks(recs, 0);
    const fb = _fallbackMeta(others);
    return Object.assign({}, link, fb || {}, _freshnessMeta(recs, seal));
  }
  // ADR-0026 D4 cold path: every segment, every cross-link, filename/seq
  // cross-check. Exposed via scripts/verify-evidence.js --full.
  function verifyFull() {
    const kind = statKind();
    if (kind === 'file') return verifyLegacyFile();
    if (kind === 'none') return { valid: false, broken_at: -1, reason: 'no evidence segments' };
    let segs;
    try { segs = listSegments(ep); }
    catch (e) { return { valid: false, broken_at: -1, reason: 'segment scan failed: ' + e.message }; }
    if (segs.length === 0) return { valid: false, broken_at: -1, reason: 'no evidence segments' };
    const all = [];
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      let recs;
      try { recs = readSegment(seg.path, i === segs.length - 1); }
      catch (e) { return { valid: false, broken_at: all.length, reason: e.message }; }
      if (seg.seq !== all.length) {
        return { valid: false, broken_at: all.length, reason: 'segment ' + seg.name + ' seq ' + seg.seq + ' != cumulative record count ' + all.length };
      }
      if (i > 0) {
        const problems = anchorProblems(recs[0], segs[i - 1], seg.seq);
        const fatal = _fatalAnchorProblems(problems);
        if (fatal.length > 0) {
          const bp = recs[0] && recs[0].legacy_breakpoint;
          return { valid: false, broken_at: bp ? bp.broken_at : all.length, reason: _formatAnchorProblems(fatal) };
        }
      }
      for (const r of recs) all.push(r);
    }
    const chain = verifyChain(all);
    if (!chain.valid) return chain;
    const seal = _acceptableSeal(all);
    const external = _externalAnchorProblems(_tailState(all), function () { return seal; });
    const fatal = _fatalAnchorProblems(external);
    if (fatal.length > 0) return { valid: false, broken_at: chain.broken_at === undefined ? -1 : chain.broken_at, reason: _formatAnchorProblems(fatal) };
    const fb = _fallbackMeta(external);
    return Object.assign({}, chain, fb || {}, _freshnessMeta(all, seal));
  }
  function clear() {
    try { fs.rmSync(ep, { recursive: true, force: true }); } catch (e) {}
    try { fs.unlinkSync(kp); } catch (e) {}
    try { fs.unlinkSync(headAnchorPath()); } catch (e) {}
    try { fs.unlinkSync(genesisAnchorPath()); } catch (e) {}
    try { fs.unlinkSync(sealSidecarPath()); } catch (e) {}
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) {}
    // clear() IS the explicit operator action; the D5 "never auto-deleted"
    // rule covers automatic paths only.
    for (let i = 0; i <= 1000; i++) {
      const p = i === 0 ? ep + '.legacy.bak' : ep + '.legacy.bak.' + i;
      if (!fs.existsSync(p)) break;
      try { fs.unlinkSync(p); } catch (e) { break; }
    }
  }

  return { append, commit, readAll, verify, verifyTail, verifyFull, clear, createRecord, sealForwardIfNeeded, headAnchorPath, genesisAnchorPath, anchorConfig: anchorConfig, lastGoodSeal: lastGoodSeal, ConfigLoadError: ConfigLoadError, ANCHOR_CONFIG_FILENAME: ANCHOR_CONFIG_FILENAME, ANCHOR_DEFAULT_REANCHOR_MS: ANCHOR_DEFAULT_REANCHOR_MS, ANCHOR_HARD_FACTOR: ANCHOR_HARD_FACTOR, ANCHOR_FRESHNESS: ANCHOR_FRESHNESS, KNOWN_ANCHOR_STATUS: KNOWN_ANCHOR_STATUS, readTailAnchor: readTailAnchor, writeTailAnchor: writeTailAnchor, readGenesisAnchor: readGenesisAnchor, writeGenesisAnchor: writeGenesisAnchor, persistenceCapability: persistenceCapability, rebuildGenesisAnchor: rebuildGenesisAnchor, WITNESS_RECOVERY: WITNESS_RECOVERY };
}

// createRecord is pure (no fs, no closure state) — module-level per ADR-0016 double-track.
function createRecord(gateId, gateType, status, detail, confidence, prevHash, extras) {
  const record = {
    gate_id: gateId,
    gate_type: gateType,
    status: status,
    evidence_ref: crypto.createHash('sha256').update(detail).digest('hex').slice(0, 16),
    detail: detail,
    confidence: confidence || null,
    threshold: ESCALATION_BAND,
    timestamp: new Date().toISOString(),
    prev_hash: prevHash || null,
  };
  if (extras && typeof extras === 'object') {
    if (extras.detector && typeof extras.detector === 'object') {
      // Keep a stable on-chain tuple { suspicious, matched_phrases, severity,
      // coverage, degradation }; drop family_hits so the shape stays stable
      // across detector upgrades. coverage/degradation per ADR-0022 D4/D5 —
      // the gate needs them for fail-closed coverage routing.
      const d = extras.detector;
      record.detector = {
        suspicious: !!d.suspicious,
        matched_phrases: Array.isArray(d.matched_phrases) ? d.matched_phrases.slice() : [],
        severity: d.severity === 'high' || d.severity === 'low' ? d.severity : null,
      };
      if (d.coverage === 'partial' || d.coverage === 'full') record.detector.coverage = d.coverage;
      if (d.degradation && typeof d.degradation === 'object') {
        const g = d.degradation;
        const known = KNOWN_DEGRADATION_KINDS.indexOf(g.kind) >= 0 ? g.kind : null;
        record.detector.degradation = {
          kind: known,
          detail: g.detail && typeof g.detail === 'object' ? JSON.parse(JSON.stringify(g.detail)) : null,
        };
        // ADR-0023 D4: fail-closed fallback — unknown kind is never silently
        // dropped; the original value is preserved for attribution while
        // coverage = partial (set by producers) still routes the verifier to
        // ESCALATE.
        if (known === null && typeof g.kind === 'string' && g.kind.length > 0) {
          if (!record.detector.degradation.detail) record.detector.degradation.detail = {};
          record.detector.degradation.detail.unrecognized_kind = g.kind;
        }
      }
    }
    if (typeof extras.session_id === 'string' && extras.session_id.length > 0) {
      record.session_id = extras.session_id;
    }
    if (typeof extras.turn_id === 'string' && extras.turn_id.length > 0) {
      record.turn_id = extras.turn_id;
    }
    // ADR-0031 D5: provenance is passed through verbatim (never normalized) so
    // that a malformed underspecified block still fails verifyChain; the writer
    // does not get to launder its own shape errors.
    if (extras.provenance !== undefined) {
      record.provenance = (extras.provenance && typeof extras.provenance === 'object')
        ? JSON.parse(JSON.stringify(extras.provenance))
        : extras.provenance;
    }
  }
  record.event_hash = recordHash(record);
  return record;
}

module.exports = {
  createEvidenceLog, ESCALATION_BAND, idempotencyKey, createRecord,
  canonicalJSON, recordHash, verifyChain, createTurnInit, finalizeTurnInit, provenanceProblems,
  KNOWN_DEGRADATION_KINDS, SEGMENT_BYTES,
  PERSISTENCE_CAPABILITY, PERSISTENCE_DECLARATION_FILENAME,
  probePersistenceCapability, resolvePersistenceCapability,
  fsyncDirectory: _fsyncDirectory,
  WITNESS_RECOVERY, WITNESS_DEGRADED_KIND, WITNESS_RECOVERY_KIND, WITNESS_HARD_STOP_CODE,
};
