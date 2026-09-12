'use strict';

// src/instrument-identity.js -- ADR-0046 P0
//
// Instrument identity is the immutable triple:
//   { rulesVersion + promptHash, model checkpoint digest, inferenceConfigHash }
// The pin lives in src/instrument-identity.json. Gate time resolves the
// rules_alias to a content digest and compares it with the pin. The model axis
// is three-layer and may be UNRESOLVED until an immutable snapshot/weights are
// supplied; the inference hash covers only authoritative decode fields.
//
// Quarantine state is append-only and hash-chained. The state file is a fact
// source in src, not an unversioned runtime file, so a pin/state change must
// pass through the same git review as any other source change.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { canonicalJSON, KNOWN_EVIDENCE_KINDS } = require('./evidence-log');
const { SURFACE_ATTESTATIONS } = require('./change-surface');

const FACT_REL = path.join('src', 'instrument-identity.json');
const STATE_REL = path.join('src', 'instrument-state.json');
const GENESIS = 'GENESIS';
const UNRESOLVED = 'UNRESOLVED';
const ATTESTATIONS = ['certify', 'approve'];

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function isHex64(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
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
    model_checkpoint_digest: resolveModelIdentity(pin.model_identity || pin.model_checkpoint),
    inference_config_hash: inferenceConfigHash(pin.inference_config),
  };
  resolved.triple_hash = tripleHash(resolved);
  return resolved;
}

function resolveModelIdentity(modelIdentity) {
  if (!modelIdentity || typeof modelIdentity !== 'object') return UNRESOLVED;
  const snapshot = modelIdentity.provider_snapshot;
  const commit = modelIdentity.revision_commit;
  const weights = modelIdentity.weights_sha256;
  if (!isHex64(weights) || (snapshot !== UNRESOLVED && typeof snapshot !== 'string') ||
      (commit !== UNRESOLVED && typeof commit !== 'string') ||
      (snapshot === UNRESOLVED && commit === UNRESOLVED)) {
    return UNRESOLVED;
  }
  return sha256Text([snapshot, commit, weights].join('\n'));
}

function inferenceConfigHash(config) {
  const decode = (config && config.decode_parameters) || {};
  return sha256Text(canonicalJSON({
    decode_parameters: decode,
    decode_policy: config && config.decode_policy,
    provider_contract: config && config.provider_contract,
  }));
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
  if (resolved.inference_config_hash !== pin.inference_config_hash) mismatches.push('inference-config');
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
    second_reviewer: (extra && extra.second_reviewer) || null,
    attestation_type: (extra && extra.attestation_type) || null,
    timestamp: (extra && extra.timestamp) || new Date().toISOString(),
    prev_hash: prevHash,
  };
  if (extra && extra.corpus_ref !== undefined) ev.corpus_ref = extra.corpus_ref;
  if (extra && extra.previous_corpus_ref !== undefined) ev.previous_corpus_ref = extra.previous_corpus_ref;
  if (extra && extra.outcome !== undefined) ev.outcome = extra.outcome;
  if (extra && extra.rollback_available !== undefined) ev.rollback_available = extra.rollback_available;
  if (extra && extra.criteria_version !== undefined) ev.criteria_version = extra.criteria_version;
  if (extra && extra.previous_criteria_version !== undefined) ev.previous_criteria_version = extra.previous_criteria_version;
  if (extra && extra.restatement_of !== undefined) ev.restatement_of = extra.restatement_of;
  if (extra && extra.ledger_seq !== undefined) ev.ledger_seq = extra.ledger_seq;
  if (extra && extra.exposure_seq !== undefined) ev.exposure_seq = extra.exposure_seq;
  if (extra && extra.evidence_kind !== undefined) ev.evidence_kind = extra.evidence_kind;
  if (extra && extra.disposition !== undefined) ev.disposition = extra.disposition;
  if (extra && extra.reason !== undefined) ev.reason = extra.reason;
  if (extra && extra.surface !== undefined) ev.surface = extra.surface;
  if (extra && extra.maker_id !== undefined) ev.maker_id = extra.maker_id;
  if (extra && extra.record_seq !== undefined) ev.record_seq = extra.record_seq;
  if (extra && extra.before !== undefined) ev.before = JSON.parse(JSON.stringify(extra.before));
  if (extra && extra.after !== undefined) ev.after = JSON.parse(JSON.stringify(extra.after));
  if (extra && extra.identity_triple !== undefined) ev.identity_triple = JSON.parse(JSON.stringify(extra.identity_triple));
  if (extra && extra.escalation !== undefined) ev.escalation = extra.escalation;
  if (extra && extra.reason !== undefined) ev.reason = extra.reason;
  if (extra && extra.event_timestamp !== undefined) ev.event_timestamp = extra.event_timestamp;
  if (extra && extra.logging_timestamp !== undefined) ev.logging_timestamp = extra.logging_timestamp;
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

