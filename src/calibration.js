// jiahao calibration.js — confidence calibration module
// Platt sigmoid calibration: P(pass|score) = 1/(1+exp(a*score+b))
// Minimal viable: zero-dependency, ~60 lines. Isotonic is the upgrade path
// when sufficient data (1000+ labeled samples) exists.
//
// Usage flow:
// 1. recordCalibrationPoint(score, verdict) — log (raw confidence, pass/fail)
// 2. fitPlatt(points) — learn (a, b) from collected points
// 3. calibrateScore(score, model) — map raw score to calibrated probability
// 4. deriveThresholds(model, targetPrecision) — compute new band from calibrated curve

const fs = require('fs');
const { configDir } = require('./shared/paths');

// Default static band (ADR-0004, from FutureAGI research)
const STATIC_BAND = { low: 0.4, high: 0.7 };

// Get calibration log path
function calibrationLogPath() {
  return require('path').join(configDir(), '.jiahao-calibration.jsonl');
}

// Record a (score, verdict) pair to the calibration log (JSONL append)
function recordCalibrationPoint(score, passed) {
  const entry = JSON.stringify({
    score: score,
    passed: passed,
    timestamp: new Date().toISOString(),
  });
  try {
    fs.appendFileSync(calibrationLogPath(), entry + '\n', 'utf8');
  } catch (e) { /* fail-open: calibration logging is best-effort */ }
}

// Load all calibration points from the log
function loadCalibrationPoints() {
  try {
    const raw = fs.readFileSync(calibrationLogPath(), 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      try { return JSON.parse(line); } catch (e) { return null; }
    }).filter(p => p !== null);
  } catch (e) { return []; }
}

// Fit Platt sigmoid via gradient descent.
// Platt's original: P(y=1|s) = 1/(1+exp(A*s+B))
// We optimize log-loss via simple gradient descent (no external libs).
// Returns { a, b, n } or null if insufficient data.
function fitPlatt(points, opts) {
  if (!points || points.length < 10) return null; // need at least 10 points

  const maxIter = (opts && opts.maxIter) || 200;
  const lr = (opts && opts.learningRate) || 0.01;

  let a = 0, b = 0; // start from identity (a=0 => P=0.5 regardless of score)

  for (let iter = 0; iter < maxIter; iter++) {
    let gradA = 0, gradB = 0;
    for (const p of points) {
      const s = p.score;
      const y = p.passed ? 1 : 0;
      const z = a * s + b;
      const sig = 1 / (1 + Math.exp(-z));
      // Log-loss gradient: (sig - y) * [s, 1]
      gradA += (sig - y) * s;
      gradB += (sig - y);
    }
    a -= lr * gradA / points.length;
    b -= lr * gradB / points.length;
  }

  return { a: a, b: b, n: points.length };
}

// Apply Platt calibration to a raw score
function calibrateScore(score, model) {
  if (!model) return score; // passthrough if no model
  const z = model.a * score + model.b;
  return 1 / (1 + Math.exp(-z));
}

// Derive escalation band thresholds from calibrated model at target precision.
// targetPrecision: desired P(pass|calibrated_score) at the high threshold.
// Returns { low, high } calibrated thresholds, or STATIC_BAND if no model.
function deriveThresholds(model, targetPrecision, floorPrecision) {
  if (!model) return { ...STATIC_BAND, floor: STATIC_BAND.low, target: STATIC_BAND.high };

  // High threshold: solve calibrateScore(s, model) = targetPrecision
  // 1/(1+exp(a*s+b)) = targetPrecision => a*s+b = ln(1/targetPrecision - 1)
  const tp = targetPrecision || 0.85;
  const logitHigh = Math.log(1 / tp - 1);
  const high = (logitHigh - model.b) / model.a;

  // Low threshold: solve for (1 - targetPrecision) as the "definitely fail" boundary
  const logitLow = Math.log(1 / (1 - tp) - 1);
  const low = (logitLow - model.b) / model.a;

  // ADR-0018 D2: floor/target dual boundary (maf-evals pattern).
  // floor = blocking boundary (calibrated P(pass) < floorPrec -> block),
  // target = warning boundary; scores inside the band are warnings.
  const fp_ = floorPrecision || 0.5;
  const logitFloor = Math.log(1 / fp_ - 1);
  const floor = (logitFloor - model.b) / model.a;

  // Degenerate fit (constant-score points -> a === 0): no calibrated signal;
  // fall back to the static band instead of emitting non-finite thresholds
  // (input health-check posture, ADR-0018 D2).
  if (!Number.isFinite(model.a) || model.a === 0) {
    return { ...STATIC_BAND, floor: STATIC_BAND.low, target: STATIC_BAND.high };
  }

  // Clamp to [0, 1]. low/high keep ADR-0008 semantics for back-compat;
  // floor/target are the ADR-0018 D2 band (floor clamped to <= target).
  const lo = Math.max(0, Math.min(1, Math.min(low, high)));
  const hi = Math.max(0, Math.min(1, Math.max(low, high)));
  const fl = Math.max(0, Math.min(1, Math.min(floor, hi)));
  return { low: lo, high: hi, floor: fl, target: hi };
}

