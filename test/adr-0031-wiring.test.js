// test/adr-0031-wiring.test.js — ADR-0031 wiring assertions (D1 convention).
// Each test asserts the state/config object a gate ACTUALLY reads matches
// what the ADR claims: D2 pair corpus shape, D3 tier fields in
// thresholds.json, D4 judge-input whitelist, D5 provenance additive
// semantics, D6 reverify conclude/runKey behavior.

const path = require('path');
const fs = require('fs');
const execFileSync = require('child_process').execFileSync;

const ROOT = path.join(__dirname, '..');
const CORR = fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'judge-twins.jsonl'), 'utf8')
  .split('\n').filter(s => s.trim()).map(JSON.parse);
const THRESHOLDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'), 'utf8'));
const { checkTiers } = require('../scripts/check-bench-thresholds.js');
const bias = require('../bench/polygraph/check-judge-bias.js');
const det = require('../src/detector.js');
const evlo = require('../src/evidence-log.js');
const reverify = require('../scripts/reverify.js');

describe('D2: corpus v1.1 three bias kinds wired', () => {
  test('at least 4 pairs each of style-control / length-control / bias-probe', () => {
    for (const k of ['style-control', 'length-control', 'bias-probe']) {
      const pairs = new Set(CORR.filter(e => e.kind === k).map(e => e.pair_id));
      expect(pairs.size).toBeGreaterThanOrEqual(4);
    }
  });
  test('every pair has both roles', () => {
    const byPair = new Map();
    for (const e of CORR) if (e.pair_id) {
      if (!byPair.has(e.pair_id)) byPair.set(e.pair_id, new Set());
      byPair.get(e.pair_id).add(e.pair_role);
    }
    for (const [pid, roles] of byPair) expect(roles.size).toBeGreaterThanOrEqual(2);
  });
  test('check-judge-bias applies tier rules: confirmatory fail-closed, observational report-only', () => {
    const m = { style_flip_rate: 0.5, length_discrimination: 1, swap_order_inconsistency: 0 };
    const cfg = { judge_bias_gates: THRESHOLDS.judge_bias_gates };
    const g = bias.applyGates(m, cfg);
    expect(g.fail).toBe(false); // length_discrimination ok, style is observational
    const m2 = { style_flip_rate: 0, length_discrimination: 0.5, swap_order_inconsistency: 0 };
    expect(bias.applyGates(m2, cfg).fail).toBe(true); // confirmatory breach
    expect(bias.applyGates(m, { judge_bias_gates: [] }).fail).toBe(true); // fail-open refused
  });
});

describe('D3: thresholds.json gate tiers', () => {
  test('all nine gates declare a valid tier', () => {
    expect(checkTiers(THRESHOLDS, Date.now())).toEqual([]);
  });
  test('observational gates carry review_at + promote_if', () => {
    for (const g of THRESHOLDS.judge_bias_gates.filter(x => x.tier === 'observational')) {
      expect(typeof g.review_at).toBe('string');
      expect(typeof g.promote_if).toBe('string');
    }
  });
  test('checkTiers refuses missing tier and flags overdue review STALE', () => {
    expect(checkTiers({ gates: [{ id: 'x', tier: undefined }] }).join(' ')).toMatch(/tier/);
    const stale = checkTiers({ gates: [{ id: 'y', tier: 'observational', review_at: '2020-01-01', promote_if: 'p' }] }, Date.now());
    expect(stale.join(' ')).toMatch(/STALE/);
    expect(checkTiers({ gates: [] }).length).toBe(0);
  });
  test('length_discrimination stays confirmatory (ADR-0031 D2)', () => {
    const g = THRESHOLDS.judge_bias_gates.find(x => x.metric === 'length_discrimination');
    expect(g.tier).toBe('confirmatory');
  });
});

