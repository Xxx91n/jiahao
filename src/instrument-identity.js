'use strict';

// src/instrument-identity.js -- ADR-0046 P0
//
// Instrument identity is the immutable triple:
//   { rulesVersion + promptHash, model checkpoint digest, inferenceConfigHash }
// The pin lives in src/instrument-identity.json. Gate time resolves each
// alias/source to a content digest and compares it with the pin; there is no
// per-run self-reported fingerprint check.
//
// Quarantine state is append-only and hash-chained. The state file is a fact
// source in src, not an unversioned runtime file, so a pin/state change must
// pass through the same git review as any other source change.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { canonicalJSON } = require('./evidence-log');

const FACT_REL = path.join('src', 'instrument-identity.json');
const STATE_REL = path.join('src', 'instrument-state.json');
const GENESIS = 'GENESIS';

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function readJsonFile(file, label, readFile) {
  const r = readFile || fs.readFileSync;
  let text;
  try {
    text = r(file, 'utf8');
  } catch (e) {
    throw new Error(label + ' unreadable: ' + e.message);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(label + ' invalid JSON: ' + e.message);
  }
}

function loadPin(root, opts) {
  const o = opts || {};
  return readJsonFile(path.join(root, FACT_REL), 'instrument identity', o.readFile);
}

function loadState(root, opts) {
  const o = opts || {};
  return readJsonFile(path.join(root, STATE_REL), 'instrument state', o.readFile);
}

function resolveInstrumentIdentity(root, opts) {
  const o = opts || {};
  const read = o.readFile || fs.readFileSync;
  const pin = loadPin(root, o);
  const rulesPath = path.join(root, pin.rules_alias);
  const rulesText = read(rulesPath, 'utf8');
  const promptHash = sha256Text(rulesText);
  const resolved = {
    rules_version: pin.rules_version,
    prompt_hash: promptHash,
    rules_digest: sha256Text(pin.rules_version + '\n' + promptHash),
    model_checkpoint_digest: sha256Text(canonicalJSON(pin.model_checkpoint)),
    inference_config_hash: sha256Text(canonicalJSON(pin.inference_config)),
  };
  resolved.triple_hash = tripleHash(resolved);
  return resolved;
}

function tripleHash(identity) {
  return sha256Text(canonicalJSON({
    rules_digest: identity.rules_digest,
    model_checkpoint_digest: identity.model_checkpoint_digest,
    inference_config_hash: identity.inference_config_hash,
  }));
}

function verifyPin(resolved, pin) {
  const mismatches = [];
  if (resolved.rules_digest !== pin.rules_digest) mismatches.push('rules');
  if (resolved.model_checkpoint_digest !== pin.model_checkpoint_digest) mismatches.push('model-checkpoint');
  if (resolved.inference_config_hash !== pin.inference_config_digest) mismatches.push('inference-config');
  return { ok: mismatches.length === 0, mismatches };
}

function eventHash(sansHash) {
  const { event_hash, ...rest } = sansHash;
  return sha256Text(canonicalJSON(rest) + '|' + rest.prev_hash);
}

function stateEvent(seq, kind, identityDigest, prevHash, extra) {
  const ev = {
    seq,
    kind,
    identity_digest: identityDigest,
    reverify_ledger_hash: (extra && extra.reverify_ledger_hash) || null,
    bias_probe_hash: (extra && extra.bias_probe_hash) || null,
    reviewer_id: (extra && extra.reviewer_id) || null,
    timestamp: (extra && extra.timestamp) || new Date().toISOString(),
    prev_hash: prevHash,
  };
  ev.event_hash = eventHash(ev);
  return ev;
}

function verifyState(state) {
  if (!state || state.schema_version !== 1 || !Array.isArray(state.history) || state.history.length === 0) {
    return { valid: false, reason: 'invalid instrument state shape' };
  }
  let expected = GENESIS;
  for (let i = 0; i < state.history.length; i++) {
    const ev = state.history[i];
    if (ev.seq !== i + 1 || ev.prev_hash !== expected) {
      return { valid: false, reason: 'instrument state chain broken at seq ' + (i + 1) };
    }
    if (!ev.event_hash || ev.event_hash !== eventHash(ev)) {
      return { valid: false, reason: 'instrument state event_hash mismatch at seq ' + (i + 1) };
    }
    expected = ev.event_hash;
  }
  return { valid: true };
}

function transition(state, event, opts) {
  const chain = verifyState(state);
  if (!chain.valid) throw new Error(chain.reason);
  const now = (opts && opts.timestamp) || new Date().toISOString();
  const next = JSON.parse(JSON.stringify(state));
  const tail = next.history[next.history.length - 1];

  if (event.type === 'identity-change') {
    if (next.state !== 'authoritative') throw new Error('identity-change requires authoritative state');
    next.state = 'quarantined';
    next.quarantined_identity_digest = event.identity_digest;
    next.history.push(stateEvent(tail.seq + 1, 'quarantine', event.identity_digest, tail.event_hash, { timestamp: now }));
    return next;
  }

  if (event.type === 'signoff') {
    if (next.state !== 'quarantined') throw new Error('signoff requires quarantined state');
    if (next.quarantined_identity_digest !== event.identity_digest) {
      throw new Error('signoff fingerprint does not match quarantined identity');
    }
    if (!event.reviewer_id || !event.reverify_ledger_hash || !event.bias_probe_hash) {
      throw new Error('signoff requires reviewer_id, reverify_ledger_hash, and bias_probe_hash');
    }
    next.state = 'authoritative';
    next.authoritative_identity_digest = event.identity_digest;
    next.quarantined_identity_digest = null;
    next.history.push(stateEvent(tail.seq + 1, 'signoff', event.identity_digest, tail.event_hash, {
      reviewer_id: event.reviewer_id,
      reverify_ledger_hash: event.reverify_ledger_hash,
      bias_probe_hash: event.bias_probe_hash,
      timestamp: now,
    }));
    return next;
  }

  if (event.type === 'rollback') {
    if (next.state !== 'quarantined') throw new Error('rollback requires quarantined state');
    next.state = 'authoritative';
    next.quarantined_identity_digest = null;
    next.history.push(stateEvent(tail.seq + 1, 'rollback', next.authoritative_identity_digest, tail.event_hash, { timestamp: now }));
    return next;
  }

  throw new Error('unknown instrument state event: ' + event.type);
}

function effectiveState(state, reverifyState) {
  if (reverifyState && reverifyState.state === 'degraded') return 'advisory-only';
  return state.state;
}

module.exports = {
  FACT_REL,
  STATE_REL,
  GENESIS,
  sha256Text,
  loadPin,
  loadState,
  resolveInstrumentIdentity,
  tripleHash,
  verifyPin,
  verifyState,
  transition,
  effectiveState,
};
