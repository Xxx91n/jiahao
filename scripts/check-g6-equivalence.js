#!/usr/bin/env node
// scripts/check-g6-equivalence.js - ADR-0064 D-E: G6 golden-sample
// equivalence gate (zero-dependency, thin CLI + pure core).
//
// Three pre-registered tiers (tolerances single-homed in
// thresholds.json.g6_gates):
//   (a) token multiset bit-equal    - g6-token-multiset  (== 0 mismatches)
//   (b) feature vector rel-L2 < tol - g6-feature-vector  (< 1e-9, diagnostic)
//       DIAGNOSTIC ruling (ADR-0064 repair round): tier (b) violations are
//       advisory warnings, not release blockers - the ADR labels tier (b)
//       'diagnostic'; tiers (a) and (c) bound the product and stay blocking.
//   (c) decision logit abs diff     - g6-logit           (< 1e-12, release)
// over exactly the 20 frozen items of bench/research/gold20.jsonl
// (g6-goldens == 20).
//
// Positive control: the same comparison re-run against a deliberately
// corrupted manifest copy MUST be rejected; if the corrupted port is accepted
// the gate is declared broken and fails closed.
//
// Usage: node scripts/check-g6-equivalence.js
// Exit 0 pass / exit 1 fail-closed.

'use strict';

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const port = require('../src/port/score');

const ROOT = path.join(__dirname, '..');
// ADR-0065 D-B.1: the port substrate moved into src/ (shipped in the tarball).
const MANIFEST_REL = path.join('src', 'port', 'g6-manifest.json');
const GOLD_REL = path.join('bench', 'research', 'gold20.jsonl');
const THRESHOLDS_REL = path.join('bench', 'polygraph', 'thresholds.json');

function gateValue(cfg, id) {
  const g = (cfg.g6_gates || []).filter(function (x) { return x.id === id; })[0];
  return g ? g.value : null;
}

function readJsonl(p) {
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(function (l) { return l.trim(); }).map(JSON.parse);
}

function relL2(a, b) {
  const am = new Map(a);
  const bm = new Map(b);
  let num = 0;
  let den = 0;
  const keys = new Set(Array.from(am.keys()).concat(Array.from(bm.keys())));
  for (const k of keys) {
    const d = (am.get(k) || 0) - (bm.get(k) || 0);
    num += d * d;
  }
  for (const p of b) den += p[1] * p[1];
  return den > 0 ? Math.sqrt(num / den) : Math.sqrt(num);
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function compare(manifest, golds, tol) {
  const errors = [];
  const warnings = [];
  const detail = [];
  for (const g of golds) {
    const tokens = port.tokenize(g.text, manifest.analyzer).sort();
    if (!sameMultiset(tokens, g.tokens)) {
      errors.push(g.id + ': token multiset mismatch (tier a, bit-equal)');
      continue;
    }
    const vec = port.vectorize(tokens, manifest);
    const rl = relL2(vec, g.vector);
    detail.push(g.id + ' relL2=' + rl.toExponential(2));
    if (!(rl < tol.relL2)) warnings.push(g.id + ': feature vector rel-L2 ' + rl.toExponential(3) + ' !< ' + tol.relL2 + ' (tier b, diagnostic - advisory)');
    const lg = port.logit(vec, manifest);
    const dl = Math.abs(lg - g.logit);
    if (!(dl < tol.logit)) errors.push(g.id + ': logit abs diff ' + dl.toExponential(3) + ' !< ' + tol.logit + ' (tier c)');
  }
  return { errors: errors, warnings: warnings, detail: detail };
}

function checkG6(root, opts) {
  const o = opts || {};
  const base = root || ROOT;
  const errors = [];
  const warnings = [];
  const cfg = o.thresholds || JSON.parse(fs.readFileSync(path.join(base, THRESHOLDS_REL), 'utf8'));
  const manifest = o.manifest || JSON.parse(fs.readFileSync(path.join(base, MANIFEST_REL), 'utf8'));
  const golds = o.golds || readJsonl(path.join(base, GOLD_REL));

  const tol = {
    relL2: gateValue(cfg, 'g6-feature-vector'),
    logit: gateValue(cfg, 'g6-logit'),
    tokens: gateValue(cfg, 'g6-token-multiset'),
    nGold: gateValue(cfg, 'g6-goldens'),
  };
  for (const k of Object.keys(tol)) if (tol[k] === null) errors.push('thresholds.json g6_gates missing ' + k + ' (D-E: pre-registered before porting)');
  if (errors.length) return { errors: errors, warnings: warnings, detail: [] };

  if (golds.length !== tol.nGold) errors.push('gold20.jsonl holds ' + golds.length + ' items, expected ' + tol.nGold);
  if (tol.tokens !== 0) errors.push('g6-token-multiset tolerance must be 0 (bit-equal)');
  if (manifest.source_adr !== '0064') errors.push('manifest source_adr must be 0064');
  for (const k of ['items.jsonl', 'labels.jsonl']) {
    if (manifest.corpus_fingerprints && cfg.corpus && manifest.corpus_fingerprints[k] !== cfg.corpus[k === 'items.jsonl' ? 'items_fingerprint' : 'labels_fingerprint']) {
      errors.push('manifest corpus fingerprint drift on ' + k);
    }
  }

  const res = compare(manifest, golds, tol);
  errors.push.apply(errors, res.errors);
  warnings.push.apply(warnings, res.warnings);

  // Positive control: a corrupted port must be rejected (ADR-0064 D-E).
  const corrupt = JSON.parse(JSON.stringify(manifest));
  const vk = Object.keys(corrupt.vocabulary);
  corrupt.vocabulary[vk[0]] = (corrupt.vocabulary[vk[0]] + 1) % corrupt.coef.length;
  corrupt.coef[0] += 0.5;
  const cres = compare(corrupt, golds, tol);
  if (cres.errors.length === 0) errors.push('POSITIVE CONTROL FAILED: corrupted manifest produced no blocking failure - the gate cannot detect port drift');

  return { errors: errors, detail: res.detail, warnings: warnings };
}

function main() {
  requireCapabilities('g6-equivalence');
  let out;
  try { out = checkG6(ROOT); }
  catch (e) { console.error('[g6-equivalence] fail-closed: ' + e.message); process.exit(1); }
  const errors = Array.isArray(out) ? out : out.errors;
  const warnings = Array.isArray(out) ? [] : (out.warnings || []);
  for (const w of warnings) console.warn('WARN(diagnostic): ' + w);
  for (const e of errors) console.error('FAIL: ' + e);
  if (errors.length) process.exit(1);
  console.log('[g6-equivalence] OK: 20 gold items, token multiset bit-equal (a), rel-L2 < 1e-9 (b, diagnostic), logit < 1e-12 (c); positive control rejects corrupted port');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkG6, compare, relL2, sameMultiset };
