// ADR-0018: calibration flywheel — threshold band / few-shot selection / κ governance
const cal = require('../src/calibration');
const { verify } = require('../src/gate');

function hv(verdict, reason, extra) {
  return { kind: 'human_verdict', reviewer_id: 'r', verdict, reason, corrected_output: null, ...(extra || {}) };
}
function machine(status, conf) {
  return { gate_id: 'm', gate_type: 'deterministic', status, detail: 'd', confidence: conf };
}

describe('D2 threshold band (floor/target)', () => {
  test('no model -> STATIC band doubles as floor/target', () => {
    const b = cal.deriveThresholds(null);
    expect(b.low).toBe(0.4);
    expect(b.high).toBe(0.7);
    expect(b.floor).toBe(0.4);
    expect(b.target).toBe(0.7);
  });
  test('fitted model -> floor/target in [0,1], floor <= target, back-compat low/high', () => {
    const pts = [];
    for (let i = 0; i < 60; i++) pts.push({ score: i / 60, passed: i >= 30 });
    const m = cal.fitPlatt(pts);
    const b = cal.deriveThresholds(m, 0.85);
    for (const k of ['floor', 'target', 'low', 'high']) {
      expect(b[k]).toBeGreaterThanOrEqual(0);
      expect(b[k]).toBeLessThanOrEqual(1);
    }
    expect(b.floor).toBeLessThanOrEqual(b.target);
    expect(b.target).toBe(b.high);
  });
});

describe('D3 few-shot calibration injection', () => {
  test('fewer than 10 eligible points -> omitted entirely (fail-open)', () => {
    const chain = Array.from({ length: 9 }, (_, i) => hv('fail', 'reason ' + i));
    expect(cal.selectFewShotExamples(chain)).toEqual([]);
    expect(cal.formatFewShotSection([])).toBe('');
  });
  test('eligible = human_verdict with non-empty reason only', () => {
    const chain = [
      ...Array.from({ length: 10 }, (_, i) => hv('pass', 'r' + i)),
      hv('fail', ''), hv('fail', '   '), { kind: 'human_verdict' }, machine('passed', 0.9),
    ];
    const sel = cal.selectFewShotExamples(chain, { rng: () => 0 });
    expect(sel.length).toBeLessThanOrEqual(5);
    expect(sel.length).toBeGreaterThan(0);
    sel.forEach(e => expect(e.reason.trim().length).toBeGreaterThan(0));
  });
  test('format includes verdict + reason + corrected output', () => {
    const s = cal.formatFewShotSection([hv('fail', 'claimed tests but did not run them', { corrected_output: 'ran: exit 1' })]);
    expect(s).toContain('Calibration examples');
    expect(s).toContain('verdict: fail');
    expect(s).toContain('claimed tests');
    expect(s).toContain('corrected: ran: exit 1');
  });
  test('judge prompt hash is stable and version-prefixed', () => {
    expect(cal.judgePromptHash('')).toBe(cal.judgePromptHash(''));
    expect(cal.judgePromptHash('x')).not.toBe(cal.judgePromptHash('y'));
  });
});

describe('D4 kappa governance', () => {
  test('extract pairs: human verdict pairs with latest preceding machine record only', () => {
    const chain = [machine('passed', 0.9), machine('failed', 0.2), hv('fail', 'r1'), hv('pass', 'r2')];
    expect(cal.extractKappaPairs(chain)).toEqual([
      { machine: 'failed', human: 'fail' },
      { machine: 'failed', human: 'pass' },
    ]);
  });
  test('perfect agreement -> kappa 1', () => {
    const pairs = [...Array(5).fill({ machine: 'passed', human: 'pass' }),
                   ...Array(5).fill({ machine: 'failed', human: 'fail' })];
    const r = cal.computeKappa(pairs);
    expect(r.kappa).toBeCloseTo(1);
    expect(r.agreement).toBe(1);
    expect(r.confusion.agree_pass).toBe(5);
  });
  test('single-class pairs -> kappa null (undefined), agreement still reported', () => {
    const r = cal.computeKappa(Array(4).fill({ machine: 'passed', human: 'pass' }));
    expect(r.kappa).toBeNull();
    expect(r.agreement).toBe(1);
  });
  test('RE-ALIGN triggers: kappa < 0.40 floor', () => {
    const msg = cal.kappaAlert({ kappa: 0.2, n: 30 }, null);
    expect(msg).toMatch(/RE-ALIGN/);
    expect(msg).toMatch(/0.40/);
  });
  test('RE-ALIGN triggers: drift Δκ >= 0.05 below baseline', () => {
    const msg = cal.kappaAlert({ kappa: 0.5, n: 30 }, { kappa: 0.6, judge_hash: 'abc' });
    expect(msg).toMatch(/RE-ALIGN/);
    expect(msg).toMatch(/abc/);
  });
  test('no alert at/above floor and within 0.05 of baseline', () => {
    expect(cal.kappaAlert({ kappa: 0.56, n: 30 }, { kappa: 0.6 })).toBeNull();
    expect(cal.kappaAlert({ kappa: null, n: 3 }, { kappa: 0.9 })).toBeNull();
  });
  test('kappaAdvisory returns empty string when calm, advisory line when drifting', () => {
    const calm = [machine('passed', 0.9), hv('pass', 'r'), machine('failed', 0.2), hv('fail', 'r'),
      machine('passed', 0.9), hv('pass', 'r'), machine('failed', 0.2), hv('fail', 'r'),
      machine('passed', 0.9), hv('pass', 'r')];
    expect(cal.kappaAdvisory(calm, { kappa: 1 })).toBe('');
    const drift = [machine('passed', 0.9), hv('fail', 'r'), machine('passed', 0.9), hv('fail', 'r'),
      machine('passed', 0.9), hv('fail', 'r'), machine('failed', 0.1), hv('pass', 'r')];
    expect(cal.kappaAdvisory(drift, null)).toMatch(/RE-ALIGN/);
  });
});

describe('gate integration: band + few-shot context', () => {
  test('opts.band overrides escalation band (floor/target semantics)', () => {
    // checklist pass at confidence 0.9: default band (target 0.7) -> no escalation,
    // custom band target 0.95 -> escalates to critic
    const gates = {
      checklist: [() => ({ passed: true, detail: 'ok', confidence: 0.9 })],
      llm_critic: () => ({ passed: false, detail: 'critic says no', confidence: 0.3 }),
    };
    // 3 claims vs 1 checklist record keeps evidence insufficient, so the band decides
    const rDefault = verify(['a', 'b', 'c'], gates);
    expect(rDefault.verdict).toBe('NOT VERIFIED'); // 0.9 > target 0.7 -> no escalation, claims unresolved
    const rBand = verify(['a', 'b', 'c'], gates, { band: { floor: 0.6, target: 0.95 } });
    expect(rBand.verdict).toBe('FAIL'); // 0.9 < target 0.95 -> escalates, critic blocks
  });
  test('few-shot section reaches the critic context (construction-point injection)', () => {
    let seen = null;
    const gates = {
      checklist: [() => ({ passed: true, detail: 'ok', confidence: 0.5 })],
      llm_critic: ctx => { seen = ctx; return { passed: true, detail: 'ok', confidence: 0.9 }; },
    };
    verify(['a', 'b', 'c'], gates, { fewShotSection: '## Calibration examples\n- x' });
    expect(seen).not.toBeNull();
    expect(seen.few_shot_section).toContain('Calibration examples');
    expect(seen.claims).toEqual(['a', 'b', 'c']);
  });
});
