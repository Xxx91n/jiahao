#!/usr/bin/env node
// scripts/check-mr-probes.js -- ADR-0037 D2/D4: metamorphic-relation corpus gate
// (third corpus family; verdict-symmetry oracle over private/bench-corpus/
// mr-probes.jsonl, ADR-0036 D2 resolution: JIAHAO_CORPUS_DIR -> install-planted
// dir -> repo private dir; missing fails closed (ADR-0041: capability absence
// exits 2, everything else exits 1 with a closed-enum stderr prefix)).
//
//   D2  three pre-registered families: claim-negation, equivalence-restatement,
//       evidence-flip. Preserve pairs require verdict(source) == verdict(followup);
//       flip pairs require inequality. Zero violations to pass (zero-tolerance,
//       same discipline as ADR-0029 D3).
//   D4  thin CLI + pure core: judge logic lives in exported pure functions; jest
//       tests the core, NEVER runs the gate. npm script `mr:gate` is the debug
//       alias; the gates.json entry is the CI form. Local runs archive
//       bench/polygraph/results/mr-metrics-<date>.json (human commits); --ci
//       writes gate-metrics.json + gate-junit.xml into an artifacts dir and
//       never touches results/. MR results NEVER enter the runtime evidence
//       chain (CWE-779).
//
// Thresholds come from bench/polygraph/thresholds.json mr_gates
// (governance: scripts/check-bench-thresholds.js content anchor + coupling).
//
// Usage: node scripts/check-mr-probes.js [--ci] [--artifacts-dir DIR]

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CFG_PATH = path.join(ROOT, 'bench', 'polygraph', 'thresholds.json');
const { requireCorpus } = require('../src/shared/paths');
const { requireCapabilities } = require('../src/shared/capability');

const MR_FAMILIES = ['claim-negation', 'equivalence-restatement', 'evidence-flip'];
const FAMILY_RELATION = { 'claim-negation': 'flip', 'equivalence-restatement': 'preserve', 'evidence-flip': 'flip' };
const ID_RE = /^IL[1-7]-mr-v[0-9]+$/;

// ---- pure core (jest testable, no fs) ----

function runMrPairs(pairs, judgeFn) {
  return pairs.map(p => {
    const judge = (c) => {
      try { return judgeFn(c); }
      catch (e) { return { verdict: 'judge-error', category: String((e && e.message) || e) }; }
    };
    const s = judge(p.source);
    const f = judge(p.followup);
    const passed = FAMILY_RELATION[p.family] === 'preserve'
      ? s.verdict === f.verdict
      : s.verdict !== f.verdict;
    // judge crash is unmeasurable and must never masquerade as a satisfied
    // symmetry (judge-error == judge-error would falsely "pass" a preserve pair)
    const errored = s.verdict === 'judge-error' || f.verdict === 'judge-error';
    return {
      id: p.id, family: p.family, law: p.law, relation: p.relation,
      source_verdict: s.verdict, followup_verdict: f.verdict,
      pass: passed && !errored,
    };
  });
}

// Corpus level fail-closed schema gate. Returns errors ([] = ok).
function validateMrCorpus(pairs) {
  const errors = [];
  if (!Array.isArray(pairs) || pairs.length === 0) return ['corpus missing or empty (fail-closed)'];
  for (const p of pairs) {
    const tag = (p && p.id) || '<no id>';
    if (!p || typeof p !== 'object') { errors.push(tag + ': entry must be an object'); continue; }
    if (typeof p.id !== 'string' || !ID_RE.test(p.id)) errors.push(tag + ': id must match ILx-mr-vN (ADR-0037 D3 naming)');
    if (!MR_FAMILIES.includes(p.family)) errors.push(tag + ': unknown family ' + p.family);
    if (p.relation !== FAMILY_RELATION[p.family]) errors.push(tag + ': relation ' + p.relation + ' inconsistent with family ' + p.family);
    if (typeof p.law !== 'string' || !/^IL[1-7]-/.test(p.law)) errors.push(tag + ': law must be ILx-*');
    if (!p.provenance || typeof p.provenance.transform !== 'string' ||
        !p.provenance.validity_review ||
        typeof p.provenance.validity_review.verdict !== 'string' ||
        typeof p.provenance.validity_review.reviewer !== 'string' ||
        typeof p.provenance.validity_review.date !== 'string') {
      errors.push(tag + ': provenance.transform + validity_review{reviewer,date,verdict} required (ADR-0037 D3: transform validity is human-reviewed)');
    }
    for (const side of ['source', 'followup']) {
      const c = p[side];
      if (!c || typeof c !== 'object' || typeof c.closing !== 'string' || !Array.isArray(c.events)) {
        errors.push(tag + ': ' + side + ' case must carry closing string and events array');
      }
    }
    if (!p.collected_at) errors.push(tag + ': collected_at required (freshness fact, ADR-0036 D5)');
  }
  return errors;
}

function mrMetrics(results) {
  const violations = results.filter(r => !r.pass);
  return {
    total_count: results.length,
    violations: violations.length,
    violation_ids: violations.map(r => r.id),
  };
}

function gateValue(metrics, gate) {
  if (gate.metric === 'mr_violations') return metrics.violations;
  if (gate.metric === 'total_count') return metrics.total_count;
  return null;
}

