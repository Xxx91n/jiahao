#!/usr/bin/env node
'use strict';
// scripts/corrigendum-v3.js — ADR-0070 F-A1 corrigendum: re-render the v3
// report's DETAIL SECTIONS from the authoritative burned report.json into
// bench/research/out/devin-oot-v3-report.md. The single-shot adjudication is
// burned — this script NEVER re-runs anything and NEVER writes a frozen
// artifact (report.json / manifest / items.jsonl untouched); it repairs the
// markdown rendering only, inside an explicit corrigendum marker block.
//
// Idempotent: the marker block is replaced wholesale on each run; a clean
// tree means 'already in sync' -> exit 0 with 'unchanged'.
//
// Usage: node scripts/corrigendum-v3.js [--check]
//   --check  verify the md already matches the re-render (exit 1 on drift)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const REPORT_JSON = path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.json');
const REPORT_MD = path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.md');
const MARK_BEGIN = '<!-- corrigendum: ADR-0070 F-A1 - rendered from authoritative report.json; verdicts and frozen artifacts untouched -->';
const MARK_END = '<!-- /corrigendum -->';

function j(v) { return JSON.stringify(v); }
function ci(a) { return '[' + a.ci95.lower.toFixed(6) + ', ' + a.ci95.upper.toFixed(6) + ']'; }

function renderDetail(rep) {
  const m = rep.metrics;
  const L = [];
  L.push(MARK_BEGIN);
  L.push('## Confusion matrix (main set, n=120)');
  L.push('');
  L.push('| tp | fn | fp | tn |');
  L.push('|---|---|---|---|');
  L.push('| ' + m.confusion.tp + ' | ' + m.confusion.fn + ' | ' + m.confusion.fp + ' | ' + m.confusion.tn + ' |');
  L.push('');
  L.push('## FP detail (main set)');
  L.push('');
  const es = m.exit_report_sub_item;
  const fpAxis = rep.decision.axes.fp;
  L.push('fp_count=' + m.fp_count + ' of ' + m.confusion.tn + ' honest items (CI95 ' + ci(fpAxis) + ' < the ' + fpAxis.bound + ' usability bound); concentration trigger (any single family supplying >=60% of FP): ' + (m.fp_concentration_trigger.fired ? 'fired' : 'not fired') + ' — descriptive escalation, never a verdict input.');
  L.push('exit-report named descriptive sub-item: check=' + es.check + ', n=' + es.n + ', lie=' + es.lie + ', hits=' + es.hits + ', fp=' + es.fp + ', share_of_fp=' + j(es.share_of_fp) + '.');
  L.push('');
  L.push('## Categorical breakdown (per family, main set)');
  L.push('');
  L.push('| family | n | lie | hits | honest | fp | undetermined |');
  L.push('|---|---|---|---|---|---|---|');
  for (const f of Object.keys(m.by_family)) {
    const b = m.by_family[f];
    L.push('| ' + f + ' | ' + b.n + ' | ' + b.lie + ' | ' + b.hits + ' | ' + b.honest + ' | ' + b.fp + ' | ' + b.undetermined + ' |');
  }
  L.push('');
  L.push('## Session and batch distribution (main set)');
  L.push('');
  const s = m.session_sensitivity;
  const sessions = Object.keys(s.per_session);
  L.push('Sessions: ' + s.n_sessions + ' (main set; items.jsonl carries ' + (sessions.length + 4) + ' session ids — 4 side sessions stay outside the main tables), max ' + s.max_items_per_session + ' items/session (cap honored).');
  L.push('');
  L.push('| session | items | lie | hits | honest | fp |');
  L.push('|---|---|---|---|---|---|');
  for (const sid of sessions) {
    const p = s.per_session[sid];
    L.push('| ' + sid + ' | ' + p.items + ' | ' + p.lie + ' | ' + p.hits + ' | ' + p.honest + ' | ' + p.fp + ' |');
  }
  L.push('');
  L.push('Batches (main set):');
  L.push('');
  L.push('| batch | items | lie | hits | honest | fp |');
  L.push('|---|---|---|---|---|---|');
  for (const b of Object.keys(m.batch_slice)) {
    const p = m.batch_slice[b];
    L.push('| ' + b + ' | ' + p.items + ' | ' + p.lie + ' | ' + p.hits + ' | ' + p.honest + ' | ' + p.fp + ' |');
  }
  L.push('');
  L.push('## Honest-ratio, undetermined and side-set diagnostics');
  L.push('');
  L.push('- Honest task-succeeded ratio (main set): ' + m.honest_success.succeeded + '/' + (m.honest_success.succeeded + m.honest_success.failed) + ' succeeded, ' + m.honest_success.failed + ' failed.');
  L.push('- undetermined: ' + m.undetermined.n + ' of 120 main items (rate ' + m.undetermined.rate.toFixed(6) + '; ' + m.undetermined.rule + ').');
  L.push('- Stress side-set (' + m.side_set_diagnostic.note + '): ' + m.side_set_diagnostic.fp + '/' + m.side_set_diagnostic.n + ' flagged (fp_rate ' + m.side_set_diagnostic.fp_rate + ') — descriptive only, NEVER in either table.');
  L.push('- Port divergence (zero-verdict telemetry port, disclosure only — never a verdict input): flagged-pairer/honest-port ' + m.port_divergence.flagged_pairer_honest_port + ', unflagged-pairer/flag-port ' + m.port_divergence.unflagged_pairer_flag_port + ' over ' + m.port_divergence.scored + ' scored.');
  L.push(MARK_END);
  return L.join('\n') + '\n';
}

function splice(md, block) {
  const bi = md.indexOf(MARK_BEGIN);
  const ei = md.indexOf(MARK_END);
  if (bi !== -1 && ei !== -1 && ei > bi) {
    return md.slice(0, bi) + block + md.slice(ei + MARK_END.length).replace(/^\n+/, '\n');
  }
  const anchor = '\n## Per-item results\n';
  const ai = md.indexOf(anchor);
  if (ai === -1) throw new Error('corrigendum anchor missing: expected "## Per-item results" section');
  return md.slice(0, ai + 1) + block + '\n' + md.slice(ai + 1);
}

function main() {
  const rep = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));
  const md = fs.readFileSync(REPORT_MD, 'utf8');
  const block = renderDetail(rep).replace(/\.\.\./g, '…'); // unicode ellipsis policy
  const next = splice(md, block);
  const check = process.argv.indexOf('--check') !== -1;
  if (next === md) {
    console.log('[corrigendum-v3] unchanged: detail sections already match report.json');
    process.exit(0);
  }
  if (check) {
    console.error('[corrigendum-v3] FAIL: devin-oot-v3-report.md detail sections drift from report.json — run node scripts/corrigendum-v3.js');
    process.exit(1);
  }
  fs.writeFileSync(REPORT_MD, next);
  console.log('[corrigendum-v3] re-rendered detail sections into devin-oot-v3-report.md (report.json sha256 ' + crypto.createHash('sha256').update(fs.readFileSync(REPORT_JSON)).digest('hex').slice(0, 16) + ' untouched)');
  process.exit(0);
}

if (require.main === module) main();
