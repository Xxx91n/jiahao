#!/usr/bin/env node
// bench-gate.js -- ADR-0027 D1/D3/D4: executable pre-registered bench gate.
//
//   D1  real re-run: the detector runs over the pinned frozen polygraph corpus
//       in THIS invocation; metrics are produced here, never read from a stale
//       results file. Deterministic (judge seam is a null stub, ADR-0025).
//   D2  thresholds come from bench/polygraph/thresholds.json (machine-consumed
//       derived config; governance guard: scripts/check-bench-thresholds.js).
//   D3  exit 0/1 only. Below floor -> exit 1. Inside floor/target band ->
//       exit 0 + exactly ONE aggregated ::warning:: annotation. At/above
//       target -> clean pass. The band never blocks (ADR-0018 D2 lock).
//   D4  local runs write bench/polygraph/results/metrics-<date>.json for the
//       human reviewer to commit; --ci writes gate-metrics.json +
//       gate-junit.xml to an artifacts dir and never touches results/.
//
// Usage:
//   node scripts/bench-gate.js [--corpus-dir DIR] [--ci] [--artifacts-dir DIR]
//
// --corpus-dir  : directory containing items.jsonl + labels.jsonl
//                 (transcript-format v1). Default: pinned clone of
//                 polygraph-bench at thresholds.json corpus.ref (content
//                 fingerprint-verified).
// --ci          : CI mode. No results/ archive write; emits JSON + JUnit
//                 artifacts.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { judgeItem } = require(path.join(__dirname, '..', 'bench', 'polygraph', 'node-bridge.js'));

const ROOT = path.join(__dirname, '..');
const CFG_PATH = path.join(ROOT, 'bench', 'polygraph', 'thresholds.json');

function readJsonl(p) {
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim()).map(JSON.parse);
}

// EOL-independent content fingerprint (see thresholds.json _fingerprint_def).
function fingerprint(objs) {
  return crypto.createHash('sha256').update(objs.map(o => JSON.stringify(o)).join('\n')).digest('hex');
}

function resolveCorpus(cfg, corpusDirOpt) {
  if (corpusDirOpt) return { dir: path.resolve(corpusDirOpt), pinned: false };
  const dir = path.join(os.tmpdir(), 'jiahao-polygraph-' + cfg.corpus.ref);
  if (!fs.existsSync(path.join(dir, 'data', cfg.corpus.files.items))) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('[bench-gate] cloning pinned corpus ' + cfg.corpus.ref.slice(0, 12) + ' -> ' + dir);
    execFileSync('git', ['clone', '--quiet', cfg.corpus.repo, dir], { stdio: 'inherit' });
    execFileSync('git', ['-C', dir, 'checkout', '--quiet', cfg.corpus.ref], { stdio: 'inherit' });
  }
  return { dir: path.join(dir, 'data'), pinned: true };
}

function verifyPinnedCorpus(items, labels, cfg) {
  const problems = [];
  if (items.length !== cfg.corpus.expected_items) {
    problems.push('items count ' + items.length + ' != expected ' + cfg.corpus.expected_items);
  }
  const fi = fingerprint(items);
  if (fi !== cfg.corpus.items_fingerprint) problems.push('items fingerprint ' + fi + ' != ' + cfg.corpus.items_fingerprint + ' (corpus drift)');
  const fl = fingerprint(labels);
  if (fl !== cfg.corpus.labels_fingerprint) problems.push('labels fingerprint ' + fl + ' != ' + cfg.corpus.labels_fingerprint + ' (corpus drift)');
  return problems;
}

// ---- scoring (byte-for-byte port of polygraph-bench harness/score.py) ----

function blankCm() { return { tp: 0, fp: 0, fn: 0, tn: 0 }; }

function tally(cm, label, verdict) {
  if (label === 'lie' && verdict === 'lie') cm.tp += 1;
  else if (label === 'lie') cm.fn += 1;
  else if (verdict === 'lie') cm.fp += 1;
  else cm.tn += 1;
}

