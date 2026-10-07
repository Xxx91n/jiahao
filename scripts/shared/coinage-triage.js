'use strict';
// scripts/shared/coinage-triage.js - ADR-0098 D-C/D-E (grill-t39 D-004.3/.5,
// D-005.1): the deterministic core of the Unregistered-Coinage Triage Channel
// (收词分诊通道) - a GENERATOR-SIDE ADVISORY probe. It counts; it never
// judges. WHY IT NEVER BLOCKS: the ADR mints no leg (D-C "advisory, not
// blocking"; D-G "does a blocking leg exist at all: explicitly no"), so this
// module exposes no pass/fail anywhere and the CLI exits non-zero only for its
// own usage/IO errors - never for style findings. It is deliberately absent
// from docs/gates.json and from every verifier battery.
//
// THE FIVE SURFACES (D-C, exact): ledgers (.scratch/grill-*/decision-ledger.md),
// reports (.scratch/grill-*/reports/*.md), ADRs (docs/adr/*.md), AGENTS.md,
// CONTEXT.md. Plain filesystem reads of the working tree - no git, because the
// census base is the tree this generator tool ships with, not an object store.
//
// REGISTRATION FILTER (D-B: "unregistered - the term is not in the glossary"):
// a term found on a CONTEXT.md headword surface (the `**...**:` bold entry
// lines) is REGISTERED and therefore not a candidate. Headwords across the
// whole file are taken as the registered vocabulary: a bold mention in the
// Decision Log counts for the channel's purpose (the ADR names the glossary;
// the headword form is what a glossary entry mechanically is). A Chinese
// window that sits INSIDE a headword run is treated as part of that registered
// term (so the 输出 inside 虚饰输出 never surfaces as a candidate); an English
// token equal to a headword word (lowercased, hyphen forms kept whole) is
// registered.
//
// THE LOAD-BEARING AXIS STAYS HUMAN (D-B: "deliberately left to the
// implementation wave... no proxy minted here"): every axis this module can
// count - frequency, file breadth, surface breadth, lifecycle state (registered
// or not) - is reported; the verdict (register / plain-ify / defer a row) is
// an OWNER act (D-C). NO OUTPUT FIELD IS A SCORE: the sentence face emits
// COUNTS ONLY (D-E) - there is no trustworthy readability formula for Chinese,
// so a mechanical score would be a fabricated quantity, and the footer sets no
// target value (D-F1).
//
// SENTENCE SPLITTING (D-E registered transfer "the counter must be
// deterministically reproducible before its output may be disclosed"). Bytes
// are normalized (BOM stripped, CR-LF/CR to LF) and fenced code blocks removed
// (``` / ~~~ runs, incl. indented fences) - the counter counts PROSE. Rules,
// applied in this order:
//   1. full-width 。！？；… are ALWAYS boundaries; ，、： are NON-boundaries
//      (clause-internal, legislated in D-005.1 / task T-10);
//   2. every newline ends a sentence;
//   3. ASCII . ? ! split only when the next char is a space/tab/end AND the
//      previous char is a letter or CJK ideograph; for '.' additionally the
//      trailing alphanumeric run must be longer than two chars - so "e.g.",
//      "Dr.", "U.S.", "3.14", "v1.2" stay inside their sentence (no
//      abbreviation class reads as "?" / "!", so they split on their own);
//      ASCII , ; : are NON-boundaries (clause
//      links, the comma class; only the full-width ； is a boundary);
//   4. empty segments are dropped; sentence length = Unicode code points of
//      the trimmed segment; a sentence is "long" at > LONG_LEN code points -
//      a DISCLOSED GAUGE EDGE (the instrument-name clause of ADR-0099 P-C),
//      never a target value.
// The same bytes always produce the same counts: pure regex + splitting, no
// model, no randomness, no wall-clock in the output, and every list is sorted
// with an explicit comparator (code-unit order, locale-free).
//
// CONSTRUCTION FAMILIES (D-E): xFace / xDomain / xShape count the literal
// `X面 / X域 / X形` patterns, X = one CJK ideograph (BMP URO block) or one
// Latin letter (the `c形` judgement-forms of the ledger are in that family).
// The count is LITERAL: grammaticalized compounds (里面, 领域, 形式) are
// counted too - filtering them would be semantic judgment, and the machine
// has none to spend.
//
// SYMBOL SQUEEZE (D-E): occurrences of ':=' and '→', counted literally.
//
// FAIL-CLOSED DIRECTION (house style): a read error on an enumerated file is
// THROWN (the CLI turns it into its own exit-2 IO error); only a missing
// directory is legitimately empty for a generator-side tool pointed at an
// arbitrary tree (the CONTEXT.md-absent case is disclosed in report.notes -
// the registration filter is then inert, never silently wrong).

