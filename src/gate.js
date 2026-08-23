// jiahao gate.js — verification gate combination ladder
// Short-circuit + escalate pattern: deterministic layer blocks/passes first,
// only underdetermined cases escalate to LLM critic, then self-eval.
// Evidence recorded as hash-chained entries (unchecked records never enter chain).

const crypto = require('crypto');
const fs = require('fs');
const { evidencePath } = require('../hooks/jiahao-paths');

// Trust tiers (match SKILL.md output format)
const TIERS = {
  MACHINE_VERIFIED: 'machine-verified',
  INDEPENDENTLY_CHECKED: 'independently-checked',
  UNVERIFIED: 'unverified',
};

// Gate levels (match SKILL.md 6-rung ladder)
const LEVELS = {
  DETERMINISTIC: 'deterministic',   // rung 1-3: test, ground-truth, re-execute
  CHECKLIST: 'checklist',            // rung 4: binary assertion decomposition
  LLM_CRITIC: 'llm-critic',         // rung 5: independent LLM critic
  NOT_VERIFIED: 'not-verified',      // rung 6: cannot verify
};

// Escalation thresholds (from atomcode research: FutureAGI 0.4-0.7 band)
const ESCALATION_BAND = { low: 0.4, high: 0.7 };

// Canonical JSON serialization (RFC 8785 inspired): sort keys recursively.
// Zero-dependency, ~10 lines. Required for deterministic hash chain.
function canonicalJSON(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalJSON).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(obj[k])).join(',') + '}';
}

// Compute hash of a record (excluding prev_hash and event_hash fields)
function recordHash(record) {
  const { prev_hash, event_hash, ...rest } = record;
  return crypto.createHash('sha256').update(canonicalJSON(rest)).digest('hex');
}

// Create an evidence record with hash chain linking.
// ADR-0012 D1: optional `extras` ({ detector, session_id, turn_id }) are
// attached BEFORE hashing so the detector verdict is tamper-evident too.
function createEvidence(gateId, gateType, status, detail, confidence, prevHash, extras) {
  const record = {
    gate_id: gateId,
    gate_type: gateType,
    status: status, // checked | passed | failed | escalated
    evidence_ref: crypto.createHash('sha256').update(detail).digest('hex').slice(0, 16),
    detail: detail,
    confidence: confidence || null,
    threshold: ESCALATION_BAND,
    timestamp: new Date().toISOString(),
    prev_hash: prevHash || null,
  };
  if (extras && typeof extras === 'object') {
    if (extras.detector && typeof extras.detector === 'object') {
      // Keep only the D1 tuple { suspicious, matched_phrases, severity };
      // drop family_hits so the on-chain shape stays stable across detector
      // upgrades.
      const d = extras.detector;
      record.detector = {
        suspicious: !!d.suspicious,
        matched_phrases: Array.isArray(d.matched_phrases) ? d.matched_phrases.slice() : [],
        severity: d.severity === 'high' || d.severity === 'low' ? d.severity : null,
      };
    }
    if (typeof extras.session_id === 'string' && extras.session_id.length > 0) {
      record.session_id = extras.session_id;
    }
    if (typeof extras.turn_id === 'string' && extras.turn_id.length > 0) {
      record.turn_id = extras.turn_id;
    }
  }
  record.event_hash = recordHash(record);
  return record;
}

// Run a single gate check
function runGate(check, gateType) {
  if (typeof check !== 'function') {
    return { passed: false, detail: 'no check function', confidence: 0 };
  }
  try {
    const result = check();
    return result;
  } catch (e) {
    return { passed: false, detail: e.message, confidence: 0 };
  }
}

