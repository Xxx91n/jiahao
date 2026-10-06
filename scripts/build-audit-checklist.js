#!/usr/bin/env node
'use strict';
// scripts/build-audit-checklist.js - ADR-0091 (grill-t34 D-004(i)): the CI
// command surface as a derived checklist artifact. Reuses the zero-dep
// parsers (check-ci-jobs parseJobs / check-ci-wiring runLines) to extract
// every ci.yml job's ordered run lines into
// docs/governance/audit-checklist.json. --check regenerates and diffs
// (generated_at excluded, D-008 weak self-consistency).
//
// ADR-0096 N-3 (grill-t38 D-005): 'emit' prints the FULL pasteable
// audit-coverage block - the sentinel line, the ```json fence and the bare
// commands array together - byte-identical to what the auditor pastes into a
// report. That output form IS the registered contract: changing it goes
// through Declaration (the consumer scripts/check-audit-surface.js parses the
// fence content as a bare array and stays zero-change). The sentinel marker
// and fence are the block-syntax carrier, not claim content - the auditor
// attests what they ran; the generator never co-signs result truth.
//
// Advisories ride a SEPARATE channel: '--advisories' prints the human-readable
// text list (authoritative source: the advisories field of
// docs/governance/audit-checklist.json). One channel carries one payload, so
// advisories never appear in emit and never go to stderr.
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

// The audit-coverage block marker (ADR-0096 N-3). This literal is the emit
// side of the contract; scripts/check-audit-surface.js owns the parse side.
// The loop-back pinning test (test/audit-checklist.test.js) feeds emit stdout
// through extractCoverage, so any drift between the two literals fails red.
const SENTINEL = '<!-- audit-coverage v1 -->';

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
    _doc: 'ADR-0091 (grill-t34 D-004) / ADR-0096 N-3 (grill-t38 D-005): derived CI command-surface checklist - the audit re-run surface floor. Generated from ci.yml via the shared zero-dep parsers; hand-edit forbidden. node scripts/build-audit-checklist.js emit prints the FULL pasteable audit-coverage v1 block (sentinel line + json fence + bare commands array); that output form is the registered contract - form changes go through Declaration. Advisories are a separate channel (node scripts/build-audit-checklist.js --advisories); they never ride emit. The auditor attests what they ran - the generator never co-signs.',
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
    process.stdout.write(SENTINEL + '\n```json\n' + JSON.stringify(c.commands, null, 2) + '\n```\n');
    process.exit(0);
  }
  if (argv[0] === '--advisories') {
    const c = JSON.parse(fs.readFileSync(outAbs, 'utf8'));
    const list = c.advisories || [];
    process.stdout.write('advisories (audit-time, non-blocking; source: ' + OUT_REL + ')\n\n');
    for (const a of list) {
      process.stdout.write('- ' + a.name + ' [' + a.status + ']\n');
      process.stdout.write('  command: ' + a.command + '\n');
      process.stdout.write('  why: ' + a.why + '\n');
      if (a.source_adr) process.stdout.write('  source: ' + a.source_adr + '\n');
      process.stdout.write('\n');
    }
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
