#!/usr/bin/env node
'use strict';

// scripts/instrument.js -- ADR-0046 P0 executable gate + quarantine CLI.
// Default (--check) resolves identity from source, compares it with the
// repository pin, verifies the append-only state chain, and fails closed on
// pin mismatch, quarantine, or an uncleared dead-man switch.
//
// Mutating modes are explicit:
//   node scripts/instrument.js --quarantine
//   node scripts/instrument.js --signoff --reviewer <id> --attestation certify \
//     --reverify-ledger-hash <hash> --bias-probe-hash <hash>
//   node scripts/instrument.js --conditional-signoff --reviewer <id> --attestation certify \
//     --reverify-ledger-hash <hash> --bias-probe-hash <hash> --expires-at YYYY-MM-DD --capa-ref <ref>
//   node scripts/instrument.js --rollback

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const { PREFIXES } = require('../src/shared/prefix-vocab');
const { verifyLedger } = require('./reverify');
const { CHANGE_SURFACE_REL, ATTESTATIONS, loadChangeSurface, classify, attestationAllowed, vocabularyAnchorErrors } = require('../src/change-surface');
const {
  loadPin,
  loadState,
  resolveInstrumentIdentity,
  verifyPin,
  verifyState,
  transition,
  effectiveState,
  isHex64,
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

function parseJsonArg(name, value) {
  try { return JSON.parse(value); }
  catch (e) { throw new Error(name + ' must be valid JSON: ' + e.message); }
}

// ADR-0048 D-E: parse the shared human-signoff payload once at the CLI boundary.
// Surface-specific requirements stay on each command; this owns only the common fields.
function parseSignoffArgs(args) {
  if (!args.reviewer || !ATTESTATIONS.includes(args.attestation)) {
    console.error(PREFIXES.usage + ' FAIL: missing --reviewer or invalid --attestation');
    process.exit(1);
  }
  return {
    reviewer: args.reviewer,
    attestation: args.attestation,
    second_reviewer: args['second-reviewer'] || null,
  };
}

function readRuntime() {
  const pin = loadPin(ROOT);
  const resolved = resolveInstrumentIdentity(ROOT);
  const state = loadState(ROOT);
  const changeSurface = loadChangeSurface(ROOT);
  return { pin, resolved, state, changeSurface, pinCheck: verifyPin(resolved, pin), stateCheck: verifyState(state) };
}

function writeState(state) {
  fs.writeFileSync(path.join(ROOT, 'src', 'instrument-state.json'), JSON.stringify(state, null, 2) + '\n', 'utf8');
}

// ADR-0060 D-E: one verified read of the append-only reverify ledger, shared by
// the hash accessor and the conformity accessor (no double read, no drift).
function loadVerifiedLedger() {
  const ledgerPath = path.join(ROOT, 'bench', 'polygraph', 'reverify-ledger.json');
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch (e) {
    return null;
  }
  return verifyLedger(ledger) ? null : ledger;
}

function currentReverifyLedgerHash() {
  const ledger = loadVerifiedLedger();
  if (!ledger) return null;
  const tail = ledger[ledger.length - 1];
  return tail && tail.event_hash || null;
}

// ADR-0060 D-E: the sign-off guard reads the ledger tail's conformity.
function currentReverifyLedgerTail() {
  const ledger = loadVerifiedLedger();
  return ledger ? (ledger[ledger.length - 1] || null) : null;
}

function checkChangeSurfaceCoupling(baseRef, cfg) {
  if (!baseRef) return [];
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only', '-z', baseRef + '...HEAD'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    return ['change surface coupling check: git diff failed'];
  }
  const changed = diff.split('\0').map(s => s.trim()).filter(Boolean);
  const cfgChanged = changed.indexOf(CHANGE_SURFACE_REL.split(path.sep).join('/')) !== -1;
  const sourceRel = String(cfg && cfg.source_adr || '').split(path.sep).join('/');
  const adrChanged = changed.indexOf(sourceRel) !== -1;
  if (cfgChanged && !adrChanged) {
    return ['coupling: docs/change-surface.json changed without its source_adr change (' + sourceRel + ')'];
  }
  return [];
}

