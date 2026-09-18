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
    // ADR-0051/0052/0053 document round adds defer-0025 (host-native directory sync).
    // ADR-0057 document round adds defer-0026 (independent CI test job + always() summary).
    // ADR-0059 doc round extends the seed inventory to 25 entries: defer-0028
    // (ADR-0016 D4 sub-item (i) verifiable-log wheels, pending-evaluation / yearly).
    // ADR-0060 extends the seed inventory to 28 entries: defer-0032 (corpus
    // ADR-0062 (T-2 round) extends the seed inventory to 31 entries (defer-0037);
    // ADR-0063 (T-3 round) extends the seed inventory to 32 entries (defer-0038). ADR-0061 extended it to 30 entries: defer-0035 (model identity re-verification), defer-0036 (zero-movement N definition).
    // ADR-0064 doc round extends the seed inventory to 33 entries: defer-0039 (governance trend-anchor first evaluation).
    // ADR-0064 T-1 implementation round extends the seed inventory to 34 entries: defer-0040 (zero-product-diff doc-round event, forced disposition).
    // ADR-0067 (grill-t7 unblind execution round) extends the seed inventory to 40 entries: defer-0045 (net-addition tally, D-006(a)(i)), defer-0046 (terminal event INDETERMINATE, D-006(a)(ii)).
    // ADR-0068 (grill-t7 v2 doc round) extends the seed inventory to 41 entries: defer-0047 (net-addition tally, D-006(a)(i)).
    // ADR-0068 (grill-t7 v2 closure round) extends the seed inventory to 42 entries: defer-0048 (terminal event FAILED, D-006(a)(ii)).
    // ADR-0070 (grill-t10 doc round) extends the seed inventory to 44 entries: defer-0050 (net-addition tally, D-006(a)(i)).
    // ADR-0071 (grill-t10 impl round) extends the seed inventory to 45 entries: defer-0051 (cap trend-anchor review slot, ADR-0071 D-E).
    // ADR-0073 (grill-t12 doc round) extends the seed inventory to 50 entries: defer-0053 (collection-side provenance field), defer-0054 (pre-commit scanner, gitleaks class), defer-0055 (organic routing-rate watch), defer-0056 (net-addition tally, D-006(a)(i)).
    // ADR-0074 (grill-t13 doc round) extends the seed inventory to 51 entries: defer-0057 (net-addition tally, D-006(a)(i)).
    // R2 (grill-t13 action round): +1 = defer-0058 (standing net-increment review); defer-0050/0051/0052/0056 closed; defer-0054 actioned.
    // ADR-0075 (grill-t14 doc round) extends the seed inventory to 53 entries: defer-0059 (net-addition tally, D-006(a)(i)).
    // ADR-0076 (grill-t15 doc round) extends the seed inventory to 55 entries: defer-0060 (CI 403 carrier, external-event), defer-0061 (net-addition tally, D-006(a)(i)). grill-t15 R1: defer-0026 actioned (+limitation); R2: defer-0061 closed via same-commit ledger note.
    // ADR-0077 (grill-t16 doc round) extends the seed inventory to 56 entries: defer-0062 (net-addition tally, D-006(a)(i)); closed via same-commit ledger note (defer-0059/0061 precedent).
    // grill-t17 fix round extends the seed inventory to 57 entries: defer-0063 (build-round-facts guard/exit-style, missing-convention deferral carrying the anti-rot smell-ticket quota).
    // expansion to n>=100), defer-0033 (judge-quality CAPA), defer-0034
    // (prompt-exercising eval surface).
    expect(registry.entries.map(e => e.id)).toEqual(['defer-0001', 'defer-0002', 'defer-0003', 'defer-0004', 'defer-0005', 'defer-0006', 'defer-0007', 'defer-0008', 'defer-0009', 'defer-0010', 'defer-0011', 'defer-0012', 'defer-0013', 'defer-0015', 'defer-0018', 'defer-0019', 'defer-0023', 'defer-0024', 'defer-0025', 'defer-0026', 'defer-0027', 'defer-0028', 'defer-0029', 'defer-0030', 'defer-0031', 'defer-0032', 'defer-0033', 'defer-0034', 'defer-0035', 'defer-0036', 'defer-0037', 'defer-0038', 'defer-0039', 'defer-0040', 'defer-0041', 'defer-0042', 'defer-0043', 'defer-0044', 'defer-0045', 'defer-0046', 'defer-0047', 'defer-0048', 'defer-0049', 'defer-0050', 'defer-0051', 'defer-0052', 'defer-0053', 'defer-0054', 'defer-0055', 'defer-0056', 'defer-0057', 'defer-0058', 'defer-0059', 'defer-0060', 'defer-0061', 'defer-0062', 'defer-0063']);
    // ADR-0035 D6: no verified_by -> pending-evaluation; only defer-0004 (real assertion) stays deferred
    expect(registry.entries.map(e => e.status)).toEqual(['pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'deferred', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'actioned', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'pending-evaluation', 'closed', 'closed', 'closed', 'pending-evaluation', 'actioned', 'pending-evaluation', 'closed', 'pending-evaluation', 'pending-evaluation', 'closed', 'pending-evaluation', 'closed', 'closed', 'pending-evaluation']);// T-3 fix: defer-0051 reopened (F-4 - own unfreeze condition unmet); defer-0050/0052/0056 closed; defer-0054 actioned; grill-t14 R2: defer-0051 closed discharged-by-trigger, defer-0059 closed via same-commit ledger note; grill-t15 R1/R2: defer-0026 actioned+limitation, defer-0060 pending-evaluation, defer-0061 closed; grill-t16 R1: defer-0062 closed
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
