#!/usr/bin/env node
'use strict';

// scripts/check-falsify.js -- ADR-0044 D-I/D-K: thin executable falsification
// gate. It runs the structural twin batch and exits 0 only when every honest
// twin survives and every liar twin is falsified.

const { spawnSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const { PREFIXES } = require('../src/shared/prefix-vocab');
const { TWINS, makeRecord } = require('../src/shared/falsify');

function runTwin(entry, side) {
  const twin = entry[side];
  const r = spawnSync(twin.falsification_cmd, { shell: true, encoding: 'utf8' });
  const claim_id = entry.claim_id + '-' + side;
  return makeRecord(claim_id, entry.claim_type, twin.falsification_cmd, r.status);
}

function main() {
  requireCapabilities('falsification');

  let failed = 0;
  for (const entry of TWINS) {
    for (const side of ['honest', 'liar']) {
      const expected = side === 'honest' ? 'valid' : 'invalid';
      const record = runTwin(entry, side);
      const ok = record.falsified === expected;
      if (!ok) failed += 1;
      console.log((ok ? 'PASS' : 'FAIL') + ' ' + record.claim_id +
        ' ' + record.falsified + ' expected=' + expected);
    }
  }

  if (failed > 0) {
    console.error(PREFIXES.internal + ' ' + failed + ' falsification twin mismatch(es)');
    process.exit(1);
  }

  console.log('falsification OK: ' + TWINS.length + ' twin pairs');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { runTwin, main };