function checkChangeSurfaceAnchor(cfg) {
  const sourceRel = String(cfg && cfg.source_adr || '');
  if (!sourceRel) return ['change surface source_adr is required'];
  const sourcePath = path.join(ROOT, sourceRel.split('/').join(path.sep));
  let adrText;
  try { adrText = fs.readFileSync(sourcePath, 'utf8'); }
  catch (e) { return ['change surface source ADR unreadable: ' + e.message]; }
  return vocabularyAnchorErrors(adrText, cfg.anchor && cfg.anchor.tokens);
}

function check() {
  const rt = readRuntime();
  const couplingErrors = checkChangeSurfaceCoupling(process.env.CI_BASE_REF || null, rt.changeSurface);
  if (couplingErrors.length) {
    for (const e of couplingErrors) console.error(PREFIXES.config + ' FAIL: ' + e);
    process.exit(1);
  }
  console.log('[instrument] rules ' + rt.resolved.rules_digest.slice(0, 16));
  console.log('[instrument] model ' + rt.resolved.model_checkpoint_digest);
  console.log('[instrument] inference ' + rt.resolved.inference_config_hash.slice(0, 16));
  console.log('[instrument] state ' + rt.state.state);

  if (!rt.stateCheck.valid) {
    console.error(PREFIXES.config + ' FAIL: ' + rt.stateCheck.reason);
    process.exit(1);
  }

  if (!rt.pinCheck.ok) {
    console.error('resolve-then-pin mismatch on ' + rt.pinCheck.mismatches.join(', '));
    console.error('required: node scripts/instrument.js --quarantine; npm run reverify; npm run judge:bias');
    process.exit(1);
  }

  const rev = reverifySchedule.load(ROOT);
  const effective = effectiveState(rt.state, rev);
  if (effective === 'quarantined') {
    console.error('judge is quarantined; human sign-off required');
    console.error('required: node scripts/instrument.js --signoff --reviewer <id> --attestation certify --reverify-ledger-hash <hash> --bias-probe-hash <hash>');
    process.exit(1);
  }
  if (effective === 'advisory-only') {
    console.error('dead-man switch is uncleared; verdict gate is advisory-only');
    process.exit(1);
  }
  // ADR-0060 D-C: conditional is a legitimate certified state (exit 0), but it
  // is loudly disclosed and its expiry is enforced by effectiveState.
  if (rt.state.certification_mode === 'conditional') {
    const exp = rt.state.conditional_expires_at || '?';
    const capa = rt.state.conditional_capa_ref || '?';
    console.log('[instrument] conditional certification: expires ' + exp + ', CAPA ' + capa);
    console.log('::warning title=judge-conditional::conditional certification active (expires ' + exp + ', CAPA ' + capa + ')');
  }

  const anchorErrors = checkChangeSurfaceAnchor(rt.changeSurface);
  if (anchorErrors.length) {
    for (const e of anchorErrors) console.error(PREFIXES.config + ' FAIL: ' + e);
    process.exit(1);
  }

  // ADR-0060 D-C: the closing line names the actual certified state.
  console.log('[instrument] OK: identity pinned and authoritative (certification: ' + (rt.state.certification_mode || 'full') + ')');
}

