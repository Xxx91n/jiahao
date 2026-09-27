// scripts/jest-junit-lite.js - ADR-0057 D-C: zero-dependency minimal JUnit
// reporter for the test gate. Writes test-artifacts/junit.xml at run end;
// scripts/run-test-gate.js then asserts the collected suite count against
// the registered expectation (Unskippable Summary). Deliberately the
// smallest reporter that answers "which suites ran, how many tests, how
// many skipped" - no jest-junit dependency is added for this.

'use strict';

const fs = require('fs');
const path = require('path');

const OUT = process.env.JIAHAO_JUNIT_OUTPUT
  || path.join(process.cwd(), 'test-artifacts', 'junit.xml');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

class JUnitLiteReporter {
  onRunComplete(contexts, results) {
    const suites = results.testResults.map(function (s) {
      const assertions = s.assertionResults || [];
      const skipped = assertions.filter(function (a) { return a.status === 'pending'; }).length;
      const cases = assertions.map(function (a) {
        const open = '<testcase classname="' + esc(path.basename(s.testFilePath)) + '" name="' + esc(a.title) + '" time="' + ((a.duration || 0) / 1000) + '"';
        return a.status === 'pending' ? open + '><skipped/></testcase>' : open + '/>';
      }).join('');
      return '<testsuite name="' + esc(path.basename(s.testFilePath)) + '" tests="' + assertions.length + '" failures="' + s.numFailingTests + '" skipped="' + skipped + '">' + cases + '</testsuite>';
    }).join('\n');
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<testsuites tests="' + results.numTotalTests + '" failures="' + results.numFailedTests + '" skipped="' + results.numPendingTests + '">\n'
      + suites + '\n</testsuites>\n';
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, xml, 'utf8');
  }
}

module.exports = JUnitLiteReporter;
