#!/usr/bin/env node
'use strict';

// scripts/check-falsify.js -- ADR-0044 D-I/D-K: thin executable falsification
// gate. It runs the structural twin batch and exits 0 only when every honest
// twin survives and every liar twin is falsified.

const { spawnSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const { PREFIXES } = require('../src/shared/prefix-vocab');
const { createEvidenceLog } = require('../src/evidence-log');
const { configDir } = require('../src/shared/paths');
const { TWINS, makeRecord } = require('../src/shared/falsify');

function runTwin(entry, side) {
  const twin = entry[side];
  const r = spawnSync(twin.argv[0], twin.argv.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    timeout: 2000,
  });
  const claim_id = entry.claim_id + '-' + side;
  return makeRecord(claim_id, entry.claim_type, twin.falsification_cmd, r.status);
}

function persistEvidence(records, status) {
  const log = createEvidenceLog(configDir());
  log.commit((chain, prev) => [
    log.createRecord('falsification', 'confirmatory', status, JSON.stringify(records), 1, prev, {}),
  ]);
}

function main() {
  requireCapabilities('falsification');

  let failed = 0;
  const records = [];
  for (const entry of TWINS) {
    for (const side of ['honest', 'liar']) {
      const expected = side === 'honest' ? 'valid' : 'invalid';
      const record = runTwin(entry, side);
      records.push(record);
      const ok = record.falsified === expected;
      if (!ok) failed += 1;
      console.log((ok ? 'PASS' : 'FAIL') + ' ' + record.claim_id +
        ' ' + record.falsified + ' expected=' + expected);
    }
  }

  persistEvidence(records, failed > 0 ? 'failed' : 'passed');

  if (failed > 0) {
    console.error(PREFIXES.internal + ' ' + failed + ' falsification twin mismatch(es)');
    process.exit(1);
  }

  console.log('falsification OK: ' + TWINS.length + ' twin pairs');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { runTwin, main };