function evaluateMrGates(gates, metrics) {
  const checks = gates.map(g => {
    const v = gateValue(metrics, g);
    let outcome;
    if (v === null) outcome = 'fail'; // unmeasurable fails honest-closed
    else if (g.op === '>=') outcome = v < g.value ? 'fail' : 'pass';
    else if (g.op === '<=') outcome = v > g.value ? 'fail' : 'pass';
    else if (g.op === '>') outcome = v > g.value ? 'pass' : 'fail';
    else outcome = 'fail'; // unknown op fails honest-closed
    return Object.assign({}, g, { observed: v, outcome });
  });
  const failed = checks.filter(c => c.outcome === 'fail');
  return { status: failed.length ? 'fail' : 'pass', checks, failed, passed: checks.filter(c => c.outcome === 'pass') };
}

// S-1 fail-closed guard: removing/truncating mr_gates must not let the gate
// run gate-free (silent bypass). Fail closed exit 1 [config]: in main (ADR-0041 D3).
function mrGatesConfigError(cfg) {
  if (!cfg || !Array.isArray(cfg.mr_gates) || cfg.mr_gates.length === 0) {
    return 'thresholds.json mr_gates missing or empty (ADR-0037 D4) - refusing fail-open';
  }
  return null;
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toJunitMr(result) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<testsuite name="mr-gate" tests="' + result.checks.length + '" failures="' + result.failed.length + '" errors="0">');
  for (const c of result.checks) {
    lines.push('  <testcase name="' + escXml(c.id) + '" classname="mr-gate">');
    if (c.outcome === 'fail') {
      lines.push('    <failure message="' + escXml('observed=' + c.observed + ' op=' + c.op + ' floor=' + c.value) + '"/>');
    }
    lines.push('  </testcase>');
  }
  lines.push('</testsuite>');
  return lines.join('\n') + '\n';
}

// ---- thin CLI ----

function readJsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(x => x.trim()).map(JSON.parse);
  } catch (e) {
    console.error('[config]: [mr-gate] FAIL-CLOSED: corpus file is not valid JSONL (' + e.message + ')');
    process.exit(1);
  }
}

function parseArgs(argv) {
  const o = { ci: false, artifactsDir: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--ci') o.ci = true;
    else if (argv[i] === '--artifacts-dir') o.artifactsDir = argv[++i];
    else { console.error('[usage]: unknown arg: ' + argv[i]); process.exit(1); }
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv);
  // ADR-0040 D2: capability probing runs before corpus checks and before
  // the judge bridge loads (deferred require below).
  requireCapabilities('mr-probes');
  // Corpus resolution + corpus schema gate run BEFORE loading the judge, so a
  // third-party tree (no bench/ adapter chain) still fails closed with exit 2
  // on the honest missing-corpus message (ADR-0038 D3).
  const corpusFile = requireCorpus('mr-probes.jsonl');
  const pairs = readJsonl(corpusFile);
  const schemaErrs = validateMrCorpus(pairs);
  if (schemaErrs.length) {
    for (const e of schemaErrs) console.error('[config]: [mr-gate] FAIL-CLOSED: ' + e);
    process.exit(1);
  }
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')); }
  catch (e) { console.error('[config]: [mr-gate] FAIL-CLOSED: thresholds.json is invalid JSON (' + e.message + ')'); process.exit(1); }
  const cfgErr = mrGatesConfigError(cfg);
  if (cfgErr) { console.error('[config]: [mr-gate] FAIL-CLOSED: ' + cfgErr); process.exit(1); }
  const gates = cfg.mr_gates;

  const { judgeItem } = require(path.join(ROOT, 'bench', 'polygraph', 'node-bridge.js'));
  const results = runMrPairs(pairs, (c) => judgeItem(c));
  const metrics = mrMetrics(results);
  const gate = evaluateMrGates(gates, metrics);

  for (const r of results) {
    console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + ' (' + r.law + ', ' + r.family + ') source=' + r.source_verdict + ' followup=' + r.followup_verdict + ' want ' + r.relation);
  }
  console.log('[mr-gate] pairs=' + metrics.total_count + ' violations=' + metrics.violations + (metrics.violations ? ' [' + metrics.violation_ids.join(', ') + ']' : ''));

  const payload = {
    run: { gate: 'mr-gate', date: new Date().toISOString(), corpus: 'private/bench-corpus/mr-probes.jsonl', n: results.length, node: process.version },
    metrics,
    gate: { status: gate.status, checks: gate.checks.map(c => ({ id: c.id, observed: c.observed, outcome: c.outcome })) },
  };
  if (opts.ci) {
    const dir = path.resolve(opts.artifactsDir || 'mr-artifacts');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'gate-metrics.json'), JSON.stringify(payload, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'gate-junit.xml'), toJunitMr(gate));
    console.log('[mr-gate] artifacts: ' + dir);
  } else {
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    let out = path.join(ROOT, 'bench', 'polygraph', 'results', 'mr-metrics-' + ymd + '.json');
    if (fs.existsSync(out)) out = out.replace(/\.json$/, '-' + d.toISOString().slice(11, 19).replace(/:/g, '') + '.json');
    fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
    console.log('[mr-gate] milestone archive written (human commits it): ' + out);
  }
  process.exit(gate.status === 'pass' ? 0 : 1);
}

if (require.main === module) main();

module.exports = {
  runMrPairs, mrMetrics, gateValue, evaluateMrGates, mrGatesConfigError,
  validateMrCorpus, toJunitMr, MR_FAMILIES, FAMILY_RELATION,
};
