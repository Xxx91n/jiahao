#!/usr/bin/env node
// bench/polygraph/check-judge-corpus.js -- ADR-0025 D3 acceptance closure.
// Schema-checks the private judge-twins.jsonl corpus (ADR-0036 D2) (honest-twin judge hard
// cases). This is a *corpus format* gate, NOT a runtime-detection path:
// the entries are pre-registered inputs for a future scoring-mode judge
// (ADR-0019 D4 forbids a runtime judge this round).
//
// Maintenance discipline (ADR-0025 D3): every entry must carry provenance
// and collected_at; entries older than 6 months at check time are flagged
// STALE (exit 1) for re-validation -- eval-rot rule (Eval Smell Catalog).

const fs = require('fs');
const path = require('path');

const { requireCorpus } = require('../../src/shared/paths');
const FILE = requireCorpus('judge-twins.jsonl');
const ROT_MS = 6 * 30 * 24 * 3600 * 1000; // 6 months, coarse
const KINDS = new Set(['honest-twin', 'style-control', 'length-control', 'bias-probe']);
// ADR-0031 D2 (schema v1.1): the three bias kinds are pair-based.
//   style-control:  pair_role in {markdown, plain}; pair members share pair_id.
//   length-control: length_control in {expansion, truncation};
//                   pair_role in {base, expanded} (expansion) or {base, truncated} (truncation).
//   bias-probe:     pair_role in {correct, appealing}.
const PAIR_KINDS = new Set(['style-control', 'length-control', 'bias-probe']);
const EXPECTED_JUDGE = new Set(['override', 'uphold']);
const EXPECTED_HEURISTIC = new Set(['suspicious', 'honest']);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(s => s.trim());
if (lines.length === 0) { console.error('FAIL: corpus is empty'); process.exit(1); }

let fail = false;
const seen = new Set();
for (const line of lines) {
  let e;
  try { e = JSON.parse(line); } catch (err) { console.error('FAIL: invalid JSON line: ' + err.message); fail = true; continue; }
  const problems = [];
  if (typeof e.schema_version !== 'string') problems.push('schema_version');
  if (typeof e.id !== 'string' || !e.id) problems.push('id');
  else if (seen.has(e.id)) problems.push('id-dup:' + e.id);
  else seen.add(e.id);
  if (!KINDS.has(e.kind)) problems.push('kind');
  if (e.schema_version !== '1.0' && e.schema_version !== '1.1') problems.push('schema_version:not-1.x');
  if (PAIR_KINDS.has(e.kind)) {
    if (typeof e.pair_id !== 'string' || !e.pair_id) problems.push('pair_id');
    if (typeof e.pair_role !== 'string' || !e.pair_role) problems.push('pair_role');
    if (e.kind === 'length-control' && e.length_control !== 'expansion' && e.length_control !== 'truncation') problems.push('length_control');
  }
  if (typeof e.provenance !== 'string' || !e.provenance) problems.push('provenance');
  if (typeof e.collected_at !== 'string' || !ISO.test(e.collected_at)) problems.push('collected_at');
  else if (Date.now() - Date.parse(e.collected_at) > ROT_MS) problems.push('collected_at:STALE(>6mo, re-validate)');
  if (!EXPECTED_HEURISTIC.has(e.expected_heuristic)) problems.push('expected_heuristic');
  if (!EXPECTED_JUDGE.has(e.expected_judge)) problems.push('expected_judge');
  if (typeof e.target_signal !== 'string' || !e.target_signal) problems.push('target_signal');
  if (typeof e.rationale !== 'string' || !e.rationale) problems.push('rationale');
  if (!Array.isArray(e.events) || e.events.length === 0) problems.push('events');
  if (typeof e.closing !== 'string' || !e.closing) problems.push('closing');
  if (problems.length > 0) {
    fail = true;
    console.error('FAIL ' + (e && e.id ? e.id : '?') + ': ' + problems.join(', '));
  } else {
    console.log('PASS ' + e.id + ' (' + e.target_signal + ', expect judge=' + e.expected_judge + ')');
  }
}
// pair closure: roles within a pair must be distinct; each pair names >=2 entries.
const byPair = new Map();
for (const line of lines) {
  let e; try { e = JSON.parse(line); } catch (err) { continue; }
  if (!PAIR_KINDS.has(e.kind) || !e.pair_id) continue;
  if (!byPair.has(e.pair_id)) byPair.set(e.pair_id, []);
  byPair.get(e.pair_id).push(e.pair_role);
}
for (const [pid, roles] of byPair) {
  if (roles.length < 2) { console.error('FAIL ' + pid + ': pair has fewer than 2 members'); fail = true; continue; }
  if (new Set(roles).size !== roles.length) { console.error('FAIL ' + pid + ': duplicate pair_role ' + roles.join(',')); fail = true; }
}
process.exit(fail ? 1 : 0);
