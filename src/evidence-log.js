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

const HEAD_ANCHOR_VERSION = 1;
const GENESIS_ANCHOR_VERSION = 1;
const FORWARD_SEAL_KIND = 'forward_seal';
const TAIL_ANCHOR_FILENAME = 'evidence-head.json';
const GENESIS_ANCHOR_FILENAME = 'evidence-genesis.json';
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
});
function _hashAnchorTriple(latestSeq, totalCount, headHash) {
  return crypto.createHash('sha256').update(String(latestSeq) + '|' + String(totalCount) + '|' + String(headHash)).digest('hex');
}
function _hashGenesis(firstHash) {
  return crypto.createHash('sha256').update(String(firstHash)).digest('hex');
}
function _writeAnchorAtomic(file, obj) {
  const tmp = file + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(obj) + String.fromCharCode(10), 'utf8');
  const fd = fs.openSync(tmp, 'a');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { fs.renameSync(tmp, file); } catch (e) { try { fs.unlinkSync(tmp); } catch (e2) {} throw e; }
}
function readTailAnchor(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) {
    if (e && e.code === 'ENOENT') return { status: KNOWN_ANCHOR_STATUS.never_anchored, anchor: null };
    return { status: KNOWN_ANCHOR_STATUS.unreadable, anchor: null };
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
  } catch (e) { return { status: KNOWN_ANCHOR_STATUS.unreadable, anchor: null }; }
}
function writeTailAnchor(file, latestSeq, totalCount, headHash) {
  const checksum = _hashAnchorTriple(latestSeq, totalCount, headHash);
  _writeAnchorAtomic(file, {
    version: HEAD_ANCHOR_VERSION,
    latest_seq: latestSeq,
    total_count: totalCount,
    head_hash: headHash,
    checksum: checksum,
    updated_at: new Date().toISOString(),
  });
}
function readGenesisAnchor(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) {
    if (e && e.code === 'ENOENT') return { status: KNOWN_ANCHOR_STATUS.never_anchored, anchor: null };
    return { status: KNOWN_ANCHOR_STATUS.unreadable, anchor: null };
  }
  try {
    const anchor = JSON.parse(raw);
    const checksum = _hashGenesis(anchor.first_hash);
    if (!anchor || anchor.version !== GENESIS_ANCHOR_VERSION ||
        typeof anchor.first_hash !== 'string' || anchor.checksum !== checksum) {
      return { status: KNOWN_ANCHOR_STATUS.unreadable, anchor: null };
    }
    return { status: KNOWN_ANCHOR_STATUS.anchored, anchor: anchor };
  } catch (e) { return { status: KNOWN_ANCHOR_STATUS.unreadable, anchor: null }; }
}
function writeGenesisAnchor(file, firstHash) {
  const checksum = _hashGenesis(firstHash);
  _writeAnchorAtomic(file, {
    version: GENESIS_ANCHOR_VERSION,
    first_hash: firstHash,
    checksum: checksum,
    updated_at: new Date().toISOString(),
  });
}
function _hasForwardSeal(records) {
  return Array.isArray(records) && records.some(function (r) { return r && r.kind === FORWARD_SEAL_KIND; });
}
function _makeForwardSealRecord(sealed) {
  const rec = {
    kind: FORWARD_SEAL_KIND,
    sealed_head_hash: sealed.sealed_head_hash,
    sealed_seq: sealed.sealed_seq,
    sealed_total_count: sealed.sealed_total_count,
    timestamp: new Date().toISOString(),
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
  const ep = overrideConfigDir
    ? path.join(overrideConfigDir, '.jiahao-evidence')
    : evidencePath();
  const kp = overrideConfigDir
    ? path.join(overrideConfigDir, '.jiahao-evidence.keys')
    : evidenceKeysPath();
  const stagingDir = ep + '.migrating';
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

  function _externalAnchorProblems(state) {
    const out = [];
    const tailRead = readTailAnchor(headAnchorPath());
    const genRead = readGenesisAnchor(genesisAnchorPath());
    const tailAnchored = tailRead.status === KNOWN_ANCHOR_STATUS.anchored;
    const genAnchored = genRead.status === KNOWN_ANCHOR_STATUS.anchored;

    if (tailRead.status === KNOWN_ANCHOR_STATUS.unreadable) {
      out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.unreadable, 'tail_anchor', null, tailRead.status));
    } else if (tailRead.status === KNOWN_ANCHOR_STATUS.never_anchored) {
      if (genAnchored) out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.expected_missing, 'tail_anchor', null, 'missing'));
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

    if (genRead.status === KNOWN_ANCHOR_STATUS.unreadable) {
      out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.unreadable, 'genesis_anchor', null, genRead.status));
    } else if (genRead.status === KNOWN_ANCHOR_STATUS.never_anchored) {
      if (tailAnchored) out.push(_anchorProblem(KNOWN_ANCHOR_STATUS.expected_missing, 'genesis_anchor', null, 'missing'));
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
      return s;
    }).join('; ');
  }

  function _fatalAnchorProblems(problems) {
    return problems.filter(function (p) {
      return p.code !== KNOWN_ANCHOR_STATUS.never_anchored && p.code !== KNOWN_ANCHOR_STATUS.anchor_behind;
    });
  }

  function _writeTailAnchorForChain(records) {
    const state = _tailState(records);
    if (!state || state.head_hash === null) return;
    const genRead = readGenesisAnchor(genesisAnchorPath());
    if (_hasForwardSeal(records) || genRead.status === KNOWN_ANCHOR_STATUS.anchored) {
      writeTailAnchor(headAnchorPath(), state.latest_seq, state.total_count, state.head_hash);
    }
  }

  function sealForwardIfNeeded() {
    if (!ensureSegmented()) return { status: 'corrupt', reason: 'could not ensure segmented layout' };
    let existing;
    try { existing = readConcat(); }
    catch (e) { return { status: 'corrupt', reason: e.message }; }
    if (existing.length === 0) return { status: 'empty' };
    const wasSealed = _hasForwardSeal(existing);
    if (!wasSealed) {
      const head = existing[existing.length - 1];
      const headHash = head && typeof head.event_hash === 'string' ? head.event_hash : null;
      if (headHash === null) return { status: 'corrupt', reason: 'chain tail has no event_hash' };
      const rec = _makeForwardSealRecord({
        sealed_head_hash: headHash,
        sealed_seq: existing.length - 1,
        sealed_total_count: existing.length,
      });
      commit(function () { return [rec]; });
      try { existing = readConcat(); }
      catch (e) { return { status: 'corrupt', reason: e.message }; }
      if (!_hasForwardSeal(existing)) return { status: 'corrupt', reason: 'forward seal append did not persist' };
    }
    const first = existing[0];
    const firstHash = first && typeof first.event_hash === 'string' ? first.event_hash : null;
    if (firstHash === null) return { status: 'corrupt', reason: 'chain first record has no event_hash' };
    writeGenesisAnchor(genesisAnchorPath(), firstHash);
    _writeTailAnchorForChain(existing);
    const state = _tailState(existing);
    return {
      status: wasSealed ? 'already_sealed' : 'first_seal',
      sealed_total_count: state ? state.total_count : existing.length,
      sealed_seq: state ? state.latest_seq : existing.length - 1,
      sealed_head_hash: state ? state.head_hash : null,
    };
  }

  function append(newRecords) { commit(() => newRecords); }

  // ADR-0024 D2a: everything below runs inside ONE narrow lock (ep + '.lock').
  // make(chain, prevHash) receives the materialized concatenated records
  // (anchors included) plus the chain tail hash; it returns records to
  // append ([] = no-op). Lock failure degrades to an unlocked write
  // (best-effort invariant: hooks never block).
  function commit(make) {
    const run = () => {
      if (legacyReadOnly) { note('read-only legacy mode — append dropped'); return; }
      if (!ensureSegmented()) return;
      let existing;
      try {
        existing = readConcat();
      } catch (e) {
        note('store corrupt — refusing to write: ' + e.message);
        return;
      }
      let tail = existing.length > 0 ? existing[existing.length - 1].event_hash : null;
      const made = make(existing, tail) || [];
      if (!Array.isArray(made) || made.length === 0) return;

      const seen = new Set();
      try {
        fs.readFileSync(kp, 'utf8').split('\n').forEach(k => { if (k.trim()) seen.add(k.trim()); });
      } catch (e) { /* no sidecar yet */ }
      existing.filter(r => r && r._idem).forEach(r => seen.add(r._idem));

      let total = existing.length; // global record count -> next seq_start
      let segs;
      try { segs = listSegments(ep); }
      catch (e) { note('segment scan failed — refusing to write: ' + e.message); return; }
      let activePath = segs.length > 0 ? segs[segs.length - 1].path : null;
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
          if (size >= rotateBytes) {
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
            const bp = existing.find(function (r) { return r && r.kind === 'legacy_migration'; });
            if (bp) anchor.legacy_breakpoint = { broken_at: bp.broken_at, reason: bp.reason || null };
            anchor.event_hash = recordHash(anchor);
            activePath = path.join(ep, segmentName(total));
            fs.writeFileSync(activePath, JSON.stringify(anchor) + '\n', 'utf8');
            tail = anchor.event_hash;
            total += 1;
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
      // Full-rewrite sidecar with the union set (bounded by unique turn keys).
      const allKeys = existing.concat(applied).filter(r => r && r._idem).map(r => r._idem);
      fs.writeFileSync(kp, allKeys.join('\n') + '\n', 'utf8');
      _writeTailAnchorForChain(existing.concat(applied));
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
    if (segs.length === 1) {
      const chainResult = verifyChain(recs);
      const fatal = _fatalAnchorProblems(_externalAnchorProblems(_tailStateFromSegments(segs, recs)));
      if (fatal.length > 0) return { valid: false, broken_at: -1, reason: _formatAnchorProblems(fatal) };
      return chainResult;
    }
    const problems = anchorProblems(recs[0], segs[segs.length - 2], null, _externalAnchorProblems(_tailStateFromSegments(segs, recs)));
    const seqOnly = problems.filter(function (p) { return p.code === 'seq_start_mismatch'; });
    const others = problems.filter(function (p) { return p.code !== 'seq_start_mismatch'; });
    const fatal = _fatalAnchorProblems(others);
    if (fatal.length > 0) {
      const bp = recs[0] && recs[0].legacy_breakpoint;
      return { valid: false, broken_at: bp ? bp.broken_at : -1, reason: _formatAnchorProblems(fatal) };
    }
    void seqOnly;
    return verifyLinks(recs, 0);
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
    const fatal = _fatalAnchorProblems(_externalAnchorProblems(_tailState(all)));
    if (fatal.length > 0) return { valid: false, broken_at: chain.broken_at === undefined ? -1 : chain.broken_at, reason: _formatAnchorProblems(fatal) };
    return chain;
  }
  function clear() {
    try { fs.rmSync(ep, { recursive: true, force: true }); } catch (e) {}
    try { fs.unlinkSync(kp); } catch (e) {}
    try { fs.unlinkSync(headAnchorPath()); } catch (e) {}
    try { fs.unlinkSync(genesisAnchorPath()); } catch (e) {}
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) {}
    // clear() IS the explicit operator action; the D5 "never auto-deleted"
    // rule covers automatic paths only.
    for (let i = 0; i <= 1000; i++) {
      const p = i === 0 ? ep + '.legacy.bak' : ep + '.legacy.bak.' + i;
      if (!fs.existsSync(p)) break;
      try { fs.unlinkSync(p); } catch (e) { break; }
    }
  }

  return { append, commit, readAll, verify, verifyTail, verifyFull, clear, createRecord, sealForwardIfNeeded, headAnchorPath, genesisAnchorPath, KNOWN_ANCHOR_STATUS: KNOWN_ANCHOR_STATUS, readTailAnchor: readTailAnchor, writeTailAnchor: writeTailAnchor, readGenesisAnchor: readGenesisAnchor, writeGenesisAnchor: writeGenesisAnchor };
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
};
