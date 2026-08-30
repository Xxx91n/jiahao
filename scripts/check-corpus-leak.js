#!/usr/bin/env node
// scripts/check-corpus-leak.js - ADR-0036 D6: private-corpus leak detection gate
// (gitleaks ruleset shape: fingerprint rules over the worktree, fail-closed).
//
// Rules: (a) whole-file sha256 of each corpus file; (b) per-line sha256 of every
// corpus line (catches copy-pasted corpus content anywhere in the tree);
// (c) optional canary GUID via env JIAHAO_CORPUS_CANARY (detection-only,
// defense-in-depth - BIG-bench canary is known-bypassable, so it is optional).
// Fingerprints are read from bench/polygraph/thresholds.json private_corpus
// (public anchors; ADR-0027 content-anchor discipline). Corpus content is read
// via the ADR-0036 D2 resolver (requireCorpus -> exit 2 "run install" when
// absent). Excludes the corpus home (private/), results dirs, .git,
// node_modules and binary blobs. One hit = exit 1.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireCorpus } = require('../src/shared/paths');

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('bench', 'polygraph', 'thresholds.json');
const CORPORA = ['probes.jsonl', 'judge-twins.jsonl', 'twins.jsonl'];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'private', 'results', 'probe-artifacts', 'bench-artifacts', 'coverage', 'dist', '.codegraph', '.codex-tmp', '.scratch']);
const BINARY_EXT = new Set(['.png', '.ico', '.icns', '.jpg', '.jpeg', '.gif', '.webp', '.exe', '.dll', '.node', '.pdb', '.msi', '.so', '.dylib', '.bin', '.zip', '.gz', '.tar', '.7z', '.db']);
const MAX_BYTES = 5 * 1024 * 1024;

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// Walk the worktree; returns relative posix paths. Unit-tested in jest via a tmp dir.
function walk(dir, rel) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), r).forEach(f => out.push(f));
    } else if (e.isFile()) {
      if (BINARY_EXT.has(path.extname(e.name).toLowerCase())) continue;
      out.push(r);
    }
  }
  return out;
}

// Ruleset: { fileSha: Map(sha256 -> corpus), lineSha: Map(sha256 -> corpus) }.
// fileMap: { corpusName: absolutePath } (resolved by the caller via requireCorpus).
function buildRules(fileMap) {
  const fileSha = new Map();
  const lineSha = new Map();
  for (const name of CORPORA) {
    const buf = fs.readFileSync(fileMap[name]);
    fileSha.set(crypto.createHash('sha256').update(buf).digest('hex'), name);
    for (const line of buf.toString('utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (t.length < 24) continue; // too short to be a distinctive fingerprint
      const h = sha256(t);
      if (!lineSha.has(h)) lineSha.set(h, name);
    }
  }
  return { fileSha, lineSha };
}

// Scan one file; returns hit strings ([] = clean).
function scanFile(rel, abs, rules, canary) {
  const hits = [];
  const st = fs.statSync(abs);
  if (st.size > MAX_BYTES) return hits;
  const buf = fs.readFileSync(abs);
  const fh = crypto.createHash('sha256').update(buf).digest('hex');
  if (rules.fileSha.has(fh)) {
    hits.push(rel + ': exact copy of corpus file ' + rules.fileSha.get(fh));
    return hits;
  }
  const text = buf.toString('utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const h = sha256(t);
    if (rules.lineSha.has(h)) {
      hits.push(rel + ': contains corpus line from ' + rules.lineSha.get(h));
      break; // one hit per file is enough evidence
    }
  }
  if (canary && text.indexOf(canary) !== -1) hits.push(rel + ': canary GUID present');
  return hits;
}

function checkLeaks(root, rules, canary) {
  const hits = [];
  for (const rel of walk(root, '')) hits.push(...scanFile(rel, path.join(root, rel), rules, canary));
  return hits;
}

module.exports = { walk, buildRules, scanFile, checkLeaks, CORPORA, SKIP_DIRS };

if (require.main === module) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));
  const anchors = Array.isArray(cfg.private_corpus) ? cfg.private_corpus : [];
  if (anchors.length !== CORPORA.length) {
    console.error('FAIL-CLOSED: thresholds.json private_corpus must list ' + CORPORA.length + ' fingerprints (ADR-0036 D2)');
    process.exit(2);
  }
  // Fail-closed corpus availability: requireCorpus exits 2 with run-install hint.
  const corpusFiles = Object.fromEntries(CORPORA.map(n => [n, requireCorpus(n)]));
  // Public anchor must match the local corpus bytes (tamper / drift detection).
  for (const a of anchors) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(corpusFiles[a.id])).digest('hex');
    if (a.sha256 !== actual) {
      console.error('FAIL: fingerprint mismatch for ' + a.id + ' (anchor ' + a.sha256.slice(0, 12) + ' vs actual ' + actual.slice(0, 12) + ')');
      process.exit(1);
    }
  }
  const rules = buildRules(corpusFiles);
  const hits = checkLeaks(ROOT, rules, process.env.JIAHAO_CORPUS_CANARY || null);
  for (const h of hits) console.error('LEAK: ' + h);
  if (hits.length) process.exit(1);
  console.log('[corpus-leak] clean: ' + CORPORA.length + ' corpora, ' + rules.lineSha.size + ' line fingerprints, ' + walk(ROOT, '').length + ' files scanned (ADR-0036 D6)');
  process.exit(0);
}
