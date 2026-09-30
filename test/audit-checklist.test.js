'use strict';
// test/audit-checklist.test.js - ADR-0091 (grill-t34 D-004(i)) wiring: the
// derived CI checklist generator. Fixture-driven (opts.ymlText), no ambient
// writes; the repo-level freshness assertion is the registered leg
// (build-audit-checklist.js --check, gates order 228).
const { buildChecklist, stableCopy, firstDiffPath } = require('../scripts/build-audit-checklist');

const FIXTURE = [
  'name: ci',
  'jobs:',
  '  gate-all:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: gate layer',
  '        run: npm run gate:all',
  '      # a comment line is inert',
  '      - run: |',
  '          echo inside-block',
  '          node scripts/check-a.js',
  '  test:',
  '    steps:',
  '      - run: node scripts/run-test-gate.js',
].join('\n');

describe('audit-checklist generator (ADR-0091 D-004)', () => {
  test('extracts every job and its ordered run lines into the flat command surface', () => {
    const c = buildChecklist({ ymlText: FIXTURE, now: new Date('2026-09-30T00:00:00Z') });
    expect(c.jobs.map((j) => j.job)).toEqual(['gate-all', 'test']);
    expect(c.jobs[0].run_lines).toEqual(['npm run gate:all', 'echo inside-block', 'node scripts/check-a.js']);
    expect(c.jobs[1].run_lines).toEqual(['node scripts/run-test-gate.js']);
    expect(c.commands).toEqual(['npm run gate:all', 'echo inside-block', 'node scripts/check-a.js', 'node scripts/run-test-gate.js']);
    expect(c.generated_at).toBe('2026-09-30T00:00:00.000Z');
  });

  test('equality domain (D-008): generated_at excluded; real drift detected', () => {
    const a = buildChecklist({ ymlText: FIXTURE, now: new Date('2026-09-30T00:00:00Z') });
    const b = buildChecklist({ ymlText: FIXTURE, now: new Date('2027-01-01T00:00:00Z') });
    expect(firstDiffPath(stableCopy(a), stableCopy(b))).toBeNull();
    const c = buildChecklist({ ymlText: FIXTURE + '\n      - run: node scripts/check-new.js', now: new Date('2027-01-01T00:00:00Z') });
    expect(firstDiffPath(stableCopy(a), stableCopy(c))).not.toBeNull();
  });

  test('emit shape: the checklist commands are a JSON array of command strings', () => {
    const c = buildChecklist({ ymlText: FIXTURE, now: new Date() });
    const parsed = JSON.parse(JSON.stringify(c.commands));
    expect(Array.isArray(parsed)).toBe(true);
    for (const s of parsed) expect(typeof s).toBe('string');
  });
});
