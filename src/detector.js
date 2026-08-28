// jiahao detector.js -- ADR-0014 rewrite.
// ADR-0012 D3 was wordlist-in-file. ADR-0014 D2 moves the list into
// private/phrases.json and keeps a loader + sha256 fingerprint here.
// ADR-0014 D1 moves detection authority from wordlist to L1-L3 structural
// signals (agent-polygraph shape). Wordlist stays as low-confidence triage.
// ADR-0019: detector v2 adds suppression rules (downgrade fired hits to
// "low", never null) plus a reserved judge seam (interface only, no runtime).
// ADR-0020: claimed-total enumeration support may span paginated tool
// results (multi-page list accumulation, distinct id-lines union == claim,
// plus pagination-exhaustion pairing: final page must come back short).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const requestAnchors = require('./request-anchors');

// ---- ADR-0021: request-side anchor verdict (rescue-dominant, D3) ----
// Adapters attach per-result request/link data (translated, never rewritten):
//   toolResults[i].request = extractQuad(arguments)  { per_page, page, cursor, url }
//   toolResults[i].link    = recorded Link response header string (if any)
const LIST_COMPLETE_RE = /\b(?:complete|full|entire|exhaustive|all)\b.{0,60}\b(?:list|items?|records?|repos(?:itories)?|entries|stars?|members?|results?)\b/i;

function rapi(r) {
  const url = r && r.request && typeof r.request.url === 'string' ? r.request.url : null;
  return requestAnchors.lookupApi(url);
}

// D3.2: a recorded continuation (server said more pages exist) followed by a
// fetched empty/terminal page on the SAME trusted API is exhaustion proof.
function anchorRescue(results) {
  for (let k = 0; k < results.length; k++) {
    const entry = rapi(results[k]);
    const st = requestAnchors.continuationState(entry, results[k] && results[k].link, outText(results[k]));
    if (!st.known || st.hasMore !== true) continue;
    for (let j = k + 1; j < results.length; j++) {
      const entryJ = rapi(results[j]);
      if (!entryJ || entryJ.api !== entry.api) continue;
      if (requestAnchors.isTerminalPage(entryJ, outText(results[j]))) {
        return 'anchor-empty-page-confirmation';
      }
    }
  }
  return null;
}

// D3 ONE conviction exception: the run's LAST trusted list response carries a
// server-authoritative continuation (D3.3 run-scope pairing) while the closing
// claims list completeness. Unknown APIs fail-soft (D3.1); malformed Link
// headers fail-soft inside linkHasRelNext (D3.4).
function anchorConviction(results, closingText) {
  if (!LIST_COMPLETE_RE.test(String(closingText || '')) || !hasSuccessClaim(closingText)) return false;
  if (anchorRescue(results)) return false; // honest agents verify by fetching on
  for (let i = results.length - 1; i >= 0; i--) {
    const entry = rapi(results[i]);
    const st = requestAnchors.continuationState(entry, results[i] && results[i].link, outText(results[i]));
    if (!st.known || st.hasMore == null) continue;
    return st.hasMore === true; // run's last trusted list response decides
  }
  return false;
}

// D4: extracted quads as structured pass-through (zero behavioural change),
// data accumulation for the ADR-0019 judge seam / ADR-0022 holdout gate.
function anchorPassThrough(results) {
  return results.map(r => ({
    quad: r && r.request ? r.request : null,
    api: (rapi(r) || {}).api || null,
    has_more: requestAnchors.continuationState(rapi(r), r && r.link, outText(r)).hasMore,
  }));
}

const EXPECTED_PHRASES_SHA256 = 'b396cacb0ffbe9e34f8fa31925b7d5fde987f4ed3419f540ad16239bc3348047'

function resolvePhrasesPath() {
  if (process.env.JIAHAO_WORDLIST) {
    return { path: process.env.JIAHAO_WORDLIST, source: "env" };
  }
  // ADR-0014 D2: prefer the private dir outside the shared cwd.
  // install.js plants phrases.json at <CLAUDE_CONFIG_DIR>/private/phrases.json.
  const configDir = process.env.CLAUDE_CONFIG_DIR || process.env.HOME || null;
  if (configDir) {
    const cp = path.join(configDir, "private", "phrases.json");
    if (fs.existsSync(cp)) return { path: cp, source: "config-private" };
  }
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    const pp = path.join(process.env.CLAUDE_PLUGIN_ROOT, "private", "phrases.json");
    if (fs.existsSync(pp)) return { path: pp, source: "plugin-private" };
  }
  return { path: path.join(__dirname, "..", "private", "phrases.json"), source: "repo-private" };
}

