const path = require('path');
const { execSync } = require('child_process');
const { loadFixtures, runFixture, isFalseCompletion, computeFCR } = require(path.join(__dirname, '..', 'scripts', 'eval-ab.js'));

test('loadFixtures returns 5 fixtures', () => {
  const fixtures = loadFixtures();
  expect(fixtures.length).toBe(5);
});

test('fixtures cover all 3 types (should-fail, should-pass, cannot-verify)', () => {
  const fixtures = loadFixtures();
  const types = fixtures.map(f => f.type);
  expect(types).toContain('should-fail');
  expect(types).toContain('should-pass');
  expect(types).toContain('cannot-verify');
});

test('should-fail fixture produces FAIL verdict', () => {
  const fixtures = loadFixtures();
  const failFixture = fixtures.find(f => f.id === 'eval-001-should-fail');
  const result = runFixture(failFixture);
  expect(result.actual_verdict).toBe('FAIL');
  expect(result.correct).toBe(true);
  expect(result.false_completion).toBe(false);
});

test('should-pass fixture produces PASS verdict', () => {
  const fixtures = loadFixtures();
  const passFixture = fixtures.find(f => f.id === 'eval-002-should-pass');
  const result = runFixture(passFixture);
  expect(result.actual_verdict).toBe('PASS');
  expect(result.correct).toBe(true);
});

test('cannot-verify fixture produces NOT VERIFIED verdict', () => {
  const fixtures = loadFixtures();
  const nvFixture = fixtures.find(f => f.id === 'eval-003-cannot-verify');
  const result = runFixture(nvFixture);
  expect(result.actual_verdict).toBe('NOT VERIFIED');
  expect(result.correct).toBe(true);
});

test('llm-critic-fail fixture produces FAIL verdict', () => {
  const fixtures = loadFixtures();
  const failFixture = fixtures.find(f => f.id === 'eval-004-llm-critic-fail');
  const result = runFixture(failFixture);
  expect(result.actual_verdict).toBe('FAIL');
  expect(result.correct).toBe(true);
});

test('escalation-pass fixture produces PASS verdict', () => {
  const fixtures = loadFixtures();
  const passFixture = fixtures.find(f => f.id === 'eval-005-escalation-pass');
  const result = runFixture(passFixture);
  expect(result.actual_verdict).toBe('PASS');
  expect(result.correct).toBe(true);
});

test('isFalseCompletion detects FAIL-expected but PASS-actual', () => {
  expect(isFalseCompletion('FAIL', 'PASS')).toBe(true);
  expect(isFalseCompletion('NOT VERIFIED', 'PASS')).toBe(true);
  expect(isFalseCompletion('FAIL', 'FAIL')).toBe(false);
  expect(isFalseCompletion('PASS', 'PASS')).toBe(false);
});

test('computeFCR returns 0 for all-correct results', () => {
  const fixtures = loadFixtures();
  const results = fixtures.map(runFixture);
  const fcr = computeFCR(results);
  expect(fcr.fcr).toBe(0);
  expect(fcr.accuracy).toBe(1);
  expect(fcr.total).toBe(5);
});

test('computeFCR counts false completions correctly', () => {
  const results = [
    { expected_verdict: 'FAIL', actual_verdict: 'PASS', false_completion: true, correct: false, chain_valid: true },
    { expected_verdict: 'PASS', actual_verdict: 'PASS', false_completion: false, correct: true, chain_valid: true },
    { expected_verdict: 'NOT VERIFIED', actual_verdict: 'PASS', false_completion: true, correct: false, chain_valid: true },
  ];
  const fcr = computeFCR(results);
  expect(fcr.false_completions).toBe(2);
  expect(fcr.fcr).toBeCloseTo(2/3, 5);
  expect(fcr.accuracy).toBeCloseTo(1/3, 5);
});

test('all evidence chains are valid across fixtures', () => {
  const fixtures = loadFixtures();
  const results = fixtures.map(runFixture);
  results.forEach(r => {
    if (r.evidence_count > 0) {
      expect(r.chain_valid).toBe(true);
    }
  });
});

test('eval-ab.js runs as a script and produces output', () => {
  const root = path.join(__dirname, '..');
  const output = execSync('node scripts/eval-ab.js', { cwd: root, encoding: 'utf8', timeout: 5000 });
  expect(output).toContain('---AGGREGATE---');
  expect(output).toContain('fcr');
  expect(output).toContain('"total": 5');
});

test('eval-ab.js syntax is valid', () => {
  execSync('node -c scripts/eval-ab.js', { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 5000 });
});
