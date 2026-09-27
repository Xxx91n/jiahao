#!/usr/bin/env node
// check-ci-jobs.js - ADR-0035 D5 presence evaluator, expanded by ADR-0058 D-004.
// Zero-dependency; exit 0 = SATISFIED (suggests human review, ADR-0035 D6),
// exit 1 = not satisfied. Predicates: multi-job (defer-0004); dedicated test
// job + summary job + summary always() (defer-0026). Anti-pattern assertions
// live in test/adr-0058-wiring.test.js, not here (D-004 two-layer).
//
// Usage: node scripts/check-ci-jobs.js [ci.yml path]

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CI_REL = path.join('.github', 'workflows', 'ci.yml');

// Top-level jobs: mapping -> { name: [content lines] }; comments are inert.
function parseJobs(yml) {
  const jobs = {};
  let inJobs = false, current = null;
  for (const line of String(yml).split(/\r?\n/)) {
    if (/^jobs:\s*(#.*)?$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;
    if (/^\S/.test(line) && line.trim() !== '') break; // left the jobs: block
    const m = /^  ([A-Za-z0-9_-]+):\s*(#.*)?$/.exec(line);
    if (m) { current = m[1]; jobs[current] = []; continue; }
    if (current && !/^\s*#/.test(line)) jobs[current].push(line);
  }
  return jobs;
}

function countJobs(yml) { return Object.keys(parseJobs(yml)).length; }

// Pure: yml text in, predicate -> boolean out.
function presence(yml) {
  const jobs = parseJobs(yml);
  const summary = (jobs.summary || []).join('\n');
  const has = (k) => Object.prototype.hasOwnProperty.call(jobs, k);
  return {
    p1_multi_job: Object.keys(jobs).length > 1,
    p2_test_job: has('test'),
    p3_summary_job: has('summary'),
    p4_summary_always: /^\s*if:\s*(\$\{\{\s*)?always\(\)\s*(\}\})?\s*$/m.test(summary),
  };
}

function evaluate(yml) {
  const predicates = presence(yml);
  const unmet = Object.keys(predicates).filter(k => !predicates[k]);
  return { predicates, satisfied: unmet.length === 0, unmet };
}

function main(argv) {
  const res = evaluate(fs.readFileSync(argv[2] || path.join(ROOT, CI_REL), 'utf8'));
  const tags = Object.keys(res.predicates).map(k => (res.predicates[k] ? '+' : '-') + k).join(' ');
  console.log('ci jobs: ' + tags + (res.satisfied
    ? ' - presence-condition SATISFIED, human review suggested (ADR-0035 D6)'
    : ' - not met (' + res.unmet.join(', ') + '); the deferral remains valid'));
  process.exit(res.satisfied ? 0 : 1);
}

if (require.main === module) main(process.argv);

module.exports = { parseJobs, countJobs, presence, evaluate, CI_REL };
