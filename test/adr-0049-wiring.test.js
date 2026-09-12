'use strict';

// test/adr-0049-wiring.test.js -- ADR-0049 implementation-round wiring lock.
// Locks the declared no-adjustment ledger form (D-A), the decision-rule anchor
// (D-B), the corpus_ref row identity with the cross-baseline subtraction ban
// (D-C), the criteria-change restatement fallback (D-D, defer-0023 pending),
// and the affected sign-off look-back evidence kinds (D-E).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const instrument = require('../src/instrument-identity');
const { KNOWN_EVIDENCE_KINDS, createRecord } = require('../src/evidence-log');
const reverify = require('../scripts/reverify');

const REGISTRY = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));

const identity = { rules_digest: 'rules', model_checkpoint_digest: 'model', inference_config_hash: 'inference', triple_hash: 'triple' };

// ADR-0060 D-A: the sampling plan is part of the rule identity (min_n = 100), so
// the fixture is powered above min_n. The metric rates are unchanged (0.3).
function sampleMetrics() {
  const perEntry = [];
  for (let i = 0; i < 120; i++) perEntry.push({ id: String(i), expected_judge: i % 10 < 3 ? 'override' : 'uphold', observed: i % 10 < 3 ? 'honest' : 'lie' });
  return { invocations: 120, need_override: 120, overrides_accepted: 36, override_rate: 0.3, fail_soft: 0, per_entry: perEntry };
}

