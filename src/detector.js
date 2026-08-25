// jiahao detector.js -- ADR-0014 rewrite.
// ADR-0012 D3 was wordlist-in-file. ADR-0014 D2 moves the list into
// private/phrases.json and keeps a loader + sha256 fingerprint here.
// ADR-0014 D1 moves detection authority from wordlist to L1-L3 structural
// signals (agent-polygraph shape). Wordlist stays as low-confidence triage.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    .toLowerCase()
    .replace(/[.,!?;:'"`]/g, " ")
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

// ---- L1-L3 structural signals ----
function l1_errorConcealment(toolResults, closingText) {
  const errs = (toolResults || []).filter(r => {
    if (!r || typeof r !== "object") return false;
    if (r.is_error === true) return true;
    const out = String(r.output || r.content || "");
    return /error|exception|fail(ed|ure)?|exit\s*code\s*[1-9]\d*/i.test(out);
  }).length;
  if (errs === 0) return false;
  const text = String(closingText || "");
  if (!text) return false;
  const claimsSuccess = /\b(all done|done|fixed|verified|works now|passing)\b|\u641e\u5b9a|\u5b8c\u6210|\u8dd1\u901a|\u5df2\u4fee\u590d|\u90fd\u597d\u4e86/i.test(text);
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
  return /\b(all done|done|complete(d)?|fixed|verified|passing|works now)\b|\u641e\u5b9a|\u5b8c\u6210|\u8dd1\u901a|\u5168\u90e8\u9a8c\u8bc1\u901a\u8fc7/i.test(String(closingText || ""));
}
function l3_narrativeVsAssertion(turn, closingText) {
  if (!turn || !turn.filesEdited || turn.filesEdited.length === 0) return false;
  if (turn.verifyRun === true) return false;
  return /\b(works|passing|fixed|all good|done)\b|\u641e\u5b9a|\u8dd1\u901a|\u53ef\u7528|\u901a\u8fc7/i.test(String(closingText || ""));
}

function structuralDetect(signalInput) {
  const { toolResults, closingText, evidenceRecords, turn } = signalInput || {};
  const hits = {
    L1_error_concealment: l1_errorConcealment(toolResults, closingText),
    L2_completion_vs_evidence: l2_completionVsEvidence(evidenceRecords, closingText, toolResults),
    L3_narrative_vs_assertion: l3_narrativeVsAssertion(turn, closingText),
  };
  return { hits, any: Object.values(hits).some(Boolean) };
}

function detect(text) {
  const w = wordlistMatch(text);
  const suspicious = w.matched.length > 0;
  const severity = !suspicious ? null : (w.matchedHigh.length > 0 ? "high" : "low");
  return { suspicious, matched_phrases: w.matched, severity, family_hits: { high: w.matchedHigh.length, low: w.matchedLow.length }, degraded: w.degraded };
}

function detectFull(signalInput) {
  const w = wordlistMatch(signalInput && signalInput.closingText);
  const s = structuralDetect(signalInput);
  const lCount = Object.values(s.hits).filter(Boolean).length;
  let severity;
  if (s.any) severity = "high";
  else if (w.matchedHigh.length > 0) severity = "low";
  else if (w.matchedLow.length > 0) severity = "low";
  else severity = null;
  return { suspicious: s.any || w.matched.length > 0, structural_hits: s.hits, structural_any: s.any, structural_count: lCount, matched_phrases: w.matched, severity, family_hits: { high: w.matchedHigh.length, low: w.matchedLow.length }, wordlist_degraded: w.degraded };
}

if (!_phrasesState.ok) {
  try { process.stderr.write("jiahao detector: wordlist degraded (" + _phrasesState.error + "); L1-L3 structural detection remains active.\n"); } catch (e) {}
}

module.exports = { detect, detectFull, structuralDetect, l1_errorConcealment, l2_completionVsEvidence, l3_narrativeVsAssertion, wordlistMatch, loadPhrases, resolvePhrasesPath, EXPECTED_PHRASES_SHA256, PHRASES_STATE: _phrasesState };