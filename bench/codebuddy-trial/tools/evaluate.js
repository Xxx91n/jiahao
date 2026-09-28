#!/usr/bin/env node
// bench/codebuddy-trial/tools/evaluate.js — D-002/D-003: read-only judgment
// evaluation. Computes the read-time membership join; refuses all judgment
// lines on orphan captures (unowned or double-owned sessions, or dangling
// spans_boundary marks). Runs JL-1..JL-5 pure functions + the item-0 self-
// check cases, prints verdicts + classification tables, writes NOTHING.
// Reducing indeterminate to an effect verdict is an owner-side act — this
// tool never performs it.
//
// Usage: node evaluate.js [--trial-root <dir>] [--repo <dir>]
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, fail, usageExit, sha256File, readJsonl } = require('./lib/common');
const M = require('./lib/manifest');
const paths = require('./lib/paths');
const CL = require('./lib/claims');
const E = require('./lib/predicates');

const args = parseArgs(process.argv.slice(2));
const T = paths.resolve(args['trial-root']);
const repo = args.repo ? path.resolve(args.repo) : T.REPO;

// Instrument-integrity gate: the frozen detector pin is the oracle — a
// drifted blob voids comparability; evaluate refuses, never substitutes.
const evalMap = JSON.parse(fs.readFileSync(T.EVAL_MAP, 'utf8'));
const jlDoc = JSON.parse(fs.readFileSync(T.JUDGMENT_LINES, 'utf8'));
const detectorPath = path.join(repo, evalMap.detector.path);
if (!fs.existsSync(detectorPath)) fail('harness-error: detector blob missing: ' + detectorPath);
const detectorSha = sha256File(detectorPath);
if (detectorSha !== evalMap.detector.blob_sha256 || detectorSha !== jlDoc.frozen_detector.blob_sha256) {
  fail('harness-error: detector drift — sha256(' + evalMap.detector.path + ')=' + detectorSha + ' vs pin ' + evalMap.detector.blob_sha256);
}
const detector = require(path.join(repo, evalMap.detector.path));

const manifests = M.listManifests(T);
const sealed = manifests.filter((r) => r.manifest.status === 'sealed');
const open = manifests.filter((r) => r.manifest.status === 'open');

// Membership join: sessions -> owning manifest via observed_session_ids.
const owner = new Map();
for (const r of sealed) {
  for (const sid of r.manifest.observed_session_ids || []) {
    if (!owner.has(sid)) owner.set(sid, []);
    owner.get(sid).push(r.manifest.run_id);
  }
}
const spansMarked = new Map();
for (const r of sealed) for (const sid of r.manifest.spans_boundary_sessions || []) spansMarked.set(sid, r.manifest.run_id);

// Load capture stores of sealed manifests; dedup by source back-pointer (a
// shared raw line collected under two runs counts once — attribution is by
// session ownership, not by store).
const allRows = [];
const seenRow = new Set();
const storesByRun = new Map();
for (const r of sealed) {
  const sf = T.captureStore(r.manifest.run_id);
  const rows = [];
  storesByRun.set(r.manifest.run_id, rows);
  if (!fs.existsSync(sf)) continue;
  for (const row of readJsonl(sf).rows) {
    if (row.parse_error || !row.obj) continue;
    const o = row.obj;
    rows.push(o);
    if (o.source) {
      const k = o.source.sink + '|\x00|' + o.source.file + '|\x00|' + o.source.line_no + '|\x00|' + o.source.line_sha256;
      if (seenRow.has(k)) continue;
      seenRow.add(k);
    }
    allRows.push(o);
  }
}

// Orphan gate: every attributed event session must resolve to EXACTLY one
// sealed manifest; spans_boundary marks must resolve to an earlier owner.
const orphans = [];
for (const row of allRows) {
  if (row.rejected) continue;
  const sid = row.session_id;
  if (!sid) { orphans.push({ session_id: null, class: 'no-session-id', source: row.source }); continue; }
  const owners = owner.get(sid) || [];
  if (owners.length === 0) orphans.push({ session_id: sid, class: 'unowned', source: row.source });
  else if (owners.length > 1) orphans.push({ session_id: sid, class: 'double-ownership', owners });
}
for (const [sid, markedIn] of spansMarked) {
  const owners = owner.get(sid) || [];
  if (owners.length === 0) orphans.push({ session_id: sid, class: 'spans-boundary-dangling', marked_in: markedIn });
}
if (orphans.length) {
  console.log(JSON.stringify({
    status: 'refused',
    reason: 'orphan-captures — judgment lines refuse to evaluate on unattributed telemetry (D-002 iii)',
    orphans,
    detector_sha256: detectorSha,
  }, null, 2));
  process.exit(1);
}

