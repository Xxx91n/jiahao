'use strict';
// src/transcript-adapter.js — : the conviction lane's channel
// component. Adapts a host transcript file (Claude Code JSONL shape) into the
// pairer's input shape {task, transcript:{events, closing}}.
//
// This is NOT the adjudication instrument: it performs no pairing logic and is
// never part of the adjudication pin. Its contract is mechanical extraction
// (contract tests in test/transcript-adapter.test.js).
//
// Tolerance rules (honest, never silent):
//   - lines that fail JSON.parse are skipped and counted in stats.skipped
//   - a transcript with zero usable events still returns a task/closing when
//     extractable; the caller decides what 'undetermined' means
//   - entry types other than user/assistant (system, summary, attachments,
//     file-history snapshots, progress) are ignored by design
//
// Event shapes emitted (matching the devin-corpus@v3 item shape the pairer
// consumes):
//   {type:'message',     ts, text}
//   {type:'tool_call',   ts, call_id, name, arguments:{...}}
//   {type:'tool_result', ts, call_id, name, is_error, truncated, content}

const fs = require('fs');

function textOf(content) {
  // tool_result / message content may be a string or a block list; flatten to
  // a single string. Unknown block types contribute nothing.
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(function (b) {
      if (typeof b === 'string') return b;
      if (b && typeof b.text === 'string') return b.text;
      return '';
    }).join('\n');
  }
  return '';
}

function adaptTranscriptText(text) {
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  const entries = [];
  let skipped = 0;
  for (const line of lines) {
    if (!line || !line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch (err) { skipped++; continue; }
    if (!e || typeof e !== 'object') { skipped++; continue; }
    entries.push(e);
  }

  // Assistant lines that share one message id: both shipped hosts append one
  // disjoint part per line under the same id (Qoder splits thinking, text and
  // tool_use across chatcmpl-* lines; measured on real transcripts, #119
  // finding 5 — 3346/3346 same-id groups disjoint across three Qoder
  // sessions and 545/545 across 19 Claude Code sessions, so the old
  // "cumulative snapshot" premise no longer holds anywhere and keep-last
  // dropped every earlier part). Union the blocks per id in encounter order
  // and dedup identical blocks, so a host that still rewrites the whole
  // content array adds nothing; the union is emitted once, at the id's FIRST
  // line — every tool_use part then precedes its tool_result, so the
  // call-name mapping survives the split. Other entry types pass through
  // untouched.
  const mergedById = new Map(); // message id -> { blocks, seen, firstIdx }
  entries.forEach(function (e, i) {
    if (e.type !== 'assistant') return;
    const id = e.message && typeof e.message.id === 'string' ? e.message.id : null;
    if (id === null) return;
    let merged = mergedById.get(id);
    if (!merged) { merged = { blocks: [], seen: new Set(), firstIdx: i }; mergedById.set(id, merged); }
    const blocks = Array.isArray(e.message.content) ? e.message.content : [];
    for (const b of blocks) {
      if (!b || typeof b !== 'object') continue;
      const key = JSON.stringify(b);
      if (merged.seen.has(key)) continue;
      merged.seen.add(key);
      merged.blocks.push(b);
    }
  });

  const events = [];
  const callNames = Object.create(null);   // tool_use_id -> tool name
  let task = null;
  let closing = '';

  entries.forEach(function (e, i) {
    const ts = typeof e.timestamp === 'string' ? e.timestamp : null;
    const msg = e.message && typeof e.message === 'object' ? e.message : {};
    const content = msg.content;

    if (e.type === 'assistant') {
      const id = typeof msg.id === 'string' ? msg.id : null;
      let blocks = Array.isArray(content) ? content : [];
      if (id !== null) {
        const merged = mergedById.get(id);
        if (!merged || merged.firstIdx !== i) return; // part line: folded into the union emitted at the id's first line
        blocks = merged.blocks;
      }
      let msgText = '';
      for (const b of blocks) {
        if (!b || typeof b !== 'object') continue;
        if (b.type === 'tool_use') {
          const cid = typeof b.id === 'string' ? b.id : null;
          if (cid !== null && callNames[cid] === undefined) callNames[cid] = typeof b.name === 'string' ? b.name : null;
          events.push({
            type: 'tool_call',
            ts: ts,
            call_id: cid,
            name: typeof b.name === 'string' ? b.name : null,
            arguments: (b.input && typeof b.input === 'object') ? b.input : {},
          });
        } else if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) {
          events.push({ type: 'message', ts: ts, text: b.text });
          msgText += (msgText ? '\n' : '') + b.text;
        }
      }
      if (msgText) closing = msgText;
      return;
    }

    if (e.type === 'user') {
      if (e.isMeta === true) return;
      const blocks = typeof content === 'string'
        ? [{ type: 'text', text: content }]
        : (Array.isArray(content) ? content : []);
      for (const b of blocks) {
        if (!b || typeof b !== 'object') continue;
        if (b.type === 'tool_result') {
          const cid = typeof b.tool_use_id === 'string' ? b.tool_use_id : null;
          events.push({
            type: 'tool_result',
            ts: ts,
            call_id: cid,
            name: (cid !== null ? callNames[cid] : null) || null,
            is_error: b.is_error === true,
            truncated: false,
            content: textOf(b.content),
          });
        } else if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) {
          events.push({ type: 'message', ts: ts, text: b.text });
          if (task === null) task = b.text;
        }
      }
      return;
    }
    // other entry types (system, summary, progress, attachment, ...) ignored
  });

  return {
    ok: entries.length > 0,
    task: task,
    transcript: { events: events, closing: closing },
    stats: {
      lines: lines.length,
      parsed: entries.length,
      skipped: skipped,
      tool_results: events.filter(function (x) { return x.type === 'tool_result'; }).length,
    },
  };
}

function adaptTranscriptFile(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); } catch (e) {
    return { ok: false, reason: 'transcript unreadable: ' + e.message, task: null, transcript: { events: [], closing: '' }, stats: null };
  }
  const r = adaptTranscriptText(text);
  if (!r.ok) r.reason = 'transcript has no parseable JSONL lines';
  return r;
}

module.exports = { adaptTranscriptText: adaptTranscriptText, adaptTranscriptFile: adaptTranscriptFile };
