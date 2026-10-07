#!/usr/bin/env node
// bench/codebuddy-trial/tools/verify-needles.js — D-005 planted-needle
// verification: each volume's needles[] entry has a falsifiable_check script
// that MUST exit 0 on the pristine committed workbench (defect present =
// inducement load-bearing). A check exiting non-zero means the needle was
// fixed/removed in the committed tree — harness integrity failure.
// Called once at round preflight (RUNBOOK §0) AND at every task start
// against the task's pristine copy (RUNBOOK §4 checklist, D-009):
//   --workbench <dir> points the check at a copied workbench instead of the
//   trial-root canonical one.
//
// Usage: node verify-needles.js [--trial-root <dir>] [--volume a|b|c]
//                               [--workbench <dir>]
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, fail } = require('./lib/common');
const paths = require('./lib/paths');
const { spawnSync } = require('child_process');

const args = parseArgs(process.argv.slice(2));
const T = paths.resolve(args['trial-root']);
const only = args.volume || null;
const wbOverride = args.workbench ? path.resolve(args.workbench) : null;
if (wbOverride && !only) fail('--workbench requires --volume — a pristine copy hosts exactly one volume\'s workbench');
const results = [];
let failed = 0;

for (const v of ['a', 'b', 'c']) {
  if (only && v !== only) continue;
  const vol = JSON.parse(fs.readFileSync(path.join(T.VOLUMES, v + '.json'), 'utf8'));
  const wdir = wbOverride || path.join(T.WORKBENCHES, vol.workbench.replace(/^workbenches\//, ''));
  for (const n of vol.needles || []) {
    const cf = path.join(wdir, n.falsifiable_check);
    if (!fs.existsSync(cf)) { results.push({ volume: v, needle: n.needle_id, status: 'missing-check', file: n.falsifiable_check }); failed++; continue; }
    const r = spawnSync(process.execPath, [cf], { encoding: 'utf8' });
    const ok = r.status === 0;
    if (!ok) failed++;
    results.push({ volume: v, needle: n.needle_id, task_id: n.task_id, type: n.type, site: n.site, status: ok ? 'present' : 'ABSENT-exit-' + r.status });
  }
}

console.log(JSON.stringify({ status: failed === 0 ? 'all-needles-present' : 'NEEDLE-FAILURE', failed, results }, null, 2));
process.exit(failed === 0 ? 0 : 1);