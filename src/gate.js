// src/gate.js — GateLadder (ADR-0016 D1): pure, fs-free verification ladder.
// Short-circuit + escalate pattern: deterministic layer blocks/passes first,
// only underdetermined cases escalate to LLM critic (band 0.4-0.7, ADR-0007).
// Evidence persistence lives in src/evidence-log.js; paths in src/shared/paths.js.

const { ESCALATION_BAND, createRecord } = require('./evidence-log');

// Trust tiers (match SKILL.md output format)
const TIERS = {
  MACHINE_VERIFIED: 'machine-verified',
  INDEPENDENTLY_CHECKED: 'independently-checked',
  UNVERIFIED: 'unverified',
};

// Gate levels (match SKILL.md 6-rung ladder)
const LEVELS = {
  DETERMINISTIC: 'deterministic',   // rung 1-3: test, ground-truth, re-execute
  CHECKLIST: 'checklist',           // rung 4: binary assertion decomposition
  LLM_CRITIC: 'llm-critic',         // rung 5: independent LLM critic
  NOT_VERIFIED: 'not-verified',     // rung 6: cannot verify
};

// Record construction/hashing is EvidenceLog's job; createRecord is pure (no fs),
// so the ladder stays fs-free while emitting the same record shape as before.

// Run a single gate check
function runGate(check, gateType) {
  if (typeof check !== 'function') {
    return { passed: false, detail: 'no check function', confidence: 0 };
  }
  try {
    const result = check();
    return result;
  } catch (e) {
    return { passed: false, detail: e.message, confidence: 0, decisive: false };
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
      const evidence = createRecord(
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
      const evidence = createRecord(
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
    // ADR-0017 D1: an exercised-but-indecisive critic (returns
    // decisive:false, or threw) emits ESCALATE, never NOT VERIFIED.
    const indecisive = result.decisive === false;
    const evidence = createRecord(
      'llm-0', LEVELS.LLM_CRITIC,
      indecisive ? 'inconclusive' : (result.passed ? 'passed' : 'failed'),
      result.detail, result.confidence, prevHash
    );
    prevHash = evidence.event_hash;
    evidenceChain.push(evidence);

    if (indecisive) {
      return {
        verdict: 'ESCALATE',
        tier: TIERS.UNVERIFIED,
        evidence_chain: evidenceChain,
        unchecked: claims.slice(),
        reason: 'LLM critic exercised but indecisive: ' + result.detail +
                ' — route to human adjudication (jiahao resolve)',
      };
    }

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

module.exports = { runGate, verify, TIERS, LEVELS };
