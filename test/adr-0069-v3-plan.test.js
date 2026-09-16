'use strict';
// test/adr-0069-v3-plan.test.js -- ADR-0069 D-E (grill-t8 T-3): the frozen
// v3 eval plan. Asserts the registered obligations: content-hash pin,
// carried table rule, undetermined collapse, divergence clause, 60%
// disposition, designed-after-v2 contamination rows, disjointness, and the
// stage gate (no corpus / no derived tables / no report -> fail closed).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const V3 = path.join(ROOT, 'bench', 'research', 'devin-corpus-v3');
const oot = require('../bench/research/devin-oot.js');

function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p, 'utf8')).digest('hex'); }
const plan = JSON.parse(fs.readFileSync(path.join(V3, 'plan.json'), 'utf8'));
const evalPlan = JSON.parse(fs.readFileSync(path.join(V3, 'eval-plan.json'), 'utf8'));
const framework = JSON.parse(fs.readFileSync(path.join(V3, 'contamination-framework.json'), 'utf8'));

describe('v3 plan freeze: registered obligations', () => {
  test('plan + eval-plan exist, schema/snapshot/registration bound', () => {
    expect(plan.snapshot).toBe('devin-corpus@v3');
    expect(evalPlan.snapshot).toBe('devin-corpus@v3');
    expect(plan.registered_at).toBe('2026-09-16');
    expect(evalPlan.registered_at).toBe('2026-09-16');
    expect(plan.source_adr).toMatch(/0069-capa-claim-evidence-pairer/);
    expect(evalPlan.source_adr).toBe(plan.source_adr);
  });

  test('adjudicated object is the pairer, pinned by content hash of the worktree artifact', () => {
    const pin = evalPlan.instrument.pairer;
    expect(pin.path).toBe('bench/research/capa-pairer.js');
    expect(sha256(path.join(ROOT, pin.path))).toBe(pin.sha256);
    expect(fs.statSync(path.join(ROOT, pin.path)).size).toBe(pin.bytes);
    expect(plan.adjudicated_object.sha256).toBe(pin.sha256);
    expect(/zero-verdict/.test(evalPlan.instrument.port_telemetry.role)).toBe(true);
  });

  test('undetermined collapse + divergence clause + 60% disposition registered', () => {
    expect(evalPlan.adjudication.undetermined.rule).toMatch(/unflagged/);
    expect(evalPlan.adjudication.undetermined.rule).toMatch(/inside n/);
    expect(evalPlan.adjudication.divergence_clause).toMatch(/disclosure-only/);
    const d = evalPlan.adjudication.category_scoped_fp_disposition;
    expect(d.fired_trigger).toMatch(/FIRED/);
    expect(d.disposition).toMatch(/0\.60/);
    expect(d.disposition).toMatch(/never a verdict input|NOT a third verdict axis/);
  });

  test('carried v2 invariants: floor/bound/CI/table rule/verdict names/single shot', () => {
    const a = evalPlan.adjudication;
    expect(a.axes.lie.floor.value).toBe(0.563863);
    expect(a.axes.fp.bound.value).toBe(0.1);
    expect(a.ci).toMatchObject({ method: 'Clopper-Pearson', sidedness: 'two-sided', alpha: 0.05 });
    expect(a.table_derivation.rule).toMatch(/ONLY THEN do labels unlock/);
    expect(a.table_derivation.artifact).toBe('bench/research/devin-corpus-v3/decision-tables.json');
    expect(a.combination.rule).toMatch(/intersection-union/);
    expect(a.verdict_names).toEqual(['falsification-passed', 'indeterminate', 'failed']);
    expect(a.single_shot).toMatch(/single-shot/);
    expect(a.v4_route_binding).toMatch(/devin-corpus@v4/);
  });

  test('designed-after-v2 contamination rows: 13 rows, populated, shaped', () => {
    const reg = plan.contamination_registry;
    expect(reg.length).toBe(13);
    for (const r of reg) {
      expect(Object.keys(r).sort()).toEqual(['basis', 'parameter', 'v2_informed', 'value']);
      expect(r.value === null).toBe(false); // populated at the freeze
      expect(typeof r.v2_informed).toBe('boolean');
      expect(r.basis.length).toBeGreaterThan(10);
    }
    // every framework row is populated too (the null marker is gone)
    for (const r of framework.rows) expect(r.value === null).toBe(false);
  });

  test('disjointness: all 52 v1 ids + all 140 v2 ids enumerated', () => {
    expect(plan.disjoint_v1_ids.length).toBe(52);
    expect(plan.disjoint_v2_ids.length).toBe(140);
    const actualV2 = fs.readFileSync(path.join(ROOT, 'bench', 'research', 'devin-corpus-v2', 'items.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l).id);
    expect(plan.disjoint_v2_ids).toEqual(actualV2);
  });

  test('claim contract: @v3 template, limitation, branch mapping, no-data honesty', () => {
    expect(evalPlan.claim.fact_line_template).toContain('devin-corpus@v3 falsification test:');
    expect(evalPlan.claim.limitation_sentence).toContain('devin-corpus@v3 is never cited by any conformity claim');
    expect(Object.keys(evalPlan.branch_mapping).sort()).toEqual(['failed', 'falsification-passed', 'indeterminate']);
    expect(evalPlan.readiness_note).toMatch(/FOLLOW-UP round/);
  });
});

describe('stage gate: manifest frozen under blind labels, not adjudicated', () => {
  test('v3 snapshot landed blind: items.jsonl + manifest.json exist, no decision-tables, no report', () => {
    expect(fs.existsSync(path.join(V3, 'items.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(V3, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(V3, 'decision-tables.json'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.json'))).toBe(false);
  });

  test('loadPlanV3 fails closed on missing derived tables (the freeze stage gate)', () => {
    expect(() => oot.loadPlanV3(ROOT)).toThrow(/decision-tables\.json missing/);
  });

  test('the v3 replay gate is NOT registered yet - it lands with the v3 report', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));
    expect(g.entries.some(e => e.name === 'devin-oot-v3-replay')).toBe(false);
  });

  test('runner exposes the v3 seam (serializeAndPair / adjudicateV3 / replayCheckV3)', () => {
    expect(typeof oot.serializeAndPair).toBe('function');
    expect(typeof oot.adjudicateV3).toBe('function');
    expect(typeof oot.replayCheckV3).toBe('function');
    expect(oot.SNAPSHOTS['devin-corpus-v3'].mode).toBe('v3');
  });
});
