'use strict';

// test/adr-0048-wiring.test.js -- ADR-0048 implementation-round wiring lock.
// Locks the vocabulary content anchor, record-only projection, and metrological ledger fields.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const changeSurface = require('../src/change-surface');
const instrument = require('../src/instrument-identity');
const reverify = require('../scripts/reverify');

const adr47 = fs.readFileSync(path.join(ROOT, 'docs/adr/0047-impact-tiered-instrument-change-control.md'), 'utf8');

describe('ADR-0048 D-C vocabulary content anchor', () => {
  test('real anchor passes config shape and verbatim token check', () => {
    const cfg = changeSurface.loadChangeSurface(ROOT);
    expect(cfg.anchor.tokens).toEqual(expect.arrayContaining(['identity', 'corpus', 'threshold', 'schedule_gate']));
    expect(changeSurface.vocabularyAnchorErrors(adr47, cfg.anchor.tokens)).toEqual([]);
  });

  test('negative: a missing canonical token is caught by whole-word existence', () => {
    const bad = adr47.replace('`certify` `approve`', '`certify` `approval`');
    expect(changeSurface.vocabularyAnchorErrors(bad, changeSurface.ANCHOR_TOKENS)).toContain('token not anchored: approve');
  });
});

describe('ADR-0048 D-B record-only projection', () => {
  const base = instrument.loadState(ROOT);
  const identity = base.authoritative_identity_digest;

  test('record_only_change stays authoritative; signoff projects pending to certified', () => {
    const pending = instrument.transition(base, {
      type: 'record_only_change',
      identity_digest: identity,
      surface: 'schedule_gate',
      before: { schedule: '6m' },
      after: { schedule: '9m' },
      maker_id: 'maker-a',
    });
    expect(pending.state).toBe('authoritative');
    expect(pending.history[pending.history.length - 1].kind).toBe('record_only_change');
    expect(instrument.projectRecordStatus(pending.history)).toMatchObject([{ record_seq: pending.history[pending.history.length - 1].seq, status: 'pending_signoff' }]);

    const certified = instrument.transition(pending, {
      type: 'record_signoff',
      identity_digest: identity,
      record_seq: pending.history[pending.history.length - 1].seq,
      reviewer_id: 'reviewer-a',
      attestation_type: 'approve',
      reason: 'accepted schedule gate change',
    });
    expect(certified.state).toBe('authoritative');
    expect(certified.history[certified.history.length - 1].kind).toBe('record_signoff');
    expect(instrument.projectRecordStatus(certified.history)).toMatchObject([{ record_seq: pending.history[pending.history.length - 1].seq, status: 'certified', reviewer_id: 'reviewer-a' }]);
    expect(instrument.verifyState(certified).valid).toBe(true);
  });

  test('record signoff rejects a missing mandatory reason', () => {
    const pending = instrument.transition(base, {
      type: 'record_only_change',
      identity_digest: identity,
      surface: 'schedule_gate',
      before: { a: 1 },
      after: { a: 2 },
      maker_id: 'maker-b',
    });
    expect(() => instrument.transition(pending, {
      type: 'record_signoff',
      identity_digest: identity,
      record_seq: pending.history[pending.history.length - 1].seq,
      reviewer_id: 'reviewer-b',
      attestation_type: 'approve',
      reason: '',
    })).toThrow(/reason/);
  });
});

describe('ADR-0048 D-A metrological ledger', () => {
  test('Clopper-Pearson exact interval handles small/extreme samples', () => {
    const ci = reverify.clopperPearson95(3, 10);
    expect(ci[0]).toBeGreaterThan(0.06);
    expect(ci[1]).toBeLessThan(0.66);
    expect(reverify.clopperPearson95(0, 10)[1]).toBeCloseTo(0.3085, 3);
  });

  test('appendEntry declares no_adjustment once; as-left appears only on adjustment (ADR-0049 D-A)', () => {
    const identity = { rules_digest: 'rules', model_checkpoint_digest: 'model', inference_config_hash: 'inference', triple_hash: 'triple' };
    const perEntry = [];
    for (let i = 0; i < 10; i++) perEntry.push({ id: String(i), expected_judge: i % 3 === 0 ? 'override' : 'uphold', observed: i % 3 === 0 ? 'honest' : 'lie' });
    const metrics = { invocations: 10, need_override: 10, overrides_accepted: 3, override_rate: 0.3, fail_soft: 0, per_entry: perEntry };
    const metrology = reverify.computeMetrology(metrics, identity, { bootstrapIterations: 100 });
    const ledger = reverify.appendEntry([], { collected_at: new Date().toISOString(), metrics: { invocations: 10 }, conclusion: 'pass', metrology });
    expect(ledger[0].as_found.override_rate).toBe(0.3);
    expect(ledger[0].as_found.score_distribution).toEqual({ honest: 4, lie: 6 });
    // ADR-0049 D-A supersedes the ADR-0048 placeholder: no adjustment records
    // as-found once with an explicit no_adjustment declaration, no as-left copy.
    expect(ledger[0].as_left).toBeUndefined();
    expect(ledger[0].no_adjustment).toBe(false); // conformity is 'conditional' without a numeric spec_limit
    expect(ledger[0].conformity).toBe('conditional');
    expect(ledger[0].observed_delta).toEqual({ overrides_accepted: 0, override_rate: 0, fail_soft: 0 });
    expect(ledger[0].adjusted).toBeUndefined(); // ADR-0049 D-A replaces the adjusted flag with no_adjustment
    expect(ledger[0].sample_size).toBe(10);
    expect(reverify.verifyLedger(ledger)).toBeNull();
  });
});

describe('ADR-0048 executable wiring', () => {
  test('real repo passes instrument check and schedule_gate classification', () => {
    const env = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: path.join(os.tmpdir(), 'jh-0048-real') });
    const check = spawnSync(process.execPath, ['scripts/instrument.js', '--check'], { cwd: ROOT, encoding: 'utf8', env });
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('identity pinned and authoritative');
    const classified = spawnSync(process.execPath, ['scripts/instrument.js', '--classify', '--surface', 'schedule_gate'], { cwd: ROOT, encoding: 'utf8', env });
    expect(classified.status).toBe(0);
    expect(classified.stdout).toContain('schedule_gate -> record');
  });
});
