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
  function anchorProblems(anchor, prevSeg, expectedSeq) {
    const problems = [];
    if (!anchor || anchor.kind !== 'segment_anchor') {
      problems.push('segment_anchor missing');
      return problems;
    }
    if (anchor.legacy_breakpoint) {
      problems.push('segment carries a migrated legacy break (broken_at ' +
        anchor.legacy_breakpoint.broken_at + ')');
    }
    let prevBytes = null;
    let prevRecs = null;
    try { prevBytes = fs.statSync(prevSeg.path).size; } catch (e) { problems.push('previous segment unreadable: ' + e.message); }
    if (prevBytes !== null && anchor.prev_segment_bytes !== prevBytes) {
      problems.push('prev_segment_bytes mismatch (' + anchor.prev_segment_bytes + ' != ' + prevBytes + ')');
    }
    try {
      if (anchor.prev_segment_hash !== sha256File(prevSeg.path)) problems.push('prev_segment_hash mismatch for ' + prevSeg.name);
    } catch (e) { problems.push('previous segment unhashable: ' + e.message); }
    try {
      prevRecs = readSegment(prevSeg.path, false); // sealed segment: strict
      if (anchor.prev_segment_count !== prevRecs.length) {
        problems.push('prev_segment_count mismatch (' + anchor.prev_segment_count + ' != ' + prevRecs.length + ')');
      }
    } catch (e) { problems.push('previous segment corrupt: ' + e.message); }
    if (anchor.seq_start !== expectedSeq) {
      problems.push('seq_start ' + anchor.seq_start + ' != expected ' + expectedSeq);
    }
    if (prevRecs) {
      const prevTail = prevRecs.length > 0 ? prevRecs[prevRecs.length - 1].event_hash : null;
      if (anchor.prev_hash !== prevTail) problems.push('anchor.prev_hash does not match previous segment tail');
    }
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
    if (segs.length === 1) return verifyChain(recs); // genesis-only: whole chain
    const problems = anchorProblems(recs[0], segs[segs.length - 2], null /* seq_start global check is verifyFull */);
    const seqOnly = problems.filter(p => p.indexOf('seq_start') === 0);
    const others = problems.filter(p => p.indexOf('seq_start') !== 0);
    if (others.length > 0) {
      // A carried legacy_breakpoint points back at the ORIGINAL break index,
      // not at the anchor — the honest fault location (ADR-0026 D5).
      const bp = recs[0] && recs[0].legacy_breakpoint;
      return { valid: false, broken_at: bp ? bp.broken_at : -1, reason: others.join('; ') };
    }
    void seqOnly; // global cumulative check belongs to verifyFull (ADR-0026 D4)
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
      // ADR-0026 D3 cross-check: filename number == cumulative record count.
      if (seg.seq !== all.length) {
        return { valid: false, broken_at: all.length, reason: 'segment ' + seg.name + ' seq ' + seg.seq + ' != cumulative record count ' + all.length };
      }
      if (i > 0) {
        const problems = anchorProblems(recs[0], segs[i - 1], seg.seq);
        if (problems.length > 0) {
          const bp = recs[0] && recs[0].legacy_breakpoint;
          return { valid: false, broken_at: bp ? bp.broken_at : all.length, reason: problems.join('; ') };
        }
      }
      for (const r of recs) all.push(r);
    }
    return verifyChain(all);
  }

  function clear() {
    try { fs.rmSync(ep, { recursive: true, force: true }); } catch (e) {}
    try { fs.unlinkSync(kp); } catch (e) {}
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) {}
    // clear() IS the explicit operator action; the D5 "never auto-deleted"
    // rule covers automatic paths only.
    for (let i = 0; i <= 1000; i++) {
      const p = i === 0 ? ep + '.legacy.bak' : ep + '.legacy.bak.' + i;
      if (!fs.existsSync(p)) break;
      try { fs.unlinkSync(p); } catch (e) { break; }
    }
  }

  return { append, commit, readAll, verify, verifyTail, verifyFull, clear, createRecord };
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
  }
  record.event_hash = recordHash(record);
  return record;
}

module.exports = {
  createEvidenceLog, ESCALATION_BAND, idempotencyKey, createRecord,
  canonicalJSON, recordHash, verifyChain, createTurnInit, finalizeTurnInit,
  KNOWN_DEGRADATION_KINDS, SEGMENT_BYTES,
};
