'use strict';
// test/last-claim-mutation.test.js - grill-t38 T-5 (D-002.3, spec S-3): the
// claim-surface mutation classifier is ONE implementation in scripts/shared/,
// with check-post-land.js re-exporting it so existing consumers keep working.
//
// The identity lock below is the point of the lift (ADR-0092 D-M1): if the two
// modules ever export different functions, the t38 assertion leg has grown a
// second scanner and the round's premise is dead. The behavior assertion pins
// the classifier's judgment on a synthetic wave so a refactor cannot quietly
// change what "last claim mutation" means.
const postLand = require('../scripts/check-post-land.js');
const shared = require('../scripts/shared/last-claim-mutation.js');

// A synthetic git reader: show -> file list, log -> epoch seconds. No repo, no
// clock, no network - the classifier's judgment is a pure function of these two
// outputs.
function syntheticGit(bySha) {
  return (args) => {
    if (args[0] === 'show') return bySha[args[3]].files.join('\n');
    if (args[0] === 'log') return String(bySha[args[3]].ct);
    throw new Error('unexpected git args: ' + args.join(' '));
  };
}

describe('lastClaimMutation: one shared implementation (grill-t38 T-5)', () => {
  test('the shared module and check-post-land export the SAME function reference', () => {
    expect(typeof shared.lastClaimMutation).toBe('function');
    expect(postLand.lastClaimMutation).toBe(shared.lastClaimMutation);
  });

  test('the wave\'s last claim-surface mutation is the newest claim commit', () => {
    const git = syntheticGit({
      aaa: { files: ['README.md'], ct: 300 },                                   // no claim surface
      bbb: { files: ['.scratch/grill-t38/reports/r.md'], ct: 100 },             // claim
      ccc: { files: ['.scratch/grill-t38/handoffs/h.md'], ct: 200 },            // claim, newest
      ddd: { files: ['scripts/x.js'], ct: 400 },                                // no claim surface
    });
    expect(shared.lastClaimMutation(git, ['aaa', 'bbb', 'ccc', 'ddd'])).toBe('ccc');
  });

  test('a wave with no claim-surface commit yields null, not a stray sha', () => {
    const git = syntheticGit({ aaa: { files: ['README.md'], ct: 10 } });
    expect(shared.lastClaimMutation(git, ['aaa'])).toBeNull();
  });
});