// Compute Expected Calibration Error (ECE) for monitoring.
// Bin calibrated scores into nBins, compare bin accuracy vs bin confidence.
function computeECE(points, model, nBins) {
  if (!points || points.length === 0) return null;
  const bins = nBins || 10;
  const binSize = 1 / bins;
  const binStats = [];

  for (let i = 0; i < bins; i++) binStats.push({ count: 0, correct: 0, confSum: 0 });

  for (const p of points) {
    const cal = calibrateScore(p.score, model);
    const binIdx = Math.min(bins - 1, Math.floor(cal / binSize));
    binStats[binIdx].count++;
    binStats[binIdx].correct += p.passed ? 1 : 0;
    binStats[binIdx].confSum += cal;
  }

  let ece = 0;
  for (const b of binStats) {
    if (b.count === 0) continue;
    const accuracy = b.correct / b.count;
    const avgConf = b.confSum / b.count;
    ece += (b.count / points.length) * Math.abs(accuracy - avgConf);
  }

  return ece;
}


// ---- ADR-0018: calibration flywheel (read path) ----

const crypto = require('crypto');

// Judge version: bump when the critic prompt changes; kappa reports are
// versioned per judge prompt hash (maf-evals: recalibrate after judge change).
const JUDGE_VERSION = 'critic-v1';

// Fraction of eligible human-verdict points required before few-shot
// injection is allowed (fail-open below this, same posture as fitPlatt's
// >=10 guard).
const FEWSHOT_MIN_POINTS = 10;
const FEWSHOT_TOP_K = 5;

// Select up to k human adjudications with a stated reason, random sample.
// Source = the evidence chain (human_verdict records carry reason +
// corrected_output; the calibration JSONL points do not).
function selectFewShotExamples(chain, opts) {
  const k = (opts && opts.k) || FEWSHOT_TOP_K;
  const rng = (opts && opts.rng) || Math.random;
  const eligible = (chain || []).filter(r =>
    r && r.kind === 'human_verdict' && typeof r.reason === 'string' && r.reason.trim().length > 0);
  if (eligible.length < FEWSHOT_MIN_POINTS) return []; // fail-open: omit section entirely
  const pool = eligible.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, k);
}

// Format the calibration-example injection section for the Level-4 critic
// prompt. Returns '' when there is nothing to inject (fail-open).
function formatFewShotSection(examples) {
  if (!examples || examples.length === 0) return '';
  const lines = ['## Calibration examples (human adjudications of prior verdicts)'];
  for (const ex of examples) {
    lines.push('- verdict: ' + ex.verdict + ' | reason: ' + ex.reason +
      (ex.corrected_output ? ' | corrected: ' + ex.corrected_output : ''));
  }
  return lines.join('\n');
}

// Fingerprint of the current critic prompt family (judge versioning).
function judgePromptHash(section) {
  return crypto.createHash('sha256')
    .update(JUDGE_VERSION + '\n' + (section || ''))
    .digest('hex').slice(0, 16);
}

