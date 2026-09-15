'use strict';

// test/adr-0057-wiring.test.js -- ADR-0057 document-round wiring seed.
// Locks the content anchors the implementation round must honor, including
// the registered defer-0026 entry for the independent test job.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ADR = path.join(__dirname, '..', 'docs', 'adr', '0057-test-skip-honesty-and-suite-count-assertion.md');

function read(p) { return fs.readFileSync(p, 'utf8'); }

test('ADR-0057 file exists with accepted status', () => {
  const text = read(ADR);
  expect(text).toContain('# ADR-0057: Test-Layer Skip Honesty and Suite-Count Assertion');
  expect(text).toContain('Status: Accepted');
});

test('all four decision clauses are recorded', () => {
  const text = read(ADR);
  for (const anchor of [
    'D-A - Skip carries a verdict and a reason',
    'D-B - Degradation must never fake green',
    'D-C - The test gate asserts the suite count',
    'D-D - Independent test job deferred (defer-0026)',
  ]) expect(text).toContain(anchor);
});

test('defer-0026 is registered and anchored to this ADR', () => {
  const registry = JSON.parse(read(path.join(__dirname, '..', 'docs', 'deferred-registry.json')));
  const e = registry.entries.find((x) => x.id === 'defer-0026');
  expect(e).toBeTruthy();
  expect(e.source_adr).toContain('0057-test-skip-honesty');
  expect(e.unfreeze_if.verified_by).toBe('scripts/check-ci-jobs.js');
});

test('glossary terms landed in CONTEXT.md', () => {
  const c = read(path.join(__dirname, '..', 'CONTEXT.md'));
  expect(c).toContain('**Skipped-Is-A-Verdict**');
  expect(c).toContain('**Unskippable Summary**');
  expect(c).toContain('**Suite-Count Assertion**');
});

// ---- implementation-round wiring (ADR-0057 D-A/D-C landed) ----

const gates = JSON.parse(read(path.join(__dirname, '..', 'docs', 'gates.json')));

test('skip-reasons gate is registered in gates.json', () => {
  const e = gates.entries.find((x) => x.name === 'skip-reasons');
  expect(e).toBeTruthy();
  expect(e.command).toBe('node scripts/check-skip-reasons.js');
  expect(e.tier).toBe('confirmatory');
  expect(e.source_adr).toContain('0057-test-skip-honesty');
});

// ADR-0058 D-F: the test gate (order 100) left gates.json; the suite-count
// wrapper migrated into the independent CI-layer test job. The D-C anchor is
// therefore NAME-based now (the ci.yml test job), not order-based.
test('test gate runs through the suite-count wrapper (D-C)', () => {
  const ci = read(path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'));
  const { parseJobs } = require('../scripts/check-ci-jobs');
  const testJob = (parseJobs(ci)['test'] || []).join('\n');
  expect(testJob).toContain('scripts/run-test-gate.js');
  expect(testJob).toMatch(/--expected-suites\s+\d+/);
});

test('static skip scan ships and passes on the current tree (D-A)', () => {
  const scan = require('../scripts/check-skip-reasons').scan;
  expect(scan()).toEqual([]);
});

test('skip helper throws on an empty reason (D-A)', () => {
  const { skipTest } = require('./helpers/skip');
  expect(() => skipTest('', 'x', () => {})).toThrow(/reason/);
});

test('test-artifacts is gitignored and junit reporter exists (D-C)', () => {
  expect(fs.existsSync(path.join(__dirname, '..', 'scripts', 'jest-junit-lite.js'))).toBe(true);
  expect(read(path.join(__dirname, '..', '.gitignore'))).toContain('test-artifacts/');
});

test('tier none yields at least one skipped test in a corpus suite (D-B, live)', () => {
  const jestBin = require.resolve('jest-cli/bin/jest');
  const r = spawnSync(process.execPath, [jestBin, 'test/adr-0030.test.js', '--json'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    env: Object.assign({}, process.env, { JIAHAO_TEST_TIER: 'none' }),
  });
  expect(r.status).toBe(0);
  const out = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
  expect(out.numPendingTests).toBeGreaterThan(0);
  expect(out.numFailedTests).toBe(0);
}, 120000);
