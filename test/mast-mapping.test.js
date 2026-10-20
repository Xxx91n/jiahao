'use strict';
// test/mast-mapping.test.js — ADR-0103 / Ledger D-009 / ADR-0059
// Tests for in-repo synthetic fixture coherence and honest status reporting.

const fs = require('fs');
const path = require('path');
const { loadSubset, evaluateMastMapping, SUBSET_PATH, OUT_PATH } = require('../bench/research/mast/mapping-validation');

describe('MAST in-repo fixture coherence validation (ADR-0059 / D-009)', () => {
  test('subset fixture exists with _provenance and 19 items', () => {
    expect(fs.existsSync(SUBSET_PATH)).toBe(true);
    const data = JSON.parse(fs.readFileSync(SUBSET_PATH, 'utf8'));
    expect(data._provenance).toBeDefined();
    expect(data._provenance.type).toBe('in_repo_coherence_fixture');
    expect(data._provenance.independence_evidence).toBe(false);

    const items = loadSubset();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(19);
    for (const item of items) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.task).toBe('string');
      expect(typeof item.transcript).toBe('string');
      expect(typeof item.ground_truth).toBe('string');
    }
  });

  test('evaluation confirms classification rule coherence on synthetic fixture', () => {
    const items = loadSubset();
    const res = evaluateMastMapping(items);
    expect(res.evidence_type).toBe('in_repo_coherence_fixture');
    expect(res.independence_evidence).toBe(false);
    expect(res.metrics.cohens_kappa).toBeGreaterThan(0);
    expect(res.metrics.f1_score).toBeGreaterThan(0);
    expect(res.confusion_matrix.tp).toBeGreaterThan(0);
    expect(res.adjudication.v3_increment_acceptance).toBe('blocked_pending_independent_empirical_validation');
  });

  test('bench/research/out/mast-mapping-evidence.json exists and records honest adjudication', () => {
    expect(fs.existsSync(OUT_PATH)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    expect(saved.schema_version).toBe(1);
    expect(saved.evidence_type).toBe('in_repo_coherence_fixture');
    expect(saved.independence_evidence).toBe(false);
    expect(saved.adjudication.v3_increment_acceptance).toBe('blocked_pending_independent_empirical_validation');
  });
});
