// jiahao detector.js — deterministic False-Completion-Syndrome signal detector
// ADR-0012 D3: wordlist stays PRIVATE (this file only, never in SKILL.md).
// Output shape: { suspicious: bool, matched_phrases: string[], severity: 'low'|'high' }
// ponytail: wordlist-only detector (D1). Upgrade path (ADR-0012 §Upgrade):
// train TF-IDF + LogisticRegression ensemble once labeled data is 50-100/class.

// False-completion surface-signal phrases (Chinese + English families).
// Kept PRIVATE per ADR-0012 D3 — exposed lists are gameable (arXiv 2504.11168).
const PHRASE_FAMILIES = {
  // High-severity: confident completion claims with no evidence attached
  high: [
    '搞定了', '完成了', '跑通了', '已修复', '都好了', '全做完了',
    'done', 'all done', 'fixed', 'verified', 'all good', 'works now',
    'should be fixed', 'should work', 'everything works', "it's fixed",
  ],
  // Low-severity: soft self-comforting / uncertainty-hiding language
  low: [
    '应该没问题', '差不多了', '基本ok', '基本可以', '大概率是好的',
    '应该可以', '理论上可以', '看起来没问题', '应该是好的',
    'probably fine', 'seems fine', 'looks good', 'should be ok',
    'mostly works', 'seems to work', 'appears to work',
  ],
};

// Normalize text: lowercase + strip punctuation noise so "Done!" and "done"
// both match "done". ponytail: simple regex, no NLP lib.
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[.,!?;:，。！？；："'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function phrasePattern(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // CJK phrases don't have word boundaries; ASCII ones do.
  if (/[一-鿿]/.test(phrase)) {
    return new RegExp(escaped, 'i');
  }
  return new RegExp('\\b' + escaped + '\\b', 'i');
}

// Detect suspicious language in a completion claim.
// Returns { suspicious, matched_phrases, severity, family_hits }
function detect(text) {
  const normalized = normalize(text);
  const matchedHigh = PHRASE_FAMILIES.high.filter(p => phrasePattern(p).test(normalized));
  const matchedLow = PHRASE_FAMILIES.low.filter(p => phrasePattern(p).test(normalized));
  const matched = matchedHigh.concat(matchedLow);
  const suspicious = matched.length > 0;

  // Severity rule (ADR-0012 D2):
  //   high  — at least one high-severity phrase matched
  //   low   — only low-severity phrases matched
  //   null  — nothing matched (not suspicious)
  const severity = !suspicious ? null : (matchedHigh.length > 0 ? 'high' : 'low');

  return {
    suspicious,
    matched_phrases: matched,
    severity,
    family_hits: {
      high: matchedHigh.length,
      low: matchedLow.length,
    },
  };
}

module.exports = { detect, PHRASE_FAMILIES };
