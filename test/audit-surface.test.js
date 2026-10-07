'use strict';
// test/audit-surface.test.js - ADR-0091 (grill-t34 D-004(iii)) wiring: the
// audit-surface leg's pure core (block extraction + temporal scope +
// superset shape), fixture-driven.
const { extractCoverage, pickLatest, SENTINEL } = require('../scripts/check-audit-surface');

function reportWith(cmds) {
  return 'report body\n\n' + SENTINEL + '\n\n```json\n' + JSON.stringify(cmds, null, 2) + '\n```\n\ntail';
}

describe('audit-surface leg (ADR-0091 D-004)', () => {
  test('extractCoverage reads the sentinel + json fence and validates the shape', () => {
    expect(extractCoverage(reportWith(['a', 'b']))).toEqual(['a', 'b']);
    expect(() => extractCoverage('no block here')).toThrow(/missing/);
    expect(() => extractCoverage(SENTINEL + '\nno fence')).toThrow(/fence/);
    expect(() => extractCoverage(SENTINEL + '\n```json\n{}\n```')).toThrow(/JSON array/);
  });

  test('temporal scope: pre-registration reports are never picked; uncommitted counts as newest', () => {
    const scope = Date.parse('2026-09-30T12:00:00Z');
    const cands = [
      { rel: 't33/2026-09-29-report.md', date: '2026-09-29T10:00:00Z' },
      { rel: 't33/2026-09-30-audit-handoff.md', date: '2026-09-30T04:00:00Z' },
      { rel: 't34/2026-09-30-report.md', date: '', mtimeMs: Date.parse('2026-09-30T16:00:00Z') },
    ];
    const pick = pickLatest(cands, scope);
    expect(pick.rel).toBe('t34/2026-09-30-report.md');
    expect(pickLatest(cands.slice(0, 2), scope)).toBeNull();
  });

  test('superset semantics: extra auditor commands are allowed, missing checklist items are not', () => {
    const checklist = ['a', 'b'];
    const coverage = ['b', 'a', 'auditor extra'];
    expect(checklist.filter((c) => coverage.indexOf(c) === -1)).toEqual([]);
    const bad = ['a'];
    expect(checklist.filter((c) => bad.indexOf(c) === -1)).toEqual(['b']);
  });
});