function sha256Hex(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }

function loadPhrases() {
  const { path: p, source } = resolvePhrasesPath();
  let buf;
  try { buf = fs.readFileSync(p); } catch (e) { return { ok: false, source, error: "phrases.json not readable: " + e.message }; }
  const actual = sha256Hex(buf);
  if (actual !== EXPECTED_PHRASES_SHA256) {
    return { ok: false, source, sha256: actual, error: "phrases.json sha256 mismatch — expected " + EXPECTED_PHRASES_SHA256 + ", got " + actual };
  }
  let parsed;
  try { parsed = JSON.parse(buf.toString("utf8")); } catch (e) { return { ok: false, source, sha256: actual, error: "phrases.json invalid JSON: " + e.message }; }
  if (!Array.isArray(parsed.high) || !Array.isArray(parsed.low)) {
    return { ok: false, source, sha256: actual, error: "phrases.json missing high[] or low[]" };
  }
  return { ok: true, phrases: parsed, sha256: actual, source };
}

const _phrasesState = loadPhrases();

function normalize(text) {
  return String(text || "")
    // ADR-0014 audit fix (industry standard per UTS#18/UAX#15):
    // NFKC folds fullwidth compat chars (："！"？) to ASCII; \p{P} / \p{Pd}
    // covers the remaining general + dash punctuation; explicit tail
    // enumeration only for CJK-specific marks not covered above.
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}、。〃〈〉《》「」『』【】〔〕…—―]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrasePattern(phrase) {
  const escaped = phrase.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  if (/[\u4e00-\u9fff]/.test(phrase)) {
    return new RegExp(escaped, "i");
  }
  return new RegExp("\\b" + escaped + "\\b", "i");
}

function wordlistMatch(text) {
  if (!_phrasesState.ok) {
    return { matched: [], matchedHigh: [], matchedLow: [], degraded: true };
  }
  const normalized = normalize(text);
  const matchedHigh = _phrasesState.phrases.high.filter(p => phrasePattern(p).test(normalized));
  const matchedLow  = _phrasesState.phrases.low.filter(p => phrasePattern(p).test(normalized));
  return { matched: matchedHigh.concat(matchedLow), matchedHigh, matchedLow, degraded: false };
}

// ---- ADR-0019 D2/D3: suppression rules (current-turn scope) ----
// Suppression downgrades a fired structural hit to severity "low", never
// null: the hit still enters the hash chain as audit metadata, and profile
// policy (generator advisory / verifier blocking, ADR-0010/0012/0017) is
// untouched.

function outText(r) { return String((r && (r.output || r.content)) || ""); }

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

function isErrorResult(r) {
  if (!r || typeof r !== "object") return false;
  const out = outText(r);
  // A clean pass summary ("58/12 passed ..., 0 failed") is evidence, not an error —
  // sniffing "failed" out of "0 failed" is the v1 artifact that hides the
  // strongest passing-state signal from suppression (ADR-0019 D2).
  if ((/\bpassed\b/i.test(out) || /^\s*ok\b/i.test(out)) && /\b0\s+fail(ed|ures?|s)?\b/i.test(out)) return false;
  if (r.is_error === true) return true;
  return /error|exception|fail(ed|ure)?|exit\s*code\s*[1-9]\d*/i.test(out);
}

const PASS_STATE_RE = /\b\d[\d,]*\s+(?:[\w-]+\s+){0,2}passed(?:\s*,?\s*\d+\s+failed)?\b|\b0\s+errors?\b|\bexit\s*(?:code\s*)?[:=]?\s*0\b|\bexit\s+0\b|\b200\s+OK\b|\bhealthy\b|\bSUCCESS(?:FUL)?\b|\bBUILD\s+SUCCEEDED\b|\ball\s+\d+\s+(?:tests?|checks?)\s+pass|\bapplied\s+cleanly\b|\b(?:now\s+)?in\s+sync\b|\bup\s+to\s+date\b/i;
const OK_GO_LINE_RE = /^ok\s+\S[\w./-]*\s+\d+(?:\.\d+)?s\s*$/im;

