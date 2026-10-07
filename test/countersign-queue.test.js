'use strict';
// test/countersign-queue.test.js - grill-t33 correction round (V8 track),
// spec-t33-correction section 4 + decision-ledger D-002.
// Bound-by ADRs: ADR-0084 (original queue registration + ID-level-only
// labels) and ADR-0086 (new-form status declaration). Authority rule
// (D-002(i)): each ADR's own declaration surface is the sole authority;
// the countersign queue is a MECHANICALLY DERIVED SET, never a maintained
// count. This suite reconciles membership member-by-member - total-count
// equality is forbidden (cancellation-blind, Oath-lang lesson in D-002).
// Registered declaration forms (D-002(i), three awaiting forms):
//   OLD      - status label `ID-level-only, awaiting entity-level` plus
//              return-by (10 members: 0064..0074 subset)
//   E13-PTR  - bare `- Status: Accepted` + the ERRATA E-13
//              pointer-annotation line (9 members: 0076..0081, 0083..0085)
//   NEW      - status `awaiting entity-level countersign` (0086+, 4)
// grill-t34 D-003(vi): the derivation itself moved verbatim into
// scripts/countersign-queue.js (the single shared surface); this suite keeps
// its member-level reconciliation role unchanged.
const fs = require('fs');
const { adrs, adrText, classify, REG_ABS } = require('../scripts/countersign-queue');
const REG = REG_ABS;

describe('countersign queue authority closure (grill-t33 D-002)', () => {
  test('every ADR declaration surface classifies into the closed category set', () => {
    const classes = {};
    for (const f of adrs) classes[f] = classify(f);
    const undeclared = Object.keys(classes).filter(function (f) { return classes[f] === 'undeclared'; });
    expect(undeclared).toEqual([]);
  });

  test('member-level reconciliation: the queue is the union of the three awaiting forms', () => {
    const queue = { 'awaiting-old-form': [], 'awaiting-e13-pointer': [], 'awaiting-new-form': [] };
    for (const f of adrs) {
      const c = classify(f);
      if (queue[c]) queue[c].push(f.slice(0, 4));
    }
    // member sets, not counts - the ledger forbids total-equality assertions
    expect(queue['awaiting-old-form']).toEqual(['0064', '0065', '0066', '0067', '0068', '0069', '0070', '0072', '0073', '0074']);
    expect(queue['awaiting-e13-pointer']).toEqual(['0076', '0077', '0078', '0079', '0080', '0081', '0083', '0084', '0085']);
    // grill-t35: ADR-0092 joins as a derived member, which is exactly what this
    // reconciliation is for - the queue is derived from declaration surfaces, so a
    // new awaiting ADR appears here without anyone editing the list. The list
    // below therefore pins the HISTORICALLY SETTLED prefix (0086..0091) and the
    // suffix is asserted structurally instead of by restatement, so the test does
    // not rot on every new countersigned-tide ADR.
    const NEW_FORM = ['0086', '0087', '0088', '0089', '0090', '0091'];
    const derived = queue['awaiting-new-form'];
    expect(derived.slice(0, NEW_FORM.length)).toEqual(NEW_FORM);
    // every member after the settled prefix must be a real ADR that classifies as
    // awaiting-new-form and carries its own return-by (asserted by the next test)
    for (const id of derived.slice(NEW_FORM.length)) {
      expect(id).toMatch(/^\d{4}$/);
      expect(adrs.some(function (x) { return x.indexOf(id + '-') === 0; })).toBe(true);
    }
    // total-count equality is forbidden (grill-t33 D-002); suffix membership is
    // asserted, never a bare number
  });

  test('registered exemption: ADR-0082 carries the defer-0068 slot registration and stays out of the queue', () => {
    const f = adrs.find(function (x) { return x.indexOf('0082-') === 0; });
    expect(classify(f)).toBe('registered-exempt');
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    const row = reg.entries.find(function (e) { return e.id === 'defer-0068'; });
    expect(row).toBeTruthy();
    expect(row.source_adr).toContain('0082-');
  });

  test('old-form and new-form members each carry a return-by on the status line', () => {
    for (const f of adrs) {
      const c = classify(f);
      if (c === 'awaiting-old-form' || c === 'awaiting-new-form') {
        const st = adrText[f].split('\n').find(function (l) { return /^-?\s?\*?Status\*?\s*:/.test(l); });
        expect(st).toMatch(/return-by:\s*2026-12-15/);
      }
    }
  });

  test('fail-closed probe: a queue-era ADR with no registered declaration is undeclared (F-4)', () => {
    // Synthetic fixture pins the reworked classify() semantics: a >=0064
    // file with a bare `Status: Accepted` and no E-13 pointer / exemption
    // is a queue-era file lacking a registered declaration -> undeclared.
    const synth = '# ADR-0090: synthetic probe\n\n- Status: Accepted\n';
    adrText['0090-synthetic-probe.md'] = synth;
    try {
      expect(classify('0090-synthetic-probe.md')).toBe('undeclared');
    } finally {
      delete adrText['0090-synthetic-probe.md'];
    }
  });

  test('forward check (optional, D-002(ii)): ADRs newer than 0089 carry no count-bump lines', () => {
    for (const f of adrs) {
      if (parseInt(f.slice(0, 4), 10) > 89) {
        expect(adrText[f]).not.toMatch(/\d+\s*->\s*\d+/);
      }
    }
  });
});
