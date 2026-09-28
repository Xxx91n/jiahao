#!/usr/bin/env node
// bench/codebuddy-trial/tools/begin.js — D-002: open a phase window.
// Writes runs/<run-id>.json (status:open). Hard errors while another window
// is unsealed (single-open-window invariant — a forgotten end blocks the
// next open instead of creating double ownership).
//
// Usage:
//   node begin.js --run-id <id> --phase P0|P1|P2 --volume a|b|c
//                 --bundle-sha <sha256> --host-version <str>
//                 [--tasks t1,t2,...] [--at <ISO-8601-UTC>]
//                 [--trial-root <dir>]   (fixture/scratch surface)
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, isIsoUtc, fail, usageExit } = require('./lib/common');
const M = require('./lib/manifest');
const paths = require('./lib/paths');

const args = parseArgs(process.argv.slice(2));
for (const k of ['run-id', 'phase', 'volume', 'bundle-sha', 'host-version']) {
  if (!args[k]) usageExit('begin --run-id <id> --phase <P0|P1|P2> --volume <a|b|c> --bundle-sha <sha256> --host-version <str> [--tasks csv] [--at ISO] [--trial-root dir]');
}
const T = paths.resolve(args['trial-root']);
const at = args.at || new Date().toISOString();
if (!isIsoUtc(at)) fail('--at must be ISO-8601-UTC, got ' + JSON.stringify(args.at));

// Volume manifest is the frozen task battery; planned task ids default to its
// full list (P0 additionally plans the item-0 telemetry probe).
const volFile = path.join(T.VOLUMES, args.volume + '.json');
if (!fs.existsSync(volFile)) fail('unknown volume ' + args.volume + ' (no volumes/' + args.volume + '.json)');
const vol = JSON.parse(fs.readFileSync(volFile, 'utf8'));
let planned = vol.tasks.map((t) => t.task_id);
if (args.tasks) {
  const want = args.tasks.split(',').map((s) => s.trim()).filter(Boolean);
  const known = new Set(planned);
  const bad = want.filter((t) => !known.has(t));
  if (bad.length) fail('task ids not in volume ' + args.volume + ': ' + bad.join(', '));
  planned = want;
}
if (args.phase === 'P0') planned = [M.ITEM0_TASK_ID].concat(planned);

const res = M.openManifest(T, {
  run_id: args['run-id'],
  phase: args.phase,
  volume: args.volume,
  planned_task_ids: planned,
  opened_at: at,
  host_version: args['host-version'],
  bundle_sha: args['bundle-sha'],
});

// Phase-order advisory (protocol fixes P0 -> P1 -> P2; the harness records,
// the owner owns execution order — a skipped earlier phase is a deviation
// note, not a block).
const sealed = M.listManifests(T).filter((r) => r.manifest.status === 'sealed' && r.manifest.run_id !== res.manifest.run_id).map((r) => r.manifest.phase);
const idx = M.PHASES.indexOf(args.phase);
if (idx > 0 && sealed.indexOf(M.PHASES[idx - 1]) < 0) {
  process.stderr.write('[codebuddy-trial] deviation-note: opening ' + args.phase + ' with no sealed ' + M.PHASES[idx - 1] + ' on this lane (protocol order is P0 -> P1 -> P2)\n');
}

console.log(JSON.stringify({
  opened: res.manifest.run_id, phase: res.manifest.phase, volume: res.manifest.volume,
  planned_task_ids: res.manifest.planned_task_ids,
  opened_at: res.manifest.opened_at, file: path.relative(T.REPO, res.file).split(path.sep).join('/'),
}, null, 2));
