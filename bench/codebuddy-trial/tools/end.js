#!/usr/bin/env node
// bench/codebuddy-trial/tools/end.js — D-002: close a phase window.
// Flushes the three jsonl sinks, computes observed_session_ids (sessions
// with >=1 event inside the window), marks spans_boundary sessions (owned
// by the manifest holding their FIRST event), reconciles planned vs
// observed task sets into task_completion_tally, then seals. Sealed
// manifests are immutable — corrections issue a new manifest.
//
// Usage:
//   node end.js --run-id <id> --input <telemetry-dir>
//               [--at <ISO-8601-UTC>] [--stable-ms N] [--trial-root <dir>]
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, isIsoUtc, fail, usageExit, fsyncFile } = require('./lib/common');
const M = require('./lib/manifest');
const paths = require('./lib/paths');
const C = require('./lib/capture');
const D = require('./lib/deviations');

const args = parseArgs(process.argv.slice(2));
for (const k of ['run-id', 'input']) {
  if (!args[k]) usageExit('end --run-id <id> --input <telemetry-dir> [--at ISO] [--stable-ms N] [--trial-root dir]');
}
const T = paths.resolve(args['trial-root']);
const inputDir = path.resolve(args.input);
if (!fs.existsSync(inputDir)) fail('input telemetry dir does not exist: ' + inputDir);
const at = args.at || new Date().toISOString();
if (!isIsoUtc(at)) fail('--at must be ISO-8601-UTC');
const stableMs = args['stable-ms'] !== undefined ? Number(args['stable-ms']) : 2000;

const file = T.manifestPath(args['run-id']);
if (!fs.existsSync(file)) fail('no such run manifest: ' + args['run-id']);
const m = M.loadManifest(file);
if (m.status !== 'open') fail('manifest ' + args['run-id'] + ' is not open (status=' + m.status + ')');

// 1. Flush sinks: fsync whatever exists under the input dir (D-002 v).
for (const s of C.sinkFiles(inputDir)) { try { fsyncFile(s.file); } catch (e) { D.append(T, { run_id: m.run_id, type: 'sink-flush-failed', description: s.file + ': ' + e.message, discovered_by: 'end', severity: 'medium' }); } }

// 2. Normalize + window observation.
const norm = C.normalizeSinks(inputDir);
for (const r of norm.rejects) {
  D.append(T, { run_id: m.run_id, type: 'ingest-reject', description: r.reason + ' @ ' + r.source.file + ':' + r.source.line_no, discovered_by: 'end', severity: 'high' });
}
const observed = C.sessionsInWindow(norm.rows, m.opened_at, at);

// 2b. Transcript-only sessions: a session whose telemetry produced no sink
// rows is still a member of this window — residence inside this run's input
// dir is itself the collected evidence (the capture row pins file_sha256).
// Window drift on the transcript's own timestamps is deviation-flagged,
// never silently reconciled.
const trEarly = C.loadTranscripts(inputDir, { stableMs });
for (const [sid, info] of trEarly.sessions) {
  const cur = observed.get(sid) || { first_ts: null, in_window: false };
  if (info.first_ts === null) {
    cur.in_window = true; // residence membership; timestamp-less transcript
    D.append(T, { run_id: m.run_id, type: 'transcript-no-timestamp', description: 'session ' + sid + ' transcript carries no ISO-8601-UTC line timestamps; membership holds by residence only', discovered_by: 'end', severity: 'medium' });
  } else {
    if (cur.first_ts === null || Date.parse(info.first_ts) < Date.parse(cur.first_ts)) cur.first_ts = info.first_ts;
    if (Date.parse(info.last_ts) > Date.parse(at) || Date.parse(info.first_ts) < Date.parse(m.opened_at)) {
      // spans the window edges — the boundary rules below decide ownership
      if (Date.parse(info.first_ts) <= Date.parse(at) && Date.parse(info.last_ts) >= Date.parse(m.opened_at)) cur.in_window = true;
    } else if (!cur.in_window) {
      cur.in_window = Date.parse(info.first_ts) >= Date.parse(m.opened_at) && Date.parse(info.first_ts) <= Date.parse(at);
    }
  }
  observed.set(sid, cur);
}

// 3. spans_boundary: a session already observed in an earlier manifest is
// owned by that manifest; here it is only marked (earlier manifest is
// sealed/immutable — the mark lands on the LATER manifest by construction).
const earlier = M.listManifests(T).filter((r) => r.manifest.status === 'sealed' && r.manifest.run_id !== m.run_id);
const ownedEarlier = new Set();
for (const r of earlier) for (const s of r.manifest.observed_session_ids || []) ownedEarlier.add(s);
const observedIds = [], spanning = [];
for (const [sid, info] of observed) {
  if (!info.in_window) continue;
  if (ownedEarlier.has(sid)) { spanning.push(sid); continue; }
  observedIds.push(sid);
  if (info.first_ts !== null && Date.parse(info.first_ts) < Date.parse(m.opened_at)) {
    spanning.push(sid); // first event predates this window but no earlier manifest claims it
    D.append(T, { run_id: m.run_id, type: 'session-first-event-before-window', description: 'session ' + sid + ' first event ' + info.first_ts + ' precedes opened_at ' + m.opened_at + ' yet no sealed manifest owns it', discovered_by: 'end', severity: 'high' });
  }
}
for (const sid of spanning.slice()) {
  if (ownedEarlier.has(sid)) {
    D.append(T, { run_id: m.run_id, type: 'spans-boundary', description: 'session ' + sid + ' spans into this window; ownership stays with the manifest holding its first event', discovered_by: 'end', severity: 'info' });
  }
}

