const fs = require('fs');
const path = require('path');

const {
  STATIC_BAND,
  calibrationLogPath,
  recordCalibrationPoint,
  loadCalibrationPoints,
  fitPlatt,
  calibrateScore,
  deriveThresholds,
  computeECE,
} = require(path.join(__dirname, '..', 'src', 'calibration.js'));

const TMP = require('os').tmpdir().replace(/\\/g, '/');

// Clean calibration log before tests
beforeEach(() => {
  try { fs.unlinkSync(calibrationLogPath()); } catch (e) { /* gone */ }
});

test('STATIC_BAND is 0.4-0.7', () => {
  expect(STATIC_BAND.low).toBe(0.4);
  expect(STATIC_BAND.high).toBe(0.7);
});

test('recordCalibrationPoint appends to log', () => {
  // Set CLAUDE_CONFIG_DIR to temp for isolation
  process.env.CLAUDE_CONFIG_DIR = TMP;
  recordCalibrationPoint(0.9, true);
  recordCalibrationPoint(0.3, false);
  const points = loadCalibrationPoints();
  expect(points.length).toBe(2);
  expect(points[0].score).toBe(0.9);
  expect(points[0].passed).toBe(true);
  expect(points[1].score).toBe(0.3);
  expect(points[1].passed).toBe(false);
});

test('loadCalibrationPoints returns empty array when no log', () => {
  process.env.CLAUDE_CONFIG_DIR = TMP;
  try { fs.unlinkSync(calibrationLogPath()); } catch (e) {}
  const points = loadCalibrationPoints();
  expect(points).toEqual([]);
});

test('fitPlatt returns null with insufficient data', () => {
  const points = [{ score: 0.5, passed: true }];
  expect(fitPlatt(points)).toBeNull();
});

test('fitPlatt returns model with sufficient data', () => {
  // Generate synthetic data: high scores -> pass, low scores -> fail
  const points = [];
  for (let i = 0; i < 50; i++) {
    const score = Math.random();
    const passed = score > 0.5;
    points.push({ score, passed });
  }
  const model = fitPlatt(points, { maxIter: 300, learningRate: 0.1 });
  expect(model).not.toBeNull();
  expect(typeof model.a).toBe('number');
  expect(typeof model.b).toBe('number');
  expect(model.n).toBe(50);
});

test('calibrateScore returns raw score when no model', () => {
  expect(calibrateScore(0.7, null)).toBe(0.7);
});

test('calibrateScore maps raw score through sigmoid', () => {
  const model = { a: 2, b: -1, n: 100 };
  const raw = 0.5;
  const expected = 1 / (1 + Math.exp(-(2 * 0.5 - 1)));
  expect(calibrateScore(raw, model)).toBeCloseTo(expected, 5);
});

test('deriveThresholds returns static band when no model', () => {
  const result = deriveThresholds(null);
  expect(result.low).toBe(0.4);
  expect(result.high).toBe(0.7);
});

test('deriveThresholds computes calibrated band from model', () => {
  const model = { a: 5, b: -2.5, n: 100 };
  const result = deriveThresholds(model, 0.85);
  expect(result.low).toBeGreaterThanOrEqual(0);
  expect(result.low).toBeLessThanOrEqual(1);
  expect(result.high).toBeGreaterThanOrEqual(0);
  expect(result.high).toBeLessThanOrEqual(1);
  expect(result.low).toBeLessThanOrEqual(result.high);
});

test('computeECE returns null for empty points', () => {
  expect(computeECE([], null)).toBeNull();
});

test('computeECE returns a number for valid data', () => {
  const points = [];
  for (let i = 0; i < 20; i++) {
    points.push({ score: i / 20, passed: i > 10 });
  }
  const ece = computeECE(points, null);
  expect(typeof ece).toBe('number');
  expect(ece).toBeGreaterThanOrEqual(0);
  expect(ece).toBeLessThanOrEqual(1);
});

test('end-to-end: record -> fit -> calibrate -> derive thresholds', () => {
  process.env.CLAUDE_CONFIG_DIR = TMP;
  // Record 30 synthetic points
  for (let i = 0; i < 30; i++) {
    const score = Math.random();
    const passed = score > 0.5;
    recordCalibrationPoint(score, passed);
  }
  const points = loadCalibrationPoints();
  expect(points.length).toBe(30);
  const model = fitPlatt(points, { maxIter: 300, learningRate: 0.1 });
  expect(model).not.toBeNull();
  // Calibrated score should be in [0, 1]
  const cal = calibrateScore(0.7, model);
  expect(cal).toBeGreaterThanOrEqual(0);
  expect(cal).toBeLessThanOrEqual(1);
  // Derived thresholds should be valid
  const band = deriveThresholds(model, 0.85);
  expect(band.low).toBeGreaterThanOrEqual(0);
  expect(band.high).toBeLessThanOrEqual(1);
  expect(band.low).toBeLessThanOrEqual(band.high);
  // ECE should be computable
  const ece = computeECE(points, model);
  expect(typeof ece).toBe('number');
});
