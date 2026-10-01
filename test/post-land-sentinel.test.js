'use strict';
// test/post-land-sentinel.test.js - ADR-0092 D-S1 (grill-t35 D-004/D-007):
// wiring for the post-land-verify assertion leg. Pure-core driven: the segment
// extractor and the per-segment judge are exercised as functions, including the
// anti-masking property that the whole two-segment design exists to guarantee.

const fs = require('fs');
const path = require('path');
const sentinel = require('../scripts/check-post-land-sentinel');
const { SENTINEL } = require('../scripts/check-post-land');

function block(pre, post) {
  const seg = (tag, obj) => '<!-- segment: ' + tag + ' -->\n```json\n' + JSON.stringify(obj, null, 2) + '\n```\n';
  return SENTINEL + '\n\n' + (pre ? seg('pre_land', pre) + '\n' : '') + (post ? seg('post_land', post) + '\n' : '');
}

const GREEN_CHECK = [{ name: 'doc-hygiene', status: 'pass', detail: 'clean' }];
const RED_CHECK = [{ name: 'doc-hygiene', status: 'fail', detail: 'control byte 0x8 @1424' }];

function pre(over) {
  return Object.assign({
    object: 'workspace merge tree',
    last_claim_mutation: 'a'.repeat(40),
    ran_at: '2026-10-01T12:00:00.000Z',
    checks: GREEN_CHECK,
  }, over || {});
}
function post(over) {
  return Object.assign({
    object: 'landed public tip',
    tip: 'b'.repeat(40),
    checks: GREEN_CHECK,
  }, over || {});
}

describe('post-land-verify sentinel block (ADR-0092 D-S1)', () => {
  test('both segments extract cleanly from a two-segment block', () => {
    const out = sentinel.extractSegments(block(pre(), post()));
    expect(out.error).toBeUndefined();
    expect(out.pre.last_claim_mutation).toBe('a'.repeat(40));
    expect(out.post.tip).toBe('b'.repeat(40));
  });

  test('a missing block fails closed', () => {
    expect(sentinel.extractSegments('no block here').error).toMatch(/missing/);
  });

  test('a single-segment block FAILS - one segment never substitutes for the other', () => {
    // The whole point of splitting the block: a writer who ran only one half must
    // not be able to satisfy the contract.
    expect(sentinel.extractSegments(block(pre(), null)).error).toMatch(/post_land/);
    expect(sentinel.extractSegments(block(null, post())).error).toMatch(/pre_land/);
  });

  test('a malformed segment (no checks array) fails closed', () => {
    const bad = block(pre(), { tip: 'c'.repeat(40) });
    expect(sentinel.extractSegments(bad).error).toMatch(/checks array/);
  });
});

describe('pre_land / post_land are judged INDEPENDENTLY (anti-masking, ADR-0091 D-D)', () => {
  test('a red pre_land next to a green post_land yields a pre_land error', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    const preErrs = sentinel.judgeSegment('pre_land', pre({ checks: RED_CHECK }), ctx);
    const postErrs = sentinel.judgeSegment('post_land', post(), ctx);
    expect(preErrs.length).toBeGreaterThan(0);
    expect(preErrs.join(' ')).toContain('doc-hygiene');
    // the green segment contributes nothing - and is never consulted to excuse
    expect(postErrs).toEqual([]);
  });

  test('a red post_land next to a green pre_land yields a post_land error', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    const preErrs = sentinel.judgeSegment('pre_land', pre(), ctx);
    const postErrs = sentinel.judgeSegment('post_land', post({ checks: RED_CHECK }), ctx);
    expect(preErrs).toEqual([]);
    expect(postErrs.join(' ')).toContain('doc-hygiene');
  });

  test('both green yields no errors from either segment', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    expect(sentinel.judgeSegment('pre_land', pre(), ctx)).toEqual([]);
    expect(sentinel.judgeSegment('post_land', post(), ctx)).toEqual([]);
  });
});

describe('pre_land timing and anchoring fields', () => {
  test('ran_at predating the last claim mutation FAILS (F-6 window narrowing)', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T13:00:00Z') };
    const errs = sentinel.judgeSegment('pre_land', pre({ ran_at: '2026-10-01T12:00:00.000Z' }), ctx);
    expect(errs.join(' ')).toContain('predates');
  });

  test('ran_at after the last claim mutation passes', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    expect(sentinel.judgeSegment('pre_land', pre({ ran_at: '2026-10-01T12:00:00.000Z' }), ctx)).toEqual([]);
  });

  test('a missing or unparseable ran_at fails closed (the timestamp is a required field)', () => {
    expect(sentinel.judgeSegment('pre_land', pre({ ran_at: undefined }), {}).join(' ')).toContain('ran_at');
    expect(sentinel.judgeSegment('pre_land', pre({ ran_at: 'not-a-date' }), {}).join(' ')).toContain('unparseable');
  });

  test('a missing last_claim_mutation fails closed', () => {
    expect(sentinel.judgeSegment('pre_land', pre({ last_claim_mutation: null }), {}).join(' ')).toContain('last_claim_mutation');
  });

  test('post_land without a tip sha fails closed (the verdict must anchor to an object)', () => {
    expect(sentinel.judgeSegment('post_land', post({ tip: null }), {}).join(' ')).toContain('tip');
    expect(sentinel.judgeSegment('post_land', post({ tip: 'nothex' }), {}).join(' ')).toContain('tip');
  });
});

describe('registration', () => {
  test('the ADR-0092 carrier exists and declares both segments independently', () => {
    const a = fs.readFileSync(path.join(__dirname, '..', 'docs', 'adr',
      '0092-public-object-equivalence-and-post-land-verification-contract.md'), 'utf8');
    expect(a).toContain('Declaration 2 of 3');
    expect(a).toContain('pre_land');
    expect(a).toContain('post_land');
    expect(a).toMatch(/read and judged\s*\n?INDEPENDENTLY/);
  });

  test('the post-land carrier names the subset and states its non-CI positioning', () => {
    const s = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'check-post-land.js'), 'utf8');
    // Matched with /\s+/ across line breaks: these phrases are wrapped in the
    // source comment, so a plain toContain would pin the wrapping, not the claim.
    const flat = s.replace(/\s+/g, ' ');
    expect(flat).toContain('WAVE-BOUNDED SUBSET');
    expect(flat).toMatch(/Not a gates\.json CI leg/);
    expect(flat).toContain('SUBORDINATES');
    expect(flat).toContain('forensic');
  });
});
