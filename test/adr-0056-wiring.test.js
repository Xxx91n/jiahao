'use strict';

// test/adr-0056-wiring.test.js -- ADR-0056 document-round wiring seed.
// Locks the content anchors that the implementation round must honor:
// the ADR exists, its D-clauses are present, and the corpus-tier vocabulary
// landed in CONTEXT.md. Implementation wiring locks land in the impl round.

const fs = require('fs');
const path = require('path');

const ADR = path.join(__dirname, '..', 'docs', 'adr', '0056-test-corpus-tiering-and-clean-clone-integrity.md');

function read(p) { return fs.readFileSync(p, 'utf8'); }

test('ADR-0056 file exists with accepted status', () => {
  const text = read(ADR);
  expect(text).toContain('# ADR-0056: Test Corpus Tiering and Clean-Clone Integrity');
  expect(text).toContain('Status: Accepted');
});

test('all four decision clauses are recorded', () => {
  const text = read(ADR);
  for (const anchor of [
    'D-A - Test-capability probe',
    'D-B - Public fixture corpus',
    'D-C - Tiered execution of the eight suites',
    'D-D - Maintainer-side full-tier recurrence',
  ]) expect(text).toContain(anchor);
});

test('glossary terms landed in CONTEXT.md', () => {
  const c = read(path.join(__dirname, '..', 'CONTEXT.md'));
  expect(c).toContain('**Corpus Tier**');
  expect(c).toContain('**Public Fixture Corpus**');
});
