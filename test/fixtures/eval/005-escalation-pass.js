module.exports = {
  id: 'eval-005-escalation-pass',
  type: 'should-pass',
  description: 'Deterministic weak signal, LLM critic confirms correctness',
  claims: ['refactoring preserves behavior'],
  gates: {
    deterministic: [() => ({ passed: true, detail: 'diff applies cleanly', confidence: 0.5 })],
    llm_critic: () => ({ passed: true, detail: 'behavior identical, no side effects introduced', confidence: 0.85 }),
  },
  expected_verdict: 'PASS',
};
