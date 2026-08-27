// src/request-anchors.js — Request-side anchor extraction (ADR-0021).
// Closed extraction quad (D4): per_page, page/cursor, Link(rel). Unknown
// fields are ignored (fail-soft). Generic URL semantics are NOT inferred;
// only the three named params are read, whether the adapter hands an
// arguments object, a JSON string, or a URL (per-case narrowing: adapters
// translate, never rewrite).
//
// Trust table (D3.1): conviction is enabled per-API only for publishers
// contractually emitting a server-authoritative continuation signal:
//   github: Link header rel=next
//   stripe: body has_more === true
//   slack:  body response_metadata.next_cursor non-empty
// Unknown APIs fail-soft (no conviction, no rescue on absence). Governance
// of this table rides the ADR-0018 calibration flywheel.
//
// Link parsing uses http-link-header (RFC 8288, token + quoted-string rel
// forms); malformed input throws there and is fail-soft here (D3.4).

const LinkHeader = require('http-link-header');

const TRUST_TABLE = [
  { api: 'github', hosts: ['api.github.com'], continuation: 'rel-next' },
  { api: 'stripe', hosts: ['api.stripe.com'], continuation: 'has-more' },
  { api: 'slack', hosts: ['slack.com', 'api.slack.com'], continuation: 'next-cursor' },
];

const PARAM_KEYS = ['per_page', 'page', 'cursor'];

function lookupApi(url) {
  if (typeof url !== 'string' || url.length === 0) return null;
  let host;
  try { host = new URL(url).hostname; } catch (e) { return null; }
  for (const entry of TRUST_TABLE) {
    if (entry.hosts.some(h => host === h || host.endsWith('.' + h))) return entry;
  }
  return null;
}

// Read ONLY the three named params from an arguments value (object, JSON
// string, or a bare/nested URL). Everything else is ignored by design.
function extractQuad(args) {
  const quad = { per_page: null, page: null, cursor: null, url: null };
  if (args == null) return quad;
  let obj = args;
  if (typeof obj === 'string') {
    const s = obj.trim();
    if (s[0] === '{' || s[0] === '[') { try { obj = JSON.parse(s); } catch (e) { obj = s; } }
  }
  let url = null;
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of PARAM_KEYS) {
      if (obj[k] != null && typeof obj[k] !== 'object') quad[k === 'per_page' ? 'per_page' : k] = String(obj[k]);
    }
    if (typeof obj.url === 'string') url = obj.url;
  } else if (typeof obj === 'string' && /^(https?:)?\/\//.test(obj.trim())) {
    url = obj.trim();
  }
  if (url) {
    quad.url = url;
    try {
      const u = new URL(url.startsWith('//') ? 'https:' + url : url);
      for (const k of PARAM_KEYS) {
        const v = u.searchParams.get(k);
        if (v != null && quad[k === 'per_page' ? 'per_page' : k] == null) quad[k === 'per_page' ? 'per_page' : k] = v;
      }
    } catch (e) { /* fail-soft: URL unparseable, keep named keys already found */ }
  }
  return quad;
}

// D3.4: both rel forms accepted; malformed/absent -> null (never convict).
function linkHasRelNext(linkHeader) {
  if (typeof linkHeader !== 'string' || linkHeader.length === 0) return false;
  try { return LinkHeader.parse(linkHeader).has('rel', 'next'); }
  catch (e) { return false; }
}

function bodyJson(content) {
  if (typeof content !== 'string') return null;
  const s = content.trim();
  if (s[0] !== '{' && s[0] !== '[') return null;
  try { return JSON.parse(s); } catch (e) { return null; }
}

// Server-authoritative continuation state for a trusted API result.
// Returns { known:false } for untrusted/unknown endpoints (fail-soft,
// D3.1), otherwise { known:true, api, hasMore }.
function continuationState(entry, linkHeader, content) {
  if (!entry) return { known: false, api: null, hasMore: null };
  if (entry.continuation === 'rel-next') {
    return { known: true, api: entry.api, hasMore: linkHasRelNext(linkHeader) };
  }
  const body = bodyJson(content);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { known: true, api: entry.api, hasMore: null }; // body absent: no signal read
  }
  if (entry.continuation === 'has-more') {
    return { known: true, api: entry.api, hasMore: body.has_more === true ? true : (body.has_more === false ? false : null) };
  }
  // next-cursor
  const meta = body.response_metadata;
  const nc = meta && typeof meta.next_cursor === 'string' ? meta.next_cursor : null;
  if (nc == null) return { known: true, api: entry.api, hasMore: null };
  return { known: true, api: entry.api, hasMore: nc.length > 0 };
}

// D3.2 empty/terminal page: empty JSON array body, or the trust-table API's
// own terminal signal (hasMore === false).
function isTerminalPage(entry, content) {
  const body = bodyJson(content);
  if (Array.isArray(body)) return body.length === 0;
  if (entry) {
    const st = continuationState(entry, null, content);
    if (st.hasMore === false) return true;
  }
  return false;
}

module.exports = { TRUST_TABLE, extractQuad, linkHasRelNext, lookupApi, continuationState, isTerminalPage };
