#!/usr/bin/env node
// check-ci-jobs.js - ADR-0035 D5 presence evaluator, expanded by ADR-0058
// D-004, re-keyed by ADR-0077 D-A (grill-t16).
//
// Consuming-row exit convention (ADR-0077 D-A, verbatim): "a verified_by
// script's exit code reflects only the legs of the row(s) currently
// consuming it; multi-row reporting is diagnostic, never exit-driving."
//   exit 0 = the consuming row's condition satisfied (human review suggested,
//            ADR-0035 D6)
//   exit 1 = the consuming row's condition unmet - the deferral remains valid
//   exit 2 = the verifier itself is broken (a crash must never masquerade as
//            "unsatisfied"; evalSuggestions warns on exit>1)
// Currently consuming: defer-0004 (the only live consumer). defer-0026's
// legs stay computed and printed as diagnostics - the row is terminal
// (actioned 2026-09-18); its regressions surface via wiring fixtures, not
// the process exit. Discharge re-point clause: when defer-0004 discharges,
// the exit key re-points or retires in the same commit as that registry edit.
//
// Anti-pattern assertions live in test/adr-0058-wiring.test.js (D-004
// two-layer). Usage: node scripts/check-ci-jobs.js [ci.yml path]

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CI_REL = path.join('.github', 'workflows', 'ci.yml');
// ADR-0077 D-A: the row currently consuming this verifier's exit code.
const CONSUMING_ROW = 'defer0004';

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

// Pure: yml text + workflow-file count in, per-row predicates out.
// defer-0004 (grill-t15 D-003 narrowed re-defer): the renderer question
// reopens only when the CI shape outgrows what hand-reading honestly covers -
// more than one workflow file OR any job declaring a matrix OR more than
// three jobs. Multi-job alone (the old p1) was satisfied by ADR-0058's own
// shape and permanently false-fired; the narrowed conditions are the
// renderer-justifying ones.
// defer-0026 (ADR-0058 D-F/D-G): dedicated test job + summary job + summary
// always() - diagnostic legs only; the row is terminal (actioned 2026-09-18).
function presence(yml, opts) {
  const jobs = parseJobs(yml);
  const summary = (jobs.summary || []).join('\n');
  const has = (k) => Object.prototype.hasOwnProperty.call(jobs, k);
  const jobCount = Object.keys(jobs).length;
  const anyMatrix = Object.keys(jobs).some(function (k) {
    // F-E nit: the key matches whether the matrix value is a nested block or
    // an inline flow mapping (matrix: {...}).
    return /^\s+matrix:\s*/m.test(jobs[k].join('\n'));
  });
  const workflowFiles = (opts && opts.workflowFiles) || 1;
  const d0004 = {
    multi_workflow: workflowFiles > 1,
    any_matrix: anyMatrix,
    over_three_jobs: jobCount > 3,
  };
  d0004.satisfied = d0004.multi_workflow || d0004.any_matrix || d0004.over_three_jobs;
  const d0026 = {
    test_job: has('test'),
    summary_job: has('summary'),
    summary_always: /^\s*if:\s*(\$\{\{\s*)?always\(\)\s*(\}\})?\s*$/m.test(summary),
  };
  d0026.satisfied = d0026.test_job && d0026.summary_job && d0026.summary_always;
  return {
    defer0004: d0004,
    defer0026: d0026,
    detail: { jobCount: jobCount, workflowFiles: workflowFiles, anyMatrix: anyMatrix },
  };
}

function evaluate(yml, opts) {
  const p = presence(yml, opts);
  const rows = ['defer0004', 'defer0026'];
  const unmet = rows.filter(function (r) { return !p[r].satisfied; });
  // ADR-0077 D-A: the verdict is keyed to the row currently consuming the
  // verifier; unmet stays the diagnostic list across all rows' legs.
  return { predicates: p, satisfied: p[CONSUMING_ROW].satisfied, unmet: unmet };
}

function main(argv) {
  try {
    const ciPath = argv[2] || path.join(ROOT, CI_REL);
    const wfDir = path.dirname(ciPath);
    const workflowFiles = fs.readdirSync(wfDir).filter(function (f) { return /\.ya?ml$/.test(f); }).length;
    const res = evaluate(fs.readFileSync(ciPath, 'utf8'), { workflowFiles: workflowFiles });
    const tags = ['defer0004', 'defer0026'].map(function (r) {
      const sub = res.predicates[r];
      return r + '=' + (sub.satisfied ? 'SATISFIED' : 'unmet') +
        '(' + Object.keys(sub).filter(function (k) { return k !== 'satisfied'; }).map(function (k) { return (sub[k] ? '+' : '-') + k; }).join(',') + ')';
    }).join(' ');
    console.log('ci jobs: ' + tags + ' detail=' + JSON.stringify(res.predicates.detail) + (res.satisfied
      ? ' - consuming row ' + CONSUMING_ROW + ' SATISFIED, human review suggested (ADR-0035 D6)'
      : ' - not met (' + res.unmet.join(', ') + '); the deferral remains valid'));
    process.exit(res.satisfied ? 0 : 1);
  } catch (e) {
    // ADR-0077 D-A: a crash is the verifier itself broken (exit>1), never
    // "condition unsatisfied"; evalSuggestions warns on it.
    console.error('check-ci-jobs: verifier broken - ' + ((e && e.message) || e));
    process.exit(2);
  }
}

if (require.main === module) main(process.argv);

module.exports = { parseJobs, countJobs, presence, evaluate, CI_REL, CONSUMING_ROW };
