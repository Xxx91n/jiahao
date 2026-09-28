// bench/codebuddy-trial/tools/lib/capture.js — telemetry collector core
// (D-002 read-time membership join; D-004 claim extraction + binding guards).
//
// Input contract (the trial telemetry dir the owner assembles):
//   <input>/.jiahao-instructions.jsonl   InstructionsLoaded lines
//   <input>/.jiahao-pretool.jsonl        PreToolUse decision lines
//   <input>/.jiahao-evidence/            segmented evidence dir OR a single
//                                        .jiahao-evidence jsonl file
//   <input>/transcripts/<session>.jsonl  Claude-Code-compatible transcripts
//
// The collector normalizes + carries line-level provenance ONLY (per-line
// sha256 + line-no + whole-file sha256 back-pointers). It never rewrites
// evidence logs and never adjudicates — membership/verdicts happen at
// evaluation read time.
'use strict';
const fs = require('fs');
const path = require('path');
const { isIsoUtc, sha256, readJsonl } = require('./common');

const SINKS = ['instructions', 'pretool', 'evidence'];

// --- sink readers -----------------------------------------------------------

function sinkFiles(inputDir) {
  const out = [];
  const push = (sink, file) => out.push({ sink, file });
  const ins = path.join(inputDir, '.jiahao-instructions.jsonl');
  const pre = path.join(inputDir, '.jiahao-pretool.jsonl');
  const evd = path.join(inputDir, '.jiahao-evidence');
  if (fs.existsSync(ins)) push('instructions', ins);
  if (fs.existsSync(pre)) push('pretool', pre);
  if (fs.existsSync(evd)) {
    const st = fs.statSync(evd);
    if (st.isDirectory()) {
      for (const seg of fs.readdirSync(evd).filter((f) => /\.jsonl$/.test(f)).sort()) {
        push('evidence', path.join(evd, seg));
      }
    } else push('evidence', evd);
  }
  return out;
}

// Normalize one sink file into capture rows. Parse/ts rejects stay captured
// with rejected:true so lineage is complete and the anomaly is loud at eval.
function normalizeFile(inputDir, sink, file) {
  const parsed = readJsonl(file);
  const rel = path.relative(inputDir, file).split(path.sep).join('/');
  const rows = [];
  const rejects = [];
  for (const r of parsed.rows) {
    const src = { sink, file: rel, line_no: r.line_no, line_sha256: r.line_sha256, file_sha256: parsed.file_sha256 };
    if (r.parse_error) {
      rejects.push({ source: src, reason: 'ingest-parse-error: ' + r.parse_error });
      rows.push({ source: src, session_id: null, ts: null, event_type: null, rejected: 'parse-error', record: null });
      continue;
    }
    const o = r.obj;
    const ts = o.ts || o.timestamp || (o.record && o.record.ts) || null;
    if (!isIsoUtc(ts)) {
      rejects.push({ source: src, reason: 'ingest-ts-format-drift: ' + JSON.stringify(ts) });
      rows.push({ source: src, session_id: o.session_id || null, ts: null, event_type: o.event || o.kind || null, rejected: 'ts-format-drift', record: o });
      continue;
    }
    rows.push({
      source: src,
      session_id: o.session_id || null,
      ts,
      event_type: o.event || o.kind || o.type || null,
      record: o,
    });
  }
  return { file: rel, file_sha256: parsed.file_sha256, rows, rejects };
}

// All capture rows for an input dir, flattened, plus reject records.
function normalizeSinks(inputDir) {
  const files = sinkFiles(inputDir);
  const rows = [];
  const rejects = [];
  const sinkSet = {};
  for (const s of files) {
    const n = normalizeFile(inputDir, s.sink, s.file);
    sinkSet[s.sink] = true;
    for (const r of n.rows) rows.push(r);
    for (const r of n.rejects) rejects.push(r);
  }
  return { rows, rejects, sinks: Object.keys(sinkSet) };
}

// --- transcripts ------------------------------------------------------------

// Extract the trial signal from a Claude-Code-compatible transcript:
//   first user text block  -> 1:1 binding hash + >1 user-prompt scan
//   last assistant text block (tool_use/tool_result wrappers excluded) -> claim
//   tool_result contents + tool_use inventory -> classifier signals
// (D-004 iii/iv: anchor = the session's LAST assistant text block; the
// extraction rule is frozen + versioned as claim-extract-v1.)
const CLAIM_EXTRACT_VERSION = 'claim-extract-v1';