const fs = require('fs');
const path = require('path');

const DEFAULT_MIN_COUNT = 3;
const ZH_WINDOW_MIN = 2;
const ZH_WINDOW_MAX = 4;
const EN_MIN_LEN = 4;
const LONG_LEN = 100;
const BUCKET_EDGES = Object.freeze([10, 20, 50, 100, 200]);
const BUCKET_LABELS = Object.freeze(['1-10', '11-20', '21-50', '51-100', '101-200', '201+']);

// The five statutory surfaces (D-C). The order is the report order.
const SURFACES = Object.freeze([
  { id: 'ledger', label: '.scratch/grill-*/decision-ledger.md' },
  { id: 'report', label: '.scratch/grill-*/reports/*.md' },
  { id: 'adr', label: 'docs/adr/*.md' },
  { id: 'agents', label: 'AGENTS.md' },
  { id: 'context', label: 'CONTEXT.md' },
]);

// Compact English function-word enumeration. WHY A STOPLIST: the census class
// this channel hunts is metaphor coinage (treadmill-class tokens), not grammar
// words, and an unfiltered top-frequency English list is 60% stopwords. This
// is a mechanical enumeration choice, disclosed here, not a semantic claim.
const EN_STOPWORDS = Object.freeze(new Set([
  'about', 'above', 'across', 'after', 'again', 'against', 'all', 'also', 'although', 'always', 'am', 'among', 'an',
  'and', 'another', 'any', 'anything', 'are', 'around', 'as', 'at', 'back', 'be', 'because', 'been', 'before',
  'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'come', 'could', 'each', 'either', 'else',
  'end', 'even', 'ever', 'every', 'everything', 'few', 'first', 'for', 'from', 'further', 'get', 'give', 'go',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'however', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'just', 'keep', 'know', 'last', 'like', 'list', 'long', 'made', 'make', 'many',
  'may', 'me', 'might', 'more', 'most', 'much', 'must', 'my', 'near', 'neither', 'never', 'new', 'no', 'not',
  'nothing', 'now', 'of', 'off', 'often', 'on', 'once', 'one', 'only', 'onto', 'or', 'other', 'ours', 'out',
  'over', 'own', 'part', 'per', 'put', 'rather', 'said', 'same', 'see', 'should', 'since', 'some', 'something',
  'still', 'such', 'take', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'thing',
  'things', 'think', 'this', 'those', 'though', 'through', 'thus', 'to', 'too', 'toward', 'towards', 'take',
  'under', 'until', 'up', 'upon', 'us', 'use', 'used', 'using', 'very', 'via', 'want', 'was', 'way', 'we',
  'well', 'were', 'what', 'when', 'where', 'whether', 'which', 'while', 'who', 'whom', 'whose', 'why', 'will',
  'with', 'within', 'without', 'would', 'yes', 'yet', 'you', 'your', 'yours',
]));

function normalizeText(text) {
  return String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

// Whole-line fenced code blocks removed (``` / ~~~ open, same fence char
// closes; unterminated fence runs to EOF). Indented fences included.
function stripCodeFences(text) {
  const out = [];
  let fence = null;
  for (const line of normalizeText(text).split('\n')) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (fence === null) fence = m[1].charAt(0);
      else if (fence === m[1].charAt(0)) fence = null;
      continue;
    }
    if (fence === null) out.push(line);
  }
  return out.join('\n');
}

// The registered vocabulary: CONTEXT.md headwords (`**...**:` bold lines).
// zhRuns = maximal CJK runs inside headwords; enWords = lowercased latin word
// forms inside headwords (hyphenated forms kept whole and split).
function headwordRegistration(contextText) {
  const zhRuns = [];
  const enWords = new Set();
  const re = /^\*\*(.+?)\*\*/gm;
  let m;
  const text = normalizeText(contextText);
  while ((m = re.exec(text)) !== null) {
    const head = m[1];
    const zh = head.match(/[一-鿿]+/g);
    if (zh) for (const run of zh) if (zhRuns.indexOf(run) === -1) zhRuns.push(run);
    const en = head.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g);
    if (en) for (const w of en) { enWords.add(w); w.split('-').forEach(function (p) { enWords.add(p); }); }
  }
  return { zhRuns: zhRuns, enWords: enWords };
}

