const fs = require('fs');
const path = require('path');

const {
  TIERS, LEVELS, ESCALATION_BAND,
  createEvidence, runGate, verify,
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
