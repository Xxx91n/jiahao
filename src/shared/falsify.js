'use strict';

// src/shared/falsify.js -- ADR-0044 D-F/D-G/D-J: pure falsification core.
// This module owns the five-tuple record and the first 12 structural twin
// pairs. No I/O here; scripts/check-falsify.js is the thin executable seam.

const { CAPABILITIES } = require('./capability');

const EVIDENCE_TRI_STATE = Object.freeze(['valid', 'invalid', 'missing']);

const TWIN_COUNT = 12;
const TWINS = Object.freeze(Array.from({ length: TWIN_COUNT }, function (_, i) {
  const n = String(i + 1).padStart(4, '0');
  return Object.freeze({
    claim_id: 'ft-' + n,
    claim_type: CAPABILITIES[i % CAPABILITIES.length],
    honest: Object.freeze({
      falsification_cmd: 'node -e "process.exit(0)"',
    }),
    liar: Object.freeze({
      falsification_cmd: 'node -e "process.exit(1)"',
    }),
  });
}));

function makeRecord(claim_id, claim_type, falsification_cmd, exit_code) {
  const code = Number.isInteger(exit_code) ? exit_code : null;
  let falsified = 'missing';
  if (code === 0) falsified = 'valid';
  else if (code === 1) falsified = 'invalid';
  return {
    claim_id: claim_id,
    claim_type: claim_type,
    falsification_cmd: falsification_cmd,
    exit_code: code,
    falsified: falsified,
  };
}

module.exports = {
  EVIDENCE_TRI_STATE,
  TWIN_COUNT,
  TWINS,
  makeRecord,
};
