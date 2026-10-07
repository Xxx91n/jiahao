#!/usr/bin/env node
'use strict';
// scripts/build-status-sentinel.js - grill-t37 D-005.3: renders the
// '<!-- status-inventory v1 -->' sentinel block(s) for a report's status
// column. The block is DERIVED from the per-run emitted artifacts
// (test-artifacts/status-inventory/), never hand-written - the snapshot is
// the claim, and the assert leg reconciles it against the next derivation.
//
// One block per locally-derivable judged surface is printed (a report may
// carry both 'gates' and 'test' blocks; each names its own run_id).
//
// Usage: node scripts/build-status-sentinel.js [--surface gates|test]
//        (default: one block per surface with a local artifact)

const fs = require('fs');
const path = require('path');
const inv = require('../src/shared/status-inventory');
const { DEFAULT_DIR } = require('../src/shared/per-run-artifacts');

const DIR = path.join(DEFAULT_DIR, 'status-inventory');

function newestFor(surface) {
  let names;
  try { names = fs.readdirSync(DIR); } catch (e) { return null; }
  const head = 'status-inventory.' + surface + '.';
  const hits = names.filter(function (n) { return n.indexOf(head) === 0 && n.slice(-5) === '.json'; })
    .sort(function (a, b) { return fs.statSync(path.join(DIR, b)).mtimeMs - fs.statSync(path.join(DIR, a)).mtimeMs; });
  if (!hits.length) return null;
  try { return JSON.parse(fs.readFileSync(path.join(DIR, hits[0]), 'utf8')); }
  catch (e) { return null; }
}

function main(argv) {
  const args = argv.slice(2);
  const si = args.indexOf('--surface');
  const surfaces = si !== -1 && args[si + 1] ? [args[si + 1]] : ['gates', 'test'];
  const blocks = [];
  const missing = [];
  for (const s of surfaces) {
    const a = newestFor(s);
    if (!a || !a.run_id || !Array.isArray(a.rows)) { missing.push(s); continue; }
    // grill-t38 D-004.9 (T-3): the artifact's anchor rides through to the
    // rendered block. A pre-anchor artifact (legacy) renders WITHOUT an anchor
    // and is disclosed at yellow level - never silently (D-004.2 rule 3).
    if (!a.anchor) {
      console.error('::warning title=build-status-sentinel::no anchor in artifact for surface ' + s
        + ' (legacy/pre-registration artifact) - rendering an anchor-less block; re-emit with the matching runner to upgrade');
    }
    blocks.push(inv.renderSentinel({
      run_id: a.run_id,
      emitted_at: a.emitted_at,
      rows: a.rows.filter(function (r) { return r && r.judged_surface === s; }),
      anchor: a.anchor,
    }));
  }
  if (!blocks.length) {
    console.error('[build-status-sentinel] no local status-inventory artifacts - run node scripts/run-gates.js and/or node scripts/run-test-gate.js first');
    process.exit(1);
  }
  for (const m of missing) {
    console.error('[build-status-sentinel] note: no local artifact for surface ' + m + ' (its block is omitted - emit it with the matching runner)');
  }
  process.stdout.write(blocks.join('\n'));
}

if (require.main === module) main(process.argv);
module.exports = { newestFor };
