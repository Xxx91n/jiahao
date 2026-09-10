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

// ---- implementation-round wiring (ADR-0056 D-A/D-B landed) ----

test('corpus-gate helper exports the tier resolver (D-A)', () => {
  const { resolveCorpus, TIERS } = require('./helpers/corpus-gate');
  const r = resolveCorpus();
  expect(TIERS).toContain(r.tier);
});

test('public fixture corpus exists with fingerprints (D-B/D9)', () => {
  const dir = path.join(__dirname, 'fixtures', 'corpus');
  const fp = JSON.parse(read(path.join(dir, 'fingerprints.json')));
  for (const rel of Object.keys(fp.files || {})) {
    expect(fs.existsSync(path.join(dir, rel))).toBe(true);
  }
});

test('skip helper receives a reason from tier-none paths (ADR-0057 D-B contract)', () => {
  const { skipTest } = require('./helpers/skip');
  expect(typeof skipTest).toBe('function');
});

test('corpus:drift npm alias exists (D-D recurrence)', () => {
  const pkg = JSON.parse(read(path.join(__dirname, '..', 'package.json')));
  expect(pkg.scripts['corpus:drift']).toBe('node scripts/corpus-tier-drift.js');
});
