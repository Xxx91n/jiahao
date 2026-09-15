#!/usr/bin/env node
// scripts/resolve.js — human adjudication write-back (ADR-0017 D2/D3)
//
// Two-phase anti-anchoring flow:
//   phase 1 ALWAYS prints the evidence records and the critic's stated
//           reasons — but never the machine verdict fields (status /
//           confidence), so the reviewer is not anchored by a conclusion.
//   phase 2 runs only when --verdict/--reason/--reviewer are supplied:
//           appends one kind:'human_verdict' record to the same EvidenceLog
//           hash chain and records a calibration training point (ADR-0008).
//
// Usage:
//   jiahao resolve                                   # phase 1 preview only
//   jiahao resolve --verdict pass|fail --reason <text> --reviewer <id>
//                    [--corrected-output <text>]

const path = require('path');
const { createEvidenceLog, recordHash } = require('../src/evidence-log');
const { recordCalibrationPoint } = require('../src/calibration');
const { configDir } = require('../src/shared/paths');

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = args[i + 1];
    if (val === undefined || val.startsWith('--')) return { error: "option '--" + key + " <value>' argument missing" };
    out[key] = val;
    i++;
  }
  return out;
}

// Phase 1: print evidence + critic reasons, but NEVER machine verdict
// fields (status/confidence) — ADR-0017 D2 anti-anchoring.
function printEvidence(chain) {
  console.log('=== Evidence for adjudication (' + chain.length + ' records) ===');
  for (const rec of chain) {
    if (!rec || typeof rec !== 'object') continue;
    if (rec.kind === 'turn_init') {
      console.log('[turn_init] session=' + rec.session_id + ' turn=' + rec.turn_id);
      continue;
    }
    if (rec.kind === 'human_verdict') {
      console.log('[human_verdict] reviewer=' + rec.reviewer_id + ' note=' + rec.reason);
      continue;
    }
    console.log('[' + rec.gate_type + '] ' + rec.detail);
  }
}

function run(args) {
  // createEvidenceLog(dir) — dir is the config dir (same convention as
  // hooks and tests); evidence paths resolve inside it.
  const evLog = createEvidenceLog(configDir());
  const chain = evLog.readAll();
  if (!chain || chain.length === 0) {
    console.error('jiahao resolve: evidence chain is empty — nothing to adjudicate.');
    process.exit(1);
  }

  printEvidence(chain);

  const opts = parseArgs(args || []);
  if (opts.error) {
    console.error('error: ' + opts.error);
    process.exit(1);
  }

  // Phase 2 requires the full adjudication triple. Without it this run was
  // preview-only by design.
  if (opts.verdict === undefined && opts.reason === undefined && opts.reviewer === undefined) {
    console.log('');
    console.log('Phase 2: jiahao resolve --verdict pass|fail --reason <text> --reviewer <id>');
    return;
  }
  if (opts.verdict !== 'pass' && opts.verdict !== 'fail') {
    console.error("error: --verdict must be 'pass' or 'fail'");
    process.exit(2);
  }
  if (!opts.reason) {
    console.error('error: --reason is required (NIST AU-10 non-repudiation needs the why)');
    process.exit(2);
  }
  if (!opts.reviewer) {
    console.error('error: --reviewer is required (attribution; Ed25519 signing is the ADR-0013 D5 upgrade path)');
    process.exit(2);
  }

  const tail = chain[chain.length - 1];
  // ADR-0017 D4: an overturned machine verdict becomes a calibration
  // negative sample (jiahao-original convention, no industry precedent).
  const machineRec = chain.slice().reverse()
    .find(r => r && r.kind !== 'human_verdict' && (r.status === 'passed' || r.status === 'failed'));
  const humanPass = opts.verdict === 'pass';
  const overturn = machineRec ? ((machineRec.status === 'passed') !== humanPass) : null;

  const record = {
    kind: 'human_verdict',
    reviewer_id: opts.reviewer,
    verdict: opts.verdict,
    reason: opts.reason,
    corrected_output: opts['corrected-output'] || null,
    second_reviewer: null, // reserved for future inter-rater (IRR) review
    overturn: overturn,
    timestamp: new Date().toISOString(),
    prev_hash: (tail && tail.event_hash) || null,
  };
  record.event_hash = recordHash(record);

  evLog.append([record]);

  if (machineRec) {
    recordCalibrationPoint(
      typeof machineRec.confidence === 'number' ? machineRec.confidence : 0.5,
      humanPass
    );
  }

  console.log('');
  console.log('human_verdict recorded: ' + record.event_hash.slice(0, 12) +
    (overturn ? ' (OVERTURN of machine ' + machineRec.status + ')' : ''));
}

if (require.main === module) {
  try {
    run(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { run };
