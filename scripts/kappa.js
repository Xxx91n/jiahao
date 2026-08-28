#!/usr/bin/env node
// scripts/kappa.js — κ governance report (ADR-0018 D4).
// Reads the evidence chain, pairs machine verdicts with human adjudications,
// prints agreement / Cohen's κ / confusion matrix as JSON.
// Drift triggers (advisory-only, never exit-code changes):
//   κ < 0.40, or Δκ ≥ 0.05 below the saved baseline.
//
// Usage:
//   node scripts/kappa.js                  # report
//   node scripts/kappa.js --save-baseline  # manually record current κ as baseline

const fs = require('fs');
const { createEvidenceLog } = require('../src/evidence-log');
const {
  extractKappaPairs, computeKappa, kappaAlert, judgePromptHash,
  loadKappaBaseline,
} = require('../src/calibration');
const { configDir, kappaBaselinePath } = require('../src/shared/paths');

function report() {
  const chain = createEvidenceLog(configDir()).readAll() || [];
  const pairs = extractKappaPairs(chain);
  const k = computeKappa(pairs);
  const baseline = loadKappaBaseline();
  const out = {
    judge_hash: judgePromptHash(''),
    pairs: pairs.length,
    report: k,
    baseline: baseline || null,
    alert: kappaAlert(k, baseline),
  };
  return out;
}

function main(argv) {
  const out = report();
  if (out.report === null) {
    console.error('kappa: no paired machine/human verdicts in the evidence chain (nothing to compare yet).');
    process.exit(1);
  }
  if (argv.includes('--save-baseline')) {
    const baseline = {
      kappa: out.report.kappa,
      agreement: out.report.agreement,
      n: out.report.n,
      judge_hash: out.judge_hash,
      saved_at: new Date().toISOString(),
    };
    fs.writeFileSync(kappaBaselinePath(), JSON.stringify(baseline, null, 2), 'utf8');
    out.saved_baseline = baseline;
  }
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { report };
