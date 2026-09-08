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

const log = createEvidenceLog(dir);
const result = full ? log.verifyFull() : log.verifyTail();
const out = {
  mode: full ? 'verifyFull' : 'verifyTail',
  valid: result.valid,
  // ADR-0051 D-C: the capability class must appear in verification output so
  // an anchor_behind state can be read as the expected degraded state.
  persistence: log.persistenceCapability(),
};
if (!result.valid) {
  if (typeof result.broken_at === 'number') out.broken_at = result.broken_at;
  if (result.reason) out.reason = result.reason;
}
console.log(JSON.stringify(out));
process.exit(result.valid ? 0 : 1);
