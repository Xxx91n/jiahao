#!/usr/bin/env node
'use strict';

// scripts/instrument.js -- ADR-0046 P0 executable gate + quarantine CLI.
// Default (--check) resolves identity from source, compares it with the
// repository pin, verifies the append-only state chain, and fails closed on
// pin mismatch, quarantine, or an uncleared dead-man switch.
//
// Mutating modes are explicit:
//   node scripts/instrument.js --quarantine
//   node scripts/instrument.js --signoff --reviewer <id> \
//     --reverify-ledger-hash <hash> --bias-probe-hash <hash>
//   node scripts/instrument.js --rollback

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const {
  loadPin,
  loadState,
  resolveInstrumentIdentity,
  verifyPin,
  verifyState,
  transition,
  effectiveState,
} = require('../src/instrument-identity');
const reverifySchedule = require('../src/reverify-schedule');

const ROOT = path.join(__dirname, '..');

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = args[i + 1];
    if (val === undefined || val.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = val;
      i++;
    }
  }
  return out;
}

function readRuntime() {
  const pin = loadPin(ROOT);
  const resolved = resolveInstrumentIdentity(ROOT);
  const state = loadState(ROOT);
  return { pin, resolved, state, pinCheck: verifyPin(resolved, pin), stateCheck: verifyState(state) };
}

function writeState(state) {
  fs.writeFileSync(path.join(ROOT, 'src', 'instrument-state.json'), JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function check() {
  const rt = readRuntime();
  console.log('[instrument] rules ' + rt.resolved.rules_digest.slice(0, 16));
  console.log('[instrument] model ' + rt.resolved.model_checkpoint_digest.slice(0, 16));
  console.log('[instrument] inference ' + rt.resolved.inference_config_hash.slice(0, 16));
  console.log('[instrument] state ' + rt.state.state);

  if (!rt.stateCheck.valid) {
    console.error('[instrument] FAIL: ' + rt.stateCheck.reason);
    process.exit(1);
  }

  if (!rt.pinCheck.ok) {
    console.error('[instrument] FAIL: resolve-then-pin mismatch on ' + rt.pinCheck.mismatches.join(', '));
    console.error('[instrument] required: node scripts/instrument.js --quarantine; npm run reverify; npm run judge:bias');
    process.exit(1);
  }

  const rev = reverifySchedule.load(ROOT);
  const effective = effectiveState(rt.state, rev);
  if (effective === 'quarantined') {
    console.error('[instrument] FAIL: judge is quarantined; human sign-off required');
    console.error('[instrument] required: node scripts/instrument.js --signoff --reviewer <id> --reverify-ledger-hash <hash> --bias-probe-hash <hash>');
    process.exit(1);
  }
  if (effective === 'advisory-only') {
    console.error('[instrument] FAIL: dead-man switch is uncleared; verdict gate is advisory-only');
    process.exit(1);
  }

  console.log('[instrument] OK: identity pinned and authoritative');
}

function quarantine() {
  const rt = readRuntime();
  if (!rt.pinCheck.ok) {
    console.error('[instrument] FAIL: resolve-then-pin mismatch on ' + rt.pinCheck.mismatches.join(', '));
    process.exit(1);
  }
  const next = transition(rt.state, { type: 'identity-change', identity_digest: rt.resolved.triple_hash });
  writeState(next);
  console.log('[instrument] quarantined identity ' + rt.resolved.triple_hash.slice(0, 16));
  console.log('[instrument] required: npm run reverify; npm run judge:bias; then human sign-off');
}

function signoff(args) {
  const rt = readRuntime();
  if (args.reviewer && args['reverify-ledger-hash'] && args['bias-probe-hash']) {
    const next = transition(rt.state, {
      type: 'signoff',
      identity_digest: rt.resolved.triple_hash,
      reviewer_id: args.reviewer,
      reverify_ledger_hash: args['reverify-ledger-hash'],
      bias_probe_hash: args['bias-probe-hash'],
    });
    writeState(next);
    console.log('[instrument] sign-off recorded for identity ' + rt.resolved.triple_hash.slice(0, 16));
    return;
  }
  console.error('[instrument] FAIL: --signoff requires --reviewer, --reverify-ledger-hash, and --bias-probe-hash');
  process.exit(1);
}

function rollback() {
  const rt = readRuntime();
  const next = transition(rt.state, { type: 'rollback' });
  writeState(next);
  console.log('[instrument] rolled back to authoritative identity ' + next.authoritative_identity_digest.slice(0, 16));
}

function main() {
  requireCapabilities('instrument-identity');
  const args = parseArgs(process.argv.slice(2));
  if (args.quarantine) return quarantine();
  if (args.signoff) return signoff(args);
  if (args.rollback) return rollback();
  check();
}

if (require.main === module) main();

module.exports = { parseArgs, readRuntime, check, quarantine, signoff, rollback, main };