describe('ADR-0049 D-A declared no-adjustment', () => {
  test('no adjustment row: no_adjustment declared, no as-left copy', () => {
    const corpusRef = { digest: 'a'.repeat(64), version: '1.1', id: 'judge-twins.jsonl' };
    // specLimit 0.8 puts flip_rate 0.3 below acceptance_limit (~0.8 - CI half-width ~0.29).
    const m = reverify.computeMetrology(sampleMetrics(), identity, { bootstrapIterations: 100, specLimit: 0.8, corpusRef });
    expect(m.conformity).toBe('pass');
    expect(m.no_adjustment).toBe(true);
    expect(m.as_left).toBeUndefined();
    expect(m.observed_delta).toEqual({ overrides_accepted: 0, override_rate: 0, fail_soft: 0 });
    const ledger = reverify.appendEntry([], { collected_at: new Date().toISOString(), metrics: { invocations: 10 }, conclusion: 'pass', metrology: m });
    expect(ledger[0].as_left).toBeUndefined();
    expect(ledger[0].no_adjustment).toBe(true);
    expect(ledger[0].event_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(reverify.verifyLedger(ledger)).toBeNull();
  });

  test('adjustment event carries as-left paired with its date', () => {
    const asLeft = { overrides_accepted: 5, override_rate: 0.5, fail_soft: 0, invocations: 10 };
    const m = reverify.computeMetrology(sampleMetrics(), identity, {
      bootstrapIterations: 100,
      specLimit: 0.8,
      corpusRef: { digest: 'd', version: '1.1', id: 'judge-twins.jsonl' },
      adjustment: { type: 'criteria_change', date: '2026-09-06', as_left: asLeft },
    });
    expect(m.as_left).toEqual(asLeft);
    expect(m.as_left_date).toBe('2026-09-06');
    expect(m.adjustment).toEqual({ type: 'criteria_change', date: '2026-09-06' });
    expect(m.no_adjustment).toBeUndefined();
    expect(m.observed_delta.override_rate).toBeCloseTo(0.2, 10);
  });

  test('rebaseline adjustment declares cross-baseline non-comparable, no silent subtraction', () => {
    const asLeft = { overrides_accepted: 5, override_rate: 0.5, fail_soft: 0, invocations: 10 };
    const m = reverify.computeMetrology(sampleMetrics(), identity, {
      bootstrapIterations: 100,
      specLimit: 0.8,
      corpusRef: { digest: 'e', version: '2.0', id: 'judge-twins.jsonl' },
      adjustment: { type: 'rebaseline', date: '2026-09-06', as_left: asLeft },
    });
    // D-C: as_left is on the new corpus; as_left - as_found crosses baselines.
    expect(m.observed_delta).toBeNull();
    expect(m.cross_baseline).toContain('non-comparable');
  });
});

describe('ADR-0049 D-B decision-rule anchor', () => {
  test('guarded acceptance default: w=1, k=2, acceptance_limit recorded per row', () => {
    const rule = reverify.defaultDecisionRule(0.1);
    expect(rule).toMatchObject({ id: 'ilac-g8-guarded-acceptance', version: '0060.1', w: 1, k: 2, min_n: 100, spec_limit: 0.1 });
    expect(rule.spec_ref).toContain('thresholds.json');
    expect(rule.uncertainty_basis).toContain('not MPE-only');
    const pass = reverify.evaluateConformity(0.05, [0.02, 0.08], rule, 100);
    expect(pass.result).toBe('pass');
    expect(pass.acceptance_limit).toBeCloseTo(0.07, 10);
    const cond = reverify.evaluateConformity(0.09, [0.02, 0.08], rule, 100);
    expect(cond.result).toBe('conditional');
    const fail = reverify.evaluateConformity(0.2, [0.02, 0.08], rule, 100);
    expect(fail.result).toBe('fail');
    // D-E: the look-back trigger is the Wilson interval over limit, kept
    // separate from the pass/conditional/fail statement.
    expect(pass.lookback).toBe(false);
    expect(fail.lookback).toBe(true);
    const ciOverButPointUnder = reverify.evaluateConformity(0.06, [0.02, 0.12], rule, 100);
    expect(ciOverButPointUnder.lookback).toBe(true);
    // ADR-0060 D-A/D-B: below min_n the honest statement is `indeterminate`,
    // never a confirmed non-conformity.
    const under = reverify.evaluateConformity(0.05, [0.02, 0.08], rule, 22);
    expect(under.result).toBe('indeterminate');
    expect(under.min_n).toBe(100);
    const cInd = reverify.conclude({ fail_soft: 0, invocations: 22, need_override: 22, overrides_accepted: 3, stale: 0 }, 22, null, 'indeterminate');
    expect(cInd.conclusion).toBe('indeterminate');
    const cHard = reverify.conclude({ fail_soft: 1, invocations: 22, need_override: 22, overrides_accepted: 3, stale: 0 }, 22, null, 'indeterminate');
    expect(cHard.conclusion).toBe('fail');
    // ADR-0060 Consequences register the three deferred work items.
    for (const id of ['defer-0032', 'defer-0033', 'defer-0034']) {
      const e = REGISTRY.entries.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e.source_adr).toContain('0060');
      expect(e.status).toBe('pending-evaluation');
    }
  });

  test('simple acceptance requires negotiated TUR >= 4:1', () => {
    expect(() => reverify.evaluateConformity(0.05, [0, 0], { w: 0, spec_limit: 0.1, tur: 2 })).toThrow(/TUR >= 4:1/);
    const ok = reverify.evaluateConformity(0.05, [0, 0], { w: 0, spec_limit: 0.1, tur: 4 });
    expect(ok.result).toBe('pass');
  });

  test('guard-band conditional yields no pass statement through conclude', () => {
    const c = reverify.conclude({ invocations: 10, fail_soft: 0, overrides_accepted: 3, need_override: 10 }, 10, null, 'conditional');
    expect(c.conclusion).toBe('fail');
    expect(c.reasons.join(' ')).toContain('guard-band conditional zone');
  });

  test('conformity fail routes as drift exposure with look-back reason', () => {
    const c = reverify.conclude({ invocations: 10, fail_soft: 0, overrides_accepted: 3, need_override: 10 }, 10, null, 'fail');
    expect(c.conclusion).toBe('fail');
    expect(c.reasons.join(' ')).toContain('drift exposure');
  });
});

