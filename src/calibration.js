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
function deriveThresholds(model, targetPrecision) {
  if (!model) return { ...STATIC_BAND };

  // High threshold: solve calibrateScore(s, model) = targetPrecision
  // 1/(1+exp(a*s+b)) = targetPrecision => a*s+b = ln(1/targetPrecision - 1)
  const tp = targetPrecision || 0.85;
  const logitHigh = Math.log(1 / tp - 1);
  const high = (logitHigh - model.b) / model.a;

  // Low threshold: solve for (1 - targetPrecision) as the "definitely fail" boundary
  const logitLow = Math.log(1 / (1 - tp) - 1);
  const low = (logitLow - model.b) / model.a;

  // Clamp to [0, 1]
  return {
    low: Math.max(0, Math.min(1, Math.min(low, high))),
    high: Math.max(0, Math.min(1, Math.max(low, high))),
  };
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

module.exports = {
  STATIC_BAND,
  calibrationLogPath,
  recordCalibrationPoint,
  loadCalibrationPoints,
  fitPlatt,
  calibrateScore,
  deriveThresholds,
  computeECE,
};
