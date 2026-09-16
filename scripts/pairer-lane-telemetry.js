#!/usr/bin/env node
'use strict';
// scripts/pairer-lane-telemetry.js — ADR-0070 D-B: the telemetry surface that
// makes the frozen shadow→enforce promotion gate computable at review time.
// Scans the evidence chain for detector.source === 'pairer-instrument'
// records and reports the four registered inputs:
//   G1  event count (lane records) and the sessions they span
//   G2  flagged count (the owner-review workload; FP verdict is human)
//   G3  undetermined rate (+ per-family breakdown to spot an uptrend)
//   G4  lane latency p50/p99/max in ms (against the <= 1 s frozen bound)
//
// Descriptive only — always exit 0 on a readable chain, exit 1 on a corrupt
// one (the chain is the telemetry authority; a broken chain cannot compute).
//
// Usage: node scripts/pairer-lane-telemetry.js [--json]

const { createEvidenceLog } = require('../src/evidence-log');
const { SOURCE } = require('../src/pairer-lane');

function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function collect(records) {
  const lane = (records || []).filter(function (r) {
    return r && r.detector && r.detector.source === SOURCE;
  });
  const lat = [];
  const sessions = new Set();
  const byFamily = {};
  let flagged = 0, consistent = 0, undetermined = 0, shadow = 0, enforce = 0;
  for (const r of lane) {
    const p = r.detector.pairer || {};
    const st = p.state || r.status;
    if (st === 'flagged') flagged++;
    else if (st === 'consistent') consistent++;
    else undetermined++;
    if (r.detector.shadow === true) shadow++; else enforce++;
    if (typeof r.session_id === 'string') sessions.add(r.session_id);
    if (Number.isFinite(p.latency_ms)) lat.push(p.latency_ms);
    const fam = p.family || '(unrouted)';
    byFamily[fam] = byFamily[fam] || { flagged: 0, consistent: 0, undetermined: 0 };
    byFamily[fam][st === 'flagged' ? 'flagged' : st === 'consistent' ? 'consistent' : 'undetermined']++;
  }
  lat.sort(function (a, b) { return a - b; });
  const n = lane.length;
  return {
    source: SOURCE,
    events: n,
    sessions: sessions.size,
    flagged: flagged,
    consistent: consistent,
    undetermined: undetermined,
    undetermined_rate: n ? undetermined / n : 0,
    mode_counts: { shadow: shadow, enforce: enforce },
    latency_ms: { p50: pct(lat, 50), p99: pct(lat, 99), max: lat.length ? lat[lat.length - 1] : null },
    by_family: byFamily,
    promotion_gate: {
      G1_events_ge_200: n >= 200,
      G3_undetermined_le_0_9: (n ? undetermined / n : 0) <= 0.9,
      G4_p99_le_1s: lat.length ? lat[Math.min(lat.length - 1, Math.ceil(0.99 * lat.length) - 1)] <= 1000 : null,
      G2_flagged_owner_review: 'human review required — FP=0 is not machine-derivable',
    },
  };
}

function main() {
  const log = createEvidenceLog();
  const records = log.readAll() || [];
  const t = collect(records);
  if (process.argv.indexOf('--json') !== -1) { console.log(JSON.stringify(t, null, 2)); return; }
  console.log('[pairer-lane] events=' + t.events + ' sessions=' + t.sessions +
    ' flagged=' + t.flagged + ' consistent=' + t.consistent +
    ' undetermined=' + t.undetermined + ' (rate ' + (t.undetermined_rate * 100).toFixed(1) + '%)' +
    ' mode shadow=' + t.mode_counts.shadow + ' enforce=' + t.mode_counts.enforce);
  console.log('[pairer-lane] latency_ms p50=' + t.latency_ms.p50 + ' p99=' + t.latency_ms.p99 + ' max=' + t.latency_ms.max);
  for (const f of Object.keys(t.by_family)) {
    const b = t.by_family[f];
    console.log('[pairer-lane]   ' + f + ': flagged=' + b.flagged + ' consistent=' + b.consistent + ' undetermined=' + b.undetermined);
  }
  console.log('[pairer-lane] promotion inputs: G1(>=200 events)=' + t.promotion_gate.G1_events_ge_200 +
    ' G3(undet<=90%)=' + t.promotion_gate.G3_undetermined_le_0_9 +
    ' G4(p99<=1s)=' + t.promotion_gate.G4_p99_le_1s + '; G2 stays a human review');
}

if (require.main === module) main();
module.exports = { collect: collect };
