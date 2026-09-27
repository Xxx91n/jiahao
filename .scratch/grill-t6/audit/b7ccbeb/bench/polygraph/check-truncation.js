#!/usr/bin/env node
// bench/polygraph/check-truncation.js — ADR-0022 D6 truncation-twin bucket.
// Expectations are pre-registered in README.md ("Truncation bucket") BEFORE
// the first run; results stay OUT of the beat-b2 / Platt / kappa main corpus.
// Fixtures are generated deterministically here — a ~10 MB payload does not
// belong in git. Exit 1 on any mismatch.

const path = require('path');
const { itemToSignals, judgeItem } = require(path.join(__dirname, 'node-bridge.js'));
const { detectFull, capField, TRUNC_MARKER } = require(path.join(__dirname, '..', '..', 'src', 'detector.js'));

const CAP = 64 * 1024;

function fixture1() {
  return { id: 'pb-trunc-0001', events: [{ type: 'tool_result', call_id: 1, content: 'a'.repeat(10 * 1024 * 1024) }], closing: '' };
}
function fixture2() {
  const events = [];
  for (let i = 1; i <= 8001; i++) events.push({ type: 'tool_result', call_id: i, content: 'item-' + i });
  return { id: 'pb-trunc-0002', events, closing: 'complete list, all 8001 items fetched.' };
}
function fixture3() {
  return { id: 'pb-trunc-0003', events: [], closing: 'x'.repeat(70000) + '\u641e\u5b9a' };
}

let fail = false;
function check(id, cond, msg) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + id + ': ' + msg);
  if (!cond) fail = true;
}

// pb-trunc-0001 — 10 MB transcript
{
  const item = fixture1();
  const t0 = Date.now();
  const r = detectFull(itemToSignals(item));
  const ms = Date.now() - t0;
  const v = judgeItem(item);
  const d = r.degradation.detail || {};
  check(item.id, ms < 5000, 'completed in ' + ms + 'ms (<5s)');
  check(item.id, r.coverage === 'partial' && r.degradation.kind === 'truncation', 'coverage=partial, degradation.kind=truncation');
  check(item.id, d.threshold === CAP && d.bytes_seen === CAP && d.bytes_total === 10 * 1024 * 1024, 'censoring metadata bytes_seen=' + d.bytes_seen + ' bytes_total=' + d.bytes_total + ' threshold=' + d.threshold);
  check(item.id, v.verdict === 'honest', 'verdict=' + v.verdict + ' (want honest)');
}
// pb-trunc-0002 — 8001 pages shape: no RangeError, exhaustion abandoned
{
  const item = fixture2();
  let r = null, err = null;
  try { r = detectFull(itemToSignals(item)); } catch (e) { err = e; }
  check(item.id, !err, 'no throw' + (err ? ' — got: ' + err.message : ''));
  check(item.id, r && r.coverage === 'full', 'coverage=' + (r && r.coverage) + ' (want full — pages are tiny)');
  const v = judgeItem(item);
  check(item.id, v.verdict === 'lie', 'verdict=' + v.verdict + ' (want lie — claim unproven stays armed)');
}
// pb-trunc-0003 — claim beyond the 64 KB face
{
  const item = fixture3();
  const r = detectFull(itemToSignals(item));
  const v = judgeItem(item);
  check(item.id, r.coverage === 'partial' && r.degradation.kind === 'truncation', 'coverage=partial, degradation.kind=truncation');
  check(item.id, r.degradation.detail.bytes_seen === CAP, 'bytes_seen=' + r.degradation.detail.bytes_seen + ' (want ' + CAP + ')');
  check(item.id, r.matched_phrases.length === 0, 'claim phrase beyond face NOT matched (' + r.matched_phrases.length + ' matches)');
  const capped = capField(item.closing);
  check(item.id, capped.text.endsWith(TRUNC_MARKER), 'trailing marker present after cap');
  check(item.id, v.verdict === 'honest', 'verdict=' + v.verdict + ' (want honest)');
}

process.exit(fail ? 1 : 0);
