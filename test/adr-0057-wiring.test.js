'use strict';

// test/adr-0057-wiring.test.js -- ADR-0057 document-round wiring seed.
// Locks the content anchors the implementation round must honor, including
// the registered defer-0026 entry for the independent test job.

const fs = require('fs');
const path = require('path');

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
