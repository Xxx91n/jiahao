#!/usr/bin/env node
// bench/polygraph/check-probe-corpus.js -- ADR-0029 D2 acceptance closure.
// Schema-checks bench/polygraph/probes.jsonl (paired per-iron-law behavioral
// probes: 7 planted violations + 7 benign near-misses). This is a *corpus
// format* gate, NOT the behavioral gate itself (scripts/check-probes.js).
//
// Discipline (ADR-0029 D2/D3):
//   - every entry carries provenance + collected_at; entries older than
//     6 months at check time are flagged STALE (exit 1) for re-validation
//     (ADR-0025 convention, Eval Smell Catalog).
//   - structural self-consistency: each iron law (IL1..IL7) must appear
//     exactly once per side (violation-probe / benign-near-miss); ids unique.
//
// Anti-tamper note: this gate validates shape only. Expectation vs detector
// behavior is closed by scripts/check-probes.js (exit 0/1 behavioral gate).

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'probes.jsonl');
const ROT_MS = 6 * 30 * 24 * 3600 * 1000; // 6 months, coarse
const KINDS = new Set(['violation-probe', 'benign-near-miss']);
const VERDICTS = new Set(['lie', 'honest']);
const LAW_RE = /^IL([1-7])-[a-z0-9-]+$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(s => s.trim());
if (lines.length === 0) { console.error('FAIL: probes corpus is empty'); process.exit(1); }

let fail = false;
const seen = new Set();
const perSide = { 'violation-probe': new Set(), 'benign-near-miss': new Set() };

for (const line of lines) {
  let e;
  try { e = JSON.parse(line); } catch (err) { console.error('FAIL: invalid JSON line: ' + err.message); fail = true; continue; }
  const problems = [];
  if (typeof e.schema_version !== 'string') problems.push('schema_version');
  if (typeof e.id !== 'string' || !e.id) problems.push('id');
  else if (seen.has(e.id)) problems.push('id-dup:' + e.id);
  else seen.add(e.id);
  if (!KINDS.has(e.kind)) problems.push('kind');
  if (typeof e.law !== 'string' || !LAW_RE.test(e.law)) { problems.push('law'); }
  else if (perSide[e.kind]) {
    const n = e.law.match(LAW_RE)[1];
    if (perSide[e.kind].has(n)) problems.push('law-dup:' + e.law);
    else perSide[e.kind].add(n);
  }
  if (e.kind === 'violation-probe' && e.expected_verdict !== 'lie') problems.push('violation-must-expect-lie');
  if (e.kind === 'benign-near-miss' && e.expected_verdict !== 'honest') problems.push('benign-must-expect-honest');
  if (!VERDICTS.has(e.expected_verdict)) problems.push('expected_verdict');
  if (typeof e.provenance !== 'string' || !e.provenance) problems.push('provenance');
  if (typeof e.collected_at !== 'string' || !ISO.test(e.collected_at)) problems.push('collected_at');
  else if (Date.now() - Date.parse(e.collected_at) > ROT_MS) problems.push('collected_at:STALE(>6mo, re-validate)');
  if (typeof e.rationale !== 'string' || !e.rationale) problems.push('rationale');
  if (!Array.isArray(e.events) || e.events.length === 0) problems.push('events');
  if (typeof e.closing !== 'string' || !e.closing) problems.push('closing');
  if (problems.length > 0) {
    fail = true;
    console.error('FAIL ' + (e && e.id ? e.id : '?') + ': ' + problems.join(', '));
  } else {
    console.log('PASS ' + e.id + ' (' + e.law + ', expect ' + e.expected_verdict + ')');
  }
}

for (const kind of Object.keys(perSide)) {
  const missing = [];
  for (let n = 1; n <= 7; n++) if (!perSide[kind].has(String(n))) missing.push('IL' + n);
  if (missing.length) {
    fail = true;
    console.error('FAIL pairing: ' + kind + ' side misses laws: ' + missing.join(', '));
  }
}

process.exit(fail ? 1 : 0);
