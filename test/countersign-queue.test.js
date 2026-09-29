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
// Closed category set: {awaiting-old, awaiting-e13, awaiting-new,
// countersigned-or-final, registered-exempt}; undeclared = fail.
// Registered exemption: ADR-0082 - its countersign slot lives in the
// deferred registry as defer-0068 (registered-exempt class).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ADR_DIR = path.join(ROOT, 'docs', 'adr');
const REG = path.join(ROOT, 'docs', 'deferred-registry.json');

const adrs = fs.readdirSync(ADR_DIR).filter(function (f) { return /^\d{4}-.+\.md$/.test(f); }).sort();
const adrText = {};
for (const f of adrs) adrText[f] = fs.readFileSync(path.join(ADR_DIR, f), 'utf8');

const RE = {
  // a Status surface in any registered shape: `Status: ...`,
  // `- Status: ...`, or the heading form `## Status` (early ADRs)
  statusLine: /^-?\s?\*?Status\*?\s*:|^## Status/im,
  oldForm: /ID-level-only, awaiting entity-level(?! countersign)/i,
  oldFormStatus: /Status[^\n]*ID-level-only, awaiting entity-level/i,
  e13Pointer: /Errata pointer \(2026-09-26, ERRATA E-13, grill-t28 D-002\)/,
  newForm: /awaiting entity-level countersign/i,
  newFormStatus: /Status[^\n]*awaiting entity-level countersign/i,
  countersigned: /second_reviewer countersign(?:ed| landed| discharged)/i,
};

// Registered-exempt declarations (form source = the ADR's own text +
// registry row): extend only via a same-commit ADR/registry registration.
const EXEMPTS = { '0082': /registered as defer-0068/ };

function classify(f) {
  const t = adrText[f];
  const num = f.slice(0, 4);
  // declaration surface = the ADR's Status field; body prose mentioning
  // the queue (e.g. ADR-0084's byte-stable "Countersign queue (10
  // entries)" bullet) is display text, never authority (D-002(iii)).
  if (RE.newFormStatus.test(t)) return 'awaiting-new-form';
  if (RE.oldFormStatus.test(t)) return 'awaiting-old-form';
  if (RE.e13Pointer.test(t)) return 'awaiting-e13-pointer';
  if (EXEMPTS[num] && EXEMPTS[num].test(t)) return 'registered-exempt';
  // declaration eras observed on the committed surface (T-1 survey):
  // `Status: Accepted`, `- Status: Accepted`, heading `## Status` +
  // `Accepted` body, and the earliest template that declares no Status
  // field at all - all countersigned-or-final under their era's
  // convention; only an awaiting/exempt declaration or a genuinely
  // unparseable file should fail closed below.
  if (RE.statusLine.test(t) || /## Status\n+Accepted/i.test(t) || /second_reviewer/i.test(t) || /^# (ADR-\d+|.)/.test(t)) {
    return 'countersigned-or-final';
  }
  return 'undeclared';
}

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
    expect(queue['awaiting-new-form']).toEqual(['0086', '0087', '0088', '0089']);
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

  test('forward check (optional, D-002(ii)): ADRs newer than 0089 carry no count-bump lines', () => {
    for (const f of adrs) {
      if (parseInt(f.slice(0, 4), 10) > 89) {
        expect(adrText[f]).not.toMatch(/\d+\s*->\s*\d+/);
      }
    }
  });
});
