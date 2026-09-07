// ADR-0033 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Covers D2 (entry schema), D3 (pending-evaluation discipline), D4 (STALE
// fail-closed, existence anchors, threshold link).
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checkDeferred = require('../scripts/check-deferred');

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
const thresholds = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'), 'utf8'));

const sources = checkDeferred.loadSources();
const today = new Date().toISOString().slice(0, 10);

function clone(o) { return JSON.parse(JSON.stringify(o)); }

describe('ADR-0033 D2 entry schema', () => {
  test('real registry passes shape + entries', () => {
    expect(checkDeferred.validateShape(registry)).toEqual([]);
    expect(checkDeferred.validateEntries(registry, sources, thresholds, today)).toEqual([]);
  });

  test('seed inventory matches ADR-0033 D5 + ADR-0035 D4/D6 corrections', () => {
    // ADR-0040 grill round added defer-0008 (local-file escape); extend the seed inventory.
    // ADR-0046 implementation round activates and removes defer-0014;
    // defer-0015 remains the human-labeled anchor corpus prerequisite.
    // ADR-0047 implementation round activates and removes defer-0016/0017;
    // defer-0018/0019 remain pending-evaluation.
    // ADR-0048 implementation round activates and removes defer-0020/0021/0022.
    // ADR-0049 document round adds defer-0023 (criteria-change pointwise replay).
    // ADR-0050 document round adds defer-0024 (external witness / second-copy anchor).
    expect(registry.entries.map(e => e.id)).toEqual(['defer-0001', 'defer-0002', 'defer-0003', 'defer-0004', 'defer-0005', 'defer-0006', 'defer-0007', 'defer-0008', 'defer-0009', 'defer-0010', 'defer-0011', 'defer-0012', 'defer-0013', 'defer-0015', 'defer-0018', 'defer-0019', 'defer-0023', 'defer-0024']);
    // ADR-0035 D6: no verified_by -> pending-evaluation; only defer-0004 (real assertion) stays deferred
    expect(registry.entries.map(e => e.status)).toEqual(['pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'deferred', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation']);
    for (const e of registry.entries) expect(e.review_at >= today).toBe(true);
  });

  test('negative: review_at with impossible calendar date is rejected (audit 2026-08-30)', () => {
    const bad = clone(registry);
    bad.entries[0].review_at = '2027-13-99';
    expect(checkDeferred.validateShape(bad).some(m => m.indexOf('calendar') !== -1)).toBe(true);
    bad.entries[0].review_at = '2027-02-30';
    expect(checkDeferred.validateShape(bad).some(m => m.indexOf('calendar') !== -1)).toBe(true);
  });

  test('negative: missing mandatory field and bad id are caught', () => {
    const bad = clone(registry);
    delete bad.entries[0].rationale;
    expect(checkDeferred.validateShape(bad).some(m => m.indexOf('rationale') !== -1)).toBe(true);
    const bad2 = clone(registry);
    bad2.entries[0].id = 'deferred-1';
    expect(checkDeferred.validateShape(bad2).some(m => m.indexOf('defer-NNNN') !== -1)).toBe(true);
  });

  test('negative: duplicate ids are caught', () => {
    const bad = clone(registry);
    bad.entries.push(clone(bad.entries[0]));
    expect(checkDeferred.validateShape(bad).some(m => m.indexOf('duplicate') !== -1)).toBe(true);
  });
});

describe('ADR-0033 D3 pending-evaluation discipline', () => {
  test('negative: external-event with status deferred is rejected', () => {
    const bad = clone(registry);
    bad.entries[1].status = 'deferred';
    const errs = checkDeferred.validateEntries(bad, sources, thresholds, today);
    expect(errs.some(m => m.indexOf('pending-evaluation') !== -1)).toBe(true);
  });

  test('negative: presence-condition with verified_by but pending-evaluation status is rejected (ADR-0035 D6)', () => {
    const bad = clone(registry);
    bad.entries.find(e => e.id === 'defer-0004').status = 'pending-evaluation';
    const errs = checkDeferred.validateEntries(bad, sources, thresholds, today);
    expect(errs.some(m => m.indexOf('evaluable') !== -1 && m.indexOf('defer-0004') !== -1)).toBe(true);
  });
});

describe('ADR-0033 D4 expiry forces action + anchors', () => {
  test('negative: stale review_at fails closed', () => {
    const bad = clone(registry);
    bad.entries[0].review_at = '2025-01-01';
    const errs = checkDeferred.validateEntries(bad, sources, thresholds, today);
    expect(errs.some(m => m.indexOf('STALE') !== -1)).toBe(true);
  });

  test('negative: dangling source_adr file is caught', () => {
    const bad = clone(registry);
    bad.entries[0].source_adr = 'docs/adr/9999-no-such-adr.md';
    const errs = checkDeferred.validateEntries(bad, sources, {}, today);
    expect(errs.some(m => m.indexOf('source_adr file missing') !== -1)).toBe(true);
  });

  test('negative: entry id unreferenced anywhere is caught', () => {
    const bad = clone(registry);
    bad.entries[0].id = 'defer-9999';
    const scrubbed = {};
    for (const k of Object.keys(sources)) scrubbed[k] = sources[k].split('defer-9999').join('');
    const errs = checkDeferred.validateEntries(bad, scrubbed, thresholds, today);
    expect(errs.some(m => m.indexOf('dangling') !== -1)).toBe(true);
  });

  test('threshold deferred-with-unfreeze link: empty tier set passes; unlinked gate fails', () => {
    expect(thresholds.gates.some(g => g.tier === 'deferred-with-unfreeze')).toBe(false);
    const fakeT = { gates: [{ id: 'g-x', tier: 'deferred-with-unfreeze' }] };
    const errs = checkDeferred.validateEntries(registry, sources, fakeT, today);
    expect(errs.some(m => m.indexOf('g-x') !== -1)).toBe(true);
    const linked = clone(registry);
    linked.entries[0].thresholds_gate = 'g-x';
    expect(checkDeferred.validateEntries(linked, sources, fakeT, today)).toEqual([]);
  });
});