// Record-only changes are documentary events on the same hash chain. The
// authoritative state machine never consumes them; this projection derives the
// record-layer lifecycle from record_only_change + record_signoff events.
function projectRecordStatus(history) {
  const signoffs = new Map();
  for (const ev of history || []) {
    if (ev && ev.kind === 'record_signoff' && Number.isInteger(ev.record_seq)) signoffs.set(ev.record_seq, ev);
  }
  const records = [];
  for (const ev of history || []) {
    if (!ev || ev.kind !== 'record_only_change') continue;
    const signoff = signoffs.get(ev.seq) || null;
    records.push({
      record_seq: ev.seq,
      status: signoff ? 'certified' : 'pending_signoff',
      surface: ev.surface || null,
      maker_id: ev.maker_id || null,
      before: ev.before,
      after: ev.after,
      escalation: ev.escalation || null,
      reviewer_id: signoff ? signoff.reviewer_id : null,
      second_reviewer: signoff ? signoff.second_reviewer : null,
      attestation_type: signoff ? signoff.attestation_type : null,
      reason: signoff ? signoff.reason : null,
      certified_at: signoff ? signoff.timestamp : null,
    });
  }
  return records;
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
    if (!SURFACE_ATTESTATIONS.identity.includes(event.attestation_type)) {
      throw new Error('signoff requires attestation_type certify');
    }
    if (!event.reviewer_id || !isHex64(event.reverify_ledger_hash) || !isHex64(event.bias_probe_hash)) {
      throw new Error('signoff requires reviewer_id, reverify_ledger_hash, bias_probe_hash, and attestation_type');
    }
    next.state = 'authoritative';
    next.certification_mode = 'full';
    next.conditional_expires_at = null;
    next.conditional_capa_ref = null;
    next.authoritative_identity_digest = event.identity_digest;
    next.quarantined_identity_digest = null;
    next.history.push(stateEvent(tail.seq + 1, 'signoff', event.identity_digest, tail.event_hash, {
      reviewer_id: event.reviewer_id,
      second_reviewer: event.second_reviewer || null,
      attestation_type: event.attestation_type,
      reverify_ledger_hash: event.reverify_ledger_hash,
      bias_probe_hash: event.bias_probe_hash,
      timestamp: now,
    }));
    return next;
  }

  if (event.type === 'conditional_signoff') {
    if (next.state !== 'quarantined') throw new Error('conditional_signoff requires quarantined state');
    if (next.quarantined_identity_digest !== event.identity_digest) {
      throw new Error('conditional_signoff fingerprint does not match quarantined identity');
    }
    if (!SURFACE_ATTESTATIONS.identity.includes(event.attestation_type)) {
      throw new Error('conditional_signoff requires attestation_type certify');
    }
    if (!event.reviewer_id || !isHex64(event.reverify_ledger_hash) || !isHex64(event.bias_probe_hash)) {
      throw new Error('conditional_signoff requires reviewer_id, reverify_ledger_hash, and bias_probe_hash');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(event.expires_at || ''))) {
      throw new Error('conditional_signoff requires expires_at (YYYY-MM-DD)');
    }
    if (!event.capa_ref) throw new Error('conditional_signoff requires capa_ref');
    // ADR-0060 D-C (two-axis): the release-gate axis keeps ADR-0046's
    // authoritative/quarantined contract; the assurance level rides a separate
    // `certification_mode` axis with a mandatory expiry.
    next.state = 'authoritative';
    next.certification_mode = 'conditional';
    next.authoritative_identity_digest = event.identity_digest;
    next.quarantined_identity_digest = null;
    next.conditional_expires_at = event.expires_at;
    next.conditional_capa_ref = event.capa_ref;
    next.history.push(stateEvent(tail.seq + 1, 'conditional_signoff', event.identity_digest, tail.event_hash, {
      reviewer_id: event.reviewer_id,
      second_reviewer: event.second_reviewer || null,
      attestation_type: event.attestation_type,
      reverify_ledger_hash: event.reverify_ledger_hash,
      bias_probe_hash: event.bias_probe_hash,
      expires_at: event.expires_at,
      capa_ref: event.capa_ref,
      timestamp: now,
    }));
    return next;
  }

  if (event.type === 'rollback') {
    if (next.state !== 'quarantined') throw new Error('rollback requires quarantined state');
    next.state = 'authoritative';
    next.certification_mode = 'full';
    next.conditional_expires_at = null;
    next.conditional_capa_ref = null;
    next.quarantined_identity_digest = null;
    next.history.push(stateEvent(tail.seq + 1, 'rollback', next.authoritative_identity_digest, tail.event_hash, { timestamp: now }));
    return next;
  }

  if (event.type === 'corpus_rebaseline') {
    if (next.state !== 'authoritative') throw new Error('corpus_rebaseline requires authoritative state');
    if (next.authoritative_identity_digest !== event.identity_digest) {
      throw new Error('corpus_rebaseline identity does not match authoritative identity');
    }
    if (!SURFACE_ATTESTATIONS.corpus.includes(event.attestation_type) || !event.reviewer_id) {
      throw new Error('corpus_rebaseline requires attestation_type and reviewer_id');
    }
    if (!event.corpus_ref || !event.previous_corpus_ref || !['pass', 'fail'].includes(event.outcome)) {
      throw new Error('corpus_rebaseline requires corpus_ref, previous_corpus_ref, and outcome pass|fail');
    }
    next.history.push(stateEvent(tail.seq + 1, 'corpus_rebaseline', event.identity_digest, tail.event_hash, {
      corpus_ref: event.corpus_ref,
      previous_corpus_ref: event.previous_corpus_ref,
      outcome: event.outcome,
      rollback_available: event.rollback_available === true,
      reviewer_id: event.reviewer_id,
      second_reviewer: event.second_reviewer || null,
      attestation_type: event.attestation_type,
      timestamp: now,
    }));
    if (event.outcome === 'fail' && event.rollback_available !== true) {
      const tailAfterRebaseline = next.history[next.history.length - 1];
      next.state = 'quarantined';
      next.quarantined_identity_digest = event.identity_digest;
      next.history.push(stateEvent(tailAfterRebaseline.seq + 1, 'quarantine', event.identity_digest, tailAfterRebaseline.event_hash, {
        timestamp: now,
      }));
    }
    return next;
  }

  if (event.type === 'criteria_change') {
    if (next.state !== 'authoritative') throw new Error('criteria_change requires authoritative state');
    if (next.authoritative_identity_digest !== event.identity_digest) {
      throw new Error('criteria_change identity does not match authoritative identity');
    }
    if (!SURFACE_ATTESTATIONS.threshold.includes(event.attestation_type) || !event.reviewer_id) {
      throw new Error('criteria_change requires attestation_type and reviewer_id');
    }
    if (!event.criteria_version || !event.previous_criteria_version) {
      throw new Error('criteria_change requires criteria_version and previous_criteria_version');
    }
    // ADR-0049 D-D: no genuine pointwise replay exists yet (defer-0023). A
    // criteria change is a restatement mapping, never an as-left re-projection.
    if (event.pointwise_replay) {
      throw new Error('pointwise replay is deferred (defer-0023): criteria change must use restatement mapping (ADR-0049 D-D)');
    }
    if (!event.restatement_of) {
      throw new Error('criteria_change requires restatement_of while pointwise replay is deferred (ADR-0049 D-D, defer-0023)');
    }
    next.history.push(stateEvent(tail.seq + 1, 'criteria_change', event.identity_digest, tail.event_hash, {
      criteria_version: event.criteria_version,
      previous_criteria_version: event.previous_criteria_version,
      restatement_of: event.restatement_of || null,
      reviewer_id: event.reviewer_id,
      second_reviewer: event.second_reviewer || null,
      attestation_type: event.attestation_type,
      timestamp: now,
    }));
    return next;
  }

  if (event.type === 'record_only_change') {
    if (next.state !== 'authoritative') throw new Error('record_only_change requires authoritative state');
    if (next.authoritative_identity_digest !== event.identity_digest) {
      throw new Error('record_only_change identity does not match authoritative identity');
    }
    if (event.surface !== 'schedule_gate') throw new Error('record_only_change requires surface schedule_gate');
    if (!event.maker_id) throw new Error('record_only_change requires maker_id');
    if (event.before === undefined || event.after === undefined) {
      throw new Error('record_only_change requires before and after values');
    }
    next.history.push(stateEvent(tail.seq + 1, 'record_only_change', event.identity_digest, tail.event_hash, {
      surface: event.surface,
      before: event.before,
      after: event.after,
      identity_triple: event.identity_triple || null,
      maker_id: event.maker_id,
      escalation: event.escalation || 'none',
      timestamp: now,
      event_timestamp: now,
      logging_timestamp: now,
    }));
    return next;
  }

  if (event.type === 'record_signoff') {
    if (next.state !== 'authoritative') throw new Error('record_signoff requires authoritative state');
    if (next.authoritative_identity_digest !== event.identity_digest) {
      throw new Error('record_signoff identity does not match authoritative identity');
    }
    if (!Number.isInteger(event.record_seq)) throw new Error('record_signoff requires record_seq');
    const target = next.history.find(e => e.seq === event.record_seq && e.kind === 'record_only_change');
    if (!target) throw new Error('record_signoff references an unknown record');
    const projection = projectRecordStatus(next.history);
    const current = projection.find(r => r.record_seq === event.record_seq);
    if (!current || current.status !== 'pending_signoff') throw new Error('record_signoff requires a pending_signoff record');
    if (!SURFACE_ATTESTATIONS.schedule_gate.includes(event.attestation_type) || !event.reviewer_id || !event.reason) {
      throw new Error('record_signoff requires schedule_gate attestation, reviewer_id, and reason');
    }
    next.history.push(stateEvent(tail.seq + 1, 'record_signoff', event.identity_digest, tail.event_hash, {
      record_seq: event.record_seq,
      reviewer_id: event.reviewer_id,
      second_reviewer: event.second_reviewer || null,
      attestation_type: event.attestation_type,
      reason: event.reason,
      timestamp: now,
      event_timestamp: now,
      logging_timestamp: now,
    }));
    return next;
  }

  // ADR-0049 D-E: drift exposure from the reverify decision rule. Requires
  // the authoritative identity; carries the offending ledger seq so reviewers
  // can trace the evidence. Marks prior-interval sign-offs via the projection.
  if (event.type === 'drift_exposure') {
    if (next.state !== 'authoritative') throw new Error('drift_exposure requires authoritative state');
    if (next.authoritative_identity_digest !== event.identity_digest) {
      throw new Error('drift_exposure identity does not match authoritative identity');
    }
    if (!Number.isInteger(event.ledger_seq)) throw new Error('drift_exposure requires integer ledger_seq');
    next.history.push(stateEvent(tail.seq + 1, 'drift_exposure', event.identity_digest, tail.event_hash, {
      ledger_seq: event.ledger_seq,
      timestamp: now,
    }));
    return next;
  }

  // ADR-0049 D-E: disposition of an open drift exposure. Routes through
  // ESCALATE-shaped evidence kinds; 're-verify' dispositions reference the
  // ADR-0045 deterministic channel. Fails closed without an open exposure.
  if (event.type === 'lookback_disposition') {
    if (next.state !== 'authoritative') throw new Error('lookback_disposition requires authoritative state');
    if (next.authoritative_identity_digest !== event.identity_digest) {
      throw new Error('lookback_disposition identity does not match authoritative identity');
    }
    if (KNOWN_EVIDENCE_KINDS.indexOf(event.evidence_kind) === -1) {
      throw new Error('lookback_disposition requires evidence_kind in ' + KNOWN_EVIDENCE_KINDS.join(' | '));
    }
    if (['accept', 're-verify', 'restatement'].indexOf(event.disposition) === -1) {
      throw new Error('lookback_disposition requires disposition accept | re-verify | restatement');
    }
    if (!event.reviewer_id || !event.reason) {
      throw new Error('lookback_disposition requires reviewer_id and reason (ESCALATE-routed human adjudication)');
    }
    const target = next.history.find(e => e.seq === event.exposure_seq && e.kind === 'drift_exposure');
    if (!target || openExposures(next.history).indexOf(target) === -1) {
      throw new Error('lookback_disposition references a missing or already-disposed drift exposure');
    }
    next.history.push(stateEvent(tail.seq + 1, 'lookback_disposition', event.identity_digest, tail.event_hash, {
      exposure_seq: event.exposure_seq,
      evidence_kind: event.evidence_kind,
      disposition: event.disposition,
      reviewer_id: event.reviewer_id,
      second_reviewer: event.second_reviewer || null,
      reason: event.reason,
      timestamp: now,
    }));
    return next;
  }

  throw new Error('unknown instrument state event: ' + event.type);
}

