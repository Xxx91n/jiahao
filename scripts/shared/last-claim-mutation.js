'use strict';
// scripts/shared/last-claim-mutation.js - grill-t38 T-5 (D-002.3, spec S-3):
// THE claim-surface mutation classifier, as ONE implementation.
//
// WHY THIS FILE EXISTS (ADR-0092 D-M1 precedent, "two scanners is one too few"):
// the classifier below lived in scripts/check-post-land.js as a module-local
// function. The t38 assertion leg is the SECOND consumer of the same judgment -
// "which commit in this wave is the last claim-surface mutation?" - and a rule
// with two implementations is how a rule silently stops being one rule. Lifting
// it here means the assertion leg calls this function rather than growing a
// second copy, exactly as the doc-hygiene scanner and the tracked-text
// enumeration were lifted before it.
//
// The caller passes the wave (a list of shas) and a `git` reader, and NOTHING
// else. There is no anchor parameter and no scope parameter: a caller that
// could narrow the wave would be choosing what it will not look at, which is
// the observer-selection disease the shared-module lifts exist to withdraw.
//
// ZERO-DEPENDENCY by construction: required from scripts/**, which ships in the
// tarball.

// The wave's last CLAIM-surface mutation: a claim commit is one that lands a
// file on the registered claim surface (.scratch/grill-*/reports|handoffs/),
// evaluated with the same classifier the map-freshness leg uses, so 'last claim
// mutation' means one thing across the round.
function lastClaimMutation(git, wave) {
  let last = null;
  let lastDate = -1;
  for (const sha of wave) {
    const files = git(['show', '--name-only', '--format=', sha]).split('\n').map((s) => s.trim()).filter(Boolean);
    const isClaim = files.some((f) => /^\.scratch\/grill-[^/]+\/(reports|handoffs)\//.test(f));
    if (!isClaim) continue;
    const d = Number(git(['log', '-1', '--format=%ct', sha]));
    if (d >= lastDate) { lastDate = d; last = sha; }
  }
  return last;
}

module.exports = { lastClaimMutation };