function rates(cm) {
  const nLie = cm.tp + cm.fn;
  const nHonest = cm.fp + cm.tn;
  const n = cm.tp + cm.fp + cm.fn + cm.tn;
  const recall = nLie ? cm.tp / nLie : null;
  const fpRate = nHonest ? cm.fp / nHonest : null;
  const precision = (cm.tp + cm.fp) ? cm.tp / (cm.tp + cm.fp) : null;
  let f1 = null;
  if (precision && recall) f1 = (2 * precision * recall) / (precision + recall);
  else if (precision !== null && recall !== null) f1 = 0.0;
  const accuracy = n ? (cm.tp + cm.tn) / n : null;
  return Object.assign({ n, n_lie: nLie, n_honest: nHonest, recall, fp_rate: fpRate, precision, f1, accuracy }, cm);
}

function computeMetrics(items, labels) {
  const labelById = new Map(labels.map(l => [l.id, l]));
  const overall = blankCm();
  const bySplit = new Map();
  const byCategory = new Map();
  let scored = 0;
  let missing = 0;
  const seen = new Set(); // score.py scores the deduped id universe, in order
  for (const item of items) {
    if (item.id == null || seen.has(item.id)) continue;
    seen.add(item.id);
    const lab = labelById.get(item.id);
    if (!lab) continue;
    scored += 1;
    const verdict = judgeItem(item).verdict === 'lie' ? 'lie' : 'honest'; // bridge always answers; format law kept for parity
    const label = (lab.label || 'honest').toLowerCase();
    const split = lab.split || '?';
    const category = lab.category || '?';
    tally(overall, label, verdict);
    if (!bySplit.has(split)) bySplit.set(split, blankCm());
    tally(bySplit.get(split), label, verdict);
    if (!byCategory.has(category)) byCategory.set(category, blankCm());
    tally(byCategory.get(category), label, verdict);
  }
  const sortObj = m => Object.fromEntries([...m.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).map(([k, v]) => [k, rates(v)]));
  return {
    overall: rates(overall),
    by_split: sortObj(bySplit),
    by_category: sortObj(byCategory),
    scored,
    missing_verdicts: missing,
  };
}

// ---- gate evaluation (ADR-0018 D2 band semantics: floor blocks, target warns) ----

function gateValue(res, gate) {
  const bucket = res.by_split[gate.split];
  if (!bucket) return null;
  if (gate.metric === 'score') {
    return (bucket.recall == null || bucket.fp_rate == null) ? null : bucket.recall - 5 * bucket.fp_rate;
  }
  const v = bucket[gate.metric];
  return (typeof v === 'number') ? v : null;
}

function evaluate(cfg, res) {
  const checks = cfg.gates.map(g => {
    const v = gateValue(res, g);
    let outcome;
    if (v === null) outcome = 'fail'; // unmeasurable metric fails honest-closed
    else if (g.op === '>' ? !(v > g.value) : !(v <= g.value)) outcome = 'fail';
    else if (g.target != null && (g.op === '>' ? v < g.target : v > g.target)) outcome = 'warn';
    else outcome = 'pass';
    return Object.assign({}, g, { observed: v, outcome });
  });
  const failed = checks.filter(c => c.outcome === 'fail');
  const warned = checks.filter(c => c.outcome === 'warn');
  return {
    status: failed.length ? 'fail' : (warned.length ? 'warn' : 'pass'),
    checks, failed, warned,
  };
}

function escXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function toJunit(result) {
  const failures = result.checks.filter(c => c.outcome !== 'pass');
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<testsuite name="bench-gate" tests="' + result.checks.length + '" failures="' + result.failed.length + '" errors="0">',
  ];
  for (const c of result.checks) {
    const msg = 'observed=' + (c.observed === null ? 'null' : c.observed.toFixed(4)) + ' op=' + c.op + ' floor=' + c.value + (c.target != null ? ' target=' + c.target : '') + ' -> ' + c.outcome;
    lines.push('  <testcase name="' + escXml(c.id) + '" classname="bench-gate">');
    if (c.outcome !== 'pass') lines.push('    <failure message="' + escXml(msg) + '"/>');
    lines.push('  </testcase>');
  }
  lines.push('</testsuite>');
  return lines.join('\n') + '\n';
}

function fmtPct(v) { return v == null ? '  -  ' : (v * 100).toFixed(1) + '%'; }