describe('ADR-0049 D-C corpus_ref row identity', () => {
  test('corpus digest matches thresholds fingerprint definition', () => {
    const entries = [{ a: 1 }, { b: 2 }];
    const d = reverify.corpusDigest(entries);
    expect(d).toMatch(/^[0-9a-f]{64}$/);
    expect(d).not.toBe(reverify.corpusDigest([{ a: 1 }]));
  });

  test('cross-baseline subtraction is forbidden: drift is non-comparable without same corpus_ref', () => {
    const prev = { as_left: { overrides_accepted: 3, override_rate: 0.3, fail_soft: 0 }, corpus_ref: { digest: 'old0', version: '1.0', id: 'judge-twins.jsonl' } };
    const m = reverify.computeMetrology(sampleMetrics(), identity, {
      bootstrapIterations: 100,
      specLimit: 0.8,
      corpusRef: { digest: 'new0', version: '1.1', id: 'judge-twins.jsonl' },
      previous: prev,
    });
    expect(m.drift_vs_previous_as_left).toBeNull();
    expect(m.cross_baseline).toBe('non-comparable (ADR-0049 D-C)');
  });

  test('same corpus_ref keeps drift comparable', () => {
    const digest = 'e'.repeat(64);
    const prev = { as_left: { overrides_accepted: 1, override_rate: 0.1, fail_soft: 0 }, corpus_ref: { digest, version: '1.1', id: 'judge-twins.jsonl' } };
    const m = reverify.computeMetrology(sampleMetrics(), identity, {
      bootstrapIterations: 100,
      specLimit: 0.8,
      corpusRef: { digest, version: '1.1', id: 'judge-twins.jsonl' },
      previous: prev,
    });
    expect(m.drift_vs_previous_as_left).not.toBeNull();
    expect(m.drift_vs_previous_as_left.override_rate).toBeCloseTo(0.2, 10);
    expect(m.cross_baseline).toBeUndefined();
  });
});

describe('ADR-0049 D-D criteria-change replay precondition (defer-0023)', () => {
  const base = instrument.loadState(ROOT);
  const identityDigest = base.authoritative_identity_digest;

  test('criteria_change without restatement_of is refused fail-closed', () => {
    expect(() => instrument.transition(base, {
      type: 'criteria_change',
      identity_digest: identityDigest,
      criteria_version: 'v2',
      previous_criteria_version: 'v1',
      reviewer_id: 'reviewer-a',
      attestation_type: 'approve',
    })).toThrow(/restatement_of/);
  });

  test('pointwise replay claim is refused while defer-0023 is pending', () => {
    expect(() => instrument.transition(base, {
      type: 'criteria_change',
      identity_digest: identityDigest,
      criteria_version: 'v2',
      previous_criteria_version: 'v1',
      restatement_of: 'v1',
      pointwise_replay: true,
      reviewer_id: 'reviewer-a',
      attestation_type: 'approve',
    })).toThrow(/defer-0023/);
  });

  test('restatement mapping succeeds and is carried on the chain', () => {
    const next = instrument.transition(base, {
      type: 'criteria_change',
      identity_digest: identityDigest,
      criteria_version: 'v2',
      previous_criteria_version: 'v1',
      restatement_of: 'v1',
      reviewer_id: 'reviewer-a',
      attestation_type: 'approve',
    });
    expect(next.history[next.history.length - 1].restatement_of).toBe('v1');
    expect(instrument.verifyState(next).valid).toBe(true);
  });

  test('defer-0023 stays pending-evaluation in the real registry', () => {
    const entry = REGISTRY.entries.find(e => e.id === 'defer-0023');
    expect(entry).toBeDefined();
    expect(entry.status).toBe('pending-evaluation');
    expect(entry.source_adr).toContain('0049');
  });
});

