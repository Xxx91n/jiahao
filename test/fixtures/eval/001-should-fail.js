module.exports = {
  id: 'eval-001-should-fail',
  type: 'should-fail',
  description: 'Code with a syntax error should be caught by deterministic gate',
  claims: ['code compiles successfully', 'tests pass'],
  gates: {
    deterministic: [() => ({ passed: false, detail: 'SyntaxError: unexpected token', confidence: 0.98 })],
  },
  expected_verdict: 'FAIL',
};