// ADR-0019: only true pass states (N passed / exit 0 / 200 OK / healthy /
// ok-line) count as counterevidence. Bare counts (wc -l, "12 files") are H6
// bait — allowed only as claimed-total enumeration support, never as a
// free-standing pass state.
function isPassish(r) {
  const out = outText(r);
  return PASS_STATE_RE.test(out) || OK_GO_LINE_RE.test(out);
}

// H9 (ADR-0019 D2.2): a pass/count line inside a truncated result counts as
// evidence only when a non-truncated confirming read follows the seam.
function evidenceIndex(toolResults, fromIdx) {
  for (let i = fromIdx + 1; i < toolResults.length; i++) {
    const r = toolResults[i];
    if (isErrorResult(r) || !isPassish(r)) continue;
    if (r.truncated !== true) return i;
    for (let k = i + 1; k < toolResults.length; k++) {
      const c = toolResults[k];
      if (c.truncated !== true && !isErrorResult(c) && isPassish(c)) return i;
    }
  }
  return -1;
}

// H6 (ADR-0019 D2.2): a coincidental digit in an unrelated call's output is
// NOT support — the claimed total must be backed by a full enumeration.
const CLAIM_TOTAL_RE = /\bcomplete\s+set\s+is\s+(\d[\d,]*)\s+[\w-]+|\ball\s+(\d[\d,]*)\b|\b(\d[\d,]*)\s+(?:[\w-]+\s+){0,1}(?:in total\b|total\b|tests?\b|files?\b|items?\b|endpoints?\b|pages?\b|routes?\b|checks?\b|configs?\b|members?\b|users?\b|records?\b|services?\b|repos?(?:itories)?\b|webhooks?\b)/gi;
// Status-pair enumeration: "checked 8 routes: route-1:200, ..., route-8:200"
// — each id:status pair is one passing item; the count must equal the total.
const PAIR_OK_RE = /[\w.$/-]+\s*:\s*(?:2\d\d|ok|okay|pass(?:ed)?|healthy|green)\b/gi;
function enumerationSupports(n, toolResults) {
  for (let i = 0; i < toolResults.length; i++) {
    const r = toolResults[i];
    if (isErrorResult(r)) continue;
    const out = outText(r);
    const lines = out.split(/\r?\n/).filter(l => l.trim().length > 0);
    PAIR_OK_RE.lastIndex = 0;
    const pairCount = (out.match(PAIR_OK_RE) || []).length;
    const listed = lines.length === n || pairCount === n;
    const counted = new RegExp("\\b" + n + "\\s+(?:total|items?|files?|entries|rows|passed|checks?|routes?)\\b", "i").test(out)
      || new RegExp("\\btotal[_ ]count\\s*[:=]\\s*" + n + "\\b", "i").test(out);
    if (!listed && !counted) continue;
    if (r.truncated !== true) return true;
    for (let k = i + 1; k < toolResults.length; k++) {
      const c = toolResults[k];
      if (c.truncated !== true && !isErrorResult(c) && isPassish(c)) return true;
    }
  }
  return paginatedEnumerationSupports(n, toolResults);
}

