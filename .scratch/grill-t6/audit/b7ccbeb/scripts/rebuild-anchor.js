#!/usr/bin/env node
// rebuild-anchor.js — ADR-0052 D-E controlled genesis-anchor rebuild, gated
// by the ADR-0017 human review flow (two phases: preview, then authorized).
//
//   node scripts/rebuild-anchor.js [--dir <configDir>]
//     Phase 1: print the witness state (no writes).
//   node scripts/rebuild-anchor.js --reviewer <id> --reason <text> --approve [--dir <configDir>]
//     Phase 2: controlled rotation — appends the audit disposition to the
//     append-only evidence, increments the anchor generation, then forces a
//     full verification (exit 1 with WITNESS_REBUILD_VERIFY_FAILED if it fails).

const { createEvidenceLog, WITNESS_RECOVERY } = require('../src/evidence-log');

const args = process.argv.slice(2);
function opt(name) {
  const i = args.indexOf('--' + name);
  return i >= 0 && typeof args[i + 1] === 'string' ? args[i + 1] : null;
}
const dir = opt('dir');

let log;
try {
  log = createEvidenceLog(dir);
} catch (e) {
  if (e && e.name === 'ConfigLoadError') {
    console.error('[config]: FAIL: ' + e.message);
    process.exit(1);
  }
  throw e;
}

function preview() {
  const tail = log.readTailAnchor(log.headAnchorPath());
  const gen = log.readGenesisAnchor(log.genesisAnchorPath());
  const all = log.readAll() || [];
  const bp = all.slice().reverse().find(r => r && r.kind === 'witness_degraded');
  const rec = all.slice().reverse().find(r => r && r.kind === 'witness_recovery');
  const generation = gen.anchor && typeof gen.anchor.generation === 'number' ? gen.anchor.generation : 0;
  console.log(JSON.stringify({
    tail_anchor: tail.status,
    genesis_anchor: gen.status,
    generation: generation,
    last_good_seal: log.lastGoodSeal(),
    recovery_soft_deadline_ms: WITNESS_RECOVERY.soft_ms,
    recovery_hard_deadline_ms: WITNESS_RECOVERY.hard_ms,
    detection_latency_bound: WITNESS_RECOVERY.detection_latency_bound,
    active_breakpoint: bp && !(rec && all.indexOf(rec) > all.indexOf(bp)) ? bp.detected_at : null,
    persistence: log.persistenceCapability(),
  }, null, 2));
}

if (args.indexOf('--approve') < 0) {
  console.log('=== witness state ===');
  preview();
  console.log('Phase 2: --reviewer <id> --reason <text> --approve (human review gate, ADR-0017)');
  return;
}

// Phase 2. The gate itself re-validates reviewer/reason/approval.
try {
  const result = log.rebuildGenesisAnchor({
    reviewer: opt('reviewer'),
    reason: opt('reason'),
    approval: true,
  });
  const reanchor = log.sealForwardIfNeeded();
  console.log(JSON.stringify({
    status: result.status,
    generation: result.generation,
    last_good_seal: result.last_good_seal,
    prev_generation: result.prev_generation,
    verify_full_valid: result.verify.valid,
    reanchor: reanchor.status,
  }));
} catch (e) {
  console.error('rebuild refused: [' + (e.code || 'ERROR') + '] ' + e.message);
  process.exit(1);
}
