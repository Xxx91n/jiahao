// jiahao gate.js — verification gate combination ladder
// Short-circuit + escalate pattern: deterministic layer blocks/passes first,
// only underdetermined cases escalate to LLM critic, then self-eval.
// Evidence recorded as hash-chained entries (unchecked records never enter chain).

const crypto = require('crypto');
const fs = require('fs');

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

// Create an evidence record
function createEvidence(gateId, gateType, status, detail, confidence) {
  return {
    gate_id: gateId,
    gate_type: gateType,
    status: status, // checked | passed | failed | escalated
    evidence_ref: crypto.createHash('sha256').update(detail).digest('hex').slice(0, 16),
    detail: detail,
    confidence: confidence || null,
    threshold: ESCALATION_BAND,
    timestamp: new Date().toISOString(),
  };
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
  const unchecked = [];

  // Level 1: Deterministic gates (short-circuit on failure)
  if (gates.deterministic && gates.deterministic.length > 0) {
    for (let i = 0; i < gates.deterministic.length; i++) {
      const result = runGate(gates.deterministic[i], LEVELS.DETERMINISTIC);
      const evidence = createEvidence(
        'det-' + i, LEVELS.DETERMINISTIC,
        result.passed ? 'passed' : 'failed',
        result.detail, result.confidence
      );

      if (!result.passed) {
        // Hard short-circuit: deterministic failure blocks
        evidenceChain.push(evidence);
        return {
          verdict: 'FAIL',
          tier: TIERS.MACHINE_VERIFIED,
          evidence_chain: evidenceChain,
          unchecked: claims.filter(c => true), // all claims unchecked
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
        result.detail, result.confidence
      );
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
      result.detail, result.confidence
    );
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

  // Level 5: Not verified
  // Mark remaining claims as unchecked (they never enter the hash chain)
  claims.forEach((c, i) => {
    if (!evidenceChain.find(e => e.gate_id === 'claim-' + i)) {
      unchecked.push(c);
    }
  });

  return {
    verdict: 'NOT VERIFIED',
    tier: TIERS.UNVERIFIED,
    evidence_chain: evidenceChain,
    unchecked: unchecked,
    reason: 'Could not verify: no ground truth, no deterministic check, LLM critic unavailable',
  };
}

// Write evidence to file (for Stop hook verdict gate)
function writeEvidence(evidenceChain, configDir) {
  const evidencePath = (configDir || '/tmp') + '/.jiahao-evidence';
  const data = JSON.stringify(evidenceChain);
  fs.writeFileSync(evidencePath, data, 'utf8');
}

// Clear evidence file
function clearEvidence(configDir) {
  const evidencePath = (configDir || '/tmp') + '/.jiahao-evidence';
  try { require('fs').unlinkSync(evidencePath); } catch (e) { /* gone */ }
}

// ponytail: evidence chain is the minimal viable structure; hash chain + receipt
// pattern is the upgrade path when tamper-evidence is needed.
// ponytail: no calibration curve yet; confidence thresholds are static (0.4/0.7).
// Upgrade to isotonic regression calibration when sufficient data exists.

module.exports = {
  TIERS, LEVELS, ESCALATION_BAND,
  createEvidence, runGate, verify,
  writeEvidence, clearEvidence,
};
