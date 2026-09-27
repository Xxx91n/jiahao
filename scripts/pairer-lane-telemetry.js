#!/usr/bin/env node
'use strict';
// scripts/pairer-lane-telemetry.js — ADR-0070 D-B: the telemetry surface that
// makes the frozen shadow→enforce promotion gate computable at review time.
// Scans the evidence chain for detector.source === 'pairer-instrument'
// records and reports the registered inputs:
//   G1  ORGANIC event count (ADR-0073 D-B amendment: >= 200 organic Stop
//       events carrying lane records; provenance classes per D-A) and the
//       sessions they span
//   G2  flagged count (the owner-review workload; FP verdict is human,
//       second-line reviewed per ADR-0072 D-D)
//   G3  undetermined rate (+ per-family breakdown to spot an uptrend)
//   G4  lane latency p50/p99/max in ms (against the <= 1 s frozen bound)
//
// ADR-0073 D-A: every lane record carries an analysis-side provenance class
// (organic / automated_harness / synthetic_selfcheck / unclassified),
// assigned by the mechanical rule in classifyProvenance() - set-membership
// for marked self-tests, then the session->project-directory map, then the
// scripted-driver skeleton. Conservative direction: doubt lands outside
// organic. Harness traffic is reported for pipeline health and regression
// comparison only; it never enters G1 or the FP/calibration denominators.
//
// Descriptive only — always exit 0 on a readable chain, exit 1 on a corrupt
// one (the chain is the telemetry authority; a broken chain cannot compute).
//
// Usage: node scripts/pairer-lane-telemetry.js [--json]

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createEvidenceLog } = require('../src/evidence-log');
const { SOURCE } = require('../src/pairer-lane');

// ADR-0073 D-A registered sets. These are explicit enumerations - never name
// patterns. A self-check session joins SELFTEST only by being registered at
// creation time; a harness workspace joins only by ADR amendment.
const PROVENANCE_CLASSES = ['organic', 'automated_harness', 'synthetic_selfcheck', 'unclassified'];
const REGISTERED_SELFTEST_SESSIONS = ['t11-live-regcheck-s2', 't11-live-regcheck-s3'];
const REGISTERED_HARNESS_PROJECT_DIRS = ['D--Aworker-e2e-r66-claude'];
// Headless-driver bookkeeping record types (the scripted e2e rig's skeleton);
// interactive claude-code sessions never write these types.
const SCRIPTED_DRIVER_TYPES = ['queue-operation', 'atis-latch', 'last-prompt'];

function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function defaultProvenanceCtx() {
  return {
    projectsDir: path.join(os.homedir(), '.claude', 'projects'),
    selftestSessions: REGISTERED_SELFTEST_SESSIONS.slice(),
    harnessProjectDirs: REGISTERED_HARNESS_PROJECT_DIRS.slice(),
  };
}

// Resolve session_id -> transcript file via the host session->project-dir
// map (~/.claude/projects/<slug>/<sid>.jsonl). Returns
// {file, projectSlug} or null (ADR-0073 D-A step 2).
function resolveTranscript(sessionId, projectsDir) {
  let dirs;
  try { dirs = fs.readdirSync(projectsDir); } catch (e) { return null; }
  for (const d of dirs) {
    const p = path.join(projectsDir, d, sessionId + '.jsonl');
    if (fs.existsSync(p)) return { file: p, projectSlug: d };
  }
  return null;
}

// Scripted-driver skeleton: any headless bookkeeping record type marks the
// session as rig-driven (ADR-0073 D-A step 3b).
function transcriptHasScriptedDriverShape(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return false; }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch (e) { continue; }
    if (o && SCRIPTED_DRIVER_TYPES.indexOf(o.type) !== -1) return true;
  }
  return false;
}

// ADR-0073 D-A mechanical rule, in the registered order:
//   self-test set -> synthetic_selfcheck; unresolved transcript ->
//   unclassified; harness dir or scripted-driver skeleton ->
//   automated_harness; otherwise organic.
function classifyProvenance(record, ctx) {
  const sid = record && record.session_id;
  if (typeof sid !== 'string' || !sid) {
    return { cls: 'unclassified', reason: 'no session_id' };
  }
  if (ctx.selftestSessions.indexOf(sid) !== -1) {
    return { cls: 'synthetic_selfcheck', reason: 'registered marked self-test session' };
  }
  const hit = resolveTranscript(sid, ctx.projectsDir);
  if (!hit) {
    return { cls: 'unclassified', reason: 'no transcript under ' + ctx.projectsDir };
  }
  if (ctx.harnessProjectDirs.indexOf(hit.projectSlug) !== -1) {
    return { cls: 'automated_harness', reason: 'project dir ' + hit.projectSlug + ' is a registered harness workspace' };
  }
  if (transcriptHasScriptedDriverShape(hit.file)) {
    return { cls: 'automated_harness', reason: 'scripted-driver skeleton in transcript' };
  }
  return { cls: 'organic', reason: 'interactive session in ' + hit.projectSlug };
}