function quarantine() {
  const rt = readRuntime();
  try {
    const next = transition(rt.state, { type: 'identity-change', identity_digest: rt.resolved.triple_hash });
    writeState(next);
    console.log('[instrument] quarantined identity ' + rt.resolved.triple_hash.slice(0, 16));
    console.log('[instrument] required: npm run reverify; npm run judge:bias; then human sign-off');
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function signoff(args) {
  const signoffArgs = parseSignoffArgs(args);
  if (!isHex64(args['reverify-ledger-hash']) || !isHex64(args['bias-probe-hash'])) {
    console.error(PREFIXES.usage + ' FAIL: --signoff requires --reverify-ledger-hash and --bias-probe-hash');
    process.exit(1);
  }
  const signoffSurface = loadChangeSurface(ROOT);
  if (!attestationAllowed('identity', signoffSurface, signoffArgs.attestation)) {
    console.error(PREFIXES.usage + ' FAIL: identity signoff requires --attestation certify');
    process.exit(1);
  }
  // ponytail: bias-probe has no committed machine artifact in P0; compare when judge:bias emits a digest.
  const ledgerHash = currentReverifyLedgerHash();
  if (!ledgerHash || ledgerHash !== args['reverify-ledger-hash']) {
    console.error(PREFIXES.config + ' FAIL: reverify ledger hash does not match the current verified ledger tail');
    process.exit(1);
  }
  // ADR-0060 D-E: certify means the revalidation actually passed. An
  // indeterminate/conditional tail must use --conditional-signoff; a hard fail
  // must be dispositioned first.
  const tailEntry = currentReverifyLedgerTail();
  if (!tailEntry || tailEntry.conformity !== 'pass') {
    console.error(PREFIXES.config + ' FAIL: --signoff requires a pass conformity in the reverify ledger tail (use --conditional-signoff for indeterminate|conditional)');
    process.exit(1);
  }
  const rt = readRuntime();
  try {
    const next = transition(rt.state, {
      type: 'signoff',
      identity_digest: rt.resolved.triple_hash,
      reviewer_id: signoffArgs.reviewer,
      second_reviewer: signoffArgs.second_reviewer,
      attestation_type: signoffArgs.attestation,
      reverify_ledger_hash: args['reverify-ledger-hash'],
      bias_probe_hash: args['bias-probe-hash'],
    });
    writeState(next);
    console.log('[instrument] sign-off recorded for identity ' + rt.resolved.triple_hash.slice(0, 16));
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function conditionalSignoff(args) {
  const signoffArgs = parseSignoffArgs(args);
  if (!isHex64(args['reverify-ledger-hash']) || !isHex64(args['bias-probe-hash'])) {
    console.error(PREFIXES.usage + ' FAIL: --conditional-signoff requires --reverify-ledger-hash and --bias-probe-hash');
    process.exit(1);
  }
  // ADR-0060 D-D: the conditional window is 90 days by default and is never
  // open-ended. An explicit --expires-at must not exceed the default bound.
  const DEFAULT_WINDOW_DAYS = 90;
  const maxExpiry = new Date(Date.now() + DEFAULT_WINDOW_DAYS * 24 * 3600 * 1000).toISOString().slice(0, 10);
  let expiresAt = args['expires-at'];
  if (expiresAt === undefined) {
    expiresAt = maxExpiry;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiresAt))) {
    console.error(PREFIXES.usage + ' FAIL: --expires-at must be YYYY-MM-DD (ADR-0060 D-C)');
    process.exit(1);
  } else if (String(expiresAt) > maxExpiry) {
    console.error(PREFIXES.usage + ' FAIL: --expires-at ' + expiresAt + ' exceeds the ' + DEFAULT_WINDOW_DAYS + '-day conditional window (ADR-0060 D-D: no open-ended concession)');
    process.exit(1);
  }
  if (!args['capa-ref']) {
    console.error(PREFIXES.usage + ' FAIL: --conditional-signoff requires --capa-ref (ADR-0060 D-D)');
    process.exit(1);
  }
  const signoffSurface = loadChangeSurface(ROOT);
  if (!attestationAllowed('identity', signoffSurface, signoffArgs.attestation)) {
    console.error(PREFIXES.usage + ' FAIL: conditional signoff requires --attestation certify');
    process.exit(1);
  }
  const ledgerHash = currentReverifyLedgerHash();
  if (!ledgerHash || ledgerHash !== args['reverify-ledger-hash']) {
    console.error(PREFIXES.config + ' FAIL: reverify ledger hash does not match the current verified ledger tail');
    process.exit(1);
  }
  const tailEntry = currentReverifyLedgerTail();
  if (!tailEntry || (tailEntry.conformity !== 'indeterminate' && tailEntry.conformity !== 'conditional')) {
    console.error(PREFIXES.config + ' FAIL: --conditional-signoff requires an indeterminate|conditional conformity in the ledger tail (a pass uses --signoff; a hard fail must be dispositioned first)');
    process.exit(1);
  }
  const rt = readRuntime();
  try {
    const next = transition(rt.state, {
      type: 'conditional_signoff',
      identity_digest: rt.resolved.triple_hash,
      reviewer_id: signoffArgs.reviewer,
      second_reviewer: signoffArgs.second_reviewer,
      attestation_type: signoffArgs.attestation,
      reverify_ledger_hash: args['reverify-ledger-hash'],
      bias_probe_hash: args['bias-probe-hash'],
      expires_at: expiresAt,
      capa_ref: args['capa-ref'],
    });
    writeState(next);
    console.log('[instrument] conditional sign-off recorded for identity ' + rt.resolved.triple_hash.slice(0, 16) +

      ' (expires ' + expiresAt + ', CAPA ' + args['capa-ref'] + ')');
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function classifySurface(args) {
  if (!args.surface) {
    console.error(PREFIXES.usage + ' FAIL: --classify requires --surface identity|corpus|threshold|schedule_gate');
    process.exit(1);
  }
  const cfg = loadChangeSurface(ROOT);
  const mapped = classify(args.surface, cfg);
  console.log('[instrument] ' + mapped.surface + ' -> ' + mapped.response);
  console.log('[instrument] revalidation: ' + mapped.revalidation);
  console.log('[instrument] attestations: ' + mapped.attestations.join(', '));
}

function rebaseline(args) {
  const signoffArgs = parseSignoffArgs(args);
  if (!args['corpus-ref'] || !args['previous-corpus-ref'] || !['pass', 'fail'].includes(args.outcome)) {
    console.error(PREFIXES.usage + ' FAIL: --rebaseline requires --corpus-ref, --previous-corpus-ref, --outcome pass|fail, and --rollback-available true|false on fail');
    process.exit(1);
  }
  const rebaselineSurface = loadChangeSurface(ROOT);
  if (!attestationAllowed('corpus', rebaselineSurface, signoffArgs.attestation)) {
    console.error(PREFIXES.usage + ' FAIL: corpus rebaseline requires --attestation certify|approve');
    process.exit(1);
  }
  const rt = readRuntime();
  try {
    const next = transition(rt.state, {
      type: 'corpus_rebaseline',
      identity_digest: rt.resolved.triple_hash,
      corpus_ref: args['corpus-ref'],
      previous_corpus_ref: args['previous-corpus-ref'],
      outcome: args.outcome,
      rollback_available: args['rollback-available'] === 'true',
      reviewer_id: signoffArgs.reviewer,
      second_reviewer: signoffArgs.second_reviewer,
      attestation_type: signoffArgs.attestation,
    });
    writeState(next);
    console.log('[instrument] corpus rebaseline recorded; state ' + next.state);
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function criteriaChange(args) {
  const signoffArgs = parseSignoffArgs(args);
  if (!args['criteria-version'] || !args['previous-criteria-version']) {
    console.error(PREFIXES.usage + ' FAIL: --criteria-change requires --criteria-version and --previous-criteria-version');
    process.exit(1);
  }
  const criteriaSurface = loadChangeSurface(ROOT);
  if (!attestationAllowed('threshold', criteriaSurface, signoffArgs.attestation)) {
    console.error(PREFIXES.usage + ' FAIL: threshold criteria change requires --attestation approve');
    process.exit(1);
  }
  const rt = readRuntime();
  try {
    const next = transition(rt.state, {
      type: 'criteria_change',
      identity_digest: rt.resolved.triple_hash,
      criteria_version: args['criteria-version'],
      previous_criteria_version: args['previous-criteria-version'],
      restatement_of: args['restatement-of'] || null,
      reviewer_id: signoffArgs.reviewer,
      second_reviewer: signoffArgs.second_reviewer,
      attestation_type: signoffArgs.attestation,
    });
    writeState(next);
    console.log('[instrument] criteria change recorded');
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function record(args) {
  if (!args.maker || !args.before || !args.after) {
    console.error(PREFIXES.usage + ' FAIL: --record requires --maker, --before JSON, and --after JSON');
    process.exit(1);
  }
  const rt = readRuntime();
  let before, after;
  try {
    before = parseJsonArg('--before', args.before);
    after = parseJsonArg('--after', args.after);
  } catch (e) {
    console.error(PREFIXES.usage + ' FAIL: ' + e.message);
    process.exit(1);
  }
  try {
    const escalate = args.escalate === true || args.escalate === 'true';
    let next = transition(rt.state, {
      type: 'record_only_change',
      identity_digest: rt.resolved.triple_hash,
      surface: 'schedule_gate',
      before,
      after,
      identity_triple: {
        rules_digest: rt.resolved.rules_digest,
        model_checkpoint_digest: rt.resolved.model_checkpoint_digest,
        inference_config_hash: rt.resolved.inference_config_hash,
        triple_hash: rt.resolved.triple_hash,
      },
      maker_id: args.maker,
      escalation: escalate ? 'quarantine-lane' : 'none',
    });
    if (escalate) {
      next = transition(next, { type: 'identity-change', identity_digest: rt.resolved.triple_hash });
    }
    writeState(next);
    const recordEvent = next.history.find(e => e.kind === 'record_only_change');
    console.log('[instrument] record_only_change seq=' + (recordEvent ? recordEvent.seq : '?') + ' status=pending_signoff');
    if (next.state === 'quarantined') console.log('[instrument] escalation promoted to quarantine-lane');
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function recordSignoff(args) {
  const seq = Number(args['record-seq']);
  const signoffArgs = parseSignoffArgs(args);
  if (!Number.isInteger(seq) || !args.reason) {
    console.error(PREFIXES.usage + ' FAIL: --record-signoff requires --record-seq <integer> and --reason');
    process.exit(1);
  }
  const rt = readRuntime();
  if (!attestationAllowed('schedule_gate', rt.changeSurface, signoffArgs.attestation)) {
    console.error(PREFIXES.usage + ' FAIL: schedule_gate record signoff requires --attestation approve');
    process.exit(1);
  }
  try {
    const next = transition(rt.state, {
      type: 'record_signoff',
      identity_digest: rt.resolved.triple_hash,
      record_seq: seq,
      reviewer_id: signoffArgs.reviewer,
      second_reviewer: signoffArgs.second_reviewer,
      attestation_type: signoffArgs.attestation,
      reason: args.reason,
    });
    writeState(next);
    console.log('[instrument] record seq=' + seq + ' certified');
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function rollback() {
  const rt = readRuntime();
  try {
    const next = transition(rt.state, { type: 'rollback' });
    writeState(next);
    console.log('[instrument] rolled back to authoritative identity ' + next.authoritative_identity_digest.slice(0, 16));
  } catch (e) {
    console.error(PREFIXES.internal + ' FAIL: ' + e.message);
    process.exit(1);
  }
}

function main() {
  requireCapabilities('instrument-identity');
  const args = parseArgs(process.argv.slice(2));
  if (args.classify) return classifySurface(args);
  if (args.quarantine) return quarantine();
  if (args['conditional-signoff']) return conditionalSignoff(args);
  if (args.signoff) return signoff(args);
  if (args.record) return record(args);
  if (args['record-signoff']) return recordSignoff(args);
  if (args.rebaseline) return rebaseline(args);
  if (args['criteria-change']) return criteriaChange(args);
  if (args.rollback) return rollback();
  check();
}

if (require.main === module) main();

module.exports = { parseArgs, readRuntime, check, classifySurface, quarantine, signoff, conditionalSignoff, record, recordSignoff, rebaseline, criteriaChange, rollback, main };