// ---- ADR-0049 D-E: drift exposure look-back (projection, fail-closed) ----

// Open exposures: drift_exposure events not yet closed by a disposition.
function openExposures(history) {
  const open = [];
  for (const ev of history || []) {
    if (ev && ev.kind === 'drift_exposure') open.push(ev);
    if (ev && ev.kind === 'lookback_disposition') {
      const i = open.findIndex(e => e.seq === ev.exposure_seq);
      if (i !== -1) open.splice(i, 1);
    }
  }
  return open;
}

// Prior-interval sign-offs (identity signoff + record_signoff kinds) in the
// same instrument history (history is always one instrument identity's log)
// become 'affected/under-review' while a drift
// exposure is open. Fail-closed: an open exposure marks them; they are never
// valid by default until an oot_impact_assessment / reverse_traceability
// disposition lands (ISO/IEC 17025:2017 7.10 nonconforming work).
function affectedSignoffs(history) {
  const open = openExposures(history);
  if (!open.length) return [];
  const oldestExposureSeq = open[0].seq;
  const affected = [];
  for (const ev of history || []) {
    if (!ev) continue;
    if (ev.kind !== 'signoff' && ev.kind !== 'record_signoff') continue;
    if (ev.seq < oldestExposureSeq) {
      affected.push({ seq: ev.seq, kind: ev.kind, status: 'affected/under-review' });
    }
  }
  return affected;
}

function effectiveState(state, reverifyState, nowMs) {
  if (reverifyState && reverifyState.state === 'degraded') return 'advisory-only';
  // ADR-0060 D-C: an expired conditional certification is not a certification.
  if (state && state.certification_mode === 'conditional') {
    const exp = Date.parse(String(state.conditional_expires_at || '') + 'T23:59:59.999Z');
    const now = typeof nowMs === 'number' ? nowMs : Date.now();
    if (!Number.isFinite(exp) || now > exp) return 'quarantined';
  }
  return state.state;
}

module.exports = {
  FACT_REL,
  STATE_REL,
  GENESIS,
  UNRESOLVED,
  ATTESTATIONS,
  sha256Text,
  isHex64,
  loadPin,
  loadState,
  resolveInstrumentIdentity,
  resolveModelIdentity,
  inferenceConfigHash,
  tripleHash,
  verifyPin,
  verifyState,
  projectRecordStatus,
  transition,
  effectiveState,
  openExposures,
  affectedSignoffs,
};
