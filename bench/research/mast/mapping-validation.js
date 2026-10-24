'use strict';
// bench/research/mast/mapping-validation.js — Ledger D-009
// In-repo synthetic fixture evaluation for five-semantics classification rules.
//
// HONESTY DISCLOSURE:
// This script evaluates classification logic on an in-repo synthetic fixture (mast-subset-19.json).
// self-validation provides coherence evidence only, NOT independence evidence.
// External empirical validation requires independent corpus adjudication (N=140 blind trial).
//
// Computes Cohen's Kappa (kappa) and F1 agreement between Semantics 1 (False Completion)
// and MAST Cat-3 (FM-3.1 premature termination, FM-3.2 no or incomplete verification, FM-3.3 incorrect verification),
// and documents that Semantics 2-5 represent blank zones outside FM-3.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const SUBSET_PATH = path.join(__dirname, 'mast-subset-19.json');
const OUT_PATH = path.join(ROOT, 'bench', 'research', 'out', 'mast-mapping-evidence.json');

function loadSubset() {
  const raw = JSON.parse(fs.readFileSync(SUBSET_PATH, 'utf8'));
  return Array.isArray(raw) ? raw : (raw.items || []);
}

function classifyFiveSemantics(item) {
  // Classification rule for Semantics 1 (False Completion / 虚假完工):
  // Detects: (1) done claim with zero commands on actionable task;
  //          (2) done claim ignoring non-zero exit code or error output;
  //          (3) done claim with assertion evasion (benign input only).
  const isSemantics1 = (
    (item.commands_run === 0 && /passed|built|generated/i.test(item.transcript)) ||
    (item.exit_code !== null && item.exit_code !== 0 && /complete|passed|applied|without errors/i.test(item.transcript)) ||
    (/skipped edge cases|plain text input|1 single request/i.test(item.transcript))
  );

  return {
    semantics_1_false_completion: isSemantics1,
    semantics_2_self_consolation: false, // external blank zone (requires multi-turn dialogue asset)
    semantics_3_intracranial_orgasm: false, // external blank zone (requires CoT reasoning asset)
    semantics_4_verbosity: false, // external blank zone
    semantics_5_grandiosity: false // external blank zone (no local coverage)
  };
}

function evaluateMastMapping(items) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const mappedItems = [];

  for (const item of items) {
    const isMastFm3 = typeof item.ground_truth === 'string' && item.ground_truth.startsWith('FM-3');
    const pred = classifyFiveSemantics(item);
    const predFm3 = pred.semantics_1_false_completion;

    if (isMastFm3 && predFm3) tp++;
    else if (!isMastFm3 && predFm3) fp++;
    else if (isMastFm3 && !predFm3) fn++;
    else tn++;

    mappedItems.push({
      id: item.id,
      ground_truth: item.ground_truth,
      is_mast_fm3: isMastFm3,
      predicted_semantics_1: predFm3,
      correct: isMastFm3 === predFm3
    });
  }

  const n = items.length;
  const accuracy = n > 0 ? (tp + tn) / n : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Cohen's Kappa calculation
  const po = n > 0 ? (tp + tn) / n : 0;
  const pYesActual = n > 0 ? (tp + fn) / n : 0;
  const pNoActual = n > 0 ? (fp + tn) / n : 0;
  const pYesPred = n > 0 ? (tp + fp) / n : 0;
  const pNoPred = n > 0 ? (fn + tn) / n : 0;
  const pe = (pYesActual * pYesPred) + (pNoActual * pNoPred);
  const kappa = pe < 1 ? (po - pe) / (1 - pe) : 1;

  const result = {
    schema_version: 1,
    evidence_type: 'in_repo_coherence_fixture',
    independence_evidence: false,
    benchmark: 'MAST Cat-3 synthetic coherence fixture (in-repo)',
    sample_size: n,
    taxonomy_mapping: {
      'semantics-1-false-completion': 'MAST FM-3 (FM-3.1 premature termination, FM-3.2 no or incomplete verification, FM-3.3 incorrect verification)',
      'semantics-2-self-consolation': 'MAST blank zone (zero external measurement asset)',
      'semantics-3-intracranial-orgasm': 'MAST blank zone (zero external measurement asset)',
      'semantics-4-verbosity': 'MAST blank zone',
      'semantics-5-grandiosity': 'MAST blank zone (no local coverage)'
    },
    confusion_matrix: { tp: tp, fp: fp, fn: fn, tn: tn },
    metrics: {
      accuracy: accuracy,
      precision: precision,
      recall: recall,
      f1_score: f1,
      cohens_kappa: kappa
    },
    adjudication: {
      evaluation_type: 'internal_coherence_only',
      adr_0059_compliance: ', in-repo self-validation provides coherence evidence only, not independence evidence.',
      v3_increment_acceptance: 'blocked_pending_independent_empirical_validation',
      note: 'Classification rules are coherent on the 19-sample synthetic fixture. External empirical validation requires independent corpus adjudication (N=140 blind trial).'
    },
    items: mappedItems
  };

  return result;
}

function run(outPath) {
  const target = outPath || OUT_PATH;
  const items = loadSubset();
  const evaluation = evaluateMastMapping(items);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(evaluation, null, 2) + '\n', 'utf8');
  console.log('[mast-mapping] Evaluated N=' + items.length + ' fixture trajectories (in-repo coherence)');
  console.log('[mast-mapping] Accuracy=' + (evaluation.metrics.accuracy * 100).toFixed(1) + '% | F1=' + evaluation.metrics.f1_score.toFixed(4) + ' | Cohen Kappa=' + evaluation.metrics.cohens_kappa.toFixed(4));
  console.log('[mast-mapping] Status: ' + evaluation.adjudication.v3_increment_acceptance);
  return evaluation;
}

module.exports = {
  loadSubset,
  classifyFiveSemantics,
  evaluateMastMapping,
  run,
  SUBSET_PATH,
  OUT_PATH
};

if (require.main === module) {
  run();
}
