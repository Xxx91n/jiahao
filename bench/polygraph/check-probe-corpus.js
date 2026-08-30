#!/usr/bin/env node
// bench/polygraph/check-probe-corpus.js -- ADR-0029 D2 / ADR-0030 D1 acceptance closure.
// Schema-checks the private answer corpus probes.jsonl (ADR-0036 D2) (paired per-iron-law behavioral
// probes). This is a *corpus format* gate, NOT the behavioral gate itself
// (scripts/check-probes.js). Thin CLI + pure core (ADR-0029 D4 shape: jest
// tests the core, never spawns this process).
//
// Discipline (ADR-0029 D2/D3, relaxed by ADR-0030 D1):
//   - every entry carries provenance + collected_at; entries older than
//     6 months at check time are flagged STALE (exit 1) for re-validation
//     (ADR-0025 convention, Eval Smell Catalog).
//   - coverage, not exactly-once (ADR-0030 D1): each iron law (IL1..IL7) must
//     appear AT LEAST once per side (violation-probe / benign-near-miss).
//     Growth keeps ids globally unique; new probes for a covered law carry a
//     variant suffix (e.g. IL3-v2-...) per MISRA amendment numbering - a
//     reclaimed slot is never reused.
//   - structural floor (ADR-0030 D1, R5): the corpus total must stay at or
//     above the probe-coverage gate value in thresholds.json (probe_gates
//     family, source_adr 0030). Shrinking below the floor fails; a missing
//     floor entry is fail-closed.
//
// Anti-tamper note: this gate validates shape only. Expectation vs detector
// behavior is closed by scripts/check-probes.js (exit 0/1 behavioral gate).

'use strict';

const fs = require('fs');
const path = require('path');

const CFG = path.join(__dirname, 'thresholds.json');
const { requireCorpus } = require('../../src/shared/paths');
const ROT_MS = 6 * 30 * 24 * 3600 * 1000; // 6 months, coarse
const KINDS = new Set(['violation-probe', 'benign-near-miss']);
const VERDICTS = new Set(['lie', 'honest']);
const LAW_RE = /^IL([1-7])(?:-v\d+)?-[a-z0-9-]+$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// ---- pure core (jest testable, no fs / no process.exit) ----

// ADR-0030 D1+R5: the structural floor lives in thresholds.json probe_gates
// (source_adr "0030"), never in prose. Fail-closed when absent.
function coverageFloor(cfg) {
  if (!cfg || !Array.isArray(cfg.probe_gates)) return null;
  const g = cfg.probe_gates.find(x => x && x.source_adr === '0030' && x.metric === 'total_count' && x.op === '>=');
  return g && typeof g.value === 'number' ? g.value : null;
}

// Returns problem strings ([] = pass). `now` injectable for deterministic tests.
function checkCorpus(lines, floor, now) {
  const problems = [];
  const t = typeof now === 'number' ? now : Date.now();
  const seen = new Set();
  const perSide = { 'violation-probe': new Set(), 'benign-near-miss': new Set() };
  if (lines.length === 0) problems.push('corpus:empty');
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch (err) { problems.push('invalid JSON line: ' + err.message); continue; }
    const ep = [];
    if (typeof e.schema_version !== 'string') ep.push('schema_version');
    if (typeof e.id !== 'string' || !e.id) ep.push('id');
    else if (seen.has(e.id)) ep.push('id-dup:' + e.id);
    else seen.add(e.id);
    if (!KINDS.has(e.kind)) ep.push('kind');
    if (typeof e.law !== 'string' || !LAW_RE.test(e.law)) ep.push('law');
    // ADR-0030 D1: interval coverage replaces exactly-once. Duplicates are
    // allowed; the pairing loop below still enforces >=1 per law per side.
    else if (perSide[e.kind]) perSide[e.kind].add(e.law.match(LAW_RE)[1]);
    if (e.kind === 'violation-probe' && e.expected_verdict !== 'lie') ep.push('violation-must-expect-lie');
    if (e.kind === 'benign-near-miss' && e.expected_verdict !== 'honest') ep.push('benign-must-expect-honest');
    if (!VERDICTS.has(e.expected_verdict)) ep.push('expected_verdict');
    if (typeof e.provenance !== 'string' || !e.provenance) ep.push('provenance');
    if (typeof e.collected_at !== 'string' || !ISO.test(e.collected_at)) ep.push('collected_at');
    else { const ts = Date.parse(e.collected_at); if (Number.isNaN(ts)) ep.push('collected_at:unparseable'); else if (t - ts > ROT_MS) ep.push('collected_at:STALE(>6mo, re-validate)'); }
    if (typeof e.rationale !== 'string' || !e.rationale) ep.push('rationale');
    if (!Array.isArray(e.events) || e.events.length === 0) ep.push('events');
    if (typeof e.closing !== 'string' || !e.closing) ep.push('closing');
    if (ep.length) problems.push((e && e.id ? e.id : '?') + ': ' + ep.join(', '));
  }
  for (const kind of Object.keys(perSide)) {
    const missing = [];
    for (let n = 1; n <= 7; n++) if (!perSide[kind].has(String(n))) missing.push('IL' + n);
    if (missing.length) problems.push('pairing: ' + kind + ' side misses laws: ' + missing.join(', '));
  }
  if (floor === null) {
    problems.push('coverage floor gate missing from thresholds.json probe_gates (ADR-0030 D1) - fail-closed');
  } else if (lines.length < floor) {
    problems.push('coverage floor: corpus has ' + lines.length + ' entries, below floor ' + floor + ' (ADR-0030 D1)');
  }
  return problems;
}

module.exports = { checkCorpus, coverageFloor, LAW_RE, ROT_MS };

if (require.main === module) {
  const lines = fs.readFileSync(requireCorpus('probes.jsonl'), 'utf8').split('\n').filter(s => s.trim());
  const floor = coverageFloor(JSON.parse(fs.readFileSync(CFG, 'utf8')));
  const problems = checkCorpus(lines, floor);
  const failing = new Set();
  for (const p of problems) { const m = /^(.+?): /.exec(p); if (m) failing.add(m[1]); }
  for (const l of lines) {
    let e = null;
    try { e = JSON.parse(l); } catch (err) {}
    if (e && e.id && !failing.has(e.id)) console.log('PASS ' + e.id + ' (' + e.law + ', expect ' + e.expected_verdict + ')');
  }
  for (const p of problems) console.error('FAIL ' + p);
  if (floor !== null) console.log('[probe-corpus] coverage floor: ' + lines.length + ' >= ' + floor + ' (ADR-0030 D1)');
  process.exit(problems.length ? 1 : 0);
}
