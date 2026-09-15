module.exports = {
  id: 'eval-003-cannot-verify',
  type: 'cannot-verify',
  description: 'No deterministic checker available, no LLM critic provided',
  claims: ['documentation is accurate', 'API responses match spec'],
  gates: {},
  expected_verdict: 'NOT VERIFIED',
};
