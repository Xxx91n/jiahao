#!/usr/bin/env node
// check-ci-jobs.js - ADR-0035 D5 assertion for defer-0004 (zero-dependency).
// Evaluates the presence-condition "ci.yml declares more than one top-level
// job". Exit 0 = condition SATISFIED (suggest activating defer-0004), exit 1 =
// not satisfied (deferral remains valid). This script is an evaluator invoked
// by check-deferred.js via verified_by; it is NOT a gate (ADR-0035 D6: a
// satisfied assertion only suggests activation, never auto-activates).
//
// Usage: node scripts/check-ci-jobs.js [ci.yml path]

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CI_REL = path.join('.github', 'workflows', 'ci.yml');

// Count job keys: lines at exactly one indent level under a top-level "jobs:".
function countJobs(yml) {
  const lines = String(yml).split(/\r?\n/);
  let inJobs = false, count = 0;
  for (const line of lines) {
    if (/^jobs:\s*(#.*)?$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;
    if (/^\S/.test(line) && line.trim() !== '') break; // left jobs: block
    if (/^  [A-Za-z0-9_-]+:\s*(#.*)?$/.test(line)) count++;
  }
  return count;
}

function main(argv) {
  const ciPath = argv[2] || path.join(ROOT, CI_REL);
  const n = countJobs(fs.readFileSync(ciPath, 'utf8'));
  if (n > 1) {
    console.log('ci jobs: ' + n + ' (>1) - defer-0004 presence-condition SATISFIED, human review suggested');
    process.exit(0);
  }
  console.log('ci jobs: ' + n + ' (single-job) - defer-0004 stays deferred');
  process.exit(1);
}

if (require.main === module) main(process.argv);

module.exports = { countJobs, CI_REL };