function collect(records, opts) {
  const o = opts || {};
  const ctx = o.provenanceCtx === undefined ? null : o.provenanceCtx;
  const lane = (records || []).filter(function (r) {
    return r && r.detector && r.detector.source === SOURCE;
  });
  const lat = [];
  const sessions = new Set();
  let firstTs = null, lastTs = null;
  const byFamily = {};
  let flagged = 0, consistent = 0, undetermined = 0, shadow = 0, enforce = 0;
  const provCounts = { organic: 0, automated_harness: 0, synthetic_selfcheck: 0, unclassified: 0 };
  const provFlagged = { organic: 0, automated_harness: 0, synthetic_selfcheck: 0, unclassified: 0 };
  const provDetail = [];
  for (const r of lane) {
    const p = r.detector.pairer || {};
    const st = p.state || r.status;
    const bucket = st === 'flagged' ? 'flagged' : st === 'consistent' ? 'consistent' : 'undetermined';
    if (bucket === 'flagged') flagged++;
    else if (bucket === 'consistent') consistent++;
    else undetermined++;
    if (r.detector.shadow === true) shadow++; else enforce++;
    if (typeof r.session_id === 'string') sessions.add(r.session_id);
    if (Number.isFinite(p.latency_ms)) lat.push(p.latency_ms);
    const ts = Date.parse(r.timestamp || '');
    if (!isNaN(ts)) {
      if (firstTs === null || ts < firstTs) firstTs = ts;
      if (lastTs === null || ts > lastTs) lastTs = ts;
    }
    const fam = p.family || '(unrouted)';
    byFamily[fam] = byFamily[fam] || { flagged: 0, consistent: 0, undetermined: 0 };
    byFamily[fam][bucket]++;
    if (ctx) {
      const c = classifyProvenance(r, ctx);
      provCounts[c.cls]++;
      if (bucket === 'flagged') provFlagged[c.cls]++;
      provDetail.push({ session_id: r.session_id || null, state: bucket, family: p.family || null, provenance: c.cls, reason: c.reason });
    }
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
    provenance: ctx === null ? null : {
      counts: provCounts,
      flagged_by_class: provFlagged,
      classes: PROVENANCE_CLASSES.slice(),
      detail: provDetail,
    },
    first_ts: firstTs === null ? null : new Date(firstTs).toISOString(),
    last_ts: lastTs === null ? null : new Date(lastTs).toISOString(),
    span_days: firstTs === null ? null : Math.round(((lastTs - firstTs) / 86400000) * 1000) / 1000,
    promotion_gate: {
      // ADR-0073 D-B: the G1 leg counts the organic class only; null when
      // provenance was not computed (honest unverifiable, never an inflated count).
      G1_organic_ge_200: ctx === null ? null : provCounts.organic >= 200,
      G1_organic_count: ctx === null ? null : provCounts.organic,
      G1_events_total: n,
      G3_undetermined_le_0_9: (n ? undetermined / n : 0) <= 0.9,
      G4_p99_le_1s: lat.length ? pct(lat, 99) <= 1000 : null,
      G2_flagged_owner_review: 'human review required — FP=0 is not machine-derivable',
    },
  };
}

function main() {
  const log = createEvidenceLog();
  const records = log.readAll() || [];
  const t = collect(records, { provenanceCtx: defaultProvenanceCtx() });
  if (process.argv.indexOf('--json') !== -1) { console.log(JSON.stringify(t, null, 2)); return; }
  console.log('[pairer-lane] events=' + t.events + ' sessions=' + t.sessions +
    ' flagged=' + t.flagged + ' consistent=' + t.consistent +
    ' undetermined=' + t.undetermined + ' (rate ' + (t.undetermined_rate * 100).toFixed(1) + '%)' +
    ' mode shadow=' + t.mode_counts.shadow + ' enforce=' + t.mode_counts.enforce);
  if (t.provenance) {
    const c = t.provenance.counts, f = t.provenance.flagged_by_class;
    console.log('[pairer-lane] provenance: organic=' + c.organic +
      ' automated_harness=' + c.automated_harness +
      ' synthetic_selfcheck=' + c.synthetic_selfcheck +
      ' unclassified=' + c.unclassified);
    console.log('[pairer-lane] flagged by provenance: organic=' + f.organic +
      ' automated_harness=' + f.automated_harness +
      ' synthetic_selfcheck=' + f.synthetic_selfcheck +
      ' unclassified=' + f.unclassified);
  }
  console.log('[pairer-lane] window: first=' + (t.first_ts || 'none') + ' last=' + (t.last_ts || 'none') + ' span_days=' + (t.span_days === null ? 'n/a' : t.span_days) + ' (G1 usage-cycle leg: owner-judged, not machine-pinned)');
  console.log('[pairer-lane] latency_ms p50=' + t.latency_ms.p50 + ' p99=' + t.latency_ms.p99 + ' max=' + t.latency_ms.max);
  for (const f of Object.keys(t.by_family)) {
    const b = t.by_family[f];
    console.log('[pairer-lane]   ' + f + ': flagged=' + b.flagged + ' consistent=' + b.consistent + ' undetermined=' + b.undetermined);
  }
  console.log('[pairer-lane] promotion inputs: G1(>=200 organic)=' + t.promotion_gate.G1_organic_ge_200 +
    ' (organic=' + t.promotion_gate.G1_organic_count + ')' +
    ' G3(undet<=90%)=' + t.promotion_gate.G3_undetermined_le_0_9 +
    ' G4(p99<=1s)=' + t.promotion_gate.G4_p99_le_1s + '; G2 stays a human review');
}

if (require.main === module) main();
module.exports = {
  collect: collect,
  classifyProvenance: classifyProvenance,
  resolveTranscript: resolveTranscript,
  transcriptHasScriptedDriverShape: transcriptHasScriptedDriverShape,
  defaultProvenanceCtx: defaultProvenanceCtx,
  PROVENANCE_CLASSES: PROVENANCE_CLASSES,
  REGISTERED_SELFTEST_SESSIONS: REGISTERED_SELFTEST_SESSIONS,
  REGISTERED_HARNESS_PROJECT_DIRS: REGISTERED_HARNESS_PROJECT_DIRS,
  SCRIPTED_DRIVER_TYPES: SCRIPTED_DRIVER_TYPES,
};
