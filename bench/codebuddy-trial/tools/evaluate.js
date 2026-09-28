#!/usr/bin/env node
// bench/codebuddy-trial/tools/evaluate.js — D-002/D-003: read-only judgment
// evaluation. Computes the read-time membership join; refuses all judgment
// lines on orphan captures: unattributed events (unowned/double-ownership),
// dangling spans_boundary marks, member sessions without exactly one real
// task binding (binding-multi-prompt/binding-unbound/binding-<violation>/
// binding-unknown-task), and claim-domain orphans (claim-orphan/claim-
// duplicated). spans_boundary member sessions are recorded in the `excluded`
// bucket — visible in tables, never silently counted. Runs JL-1..JL-5 pure
// functions + the item-0 self-check cases, prints verdicts + classification
// tables, writes NOTHING. Reducing indeterminate to an effect verdict is an
// owner-side act — this tool never performs it.
//
// Usage: node evaluate.js [--trial-root <dir>] [--repo <dir>]
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, fail, sha256File, readJsonl, captureKey } = require('./lib/common');
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
const item0Task = (evalMap.probes && evalMap.probes.item0 && evalMap.probes.item0.task_id) || M.ITEM0_TASK_ID;

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
const bindings = new Map(), bindingFull = new Map(), claims = new Map(), sessions = new Map();
for (const r of sealed) {
  const sf = T.captureStore(r.manifest.run_id);
  if (!fs.existsSync(sf)) continue;
  for (const c of CL.listClaims(T.CLAIMS, r.manifest.run_id)) {
    const taskId = path.basename(c.file, '.txt');
    claims.set(r.manifest.run_id + '/' + taskId, c);
  }
  for (const row of readJsonl(sf).rows) {
    if (row.parse_error || !row.obj) continue;
    const o = row.obj;
    if (o.event_type === 'session-binding' && o.record) {
      bindings.set(r.manifest.run_id + '/' + o.session_id, o.record.task_id);
      bindingFull.set(r.manifest.run_id + '/' + o.session_id, o.record);
    }
    if (o.event_type === 'session-signals' && o.record) {
      sessions.set(r.manifest.run_id + '/' + o.session_id, {
        tool_results: (o.record.tool_results || []).map((t) => ({ content: t.content, truncated: t.truncated === true, is_error: t.is_error === true })),
        files_edited: o.record.files_edited || [],
        verify_run: o.record.verify_run === true,
        user_prompt_count: o.record.user_prompt_count,
        first_prompt_sha256: o.record.first_prompt_sha256,
        claim_sha256: o.record.claim_sha256,
        mtime_unstable: o.record.mtime_unstable === true,
      });
    }
    if (o.source) {
      const k = captureKey(o.source);
      if (seenRow.has(k)) continue;
      seenRow.add(k);
    }
    allRows.push(o);
  }
}

