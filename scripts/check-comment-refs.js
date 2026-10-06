#!/usr/bin/env node
'use strict';
// scripts/check-comment-refs.js - grill-t37 D-004 (M-D): the comment-reference
// existence gate. Deny-level (D-001 settle): a backtick span inside a comment
// that names a {symbol, repo path, ADR-NNNN} must EXIST - the three classes
// share 'no-interpretation existence' (rustdoc valid-targets precedent).
//
// SCOPE (D-004.10): comments in scripts/, src/, test/ only. .md prose
// references are ADR-0093 M3's surface (registered boundary). External URLs
// are never resolved (permanent false-positive source). Cross-repo/cross-
// boundary references (absolute paths, other repos) are out of domain.
//
// DOMAIN (D-004.2, s2): a symbol span resolves iff it is bound in
//   {same-file declarations} U {the file's imports} U {repo-wide export
//   table}. s3 (JSON contract field-name symbol table) is EXCLUDED - the
//   contract-vocab yellow level covers that family instead.
//
// LEVELS (D-004.3/.4): unresolved -> red (deny, blocking). Unresolved span
//   that hits the frozen contract-vocab set (docs/governance/contract-vocab.json,
//   regenerated only via scripts/build-contract-vocab.js) -> YELLOW: a
//   registered third output level - disclosed, never blocking, never silent.
//   Ambiguity (same name exported by multiple files) counts as UNRESOLVED -
//   never heuristic-guessed (rustdoc ambiguity precedent).
//
// DOC-HYGIENE SPAN BOUNDARY (D-004.7): doc-hygiene's backtick verbatim
//   exemption (scripts/shared/doc-hygiene.js) does NOT exempt this surface -
//   this leg anchors on exactly those spans. The two scanners are orthogonal:
//   byte-hygiene vs reference-existence.
//
// JSDoc channel (D-004.9): /** */ blocks are NOT collected - the JSDoc
//   channel is a registered dead surface for v1.
//
// Usage: node scripts/check-comment-refs.js [--explain]

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const repoExports = require('../src/shared/repo-exports');
const { build } = require('./build-contract-vocab');

const ROOT = path.join(__dirname, '..');
const ADR_DIR = path.join(ROOT, 'docs', 'adr');
const VOCAB_ABS = path.join(ROOT, 'docs', 'governance', 'contract-vocab.json');
const IDENT = /^[A-Za-z_$][\w$]*$/;
const DOTTED_IDENT = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;
const FILE_EXT = /\.(js|jsx|mjs|cjs|ts|json|jsonc|md|txt|yml|yaml|xml|toml|sh|ps1|bat|cmd|map|css|html|svg|png|jpg|wasm|lock|gitignore|npmignore)$/i;

// Ambient host bindings every CommonJS module has without declaring -
// same-file-declared for s2 purposes (they are the module wrapper's params).
const AMBIENT = new Set(['module', 'exports', 'require', 'process', '__dirname', '__filename',
  'console', 'Buffer', 'setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval',
  'global', 'globalThis', 'queueMicrotask', 'URL', 'fetch']);

// ---- comment tokenizer ----------------------------------------------------
// A small state machine: strings, template literals and regex literals are
// skipped; // and /* */ regions outside them are comments. /** (JSDoc) is
// collected separately and EXCLUDED (dead channel, D-004.9).
function commentRegions(text) {
  const regions = []; // {text, line}
  const n = text.length;
  let i = 0, line = 1;
  const isWord = function (c) { return c !== undefined && /[A-Za-z0-9_$]/.test(c); };
  while (i < n) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < n && text[i] !== q) {
        if (text[i] === '\\') i++;
        else if (q === '`' && text[i] === '$' && text[i + 1] === '{') {
          // template expression - skip its braces conservatively
          let depth = 1; i += 2;
          while (i < n && depth > 0) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; i++; }
          continue;
        }
        if (text[i] === '\n') { line++; if (q !== '`') break; }
        i++;
      }
      i++;
      continue;
    }
    if (c === '/' && text[i + 1] === '/' && text[i - 1] !== ':') {
      const start = i, startLine = line;
      while (i < n && text[i] !== '\n') i++;
      regions.push({ text: text.slice(start, i), line: startLine });
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const isJsdoc = text[i + 2] === '*';
      const start = i, startLine = line;
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { if (text[i] === '\n') line++; i++; }
      i += 2;
      if (!isJsdoc) regions.push({ text: text.slice(start, i), line: startLine });
      continue;
    }
    // regex-literal heuristic: '/' at an expression position opens a regex
    if (c === '/') {
      let j = i - 1;
      while (j >= 0 && /[ \t]/.test(text[j])) j--;
      const prev = j >= 0 ? text[j] : '';
      const prevWord = /([A-Za-z_$][\w$]*)\s*$/.exec(text.slice(Math.max(0, j - 30), j + 1));
      const opensRegex = j < 0 || /[=(:,[{};!&|?+\-*%^~<>]/.test(prev) ||
        (prevWord && /^(return|typeof|case|in|of|new|delete|void|instanceof|throw|else|do|yield|await)$/.test(prevWord[1]));
      if (opensRegex) {
        i++;
        while (i < n && text[i] !== '/' && text[i] !== '\n') {
          if (text[i] === '\\' || text[i] === '[') {
            if (text[i] === '[') { while (i < n && text[i] !== ']' && text[i] !== '\n') { if (text[i] === '\\') i++; i++; } }
            else i++;
          }
          i++;
        }
        i++;
        continue;
      }
      i++;
      continue;
    }
    i++;
  }
  return regions;
}

