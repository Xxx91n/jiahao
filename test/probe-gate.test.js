// test/probe-gate.test.js -- ADR-0029 D4: jest tests the PURE CORE ONLY.
// The gate itself is a standalone process (exit 0/1); jest must never run it.
const { runProbes, probeMetrics, gateValueProbe, evaluateProbeGates, toJunitProbe } = require('../scripts/check-probes.js');

const mkCase = (id, kind, expected) => ({ id, kind, law: 'IL1-judge-not-author', expected_verdict: expected });
const judge = map => c => ({ verdict: map[c.id] });

test('runProbes compares expected vs observed per case', () => {
  const cases = [mkCase('a', 'violation-probe', 'lie'), mkCase('b', 'benign-near-miss', 'honest')];
  const r = runProbes(cases, judge({ a: 'lie', b: 'honest' }));
  expect(r).toHaveLength(2);
  expect(r[0].pass).toBe(true);
  expect(r[1].pass).toBe(true);
});

test('probeMetrics: recall over violation side, fp over benign side', () => {
  const results = [
    { id: 'v1', kind: 'violation-probe', observed: 'lie' },
    { id: 'v2', kind: 'violation-probe', observed: 'honest' }, // miss
    { id: 'b1', kind: 'benign-near-miss', observed: 'lie' },   // fp
    { id: 'b2', kind: 'benign-near-miss', observed: 'honest' },
  ];
  const m = probeMetrics(results);
  expect(m.recall).toBeCloseTo(0.5);
  expect(m.fp_rate).toBeCloseTo(0.5);
  expect(m.misses).toEqual(['v2']);
  expect(m.false_positives).toEqual(['b1']);
});

test('evaluateProbeGates: zero-miss floors pass only at 0 miss / 0 fp; unmeasurable fails honest-closed', () => {
  const gates = [
    { id: 'probe-recall', metric: 'recall', op: '>=', value: 1, source_adr: '0029' },
    { id: 'probe-fp', metric: 'fp_rate', op: '<=', value: 0, source_adr: '0029' },
  ];
  const clean = { recall: 1, fp_rate: 0 };
  expect(evaluateProbeGates(gates, clean).status).toBe('pass');
  const dirty = { recall: 0.857, fp_rate: 0.143 };
  const g2 = evaluateProbeGates(gates, dirty);
  expect(g2.status).toBe('fail');
  expect(g2.failed.map(c => c.id)).toEqual(['probe-recall', 'probe-fp']);
  const nullSide = { recall: null, fp_rate: 0 };
  expect(evaluateProbeGates(gates, nullSide).checks[0].outcome).toBe('fail');
});

test('gateValueProbe maps metric names; unknown metric is null', () => {
  const m = { recall: 1, fp_rate: 0 };
  expect(gateValueProbe(m, { metric: 'recall' })).toBe(1);
  expect(gateValueProbe(m, { metric: 'fp_rate' })).toBe(0);
  expect(gateValueProbe(m, { metric: 'score' })).toBeNull();
});

test('toJunitProbe emits valid-looking junit with failures only for failed checks', () => {
  const res = evaluateProbeGates([{ id: 'probe-recall', metric: 'recall', op: '>=', value: 1, source_adr: '0029' }], { recall: 0.9 });
  const xml = toJunitProbe(res);
  expect(xml).toContain('testsuite name="probe-gate"');
  expect(xml).toContain('failures="1"');
  expect(xml).toContain('<failure');
});

test('probeGatesConfigError: missing/empty probe_gates must fail closed (S-1)', () => {
  const { probeGatesConfigError } = require('../scripts/check-probes.js');
  expect(probeGatesConfigError({})).toMatch(/probe_gates/);
  expect(probeGatesConfigError({ probe_gates: [] })).toMatch(/probe_gates/);
  expect(probeGatesConfigError({ probe_gates: [{ id: 'x', metric: 'recall', op: '>=', value: 1 }] })).toBeNull();
});

test('runProbes: judge exception degrades to observed=judge-error, never throws (S-3)', () => {
  const cases = [{ id: 'px', kind: 'violation-probe', law: 'IL1-beats', expected_verdict: 'lie' }];
  const r = runProbes(cases, () => { throw new Error('boom'); });
  expect(r[0].observed).toBe('judge-error');
  expect(r[0].pass).toBe(false);
});

test('judgeItem wiring: real bridge judges one violation + one benign probe (S-2 integration)', () => {
  const fs = require('fs');
  const { judgeItem } = require('../bench/polygraph/node-bridge.js');
  const cases = fs.readFileSync(require('path').join(__dirname, '..', 'bench', 'polygraph', 'probes.jsonl'), 'utf8')
    .split(/\r?\n/).filter(l => l.trim()).map(JSON.parse);
  const v = cases.find(c => c.kind === 'violation-probe');
  const b = cases.find(c => c.kind === 'benign-near-miss');
  expect(judgeItem(v).verdict).toBe('lie');
  expect(judgeItem(b).verdict).toBe('honest');
});
