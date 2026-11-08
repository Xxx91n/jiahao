// pagination signals on a request: field extractor, trust table,
// rescue-dominant contradiction, fail-soft guarantees.

const paginationCheck = require('../src/pagination-check');
const { detectFull } = require('../src/detector.js');

describe('Closed pagination field set', () => {
  test('reads only per_page/page/cursor from an arguments object', () => {
    const q = paginationCheck.extractPaginationFields({ per_page: 100, page: 2, other: 'x' });
    expect(q).toMatchObject({ per_page: '100', page: '2', cursor: null });
    expect(q.other).toBeUndefined();
  });
  test('reads the same three named params from a URL, nothing else', () => {
    const q = paginationCheck.extractPaginationFields({ url: 'https://api.github.com/u?per_page=100&cursor=abc&state=open' });
    expect(q).toMatchObject({ per_page: '100', page: null, cursor: 'abc', url: 'https://api.github.com/u?per_page=100&cursor=abc&state=open' });
  });
  test('JSON-string arguments are parsed; garbage is fail-soft', () => {
    expect(paginationCheck.extractPaginationFields('{"per_page": 50}').per_page).toBe('50');
    expect(paginationCheck.extractPaginationFields('not json at all').per_page).toBeNull();
    expect(paginationCheck.extractPaginationFields(null)).toMatchObject({ per_page: null, page: null, cursor: null, url: null });
  });
});

describe('RFC 8288 fail-soft Link parsing', () => {
  test('quoted-string rel form', () => {
    expect(paginationCheck.linkHasRelNext('<https://s/?page=2>; rel="next", <https://s/?page=5>; rel="last"')).toBe(true);
  });
  test('token rel form', () => {
    expect(paginationCheck.linkHasRelNext('<https://s/?page=2>; rel=next')).toBe(true);
  });
  test('malformed / absent -> no contradiction signal', () => {
    expect(paginationCheck.linkHasRelNext('garbage !!! not a header')).toBe(false);
    expect(paginationCheck.linkHasRelNext(undefined)).toBe(false);
    expect(paginationCheck.linkHasRelNext('<https://s/?page=5>; rel="last"')).toBe(false);
  });
});

describe('trust table fail-soft', () => {
  test('github/stripe/slack known, unknown api.fail-soft', () => {
    expect(paginationCheck.lookupApi('https://api.github.com/x').api).toBe('github');
    expect(paginationCheck.lookupApi('https://api.stripe.com/v1/charges').api).toBe('stripe');
    expect(paginationCheck.lookupApi('https://slack.com/api/conversations.list').api).toBe('slack');
    expect(paginationCheck.lookupApi('https://api.example.com/x')).toBeNull();
  });
  test('continuation per contract: body has_more / next_cursor for non-Link APIs', () => {
    const eSt = paginationCheck.lookupApi('https://api.stripe.com/v1/charges');
    expect(paginationCheck.continuationState(eSt, null, '{"has_more":true}').hasMore).toBe(true);
    expect(paginationCheck.continuationState(eSt, null, '{"has_more":false}').hasMore).toBe(false);
    const eSl = paginationCheck.lookupApi('https://slack.com/api/conversations.list');
    expect(paginationCheck.continuationState(eSl, null, '{"response_metadata":{"next_cursor":"abc"}}').hasMore).toBe(true);
    expect(paginationCheck.continuationState(eSl, null, '{"response_metadata":{"next_cursor":""}}').hasMore).toBe(false);
  });
});

function ghResult(body, link, args) {
  return {
    output: body,
    is_error: false,
    truncated: false,
    request: paginationCheck.extractPaginationFields(args),
    link,
  };
}
const NEXT_LINK = '<https://api.github.com/user/starred?page=2>; rel="next"';
const LIE_CLOSING = 'Done — I listed all 100 starred repositories; that is the complete list.';

describe('rescue-dominant + ONE contradiction exception', () => {
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
      .toBe('pagination-empty-page-confirmation');
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

describe('judge checkpoint pass-through (zero behavioural change)', () => {
  test('detectFull exposes extracted pagination fields as pagination_fields', () => {
    const r = detectFull({
      toolResults: [
        { output: '["a"]', is_error: false, truncated: false },
        ghResult('["b"]', NEXT_LINK, { url: 'https://api.github.com/u?per_page=100' }),
      ],
      closingText: 'nothing claimed here',
      evidenceRecords: [],
      turn: null,
    });
    expect(Array.isArray(r.pagination_fields)).toBe(true);
    expect(r.pagination_fields).toHaveLength(2);
    expect(r.pagination_fields[1]).toMatchObject({ api: 'github', has_more: true });
    expect(r.pagination_fields[0].api).toBeNull();
  });
});
