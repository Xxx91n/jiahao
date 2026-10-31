'use strict';
// test/pairer-lane.test.js - the hook-side conviction lane's commit boundary
// (#108 audit, CodeRabbit round 2): the dead-man switch's typed refusal
// (WITNESS_HARD_STOP_CODE) surfaces as a lane OUTCOME the gate can act on,
// while a generic commit failure keeps propagating to the gate's fail-open
// catch. The evidenceLog is injected through opts - the established seam for
// this module (pairer-lane takes deps, never reaches for singletons).

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const { run } = require(path.join(repoRoot, 'src', 'pairer-lane.js'));
const { WITNESS_HARD_STOP_CODE } = require(path.join(repoRoot, 'src', 'evidence-log.js'));

// A transcript path that does not exist: the adapter reports ok:false, the
// lane classifies undetermined, and the record commit is still attempted -
// which is exactly the path where the dead-man switch can refuse.
const PAYLOAD = { transcript_path: 'Z:/no/such/transcript.jsonl' };

// Hermetic flag-file directory: no .jiahao-conviction-off/-enforce leaks in
// from the real config dir (#84: one fresh directory per test).
function freshFlagDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-lane-test-'));
}

function stubLog(commitImpl) {
  return { commit: commitImpl, createRecord: function () { return {}; } };
}

test('a typed witness refusal surfaces as a hard-stop lane outcome', () => {
  const err = new Error('witness unavailable past the hard deadline (604800000ms) with 1 unverified post-detection append(s)');
  err.code = WITNESS_HARD_STOP_CODE;
  const res = run(PAYLOAD, {
    dir: freshFlagDir(),
    evidenceLog: stubLog(function () { throw err; }),
  });
  expect(res.lane).toBe('hard-stop');
  expect(res.reason).toContain('witness unavailable');
  expect(res.state).toBeNull();
});

test('a generic commit failure keeps propagating to the gate fail-open catch', () => {
  expect(() => run(PAYLOAD, {
    dir: freshFlagDir(),
    evidenceLog: stubLog(function () { const e = new Error('disk full'); throw e; }),
  })).toThrow(/disk full/);
});

test('a healthy commit appends and reports the recorded outcome', () => {
  const res = run(PAYLOAD, { dir: freshFlagDir(), evidenceLog: stubLog(function () { /* append ok */ }) });
  expect(res.lane).toBe('recorded');
  expect(res.appended).toBe(true);
  expect(res.state).toBe('undetermined'); // unadaptable transcript classifies nothing
});
