#!/usr/bin/env node
'use strict';
// scripts/coinage-triage.js - the CLI of the Unregistered-Coinage Triage
// Channel (收词分诊通道), ADR-0098 / ADR-0103 D-C.
//
// Dual-tier enforcement contract (ADR-0103 D-C):
// - avoid tier: blocking CI gate (exit 1 if unsuppressed hits appear on mandatory face)
// - avoid-unless tier: advisory census (exit 0)
// Non-zero exit (2) is reserved for its own usage/IO errors.
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
  'Generator-side census of the five statutory surfaces (ledgers, reports,',
  'ADRs, AGENTS.md, CONTEXT.md). Avoid-tier findings on the mandatory face',
  'cause exit 1 (CI gate, ADR-0103 D-C); avoid-unless findings are advisory (exit 0).',
  '',
  'options:',
  '  --root <path>       tree to scan (default: this repo)',
  '  --min-count <N>     candidate frequency floor, integer >= 1 (default: ' + ct.DEFAULT_MIN_COUNT + ')',
  '  --json              emit the machine-readable report instead of the list',
  '  --footer <file>     print exactly one prose-density footer line for <file>',
  '  --help              this text',
  '',
  'exit codes: 0 = ran (findings clean or advisory-only / avoid-unless);',
  '            1 = avoid-tier findings present on mandatory face (enforced CI gate, ADR-0103 D-C);',
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
  let spec = null;
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
    } else if (a === '--spec') { spec = path.resolve(flagValue(argv, i, '--spec')); i++; }
    else if (a === '--footer') { footer = path.resolve(flagValue(argv, i, '--footer')); i++; }
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
  try { report = ct.scanTree(root, { minCount: minCount, disciplineSpec: spec }); }
  catch (e) { fail('scan failed (IO): ' + e.message); }
  console.log(json ? JSON.stringify(report, null, 2) : ct.renderAdvisory(report));

  // Same-token double-definition check (r3 D-003②): the spec itself must not
  // split one token across two live rows. Advisory disclosure in stdout; the
  // table owner merges the rows through a change ticket.
  let dupSpec = null;
  try { dupSpec = ct.loadLanguageDiscipline(root, spec); } catch (e) { dupSpec = null; }
  const dups = ct.duplicateTokenDefinitions(dupSpec);
  if (dups.length > 0 && !json) {
    console.log('substitution face - same-token double definitions (r3 D-003②, advisory):');
    for (const d of dups) {
      console.log('  [double-definition] token ' + JSON.stringify(d.token) + ' claimed by substitution_table rows ' + d.firstIndex + ' and ' + d.secondIndex + ' (' + JSON.stringify(d.firstRow) + ' / ' + JSON.stringify(d.secondRow) + ')');
    }
  }

  // ADR-0103 D-C / D-013: avoid tier hits on the mandatory face cause exit ≠ 0 (exit 1).
  // avoid-unless findings are always advisory (exit 0).
  const unsuppressedAvoid = (report.substitutionFace && report.substitutionFace.findings)
    ? report.substitutionFace.findings.filter(function (f) {
        return f.tier === 'avoid' && !f.suppressed;
      })
    : [];
  if (unsuppressedAvoid.length > 0) {
    process.exit(1);
  }
}

// Exit code protocol (ADR-0103 D-C):
// exit 0: clean or advisory-only findings (avoid-unless)
// exit 1: unsuppressed avoid-tier findings on mandatory face (handled above)
// exit 2: usage/IO errors of the tool itself
if (require.main === module) {
  try { main(); } catch (e) { fail(e.message); }
  process.exit(0);
}
