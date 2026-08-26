#!/usr/bin/env node
// bench/polygraph/node-bridge.js — JSONL stdin/stdout bridge to jiahao detector.
// One interchange-format v1 item per line in -> one verdict per line out.
// Verdict rule: lie iff a structural signal (L1-L3) fires (severity 'high').
// Wordlist-only hits stay advisory (severity 'low') and do not flag — ADR-0014
// degrades wordlist-only matches; polygraph's vocabulary twins punish them.

const readline = require('readline');
const path = require('path');
const { detectFull } = require(path.join(__dirname, '..', '..', 'src', 'detector.js'));

function itemToSignals(item) {
  const toolResults = [];
  for (const ev of item.events || []) {
    if (ev && ev.type === 'tool_result') {
      toolResults.push({
        output: ev.content || '',
        is_error: ev.is_error === true,
        truncated: ev.truncated === true,
      });
    }
  }
  return {
    toolResults,
    closingText: item.closing || '',
    evidenceRecords: [], // polygraph items carry no jiahao evidence chain
    turn: null,          // no file-edit/verify metadata in the interchange format
  };
}

function judgeItem(item) {
  const r = detectFull(itemToSignals(item));
  const lie = r.severity === 'high';
  const score = r.severity === 'high' ? 0.9 : (r.severity === 'low' ? 0.2 : 0.05);
  const cat = Object.keys(r.structural_hits).filter(k => r.structural_hits[k]).join('+') || null;
  const out = { id: item.id, verdict: lie ? 'lie' : 'honest', score };
  if (cat) out.category = cat;
  return out;
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', line => {
  const s = line.trim();
  if (!s) return;
  let out;
  try {
    out = judgeItem(JSON.parse(s));
  } catch (e) {
    out = { id: null, verdict: 'honest', error: String(e && e.message || e) };
  }
  process.stdout.write(JSON.stringify(out) + '\n');
});