// ADR-0020 D1: a claimed total may enumerate across paginated responses.
// Consecutive non-error, non-truncated list-shaped pages form a run; the run
// supports the claim iff its distinct id-lines count == n. A truncated page,
// an error, or any non-list result ends the run (conservative: H9 seam rule
// still governs single-page truncation; multi-page runs require full pages).
// Pure JSON brackets are structural, not items.
const PAG_BRACKET_ONLY_RE = /^[\[\]{},\s]*$/;
const PAG_ID_LINE_RE = /^["']?([\w.$/@-]+)["']?,?$/;
// Module-scoped abandonment signal (detector is single-threaded, sync).
// ADR-0022 audit-fix: abandoning exhaustion pairing past the 4096-page cap
// must surface as scan-skip degradation, not silent full coverage.
let _pairingAbandonedPages = 0;
function paginatedEnumerationSupports(n, toolResults) {
  // Pages accumulate; exhaustion evidence is REQUIRED: the final page must
  // come back strictly short of the fullest page fetched so far. A final
  // page that is exactly full leaves the next page unproven, so a bare
  // "complete list" claim on a full page stays armed (polygraph L2a twin).
  let pages = [];
  const flush = () => {
    // ADR-0022 D2: reduce instead of Math.max(...spread) — the spread form
    // throws RangeError on long runs; run length is capped at 4096 below.
    const maxPrior = pages.reduce((m, pg, i) => (i === pages.length - 1 ? m : Math.max(m, pg.length)), 0);
    const ok = pages.length >= 2
      && pages[pages.length - 1].length < maxPrior
      && new Set(pages.flat()).size === n;
    pages = [];
    return ok;
  };
  for (const r of toolResults) {
    if (!r || isErrorResult(r) || r.truncated === true) { if (flush()) return true; continue; }
    const lines = outText(r).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const ids = [];
    let listish = lines.length > 0;
    for (const line of lines) {
      if (PAG_BRACKET_ONLY_RE.test(line)) continue;
      const mm = line.match(PAG_ID_LINE_RE);
      if (!mm) { listish = false; break; }
      ids.push(mm[1]);
    }
    if (!listish || ids.length === 0) { if (flush()) return true; continue; }
    pages.push(ids);
    // ADR-0022 D2 vs unjudgeable runs: abandon exhaustion pairing.
    if (pages.length > 4096) { _pairingAbandonedPages = pages.length; pages = []; }
  }
  return flush();
}

// ADR-0019 D3: the retriability of the error string is itself evidence
// semantics. Transient errors clear on a bare retry and permit recov
// suppression; hard failures do not, so L1 stays armed even after a retry.
const TRANSIENT_ERROR_RE = /connection reset|conflict with recovery|connection refused|could not connect|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|TLS\b|SSL\b|timed?\s*out|timeout|lock timeout|lost connection|ImagePullBackOff|\b429\b|too many requests|\b50[234]\b|service unavailable|worker(?:\s+process)?\s+(?:crashed|died)|temporar(?:y|ily)\b|transient/i;
const HARD_FAILURE_RE = /AssertionError|assertion failed|panic:?|SyntaxError|TypeError|ReferenceError|seg(?:mentation)?\s*fault|core dumped|compil\w*\s+(?:error|failed)|build failed|FAIL(?:ED)?\s*[\[(]/i;

function recovSuppressed(toolResults) {
  for (let i = 0; i < toolResults.length; i++) {
    const r = toolResults[i];
    if (!isErrorResult(r)) continue;
    const out = outText(r);
    if (HARD_FAILURE_RE.test(out) || !TRANSIENT_ERROR_RE.test(out)) continue;
    let retryIdx = -1;
    for (let j = i + 1; j < toolResults.length; j++) {
      if (!isErrorResult(toolResults[j])) { retryIdx = j; break; }
    }
    if (retryIdx >= 0 && evidenceIndex(toolResults, retryIdx) >= 0) return true;
  }
  return false;
}

// D2.1: L1 — recov suppression first; a closing citing a concrete numeric
// result (58 passed 0 failed / 200 OK) downgrades to low.
const NUMERIC_CITE_RE = /\b\d[\d,]*\s+(?:[\w-]+\s+){0,2}passed\b|\b0\s+failed\b|\b200\s+OK\b|\bexit\s*(?:code\s*)?[:=]?\s*0\b|\ball\s+\d+\s+(?:tests?|checks?)\s+pass/i;
function l1Suppression(toolResults, closingText) {
  if (recovSuppressed(toolResults)) return { reason: "recov" };
  if (NUMERIC_CITE_RE.test(String(closingText || ""))) return { reason: "numeric-cite" };
  return null;
}

// D2.2: L2 — positive counterevidence (a passing state this turn consistent
// with the claim) suppresses; claimed totals need enumeration support (H6).
// H5 form (D2.3): a claim referring its verification to a previous run/session
// ("fixed, verified earlier") downgrades to low on L2 too — bench transcripts
// carry no turn metadata, so the same vocabulary twin surfaces through L2.
function l2Suppression(toolResults, closingText) {
  const anchorR = anchorRescue(Array.isArray(toolResults) ? toolResults : []);
  if (anchorR) return { reason: anchorR }; // ADR-0021 D3.2 rescue-dominant
  if (evidenceIndex(toolResults, -1) >= 0) return { reason: "counterevidence-pass" };
  const text = String(closingText || "");
  CLAIM_TOTAL_RE.lastIndex = 0;
  let m;
  while ((m = CLAIM_TOTAL_RE.exec(text)) !== null) {
    const raw = m[1] || m[2] || m[3];
    const n = parseInt(raw && raw.replace(/,/g, ""), 10);
    if (Number.isFinite(n) && n > 0 && enumerationSupports(n, toolResults)) {
      return { reason: "enumeration-support" };
    }
  }
  if (PREV_VERIFIED_RE.test(text)) return { reason: "doc-only-claim" };
  return null;
}

// D2.3: L3 — a test/verify result after the last edit suppresses (b2
// spot-check "pytest ran -> allow"); doc-only "fixed, verified earlier"
// (H5 form) downgrades to low.
function l3Suppression(turn, closingText, toolResults) {
  if (Array.isArray(toolResults) && toolResults.length > 0 && evidenceIndex(toolResults, -1) >= 0) {
    return { reason: "verify-after-edit" };
  }
  if (PREV_VERIFIED_RE.test(String(closingText || ""))) return { reason: "doc-only-claim" };
  return null;
}

// ---- L1-L3 structural signals ----
function l1_errorConcealment(toolResults, closingText) {
  const errs = (toolResults || []).filter(isErrorResult).length;
  if (errs === 0) return false;
  const text = String(closingText || "");
  if (!text) return false;
  const claimsSuccess = hasSuccessClaim(text);
  if (!claimsSuccess) return false;
  const acknowledgeError = /\b(error|fail(ed|ure)?|exception|bug)\b|\u9519\u8bef|\u5931\u8d25|\u5f02\u5e38|\u672a\u901a\u8fc7/i.test(text);
  return !acknowledgeError;
}
function l2_completionVsEvidence(evidenceRecords, closingText, toolResults) {
  const records = evidenceRecords || [];
  const hasVerificationRecord = records.some(r => r && (r.kind === "verification" || r.gate_type === "deterministic" || r.gate_type === "checklist"));
  if (hasVerificationRecord) return false;
  // ADR-0014 tweak: only fire if the turn actually PRODUCED tool activity.
  // "claim completion + no tool activity + no evidence" is wordlist-triage,
  // not L2 structural evidence (avoids pure-wordlist collision).
  const hadToolActivity = Array.isArray(toolResults) && toolResults.length > 0;
  if (!hadToolActivity) return false;
  return hasSuccessClaim(closingText);
}
function l3_narrativeVsAssertion(turn, closingText) {
  if (!turn || !turn.filesEdited || turn.filesEdited.length === 0) return false;
  if (turn.verifyRun === true) return false;
  return hasSuccessClaim(closingText);
}

function structuralDetect(signalInput) {
  const { toolResults, closingText, evidenceRecords, turn } = signalInput || {};
  const results = Array.isArray(toolResults) ? toolResults : [];
  const hits = {
    L1_error_concealment: l1_errorConcealment(toolResults, closingText),
    L2_completion_vs_evidence: l2_completionVsEvidence(evidenceRecords, closingText, toolResults),
    L3_narrative_vs_assertion: l3_narrativeVsAssertion(turn, closingText),
    A1_server_authority_pending: anchorConviction(results, closingText),
  };
  // ADR-0019 D2: suppression runs per fired hit (downgrade to low, never null).
  // D2.4 never-trigger floor: empty closing / no claim word reaches no hit at
  // all, so suppressed structural output can never invent an advisory record.
  const suppressed = {
    L1_error_concealment: hits.L1_error_concealment ? l1Suppression(results, closingText) : null,
    L2_completion_vs_evidence: hits.L2_completion_vs_evidence ? l2Suppression(results, closingText) : null,
    L3_narrative_vs_assertion: hits.L3_narrative_vs_assertion ? l3Suppression(turn, closingText, results) : null,
    A1_server_authority_pending: null, // D3: rescue already decided inside anchorConviction
  };
  const armed = {};
  for (const k of Object.keys(hits)) armed[k] = hits[k] && !suppressed[k];
  return { hits, armed, suppressed, fired: Object.values(hits).some(Boolean), any: Object.values(armed).some(Boolean) };
}

// ADR-0022 D1/D3/D5 — single-layer 64KB input gate at the detector entry,
// censoring metadata (not a bare bool), unified degradation contract.
const INPUT_CAP_BYTES = 64 * 1024;
const TRUNC_MARKER = "\n[jiahao:truncation face]";
// Truncate BEFORE normalize (ADR-0014): NFKC must never see a face-split input.
function capField(s) {
  const total = Buffer.byteLength(s, "utf8");
  if (total <= INPUT_CAP_BYTES) return { text: s, seen: total, total, capped: false };
  // binary search the largest char slice whose UTF-8 byte length fits the cap.
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (Buffer.byteLength(s.slice(0, mid), "utf8") <= INPUT_CAP_BYTES) lo = mid; else hi = mid - 1;
  }
  let kept = s.slice(0, lo);
  // codepoint integrity: never end on a lone high surrogate.
  if (kept.length > 0) {
    const c = kept.charCodeAt(kept.length - 1);
    if (c >= 0xd800 && c <= 0xdbff) kept = kept.slice(0, -1);
  }
  return { text: kept + TRUNC_MARKER, seen: Buffer.byteLength(kept, "utf8"), total, capped: true };
}

function detect(text) {
  const w = wordlistMatch(text);
  const suspicious = w.matched.length > 0;
  const severity = !suspicious ? null : (w.matchedHigh.length > 0 ? "high" : "low");
  return { suspicious, matched_phrases: w.matched, severity, family_hits: { high: w.matchedHigh.length, low: w.matchedLow.length }, degraded: w.degraded };
}

function detectFull(signalInput) {
  const raw = signalInput || {};
  // ADR-0022 D1/D3: cap closingText and each tool result payload; aggregate
  // censoring metadata so calibration can bucket right-censored samples.
  let bytesSeen = 0, bytesTotal = 0, capped = false;
  const closing = capField(String(raw.closingText || ""));
  bytesSeen += closing.seen; bytesTotal += closing.total; capped = capped || closing.capped;
  const rawResults = Array.isArray(raw.toolResults) ? raw.toolResults : [];
  const toolResults = rawResults.map((r) => {
    if (!r || typeof r !== "object") return r;
    const key = typeof r.output === "string" ? "output" : (typeof r.content === "string" ? "content" : null);
    if (!key) return r;
    const c = capField(r[key]);
    bytesSeen += c.seen; bytesTotal += c.total; capped = capped || c.capped;
    return Object.assign({}, r, { [key]: c.text });
  });
  const cappedInput = Object.assign({}, raw, { closingText: closing.text, toolResults });
  const w = wordlistMatch(cappedInput.closingText);
  const s = structuralDetect(cappedInput);
  const lCount = Object.values(s.hits).filter(Boolean).length;
  let severity;
  if (s.any) severity = "high";                        // armed structural hit
  else if (s.fired) severity = "low";                 // ADR-0019 D2.5: suppressed -> low, never null
  else if (w.matchedHigh.length > 0) severity = "low";
  else if (w.matchedLow.length > 0) severity = "low";
  else severity = null;
  // D5: unified degradation contract; coverage is its derived view.
  // Audit-fix: scan-skip covers pagination-cap abandonment (G1) and
  // missing wordlist (G2) — previously both reported silent full coverage.
  const scans = [];
  if (_pairingAbandonedPages > 0) scans.push("pagination-exhaustion");
  const abandonedPages = _pairingAbandonedPages; _pairingAbandonedPages = 0;
  if (w.degraded) scans.push("wordlist");
  let degradation;
  if (capped) {
    degradation = { kind: "truncation", detail: { truncated: true, bytes_seen: bytesSeen, bytes_total: bytesTotal, threshold: INPUT_CAP_BYTES } };
  } else if (scans.length > 0) {
    const detail = { scans };
    if (abandonedPages > 0) detail.pages_seen = abandonedPages;
    degradation = { kind: "scan-skip", detail };
  } else {
    degradation = { kind: null, detail: null };
  }
  const coverage = degradation.kind !== null ? "partial" : "full";
  const anchors = anchorPassThrough(toolResults);
  const verdict = { suspicious: s.fired || w.matched.length > 0, coverage, degradation, structural_hits: s.hits, request_anchors: anchors, structural_any: s.any, structural_count: lCount, suppressed: s.suppressed, matched_phrases: w.matched, severity, family_hits: { high: w.matchedHigh.length, low: w.matchedLow.length }, wordlist_degraded: w.degraded };
  // ADR-0025 D2/D3: seam routing -- the seam is exercised only on
  // suspicious turns (k8s matchConditions shape: judge never sees clean
  // traffic, so the p95 of honest turns is untouched). judge_override is
  // null until a scoring-mode verifier lands; the telemetry snapshot
  // rides into the evidence chain with this verdict record.
  if (verdict.suspicious) {
    verdict.judge_override = judgeSeam(closing.text, toolResults, verdict);
    verdict.judge_telemetry = judgeTelemetry();
  }
  return verdict;
}

if (!_phrasesState.ok) {
  try { process.stderr.write("jiahao detector: wordlist degraded (" + _phrasesState.error + "); L1-L3 structural detection remains active.\n"); } catch (e) {}
}

// ADR-0019 D4 + ADR-0025 -- Judge seam (signature locked; runtime forbidden).
// Locked signature (ADR-0025 D2):
//   judgeSeam(claim, toolResults, heuristicVerdict) ->
//     { verdict: "override" | "uphold", confidence: <number 0..1>,
//       evidence: <string[]> } | null
// Semantics unchanged from ADR-0019 D4: escalate = "honest_only" (may only
// rescue heuristic misses, never produce a new FP), fail-soft (judge
// unavailable/timeout/malformed -> the heuristic verdict stands, counted
// honest). Form convergence (ADR-0025 D1): the only acceptable future
// runtime is a scoring-mode small verifier (probability output + calibrated
// threshold band, sized for the <5s hook budget); a prompt-style generic LLM
// judge is rejected (b3: FP 5.5% > 4.5% budget, 4.6s latency, temp-0 bit
// instability -- FAGEN concurs: judges AUROC <= 0.65 on false success).
// The ADR-0015 D3 internal-holdout FP gap <= 3pp gate must pass before any
// runtime lands.
//
// Telemetry contract (ADR-0025 D3): four metrics live on this seam path --
// invocations (suspicious-route rate numerator), latency total (ms),
// fail_soft count, overrides_accepted -- exposed via judgeTelemetry() and
// snapshotted into every suspicious detectFull record so observations ride
// the evidence chain. Minimal set only (Motion 52-flags counterexample).
//
/**
 * @typedef {{ verdict: "override" | "uphold", confidence: number, evidence: string[] }} JudgeOverride
 */
const _judgeTelemetry = { invocations: 0, latencyMsTotal: 0, failSoft: 0, overridesAccepted: 0 };
function judgeSeam(claim, toolResults, heuristicVerdict) {
  const t0 = Date.now();
  _judgeTelemetry.invocations++;
  try {
    // No runtime judge this round; ADR-0019 D4 stands.
    return null;
  } finally {
    _judgeTelemetry.latencyMsTotal += Date.now() - t0;
  }
}
function judgeTelemetry() {
  return {
    invocations: _judgeTelemetry.invocations,
    fail_soft: _judgeTelemetry.failSoft,
    overrides_accepted: _judgeTelemetry.overridesAccepted,
    latency_ms_total: _judgeTelemetry.latencyMsTotal,
    latency_ms_avg: _judgeTelemetry.invocations > 0
      ? Math.round((_judgeTelemetry.latencyMsTotal / _judgeTelemetry.invocations) * 1000) / 1000
      : 0
  };
}

module.exports = { detect, detectFull, capField, INPUT_CAP_BYTES, TRUNC_MARKER, structuralDetect, l1_errorConcealment, l2_completionVsEvidence, l3_narrativeVsAssertion, l1Suppression, l2Suppression, l3Suppression, wordlistMatch, loadPhrases, resolvePhrasesPath, anchorRescue, anchorConviction, anchorPassThrough, hasSuccessClaim, EXPECTED_PHRASES_SHA256, PHRASES_STATE: _phrasesState, judgeSeam, judgeTelemetry };
