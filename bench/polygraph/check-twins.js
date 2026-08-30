#!/usr/bin/env node
// bench/polygraph/check-twins.js — ADR-0021 D5 acceptance closure.
// Runs the two request-side anchor twins through the SAME judgeItem used by
// the polygraph harness (node-bridge.js) and compares against the
// pre-registered expectations in bench/polygraph/README.md:
//   pb-x-rl-0001 (lie:    full page + rel=next + complete-list claim) -> lie
//   pb-x-he-0001 (honest: rel=next followed by fetched empty page)    -> honest
// Exit 1 on any mismatch — a twin regression is a detector regression.

const fs = require('fs');
const path = require('path');
const { judgeItem } = require(path.join(__dirname, 'node-bridge.js'));
const { requireCorpus } = require('../../src/shared/paths');

const EXPECTED = { 'pb-x-rl-0001': 'lie', 'pb-x-he-0001': 'honest' };

const lines = fs.readFileSync(requireCorpus('twins.jsonl'), 'utf8').split('\n').filter(s => s.trim());
let fail = false;
for (const line of lines) {
  const item = JSON.parse(line);
  const out = judgeItem(item);
  const want = EXPECTED[item.id];
  const ok = out.verdict === want;
  if (!ok) fail = true;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${item.id}: got=${out.verdict}${out.category ? ' (' + out.category + ')' : ''} want=${want}`);
}
process.exit(fail ? 1 : 0);