// Extract paired machine/human verdicts from a chain: each human_verdict is
// paired with the latest preceding machine record (status passed/failed).
function extractKappaPairs(chain) {
  const pairs = [];
  let lastMachine = null;
  for (const rec of chain || []) {
    if (!rec || typeof rec !== 'object') continue;
    if (rec.kind === 'human_verdict') {
      if (lastMachine) {
        pairs.push({ machine: lastMachine.status, human: rec.verdict });
        // lastMachine is NOT consumed: resolve.js pairs every adjudication
        // with the latest machine record in the chain; κ sees all pairs.
      }
      continue;
    }
    if (rec.status === 'passed' || rec.status === 'failed') lastMachine = rec;
  }
  return pairs;
}

// Cohen's kappa over binary verdict pairs (machine pass vs human pass).
// Cohen 1960; zero-dependency, mirrors fitPlatt precedent.
function computeKappa(pairs) {
  if (!pairs || pairs.length === 0) return null;
  let a = 0, b = 0, c = 0, d = 0;
  for (const p of pairs) {
    const mPass = p.machine === 'passed';
    const hPass = p.human === 'pass';
    if (mPass && hPass) a++;        // agree pass
    else if (!mPass && !hPass) d++; // agree fail
    else if (mPass && !hPass) b++;  // machine pass, human fail
    else c++;                       // machine fail, human pass
  }
  const n = a + b + c + d;
  const po = (a + d) / n;
  const pMachine = (a + b) / n, pHuman = (a + c) / n;
  const pe = pMachine * pHuman + (1 - pMachine) * (1 - pHuman);
  const kappa = pe >= 1 ? null : (po - pe) / (1 - pe); // undefined if only one class
  return {
    n: n,
    agreement: po,
    kappa: kappa,
    confusion: { agree_pass: a, machine_pass_human_fail: b, machine_fail_human_pass: c, agree_fail: d },
    precision: a + b > 0 ? a / (a + b) : null,  // of machine 'passed'
    recall: a + c > 0 ? a / (a + c) : null,     // of human 'pass' accepted by machine
  };
}

// ADR-0018 D4: RE-ALIGN triggers (advisory only, never blocking):
//   kappa < 0.40                     (below governance floor)
//   baseline.kappa - current >= 0.05 (drift vs last recorded baseline)
function kappaAlert(report, baseline) {
  if (!report || report.kappa === null) return null;
  if (report.kappa < 0.40) {
    return 'RE-ALIGN: kappa ' + report.kappa.toFixed(3) + ' < 0.40 floor' +
      ' (n=' + report.n + '). Recalibrate the critic (jiahao calibrate / human review).';
  }
  if (baseline && typeof baseline.kappa === 'number') {
    const delta = baseline.kappa - report.kappa;
    if (delta >= 0.05) {
      return 'RE-ALIGN: kappa dropped ' + delta.toFixed(3) + ' vs baseline ' +
        baseline.kappa.toFixed(3) + ' (judge ' + (baseline.judge_hash || '?') + ').';
    }
  }
  return null;
}

// Load the manually-saved κ baseline (see scripts/kappa.js). Never written
// from hooks — baseline updates are explicit, per ADR-0018 D2 governance.
function loadKappaBaseline() {
  try {
    return JSON.parse(fs.readFileSync(
      require('./shared/paths').kappaBaselinePath(), 'utf8'));
  } catch (e) { return null; }
}

// One-shot advisory line for the verdict-gate hook: extract pairs from the
// chain, compute kappa, compare to baseline. Advisory string or ''.
function kappaAdvisory(chain, baseline) {
  const report = computeKappa(extractKappaPairs(chain));
  if (!report) return '';
  const alert = kappaAlert(report, baseline);
  return alert ? ' ' + alert : '';
}

module.exports = {
  STATIC_BAND,
  calibrationLogPath,
  recordCalibrationPoint,
  loadCalibrationPoints,
  fitPlatt,
  calibrateScore,
  deriveThresholds,
  computeECE,
  JUDGE_VERSION,
  FEWSHOT_MIN_POINTS,
  FEWSHOT_TOP_K,
  selectFewShotExamples,
  formatFewShotSection,
  judgePromptHash,
  extractKappaPairs,
  computeKappa,
  kappaAlert,
  kappaAdvisory,
  loadKappaBaseline,
};
