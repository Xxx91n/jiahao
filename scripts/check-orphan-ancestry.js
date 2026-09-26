#!/usr/bin/env node
'use strict';
// scripts/check-orphan-ancestry.js - grill-t28 D-005/D-006 standing leg.
// Asserts every strict pin (captured-at-head: / seal: line forms) inside
// committed round artifacts resolves to an ancestor of HEAD, plus the
// mechanized ritual trigger: gitbutler/workspace HEAD non-fast-forward vs
// the last seal-anchor record goes red automatically. Red semantics: no
// new claims, no seal; exemptions only via the registered errata list in
// surface-taxonomy.json freshness.orphan_ancestry.errata_exemptions.
//
// Usage: node scripts/check-orphan-ancestry.js

const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const fresh = require('./evidence-freshness');

const ROOT = path.join(__dirname, '..');
const GATE = 'orphan-ancestry';

function main() {
  requireCapabilities(GATE);
  const cfg = fresh.loadFreshness(ROOT);
  const r = fresh.orphanAncestry(ROOT, cfg, {});
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
  if (r.red) {
    console.error('[' + GATE + '] FAIL - ' + (r.violations.length + (r.trigger.state === 'violation' ? 1 : 0)) + ' violation(s), ' + r.pinCount + ' pin(s) across ' + r.uniqueShas + ' sha(s) checked');
    process.exit(1);
  }
  console.log('[' + GATE + '] OK - ' + r.pinCount + ' pin(s) / ' + r.uniqueShas + ' unique sha(s) ancestral of ' + r.ref + '; trigger: ' + r.trigger.state + (r.trigger.reason ? ' (' + r.trigger.reason + ')' : '') + (r.exempted.length ? '; ' + r.exempted.length + ' errata-exempt' : ''));
  process.exit(0);
}

if (require.main === module) main();
