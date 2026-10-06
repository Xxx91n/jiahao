'use strict';
// test/audit-checklist.test.js - ADR-0091 (grill-t34 D-004(i)) wiring: the
// derived CI checklist generator. Fixture-driven (opts.ymlText), no ambient
// writes; the repo-level freshness assertion is the registered leg
// (build-audit-checklist.js --check, gates order 228).
//
// ADR-0096 N-3 (grill-t38 D-005.4): the emit loop-back pin. The emit channel
// prints the full pasteable block; feeding its real stdout through the
// consumer's extractCoverage is the pin that the emit form and the parse form
// cannot drift apart without failing red. (No new adr-0091-wiring.test.js:
// this wiring family lives here.)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { buildChecklist, stableCopy, firstDiffPath } = require('../scripts/build-audit-checklist');
const { extractCoverage } = require('../scripts/check-audit-surface');

const ROOT = path.join(__dirname, '..');
const OUT_REL = path.join('docs', 'governance', 'audit-checklist.json');

function emitStdout() {
  return execFileSync('node', [path.join(ROOT, 'scripts', 'build-audit-checklist.js'), 'emit'], { cwd: ROOT, encoding: 'utf8' });
}

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

describe('audit-coverage emit loop-back pin (ADR-0096 N-3 / grill-t38 D-005)', () => {
  test('emit stdout is the pasteable block: extractCoverage reads it green, aligned with checklist.commands', () => {
    const stdout = emitStdout();
    // throws if the sentinel/fence shape drifts out of the consumer's contract
    const coverage = extractCoverage(stdout);
    expect(Array.isArray(coverage)).toBe(true);
    expect(coverage.length).toBeGreaterThan(0);
    for (const s of coverage) expect(typeof s).toBe('string');
    const committed = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_REL), 'utf8'));
    expect(coverage).toEqual(committed.commands);
  });

  test('advisories ride a separate channel and never leak into emit', () => {
    const stdout = emitStdout();
    const committed = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_REL), 'utf8'));
    expect(stdout).not.toContain('advisories');
    for (const a of committed.advisories || []) expect(stdout).not.toContain(a.command);
    const text = execFileSync('node', [path.join(ROOT, 'scripts', 'build-audit-checklist.js'), '--advisories'], { cwd: ROOT, encoding: 'utf8' });
    for (const a of committed.advisories || []) expect(text).toContain(a.command);
  });
});
