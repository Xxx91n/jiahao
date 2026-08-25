// test/gate.test.js — GateLadder cases only (ADR-0016 D3).
// Chain/hash/idempotency/verify-on-read cases moved to test/evidence-log.test.js.

const path = require('path');

const { TIERS, LEVELS, runGate, verify } = require(path.join(__dirname, '..', 'src', 'gate.js'));
const { verifyChain } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));

test('TIERS has three trust levels', () => {
  expect(TIERS.MACHINE_VERIFIED).toBe('machine-verified');
  expect(TIERS.INDEPENDENTLY_CHECKED).toBe('independently-checked');
  expect(TIERS.UNVERIFIED).toBe('unverified');
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


test('runGate handles exceptions gracefully', () => {
  const result = runGate(() => { throw new Error('boom'); }, 'deterministic');
  expect(result.passed).toBe(false);
  expect(result.detail).toBe('boom');
});

// --- Hash chain tamper-evidence tests (B1) ---

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
