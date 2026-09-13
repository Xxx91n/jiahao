#!/usr/bin/env node
// build-governance-anchors.js - ADR-0061 D-E "Witnessed Digest Anchor".
// Governance artifacts keep authoritative copies in git-tracked storage OUTSIDE
// the npm tarball whitelist, with machine-generated digests and a regen-and-diff
// check (write and --check share one generation path; ADR-0028 D2 precedent).
// Deterministic: filename order, no timestamps.
// Usage: node scripts/build-governance-anchors.js [--check]
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR_REL = path.join('docs', 'governance');
const OUT_REL = path.join(DIR_REL, 'anchors.json');
// ADR-0040 D1: a gate-registered script probes its declared capabilities before
// loading runtime dependencies (here the requirement is just the repo tree).
const { requireCapabilities } = require('../src/shared/capability');
const ARTIFACTS = [
  { file: 'decision-ledger-adr0059.md', origin: '.scratch/grill-adr0059/decision-ledger.md', adr: 'ADR-0059' },
  { file: 'decision-ledger-adr0061.md', origin: '.scratch/grill-adr0061/decision-ledger.md', adr: 'ADR-0061' },
  { file: 'audit-report-adr0058.md', origin: '.scratch/grill-adr0058/reports/2026-09-12-audit-report.md', adr: 'ADR-0058' },
  { file: 'ERRATA.md', origin: '(authored in place)', adr: 'ADR-0061' },
];

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function generate() {
  const artifacts = ARTIFACTS.map(function (a) {
    const buf = fs.readFileSync(path.join(ROOT, DIR_REL, a.file));
    return { file: a.file, origin: a.origin, adr: a.adr, bytes: buf.length, sha256: sha256(buf) };
  });
  return {
    schema_version: 1,
    _doc: 'ADR-0061 D-E: authoritative governance copies outside the tarball whitelist; digests are machine-generated and regen-and-diff checked.',
    witness: 'git-tracked commit (the second copy); a full external/cross-domain witness remains deferred as defer-0024 (minimal unlock, ADR-0061 D-E C-2)',
    artifacts: artifacts,
  };
}

function main() {
  requireCapabilities('governance-anchors');
  const check = process.argv.indexOf('--check') !== -1;
  const next = JSON.stringify(generate(), null, 2) + String.fromCharCode(10);
  const outPath = path.join(ROOT, OUT_REL);
  if (check) {
    if (!fs.existsSync(outPath)) { console.error('FAIL: ' + OUT_REL + ' missing'); process.exit(1); }
    const cur = fs.readFileSync(outPath, 'utf8');
    if (cur !== next) { console.error('FAIL: ' + OUT_REL + ' is stale - regenerate with node scripts/build-governance-anchors.js'); process.exit(1); }
    console.log('[governance-anchors] OK - ' + generate().artifacts.length + ' artifacts, digests in sync');
    return;
  }
  fs.writeFileSync(outPath, next, { encoding: 'utf8' });
  console.log('[governance-anchors] wrote ' + OUT_REL);
}

if (require.main === module) main();

module.exports = { generate, ARTIFACTS, OUT_REL };