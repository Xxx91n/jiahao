#!/usr/bin/env node
// scripts/eval-ab.js — A/B evaluation harness for jiahao iron laws
// Measures False Completion Rate (FCR) with vs without iron laws injection.
// Mirrors promptfoo's fair-baseline protocol: same model, same task, swap only injection.
//
// Usage: node scripts/eval-ab.js
// Output: JSONL per-case results + aggregate FCR to stdout

const fs = require('fs');
const path = require('path');
const { verify, TIERS } = require('../src/gate.js');
const { createEvidenceLog } = require('../src/evidence-log.js');
const evidenceLog = createEvidenceLog();

// Fixture schema: { id, type, claims, gates, expected_verdict }
// type: 'should-fail' (A) | 'should-pass' (B) | 'cannot-verify' (C)
// FCR = cases where gold=FAIL/NOT_VERIFIED but agent issued PASS

function loadFixtures() {
  const dir = path.join(__dirname, '..', 'test', 'fixtures', 'eval');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  return files.map(f => {
    const content = require(path.join(dir, f));
    return { ...content, fixture_file: f };
  });
}

// Run a single fixture through verify() and classify the result
function runFixture(fixture) {
  const result = verify(fixture.claims, fixture.gates);
  return {
    fixture_id: fixture.id,
    fixture_file: fixture.fixture_file,
    type: fixture.type,
    expected_verdict: fixture.expected_verdict,
    actual_verdict: result.verdict,
    actual_tier: result.tier,
    chain_valid: evidenceLog.verify(result.evidence_chain).valid,
    evidence_count: result.evidence_chain.length,
    // Classification
    false_completion: isFalseCompletion(fixture.expected_verdict, result.verdict),
    correct: fixture.expected_verdict === result.verdict,
  };
}

// A false completion is: gold says FAIL or NOT VERIFIED, but agent says PASS
function isFalseCompletion(expected, actual) {
  if (expected === 'FAIL' || expected === 'NOT VERIFIED') {
    return actual === 'PASS';
  }
  return false;
}

// Compute FCR and confusion matrix
function computeFCR(results) {
  const total = results.length;
  const falseCompletions = results.filter(r => r.false_completion).length;
  const correct = results.filter(r => r.correct).length;

  // Confusion matrix
  const matrix = {
    true_pass: results.filter(r => r.expected_verdict === 'PASS' && r.actual_verdict === 'PASS').length,
    true_fail: results.filter(r => r.expected_verdict === 'FAIL' && r.actual_verdict === 'FAIL').length,
    true_notverified: results.filter(r => r.expected_verdict === 'NOT VERIFIED' && r.actual_verdict === 'NOT VERIFIED').length,
    false_pass: falseCompletions,
    false_fail: results.filter(r => r.expected_verdict === 'PASS' && r.actual_verdict === 'FAIL').length,
    false_notverified: results.filter(r => r.expected_verdict === 'PASS' && r.actual_verdict === 'NOT VERIFIED').length,
  };

  return {
    total: total,
    false_completions: falseCompletions,
    fcr: total > 0 ? falseCompletions / total : 0,
    accuracy: total > 0 ? correct / total : 0,
    confusion_matrix: matrix,
    chain_valid_count: results.filter(r => r.chain_valid).length,
  };
}

// Main: run all fixtures, output results
function main() {
  const fixtures = loadFixtures();
  if (fixtures.length === 0) {
    console.error('No fixtures found in test/fixtures/eval/');
    process.exit(1);
  }

  const results = fixtures.map(runFixture);

  // Output per-case JSONL
  results.forEach(r => console.log(JSON.stringify(r)));

  // Output aggregate
  const aggregate = computeFCR(results);
  console.log('---AGGREGATE---');
  console.log(JSON.stringify(aggregate, null, 2));
}

if (require.main === module) main();

module.exports = { loadFixtures, runFixture, isFalseCompletion, computeFCR };
