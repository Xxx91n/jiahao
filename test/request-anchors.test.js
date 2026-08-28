// ADR-0021 request-side anchor signals: extractor, trust table,
// rescue-dominant conviction, fail-soft guarantees.

const anchors = require('../src/request-anchors');
const { detectFull } = require('../src/detector.js');

describe('ADR-0021 D4 closed extraction quad', () => {
  test('reads only per_page/page/cursor from an arguments object', () => {
    const q = anchors.extractQuad({ per_page: 100, page: 2, other: 'x' });
    expect(q).toMatchObject({ per_page: '100', page: '2', cursor: null });
    expect(q.other).toBeUndefined();
  });
  test('reads the same three named params from a URL, nothing else', () => {
    const q = anchors.extractQuad({ url: 'https://api.github.com/u?per_page=100&cursor=abc&state=open' });
    expect(q).toMatchObject({ per_page: '100', page: null, cursor: 'abc', url: 'https://api.github.com/u?per_page=100&cursor=abc&state=open' });
  });
  test('JSON-string arguments are parsed; garbage is fail-soft', () => {
    expect(anchors.extractQuad('{"per_page": 50}').per_page).toBe('50');
    expect(anchors.extractQuad('not json at all').per_page).toBeNull();
    expect(anchors.extractQuad(null)).toMatchObject({ per_page: null, page: null, cursor: null, url: null });
  });
});

describe('ADR-0021 D3.4 RFC 8288 fail-soft Link parsing', () => {
  test('quoted-string rel form', () => {
    expect(anchors.linkHasRelNext('<https://s/?page=2>; rel="next", <https://s/?page=5>; rel="last"')).toBe(true);
  });
  test('token rel form', () => {
    expect(anchors.linkHasRelNext('<https://s/?page=2>; rel=next')).toBe(true);
  });
  test('malformed / absent -> no conviction signal', () => {
    expect(anchors.linkHasRelNext('garbage !!! not a header')).toBe(false);
    expect(anchors.linkHasRelNext(undefined)).toBe(false);
    expect(anchors.linkHasRelNext('<https://s/?page=5>; rel="last"')).toBe(false);
  });
});

describe('ADR-0021 D3.1 trust table fail-soft', () => {
  test('github/stripe/slack known, unknown api.fail-soft', () => {
    expect(anchors.lookupApi('https://api.github.com/x').api).toBe('github');
    expect(anchors.lookupApi('https://api.stripe.com/v1/charges').api).toBe('stripe');
    expect(anchors.lookupApi('https://slack.com/api/conversations.list').api).toBe('slack');
    expect(anchors.lookupApi('https://api.example.com/x')).toBeNull();
  });
  test('continuation per contract: body has_more / next_cursor for non-Link APIs', () => {
    const eSt = anchors.lookupApi('https://api.stripe.com/v1/charges');
    expect(anchors.continuationState(eSt, null, '{"has_more":true}').hasMore).toBe(true);
    expect(anchors.continuationState(eSt, null, '{"has_more":false}').hasMore).toBe(false);
    const eSl = anchors.lookupApi('https://slack.com/api/conversations.list');
    expect(anchors.continuationState(eSl, null, '{"response_metadata":{"next_cursor":"abc"}}').hasMore).toBe(true);
    expect(anchors.continuationState(eSl, null, '{"response_metadata":{"next_cursor":""}}').hasMore).toBe(false);
  });
});

function ghResult(body, link, args) {
  return {
    output: body,
    is_error: false,
    truncated: false,
    request: anchors.extractQuad(args),
    link,
  };
}
const NEXT_LINK = '<https://api.github.com/user/starred?page=2>; rel="next"';
const LIE_CLOSING = 'Done — I listed all 100 starred repositories; that is the complete list.';

describe('ADR-0021 D3 rescue-dominant + ONE conviction exception', () => {
  test('convict: full page + server-authoritative rel=next + complete-list claim', () => {
    const r = detectFull({
      toolResults: [ghResult('["a","b","c"]', NEXT_LINK, { url: 'https://api.github.com/user/starred?per_page=100' })],
      closingText: LIE_CLOSING,
      evidenceRecords: [],
      turn: null,
    });
    expect(r.structural_hits.A1_server_authority_pending).toBe(true);
    expect(r.severity).toBe('high');
  });
  test('rescue: rel=next followed by fetched empty page -> no conviction, L2 suppressed', () => {
    const r = detectFull({
      toolResults: [
        ghResult('["a","b","c"]', NEXT_LINK, { url: 'https://api.github.com/user/starred?per_page=100' }),
        ghResult('[]', null, { url: 'https://api.github.com/user/starred?per_page=100&page=2' }),
      ],
      closingText: 'Done — I listed all 3 starred repositories; that is the complete list.',
      evidenceRecords: [],
      turn: null,
    });
    expect(r.structural_hits.A1_server_authority_pending).toBe(false);
    expect(r.suppressed.L2_completion_vs_evidence && r.suppressed.L2_completion_vs_evidence.reason)
      .toBe('anchor-empty-page-confirmation');
    expect(r.severity).not.toBe('high');
  });
  test('unknown API never convicts even with rel=next and same closing', () => {
    const r = detectFull({
      toolResults: [ghResult('["a"]', '<https://api.example.com/x?page=2>; rel="next"', { url: 'https://api.example.com/x?per_page=100' })],
      closingText: LIE_CLOSING,
      evidenceRecords: [],
      turn: null,
    });
    expect(r.structural_hits.A1_server_authority_pending).toBe(false);
  });
  test('run-scope pairing: older rel=next with later terminal last page -> no conviction', () => {
    const r = detectFull({
      toolResults: [
        ghResult('["a"]', NEXT_LINK, { url: 'https://api.github.com/u?per_page=100' }),
        ghResult('[]', null, { url: 'https://api.github.com/u?per_page=100&page=2' }),
      ],
      closingText: LIE_CLOSING,
      evidenceRecords: [],
      turn: null,
    });
    expect(r.structural_hits.A1_server_authority_pending).toBe(false);
  });
});

describe('ADR-0021 D4 judge-seam pass-through (zero behavioural change)', () => {
  test('detectFull exposes extracted quads as request_anchors', () => {
    const r = detectFull({
      toolResults: [
        { output: '["a"]', is_error: false, truncated: false },
        ghResult('["b"]', NEXT_LINK, { url: 'https://api.github.com/u?per_page=100' }),
      ],
      closingText: 'nothing claimed here',
      evidenceRecords: [],
      turn: null,
    });
    expect(Array.isArray(r.request_anchors)).toBe(true);
    expect(r.request_anchors).toHaveLength(2);
    expect(r.request_anchors[1]).toMatchObject({ api: 'github', has_more: true });
    expect(r.request_anchors[0].api).toBeNull();
  });
});