// Volume manifests: the binding guard below validates bound task ids against
// each run's declared volume — a bound task outside that set is a forged or
// corrupted store row, same hard-error class as any binding violation.
const volumes = {};
for (const v of M.VOLUMES) {
  const vf = path.join(T.VOLUMES, v + '.json');
  if (fs.existsSync(vf)) volumes[v] = JSON.parse(fs.readFileSync(vf, 'utf8'));
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
// D-004(vi) degraded channel: under owner-paste the guard degrades to PATH
// binding — a member session whose transcript is entirely absent pairs to the
// manifest's unclaimed owner-paste claim iff that pairing is unique in both
// directions (one unbound transcript-less session, one unclaimed paste task).
// Ambiguous elimination never binds — it stays unbound and refuses below.
const pastePathBindings = [];
for (const r of sealed) {
  const mids = r.manifest.observed_session_ids || [];
  const unboundNoT = mids.filter((sid) => {
    const b = bindingFull.get(r.manifest.run_id + '/' + sid);
    return !sessions.has(r.manifest.run_id + '/' + sid) && (!b || !b.task_id);
  });
  const boundTasks = new Set(mids.map((s2) => bindings.get(r.manifest.run_id + '/' + s2)).filter(Boolean));
  const pasteTasks = [...claims.entries()]
    .filter(([k, c]) => k.indexOf(r.manifest.run_id + '/') === 0 && c.channel === 'owner-paste')
    .map(([k]) => k.slice(r.manifest.run_id.length + 1))
    .filter((t) => (r.manifest.planned_task_ids || []).indexOf(t) >= 0 && !boundTasks.has(t));
  if (unboundNoT.length === 1 && pasteTasks.length === 1) {
    bindings.set(r.manifest.run_id + '/' + unboundNoT[0], pasteTasks[0]);
    bindingFull.set(r.manifest.run_id + '/' + unboundNoT[0], { task_id: pasteTasks[0], violation: null, via: 'owner-paste-path' });
    pastePathBindings.push({ run_id: r.manifest.run_id, session_id: unboundNoT[0], task_id: pasteTasks[0] });
  }
}

// D-004(vi) binding guard — hard errors, same class as D-002(iii): a member
// session must carry exactly one real task binding; a mismatch (ran the wrong
// task, >1 user prompt incl. the paste-channel degraded scan, or a missing
// transcript with no unique paste path) refuses the whole evaluation.
for (const r of sealed) {
  const volTasks = volumes[r.manifest.volume];
  if (!volTasks) fail('harness-error: volume manifest missing for run ' + r.manifest.run_id + ': ' + r.manifest.volume);
  const knownTasks = new Set(volTasks.tasks.map((t) => t.task_id));
  knownTasks.add(item0Task);
  for (const sid of r.manifest.observed_session_ids || []) {
    const b = bindingFull.get(r.manifest.run_id + '/' + sid);
    const sig = sessions.get(r.manifest.run_id + '/' + sid);
    if (sig && sig.user_prompt_count > 1) { orphans.push({ session_id: sid, class: 'binding-multi-prompt', run_id: r.manifest.run_id, count: sig.user_prompt_count }); continue; }
    if (!b || !b.task_id) { orphans.push({ session_id: sid, class: 'binding-unbound', run_id: r.manifest.run_id, violation: b && b.violation ? b.violation : 'no-binding-row' }); continue; }
    if (b.violation) { orphans.push({ session_id: sid, class: 'binding-' + String(b.violation).split(':')[0], run_id: r.manifest.run_id, violation: b.violation }); continue; }
    if (!knownTasks.has(b.task_id)) orphans.push({ session_id: sid, class: 'binding-unknown-task', run_id: r.manifest.run_id, task_id: b.task_id });
  }
}
const claimsByTask = new Map();
for (const r of sealed) {
  for (const key of [...claims.keys()].filter((k) => k.indexOf(r.manifest.run_id + '/') === 0)) {
    const taskId = key.slice(r.manifest.run_id.length + 1);
    if ((r.manifest.planned_task_ids || []).indexOf(taskId) < 0) orphans.push({ session_id: null, class: 'claim-orphan', run_id: r.manifest.run_id, task_id: taskId });
    if (!claimsByTask.has(taskId)) claimsByTask.set(taskId, []);
    claimsByTask.get(taskId).push(r.manifest.run_id);
  }
}
for (const [t, runs] of claimsByTask) if (runs.length > 1) orphans.push({ session_id: null, class: 'claim-duplicated', task_id: t, runs });

if (orphans.length) {
  console.log(JSON.stringify({
    status: 'refused',
    reason: 'orphan-captures — judgment lines refuse to evaluate on unattributed telemetry (D-002 iii)',
    orphans,
    detector_sha256: detectorSha,
  }, null, 2));
  process.exit(1);
}

// Claims loaded above (claims/<run>/<task>.txt, Tier-1). rowsByRun returns
// rows whose session is owned by the named manifest — attribution is
// session-level, never store-level.

const spansSet = new Set();
for (const r of sealed) for (const sid of r.manifest.spans_boundary_sessions || []) spansSet.add(sid);
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
  bindings, claims, sessions, volumes, evalMap, detectorSha, detector, spansSet,
  jl2SessionOk: new Map(),
};

// Pre-pass: JL-2 session-level outcomes feed the all-comparisons exclusion.
const jl2 = E.evalJL2(ctx);
for (const row of jl2.table) {
  if (row.status === 'dual-sha256-ok') ctx.jl2SessionOk.set(row.session_id, true);
  else ctx.jl2SessionOk.set(row.session_id, false);
}

// ts<->membership cross-check (D-002 ii): an event owned by a manifest but
// timestamped outside its window is a logged anomaly, never a silent reassign.
const anomalies = [];
for (const r of sealed) {
  const owned = new Set(r.manifest.observed_session_ids || []);
  const t0 = Date.parse(r.manifest.opened_at), t1 = Date.parse(r.manifest.closed_at || r.manifest.opened_at);
  for (const row of allRows) {
    if (row.rejected || !row.session_id || !row.ts || !owned.has(row.session_id)) continue;
    const t = Date.parse(row.ts);
    if (t < t0 || t > t1) anomalies.push({ type: 'ts-membership-conflict', session_id: row.session_id, run_id: r.manifest.run_id, detail: 'event ts ' + row.ts + ' outside [' + r.manifest.opened_at + ', ' + (r.manifest.closed_at || '?') + '] for owner ' + r.manifest.run_id, source: row.source });
  }
}

// evidence ts monotonicity: non-monotonic = clock moved mid-run anomaly.
const evRows = allRows.filter((r) => !r.rejected && r.source.sink === 'evidence' && r.ts);
for (let i = 1; i < evRows.length; i++) {
  if (evRows[i].ts < evRows[i - 1].ts) {
    anomalies.push({ type: 'evidence-ts-nonmonotonic', detail: evRows[i - 1].ts + ' -> ' + evRows[i].ts + ' @ ' + evRows[i].source.file + ':' + evRows[i].source.line_no });
    break;
  }
}

for (const p of pastePathBindings) anomalies.push({ type: 'binding-owner-paste-path', session_id: p.session_id, run_id: p.run_id, detail: 'transcript unreachable; bound to ' + p.task_id + ' by unique path-binding (D-004 vi degraded guard)' });

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