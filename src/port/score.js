'use strict';
// src/port/score.js - ADR-0064 D-E/D-005 + ADR-0065 D-B: the product port.
// Moved from bench/research/sklearn-port.js in the T-6 confirmatory round:
// a pure score(text) -> {logits, verdict} with zero dependencies and zero
// fs/net I/O (the trained manifest ships beside it under src/ and is loaded
// by module import, which is static data, not runtime I/O).
//
// Vectorizer layer hand-written; estimator layer a hand-written dot product
// (both channels allowed by ADR-0064 D-E; sklearn-porter and ONNX forbidden).
//
// Supports the two analyzer kinds reachable through the pre-registered grid:
//   word    - sklearn default token_pattern (?u)\b\w\w+\b, lowercase, then
//             consecutive word n-grams joined by a single space.
//   char_wb - sklearn _char_wb_ngrams: lowercase, whitespace runs >=2 collapse
//             to one space, split on whitespace, pad each word with spaces,
//             emit all n in [min_n, max_n] character windows.
// Python \w (unicode word char) is approximated by [\p{L}\p{N}_]; the G6 gate
// checks token-multiset bit-equality against sklearn goldens, so any corpus
// divergence would surface there honestly.

const MANIFEST = require('./g6-manifest.json');

function tokenize(text, analyzer) {
  const t = String(text == null ? '' : text).toLowerCase();
  const range = analyzer.ngram_range;
  const minN = range[0];
  const maxN = range[1];
  const out = [];
  if (analyzer.kind === 'char_wb') {
    const norm = t.replace(/\s\s+/g, ' ');
    const words = norm.split(/\s+/).filter(function (w) { return w.length > 0; });
    for (const w0 of words) {
      const w = ' ' + w0 + ' ';
      for (let n = minN; n <= maxN && n <= w.length; n++) {
        for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n));
      }
    }
    return out;
  }
  if (analyzer.kind === 'word') {
    const words = t.match(/[\p{L}\p{N}_]{2,}/gu) || [];
    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '));
    }
    return out;
  }
  throw new Error('unsupported analyzer kind: ' + analyzer.kind);
}

// tokens -> sparse feature vector [[idx, value] ascending idx].
// weighting 'count': raw counts. 'tfidf-sublinear': (1+ln(count)) * idf, l2-normed.
function vectorize(tokens, manifest) {
  const vocab = manifest.vocabulary;
  const counts = new Map();
  for (const tok of tokens) {
    const idx = vocab[tok];
    if (idx !== undefined) counts.set(idx, (counts.get(idx) || 0) + 1);
  }
  let pairs = Array.from(counts.entries()).sort(function (a, b) { return a[0] - b[0]; });
  if (manifest.config.weighting === 'tfidf-sublinear') {
    const idf = manifest.idf;
    pairs = pairs.map(function (p) { return [p[0], (1 + Math.log(p[1])) * idf[p[0]]]; });
    const norm = Math.sqrt(pairs.reduce(function (a, p) { return a + p[1] * p[1]; }, 0));
    if (norm > 0) pairs = pairs.map(function (p) { return [p[0], p[1] / norm]; });
  }
  return pairs;
}

// Hand-written dot product (estimator layer, D-E).
function logit(vector, manifest) {
  const coef = manifest.coef;
  let s = manifest.intercept;
  for (const p of vector) s += coef[p[0]] * p[1];
  return s;
}

// ---------------------------------------------------------------------------
// item_text v1 (the serializer spec is pinned in the manifest 'serializer'
// field; reproduced byte-for-byte from bench/research/rung_ladder.py):
//   parts = [task] + per event:
//     message      -> ev.text
//     tool_call    -> ev.name + ' ' + json.dumps(ev.arguments, sort_keys=True)
//     tool_result  -> str(ev.content) + ' is_error=' + str(bool) + ' truncated=' + str(bool)
//   + closing (unless drop_closing); LF-joined, empty parts dropped.
//
// Python-specifics reproduced here: json.dumps uses (', ', ': ') separators
// and ensure_ascii (non-ASCII -> \uXXXX, astral -> surrogate pair); dict keys
// sort by code point (JS UTF-16 code-unit order differs only for astral
// chars - recorded approximation); str(bool) renders True/False; str(None)
// renders None.