function isZhRegistered(token, registration) {
  for (const run of registration.zhRuns) if (run.indexOf(token) !== -1) return true;
  return false;
}

// Candidate Chinese terms: every 2..4-char window of each maximal CJK run.
// Why windows: Chinese prose has no word segmentation and this module ships
// zero dependencies (no jieba); windows over-count (a 4-char term feeds three
// 2-char and two 3-char windows) - that is disclosed, because the channel is a
// triage list for the OWNER, not a verdict, and the census's tokens (棘轮,
// 落账, 烤透) are exactly this shape.
function chineseWindowCounts(text) {
  const map = new Map();
  const runs = normalizeText(text).match(/[一-鿿]+/g) || [];
  for (const run of runs) {
    const chars = Array.from(run);
    for (let len = ZH_WINDOW_MIN; len <= ZH_WINDOW_MAX; len++) {
      for (let i = 0; i + len <= chars.length; i++) {
        const w = chars.slice(i, i + len).join('');
        map.set(w, (map.get(w) || 0) + 1);
      }
    }
  }
  return map;
}

function englishTokenCounts(text) {
  const map = new Map();
  const toks = normalizeText(text).match(/[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*/g) || [];
  for (const t of toks) {
    const low = t.toLowerCase();
    if (low.length < EN_MIN_LEN) continue;
    map.set(low, (map.get(low) || 0) + 1);
  }
  return map;
}

// The legislated splitter (see the header rules 1-4). Returns trimmed
// sentences; length is counted later in code points.
function splitSentences(text) {
  const s = normalizeText(text);
  const out = [];
  let cur = '';
  const chars = Array.from(s);
  const flush = function () {
    const t = cur.trim();
    if (t) out.push(t);
    cur = '';
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '\n' || '。！？；…'.indexOf(ch) !== -1) { flush(); continue; }
    if (ch === '.' || ch === '?' || ch === '!') {
      const next = i + 1 < chars.length ? chars[i + 1] : undefined;
      const prev = cur.length ? Array.from(cur).pop() : '';
      const trailing = cur.match(/[A-Za-z0-9]+$/);
      if ((next === undefined || next === ' ' || next === '\t') && cur.length &&
          /[A-Za-z一-鿿]/.test(prev) && (ch !== '.' || !trailing || trailing[0].length > 2)) {
        flush();
        continue;
      }
    }
    cur += ch;
  }
  flush();
  return out;
}

const X_FACE_RE = /[一-鿿A-Za-z]面/g;
const X_DOMAIN_RE = /[一-鿿A-Za-z]域/g;
const X_SHAPE_RE = /[一-鿿A-Za-z]形/g;
const ASSIGN_RE = /:=/g;
const ARROW_RE = /→/g;

// Count signals only (D-E). Field names are fixed: the footer contract in
// AGENTS.md repeats them verbatim; no field may read as score/target/threshold.
function proseDensityCounts(text) {
  const t = normalizeText(text);
  const sentences = splitSentences(t);
  const lengths = sentences.map(function (s) { return Array.from(s).length; });
  const n = lengths.length;
  let sum = 0;
  let max = 0;
  let long = 0;
  const buckets = BUCKET_LABELS.map(function () { return 0; });
  for (const l of lengths) {
    sum += l;
    if (l > max) max = l;
    if (l > LONG_LEN) long++;
    let b = BUCKET_LABELS.length - 1;
    for (let i = 0; i < BUCKET_EDGES.length; i++) if (l <= BUCKET_EDGES[i]) { b = i; break; }
    buckets[b]++;
  }
  const counts = {
    sentences: n,
    meanLen: n ? Math.round(sum / n) : 0,
    maxLen: max,
    longShare: n ? Math.round((long / n) * 1000) / 10 : 0,
    xFace: (t.match(X_FACE_RE) || []).length,
    xDomain: (t.match(X_DOMAIN_RE) || []).length,
    xShape: (t.match(X_SHAPE_RE) || []).length,
    symbols: (t.match(ASSIGN_RE) || []).length + (t.match(ARROW_RE) || []).length,
    longLen: LONG_LEN,
    lengthBuckets: BUCKET_LABELS.map(function (label, i) { return { bucket: label, count: buckets[i] }; }),
  };
  return counts;
}

// Footer over prose only: fenced code blocks never count as sentences.
function proseCountsOfText(text) {
  return proseDensityCounts(stripCodeFences(text));
}

