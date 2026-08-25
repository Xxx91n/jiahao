// src/evidence-log.js — EvidenceLog (ADR-0016 D1)
// Deep module hiding canonical JSON, hashing, idempotency sidecar, and chain
// verification behind a factory closure: createEvidenceLog(dir?) ->
// { append, readAll, verify, clear, createRecord }
//
// Ponytail (ADR-0007): hash chain is tamper-evidence, not cryptographic
// anchoring. Upgrade path to Ed25519 + Rekor lives behind cross-host audit
// (ADR-0013), not here.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { evidencePath, evidenceKeysPath } = require('./shared/paths');

// Escalation band stamped onto every record (FutureAGI 0.4-0.7, ADR-0007 research).
// Also used by the ladder in gate.js for the escalation decision.
const ESCALATION_BAND = { low: 0.4, high: 0.7 };

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

// ADR-0013 D3: composite idempotency key SHA256(session|turn|tool_seq).
function idempotencyKey(sessionId, turnId, toolSeq) {
  const raw = String(sessionId || '') + '|' + String(turnId || '') + '|' + String(toolSeq || '');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Chain integrity check without touching fs (same algorithm as factory verify).
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
    expectedPrev = record.event_hash;
  }
  return { valid: true };
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

module.exports = {
  createEvidenceLog, ESCALATION_BAND, idempotencyKey,
  canonicalJSON, recordHash, verifyChain, createTurnInit, finalizeTurnInit,
};

function createEvidenceLog(overrideConfigDir) {
  const ep = overrideConfigDir
    ? path.join(overrideConfigDir, '.jiahao-evidence')
    : evidencePath();
  const kp = overrideConfigDir
    ? path.join(overrideConfigDir, '.jiahao-evidence.keys')
    : evidenceKeysPath();

  // ADR-0012 D1: optional extras ({ detector, session_id, turn_id }) are
  // attached BEFORE hashing so the detector verdict is tamper-evident too.
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
        // Keep only the D1 tuple { suspicious, matched_phrases, severity };
        // drop family_hits so the on-chain shape stays stable across detector
        // upgrades.
        const d = extras.detector;
        record.detector = {
          suspicious: !!d.suspicious,
          matched_phrases: Array.isArray(d.matched_phrases) ? d.matched_phrases.slice() : [],
          severity: d.severity === 'high' || d.severity === 'low' ? d.severity : null,
        };
      }
      if (typeof extras.session_id === 'string' && extras.session_id.length > 0) {
        record.session_id = extras.session_id;
      }
      if (typeof extras.turn_id === 'string' && extras.turn_id.length > 0) {
        record.turn_id = extras.turn_id;
      }
    }
    record.event_hash = recordHash(record);
    return record;
  }

  function readAll() {
    try {
      const raw = fs.readFileSync(ep, 'utf8').trim();
      if (raw.length === 0) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) {
      return null; // no file or invalid JSON = no evidence
    }
  }

  // ADR-0013 D2/D3: append-only cross-turn chain with composite-idempotency
  // dedup. Sidecar .jiahao-evidence.keys stores one key per line so a process
  // restart can rebuild the dedup set without re-hashing the chain.
  // Each new record must already carry the correct prev_hash (chain tail).
  // Idempotency: records carrying `_idem` that already exist are skipped
  // (first-writer-wins); the chain is never rewritten.
  function append(newRecords) {
    if (!Array.isArray(newRecords) || newRecords.length === 0) return;
    let existing = [];
    try {
      const parsed = JSON.parse(fs.readFileSync(ep, 'utf8'));
      if (Array.isArray(parsed)) existing = parsed;
    } catch (e) { /* no file or invalid — empty genesis */ }
    const seen = new Set();
    try {
      fs.readFileSync(kp, 'utf8').split('\n').forEach(k => { if (k.trim()) seen.add(k.trim()); });
    } catch (e) { /* no sidecar yet */ }
    existing.filter(r => r && r._idem).forEach(r => seen.add(r._idem));

    const merged = existing.slice();
    for (const rec of newRecords) {
      if (rec && rec._idem && seen.has(rec._idem)) continue; // idempotent skip
      // ADR-0013 D1: appended records must chain onto the current tail
      // (prev_hash == tail.event_hash). Reject mismatched links here so the
      // on-disk chain is never polluted mid-write.
      const tail = merged.length > 0 ? merged[merged.length - 1] : null;
      const tailHasAnchor = tail && typeof tail.event_hash === 'string' && tail.event_hash.length > 0;
      if (tailHasAnchor && rec && rec.prev_hash !== undefined && rec.prev_hash !== tail.event_hash) {
        try { process.stderr.write(
          'jiahao evidence-log: skipping record ' + JSON.stringify(rec && rec.gate_id) +
          ' — prev_hash mismatch (expected ' + tail.event_hash + ', got ' + rec.prev_hash + ')\n'
        ); } catch (e) {}
        continue;
      }
      if (rec && rec._idem) seen.add(rec._idem);
      merged.push(rec);
    }
    fs.writeFileSync(ep, JSON.stringify(merged), 'utf8');
    // Full-rewrite sidecar with the union set (bounded by unique turn keys).
    const allKeys = merged.filter(r => r && r._idem).map(r => r._idem);
    fs.writeFileSync(kp, allKeys.join('\n') + '\n', 'utf8');
  }

  // Chain integrity check: { valid: true } or { valid, broken_at, reason }
  function verify(chain) { return verifyChain(chain); }

  function clear() {
    try { fs.unlinkSync(ep); } catch (e) { /* gone */ }
    try { fs.unlinkSync(kp); } catch (e) { /* gone */ }
  }

  return { append, readAll, verify, clear, createRecord };
}