function extractTranscript(file) {
  const parsed = readJsonl(file);
  const info = {
    file, file_sha256: parsed.file_sha256,
    user_prompts: [], assistant_texts: [], tool_results: [],
    first_ts: null, last_ts: null,
    files_edited: [], verify_run: false, session_id: null,
    parse_errors: 0,
  };
  const VERIFY_RE = /\b(npms+(test|runs+test)|npxs+jest|jest|nodes+--test|pytest|gos+test|cargos+test|dotnets+test|mvns+test|gradle(w)?s+test|makes+test)\b/i;
  for (const r of parsed.rows) {
    if (r.parse_error) { info.parse_errors++; continue; }
    const o = r.obj;
    if (!info.session_id && (o.session_id || o.sessionId)) info.session_id = o.session_id || o.sessionId;
    const rts = o.ts || o.timestamp || null;
    if (rts && isIsoUtc(rts)) {
      if (info.first_ts === null || Date.parse(rts) < Date.parse(info.first_ts)) info.first_ts = rts;
      if (info.last_ts === null || Date.parse(rts) > Date.parse(info.last_ts)) info.last_ts = rts;
    }
    const msg = o.message || {};
    const content = Array.isArray(msg.content) ? msg.content : (typeof msg.content === 'string' ? [{ type: 'text', text: msg.content }] : []);
    const role = msg.role || o.type;
    if (role === 'user') {
      for (const c of content) {
        if (c && c.type === 'tool_result') {
          const body = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
          info.tool_results.push({ content: body, is_error: c.is_error === true });
        } else if (c && c.type === 'text') {
          info.user_prompts.push(String(c.text));
        }
      }
    }
    if (o.type === 'tool_result' && typeof o.content !== 'undefined') {
      const body = typeof o.content === 'string' ? o.content : JSON.stringify(o.content);
      info.tool_results.push({ content: body, is_error: o.is_error === true });
    }
    if (role === 'assistant') {
      for (const c of content) {
        if (c && c.type === 'text') info.assistant_texts.push(String(c.text));
        if (c && c.type === 'tool_use') {
          const name = String(c.name || '');
          const inp = c.input || {};
          if (/^(Edit|Write|NotebookEdit|MultiEdit|edit|write|notebook_edit)$/i.test(name) && (inp.file_path || inp.path || inp.notebook_path)) {
            info.files_edited.push(String(inp.file_path || inp.path || inp.notebook_path));
          }
          if (/^(Bash|Shell|exec|shell_command|terminal)$/i.test(name) && VERIFY_RE.test(String(inp.command || ''))) {
            info.verify_run = true;
          }
        }
      }
    }
  }
  info.first_prompt = info.user_prompts.length ? info.user_prompts[0] : null;
  info.first_prompt_sha256 = info.first_prompt === null ? null : sha256(info.first_prompt);
  // claim anchor = the LAST assistant text block of the session (terminal
  // turn's final Stop); mid-turn text is never the claim (D-004 iv).
  info.claim_text = info.assistant_texts.length ? info.assistant_texts[info.assistant_texts.length - 1] : null;
  info.claim_sha256 = info.claim_text === null ? null : sha256(info.claim_text);
  return info;
}

function loadTranscripts(inputDir, opts) {
  const dir = path.join(inputDir, 'transcripts');
  const stableMs = opts && typeof opts.stableMs === 'number' ? opts.stableMs : 2000;
  const out = new Map();
  const unstable = [];
  if (!fs.existsSync(dir)) return { sessions: out, unstable, present: false };
  const now = Date.now();
  for (const f of fs.readdirSync(dir).filter((x) => /\.jsonl$/.test(x)).sort()) {
    const file = path.join(dir, f);
    const st = fs.statSync(file);
    const info = extractTranscript(file);
    if (!info.session_id) info.session_id = f.replace(/\.jsonl$/, '');
    info.mtime_ms = st.mtimeMs;
    info.mtime_unstable = now - st.mtimeMs < stableMs;
    if (info.mtime_unstable) unstable.push(info.session_id);
    out.set(info.session_id, info);
  }
  return { sessions: out, unstable, present: true };
}

// --- membership spine -------------------------------------------------------

// Events in a manifest's open window [opened_at, closed_at|now]. Membership
// itself is the session-set check (D-002 ii); this helper only computes the
// window observation the `end` verb registers.
function sessionsInWindow(rows, openedAt, closedAt) {
  const t0 = Date.parse(openedAt), t1 = Date.parse(closedAt);
  const set = new Map(); // sid -> {first_ts, has_in_window}
  for (const r of rows) {
    if (r.rejected || !r.session_id || !r.ts) continue;
    const t = Date.parse(r.ts);
    const cur = set.get(r.session_id) || { first_ts: r.ts, in_window: false };
    if (Date.parse(r.ts) < Date.parse(cur.first_ts)) cur.first_ts = r.ts;
    if (t >= t0 && t <= t1) cur.in_window = true;
    set.set(r.session_id, cur);
  }
  return set;
}

module.exports = {
  SINKS, CLAIM_EXTRACT_VERSION,
  sinkFiles, normalizeFile, normalizeSinks,
  extractTranscript, loadTranscripts, sessionsInWindow,
};
