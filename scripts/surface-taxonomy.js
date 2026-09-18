#!/usr/bin/env node
'use strict';
// scripts/surface-taxonomy.js — ADR-0076 D-A: the round edit-surface taxonomy
// authority. Two pure functions power both the wiring test and the
// governance-inventory recompute-not-trusted check:
//   computeRuntimeClosure(root) — the static require() closure of the bin
//     entry (scripts/install.js), repo-relative files only (external deps and
//     builtins excluded). The product boundary is this closure, never the
//     package files[] list.
//   classifyPath(rel, closureSet) — 'R1' | 'R2' | 'R3' for one repo path.
// R1 = runtime surface (the closure): implementation-round territory
// absolutely, no carve-out exists. R3 = documentation surface: free in a
// documentation round. R2 = governance machinery: doc-round touchable only
// through the registered carve-out (ADR-0076 D-B).

const fs = require('fs');
const path = require('path');

const BIN_SEEDS = ['scripts/install.js'];
const TAXONOMY_REL = path.join('docs', 'governance', 'surface-taxonomy.json');

// R3 documentation-surface rules. Mechanism vocabulary only — the wiring
// test pins these patterns against silent drift.
const R3_PREFIXES = ['docs/', '.scratch/', 'adapters/'];
const R3_EXACT = ['CONTEXT.md', 'README.md', 'AGENTS.md'];
const R3_WIRING_TEST = (r) => r.startsWith('test/adr-') && r.endsWith('-wiring.test.js');

const REQ_RE = new RegExp('require\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\)', 'g');

function relOf(p, root) { return path.relative(root, p).split(path.sep).join('/'); }

function resolveRequire(spec, fromFile) {
  if (!spec.startsWith('.')) return null; // external dependency or builtin
  const base = path.resolve(path.dirname(fromFile), spec);
  const cands = [base, base + '.js', base + '.json', path.join(base, 'index.js')];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

// Static require() closure: BFS from the bin seeds over repo-relative
// requires. JSON files are leaves. Returns sorted repo-relative POSIX paths.
function computeRuntimeClosure(root) {
  const seen = new Set();
  const queue = BIN_SEEDS.map(function (s) { return path.join(root, s); });
  const out = [];
  while (queue.length) {
    const abs = queue.shift();
    const rel = relOf(abs, root);
    if (seen.has(rel)) continue;
    seen.add(rel);
    out.push(rel);
    if (!/.js$/.test(rel)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    REQ_RE.lastIndex = 0;
    let m;
    while ((m = REQ_RE.exec(text))) {
      const spec = m[1] || m[2];
      const target = spec && resolveRequire(spec, abs);
      if (target && !seen.has(relOf(target, root))) queue.push(target);
    }
  }
  return out.sort();
}

function classifyPath(rel, closureSet) {
  const r = String(rel).split(path.sep).join('/');
  if (closureSet.has(r)) return 'R1';
  if (R3_EXACT.indexOf(r) !== -1) return 'R3';
  for (const p of R3_PREFIXES) { if (r.indexOf(p) === 0) return 'R3'; }
  if (R3_WIRING_TEST(r)) return 'R3';
  return 'R2';
}

function loadTaxonomy(root) {
  const base = root || path.join(__dirname, '..');
  return JSON.parse(fs.readFileSync(path.join(base, TAXONOMY_REL), 'utf8'));
}

module.exports = { BIN_SEEDS, TAXONOMY_REL, R3_PREFIXES, R3_EXACT, R3_WIRING_TEST, computeRuntimeClosure, classifyPath, loadTaxonomy };
