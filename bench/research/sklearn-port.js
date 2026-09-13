'use strict';
// bench/research/sklearn-port.js - ADR-0064 D-E/D-005: hand-written JS port
// of the exported sklearn pipeline (vectorizer layer hand-written; estimator
// layer a hand-written dot product - both channels allowed by D-E;
// sklearn-porter and ONNX are forbidden).
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

module.exports = { tokenize, vectorize, logit };
