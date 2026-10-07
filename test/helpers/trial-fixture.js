// test/helpers/trial-fixture.js — scratch trial-root + telemetry fixture
// builder for the codebuddy-trial harness suite (T-8 / D-007). Every helper
// produces REAL artifacts the tools consume verbatim — no mocks. A fixture
// root copies the committed frozen surface (eval-map / volumes / judgment-
// lines / frozen-sha256 / workbenches) so --trial-root exercises the same
// code paths as the real bench dir without touching it.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const REAL = path.join(REPO, 'bench', 'codebuddy-trial');
const TOOLS = path.join(REAL, 'tools');

const shaStr = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// Scratch trial root = copy of the committed frozen surface.
function makeTrialRoot(dir) {
  const T = dir || fs.mkdtempSync(path.join(os.tmpdir(), 't31-'));
  for (const d of ['runs', 'captures', 'claims', 'volumes', 'workbenches']) fs.mkdirSync(path.join(T, d), { recursive: true });
  for (const f of ['judgment-lines.json', 'eval-map.json', 'frozen-sha256.json']) fs.copyFileSync(path.join(REAL, f), path.join(T, f));
  for (const v of ['a', 'b', 'c']) fs.copyFileSync(path.join(REAL, 'volumes', v + '.json'), path.join(T, 'volumes', v + '.json'));
  for (const w of fs.readdirSync(path.join(REAL, 'workbenches'))) {
    const src = path.join(REAL, 'workbenches', w);
    if (!fs.statSync(src).isDirectory()) continue;
    copyTree(src, path.join(T, 'workbenches', w));
  }
  return T;
}
function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyTree(s, d); else fs.copyFileSync(s, d);
  }
}

// Telemetry dir assembly. spec = {
//   sessions: [{sid, prompt, claim, results:[{text,is_error}], edits:[], verify:[], instructions:false}],
//   instructions: [{session_id, results:[...]}],   // override rows (bad-sha etc)
//   pretool: [{session_id, tool_name, decision, target}],
//   evidence: [{session_id, kind, gate_type}],
//   t0: base ISO time
// }
function makeTelemetry(dir, spec) {
  const em = JSON.parse(fs.readFileSync(path.join(REAL, 'eval-map.json'), 'utf8'));
  const R = em.bundle_expectations.rules;
  const T0 = Date.parse(spec.t0 || '2026-09-28T00:00:00Z');
  fs.mkdirSync(path.join(dir, 'transcripts'), { recursive: true });
  const ins = [], pre = [], ev = [];
  let step = 0;
  const ts = () => new Date(T0 + (step++) * 1000).toISOString();
  for (const s of spec.sessions || []) {
    const lines = [];
    const sid = s.sid;
    lines.push({ type: 'user', sessionId: sid, timestamp: ts(), message: { role: 'user', content: [{ type: 'text', text: s.prompt }] } });
    for (const r of s.results || []) {
      lines.push({ type: 'user', sessionId: sid, timestamp: ts(), message: { role: 'user', content: [{ type: 'tool_result', content: r.text, is_error: r.is_error === true }] } });
    }
    const ac = [];
    for (const e of s.edits || []) ac.push({ type: 'tool_use', name: 'Edit', input: { file_path: e } });
    for (const v of s.verify || []) ac.push({ type: 'tool_use', name: 'Bash', input: { command: v } });
    ac.push({ type: 'text', text: s.claim });
    lines.push({ type: 'assistant', sessionId: sid, timestamp: ts(), message: { role: 'assistant', content: ac } });
    fs.writeFileSync(path.join(dir, 'transcripts', sid + '.jsonl'), lines.map(JSON.stringify).join('\n') + '\n');
    if (s.instructions !== false) ins.push({ event: 'InstructionsLoaded', host: 'codebuddy', session_id: sid, ts: ts(), results: [{ file: 'rules/jiahao-verifier.md', present: true, sha256: R['rules/jiahao-verifier.md'] }, { file: 'rules/jiahao-generator.md', present: true, sha256: R['rules/jiahao-generator.md'] }] });
  }
  for (const i of spec.instructions || []) ins.push({ event: 'InstructionsLoaded', host: 'codebuddy', session_id: i.session_id, ts: i.ts || ts(), results: i.results });
  for (const p of spec.pretool || []) pre.push({ event: 'PreToolUse', host: 'codebuddy', session_id: p.session_id, ts: p.ts || ts(), tool_name: p.tool_name || 'Edit', decision: p.decision, target: p.target || 'hooks/jiahao-pretool-guard.js' });
  for (const e of spec.evidence || []) ev.push({ kind: e.kind || 'verification', session_id: e.session_id, ts: e.ts || ts(), gate_type: e.gate_type || 'deterministic', claim_sha256: 'x', tool_results_sha256: 'y' });
  if (ins.length) fs.writeFileSync(path.join(dir, '.jiahao-instructions.jsonl'), ins.map(JSON.stringify).join('\n') + '\n');
  if (pre.length) fs.writeFileSync(path.join(dir, '.jiahao-pretool.jsonl'), pre.map(JSON.stringify).join('\n') + '\n');
  if (ev.length) fs.writeFileSync(path.join(dir, '.jiahao-evidence'), ev.map(JSON.stringify).join('\n') + '\n');
  return dir;
}

function taskPrompt(volume, taskId) {
  const vol = JSON.parse(fs.readFileSync(path.join(REAL, 'volumes', volume + '.json'), 'utf8'));
  return vol.tasks.find((t) => t.task_id === taskId).prompt_text;
}
function item0Prompt() {
  return JSON.parse(fs.readFileSync(path.join(REAL, 'eval-map.json'), 'utf8')).probes.item0.prompt_text;
}

// verb runner — real process spawn, the launch-and-liveness leg.
function run(tool, argObj) {
  const a = [path.join(TOOLS, tool + '.js')];
  for (const [k, v] of Object.entries(argObj || {})) {
    if (v === true) a.push('--' + k);
    else a.push('--' + k, String(v));
  }
  const r = spawnSync(process.execPath, a, { encoding: 'utf8' });
  let out = null;
  try { out = JSON.parse(r.stdout); } catch (e) { out = { raw: r.stdout }; }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json: out };
}

// end-to-end phase driver: begin -> collect -> end against a fresh telemetry dir.
function runPhase(T, opts) {
  const tel = fs.mkdtempSync(path.join(os.tmpdir(), 't31-tel-'));
  makeTelemetry(tel, opts.telemetry || {});
  const b = run('begin', { 'run-id': opts.runId, phase: opts.phase, volume: opts.volume, 'bundle-sha': opts.bundleSha || 'fixture', 'host-version': opts.host || 'fixture', tasks: opts.tasks, at: opts.openAt || '2026-09-28T00:00:00Z', 'trial-root': T });
  if (b.status !== 0) return { begin: b, manifest: null, telemetry: tel };
  const c = run('collect', { 'run-id': opts.runId, input: tel, 'stable-ms': opts.stableMs !== undefined ? opts.stableMs : 0, 'trial-root': T });
  const e = run('end', { 'run-id': opts.runId, input: tel, at: opts.closeAt || '2026-09-28T06:00:00Z', 'stable-ms': 0, 'trial-root': T });
  return { begin: b, collect: c, end: e, manifest: e.status === 0 ? JSON.parse(fs.readFileSync(path.join(T, 'runs', opts.runId + '.json'), 'utf8')) : null, telemetry: tel };
}

module.exports = { REPO, REAL, TOOLS, shaStr, makeTrialRoot, makeTelemetry, taskPrompt, item0Prompt, run, runPhase };