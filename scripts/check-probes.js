#!/usr/bin/env node
// scripts/check-probes.js -- ADR-0029 D3/D4/D6: behavioral probe gate
// (zero-miss smoke gate over bench/polygraph/probes.jsonl).
//
//   D3  structural all-pass: probe-recall 0 misses, probe-fp 0 false
//       positives over the 14-item paired corpus (7 violation + 7 benign).
//       No band semantics (ADR-0018/0027 bands do not apply to zero floors).
//   D4  thin CLI + pure core: judge logic lives in exported pure functions;
//       jest tests the core, NEVER runs the gate (a gate is a standalone
//       process with an exit code). npm script `probes:gate` is its own CI
//       job, not merged into `bench:gate` (presubmit/postsubmit seam).
//   D6  local runs archive results as bench/polygraph/results/
//       probe-metrics-<date>.json (human commits); --ci writes
//       gate-metrics.json + gate-junit.xml into an artifacts dir and never
//       touches results/. Probe results NEVER enter the runtime evidence
//       chain (CWE-779).
//
// Thresholds come from bench/polygraph/thresholds.json probe_gates
// (governance: scripts/check-bench-thresholds.js content anchor + coupling).
//
// Usage: node scripts/check-probes.js [--ci] [--artifacts-dir DIR]

'use strict';

const fs = require('fs');
const path = require('path');
const { judgeItem } = require(path.join(__dirname, '..', 'bench', 'polygraph', 'node-bridge.js'));

const ROOT = path.join(__dirname, '..');
const CORPUS_PATH = path.join(ROOT, 'bench', 'polygraph', 'probes.jsonl');
const CFG_PATH = path.join(ROOT, 'bench', 'polygraph', 'thresholds.json');

// ---- pure core (jest testable, no fs) ----

function runProbes(cases, judgeFn) {
  return cases.map(c => {
    let out;
    try {
      out = judgeFn(c);
    } catch (e) {
      // judge crash is unmeasurable: degrade to observed=judge-error (counts as
      // miss/fp, honest-closed) rather than crashing the whole gate loop
      out = { verdict: 'judge-error', category: String((e && e.message) || e) };
    }
    const pass = out.verdict === c.expected_verdict;
    return { id: c.id, law: c.law, kind: c.kind, expected: c.expected_verdict, observed: out.verdict, category: out.category || null, pass };
  });
}

// S-1 fail-closed guard: removing/truncating the probe_gates key must not let
// the gate run gate-free (silent bypass). Fail closed with exit 2 in main.
function probeGatesConfigError(cfg) {
  if (!cfg || !Array.isArray(cfg.probe_gates) || cfg.probe_gates.length === 0) {
    return 'thresholds.json probe_gates missing or empty (ADR-0029 D2) — refusing fail-open';
  }
  return null;
}

function probeMetrics(results) {
  const viol = results.filter(r => r.kind === 'violation-probe');
  const ben = results.filter(r => r.kind === 'benign-near-miss');
  const caught = viol.filter(r => r.observed === 'lie').length;
  const flagged = ben.filter(r => r.observed === 'lie').length;
  return {
    recall: viol.length ? caught / viol.length : null,
    fp_rate: ben.length ? flagged / ben.length : null,
    n_violation: viol.length,
    n_benign: ben.length,
    misses: viol.filter(r => r.observed !== 'lie').map(r => r.id),
    false_positives: ben.filter(r => r.observed === 'lie').map(r => r.id),
  };
}

function gateValueProbe(metrics, gate) {
  if (gate.metric === 'recall') return metrics.recall;
  if (gate.metric === 'fp_rate') return metrics.fp_rate;
  return null;
}

function evaluateProbeGates(gates, metrics) {
  const checks = gates.map(g => {
    const v = gateValueProbe(metrics, g);
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

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toJunitProbe(result) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<testsuite name="probe-gate" tests="' + result.checks.length + '" failures="' + result.failed.length + '" errors="0">');
  for (const c of result.checks) {
    const msg = 'observed=' + (c.observed === null ? 'null' : c.observed.toFixed(4)) + ' op=' + c.op + ' floor=' + c.value + ' -> ' + c.outcome;
    lines.push('  <testcase name="' + escXml(c.id) + '" classname="probe-gate">');
    if (c.outcome !== 'pass') lines.push('    <failure message="' + escXml(msg) + '"/>');
    lines.push('  </testcase>');
  }
  lines.push('</testsuite>');
  return lines.join('\n') + '\n';
}

// ---- CLI shell ----

function readJsonl(p) {
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim()).map(JSON.parse);
}

function parseArgs(argv) {
  const o = { ci: false, artifactsDir: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--ci') o.ci = true;
    else if (argv[i] === '--artifacts-dir') o.artifactsDir = argv[++i];
    else { console.error('unknown arg: ' + argv[i]); process.exit(2); }
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv);
  const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
  const cfgErr = probeGatesConfigError(cfg);
  if (cfgErr) { console.error('[probe-gate] FAIL-CLOSED: ' + cfgErr); process.exit(2); }
  const gates = cfg.probe_gates;
  const cases = readJsonl(CORPUS_PATH);
  const results = runProbes(cases, judgeItem);
  const metrics = probeMetrics(results);
  const gate = evaluateProbeGates(gates, metrics);

  for (const r of results) {
    console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + ' (' + r.law + ') got=' + r.observed + ' want=' + r.expected + (r.category ? ' [' + r.category + ']' : ''));
  }
  console.log('[probe-gate] violation recall=' + (metrics.recall === null ? 'null' : metrics.recall.toFixed(3)) +
    ' (' + metrics.misses.length + ' miss) | benign fp_rate=' + (metrics.fp_rate === null ? 'null' : metrics.fp_rate.toFixed(3)) +
    ' (' + metrics.false_positives.length + ' fp)');
  for (const c of gate.checks) {
    console.log('  [' + c.outcome.toUpperCase() + '] ' + c.id + ' ' + c.metric + '=' + (c.observed === null ? 'null' : c.observed.toFixed(4)) + ' ' + c.op + ' ' + c.value + '  src=ADR-' + c.source_adr);
  }

  const payload = {
    run: { gate: 'probe-gate', date: new Date().toISOString(), corpus: 'bench/polygraph/probes.jsonl', n: results.length, node: process.version },
    metrics,
    gate: { status: gate.status, checks: gate.checks.map(c => ({ id: c.id, observed: c.observed, outcome: c.outcome })) },
  };
  if (opts.ci) {
    const dir = path.resolve(opts.artifactsDir || 'probe-artifacts');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'gate-metrics.json'), JSON.stringify(payload, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'gate-junit.xml'), toJunitProbe(gate));
    console.log('[probe-gate] artifacts: ' + dir);
  } else {
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    let out = path.join(ROOT, 'bench', 'polygraph', 'results', 'probe-metrics-' + ymd + '.json');
    if (fs.existsSync(out)) out = out.replace(/\.json$/, '-' + d.toISOString().slice(11, 19).replace(/:/g, '') + '.json');
    fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
    console.log('[probe-gate] milestone archive written (human commits it): ' + out);
  }
  process.exit(gate.status === 'pass' ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runProbes, probeMetrics, gateValueProbe, evaluateProbeGates, toJunitProbe, probeGatesConfigError };
