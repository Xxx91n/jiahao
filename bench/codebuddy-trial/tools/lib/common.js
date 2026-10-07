// bench/codebuddy-trial/tools/lib/common.js — grill-t31 D-001/D-002 shared
// primitives for the SCED trial harness. Zero-dependency CommonJS, matching
// repo convention. Nothing in lib/ adjudicates: these are mechanics only.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ingest gate (D-002 v): uniform ISO-8601-UTC. Format drift is an explicit
// reject, never a coerced parse — a timezone-less timestamp is a protocol
// deviation, not a guessable value.
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;
function isIsoUtc(s) { return typeof s === 'string' && ISO_UTC_RE.test(s); }

// Transcript mtime debounce default (ms) — shared by collect/end/capture so
// the "recently-modified = unstable" window is one constant, not three.
const DEFAULT_STABLE_MS = 2000;

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function sha256File(p) { return sha256(fs.readFileSync(p)); }

// Read a JSONL file into [{obj, line_no, line_sha256}] plus the whole-file
// sha256. Line numbers are 1-based — the capture store's back-pointer is
// (file, line_no, line_sha256) per grill-t20/21 pointer convention.
function readJsonl(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const rows = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (text === '' && i === lines.length - 1) continue; // trailing newline
    let obj = null, err = null;
    try { obj = JSON.parse(text); } catch (e) { err = e.message; }
    rows.push({ line_no: i + 1, text, obj, parse_error: err, line_sha256: sha256(text) });
  }
  return { file, file_sha256: sha256(raw), rows };
}

// Capture-row dedup key: sink \x00 file \x00 line_no \x00 line_sha256 — shared
// by collect.js append-dedup and evaluate.js cross-run dedup (audit t31:
// the '\x00' separator used to be hand-typed in three places).
function captureKey(source) {
  if (!source) return null;
  return source.sink + '|\x00|' + source.file + '|\x00|' + source.line_no + '|\x00|' + source.line_sha256;
}

// Manifest/spec files are committed artifacts; writes go through writeFileSync
// (never escape-interpreting shell layers, AGENTS.md authored-artifact rule).
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

// Append one JSONL row and fsync — deviation rows are as-they-occur records
// (Fraser Health convention, D-006); a buffered loss is a coverage hole.
function appendJsonl(file, obj) {
  const fd = fs.openSync(file, 'a');
  try {
    fs.writeSync(fd, JSON.stringify(obj) + '\n');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

// fsync a file's current contents — the `end` verb's flush step (D-002 v):
// the three jsonl sinks are flushed before the manifest seals.
function fsyncFile(file) {
  const fd = fs.openSync(file, 'r+'); // fsync needs a write-capable fd on Windows ('r' -> EPERM)
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

// Minimal --flag value parser: --name value | --name=value | --flag (boolean).
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq >= 0) { out[a.slice(2, eq)] = a.slice(eq + 1); }
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) { out[a.slice(2)] = argv[++i]; }
      else { out[a.slice(2)] = true; }
    } else out._.push(a);
  }
  return out;
}

// Fail-loud exit (ADR-0041): usage errors exit 64; harness/fixture errors use
// a distinct class so a scaffolding break is never read as a subject verdict
// (D-007 iv harness-error class).
function fail(msg, code) {
  process.stderr.write('[codebuddy-trial] ' + msg + '\n');
  process.exit(code === undefined ? 1 : code);
}

function usageExit(msg) { fail('usage: ' + msg, 64); }

module.exports = {
  captureKey,
  DEFAULT_STABLE_MS,
  ISO_UTC_RE, isIsoUtc, sha256, sha256File, readJsonl, writeJson,
  appendJsonl, fsyncFile, parseArgs, fail, usageExit,
};