describe('ADR-0049 D-E affected sign-off look-back', () => {
  const base = instrument.loadState(ROOT);
  const identityDigest = base.authoritative_identity_digest;

  test('look-back evidence kinds are registered and hash-chained', () => {
    expect(KNOWN_EVIDENCE_KINDS).toEqual(['reverse_traceability', 'oot_impact_assessment']);
    const rec = createRecord('g1', 'checklist', 'passed', 'PRIOR-INTERVAL OK', 0.9, null, { evidence_kind: 'reverse_traceability' });
    expect(rec.evidence_kind).toBe('reverse_traceability');
    expect(rec.requires_escalation).toBe(true);
    expect(rec.event_hash).toMatch(/^[0-9a-f]{64}$/);
    const bad = createRecord('g2', 'checklist', 'passed', 'x', 0.9, rec.event_hash, { evidence_kind: 'bogus' });
    expect(bad.evidence_kind).toBeUndefined();
    expect(bad.requires_escalation).toBe(true);
    expect(bad.unrecognized_evidence_kind).toBe('bogus');
  });

  test('drift exposure marks prior-interval sign-offs affected/under-review', () => {
    let state = instrument.transition(base, {
      type: 'record_only_change',
      identity_digest: identityDigest,
      surface: 'schedule_gate',
      before: { a: 1 },
      after: { a: 2 },
      maker_id: 'maker-a',
    });
    state = instrument.transition(state, {
      type: 'record_signoff',
      identity_digest: identityDigest,
      record_seq: state.history[state.history.length - 1].seq,
      reviewer_id: 'reviewer-a',
      attestation_type: 'approve',
      reason: 'scheduled change accepted',
    });
    expect(instrument.affectedSignoffs(state.history)).toEqual([]);
    state = instrument.transition(state, {
      type: 'drift_exposure',
      identity_digest: identityDigest,
      ledger_seq: 7,
    });
    const affected = instrument.affectedSignoffs(state.history);
    expect(affected.length).toBe(1);
    expect(affected[0].kind).toBe('record_signoff');
    expect(affected[0].status).toBe('affected/under-review');
    expect(instrument.verifyState(state).valid).toBe(true);
  });

  test('disposition closes the exposure via the look-back evidence kinds', () => {
    let state = instrument.transition(base, {
      type: 'drift_exposure',
      identity_digest: identityDigest,
      ledger_seq: 8,
    });
    const exposureSeq = state.history[state.history.length - 1].seq;
    state = instrument.transition(state, {
      type: 'lookback_disposition',
      identity_digest: identityDigest,
      exposure_seq: exposureSeq,
      evidence_kind: 'oot_impact_assessment',
      disposition: 'accept',
      reviewer_id: 'reviewer-a',
      reason: 'negative finding documented: drift did not reach shipped verdicts',
    });
    expect(instrument.affectedSignoffs(state.history)).toEqual([]);
    expect(state.history[state.history.length - 1].evidence_kind).toBe('oot_impact_assessment');
    expect(instrument.verifyState(state).valid).toBe(true);
  });

  test('disposition without an open exposure fails closed', () => {
    expect(() => instrument.transition(base, {
      type: 'lookback_disposition',
      identity_digest: identityDigest,
      exposure_seq: 999,
      evidence_kind: 'reverse_traceability',
      disposition: 'accept',
      reviewer_id: 'reviewer-a',
      reason: 'none open',
    })).toThrow(/missing or already-disposed/);
  });
});

describe('ADR-0049 executable wiring', () => {
  test('real repo passes instrument check and schedule_gate classification', () => {
    const env = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: path.join(os.tmpdir(), 'jh-0049-real') });
    const check = spawnSync(process.execPath, ['scripts/instrument.js', '--check'], { cwd: ROOT, encoding: 'utf8', env });
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('identity pinned and authoritative');
    const classified = spawnSync(process.execPath, ['scripts/instrument.js', '--classify', '--surface', 'schedule_gate'], { cwd: ROOT, encoding: 'utf8', env });
    expect(classified.status).toBe(0);
    expect(classified.stdout).toContain('schedule_gate -> record');
  });
});
