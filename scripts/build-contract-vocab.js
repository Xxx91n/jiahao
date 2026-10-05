#!/usr/bin/env node
'use strict';
// scripts/build-contract-vocab.js - grill-t37 D-004.3/.8 (Delta2 surface 6):
// generator for the FROZEN contract-vocabulary set consumed by the M-D
// comment-reference leg's yellow-level exemption. The set is committed
// (docs/governance/contract-vocab.json) and the bound generating source is
// THIS script (M4): check-comment-refs re-derives the set in-memory and diffs
// it against the committed file, so a word joining the vocabulary is always
// a visible regeneration commit - '禁静默扩列' enforced mechanically.
//
// Collections are named extraction rules (one collection = one concept-level
// word set, never per-node JSON granularity). Each collection declares its
// source so a member's provenance is one hop away.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_REL = path.join('docs', 'governance', 'contract-vocab.json');
const OUT_ABS = path.join(ROOT, OUT_REL);
const IDENT = /^[A-Za-z_$][\w$]*$/;
const SHORT_WORD = /^[A-Za-z][\w$-]{0,39}$/;

// Committed JSON registries whose field names + short string values are
// registered vocabulary. Adding a field to any of these files re-derives a
// larger set -> the frozen file drifts -> the leg fails -> regen commit is
// the registration event.
// The enumeration source: every committed JSON under docs/ (registries,
// manifests, baselines) plus the bench thresholds file - the family of
// surfaces whose field names and enum values are registered vocabulary.
const JSON_REGISTRIES = (function () {
  const out = [];
  const w = function (d, rel) {
    let names;
    try { names = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const n of names) {
      const p = path.join(d, n.name);
      const r = rel ? rel + '/' + n.name : n.name;
      if (n.isDirectory()) w(p, r);
      // the output file itself is excluded - self-inclusion would make the
      // derivation depend on the committed artifact (bootstrap loop)
      else if (/\.json$/.test(n.name) && ('docs/' + r) !== OUT_REL.split(path.sep).join('/')) out.push('docs/' + r);
    }
  };
  w(path.join(ROOT, 'docs'), '');
  if (fs.existsSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'))) out.push('bench/polygraph/thresholds.json');
  return out.sort();
})();

// Code-side closed enums: {collection id -> [file, exported member]}.
const CODE_ENUMS = [
  ['capabilities', 'src/shared/capability.js', 'CAPABILITIES'],
  ['unit-kinds', 'src/shared/status-inventory.js', 'UNIT_KINDS'],
  ['reason-codes', 'src/shared/status-inventory.js', 'REASON_CODES'],
  ['prefixes', 'src/shared/prefix-vocab.js', 'PREFIXES'],
];

function jsonWords(obj, acc) {
  if (Array.isArray(obj)) {
    for (const x of obj) {
      if (typeof x === 'string' && IDENT.test(x)) acc.add(x);
      else jsonWords(x, acc);
    }
  } else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      if (SHORT_WORD.test(k)) acc.add(k);
      jsonWords(obj[k], acc);
    }
  } else if (typeof obj === 'string' && IDENT.test(obj) && obj.length <= 40) {
    acc.add(obj);
  }
}

function collectJsonRegistry(rel) {
  const abs = path.join(ROOT, rel.split('/').join(path.sep));
  const words = new Set();
  try { jsonWords(JSON.parse(fs.readFileSync(abs, 'utf8')), words); } catch (e) { /* absent optional registries contribute nothing */ }
  return words;
}

function collectModuleConst(rel, member) {
  try {
    const mod = require(path.join(ROOT, rel.split('/').join(path.sep)));
    const v = mod[member];
    if (Array.isArray(v)) return new Set(v.filter(function (x) { return typeof x === 'string'; }));
    if (v && typeof v === 'object') return new Set(Object.keys(v));
  } catch (e) { /* module constants are required - a load failure is surfaced by the check leg */ }
  return new Set();
}

// process.env.NAME tokens actually referenced anywhere in the v1 dirs.
function collectEnvVars() {
  const words = new Set();
  const files = require('../src/shared/repo-exports').v1Files(ROOT);
  const re = /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g;
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    let m;
    while ((m = re.exec(text))) words.add(m[1]);
  }
  return words;
}

// package.json script names + dependency names (they appear in comments as
// vocabulary: `npm run gate:all`, `jest`, ...).
function collectPackage() {
  const words = new Set();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    for (const k of Object.keys(pkg.scripts || {})) {
      // script names may carry ':' (gate:all) - record both full and segments
      words.add(k);
      for (const seg of k.split(':')) if (IDENT.test(seg)) words.add(seg);
    }
    for (const k of Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}))) {
      const base = k.split('/').pop();
      if (IDENT.test(base)) words.add(base);
    }
  } catch (e) { }
  return words;
}

