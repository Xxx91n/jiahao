#!/usr/bin/env node
// scripts/check-corpus-leak.js - ADR-0036 D6: private-corpus leak detection gate
// (gitleaks ruleset shape: fingerprint rules over the worktree AND the evidence
// log, fail-closed).
//
// Rules: (a) whole-file sha256 of each corpus file; (b) per-line sha256 of every
// corpus line, exact trimmed-line match (Deviation D6a: n-gram shards were tried
// and rejected - corpus lines legitimately quote profile rule text that the
// adapters/docs also contain, so shard windows false-positive; the honest scope
// is whole-line + whole-file fingerprints);
// (c) optional canary GUID via env JIAHAO_CORPUS_CANARY (detection-only,
// defense-in-depth - BIG-bench canary is known-bypassable, so it is optional).
// Fingerprints are read from bench/polygraph/thresholds.json private_corpus
// (public anchors; ADR-0027 content-anchor discipline). Corpus content is read
// via the ADR-0036 D2 resolver (requireCorpus -> exit 1 with a [config]:
// "run install" message when absent, per ADR-0041 D3). Excludes the corpus home (private/), results dirs, .git,
// node_modules and binary blobs. One hit = exit 1.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireCorpus, evidencePath, evidenceKeysPath } = require('../src/shared/paths');
const { requireCapabilities } = require('../src/shared/capability');
const { PREFIXES } = require('../src/shared/prefix-vocab'); // ADR-0043 D-E: prefix vocabulary fact source

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('bench', 'polygraph', 'thresholds.json');
const CORPORA = ['probes.jsonl', 'judge-twins.jsonl', 'twins.jsonl', 'mr-probes.jsonl'];

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
  let st, buf;
  try {
    st = fs.statSync(abs);
    if (st.size > MAX_BYTES) return hits;
    buf = fs.readFileSync(abs);
  } catch (e) {
    // Test suites can create and delete temp files during the scan. A raced
    // ENOENT is a vanished file, not a leak and not scanner corruption.
    if (e && e.code === 'ENOENT') return hits;
    throw e;
  }
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

// Pure anchor validation: null = ok, otherwise { code, message } (fail-closed).
// Checks the anchor id SET (not just the count) and the sha256 of each corpus.
function validateAnchors(anchors, corpusFiles) {
  if (!Array.isArray(anchors) || anchors.length !== CORPORA.length) {
    return { code: 1, message: PREFIXES.config + ' FAIL-CLOSED: thresholds.json private_corpus must list ' + CORPORA.length + ' fingerprints (ADR-0036 D2)' };
  }
  const byId = new Map(anchors.map(a => [a.id, a.sha256]));
  for (const name of CORPORA) {
    if (!byId.has(name) || typeof byId.get(name) !== 'string') {
      return { code: 1, message: PREFIXES.config + ' FAIL-CLOSED: thresholds.json private_corpus missing anchor for ' + name + ' (ADR-0036 D2)' };
    }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(corpusFiles[name])).digest('hex');
    if (byId.get(name) !== actual) {
      return { code: 1, message: 'FAIL: fingerprint mismatch for ' + name + ' (anchor ' + byId.get(name).slice(0, 12) + ' vs actual ' + actual.slice(0, 12) + ')' };
    }
  }
  return null;
}

module.exports = { walk, buildRules, scanFile, checkLeaks, validateAnchors, CORPORA, SKIP_DIRS };

if (require.main === module) {
  requireCapabilities('corpus-leak');
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));
  const anchors = Array.isArray(cfg.private_corpus) ? cfg.private_corpus : [];
  // Fail-closed corpus availability: requireCorpus exits 1 ([config]:) with the
  // honest hint; corpus-dir absence exits 2 earlier via requireCapabilities.
  const corpusFiles = Object.fromEntries(CORPORA.map(n => [n, requireCorpus(n)]));
  // Public anchors (id-set + sha256) must match the local corpus bytes.
  const bad = validateAnchors(anchors, corpusFiles);
  if (bad) { console.error(bad.message); process.exit(bad.code); }
  const rules = buildRules(corpusFiles);
  const canaryEnv = process.env.JIAHAO_CORPUS_CANARY || null;
  const hits = checkLeaks(ROOT, rules, canaryEnv);
  // The evidence log lives outside the worktree; D6 names it a leak surface,
  // so scan it explicitly (audit follow-up: it was declared but not scanned).
  for (const ev of [evidencePath(), evidenceKeysPath()]) {
    if (!fs.existsSync(ev)) continue;
    const st = fs.statSync(ev);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(ev)) {
        const abs = path.join(ev, name);
        if (!fs.statSync(abs).isFile()) continue;
        for (const h of scanFile('evidence-log/' + name, abs, rules, canaryEnv)) hits.push('evidence-log ' + h);
      }
    } else {
      for (const h of scanFile(ev, ev, rules, canaryEnv)) hits.push('evidence-log ' + h);
    }
  }
  for (const h of hits) console.error('LEAK: ' + h);
  if (hits.length) process.exit(1);
  console.log('[corpus-leak] clean: ' + CORPORA.length + ' corpora, ' + rules.lineSha.size + ' line fingerprints, ' + walk(ROOT, '').length + ' files scanned (ADR-0036 D6)');
  process.exit(0);
}
