'use strict';

// src/shared/falsify.js -- ADR-0044 D-F/D-G/D-J: pure falsification core.
// This module owns the five-tuple record and the first 12 claim-directed
// twin pairs. No I/O here; scripts/check-falsify.js is the thin seam.

const CLAIM_TYPES = Object.freeze([
  'state-change',
  'enumeration',
  'verification',
  'side-effect',
  'informational',
  'statistical-effect',
]);

const EVIDENCE_TRI_STATE = Object.freeze(['valid', 'invalid', 'missing']);

function nodeCommand(body) {
  return Object.freeze({
    falsification_cmd: 'node -e ' + body,
    argv: Object.freeze(['node', '-e', body]),
  });
}

function pair(id, claimType, honestBody, liarBody) {
  return Object.freeze({
    claim_id: id,
    claim_type: claimType,
    honest: nodeCommand(honestBody),
    liar: nodeCommand(liarBody),
  });
}

// Each honest command verifies a true repo invariant (exit 0). Each liar
// command verifies a single mutated version of that same invariant (exit 1),
// so the gate distinguishes a real check from a command that cannot fail.
const TWINS = Object.freeze([
  pair('ft-0001', 'verification',
    "const {PREFIXES}=require('./src/shared/prefix-vocab'); process.exit(PREFIXES.usage==='[usage]:'?0:1)",
    "const {PREFIXES}=require('./src/shared/prefix-vocab'); process.exit(PREFIXES.usage==='[internal]:'?0:1)"),
  pair('ft-0002', 'verification',
    "const {PREFIXES}=require('./src/shared/prefix-vocab'); process.exit(PREFIXES.config==='[config]:'?0:1)",
    "const {PREFIXES}=require('./src/shared/prefix-vocab'); process.exit(PREFIXES.config==='[usage]:'?0:1)"),
  pair('ft-0003', 'verification',
    "const {PREFIXES}=require('./src/shared/prefix-vocab'); process.exit(PREFIXES.internal==='[internal]:'?0:1)",
    "const {PREFIXES}=require('./src/shared/prefix-vocab'); process.exit(PREFIXES.internal==='[config]:'?0:1)"),
  pair('ft-0004', 'enumeration',
    "const {CAPABILITIES}=require('./src/shared/capability'); process.exit(CAPABILITIES.length===5?0:1)",
    "const {CAPABILITIES}=require('./src/shared/capability'); process.exit(CAPABILITIES.length===6?0:1)"),
  pair('ft-0005', 'verification',
    "const {CAPABILITIES}=require('./src/shared/capability'); process.exit(CAPABILITIES[0]==='repo-tree'?0:1)",
    "const {CAPABILITIES}=require('./src/shared/capability'); process.exit(CAPABILITIES[0]==='bench-corpus'?0:1)"),
  pair('ft-0006', 'state-change',
    "const g=require('./docs/gates.json').entries.find(e=>e.name==='falsification'); process.exit(g&&g.order===185?0:1)",
    "const g=require('./docs/gates.json').entries.find(e=>e.name==='falsification'); process.exit(g&&g.order===184?0:1)"),
  pair('ft-0007', 'side-effect',
    "const g=require('./docs/gates.json').entries.find(e=>e.name==='falsification'); process.exit(g&&g.tier==='confirmatory'?0:1)",
    "const g=require('./docs/gates.json').entries.find(e=>e.name==='falsification'); process.exit(g&&g.tier==='observational'?0:1)"),
  pair('ft-0008', 'enumeration',
    "const g=require('./docs/gates.json').entries.find(e=>e.name==='falsification'); process.exit(Array.isArray(g.requires)&&g.requires.indexOf('repo-tree')>=0?0:1)",
    "const g=require('./docs/gates.json').entries.find(e=>e.name==='falsification'); process.exit(Array.isArray(g.requires)&&g.requires.indexOf('bench-corpus')>=0?0:1)"),
  pair('ft-0009', 'verification',
    "const f=require('./src/shared/falsify'); process.exit(JSON.stringify(f.EVIDENCE_TRI_STATE)==='[\"valid\",\"invalid\",\"missing\"]'?0:1)",
    "const f=require('./src/shared/falsify'); process.exit(f.EVIDENCE_TRI_STATE.length===2?0:1)"),
  pair('ft-0010', 'enumeration',
    "const f=require('./src/shared/falsify'); process.exit(f.TWINS.length===12?0:1)",
    "const f=require('./src/shared/falsify'); process.exit(f.TWINS.length===11?0:1)"),
  pair('ft-0011', 'side-effect',
    "const c=require('./scripts/check-falsify'); process.exit(typeof c.runTwin==='function'?0:1)",
    "const c=require('./scripts/check-falsify'); process.exit(typeof c.runTwin==='string'?0:1)"),
  pair('ft-0012', 'informational',
    "const p=require('./src/shared/paths'); process.exit(typeof p.configDir==='function'?0:1)",
    "const p=require('./src/shared/paths'); process.exit(typeof p.configDir==='number'?0:1)"),
]);

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
  CLAIM_TYPES,
  EVIDENCE_TRI_STATE,
  TWINS,
  makeRecord,
};
