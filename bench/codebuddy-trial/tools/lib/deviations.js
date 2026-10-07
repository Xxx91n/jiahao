// bench/codebuddy-trial/tools/lib/deviations.js — two-layer deviation
// ledger (D-006 ii/iii). Tier-2: runs/deviations.jsonl is the append-only
// ledger {seq, run_id, timestamp, type, description, discovered_by,
// severity}. Tier-3: judgment-lines.json deviations[] is the sole append
// slot on the registration body; collect folds new jsonl rows in
// idempotently via a recorded seq cursor (the F-6 append-but-unsummarized
// window is what selfcheck asserts closed).
'use strict';
const fs = require('fs');
const path = require('path');
const { sha256, readJsonl, appendJsonl, writeJson, isIsoUtc } = require('./common');


const SEVERITIES = ['info', 'low', 'medium', 'high'];

function readLedger(T, file) {
  const f = file || T.DEVIATIONS_JSONL;
  if (!fs.existsSync(f)) return { rows: [], maxSeq: 0, file_sha256: null };
  const parsed = readJsonl(f);
  const rows = [];
  for (const r of parsed.rows) {
    if (r.parse_error) { rows.push({ seq: -1, parse_error: r.parse_error, line_no: r.line_no }); continue; }
    rows.push(r.obj);
  }
  const maxSeq = rows.reduce((m, r) => (typeof r.seq === 'number' && r.seq > m ? r.seq : m), 0);
  return { rows, maxSeq, file_sha256: parsed.file_sha256 };
}

function append(T, entry) {
  const file = T.DEVIATIONS_JSONL;
  const cur = readLedger(T, file);
  const row = {
    seq: cur.maxSeq + 1,
    run_id: entry.run_id || null,
    timestamp: entry.timestamp || new Date().toISOString(),
    type: entry.type,
    description: entry.description,
    discovered_by: entry.discovered_by || 'harness',
    severity: SEVERITIES.indexOf(entry.severity) >= 0 ? entry.severity : 'medium',
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  appendJsonl(file, row);
  return row;
}

function readCursor(T, file) {
  const f = file || T.DEVIATIONS_CURSOR;
  if (!fs.existsSync(f)) return { last_seq: 0, updated_at: null, rows_aggregated: 0 };
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

// Idempotent fold: every jsonl row with seq > cursor lands in
// judgment-lines.json deviations[] with source_run_id + seq back-pointers,
// then the cursor records the covered position.
function aggregate(T, at) {
  const ledgerFile = T.DEVIATIONS_JSONL;
  const ledger = readLedger(T, ledgerFile);
  const cursor = readCursor(T);
  const jl = JSON.parse(fs.readFileSync(T.JUDGMENT_LINES, 'utf8'));
  if (!Array.isArray(jl.deviations)) jl.deviations = [];
  const fresh = ledger.rows.filter((r) => typeof r.seq === 'number' && r.seq > cursor.last_seq && !r.parse_error);
  if (fresh.length === 0) {
    // Idempotent no-op: never touch the frozen surface (or the cursor) when
    // there is nothing to fold — a rewrite would drift frozen-sha256 pins
    // and falsify the append-only story.
    return { aggregated: 0, cursor };
  }
  for (const r of fresh) {
    jl.deviations.push({
      seq: r.seq,
      source_run_id: r.run_id,
      timestamp: r.timestamp,
      type: r.type,
      description: r.description,
      discovered_by: r.discovered_by,
      severity: r.severity,
    });
  }
  const newCursor = {
    last_seq: ledger.maxSeq,
    updated_at: at || new Date().toISOString(),
    rows_aggregated: cursor.rows_aggregated + fresh.length,
    ledger_sha256: ledger.file_sha256,
  };
  fs.writeFileSync(T.JUDGMENT_LINES, JSON.stringify(jl, null, 2) + '\n', 'utf8');
  writeJson(T.DEVIATIONS_CURSOR, newCursor);
  return { aggregated: fresh.length, cursor: newCursor };
}

// selfcheck leg: cursor == jsonl coverage, and every deviations[] entry can
// trace back to a jsonl row (seq back-pointer integrity).
function checkCursor(T) {
  const ledger = readLedger(T);
  const cursor = readCursor(T);
  const jl = JSON.parse(fs.readFileSync(T.JUDGMENT_LINES, 'utf8'));
  const errs = [];
  if (cursor.last_seq !== ledger.maxSeq) {
    errs.push('cursor gap: deviations.jsonl max seq ' + ledger.maxSeq + ' but cursor at ' + cursor.last_seq + ' (appended-but-unsummarized, F-6 class)');
  }
  const devSeqs = (jl.deviations || []).map((d) => d.seq).sort((a, b) => a - b);
  for (let i = 0; i < devSeqs.length; i++) {
    const expected = i + 1;
    if (devSeqs[i] !== expected) { errs.push('deviations[] seq hole/dup at position ' + i + ': got ' + devSeqs[i] + ' expected ' + expected); break; }
  }
  const bySeq = new Map(ledger.rows.filter((r) => typeof r.seq === 'number').map((r) => [r.seq, r]));
  for (const d of jl.deviations || []) {
    const src = bySeq.get(d.seq);
    if (!src) { errs.push('deviations[] seq ' + d.seq + ' has no jsonl source row'); continue; }
    if (src.type !== d.type || (src.run_id || null) !== (d.source_run_id || null)) {
      errs.push('deviations[] seq ' + d.seq + ' diverges from jsonl source row');
    }
  }
  return { errs, cursor, ledgerMax: ledger.maxSeq, registered: (jl.deviations || []).length };
}

module.exports = { SEVERITIES, readLedger, append, readCursor, aggregate, checkCursor };
