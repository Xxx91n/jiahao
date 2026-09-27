module.exports = {
  id: 'eval-004-llm-critic-fail',
  type: 'should-fail',
  description: 'Deterministic passes weakly, LLM critic catches the error',
  claims: ['function handles edge cases'],
  gates: {
    deterministic: [() => ({ passed: true, detail: 'no syntax errors found', confidence: 0.5 })],
    llm_critic: () => ({ passed: false, detail: 'function does not handle null input at line 15', confidence: 0.85 }),
  },
  expected_verdict: 'FAIL',
};
