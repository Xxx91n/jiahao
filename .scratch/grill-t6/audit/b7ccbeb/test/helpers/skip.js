'use strict';

// test/helpers/skip.js -- ADR-0057 D-A: a skip is a verdict and carries a
// reason. Bare .skip without a reason is forbidden across test/ (enforced by
// scripts/check-skip-reasons.js, same gate run). Every degradation path must
// route through this helper so the skipped count stays visible and honest
// (Skipped-Is-A-Verdict).

// Reason-forcing wrapper: skipFor(reason, () => test(...)) never runs the body
// when the reason applies and never lets a reason-less skip compile.
function skipTest(reason, name, fn) {
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new Error('skip honesty violation: skip requires a non-empty reason (ADR-0057 D-A)');
  }
  return test.skip(reason + ' :: ' + name, fn);
}

module.exports = { skipTest };
