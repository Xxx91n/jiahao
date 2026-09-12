#!/usr/bin/env node
// scripts/run-test-gate.js - ADR-0057 D-C: the CI test job as a suite-count-
// asserting wrapper over jest. Registered expectation lives on the ci.yml
// test-job call line (--expected-suites, ADR-0036 D4 declaration parity).
//
// Fail-closed on every silent-green channel: jest exits non-zero on failure
// AND on zero collected tests (no --passWithNoTests anywhere), the JUnit
// artifact must exist after a green run (collection reporting intact), and
// the collected suite count must equal the registered expectation - a silent
// collection failure (.only residue, async-define swallowing, bad config)
// cannot read green (johal.in postmortem pattern).

'use strict';

const { requireCapabilities } = require('../src/shared/capability');
// ADR-0058 R8: no gates.json entry, so the test job declares inline; public tier (D-H) -> no bench-corpus.
requireCapabilities(['repo-tree']);

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-artifacts', 'junit.xml');

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const expected = parseInt(arg('expected-suites'), 10);
if (!Number.isInteger(expected) || expected <= 0) {
  console.error('run-test-gate: --expected-suites <n> missing or invalid (registered on the ci.yml test-job call line, ADR-0057 D-C)');
  process.exit(64);
}

try { fs.unlinkSync(OUT); } catch (e) { /* first run: nothing to clear */ }

const jestBin = require.resolve('jest-cli/bin/jest');
const r = spawnSync(
  process.execPath,
  [jestBin, '--verbose', '--reporters=default', '--reporters=' + path.join(ROOT, 'scripts', 'jest-junit-lite.js')],
  { cwd: ROOT, stdio: 'inherit', env: process.env }
);
if (r.error) {
  console.error('run-test-gate: jest spawn failed: ' + r.error.message);
  process.exit(1);
}
if (r.status !== 0) process.exit(r.status);

if (!fs.existsSync(OUT)) {
  console.error('FAIL: jest exited green but the JUnit artifact is missing - collection reporting broken (ADR-0057 D-C)');
  process.exit(1);
}

const xml = fs.readFileSync(OUT, 'utf8');
const suites = (xml.match(/<testsuite /g) || []).length;
const head = xml.match(/<testsuites tests="(\d+)" failures="\d+" skipped="(\d+)"/);
if (suites !== expected) {
  console.error('FAIL: suite-count drift - collected ' + suites + ' suites, registered expectation ' + expected
    + ' (ADR-0057 D-C). A silent collection failure or an intentional suite add/remove must update the ci.yml test-job call line in the same change.');
  process.exit(1);
}
// ADR-0056/0057: the README's declared counts must match what actually ran.
// Both declarations are checked: "N tests across M suites" (Develop) and
// "M test suites, N tests" (Architecture). A drift fails the test job here,
// in the same change that introduced it.
const tests = head ? Number(head[1]) : null;
if (tests === null) {
  console.error('FAIL: JUnit header is missing the tests attribute - cannot check the README counts (ADR-0056/0057)');
  process.exit(1);
}
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const declared = [
  { what: 'Develop', re: /(\d+) tests across (\d+) suites/, testsIdx: 1, suitesIdx: 2 },
  { what: 'Architecture', re: /(\d+) test suites, (\d+) tests/, testsIdx: 2, suitesIdx: 1 },
];
for (const d of declared) {
  const m = readme.match(d.re);
  if (!m) {
    console.error('FAIL: README (' + d.what + ') is missing its declared count line (ADR-0056/0057)');
    process.exit(1);
  }
  const got = { tests: Number(m[d.testsIdx]), suites: Number(m[d.suitesIdx]) };
  if (got.tests !== tests || got.suites !== suites) {
    console.error('FAIL: README (' + d.what + ') declares ' + got.tests + ' tests / ' + got.suites + ' suites, actual ' + tests + ' tests / ' + suites + ' suites (ADR-0056/0057: update the README in the same change)');
    process.exit(1);
  }
}

console.log('[test] OK: ' + suites + ' suites, ' + (head ? head[1] + ' tests' : 'n/a tests') + (head ? ', ' + head[2] + ' skipped' : '') + ' (ADR-0057 D-C)');
process.exit(0);
