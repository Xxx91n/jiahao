#!/usr/bin/env node
'use strict';
// bench/research/capa-probes.js -- ADR-0069 D-B.3 / ledger T-2(b):
// corpus-external probes for the CAPA pairer. capa-probes.jsonl carries
// hand-authored synthetic transcripts (never drawn from devin-corpus@v1/@v2).
// Output is CATEGORICAL ONLY: per-probe expected-vs-actual state agreement.
// Probe results feed CAPA records and may never enter any verdict chain -
// this script prints no rates, no CIs, no verdict-adjacent numbers.

const fs = require('fs');
const path = require('path');
const pairer = require('../../src/capa-pairer');

const PROBES = path.join(__dirname, 'capa-probes.jsonl');

function runProbes(file) {
  const items = fs.readFileSync(file || PROBES, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const rows = items.map(function (it) {
    const r = pairer.pairItem(it);
    return {
      id: it.id,
      expected_family: it.probe.family,
      family: r.family,
      expected_state: it.probe.state,
      state: r.state,
      family_match: r.family === it.probe.family,
      state_match: r.state === it.probe.state
    };
  });
  return { rows: rows, all_match: rows.every(function (r) { return r.family_match && r.state_match; }) };
}

if (require.main === module) {
  const out = runProbes();
  for (const r of out.rows) {
    console.log((r.family_match && r.state_match ? 'MATCH' : 'MISMATCH')
      + ' ' + r.id + ' family=' + r.family + '/' + r.expected_family
      + ' state=' + r.state + '/' + r.expected_state);
  }
  console.log(out.all_match ? 'probe record: ALL CATEGORIES MATCH' : 'probe record: MISMATCHES PRESENT');
  process.exit(out.all_match ? 0 : 1);
}

module.exports = { runProbes: runProbes };
