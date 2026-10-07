#!/usr/bin/env node
'use strict';
// scripts/coinage-triage.js - the CLI of the Unregistered-Coinage Triage
// Channel (收词分诊通道), ADR-0098 D-C / D-E, grill-t39 D-004.3/.5 + D-005.1.
//
// GENERATOR-SIDE ADVISORY ONLY: this tool is NOT a gate leg - it is absent
// from docs/gates.json, no verifier leg requires it, and it never exits
// non-zero for style findings. Non-zero exit (2) is reserved for its own
// usage/IO errors, which is also why requireCapabilities is not called: the
// capability registry is a gate-leg surface and this is not a leg (ADR-0098
// D-G: "does a blocking leg exist at all: explicitly no").
//
// Determinism contract (shared core header, ADR-0098 registered transfer):
// pure regex + sentence-splitting over bytes; no model, no randomness, no
// wall-clock in the output; the same tree prints byte-identical stdout.

const fs = require('fs');
const path = require('path');
const ct = require('./shared/coinage-triage.js');

const USAGE = [
  'usage: node scripts/coinage-triage.js [options]',
  '',
  'Unregistered-Coinage Triage Channel (收词分诊通道) - ADR-0098.',
  'ADVISORY generator-side census of the five statutory surfaces (ledgers,',
  'reports, ADRs, AGENTS.md, CONTEXT.md). It reports frequency, breadth and',
  'lifecycle state; the load-bearing axis and every verdict stay with the',
  'owner. This tool is never a gate leg and never blocks.',
  '',
  'options:',
  '  --root <path>       tree to scan (default: this repo)',
  '  --min-count <N>     candidate frequency floor, integer >= 1 (default: ' + ct.DEFAULT_MIN_COUNT + ')',
  '  --json              emit the machine-readable report instead of the list',
  '  --footer <file>     print exactly one prose-density footer line for <file>',
  '  --help              this text',
  '',
  'exit codes: 0 = ran (findings included - advisory, never blocking);',
  '            2 = usage or IO error of the tool itself.',
].join('\n');

function fail(msg) {
  console.error('[coinage-triage] ' + msg);
  process.exit(2);
}

function flagValue(argv, i, name) {
  const v = argv[i + 1];
  if (v === undefined || v.indexOf('--') === 0) fail(name + ' needs a value');
  return v;
}

function main() {
  const argv = process.argv.slice(2);
  let root = path.join(__dirname, '..');
  let minCount = ct.DEFAULT_MIN_COUNT;
  let json = false;
  let footer = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help') { console.log(USAGE); return; }
    else if (a === '--json') json = true;
    else if (a === '--root') { root = path.resolve(flagValue(argv, i, '--root')); i++; }
    else if (a === '--min-count') {
      const n = Number(flagValue(argv, i, '--min-count'));
      if (!Number.isInteger(n) || n < 1) fail('--min-count needs an integer >= 1');
      minCount = n;
      i++;
    } else if (a === '--footer') { footer = path.resolve(flagValue(argv, i, '--footer')); i++; }
    else fail('unknown flag: ' + a);
  }

  if (footer !== null) {
    let text;
    try { text = fs.readFileSync(footer, 'utf8'); }
    catch (e) { fail('cannot read footer file: ' + e.message); }
    console.log(ct.renderFooterLine(ct.proseCountsOfText(text)));
    return;
  }

  let report;
  try { report = ct.scanTree(root, { minCount: minCount }); }
  catch (e) { fail('scan failed (IO): ' + e.message); }
  console.log(json ? JSON.stringify(report, null, 2) : ct.renderAdvisory(report));
}

// Findings never change the exit code (advisory, never blocking): every
// process.exit path here is a usage/IO error (2) or the plain success 0.
if (require.main === module) {
  try { main(); } catch (e) { fail(e.message); }
  process.exit(0);
}
