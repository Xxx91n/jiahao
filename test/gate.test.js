const fs = require('fs');
const path = require('path');

const {
  TIERS, LEVELS, ESCALATION_BAND,
  canonicalJSON, recordHash,
  createEvidence, runGate, verify, verifyChain,
  writeEvidence, clearEvidence,
} = require(path.join(__dirname, '..', 'src', 'gate.js'));

test('TIERS has three trust levels', () => {
  expect(TIERS.MACHINE_VERIFIED).toBe('machine-verified');
  expect(TIERS.INDEPENDENTLY_CHECKED).toBe('independently-checked');
  expect(TIERS.UNVERIFIED).toBe('unverified');
});

test('ESCALATION_BAND is 0.4-0.7', () => {
  expect(ESCALATION_BAND.low).toBe(0.4);
  expect(ESCALATION_BAND.high).toBe(0.7);
});

test('createEvidence produces hash-chained record', () => {
  const e = createEvidence('test-0', 'deterministic', 'passed', 'tests passed', 0.95);
  expect(e.gate_id).toBe('test-0');
  expect(e.evidence_ref).toHaveLength(16);
  expect(e.status).toBe('passed');
  expect(e.confidence).toBe(0.95);
});

test('deterministic gate failure short-circuits to FAIL', () => {
  const result = verify(
    ['claim1'],
    {
      deterministic: [() => ({ passed: false, detail: 'test failed', confidence: 0.9 })],
    }
  );
  expect(result.verdict).toBe('FAIL');
  expect(result.tier).toBe(TIERS.MACHINE_VERIFIED);
  expect(result.evidence_chain).toHaveLength(1);
});

test('deterministic gate pass with high confidence = PASS machine-verified', () => {
  const result = verify(
    ['claim1'],
    {
      deterministic: [() => ({ passed: true, detail: 'tests passed', confidence: 0.95 })],
      checklist: [() => ({ passed: true, detail: 'assertion ok', confidence: 0.9 })],
    }
  );
  expect(result.verdict).toBe('PASS');
  expect(result.tier).toBe(TIERS.MACHINE_VERIFIED);
});

test('escalation band (0.4-0.7) triggers LLM critic', () => {
  const result = verify(
    ['claim1'],
    {
      deterministic: [() => ({ passed: true, detail: 'weak signal', confidence: 0.5 })],
      llm_critic: () => ({ passed: true, detail: 'critic agrees', confidence: 0.8 }),
    }
  );
  expect(result.verdict).toBe('PASS');
  expect(result.tier).toBe(TIERS.INDEPENDENTLY_CHECKED);
  expect(result.evidence_chain.length).toBeGreaterThanOrEqual(2);
});

test('LLM critic failure = FAIL independently-checked', () => {
  const result = verify(
    ['claim1'],
    {
      deterministic: [() => ({ passed: true, detail: 'weak', confidence: 0.5 })],
      llm_critic: () => ({ passed: false, detail: 'critic disagrees', confidence: 0.8 }),
    }
  );
  expect(result.verdict).toBe('FAIL');
  expect(result.tier).toBe(TIERS.INDEPENDENTLY_CHECKED);
});

test('no gates available = NOT VERIFIED', () => {
  const result = verify(['claim1'], {});
  expect(result.verdict).toBe('NOT VERIFIED');
  expect(result.tier).toBe(TIERS.UNVERIFIED);
  expect(result.unchecked).toContain('claim1');
});

test('unchecked claims do not enter evidence chain', () => {
  const result = verify(
    ['claim1', 'claim2'],
    {
      deterministic: [() => ({ passed: true, detail: 'ok', confidence: 0.95 })],
      checklist: [() => ({ passed: true, detail: 'ok', confidence: 0.9 })],
    }
  );
  // Evidence chain should only have checked entries
  result.evidence_chain.forEach(e => {
    expect(e.status).not.toBe('unchecked');
  });
});

test('writeEvidence writes to file', () => {
  const TMP = require('os').tmpdir().replace(/\\/g, '/');
  const chain = [createEvidence('t', 'deterministic', 'passed', 'ok', 0.9)];
  writeEvidence(chain, TMP);
  const read = fs.readFileSync(TMP + '/.jiahao-evidence', 'utf8');
  expect(JSON.parse(read)).toHaveLength(1);
  clearEvidence(TMP);
});

test('clearEvidence removes file', () => {
  const TMP = require('os').tmpdir().replace(/\\/g, '/');
  writeEvidence([createEvidence('t', 'det', 'passed', 'ok', 0.9)], TMP);
  expect(fs.existsSync(TMP + '/.jiahao-evidence')).toBe(true);
  clearEvidence(TMP);
  expect(fs.existsSync(TMP + '/.jiahao-evidence')).toBe(false);
});

test('runGate handles exceptions gracefully', () => {
  const result = runGate(() => { throw new Error('boom'); }, 'deterministic');
  expect(result.passed).toBe(false);
  expect(result.detail).toBe('boom');
});

// --- Hash chain tamper-evidence tests (B1) ---

test('createEvidence includes prev_hash and event_hash', () => {
  const e = createEvidence('det-0', 'deterministic', 'passed', 'tests passed', 0.95, null);
  expect(e.prev_hash).toBeNull();
  expect(e.event_hash).toHaveLength(64);
});

test('second evidence links to first via prev_hash', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  expect(e2.prev_hash).toBe(e1.event_hash);
  expect(e2.event_hash).not.toBe(e1.event_hash);
});

test('verifyChain validates a correct chain', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  const result = verifyChain([e1, e2]);
  expect(result.valid).toBe(true);
});

test('verifyChain detects broken prev_hash link', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, 'wronghash');
  const result = verifyChain([e1, e2]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(1);
});

test('verifyChain detects tampered record (event_hash mismatch)', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const tampered = { ...e1, detail: 'HACKED' };
  // prev_hash still null, but event_hash no longer matches
  const result = verifyChain([tampered]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(0);
});

test('verifyChain detects deletion (missing middle record)', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  const e3 = createEvidence('det-2', 'deterministic', 'passed', 'third', 0.9, e2.event_hash);
  // Skip e2 — e3.prev_hash won't match e1.event_hash
  const result = verifyChain([e1, e3]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(1);
});

test('verifyChain detects reordering', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  // Swap order
  const result = verifyChain([e2, e1]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(0);
});

test('verifyChain rejects empty array', () => {
  const result = verifyChain([]);
  expect(result.valid).toBe(false);
});

test('canonicalJSON sorts keys deterministically', () => {
  const a = canonicalJSON({ b: 1, a: 2, c: { z: 1, y: 2 } });
  const b = canonicalJSON({ a: 2, b: 1, c: { y: 2, z: 1 } });
  expect(a).toBe(b);
});

test('verify produces hash-chained evidence', () => {
  const result = verify(
    ['claim1'],
    {
      deterministic: [() => ({ passed: true, detail: 'ok', confidence: 0.95 })],
      checklist: [() => ({ passed: true, detail: 'assertion ok', confidence: 0.9 })],
    }
  );
  expect(result.evidence_chain.length).toBe(2);
  // First record: genesis (prev_hash null)
  expect(result.evidence_chain[0].prev_hash).toBeNull();
  // Second record: links to first
  expect(result.evidence_chain[1].prev_hash).toBe(result.evidence_chain[0].event_hash);
  // Chain should be valid
  const chainResult = verifyChain(result.evidence_chain);
  expect(chainResult.valid).toBe(true);
});
