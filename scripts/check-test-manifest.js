#!/usr/bin/env node
'use strict';
// scripts/check-test-manifest.js - ADR-0091 leg (grill-t34 D-002(iv)): the
// static freshness leg. Independent of jest results - it runs in ANY battery
// state, which is what kills the E-25 masking class (a red battery must not
// hide declaration drift, and a green battery must not hide a stale
// manifest). Two assertions:
//   (a) freshness - recompute enumeration (jest --listTests) vs the committed
//       manifest's enumeration section;
//   (b) README sentinel regions == manifest-derived text in BOTH READMEs
//       (fail-closed on missing / inverted / duplicate sentinels, ADR-0043 D-B).
// Leg output never implies battery status (name discipline) - battery verdicts
// stay with run-test-gate.

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const { renderLines, spliceRegion, structuralErrors, MARKERS, MANIFEST_REL, listTests } = require('./build-test-manifest');

requireCapabilities('check-test-manifest'); // ADR-0040 D7d: the leg declares its own registry identity

const ROOT = path.join(__dirname, '..');
const README_PATHS = ['README.md', 'README-zh-CN.md'];

// Extract the current region content between a sentinel pair (fail-closed via
// spliceRegion's own validation - a throw IS the failure signal).
function regionContent(text, pair, label) {
  // Extract from the ORIGINAL bytes between the sentinels - never splice the
  // expected content in first, or the equality check is a tautology (audit
  // C4). Sentinel validation stays fail-closed on the original text.
  const i = text.indexOf(pair.begin);
  const j = text.indexOf(pair.end);
  if (i === -1 || j === -1 || j < i) throw new Error('[config] ' + label + ' sentinel region missing or inverted');
  if (text.indexOf(pair.begin, i + 1) !== -1 || text.indexOf(pair.end, j + 1) !== -1) throw new Error('[config] duplicate ' + label + ' sentinel marker');
  return text.slice(i + pair.begin.length + 1, j - 1);
}

function main() {
const errors = [];
let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_REL), 'utf8'));
} catch (e) {
  console.error('[config] FAIL: ' + MANIFEST_REL + ' unreadable - run: node scripts/build-test-manifest.js');
  process.exit(1);
}
const structural = structuralErrors(manifest);
if (structural.length) {
  structural.forEach(function (e) { console.error('[config] FAIL: ' + e); });
  process.exit(1);
}

// (a) enumeration freshness
const files = listTests(ROOT);
if (files.length !== manifest.enumeration.suites) {
  errors.push('enumeration drift: manifest declares ' + manifest.enumeration.suites + ' suites, --listTests discovers ' + files.length + ' - run: node scripts/build-test-manifest.js');
} else {
  const want = manifest.enumeration.suite_files;
  for (let i = 0; i < files.length; i++) {
    if (files[i] !== want[i]) { errors.push('enumeration drift at suite_files[' + i + ']: manifest ' + want[i] + ' vs live ' + files[i]); break; }
  }
}

// (b) README sentinel regions == manifest-derived text (both languages)
const lines = renderLines(manifest);
for (const rel of README_PATHS) {
  const zh = rel !== 'README.md';
  let text;
  try { text = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) {
    errors.push(rel + ' unreadable'); continue;
  }
  try {
    const gotDev = regionContent(text, MARKERS.develop, rel + ': develop region');
    if (gotDev !== lines.develop) errors.push(rel + ' develop region != manifest-derived text');
    const wantArch = zh ? lines.architecture_zh : lines.architecture_en;
    const gotArch = regionContent(text, MARKERS.architecture, rel + ': architecture region');
    if (gotArch !== wantArch) errors.push(rel + ' architecture region != manifest-derived text');
  } catch (e) {
    errors.push(String(e.message).replace(/^\[config\] /, ''));
  }
}

if (errors.length) {
  errors.forEach(function (e) { console.error('FAIL: ' + e); });
  process.exit(1);
}
console.log('[check-test-manifest] OK: enumeration fresh (' + manifest.enumeration.suites + ' suites), 4 README sentinel regions == manifest-derived text (battery status not implied by this leg)');
process.exit(0);
}
if (require.main === module) main();

module.exports = { regionContent };