// The combination ladder: short-circuit + escalate
function verify(claims, gates) {
  // gates = { deterministic: [fn, ...], checklist: [fn, ...], llm_critic: fn }
  // Returns { verdict, tier, evidence_chain, unchecked }

  const evidenceChain = [];
  let prevHash = null; // genesis: no previous hash

  // Level 1: Deterministic gates (short-circuit on failure)
  if (gates.deterministic && gates.deterministic.length > 0) {
    for (let i = 0; i < gates.deterministic.length; i++) {
      const result = runGate(gates.deterministic[i], LEVELS.DETERMINISTIC);
      const evidence = createEvidence(
        'det-' + i, LEVELS.DETERMINISTIC,
        result.passed ? 'passed' : 'failed',
        result.detail, result.confidence, prevHash
      );
      prevHash = evidence.event_hash;

      if (!result.passed) {
        // Hard short-circuit: deterministic failure blocks
        evidenceChain.push(evidence);
        return {
          verdict: 'FAIL',
          tier: TIERS.MACHINE_VERIFIED,
          evidence_chain: evidenceChain,
          unchecked: claims.slice(),
          reason: 'Deterministic gate ' + i + ' failed: ' + result.detail,
        };
      }
      evidenceChain.push(evidence);
    }
  }

  // Level 2: Checklist decomposition (binary assertions)
  if (gates.checklist && gates.checklist.length > 0) {
    let allPassed = true;
    for (let i = 0; i < gates.checklist.length; i++) {
      const result = runGate(gates.checklist[i], LEVELS.CHECKLIST);
      const evidence = createEvidence(
        'chk-' + i, LEVELS.CHECKLIST,
        result.passed ? 'passed' : 'failed',
        result.detail, result.confidence, prevHash
      );
      prevHash = evidence.event_hash;
      evidenceChain.push(evidence);
      if (!result.passed) allPassed = false;
    }
    if (allPassed && (!gates.llm_critic || evidenceChain.length >= claims.length)) {
      // All checklist passed and no LLM critic needed
      return {
        verdict: 'PASS',
        tier: TIERS.MACHINE_VERIFIED,
        evidence_chain: evidenceChain,
        unchecked: [],
        reason: 'All deterministic and checklist gates passed',
      };
    }
  }

  // Level 3: Escalation band check
  // If deterministic passed but no checklist, or checklist had failures,
  // check if we're in the escalation band (0.4-0.7)
  let needsEscalation = true;
  if (evidenceChain.length > 0) {
    const lastConfidence = evidenceChain[evidenceChain.length - 1].confidence;
    if (lastConfidence !== null && lastConfidence !== undefined) {
      if (lastConfidence < ESCALATION_BAND.low) {
        // Low confidence but passed = still uncertain, escalate
        needsEscalation = true;
      } else if (lastConfidence > ESCALATION_BAND.high) {
        // High confidence pass = no escalation needed
        needsEscalation = false;
      }
    }
  }

  // Level 4: LLM critic (only for escalated cases)
  if (needsEscalation && gates.llm_critic) {
    const result = runGate(gates.llm_critic, LEVELS.LLM_CRITIC);
    const evidence = createEvidence(
      'llm-0', LEVELS.LLM_CRITIC,
      result.passed ? 'passed' : 'failed',
      result.detail, result.confidence, prevHash
    );
    prevHash = evidence.event_hash;
    evidenceChain.push(evidence);

    if (result.passed) {
      return {
        verdict: 'PASS',
        tier: TIERS.INDEPENDENTLY_CHECKED,
        evidence_chain: evidenceChain,
        unchecked: result.unchecked || [],
        reason: 'LLM critic passed (independently-checked tier)',
      };
    } else {
      return {
        verdict: 'FAIL',
        tier: TIERS.INDEPENDENTLY_CHECKED,
        evidence_chain: evidenceChain,
        unchecked: result.unchecked || [],
        reason: 'LLM critic failed: ' + result.detail,
      };
    }
  }

  // Level 5: Not verified — all claims unchecked (no per-claim matching)
  return {
    verdict: 'NOT VERIFIED',
    tier: TIERS.UNVERIFIED,
    evidence_chain: evidenceChain,
    unchecked: claims.slice(),
    reason: 'Could not verify: no ground truth, no deterministic check, LLM critic unavailable',
  };
}

// Verify hash chain integrity (tamper-evidence check)
// Returns { valid: true } or { valid: false, broken_at: <index>, reason: <string> }
function verifyChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) {
    return { valid: false, broken_at: -1, reason: 'empty or non-array chain' };
  }
  let expectedPrev = null;
  for (let i = 0; i < chain.length; i++) {
    const record = chain[i];
    // Check prev_hash linkage
    if (record.prev_hash !== expectedPrev) {
      return { valid: false, broken_at: i, reason: 'prev_hash mismatch at index ' + i };
    }
    // Recompute event_hash and check
    const recomputed = recordHash(record);
    if (record.event_hash !== recomputed) {
      return { valid: false, broken_at: i, reason: 'event_hash mismatch at index ' + i };
    }
    expectedPrev = record.event_hash;
  }
  return { valid: true };
}

// Write evidence to file (for Stop hook verdict gate)
function writeEvidence(evidenceChain, overrideConfigDir) {
  const ep = overrideConfigDir
    ? require('path').join(overrideConfigDir, '.jiahao-evidence')
    : evidencePath();
  const data = JSON.stringify(evidenceChain);
  fs.writeFileSync(ep, data, 'utf8');
}

// Clear evidence file
function clearEvidence(overrideConfigDir) {
  const ep = overrideConfigDir
    ? require('path').join(overrideConfigDir, '.jiahao-evidence')
    : evidencePath();
  try { fs.unlinkSync(ep); } catch (e) { /* gone */ }
}

// ponytail: hash chain tamper-evidence implemented (ADR-0007). Upgrade path:
// Ed25519 signatures + Rekor anchoring for cross-organization audit.
// ponytail: Platt sigmoid calibration implemented (ADR-0008). Upgrade path:
// isotonic regression (PAVA) when 1000+ labeled samples exist.

module.exports = {
  TIERS, LEVELS, ESCALATION_BAND,
  canonicalJSON, recordHash,
  createEvidence, runGate, verify, verifyChain,
  writeEvidence, clearEvidence,
};
