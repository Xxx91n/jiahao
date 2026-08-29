// src/reverify-schedule.js -- ADR-0030 D4: dead-man switch, derived state.
//
// Machine-readable deadline discipline (Python __future__. MandatoryRelease
// shape): the degradation state is DERIVED from
//   bench/polygraph/deadline.json  (constants, content-anchored to ADR-0030)
//   bench/polygraph/reverify-ledger.json  (append-only hash chain, its tail's
//     collected_at is the heartbeat)
// and is NEVER stored in a separate state file: there is no file to delete to
// silence the switch. Deleting or truncating the ledger makes the state
// "never verified" -> degraded (fail toward degradation, not freshness).
//   age <  6 months (30d-coarse, matches corpus ROT_MS): fresh, no banner
//   age >= 6 and < 9:                                     warn  (soft banner)
//   age >= 9 months (or ledger missing/broken):           degraded (advisory-only)
// Recovery condition rides the banner (PEP 387 shape).

'use strict';

const fs = require('fs');
const path = require('path');

const MONTH_MS = 30 * 24 * 3600 * 1000; // coarse calendar month (== corpus ROT_MS convention)

// ledger: parsed array, or null when missing/unparseable/broken-chain.
function degradationState(schedule, ledger, now) {
  if (!schedule || typeof schedule.interval_months !== 'number' || typeof schedule.hard_interval_months !== 'number') {
    return { state: 'unknown', age_ms: null };
  }
  let verifiedAt = null;
  if (Array.isArray(ledger) && ledger.length > 0) {
    const t = Date.parse(ledger[ledger.length - 1].collected_at);
    verifiedAt = Number.isNaN(t) ? null : t;
  }
  if (verifiedAt === null) {
    return { state: 'degraded', age_ms: null, reason: 'no verified ledger entry' };
  }
  const age = now - verifiedAt;
  if (age >= schedule.hard_interval_months * MONTH_MS) return { state: 'degraded', age_ms: age };
  if (age >= schedule.interval_months * MONTH_MS) return { state: 'warn', age_ms: age };
  return { state: 'fresh', age_ms: age };
}

function banner(state, schedule) {
  const rec = (schedule && schedule.recovery_condition) || 'run npm run reverify (ADR-0030)';
  if (state === 'warn') {
    return 'JIAHAO RE-VERIFICATION DUE (> 6 months since last run): judge-corpus freshness expiring; ' + rec;
  }
  if (state === 'degraded') {
    return 'JIAHAO DEGRADED (judge seam advisory-only, > 9 months without re-verification): verdict blocking is suspended; ' + rec;
  }
  return null;
}

// Best-effort load from the repo layout. Returns null (not degraded) when the
// bench assets are absent entirely (e.g. a partial install), so absence of the
// *infrastructure* never invents a verdict change.
function load(hostRoot) {
  const deadlinePath = path.join(hostRoot, 'bench', 'polygraph', 'deadline.json');
  const ledgerPath = path.join(hostRoot, 'bench', 'polygraph', 'reverify-ledger.json');
  let schedule = null;
  try { schedule = JSON.parse(fs.readFileSync(deadlinePath, 'utf8')); } catch (e) { return null; }
  let ledger = null;
  try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); } catch (e) { ledger = null; }
  const state = degradationState(schedule, ledger, Date.now());
  return { schedule, state, banner: banner(state.state, schedule) };
}

module.exports = { MONTH_MS, degradationState, banner, load };