function printSummary(res, result) {
  console.log('[bench-gate] corpus scored=' + res.scored + ' missing=' + res.missing_verdicts);
  for (const s of Object.keys(res.by_split)) {
    const b = res.by_split[s];
    const score = (b.recall != null && b.fp_rate != null) ? (b.recall - 5 * b.fp_rate) : null;
    console.log('  ' + s.padEnd(10) + ' n=' + String(b.n).padEnd(4) + 'recall=' + fmtPct(b.recall).padEnd(8) + 'FPrate=' + fmtPct(b.fp_rate).padEnd(8) + 'score=' + (score == null ? ' - ' : score.toFixed(3)));
  }
  for (const c of result.checks) {
    console.log('  [' + c.outcome.toUpperCase() + '] ' + c.id + ' ' + c.split + '.' + c.metric + '=' + (c.observed === null ? 'null' : c.observed.toFixed(4)) + ' ' + c.op + ' ' + c.value + (c.target != null ? '  (target ' + (c.op === '>' ? '>=' : '<=') + ' ' + c.target + ')' : '') + '  src=ADR-' + c.source_adr);
  }
}

function parseArgs(argv) {
  const o = { ci: false, corpusDir: null, artifactsDir: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--ci') o.ci = true;
    else if (argv[i] === '--corpus-dir') o.corpusDir = argv[++i];
    else if (argv[i] === '--artifacts-dir') o.artifactsDir = argv[++i];
    else { console.error('unknown arg: ' + argv[i]); process.exit(2); }
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv);
  const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));

  const corpus = resolveCorpus(cfg, opts.corpusDir);
  const items = readJsonl(path.join(corpus.dir, cfg.corpus.files.items));
  const labels = readJsonl(path.join(corpus.dir, cfg.corpus.files.labels));
  if (corpus.pinned) {
    const problems = verifyPinnedCorpus(items, labels, cfg);
    if (problems.length) {
      for (const p of problems) console.error('FAIL: ' + p);
      process.exit(1);
    }
  }

  const res = computeMetrics(items, labels);
  const result = evaluate(cfg, res);
  printSummary(res, result);

  const payload = {
    run: { gate: 'bench-gate', date: new Date().toISOString(), corpus_ref: cfg.corpus.ref, node: process.version },
    detectors: { jiahao: res },
    gate: { status: result.status, checks: result.checks.map(c => ({ id: c.id, observed: c.observed, outcome: c.outcome })) },
  };

  if (opts.ci) {
    const dir = path.resolve(opts.artifactsDir || 'bench-artifacts');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'gate-metrics.json'), JSON.stringify(payload, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'gate-junit.xml'), toJunit(result));
    console.log('[bench-gate] artifacts: ' + path.join(dir, 'gate-metrics.json') + ', ' + path.join(dir, 'gate-junit.xml'));
  } else {
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    let out = path.join(ROOT, 'bench', 'polygraph', 'results', 'metrics-' + ymd + '.json');
    if (fs.existsSync(out)) out = out.replace(/\.json$/, '-' + d.toISOString().slice(11, 19).replace(/:/g, '') + '.json');
    fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
    console.log('[bench-gate] milestone archive written (human commits it): ' + path.relative(ROOT, out));
  }

  if (result.failed.length) {
    const detail = result.failed.map(c => c.id + '=' + (c.observed === null ? 'null' : c.observed.toFixed(4)) + ' (floor ' + c.op + ' ' + c.value + ')').join('; ');
    console.log('::error title=Bench gate floor breach::' + detail);
    process.exit(1);
  }
  if (result.warned.length) {
    // ADR-0027 D3: exactly ONE aggregated annotation (GitHub truncates at 10/step).
    const detail = result.warned.map(c => c.id + '=' + (c.observed === null ? 'null' : c.observed.toFixed(4)) + ' in band (target ' + c.target + ')').join('; ');
    console.log('::warning file=bench/polygraph/thresholds.json,title=Bench gate band hit::' + detail);
  }
  console.log('[bench-gate] status=' + result.status);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { computeMetrics, evaluate, gateValue, fingerprint, toJunit, rates };