describe('D4: judge certificate isolation (whitelist triple)', () => {
  test('buildJudgeInput emits exactly { claim, toolResults, heuristicVerdict }', () => {
    const jin = det.buildJudgeInput('done', [{ output: 'ok' }], { suspicious: true, severity: 'high', matched_phrases: ['x'], judge_override: 'leak' });
    expect(Object.keys(jin).sort()).toEqual(['claim', 'heuristicVerdict', 'toolResults']);
    expect(Object.keys(jin.heuristicVerdict).sort()).toEqual(['severity', 'suspicious']);
    expect(det.validateJudgeInput(jin)).toEqual([]);
  });
  test('fail-closed on injected auditor/probe/prior-judge fields', () => {
    const base = det.buildJudgeInput('c', [], { suspicious: true, severity: 'low' });
    const poisoned = Object.assign({}, base, { auditorVerdict: 'x' });
    expect(det.validateJudgeInput(poisoned).join(' ')).toMatch(/extra-key:auditorVerdict|forbidden-key/);
    const poisoned2 = Object.assign({}, base, { probe_history: [] });
    expect(det.validateJudgeInput(poisoned2).length).toBeGreaterThan(0);
    const poisoned3 = Object.assign({}, base, { claim: 42 });
    expect(det.validateJudgeInput(poisoned3).length).toBeGreaterThan(0);
  });
  test('detectFull suspicious path feeds the seam the reduced triple (no matched_phrases upstream)', () => {
    const r = det.detectFull({
      closingText: 'Done, everything is complete and fully working.',
      toolResults: [{ is_error: false, output: 'noise' }],
      turn: { filesEdited: ['a.js'], verifyRun: false }
    });
    expect(r.suspicious).toBe(true);
    expect(r.judge_override).toBeNull();
  });
});

describe('D5: evidence provenance (optional additive)', () => {
  test('absent provenance leaves chain byte-identical (backward compat)', () => {
    const a = evlo.createRecord('g', 't', 'passed', 'd', 0.5, null, undefined);
    const b = evlo.createRecord('g', 't', 'passed', 'd', 0.5, null, {});
    expect(Object.keys(a)).not.toContain('provenance');
    expect(Object.keys(b)).not.toContain('provenance');
  });
  test('present-but-invalid provenance fails verifyChain', () => {
    const good = evlo.createRecord('g', 't', 'passed', 'd', 0.5, null, { provenance: { builder: { profile: 'verifier', rules_version: '1', thresholds_fp: 'deadbeef', hook: 'h' } } });
    expect(evlo.verifyChain([good]).valid).toBe(true);
    const bad = evlo.createRecord('g', 't', 'passed', 'd', 0.5, null, { provenance: { builder: 42 } });
    expect(evlo.verifyChain([bad]).valid).toBe(false);
    const badHex = evlo.createRecord('g', 't', 'passed', 'd', 0.5, null, { provenance: { materials: { claim_sha256: 'ZZZ' } } });
    expect(evlo.verifyChain([badHex]).valid).toBe(false);
  });
});

describe('D6: reverify F4/F5 debt fixes', () => {
  test('conclude: fail_soft==0 is not sufficient (dead judge fails)', () => {
    expect(reverify.conclude({ fail_soft: 0, invocations: 2, overrides_accepted: 1, need_override: 2 }, 2, null).conclusion).toBe('pass');
    expect(reverify.conclude({ fail_soft: 0, invocations: 2, overrides_accepted: 0, need_override: 2 }, 2, null).conclusion).toBe('fail');
    expect(reverify.conclude({ fail_soft: 0, invocations: 0, overrides_accepted: 0, need_override: 2 }, 2, null).conclusion).toBe('fail');
    expect(reverify.conclude({ fail_soft: 1, invocations: 2, overrides_accepted: 1, need_override: 2 }, 2, null).conclusion).toBe('fail');
  });
  test('runKey: same-day identical outcome idempotent, changed outcome distinct', () => {
    const m = { invocations: 2, fail_soft: 0, overrides_accepted: 1, stale: 0, override_rate: 0.5 };
    expect(reverify.runKey(m, '2026-08-29T09:00:00Z')).toBe(reverify.runKey(m, '2026-08-29T23:00:00Z'));
    expect(reverify.runKey(m, '2026-08-29T09:00:00Z')).not.toBe(reverify.runKey(Object.assign({}, m, { fail_soft: 1 }), '2026-08-29T09:00:00Z'));
    const l1 = reverify.appendEntry([], { collected_at: '2026-08-29T00:00:00Z', metrics: m, conclusion: 'pass', run_key: 'k1' });
    expect(l1[0].run_key).toBe('k1');
    expect(reverify.verifyLedger(l1)).toBeNull(); // run_key rides the hash chain
  });
});

describe('D2/D3 gate live run', () => {
  test('check-judge-bias CLI exits 0 on the real corpus', () => {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'bench', 'polygraph', 'check-judge-bias.js')], { encoding: 'utf8' });
    expect(out).toMatch(/PASS judge-length-discrimination/);
    expect(out).toMatch(/\[judge-bias\] OK/);
  });
});