// The mandated single disclosure line (D-F1: pure disclosure, NO target
// value; existing text is never rewritten to move a number).
function renderFooterLine(c) {
  return 'prose-density: sentences=' + c.sentences +
    ' meanLen=' + c.meanLen +
    ' maxLen=' + c.maxLen +
    ' longShare=' + c.longShare.toFixed(1) + '%' +
    ' xFace=' + c.xFace +
    ' xDomain=' + c.xDomain +
    ' xShape=' + c.xShape +
    ' symbols=' + c.symbols;
}

function isFile(abs) {
  try { return fs.statSync(abs).isFile(); } catch (e) { return false; }
}

// Missing directory (ENOENT) is legitimately empty for an advisory tool on an
// arbitrary tree; any other stat error propagates (fail-closed).
function readDir(abs) {
  try { return fs.readdirSync(abs, { withFileTypes: true }); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}

function dirNames(abs) {
  return readDir(abs).filter(function (d) { return d.isDirectory(); }).map(function (d) { return d.name; }).sort();
}

function mdFiles(absDir) {
  return readDir(absDir).filter(function (d) { return d.isFile() && d.name.endsWith('.md'); })
    .map(function (d) { return d.name; }).sort();
}

// The five-surface enumeration (D-C, exact), repo-relative with '/'
// separators, sorted.
function enumerateFiles(root) {
  const out = [];
  const scratch = path.join(root, '.scratch');
  for (const d of dirNames(scratch)) {
    if (!/^grill-/.test(d)) continue;
    const ledgerRel = '.scratch/' + d + '/decision-ledger.md';
    if (isFile(path.join(root, ...ledgerRel.split('/')))) out.push({ rel: ledgerRel, surfaceId: 'ledger' });
    const reportsDir = path.join(root, '.scratch', d, 'reports');
    for (const f of mdFiles(reportsDir)) {
      out.push({ rel: '.scratch/' + d + '/reports/' + f, surfaceId: 'report' });
    }
  }
  for (const f of mdFiles(path.join(root, 'docs', 'adr'))) {
    out.push({ rel: 'docs/adr/' + f, surfaceId: 'adr' });
  }
  if (isFile(path.join(root, 'AGENTS.md'))) out.push({ rel: 'AGENTS.md', surfaceId: 'agents' });
  if (isFile(path.join(root, 'CONTEXT.md'))) out.push({ rel: 'CONTEXT.md', surfaceId: 'context' });
  out.sort(function (a, b) { return a.rel < b.rel ? -1 : (a.rel > b.rel ? 1 : 0); });
  return out;
}

function readAt(root, rel) {
  const abs = path.join(root, ...rel.split('/'));
  let buf;
  try { buf = fs.readFileSync(abs); }
  catch (e) { throw new Error('cannot read ' + rel + ': ' + e.message); }
  if (buf.indexOf(0) !== -1) return null; // byte guard: NUL = not text, skip
  return buf.toString('utf8');
}

function bumpRow(map, token, rel, surfaceId, delta) {
  let row = map.get(token);
  if (!row) { row = { count: 0, files: new Set(), surfaces: new Set() }; map.set(token, row); }
  row.count += delta;
  row.files.add(rel);
  row.surfaces.add(surfaceId);
}

function collectRows(map, lang, isRegistered, minCount) {
  const rows = [];
  map.forEach(function (row, token) {
    if (row.count < minCount) return;
    if (isRegistered(token)) return;
    rows.push({
      token: token,
      lang: lang,
      count: row.count,
      files: row.files.size,
      surfaces: row.surfaces.size,
      lifecycle: 'unregistered',
    });
  });
  rows.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    if (b.files !== a.files) return b.files - a.files;
    if (b.surfaces !== a.surfaces) return b.surfaces - a.surfaces;
    return a.token < b.token ? -1 : (a.token > b.token ? 1 : 0);
  });
  return rows;
}

function surfaceRow(id, files, counts) {
  const row = { id: id, files: files };
  Object.assign(row, counts);
  return row;
}

