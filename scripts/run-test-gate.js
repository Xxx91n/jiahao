#!/usr/bin/env node
'use strict';
// scripts/run-test-gate.js - ADR-0057 D-C as carried forward by ADR-0091
// (grill-t34 D-002(iii)(v)): the CI test job as a manifest-asserting wrapper
// over jest. The --expected-suites argv is RETIRED - the registered
// expectation now lives in the committed derived manifest
// (docs/test-manifest.json, lockfile pattern), and the README declaration
// check has moved to the static check-test-manifest leg: this gate no longer
// reads README. Fail-closed on every silent-green channel: jest exits
// non-zero on failure AND on zero collected tests (no --passWithNoTests
// anywhere), the JUnit artifact must exist after a green run (collection
// reporting intact), and post-jest the collected counts must equal the
// manifest on BOTH channels - suites against the enumeration channel
// (--listTests), tests against the blessed junit channel. A battery that
// grew without a manifest regen, or a silent collection failure (.only
// residue, async-define swallowing, bad config), cannot read green
// (johal.in postmortem pattern).

const { requireCapabilities } = require('../src/shared/capability');
// ADR-0058 R8: no gates.json entry, so the test job declares inline; public tier (D-H) -> no bench-corpus.
requireCapabilities(['repo-tree']);

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-artifacts', 'junit.xml');
const MANIFEST = path.join(ROOT, 'docs', 'test-manifest.json');

// Fail-closed: a missing/unreadable manifest is a red gate, never a skipped
// assertion (the manifest is the registered expectation).
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
} catch (e) {
  console.error('run-test-gate: FAIL: docs/test-manifest.json unreadable - run: node scripts/build-test-manifest.js');
  process.exit(1);
}
if (!Number.isInteger(manifest.enumeration && manifest.enumeration.suites) || manifest.enumeration.suites <= 0
  || !Number.isInteger(manifest.junit && manifest.junit.tests) || manifest.junit.tests <= 0) {
  console.error('run-test-gate: FAIL: manifest is missing positive enumeration.suites / junit.tests integers');
  process.exit(1);
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
if (suites !== manifest.enumeration.suites) {
  console.error('FAIL: suite-count drift - collected ' + suites + ' suites, manifest enumeration declares ' + manifest.enumeration.suites
    + ' (ADR-0091 D-002). A silent collection failure or an intentional suite add/remove must regenerate the manifest in the same change: node scripts/build-test-manifest.js');
  process.exit(1);
}
if (!head) {
  console.error('FAIL: JUnit header is missing the tests attribute - cannot reconcile the manifest (ADR-0057 D-C)');
  process.exit(1);
}
const tests = Number(head[1]);
// Post-jest dual-channel reconciliation (ADR-0091 D-002(v)). junit.tests
// counts pending tests, so the assertion is tier-invariant; junit.skipped is
// tier-variant and display-only (never asserted across tiers).
if (tests !== manifest.junit.tests) {
  console.error('FAIL: test-count drift - collected ' + tests + ' tests, manifest junit declares ' + manifest.junit.tests
    + ' (ADR-0091 D-002). Regenerate the manifest in the same change: node scripts/build-test-manifest.js');
  process.exit(1);
}

console.log('[test] OK: ' + suites + ' suites, ' + tests + ' tests, ' + head[2] + ' skipped == docs/test-manifest.json (ADR-0057 D-C + ADR-0091 D-002)');
process.exit(0);
