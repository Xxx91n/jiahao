// scripts/jest-junit-lite.js - ADR-0057 D-C: zero-dependency minimal JUnit
// reporter for the test gate. Writes test-artifacts/junit.xml at run end;
// scripts/run-test-gate.js then asserts the collected suite count against
// the registered expectation (Unskippable Summary). Deliberately the
// smallest reporter that answers "which suites ran, how many tests, how
// many skipped" - no jest-junit dependency is added for this.

'use strict';

const fs = require('fs');
const path = require('path');

// Both output paths resolve inside onRunComplete (not at module load) so the
// env override and the contract test can redirect them per-run.
function junitOut() {
  return process.env.JIAHAO_JUNIT_OUTPUT
    || path.join(process.cwd(), 'test-artifacts', 'junit.xml');
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

// jest 29 TestResult.testResults is the AssertionResult array (ancestorTitles,
// title, status, failureMessages, duration). The pre-t37 reporter read
// s.assertionResults - a FormattedTestResult field absent on TestResult - so
// the shipped junit carried zero <testcase> rows and every downstream
// member-level read silently fell back to suite attrs. Measured against the
// real 1731-test artifact in grill-t37 T-11 (S-11 M1); fixed here.
function casesOf(s) {
  return s.testResults || [];
}

class JUnitLiteReporter {
  onRunComplete(contexts, results) {
    const suites = results.testResults.map(function (s) {
      const assertions = casesOf(s);
      const skipped = assertions.filter(function (a) { return a.status === 'pending'; }).length;
      const cases = assertions.map(function (a) {
        const open = '<testcase classname="' + esc(path.basename(s.testFilePath)) + '" name="' + esc(a.title) + '" time="' + ((a.duration || 0) / 1000) + '"';
        if (a.status === 'pending') return open + '><skipped/></testcase>';
        if (a.status === 'failed') {
          return open + '><failure message="' + esc((a.failureMessages || [])[0] || 'failed') + '"></failure></testcase>';
        }
        return open + '/>';
      }).join('');
      return '<testsuite name="' + esc(path.basename(s.testFilePath)) + '" tests="' + assertions.length + '" failures="' + s.numFailingTests + '" skipped="' + skipped + '">' + cases + '</testsuite>';
    }).join('\n');
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<testsuites tests="' + results.numTotalTests + '" failures="' + results.numFailedTests + '" skipped="' + results.numPendingTests + '">\n'
      + suites + '\n</testsuites>\n';
    const out = junitOut();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, xml, 'utf8');

    // grill-t37 D-002.3 (join key name+suite+filepath, CTRF precedent): the
    // per-case sidecar JSON the status-inventory derives its jest rows from.
    // junit.xml stays the manifest contract channel; this sidecar is the
    // member-level channel - filepath is a first-class field here because the
    // XML shape predates the join key and has no filepath slot.
    const casesOut = process.env.JIAHAO_JEST_CASES_OUTPUT
      || path.join(process.cwd(), 'test-artifacts', 'jest-cases.json');
    const cwd = process.cwd();
    const caseRows = [];
    for (const s of results.testResults) {
      const rel = path.relative(cwd, s.testFilePath).split(path.sep).join('/');
      for (const a of casesOf(s)) {
        // join key fields (D-002.3): name = leaf title, suite = describe
        // chain, filepath = repo-rel path. suite is NOT the filename - that
        // would duplicate filepath and degenerate the key.
        caseRows.push({
          name: a.title,
          title: a.title,
          suite: (a.ancestorTitles || []).join(' > '),
          filepath: rel,
          status: a.status,
          duration_ms: typeof a.duration === 'number' ? a.duration : null,
        });
      }
      if ((s.failureMessage || s.testExecError) && !casesOf(s).length) {
        caseRows.push({
          name: path.basename(s.testFilePath) + ' (suite collection failure)',
          suite: '',
          filepath: rel,
          status: 'suite-failed',
          duration_ms: null,
        });
      }
    }
    fs.writeFileSync(casesOut, JSON.stringify({
      schema: 'jest-cases v1',
      generated_at: new Date().toISOString(),
      totals: { tests: results.numTotalTests, failures: results.numFailedTests, pending: results.numPendingTests },
      cases: caseRows,
    }, null, 2) + '\n', 'utf8');
  }
}

module.exports = JUnitLiteReporter;
