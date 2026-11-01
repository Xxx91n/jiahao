'use strict';
// test/instrument-identity.test.js — the drift-exposure projection (#71 item 14).
// A prior-interval sign-off is affected by an open exposure; the project used
// to recognise only `signoff` and `record_signoff`, so an earlier
// `conditional_signoff` stayed silently valid across an open exposure.

const path = require('path');

const { affectedSignoffs, openExposures } = require(
  path.join(__dirname, '..', 'src', 'instrument-identity.js'));

test('#71 item 14: a conditional_signoff before an open exposure is marked affected', () => {
  const history = [
    { seq: 1, kind: 'conditional_signoff' },
    { seq: 2, kind: 'signoff' },
    { seq: 3, kind: 'record_signoff', record_seq: 1 },
    { seq: 4, kind: 'drift_exposure' },
  ];
  expect(openExposures(history).map(e => e.seq)).toEqual([4]);
  const affected = affectedSignoffs(history);
  expect(affected.map(a => a.kind)).toEqual(['conditional_signoff', 'signoff', 'record_signoff']);
  expect(affected.every(a => a.status === 'affected/under-review')).toBe(true);
});

test('#71 item 14: a sign-off recorded after the exposure is not marked', () => {
  const history = [
    { seq: 1, kind: 'drift_exposure' },
    { seq: 2, kind: 'conditional_signoff' },
    { seq: 3, kind: 'record_signoff', record_seq: 1 },
  ];
  expect(affectedSignoffs(history)).toEqual([]);
});

test('#71 item 14: a disposed exposure marks nothing', () => {
  const history = [
    { seq: 1, kind: 'conditional_signoff' },
    { seq: 2, kind: 'drift_exposure' },
    { seq: 3, kind: 'lookback_disposition', exposure_seq: 2, disposition: 'no-impact' },
  ];
  expect(openExposures(history)).toEqual([]);
  expect(affectedSignoffs(history)).toEqual([]);
});