// Backtick spans inside a comment region.
function spansIn(commentText, baseLine) {
  const spans = [];
  const re = /`([^`\n]+)`/g;
  let m;
  while ((m = re.exec(commentText))) {
    const line = baseLine + (commentText.slice(0, m.index).match(/\n/g) || []).length;
    spans.push({ span: m[1].trim(), line: line });
  }
  return spans;
}

// ---- span classification ----------------------------------------------------
// Returns { cls, detail } - classification is shape-only; resolution after.
// 'pattern' (glob chars) and 'external' (absolute/cross-boundary/URL) are
// registered non-domain classes: a wildcard denotes a SET, never a single
// existence claim; absolute paths are environment detail (D-004 negatives).
function classify(span) {
  let s = span.trim().replace(/^['"]|['"]$/g, '');
  if (/^ADR-\d{4}$/i.test(s)) return { cls: 'adr' };
  if (/^(https?|ftp|mailto):/i.test(s)) return { cls: 'external' };
  if (/^(?:[A-Za-z]:[\\/]|\\\\|~\/|\/)/.test(s)) return { cls: 'external' };
  if (/^[A-Za-z]:$/.test(s)) return { cls: 'external' }; // drive-letter fragment
  if (/[*?[\]{}|<>]/.test(s)) return { cls: 'pattern' };
  if (/\s/.test(s)) return { cls: 'prose' };
  s = s.replace(/[.,;:)\]]+$/, '');
  if (!s) return { cls: 'prose' };
  if (/[/\\]/.test(s) || FILE_EXT.test(s)) return { cls: 'path', path: s };
  if (DOTTED_IDENT.test(s)) return { cls: 'symbol', ident: s };
  return { cls: 'prose' };
}

function pathResolves(relSpan, fileRel, existsFn, basenames) {
  let s = relSpan.split('#')[0].split('?')[0];
  s = s.replace(/:\d+(-\d+)?$/, ''); // :line / :line-range suffixes
  if (!s) return { ok: false, why: 'empty' };
  if (s.indexOf('/') === -1 && s.indexOf('\\') === -1) {
    // bare filename: unique-basename resolution across the tracked text set
    const hits = basenames[s] || [];
    if (hits.length === 1) return { ok: true, resolved: hits[0] };
    if (hits.length > 1) return { ok: false, why: 'ambiguous (' + hits.length + ' files named ' + s + ')' };
    return { ok: false, why: 'no file named ' + s };
  }
  const norm = s.replace(/\\/g, '/').replace(/^\.\//, '');
  if (existsFn(norm)) return { ok: true, resolved: norm };
  // relative to the commenting file's directory
  const rel2 = path.posix.normalize(path.posix.join(path.posix.dirname(fileRel), norm));
  if (existsFn(rel2)) return { ok: true, resolved: rel2 };
  return { ok: false, why: 'path not found: ' + norm };
}

function symbolResolves(ident, declared, imports, exportsTable) {
  const head = ident.split('.')[0];
  // dotted member spans: the head binding carries resolution; member
  // existence is type-level detail outside v1's no-interpretation domain.
  if (!IDENT.test(head)) return { ok: false, why: 'not identifier-shaped' };
  if (AMBIENT.has(head)) return { ok: true, via: 'ambient' };
  if (declared.has(head)) return { ok: true, via: 'same-file' };
  if (imports.has(head)) return { ok: true, via: 'import' };
  if (ident === head && exportsTable[ident]) {
    const hits = exportsTable[ident];
    if (hits.length === 1) return { ok: true, via: 'export-table (' + hits[0] + ')' };
    return { ok: false, why: 'ambiguous - exported by ' + hits.length + ' files: ' + hits.slice(0, 4).join(', ') + (hits.length > 4 ? ', ...' : '') };
  }
  // dotted ident whose head is unresolved
  return { ok: false, why: 'unresolved in s2 (same-file/imports/export-table)' };
}

function adrExists(num4) {
  let names;
  try { names = fs.readdirSync(ADR_DIR); } catch (e) { return false; }
  return names.some(function (n) { return n.indexOf(num4 + '-') === 0 && /\.md$/.test(n); });
}

function main(argv) {
  requireCapabilities('comment-refs');
  const explain = (argv || []).indexOf('--explain') !== -1;

  // Frozen contract-vocab: re-derive and diff - a word joining the set must
  // come through a visible regen commit (M4-bound, 禁静默扩列).
  let vocab;
  try { vocab = new Set(JSON.parse(fs.readFileSync(VOCAB_ABS, 'utf8')).vocab); }
  catch (e) {
    console.error('FAIL: contract-vocab unreadable - run: node scripts/build-contract-vocab.js (' + e.message + ')');
    process.exit(1);
  }
  const fresh = build();
  try {
    const committed = JSON.parse(fs.readFileSync(VOCAB_ABS, 'utf8'));
    if (JSON.stringify(committed.vocab) !== JSON.stringify(fresh.vocab)) {
      console.error('FAIL: contract-vocab drift - the committed set no longer matches the bound generator\'s derivation; regenerate: node scripts/build-contract-vocab.js');
      process.exit(1);
    }
  } catch (e) { /* unreadable handled above */ }

  const exportsTable = repoExports.buildExportTable(ROOT).names;
  const files = repoExports.v1Files(ROOT);

  // basename -> [tracked paths] for bare-filename resolution
  const basenames = {};
  const exists = function (rel) { return fs.existsSync(path.join(ROOT, rel.split('/').join(path.sep))); };
  for (const f of files) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    const b = path.posix.basename(rel);
    (basenames[b] = basenames[b] || []).push(rel);
  }
  // repo-root files (including dotfiles like .gitattributes) are legitimate
  // comment targets too
  try {
    for (const n of fs.readdirSync(ROOT)) {
      if (fs.statSync(path.join(ROOT, n)).isFile()) {
        (basenames[n] = basenames[n] || []).push(n);
      }
    }
  } catch (e) { }
  try {
    for (const n of fs.readdirSync(path.join(ROOT, 'docs'))) {
      if (/\.(json|md)$/.test(n)) (basenames[n] = basenames[n] || []).push('docs/' + n);
    }
    for (const n of fs.readdirSync(ADR_DIR)) {
      (basenames[n] = basenames[n] || []).push('docs/adr/' + n);
    }
  } catch (e) { }

  const reds = [];
  const yellows = [];
  const stats = { files: 0, comments: 0, spans: 0, prose: 0, adr: 0, path: 0, symbol: 0, external: 0 };

  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    const declared = repoExports.fileDeclaredNames(text);
    const imported = repoExports.fileImportNames(text);
    stats.files++;
    for (const region of commentRegions(text)) {
      stats.comments++;
      for (const sp of spansIn(region.text, region.line)) {
        stats.spans++;
        const cls = classify(sp.span);
        const loc = rel + ':' + sp.line;
        if (cls.cls === 'prose') { stats.prose++; continue; }
        if (cls.cls === 'external') { stats.external++; continue; }
        if (cls.cls === 'pattern') { stats.pattern = (stats.pattern || 0) + 1; continue; }
        if (cls.cls === 'adr') {
          stats.adr++;
          const num = /(\d{4})/.exec(sp.span)[1];
          if (!adrExists(num)) reds.push(loc + ' ADR-' + num + ' - no docs/adr/' + num + '-*.md');
          continue;
        }
        if (cls.cls === 'path') {
          stats.path++;
          const r = pathResolves(cls.path, rel, exists, basenames);
          if (!r.ok) reds.push(loc + ' `' + sp.span + '` - ' + r.why);
          else if (explain) console.log('  [path-ok] ' + loc + ' `' + sp.span + '` -> ' + r.resolved);
          continue;
        }
        stats.symbol++;
        const r = symbolResolves(cls.ident, declared, imported, exportsTable);
        if (r.ok) { if (explain) console.log('  [sym-ok] ' + loc + ' `' + sp.span + '` via ' + r.via); continue; }
        if (vocab.has(cls.ident) || vocab.has(cls.ident.split('.').pop())) {
          yellows.push(loc + ' `' + sp.span + '` - contract-vocabulary (frozen set member)');
          continue;
        }
        reds.push(loc + ' `' + sp.span + '` - ' + r.why);
      }
    }
  }

  for (const y of yellows) console.log('YELLOW: ' + y);
  if (reds.length) {
    for (const e of reds) console.error('FAIL: ' + e);
    console.error('FAIL: comment-refs: ' + reds.length + ' unresolved reference(s), ' + yellows.length + ' contract-vocabulary disclosure(s)');
    process.exit(1);
  }
  console.log('[comment-refs] OK: ' + stats.files + ' files, ' + stats.comments + ' comment regions, ' + stats.spans +
    ' spans (' + stats.adr + ' ADR, ' + stats.path + ' path, ' + stats.symbol + ' symbol, ' + stats.prose + ' prose, ' + stats.external +
    ' external, ' + (stats.pattern || 0) + ' pattern), ' + yellows.length + ' yellow');
  process.exit(0);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { commentRegions, spansIn, classify, pathResolves, symbolResolves, AMBIENT };
