#!/usr/bin/env node
'use strict';
// scripts/build-audit-checklist.js - ADR-0091 (grill-t34 D-004(i)): the CI
// command surface as a derived checklist artifact. Reuses the zero-dep
// parsers (check-ci-jobs parseJobs / check-ci-wiring runLines) to extract
// every ci.yml job's ordered run lines into
// docs/governance/audit-checklist.json. --check regenerates and diffs
// (generated_at excluded, D-008 weak self-consistency). 'emit' prints the
// checklist commands as a JSON array for the auditor to paste into the
// report's <!-- audit-coverage v1 --> block and attest - the auditor
// declares what they ran; the generator never co-signs result truth.
//
// Injectable seams for the battery: opts.ymlText, opts.now.

const fs = require('fs');
const path = require('path');
const { parseJobs } = require('./check-ci-jobs');
const { runLines } = require('./check-ci-wiring');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const CI_REL = path.join('.github', 'workflows', 'ci.yml');
const OUT_REL = path.join('docs', 'governance', 'audit-checklist.json');

// ADR-0092 D-M2 (grill-t35 D-005): the audit-time ADVISORY surface.
//
// A demoted check that nothing surfaces is a deleted check. The per-commit
// rewrite-map leg was demoted to audit-time precisely because it is structurally
// unsatisfiable for lane commits rebased onto a grown tree - but that is exactly
// the finding an auditor most needs to SEE, so it is enumerated here and the
// auditor attests its state in the coverage block. The commands are derived here,
// never hand-typed into a report.
const ADVISORIES = [
  {
    name: 'map-freshness-per-commit-advisory',
    command: 'node scripts/check-map-freshness.js --advisory-only',
    status: 'advisory (non-blocking)',
    source_adr: 'docs/adr/0092-public-object-equivalence-and-post-land-verification-contract.md',
    why: 'grill-t35 D-005 demoted the per-commit embedded-map check to audit-time: it is structurally unsatisfiable under the GitButler multi-lane landing model. The blocking authority is tip-map coverage; this surface keeps the unsatisfiable class visible so the auditor attests it rather than rediscovering it.',
  },
  {
    name: 'post-land-subset',
    command: 'node scripts/check-post-land.js',
    status: 'wave-time (not a CI leg)',
    source_adr: 'docs/adr/0092-public-object-equivalence-and-post-land-verification-contract.md',
    why: 'grill-t35 D-004: re-verifies the LANDED public tip in a throwaway worktree. Deliberately not a CI job - CI observes the tree only after it is public, so it is the wrong observation point for a pre-public check. The auditor may re-run it to confirm the landed state.',
  },
];

function buildChecklist(opts) {
  opts = opts || {};
  const yml = opts.ymlText || fs.readFileSync(path.join(ROOT, CI_REL), 'utf8');
  const jobs = parseJobs(yml);
  const jobRows = Object.keys(jobs).map(function (name) {
    return { job: name, run_lines: runLines(jobs[name].join('\n')) };
  });
  const commands = [];
  for (const j of jobRows) for (const r of j.run_lines) commands.push(r);
  return {
    schema_version: 1,
    _doc: 'ADR-0091 (grill-t34 D-004): derived CI command-surface checklist - the audit re-run surface floor. Generated from ci.yml via the shared zero-dep parsers; hand-edit forbidden. node scripts/build-audit-checklist.js emit prints the commands array for the audit-coverage v1 block; the auditor attests what they ran - the generator never co-signs.',
    generated_by: 'scripts/build-audit-checklist.js',
    generated_at: (opts.now || new Date()).toISOString(),
    source: '.github/workflows/ci.yml',
    jobs: jobRows,
    commands: commands,
    advisories: ADVISORIES,
  };
}

function stableCopy(m) {
  const c = JSON.parse(JSON.stringify(m));
  delete c.generated_at;
  return c;
}

function firstDiffPath(a, b, prefix) {
  const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort();
  for (const k of keys) {
    const va = a[k]; const vb = b[k];
    const p = prefix ? prefix + '.' + k : k;
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      if (typeof va === 'object' && va && typeof vb === 'object' && vb) {
        const sub = firstDiffPath(va, vb, p);
        if (sub) return sub;
      }
      return p;
    }
  }
  return null;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  requireCapabilities('audit-checklist'); // ADR-0040 D7d: the leg declares its own registry identity
  const outAbs = path.join(ROOT, OUT_REL);
  if (argv[0] === 'emit') {
    const c = JSON.parse(fs.readFileSync(outAbs, 'utf8'));
    console.log(JSON.stringify({ commands: c.commands, advisories: (c.advisories || []).map(function (a) { return a.command; }) }, null, 2));
    process.exit(0);
  }
  const check = argv.indexOf('--check') !== -1;
  if (check) {
    let committed = null;
    try { committed = JSON.parse(fs.readFileSync(outAbs, 'utf8')); } catch (e) {
      console.error('[config] FAIL: ' + OUT_REL + ' unreadable - run: node scripts/build-audit-checklist.js');
      process.exit(1);
    }
    const regen = buildChecklist();
    regen.generated_at = committed.generated_at;
    const d = firstDiffPath(stableCopy(committed), stableCopy(regen));
    if (d) {
      console.error('[config] FAIL: checklist drift at ' + d + ' - run: node scripts/build-audit-checklist.js');
      process.exit(1);
    }
    console.log('[audit-checklist] OK: committed checklist == regenerated CI surface (' + committed.commands.length + ' commands)');
    process.exit(0);
  }
  const c = buildChecklist();
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(c, null, 2) + '\n', 'utf8');
  console.log('[audit-checklist] wrote ' + OUT_REL + ' (' + c.commands.length + ' commands across ' + c.jobs.length + ' jobs)');
}

module.exports = { buildChecklist, stableCopy, firstDiffPath, OUT_REL, CI_REL };
