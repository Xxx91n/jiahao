'use strict';

// test/adr-0047-wiring.test.js -- ADR-0047 implementation-round wiring lock.
// Locks the machine fact-source, three-layer UNRESOLVED model identity,
// inference-config metadata split, and the two authoritative event types.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const instrument = require('../src/instrument-identity');
const changeSurface = require('../src/change-surface');

describe('ADR-0047 change-surface fact source', () => {
  test('the real classifier maps every surface to its tiered response', () => {
    const cfg = changeSurface.loadChangeSurface(ROOT);
    expect(cfg.schema_version).toBe(1);
    expect(changeSurface.classify('identity', cfg)).toMatchObject({ response: 'quarantine' });
    expect(changeSurface.classify('corpus', cfg)).toMatchObject({ response: 'rebaseline' });
    expect(changeSurface.classify('threshold', cfg)).toMatchObject({ response: 'criteria-change' });
    expect(changeSurface.classify('schedule_gate', cfg)).toMatchObject({ response: 'record' });
  });
});

describe('ADR-0047 instrument identity refinement', () => {
  test('model axis is UNRESOLVED when tag has no immutable snapshot/weights', () => {
    const pin = instrument.loadPin(ROOT);
    const resolved = instrument.resolveInstrumentIdentity(ROOT);
    expect(instrument.verifyPin(resolved, pin).ok).toBe(true);
    expect(resolved.model_checkpoint_digest).toBe('UNRESOLVED');
  });

  test('inference hash excludes observational metadata', () => {
    const pin = instrument.loadPin(ROOT);
    const resolved = instrument.resolveInstrumentIdentity(ROOT);
    expect(resolved.inference_config_hash).toBe(pin.inference_config_hash);
    const changedObservation = Object.assign({}, pin.inference_config, {
      observation: { system_fingerprint: 'fp-changed' },
    });
    expect(instrument.inferenceConfigHash(changedObservation)).toBe(pin.inference_config_hash);
  });
});

describe('ADR-0047 authoritative state-machine event types', () => {
  const identity = 'a'.repeat(64);

  test('corpus_rebaseline and criteria_change append evidence while authoritative', () => {
    const base = instrument.loadState(ROOT);
    const rebaselined = instrument.transition(base, {
      type: 'corpus_rebaseline',
      identity_digest: base.authoritative_identity_digest,
      corpus_ref: 'corpus-v2',
      previous_corpus_ref: 'corpus-v1',
      outcome: 'pass',
      rollback_available: true,
      reviewer_id: 'reviewer-a',
      attestation_type: 'approve',
    });
    expect(rebaselined.state).toBe('authoritative');
    expect(rebaselined.history[rebaselined.history.length - 1].kind).toBe('corpus_rebaseline');

    const changed = instrument.transition(rebaselined, {
      type: 'criteria_change',
      identity_digest: rebaselined.authoritative_identity_digest,
      criteria_version: 'v2',
      previous_criteria_version: 'v1',
      reviewer_id: 'reviewer-b',
      attestation_type: 'approve',
    });
    expect(changed.state).toBe('authoritative');
    expect(changed.history[changed.history.length - 1].kind).toBe('criteria_change');
    expect(instrument.verifyState(changed).valid).toBe(true);
  });

  test('failed rebaseline without rollback escalates to quarantine', () => {
    const base = instrument.loadState(ROOT);
    const next = instrument.transition(base, {
      type: 'corpus_rebaseline',
      identity_digest: base.authoritative_identity_digest,
      corpus_ref: 'corpus-v2',
      previous_corpus_ref: 'corpus-v1',
      outcome: 'fail',
      rollback_available: false,
      reviewer_id: 'reviewer-a',
      attestation_type: 'certify',
    });
    expect(next.state).toBe('quarantined');
    expect(next.history.filter(e => e.kind === 'corpus_rebaseline')).toHaveLength(1);
    expect(next.history[next.history.length - 1].kind).toBe('quarantine');
    expect(instrument.verifyState(next).valid).toBe(true);
  });

  test('signoff requires certify or approve attestation', () => {
    const base = instrument.loadState(ROOT);
    const q = instrument.transition(base, { type: 'identity-change', identity_digest: identity });
    expect(() => instrument.transition(q, {
      type: 'signoff',
      identity_digest: identity,
      reviewer_id: 'reviewer-a',
      reverify_ledger_hash: 'b'.repeat(64),
      bias_probe_hash: 'c'.repeat(64),
    })).toThrow(/attestation_type/);
  });
});

describe('ADR-0047 executable wiring', () => {
  test('the real repo passes the live instrument gate and classifies a surface', () => {
    const env = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: path.join(os.tmpdir(), 'jh-0047-real') });
    const check = spawnSync(process.execPath, ['scripts/instrument.js', '--check'], {
      cwd: ROOT, encoding: 'utf8', env,
    });
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('model UNRESOLVED');
    expect(check.stdout).toContain('identity pinned and authoritative');

    const classified = spawnSync(process.execPath, ['scripts/instrument.js', '--classify', '--surface', 'corpus'], {
      cwd: ROOT, encoding: 'utf8', env,
    });
    expect(classified.status).toBe(0);
    expect(classified.stdout).toContain('corpus -> rebaseline');
  });
});