// The full census report. Deterministic: pure bytes in, sorted lists out,
// no clock, no randomness.
function scanTree(root, opts) {
  const o = opts || {};
  const minCount = o.minCount === undefined ? DEFAULT_MIN_COUNT : o.minCount;
  const files = enumerateFiles(root);
  const notes = [];

  const contextEntry = files.filter(function (f) { return f.surfaceId === 'context'; })[0] || null;
  const contextText = contextEntry ? (readAt(root, contextEntry.rel) || '') : '';
  if (!contextEntry) notes.push('CONTEXT.md absent - registration filter inert: every candidate reads as unregistered');
  const registration = headwordRegistration(contextText);

  const zh = new Map();
  const en = new Map();
  const textsBySurface = {};
  SURFACES.forEach(function (s) { textsBySurface[s.id] = []; });

  for (const f of files) {
    const raw = readAt(root, f.rel);
    if (raw === null) continue;
    const text = stripCodeFences(raw);
    textsBySurface[f.surfaceId].push(text);
    chineseWindowCounts(text).forEach(function (c, w) { bumpRow(zh, w, f.rel, f.surfaceId, c); });
    englishTokenCounts(text).forEach(function (c, t) {
      if (EN_STOPWORDS.has(t)) return;
      bumpRow(en, t, f.rel, f.surfaceId, c);
    });
  }

  const zhRows = collectRows(zh, 'zh', function (t) { return isZhRegistered(t, registration); }, minCount);
  const enRows = collectRows(en, 'en', function (t) { return registration.enWords.has(t); }, minCount);

  const perSurface = SURFACES.map(function (s) {
    const text = textsBySurface[s.id].join('\n');
    return surfaceRow(s.id, textsBySurface[s.id].length, proseCountsOfText(text));
  });
  const overall = proseCountsOfText(SURFACES.map(function (s) { return textsBySurface[s.id].join('\n'); }).join('\n'));

  return {
    advisory: true,
    minCount: minCount,
    notes: notes,
    surfaces: SURFACES.map(function (s) {
      return { id: s.id, label: s.label, files: perSurface.filter(function (r) { return r.id === s.id; })[0].files };
    }),
    wordFace: { zh: zhRows, en: enRows },
    sentenceFace: { overall: overall, perSurface: perSurface },
  };
}

// The human-readable advisory list. Every line is a count or an enumeration;
// the verdict clause closes the output (D-C: the channel reports, it never
// decides).
function renderAdvisory(report) {
  const lines = [];
  lines.push('coinage-triage (收词分诊通道, ADR-0098) - ADVISORY LIST, never a gate leg, never a verdict.');
  lines.push('Measured axes: frequency, file breadth, surface breadth, lifecycle state (registered / unregistered).');
  lines.push('NOT measured by design: the load-bearing-semantics axis stays with the owner (ADR-0098 D-B).');
  for (const n of report.notes) lines.push('note: ' + n);
  lines.push('');
  lines.push('surfaces (five, exact):');
  for (const s of report.surfaces) {
    lines.push('  ' + s.id.padEnd(8) + ' files=' + String(s.files).padStart(4) + '  ' + s.label);
  }
  lines.push('');
  lines.push('word face - unregistered candidates with count >= ' + report.minCount + ' (frequency files surfaces lang token):');
  for (const r of report.wordFace.zh.concat(report.wordFace.en)) {
    lines.push('  ' + String(r.count).padStart(7) + '  files=' + String(r.files).padStart(3) + '  surfaces=' + r.surfaces + '  [' + r.lang + '] ' + r.token);
  }
  lines.push('  zh candidates: ' + report.wordFace.zh.length + '   en candidates: ' + report.wordFace.en.length);
  lines.push('');
  lines.push('sentence face - count signals only, no score (longShare = share of sentences over longLen=' + report.sentenceFace.overall.longLen + ' code points):');
  lines.push('  ' + renderFooterLine(report.sentenceFace.overall) + '  [overall]');
  for (const row of report.sentenceFace.perSurface) {
    lines.push('  ' + renderFooterLine(row) + '  files=' + row.files + '  [' + row.id + ']');
  }
  lines.push('');
  lines.push('Owner acts on this list: register the term in CONTEXT.md, plain-ify it, or defer-registry a row (ADR-0098 D-C).');
  lines.push('The footer sets no target value and existing text is never rewritten for the sake of a count (ADR-0098 D-F).');
  return lines.join('\n');
}

module.exports = {
  DEFAULT_MIN_COUNT,
  LONG_LEN,
  SURFACES,
  normalizeText,
  stripCodeFences,
  headwordRegistration,
  isZhRegistered,
  chineseWindowCounts,
  englishTokenCounts,
  splitSentences,
  proseDensityCounts,
  proseCountsOfText,
  renderFooterLine,
  enumerateFiles,
  scanTree,
  renderAdvisory,
};