// Assemble evaluator ctx: bindings + session-signals rows live in the store;
// claims live in claims/<run>/<task>.txt (Tier-1). rowsByRun returns rows
// whose session is owned by the named manifest — attribution is session-
// level, never store-level.
const bindings = new Map(), claims = new Map(), sessions = new Map();
for (const r of sealed) {
  const sf = T.captureStore(r.manifest.run_id);
  if (!fs.existsSync(sf)) continue;
  for (const row of readJsonl(sf).rows) {
    const o = row.obj;
    if (!o || o.rejected) continue;
    if (o.event_type === 'session-binding' && o.record) {
      bindings.set(r.manifest.run_id + '/' + o.session_id, o.record.task_id);
    }
    if (o.event_type === 'session-signals' && o.record) {
      sessions.set(o.session_id, {
        tool_results: (o.record.tool_results || []).map((t) => ({ content: t.content, truncated: t.truncated === true, is_error: t.is_error === true })),
        files_edited: o.record.files_edited || [],
        verify_run: o.record.verify_run === true,
        user_prompt_count: o.record.user_prompt_count,
        first_prompt_sha256: o.record.first_prompt_sha256,
        claim_sha256: o.record.claim_sha256,
        mtime_unstable: o.record.mtime_unstable === true,
      });
    }
  }
  for (const c of CL.listClaims(T.CLAIMS, r.manifest.run_id)) {
    const taskId = path.basename(c.file, '.txt');
    claims.set(r.manifest.run_id + '/' + taskId, c);
  }
}

const volumes = {};
for (const v of ['a', 'b', 'c']) {
  const vf = path.join(T.VOLUMES, v + '.json');
  if (fs.existsSync(vf)) volumes[v] = JSON.parse(fs.readFileSync(vf, 'utf8'));
}

const manifestByRun = new Map(sealed.map((r) => [r.manifest.run_id, r.manifest]));
const ctx = {
  manifests: sealed,
  allRows,
  rowsByRun: (runId) => {
    const m = manifestByRun.get(runId);
    if (!m) return [];
    const owned = new Set(m.observed_session_ids || []);
    return allRows.filter((r) => r.session_id && owned.has(r.session_id));
  },
  bindings, claims, sessions, volumes, evalMap, detectorSha, detector,
  jl2SessionOk: new Map(),
};

// Pre-pass: JL-2 session-level outcomes feed the all-comparisons exclusion.
const jl2 = E.evalJL2(ctx);
for (const row of jl2.table) {
  if (row.status === 'dual-sha256-ok') ctx.jl2SessionOk.set(row.session_id, true);
  else ctx.jl2SessionOk.set(row.session_id, false);
}

// evidence ts monotonicity: non-monotonic = clock moved mid-run anomaly.
const anomalies = [];
const evRows = allRows.filter((r) => !r.rejected && r.source.sink === 'evidence' && r.ts);
for (let i = 1; i < evRows.length; i++) {
  if (evRows[i].ts < evRows[i - 1].ts) {
    anomalies.push({ type: 'evidence-ts-nonmonotonic', detail: evRows[i - 1].ts + ' -> ' + evRows[i].ts + ' @ ' + evRows[i].source.file + ':' + evRows[i].source.line_no });
    break;
  }
}

const lines = {
  'JL-1': E.evalJL1(ctx),
  'JL-2': jl2,
  'JL-3': E.evalJL3(ctx),
  'JL-4': E.evalJL4(ctx),
  'JL-5': E.evalJL5(ctx),
};
const allAnomalies = anomalies.concat(...Object.keys(lines).map((k) => (lines[k].anomalies || []).map((a) => Object.assign({ line: k }, a))));
const selfcheck = { item0_deny: E.evalItem0Deny(ctx), item0_instructions: E.evalItem0Instructions(ctx) };

console.log(JSON.stringify({
  status: 'ok',
  detector_sha256: detectorSha,
  manifests_evaluated: sealed.map((r) => r.manifest.run_id),
  manifests_open: open.map((r) => r.manifest.run_id),
  self_check: selfcheck,
  lines,
  anomalies: allAnomalies,
}, null, 2));