// Language-level literals and host globals that comments legitimately name.
// This collection is declared here (its enumeration source is this rule) -
// it is a measured, closed list, not an open 'anything plausible' bucket.
const JS_LITERALS = [
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'this',
  'module', 'exports', 'require', 'process', 'console', 'Buffer', 'JSON', 'Math',
  'Set', 'Map', 'Promise', 'Error', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Date', 'RegExp', 'Symbol', 'setTimeout', 'setInterval', 'setImmediate',
  '__dirname', '__filename', 'global', 'globalThis',
  'utf8', 'utf16le', 'ascii', 'base64', 'hex', 'binary', 'latin1', 'ucs2',
  'string', 'number', 'boolean', 'object', 'function', 'symbol', 'bigint',
  'stdout', 'stderr', 'stdin', 'env', 'argv', 'cwd', 'exit', 'pid', 'kill',
  'head', 'HEAD', 'index', 'worktree', 'sha', 'ref', 'refs', 'origin',
];
// Type/status words used across the repo's own output grammar, plus the
// tool/runtime names comments legitimately cite (a comment naming `node` or
// `git` names the tool, not a repo binding).
const OUTPUT_WORDS = [
  'pass', 'fail', 'unverifiable', 'green', 'red', 'warn', 'warning', 'error',
  'skipped', 'pending', 'deferred', 'closed', 'actioned', 'stale', 'indeterminate',
  'confirmatory', 'observational', 'informational', 'advisory',
  'ok', 'OK', 'FAIL', 'WARN', 'TRIGGERED', 'UNVERIFIABLE',
  'node', 'npm', 'npx', 'git', 'jest', 'bash', 'pwsh', 'powershell',
];
// ADR-0086 examiner-channel / roles-registry schema members registered in
// code + prose but not yet instantiated in a committed JSON row (the
// examiner class is empty by design). They are contract vocabulary the
// moment they are written; listing them here registers them.
const SCHEMA_WORDS = [
  'ratified_by', 'archived', 'ratified', 'requested_by', 'scope',
  'pending-confirmation',
];

// .gitattributes attribute names (text, eol, binary...) - comments cite them
// as vocabulary, never as paths.
function collectGitattributes() {
  const words = new Set();
  try {
    const t = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
    for (const line of t.split(/\r?\n/)) {
      const s = line.trim();
      if (!s || s[0] === '#') continue;
      for (const tok of s.split(/\s+/).slice(1)) {
        const w = tok.replace(/^-/, '').replace(/=.*$/, '');
        if (IDENT.test(w)) words.add(w);
      }
    }
  } catch (e) { }
  return words;
}

function build() {
  const collections = [];
  const push = function (id, source, words) {
    collections.push({ id: id, source: source, members: Array.from(words).sort() });
  };
  for (const rel of JSON_REGISTRIES) {
    push('json:' + rel.split('/').pop().replace(/\.json$/, ''), rel, collectJsonRegistry(rel));
  }
  for (const ce of CODE_ENUMS) {
    push('enum:' + ce[0], ce[1] + '#' + ce[2], collectModuleConst(ce[1], ce[2]));
  }
  push('env-vars', 'process.env.* referenced under scripts/src/test', collectEnvVars());
  push('package', 'package.json scripts+deps', collectPackage());
  push('gitattributes', '.gitattributes attribute names', collectGitattributes());
  push('js-literals', 'declared in build-contract-vocab.js (measured list)', new Set(JS_LITERALS));
  push('output-words', 'declared in build-contract-vocab.js (measured list)', new Set(OUTPUT_WORDS));
  push('schema-words', 'declared in build-contract-vocab.js (ADR-0086 channel members, uninstantiated)', new Set(SCHEMA_WORDS.filter(function (w) { return IDENT.test(w); })));
  const vocab = new Set();
  for (const c of collections) for (const w of c.members) vocab.add(w);
  return {
    schema_version: 1,
    _doc: 'grill-t37 D-004.3 (Delta2 surface 6): the FROZEN contract-vocabulary set for the M-D comment-reference leg yellow exemption. Generated - hand-edit forbidden; regenerate with node scripts/build-contract-vocab.js. A word entering this set is a registration event: the leg re-derives the set and fails on drift (禁静默扩列).',
    generated_by: 'scripts/build-contract-vocab.js',
    collections: collections,
    vocab: Array.from(vocab).sort(),
  };
}

function render(doc) {
  return JSON.stringify(doc, null, 2) + '\n';
}

function main(argv) {
  const doc = build();
  delete doc.generated_at; // deterministic output: --check diffs whole-doc
  if (argv.indexOf('--check') !== -1) {
    let cur = null;
    try { cur = fs.readFileSync(OUT_ABS, 'utf8'); } catch (e) { cur = null; }
    if (cur !== render(doc)) {
      console.error('FAIL: contract-vocab drift - regenerate: node scripts/build-contract-vocab.js');
      process.exit(1);
    }
    console.log('[contract-vocab] OK: ' + doc.vocab.length + ' words across ' + doc.collections.length + ' collections');
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(OUT_ABS), { recursive: true });
  fs.writeFileSync(OUT_ABS, render(doc), 'utf8');
  console.log('[contract-vocab] wrote ' + OUT_REL.split(path.sep).join('/') + ': ' + doc.vocab.length + ' words, ' + doc.collections.length + ' collections');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, render, OUT_REL, JSON_REGISTRIES };