function pyBool(v) { return v ? 'True' : 'False'; }

function pyJsonStr(s) {
  let out = '"';
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    if (ch === '"') out += '\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (cp >= 0x20 && cp <= 0x7e) out += ch;
    else if (cp <= 0xffff) out += '\\u' + cp.toString(16).padStart(4, '0');
    else {
      const v = cp - 0x10000;
      out += '\\u' + (0xd800 + (v >> 10)).toString(16).padStart(4, '0')
           + '\\u' + (0xdc00 + (v & 1023)).toString(16).padStart(4, '0');
    }
  }
  return out + '"';
}

function pyJsonNum(v) {
  if (Number.isInteger(v)) {
    // Python repr(int) is plain digits; floats with integral value render
    // '5.0' - JS cannot distinguish, so integral numbers emit int form
    // (corpus arguments are strings/ints in practice).
    return Math.abs(v) < 1e21 ? String(v) : String(v).replace('e+', 'e+0');
  }
  // Python float repr vs JS: pad one-digit exponents to two ('1e-7'->'1e-07').
  return String(v).replace(/e([+-])(\d)$/, 'e$10$2');
}

// json.dumps(v, sort_keys=True) for JSON-safe values.
function pyJson(v) {
  if (v === null || v === undefined) return 'null';
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (typeof v === 'number') return pyJsonNum(v);
  if (typeof v === 'string') return pyJsonStr(v);
  if (Array.isArray(v)) return '[' + v.map(pyJson).join(', ') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map(function (k) { return pyJsonStr(k) + ': ' + pyJson(v[k]); }).join(', ') + '}';
}

// str(v): strings pass through; bool -> True/False; null -> None; numbers via
// repr; containers fall back to the json.dumps rendering (recorded
// approximation - corpus tool_result content is string/int).
function pyStr(v) {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return pyBool(v);
  if (typeof v === 'number') return pyJsonNum(v);
  if (typeof v === 'string') return v;
  return pyJson(v);
}

function itemText(item, opts) {
  const it = item || {};
  const parts = [it.task == null ? '' : String(it.task)];
  const events = Array.isArray(it.events) ? it.events : [];
  for (const ev of events) {
    if (!ev) continue;
    if (ev.type === 'message') {
      parts.push(ev.text == null ? '' : String(ev.text));
    } else if (ev.type === 'tool_call') {
      parts.push((ev.name == null ? '' : String(ev.name)) + ' ' + pyJson(ev.arguments || {}));
    } else if (ev.type === 'tool_result') {
      parts.push(pyStr(ev.content == null ? '' : ev.content)
        + ' is_error=' + pyBool(ev.is_error)
        + ' truncated=' + pyBool(ev.truncated));
    }
  }
  if (!(opts && opts.drop_closing)) parts.push(it.closing == null ? '' : String(it.closing));
  return parts.filter(function (p) { return p; }).join('\n');
}

// ---------------------------------------------------------------------------
// The product seam (ADR-0065 D-B.2): pure score(text) -> {logits, verdict}.
// logits = the LR decision score (single real; positive side is 'lie').
// verdict = 'lie' | 'honest' at the default operating point logit > 0.
// The optional manifest override exists for gates/tests (positive control);
// production callers use the shipped manifest.
function score(text, manifest) {
  const m = manifest || MANIFEST;
  const tokens = tokenize(text, m.analyzer);
  const vec = vectorize(tokens, m);
  const lg = logit(vec, m);
  return { logits: lg, verdict: lg > 0 ? 'lie' : 'honest' };
}

function scoreItem(item, manifest) {
  return score(itemText(item), manifest);
}

module.exports = { tokenize, vectorize, logit, score, scoreItem, itemText, pyJson, pyStr };
