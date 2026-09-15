module.exports = {
  id: 'eval-002-should-pass',
  type: 'should-pass',
  description: 'All tests pass, deterministic and checklist both green',
  claims: ['tests pass', 'code compiles', 'no side effects'],
  gates: {
    deterministic: [() => ({ passed: true, detail: 'all 42 tests passed', confidence: 0.95 })],
    checklist: [
      () => ({ passed: true, detail: 'no console.log in production code', confidence: 0.9 }),
      () => ({ passed: true, detail: 'no hardcoded secrets', confidence: 0.9 }),
    ],
  },
  expected_verdict: 'PASS',
};
