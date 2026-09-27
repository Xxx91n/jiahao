#!/usr/bin/env node
// verify-evidence.js — ADR-0026 D4 cold-path chain verification CLI.
//
//   node scripts/verify-evidence.js            # verifyTail (hot path)
//   node scripts/verify-evidence.js --full     # verifyFull (all segments)
//   node scripts/verify-evidence.js --dir <configDir> [--full]
//
// Not wired into the per-turn verdict-gate (latency budget, ADR-0019/0013).
// Exit 0 = chain valid, exit 1 = corruption / no segments.

const { createEvidenceLog } = require('../src/evidence-log');

const args = process.argv.slice(2);
const full = args.indexOf('--full') >= 0;
const dirIdx = args.indexOf('--dir');
const dir = dirIdx >= 0 && args[dirIdx + 1] ? args[dirIdx + 1] : undefined;

let log;
let result;
try {
  log = createEvidenceLog(dir);
  result = full ? log.verifyFull() : log.verifyTail();
} catch (e) {
  if (e && e.name === 'ConfigLoadError') {
    console.error('[config]: FAIL: ' + e.message);
    process.exit(1);
  }
  throw e;
}
const out = {
  mode: full ? 'verifyFull' : 'verifyTail',
  valid: result.valid,
  // ADR-0051 D-C: the capability class must appear in verification output so
  // an anchor_behind state can be read as the expected degraded state.
  persistence: log.persistenceCapability(),
};
if (result.consumer) out.consumer = result.consumer;
if (result.fallback) out.fallback = result.fallback;
if (result.recovery_window) out.recovery_window = result.recovery_window;
if (result.freshness) out.freshness = result.freshness;
out.verdict = result.verdict || (result.valid ? 'pass' : 'fail');
if (!result.valid) {
  if (typeof result.broken_at === 'number') out.broken_at = result.broken_at;
  if (result.reason) out.reason = result.reason;
}
console.log(JSON.stringify(out));
if (out.verdict === 'warn') {
  console.error('jiahao verify-evidence: anchor freshness is stale; run the maintenance re-anchor command');
}
process.exit(out.verdict === 'fail' ? 1 : 0);
