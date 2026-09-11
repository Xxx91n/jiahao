#!/usr/bin/env node
// scripts/run-test-gate.js - ADR-0057 D-C: the test gate as a suite-count-
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
requireCapabilities('test'); // ADR-0040 D1: capability declaration before any work

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
console.log('[test] OK: ' + suites + ' suites, ' + (head ? head[1] + ' tests' : 'n/a tests') + (head ? ', ' + head[2] + ' skipped' : '') + ' (ADR-0057 D-C)');
process.exit(0);
