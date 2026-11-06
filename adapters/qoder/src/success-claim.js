'use strict';
// src/success-claim.js — the completion-claim side of the detector, lifted out
// verbatim (#124). The Stop gate reads this turn's own words to decide whether
// the turn CLAIMS done at all, and the gate is vendored into every host bundle
// with a static require() closure that must stay free of third-party runtime
// dependencies — detector.js drags in request-anchors (http-link-header), so
// the gate requires this module instead and detector re-uses it from here.
//
// Two functions, two roles (do not merge them):
//   hasSuccessClaim   — the detector's triage signal, byte-identical to the
//     original detector.js definition: sentence-level negation scope, full
//     recall. detector.test.js pins honest-twin sentences ("Done editing,
//     though the tests are still un-run") against it; moving it would rewrite
//     that contract.
//   claimsCompletion  — the GATE arbiter (#124 review, CodeRabbit round 1).
//     The gate lets a turn through on "no claim", so this one may not
//     under-block: negation is scoped to the clause it sits in (an unrelated
//     "not flaky" no longer suppresses the claim in the same sentence), and
//     the standalone words that double as ordinary prose — 通过 / 可用 /
//     works / passing — only count when they carry a completion context
//     ("测试通过", "可用了", "it works" but not "it works by reading…",
//     "passing" but not "the passing rate"). Over-blocking stays the safe
//     direction: a genuine claim that slips past this function only loses the
//     gate's tightening, never fabricates a block.

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

// ---- claimsCompletion: the gate arbiter (#124) ----------------------------

// Unambiguous claim words: in ordinary prose they almost always announce a
// finished state. The ambiguous four (works / passing / 通过 / 可用) are
// judged by AMBIENT_CLAIM_RE below, never by this list.
const STRONG_CLAIM_RE = /\b(all done|done|complete(?:d)?|fixed|verified|works now|all good)\b|\u641e\u5b9a|\u5b8c\u6210|\u8dd1\u901a|\u5df2\u4fee\u590d|\u90fd\u597d\u4e86|\u5168\u90e8\u9a8c\u8bc1\u901a\u8fc7/i;

// The ambiguous four, each requiring its completion context:
//   通过   — a verification subject (测试/验证/检查/校验/构建/编译) right
//            before it, or the aspect marker 了 ("通过了"). "这个配置通过
//            .jiahao-profile 读取" stays prose.
//   可用   — only with an aspect marker ("可用了", "已可用"). "这条命令可用"
//            as a status line stays prose.
//   works  — not followed by a mechanism preposition ("works by reading…" is
//            a description of how something works, not an announcement).
//   passing — not followed by a graded noun ("the passing rate" is prose).
//             "tests (are) passing" is covered by the tests-subject form.
const AMBIENT_CLAIM_RE = /(?:\u6d4b\u8bd5|\u9a8c\u8bc1|\u68c0\u67e5|\u6821\u9a8c|\u6784\u5efa|\u7f16\u8bd1)\s*\u901a\u8fc7|\u901a\u8fc7\u4e86|\u53ef\u7528\u4e86|\u5df2\u53ef\u7528|\bworks\b(?!\s+(?:by|with|when|as|like)\b)|\btests?\s+pass(?:ed|ing)?\b|\bpassing\b(?!\s+(?:rate|grade|score|note)\b)/i;

// Clause splitters: sentence punctuation plus the clause punctuation that
// hosts' CJK messages use for coordinate clauses (，、；) and the dashes that
// carry English asides ("done — not blocked by the proxy").
const CLAUSE_SPLIT_RE = /[\uff0c\u3001\uff1b\uff1a;:,]|\s+\u2014\s+|\s+\u2013\s+/;

function clauseClaims(clause) {
  return (STRONG_CLAIM_RE.test(clause) || AMBIENT_CLAIM_RE.test(clause)) &&
    !FAILURE_DISCLOSURE_RE.test(clause);
}

function claimsCompletion(text) {
  const raw = String(text || "");
  if (!raw) return false;
  if (PREV_VERIFIED_RE.test(raw)) return true;
  const sentences = raw.split(/(?<=[.!?])\s+|\r?\n+/);
  return sentences.some(sentence => sentence.split(CLAUSE_SPLIT_RE).some(clauseClaims));
}

module.exports = {
  hasSuccessClaim: hasSuccessClaim,
  claimsCompletion: claimsCompletion,
  PREV_VERIFIED_RE: PREV_VERIFIED_RE,
};
