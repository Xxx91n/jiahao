'use strict';
// src/transcript-adapter.js — the transcript check's input reader.
// Adapts a host transcript file (Claude Code JSONL shape) into the
// claim check's input shape {task, transcript:{events, closing}}.
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
// Event shapes emitted (matching the devin-corpus@v3 item shape the claim check
// consumes):
//   {type:'message',     ts, text}
//   {type:'tool_call',   ts, call_id, name, arguments:{...}}
//   {type:'tool_result', ts, call_id, name, is_error, truncated, content}

const fs = require('fs');

// Host-injected text that rides a user-role line but is not the user's request:
// Claude Code's <system-reminder>, <local-command-stdout> / <command-name>
// slash-command lines, Codex's <environment_context> / <user_instructions>
// preamble. It neither opens a turn nor becomes a task (#71 item 8: a preamble
// that reset the turn would overwrite the real task).
const MACHINE_TEXT_RE = /^\s*<(system-reminder|environment_context|user_instructions|local-command-stdout|command-name)\b/i;

function isMachineText(text) {
  return MACHINE_TEXT_RE.test(String(text || ''));
}

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

  // Turn scope (#71 item 8): the claim check compares ONE task with ONE turn's events.
  // The task used to be the first user text in the whole transcript while
  // `events` accumulated every turn, so a multi-turn session compared the
  // opening request against the last turn's tool results. A genuine user text
  // message opens a new turn: reset the events and take the new task. Tool
  // results are user-role lines too, but they carry no text block, so they
  // never reset.
  let events = [];
  const callNames = Object.create(null);   // tool_use_id -> tool name
  let task = null;
  let closing = '';
  let toolResultCount = 0;
  // One place opens a turn, so the Claude and Codex branches cannot drift.
  // The closing text is the previous turn's "claim" side, so it resets with
  // the events: otherwise turn 2's task pairs with turn 1's last answer.
  function openTurn(text) { events = []; task = text; closing = ''; }
  entries.forEach(function (e, i) {
    const ts = typeof e.timestamp === 'string' ? e.timestamp : null;
    const msg = e.message && typeof e.message === 'object' ? e.message : {};
    const content = msg.content;

    // Codex rollout shape (#71, PR #97 review): every conversation item is
    // wrapped as {type:'response_item', payload:{...}} with prompt/completion
    // style names, so the Claude-shaped branches below never matched and the
    // transcript check saw an empty transcript on Codex. Map the four shapes
    // the rollout documents - message / function_call / function_call_output -
    // onto the same events. reasoning, session_meta, turn_context and event_msg
    // lines carry no tool or message content this adapter consumes.
    if (e.type === 'response_item' && e.payload && typeof e.payload === 'object') {
      const p = e.payload;
      if (p.type === 'message') {
        const isUser = p.role === 'user';
        if (p.role !== 'user' && p.role !== 'assistant') return; // system/developer preamble
        const texts = [];
        for (const b of (Array.isArray(p.content) ? p.content : [])) {
          if (b && typeof b === 'object' &&
            (b.type === 'input_text' || b.type === 'output_text' || b.type === 'text') &&
            typeof b.text === 'string' && b.text.trim() && !isMachineText(b.text)) texts.push(b.text);
        }
        if (texts.length === 0) return;
        if (isUser) openTurn(texts[0]);
        for (const t of texts) events.push({ type: 'message', ts: ts, text: t });
        if (!isUser) closing = texts.join('\n');
        return;
      }
      if (p.type === 'function_call' || p.type === 'custom_tool_call') {
        const cid = typeof p.call_id === 'string' ? p.call_id : null;
        const name = typeof p.name === 'string' ? p.name : null;
        if (cid !== null && callNames[cid] === undefined) callNames[cid] = name;
        let args = {};
        if (typeof p.arguments === 'string') {
          try {
            const parsed = JSON.parse(p.arguments);
            if (parsed && typeof parsed === 'object') args = parsed;
          } catch (err) { args = { _raw: p.arguments }; }
        } else if (p.arguments && typeof p.arguments === 'object') {
          args = p.arguments;
        }
        events.push({ type: 'tool_call', ts: ts, call_id: cid, name: name, arguments: args });
        return;
      }
      if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
        const cid = typeof p.call_id === 'string' ? p.call_id : null;
        const out = p.output;
        const text = typeof out === 'string'
          ? out
          : (out == null ? '' : (Array.isArray(out) ? textOf(out) : JSON.stringify(out)));
        events.push({
          type: 'tool_result', ts: ts, call_id: cid,
          name: (cid !== null ? callNames[cid] : null) || null,
          is_error: p.is_error === true || (out && typeof out === 'object' && out.success === false),
          truncated: false,
          content: text,
        });
        toolResultCount += 1;
        return;
      }
      return;
    }

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
      const textBlocks = blocks.filter(function (b) {
        return b && typeof b === 'object' && b.type === 'text' &&
          typeof b.text === 'string' && b.text.trim() && !isMachineText(b.text);
      });
      if (textBlocks.length > 0) openTurn(textBlocks[0].text); // new turn: previous events do not pair with this task
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
          toolResultCount += 1;
        } else if (b.type === 'text' && typeof b.text === 'string' && b.text.trim() && !isMachineText(b.text)) {
          events.push({ type: 'message', ts: ts, text: b.text });
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
      // Whole-file count: the turn-scoped `events` array is what the claim check
      // reads, but the stats describe the transcript that was parsed.
      tool_results: toolResultCount,
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
