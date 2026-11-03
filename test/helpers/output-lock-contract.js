'use strict';

// The exact Output Lock template (#135). The source contract test and the
// generated-copy test pin the same bytes: a wording edit has to reach every
// shipped surface, and one definition keeps the two tests from drifting into
// two different expectations.
const TEMPLATE =
  '[行动结论] `one sentence stating the concrete action completed`\n\n' +
  '[机器凭证] `the physical command and its exit 0 output snippet`\n\n' +
  '[残留风险] `remaining unverified boundaries or risks, or 无`';

module.exports = { TEMPLATE };
