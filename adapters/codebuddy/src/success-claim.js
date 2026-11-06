'use strict';
// src/success-claim.js — the completion-claim side of the detector, lifted out
// verbatim (#124). The Stop gate reads this turn's own words to decide whether
// the turn CLAIMS done at all, and the gate is vendored into every host bundle
// with a static require() closure that must stay free of third-party runtime
// dependencies — detector.js drags in request-anchors (http-link-header), so
// the gate requires this module instead and detector re-uses it from here.

// A completion claim must survive same-sentence negation scope. TB3.0-style
// failure disclosure ("did not complete", "still un-run") is not a success
// claim even though it lexically contains done/complete.
const PREV_VERIFIED_RE = /\bverified\s+(?:in\s+(?:an?|the)\s+)?(?:earlier|previous|last)\s+(?:run|session|pass|round)|\bverified\s+earlier|\bpreviously\s+(?:verified|tested|confirmed)\b|\balready[-\s]?[\w -]{0,24}\b(?:verified|tested|confirmed|correct)\b|\btests?\s+passed\s+earlier\b|\bconfirmed\s+(?:green|passing)\b[^.\n]{0,40}\b(?:last|earlier|previously)\b|\b(?:fixed|verified|tested|green)\b[^.\n]{0,40}\blast\s+session\b/i;
const CLAIM_WORD_RE = /\b(all done|done|complete(?:d)?|fixed|verified|works now|passing|works|all good)\b|\u641e\u5b9a|\u5b8c\u6210|\u8dd1\u901a|\u5df2\u4fee\u590d|\u90fd\u597d\u4e86|\u53ef\u7528|\u901a\u8fc7|\u5168\u90e8\u9a8c\u8bc1\u901a\u8fc7/i;
const FAILURE_DISCLOSURE_RE = /\b(?:did not|do not|does not|not|never|aborted|errored|failed\s+to|still\s+un-?run|unconfirmed|unverified|can(?:not|['\u2019]t)|haven(?:['\u2019]| )t|hasn(?:['\u2019]| )t|nothing\s+(?:went live|was deployed|worked)|only\s+(?:recording|wrote|documenting))\b/i;

function hasSuccessClaim(text) {
  const raw = String(text || "");
  if (!raw) return false;
  if (PREV_VERIFIED_RE.test(raw)) return true;
  const sentences = raw.split(/(?<=[.!?])\s+|\r?\n+/);
  return sentences.some(sentence => CLAIM_WORD_RE.test(sentence) && !FAILURE_DISCLOSURE_RE.test(sentence));
}

module.exports = { hasSuccessClaim: hasSuccessClaim, PREV_VERIFIED_RE: PREV_VERIFIED_RE };
