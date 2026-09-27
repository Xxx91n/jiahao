'use strict';
// src/pairer-lane.js — ADR-0070 D-A: the hook-side conviction lane.
//
// run(payload, deps) rides the Stop/SubagentStop hook: transcript_path ->
// transcript adapter -> src/capa-pairer.js pairItem -> append-only record in
// the evidence chain under source 'pairer-instrument'.
//
// Registered semantics (ADR-0070):
//   - flagged   -> suspicious:true + severity:'high' + the shadow bit
//   - shadow records never enter the severity matrix (the gate skips them)
//   - consistent/undetermined land as non-suspicious observed records
//     (the telemetry substrate); they never flag and never block
//   - a host that delivers no transcript_path leaves the lane 'absent' -
//     nothing is written and nothing escalates (never coverage:partial)
//   - .jiahao-conviction-off makes the lane inert (channel-level kill switch)
//   - .jiahao-conviction-enforce is the registered promotion marker; it drops
//     the shadow bit so flagged records enter the matrix
//
// The lane is fail-open to the caller: any lane-internal error is reported on
// the returned object and never thrown across the hook boundary.

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { convictionLaneOffPath, convictionLaneEnforcePath } = require('./shared/paths');
const { adaptTranscriptFile } = require('./transcript-adapter');
const pairer = require('./capa-pairer');
const { recordHash } = require('./evidence-log');

const SOURCE = 'pairer-instrument';

function transcriptPathOf(payload) {
  // canonical field (Claude Code documented); camelCase alias kept for hosts
  // whose stdin shape is only partially documented.
  const p = payload && (payload.transcript_path || payload.transcriptPath);
  return typeof p === 'string' && p ? p : null;
}

// One lane record per observation; the idempotency key binds
// (session, transcript content) so a re-fired Stop with identical transcript
// content dedups and a new turn's content never does.
function laneIdem(sessionId, adapted) {
  const inputHash = crypto.createHash('sha256')
    .update(JSON.stringify({ task: adapted.task, transcript: adapted.transcript }))
    .digest('hex');
  return crypto.createHash('sha256')
    .update('pairer-lane|' + String(sessionId || 'unknown') + '|' + inputHash)
    .digest('hex');
}

function detailOf(mode, r) {
  const base = 'pairer-lane[' + mode + '] ' + r.state + (r.family ? ' ' + r.family : '');
  const detail = base + ' — ' + String(r.reason || '').slice(0, 160);
  return detail.slice(0, 240);
}

// opts: { evidenceLog, dir (flag-file dir override for tests), sessionId }
// Returns a descriptive lane outcome; never throws.
function run(payload, opts) {
  const o = opts || {};
  const evidenceLog = o.evidenceLog;
  const dir = o.dir || null;
  const off = dir ? path.join(dir, '.jiahao-conviction-off') : convictionLaneOffPath();
  const enforce = dir ? path.join(dir, '.jiahao-conviction-enforce') : convictionLaneEnforcePath();

  if (fs.existsSync(off)) return { lane: 'disabled', state: null };

  const tp = transcriptPathOf(payload);
  if (!tp) return { lane: 'absent', state: null };

  const mode = fs.existsSync(enforce) ? 'enforce' : 'shadow';
  const sessionId = (payload && typeof payload.session_id === 'string' ? payload.session_id : null) || o.sessionId || null;
  const t0 = Date.now();
  const adapted = adaptTranscriptFile(tp);
  let r;
  if (!adapted.ok) {
    r = { family: null, state: 'undetermined', claim: null, evidence: null, reason: 'adapter: ' + (adapted.reason || 'transcript unadaptable') };
  } else {
    try { r = pairer.pairItem({ task: adapted.task, transcript: adapted.transcript }); }
    catch (e) { r = { family: null, state: 'undetermined', claim: null, evidence: null, reason: 'adapter: pairItem threw: ' + e.message }; }
  }
  const latencyMs = Date.now() - t0;

  let appended = false;
  if (evidenceLog && typeof evidenceLog.commit === 'function' && typeof evidenceLog.createRecord === 'function') {
    const obs = { r: r, mode: mode, adapted: adapted, latencyMs: latencyMs, sessionId: sessionId };
    evidenceLog.commit(function (chain, prevHash) {
      const rec = evidenceLog.createRecord('pairer-lane', SOURCE,
        obs.r.state === 'flagged' ? 'suspect' : 'observed',
        detailOf(obs.mode, obs.r), null, prevHash, {
          session_id: obs.sessionId,
          detector: {
            suspicious: obs.r.state === 'flagged',
            matched_phrases: [],
            severity: obs.r.state === 'flagged' ? 'high' : null,
            source: SOURCE,
            shadow: obs.mode === 'shadow',
            pairer: {
              family: obs.r.family,
              state: obs.r.state,
              claim: obs.r.claim,
              evidence: obs.r.evidence,
              reason: obs.r.reason,
              latency_ms: obs.latencyMs,
            },
          },
        });
      rec._idem = laneIdem(obs.sessionId, obs.adapted);
      rec.event_hash = recordHash(rec);
      return [rec];
    });
    appended = true;
  }

  return { lane: 'recorded', mode: mode, state: r.state, family: r.family, claim: r.claim, evidence: r.evidence, reason: r.reason, latency_ms: latencyMs, appended: appended };
}

module.exports = { SOURCE: SOURCE, run: run, transcriptPathOf: transcriptPathOf, laneIdem: laneIdem };
