#!/usr/bin/env node
// bench/codebuddy-trial/tools/collect.js — D-002/D-004/D-006: normalize the
// telemetry sinks into the per-run capture store (Tier-1, never-committed),
// extract verbatim claims into claims/<run>/<task>.txt, run the 1:1 binding
// guard, and fold deviations.jsonl into judgment-lines.deviations[] under
// the recorded seq cursor.
//
// Usage:
//   node collect.js --run-id <id> [--input <telemetry-dir>]
//                   [--stable-ms N] [--no-aggregate] [--trial-root <dir>]
// --input defaults to the manifest's recorded telemetry_dir (written by end).
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, fail, usageExit, captureKey, DEFAULT_STABLE_MS } = require('./lib/common');
const M = require('./lib/manifest');
const paths = require('./lib/paths');
const C = require('./lib/capture');
const D = require('./lib/deviations');
const CL = require('./lib/claims');

const args = parseArgs(process.argv.slice(2));
if (!args['run-id']) usageExit('collect --run-id <id> [--input dir] [--stable-ms N] [--no-aggregate] [--trial-root dir]');
const T = paths.resolve(args['trial-root']);
const stableMs = args['stable-ms'] !== undefined ? Number(args['stable-ms']) : DEFAULT_STABLE_MS;
// Tool-result text excerpt cap stored per row (provenance, not truncation policy).
const TOOL_RESULT_EXCERPT_CHARS = 8192;

const mfile = T.manifestPath(args['run-id']);
if (!fs.existsSync(mfile)) fail('no such run manifest: ' + args['run-id']);
const m = M.loadManifest(mfile);
const inputDir = args.input ? path.resolve(args.input) : (m.telemetry_dir ? path.resolve(m.telemetry_dir) : null);
if (!inputDir || !fs.existsSync(inputDir)) fail('no telemetry dir: pass --input or seal via end --input');

// 1. Normalized capture store: append-only; dedup by source back-pointer so
//    re-collection is idempotent (D-002 v).
const storeFile = T.captureStore(m.run_id);
fs.mkdirSync(path.dirname(storeFile), { recursive: true });
const seen = new Set();
if (fs.existsSync(storeFile)) {
  for (const line of fs.readFileSync(storeFile, 'utf8').split(/\r?\n/)) {
    if (!line) continue;
    try { const r = JSON.parse(line); if (r.source) seen.add(captureKey(r.source)); } catch (e) { }
  }
}
const norm = C.normalizeSinks(inputDir);
const appended = [];
const appendRow = (row) => {
  const key = captureKey(row.source);
  if (key && seen.has(key)) return false;
  if (key) seen.add(key);
  fs.appendFileSync(storeFile, JSON.stringify(row) + '\n');
  appended.push(row);
  return true;
};
for (const row of norm.rows) appendRow(row);
for (const r of norm.rejects) {
  D.append(T, { run_id: m.run_id, type: 'ingest-reject', description: r.reason + ' @ ' + r.source.file + ':' + r.source.line_no, discovered_by: 'collect', severity: 'high' });
}

// 2. Transcripts: session signals row (derived measurements + back-pointer
//    join the capture store so evaluate is replayable without the raw
//    transcripts, which are owner-side Tier-1 source).
const tr = C.loadTranscripts(inputDir, { stableMs });
for (const sid of tr.unstable) {
  D.append(T, { run_id: m.run_id, type: 'transcript-mtime-unstable', description: 'transcript for session ' + sid + ' modified <' + stableMs + 'ms before collection', discovered_by: 'collect', severity: 'medium' });
}
for (const [sid, info] of tr.sessions) {
  appendRow({
    source: { sink: 'transcript', file: path.relative(inputDir, info.file).split(path.sep).join('/'), line_no: 1, line_sha256: info.file_sha256, file_sha256: info.file_sha256 },
    session_id: sid, ts: null,
    event_type: 'session-signals',
    record: {
      user_prompt_count: info.user_prompts.length,
      first_prompt_sha256: info.first_prompt_sha256,
      claim_sha256: info.claim_sha256,
      files_edited: info.files_edited,
      verify_run: info.verify_run,
      tool_results: info.tool_results.map((t) => { const c = typeof t === 'object' && t !== null ? String(t.content || '') : String(t); return { content: c.slice(0, TOOL_RESULT_EXCERPT_CHARS), truncated: c.length > TOOL_RESULT_EXCERPT_CHARS, is_error: typeof t === 'object' && t !== null && t.is_error === true }; }),
      transcript_file: info.file,
      parse_errors: info.parse_errors,
      mtime_unstable: info.mtime_unstable,
      run_id: m.run_id,
    },
  });
}