// 4. Session -> task binding: first user-prompt sha256 against the frozen
// volume manifest prompt_sha256 pins + the item-0 probe pin (eval-map).
const vol = JSON.parse(fs.readFileSync(path.join(T.VOLUMES, m.volume + '.json'), 'utf8'));
const evalMap = fs.existsSync(T.EVAL_MAP) ? JSON.parse(fs.readFileSync(T.EVAL_MAP, 'utf8')) : null;
const promptToTask = new Map();
for (const t of vol.tasks) promptToTask.set(t.prompt_sha256, t.task_id);
const item0Sha = evalMap && evalMap.probes && evalMap.probes.item0 ? evalMap.probes.item0.prompt_sha256 : null;
if (item0Sha) promptToTask.set(item0Sha, M.ITEM0_TASK_ID);

const tr = trEarly;
const binding = new Map(); // sid -> task_id | null(unbound) | 'multi-prompt'
const anomalies = [];
for (const sid of observedIds.concat(spanning)) {
  const t = tr.sessions.get(sid);
  if (!t) { binding.set(sid, null); anomalies.push({ sid, kind: 'transcript-missing' }); continue; }
  if (t.mtime_unstable) anomalies.push({ sid, kind: 'transcript-mtime-unstable' });
  if (t.user_prompts.length > 1) { binding.set(sid, 'multi-prompt'); anomalies.push({ sid, kind: 'multi-user-prompt', count: t.user_prompts.length }); continue; }
  if (!t.first_prompt_sha256) { binding.set(sid, null); anomalies.push({ sid, kind: 'no-user-prompt' }); continue; }
  const task = promptToTask.get(t.first_prompt_sha256) || null;
  binding.set(sid, task);
  if (task === null) anomalies.push({ sid, kind: 'unbound-first-prompt-sha' });
}
for (const a of anomalies) {
  D.append(T, { run_id: m.run_id, type: 'binding-' + a.kind, description: 'session ' + a.sid + ' ' + a.kind + (a.count ? ' (' + a.count + ' user prompts)' : ''), discovered_by: 'end', severity: (a.kind === 'multi-user-prompt' || a.kind === 'unbound-first-prompt-sha') ? 'high' : 'medium' });
}

// 5. Probes outcome (registered into the sealed manifest).
const item0Sessions = observedIds.filter((sid) => binding.get(sid) === M.ITEM0_TASK_ID);
const denies = norm.rows.filter((r) => r.source.sink === 'pretool' && r.record && r.record.decision === 'deny');
const loads = norm.rows.filter((r) => r.source.sink === 'instructions' && r.record && r.record.event === 'InstructionsLoaded');
const expectSha = evalMap && evalMap.bundle_expectations ? evalMap.bundle_expectations.rules : {};
const item0Deny = item0Sessions.length > 0 && denies.some((r) => item0Sessions.indexOf(r.session_id) >= 0);
const item0Load = loads.filter((r) => item0Sessions.indexOf(r.session_id) >= 0);
const instrProbe = item0Load.length > 0 && item0Load.some((r) => {
  const res = (r.record && r.record.results) || [];
  const expLen = Object.keys(expectSha).length;
  return res.length === expLen && res.every((x) => x.present && expectSha[x.file] && x.sha256 === expectSha[x.file]);
});
const reach = item0Sessions.length === 0 ? 'untested' : (item0Sessions.every((sid) => tr.sessions.has(sid)) ? 'reachable' : 'unreachable');
const probes = {
  item0_task_id: m.probes && m.probes.item0_task_id,
  item0_sessions: item0Sessions,
  deny_probe: item0Sessions.length === 0 ? 'untested' : (item0Deny ? 'pass' : 'fail'),
  instructions_probe: item0Sessions.length === 0 ? 'untested' : (instrProbe ? 'pass' : 'fail'),
  transcript_reachability: reach,
  session_id_lifecycle: anomalies.some((a) => a.kind === 'unbound-first-prompt-sha' || a.kind === 'multi-user-prompt') ? 'collision-suspect' : 'unique-binding-observed',
};

// 6. Tally: planned vs observed task set — recorded, never smoothed.
const observedTasks = [...new Set([...binding.values()].filter((v) => v && v !== 'multi-prompt'))];
const plannedSet = m.planned_task_ids;
const delta = [];
for (const t of plannedSet) if (observedTasks.indexOf(t) < 0) delta.push({ task_id: t, status: 'skipped' });
for (const t of observedTasks) if (plannedSet.indexOf(t) < 0) delta.push({ task_id: t, status: 'unplanned' });
const tally = {
  planned: plannedSet.length, observed: observedTasks.length,
  observed_task_ids: observedTasks.sort(),
  unbound_sessions: [...binding.entries()].filter(([, v]) => v === null || v === 'multi-prompt').map(([k]) => k),
  delta,
};

const res = M.sealManifest(T, m.run_id, {
  closed_at: at,
  observed_session_ids: observedIds,
  spans_boundary_sessions: spanning,
  task_completion_tally: tally,
  probes,
  telemetry_dir: inputDir,
});

console.log(JSON.stringify({
  sealed: res.manifest.run_id,
  observed_session_ids: res.manifest.observed_session_ids,
  spans_boundary_sessions: res.manifest.spans_boundary_sessions,
  task_completion_tally: res.manifest.task_completion_tally,
  probes: res.manifest.probes,
  file: path.relative(T.REPO, res.file).split(path.sep).join('/'),
}, null, 2));
