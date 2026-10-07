#!/usr/bin/env node
'use strict';
// scripts/check-orphan-ancestry.js - grill-t28 D-005/D-006 standing leg.
// Asserts every strict pin (captured-at-head: / seal: line forms) inside
// committed round artifacts resolves to an ancestor of ANY live anchor branch
// (refs/heads/* ∪ refs/gitbutler/*, derived in-shared - grill-t38 D-003),
// plus the mechanized ritual trigger: gitbutler/workspace HEAD
// non-fast-forward vs the last seal-anchor record goes red automatically. An
// underivable anchor set is UNVERIFIABLE (exit 2). Red semantics: no
// new claims, no seal; exemptions only via the registered errata list in
// surface-taxonomy.json freshness.orphan_ancestry.errata_exemptions.
//
// Usage: node scripts/check-orphan-ancestry.js [--root <path>]
//
// --root (grill-t35 audit B-1): the assertion object is explicit. ROOT defaults
// to the repo this file lives in, which is right for direct invocation and wrong
// for delegation - a caller that spawns this with `cwd` set to another tree got
// a verdict about THIS repo unless it says otherwise. The round's post-land
// verifier delegates into a tip worktree and must name it.

const path = require('path');
const { requireCapabilities, exitUnverifiable } = require('../src/shared/capability');
const fresh = require('./evidence-freshness');

const ROOT = path.join(__dirname, '..');
const GATE = 'orphan-ancestry';

function resolveRoot(argv) {
  const i = (argv || []).indexOf('--root');
  if (i !== -1 && argv[i + 1]) return path.resolve(argv[i + 1]);
  return ROOT;
}

function main(argv) {
  const root = resolveRoot(argv || process.argv.slice(2));
  // ADR-0040 D7d requires the LITERAL name-keyed call form (the static anchor
  // greps for it), so the probe is keyed here and the delegated root is applied
  // to the READ below. grill-t35 B-1: a delegated caller must judge the tree it
  // named, so the read is rooted there even though the capability probe is not.
  requireCapabilities('orphan-ancestry');
  const cfg = fresh.loadFreshness(root);
  const r = fresh.orphanAncestry(root, cfg, {});
  for (const v of r.violations) {
    console.error('FAIL: ' + v.file + ' ' + v.kind + ' ' + v.sha.slice(0, 12) + ' - ' + v.reason + ' (route through a registered erratum or rebuild; no new claims / no seal while red)');
  }
  for (const x of r.exempted) {
    console.log('[' + GATE + '] errata-exempt pin: ' + x.file + ' ' + x.sha.slice(0, 12) + ' (' + (x.errata || 'registered exemption') + ')');
  }
  if (r.trigger.state === 'violation') {
    console.error('FAIL: workspace trigger - ' + r.trigger.reason);
  } else if (r.trigger.state === 'not-evaluated') {
    console.log('[' + GATE + '] trigger clause: ' + r.trigger.reason);
  }
  // grill-t38 D-003.4: an empty/underivable live anchor set is an honest
  // UNVERIFIABLE verdict (exit 2) - not red, not green.
  if (r.unverifiable) {
    console.error('[' + GATE + '] UNVERIFIABLE - ' + r.unverifiableReason + ' (' + r.pinCount + ' pin(s) enumerated at the tree read; no anchor to judge ancestry against)');
    exitUnverifiable(GATE, 'repo-tree');
  }
  if (r.red) {
    console.error('[' + GATE + '] FAIL - ' + (r.violations.length + (r.trigger.state === 'violation' ? 1 : 0)) + ' violation(s), ' + r.pinCount + ' pin(s) across ' + r.uniqueShas + ' sha(s) checked');
    process.exit(1);
  }
  console.log('[' + GATE + '] OK - ' + r.pinCount + ' pin(s) / ' + r.uniqueShas + ' unique sha(s) ancestral of live anchor set [' + r.ref + ']; trigger: ' + r.trigger.state + (r.trigger.reason ? ' (' + r.trigger.reason + ')' : '') + (r.exempted.length ? '; ' + r.exempted.length + ' errata-exempt' : ''));
  process.exit(0);
}

if (require.main === module) main(process.argv.slice(2));