// 3. Binding guard: session -> task via first user-prompt sha256 pinned by
//    the frozen volume manifest (+ item-0 probe pin). >1 user prompt or an
//    unknown prompt hash are loud anomalies — never silently bound.
const volFile = path.join(T.VOLUMES, m.volume + '.json');
if (!fs.existsSync(volFile)) fail('harness-error: volume manifest missing for run ' + m.run_id + ': ' + volFile);
const vol = JSON.parse(fs.readFileSync(volFile, 'utf8'));
const promptToTask = new Map();
for (const t of vol.tasks) promptToTask.set(t.prompt_sha256, t.task_id);
let item0Sha = null, item0Task = null;
if (fs.existsSync(T.EVAL_MAP)) {
  const em = JSON.parse(fs.readFileSync(T.EVAL_MAP, 'utf8'));
  item0Sha = em.probes && em.probes.item0 ? em.probes.item0.prompt_sha256 : null;
  item0Task = em.probes && em.probes.item0 ? em.probes.item0.task_id : M.ITEM0_TASK_ID;
}
if (item0Sha) promptToTask.set(item0Sha, item0Task);
const bindings = [];
for (const [sid, info] of tr.sessions) {
  let taskId = null, violation = null;
  if (info.user_prompts.length > 1) violation = 'multi-prompt:' + info.user_prompts.length;
  else if (info.first_prompt_sha256 === null) violation = 'no-user-prompt';
  else taskId = promptToTask.get(info.first_prompt_sha256) || null;
  if (taskId === null && violation === null) violation = 'unbound-first-prompt-sha';
  bindings.push({ sid, taskId, violation, first_prompt_sha256: info.first_prompt_sha256 });
  appendRow({
    source: { sink: 'binding', file: path.relative(inputDir, info.file).split(path.sep).join('/'), line_no: 1, line_sha256: info.first_prompt_sha256, file_sha256: info.file_sha256 },
    session_id: sid, ts: null,
    event_type: 'session-binding',
    record: { task_id: taskId, violation, first_prompt_sha256: info.first_prompt_sha256, run_id: m.run_id },
  });
  if (violation) {
    D.append(T, { run_id: m.run_id, type: 'binding-' + violation.split(':')[0], description: 'session ' + sid + ' ' + violation, discovered_by: 'collect', severity: 'high' });
  }
}

// 4. Claim extraction: verbatim last-assistant-text per bound task; never
//    overwrite an owner-paste file — when both channels exist, substring
//    cross-check and report (channel inconsistency -> anomaly, never a
//    silent reinterpretation).
const claimReport = [];
for (const b of bindings) {
  if (!b.taskId) continue;
  const info = tr.sessions.get(b.sid);
  if (!info || !info.claim_text) {
    D.append(T, { run_id: m.run_id, type: 'claim-missing', description: 'no assistant text block in session ' + b.sid + ' (task ' + b.taskId + ')', discovered_by: 'collect', severity: 'medium' });
    continue;
  }
  const cf = T.claimFile(m.run_id, b.taskId);
  const res = CL.writeExtracted(cf, {
    session_id: b.sid,
    source_transcript: path.relative(inputDir, info.file).split(path.sep).join('/'),
    source_sha256: info.file_sha256,
    extract_rule: C.CLAIM_EXTRACT_VERSION,
  }, info.claim_text);
  if (res.substring_check === 'mismatch') {
    D.append(T, { run_id: m.run_id, type: 'claim-channel-inconsistency', description: 'owner-paste body for task ' + b.taskId + ' is not substring-consistent with transcript claim (session ' + b.sid + ')', discovered_by: 'collect', severity: 'high' });
  }
  claimReport.push({ task_id: b.taskId, session_id: b.sid, channel: res.channel, wrote: res.wrote, substring_check: res.substring_check || null });
}

// 5. Deviation aggregation: fold new deviations.jsonl rows into
//    judgment-lines.json deviations[] under the recorded cursor (D-006 iii).
let agg = null;
if (args['no-aggregate'] !== true && fs.existsSync(T.JUDGMENT_LINES)) {
  agg = D.aggregate(T);
}

console.log(JSON.stringify({
  run_id: m.run_id,
  captured_rows_appended: appended.length,
  reject_deviations: norm.rejects.length,
  sessions: tr.sessions.size,
  bindings: bindings.map((b) => ({ session_id: b.sid, task_id: b.taskId, violation: b.violation })),
  claims: claimReport,
  deviations_aggregated: agg ? agg.aggregated : null,
  store: path.relative(T.REPO, storeFile).split(path.sep).join('/'),
}, null, 2));