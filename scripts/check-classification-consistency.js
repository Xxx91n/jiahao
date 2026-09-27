#!/usr/bin/env node
// check-classification-consistency.js - ADR-0086 leg 2: consumption-vs-
// classification consistency for docs/governance/surface-taxonomy.json.
// Three clauses, all fail-closed:
//   (a) coverage  - every leaf path of the taxonomy resolves to a class in
//       field_governance.classification (a new field cannot be consumed
//       unclassified: registration is the price of being readable);
//   (b) staleness - every leaf class entry in the classification map resolves
//       to an existing taxonomy path (a deleted field cannot keep a class);
//   (c) consumption - the real consumers run against a recording proxy of the
//       live taxonomy; every dotted path actually read must exist AND be
//       classified. This catches phantom reads and silent schema drift that
//       static lists cannot see (the audit's "who consumes" concern).
// Usage: node scripts/check-classification-consistency.js

'use strict';

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const fresh = require('./evidence-freshness');
const surfaceTaxonomy = require('./surface-taxonomy');

const ROOT = path.join(__dirname, '..');
const TAX_REL = path.join('docs', 'governance', 'surface-taxonomy.json');
const CLASS_ENUM = ['fenced', 'exception-channel', 'editorial'];

function leafPaths(node, prefix, out) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const k of Object.keys(node)) leafPaths(node[k], prefix ? prefix + '.' + k : k, out);
    if (!Object.keys(node).length) out.push(prefix); // empty object is still a field
  } else {
    out.push(prefix); // scalars and arrays are leaves (array entries inherit)
  }
  return out;
}

// Longest-prefix resolution against the nested classification map.
function classOf(map, dotted) {
  let node = map;
  let cls = null;
  for (const seg of dotted.split('.')) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) break;
    if (!(seg in node)) break;
    const v = node[seg];
    if (typeof v === 'string') { cls = v; node = null; break; }
    node = v;
  }
  return cls;
}

// Does a recorded dotted path resolve inside the taxonomy? Array segments
// accept integer indices and Array/Object builtins (the array is the unit).
const BUILTINS = new Set(['length', 'constructor', 'prototype']);
function pathExists(tax, dotted) {
  let node = tax;
  for (const seg of dotted.split('.')) {
    if (Array.isArray(node)) {
      if (!/^\d+$/.test(seg)) return BUILTINS.has(seg);
      node = node[Number(seg)];
    } else if (node && typeof node === 'object') {
      if (!(seg in node)) return false;
      node = node[seg];
    } else {
      return false; // read descended into a scalar leaf
    }
  }
  return true;
}

// Recording proxy: every data-key read registers a dotted path. Methods and
// prototype members are not registry data and are skipped.
function recordProxy(obj, prefix, seen) {
  return new Proxy(obj, {
    get(t, k) {
      if (typeof k === 'symbol') return Reflect.get(t, k);
      const v = Reflect.get(t, k);
      if (typeof v === 'function') return v;
      if (v === undefined && !(k in t)) return undefined;
      const p = prefix ? prefix + '.' + k : String(k);
      seen.add(p);
      return v && typeof v === 'object' ? recordProxy(v, p, seen) : v;
    },
  });
}

function collectConsumption(tax, seen) {
  const pf = recordProxy(tax, '', seen);
  // evidence-freshness consumers (the registered freshness block):
  const cx = fresh.classifiers(pf.freshness);
  for (const f of ['.scratch/grill-t1/evidence/x.txt', '.scratch/grill-t1/SEAL', '.scratch/grill-t1/reports/r.md', 'src/x.js']) {
    fresh.classifyFile(f, cx);
  }
  // Standing legs on the live tree - genuine read surface, not a fixture list.
  fresh.orphanAncestry(ROOT, pf.freshness, {});
  const rounds = pf.freshness.rounds || [];
  if (rounds.length) fresh.evaluateRound(ROOT, pf.freshness, fresh.roundConfig(pf.freshness, rounds[rounds.length - 1].id));
  // governance-inventory's taxonomy reads (reclassifications, mechanism_outputs):
  const gi = require('./check-governance-inventory');
  const orig = surfaceTaxonomy.loadTaxonomy;
  surfaceTaxonomy.loadTaxonomy = function () { return pf; };
  try {
    gi.checkInventory(ROOT, {});
  } finally {
    surfaceTaxonomy.loadTaxonomy = orig;
  }
  return seen;
}

function checkConsistency(root) {
  const tax = JSON.parse(fs.readFileSync(path.join(root, TAX_REL), 'utf8'));
  const errors = [];
  const fg = tax.field_governance;
  if (!fg || typeof fg !== 'object') {
    errors.push('taxonomy lacks the field_governance classification block (ADR-0086 registration missing)');
    return { errors: errors, consumed: 0 };
  }
  const map = fg.classification;
  if (!map || typeof map !== 'object') {
    errors.push('field_governance.classification missing');
    return { errors: errors, consumed: 0 };
  }
  for (const c of fg.class_enum || []) {
    if (CLASS_ENUM.indexOf(c) === -1) errors.push('field_governance.class_enum admits unregistered class ' + JSON.stringify(c));
  }
  // (a) coverage: every leaf classified
  for (const p of leafPaths(tax, '', [])) {
    const cls = classOf(map, p);
    if (cls === null) errors.push('unclassified taxonomy field: ' + p);
    else if (CLASS_ENUM.indexOf(cls) === -1) errors.push('taxonomy field ' + p + ' classed ' + JSON.stringify(cls) + ' - not in the closed enum');
  }
  // (b) staleness: every classified leaf resolves to an existing path
  for (const p of leafPaths(map, '', [])) {
    if (CLASS_ENUM.indexOf(map && classOf(map, p)) !== -1 && !pathExists(tax, p)) {
      errors.push('classified path absent from the taxonomy (stale registration): ' + p);
    }
  }
  // (c) consumption: real consumers through the recording proxy. A recorded
  // path must resolve in the taxonomy (phantom-read detection); when it
  // resolves to a terminal leaf (scalar or array) it must carry a class -
  // intermediate containers classify transitively through their leaves.
  const seen = collectConsumption(tax, new Set());
  const leafSet = new Set(leafPaths(tax, '', []));
  for (const p of seen) {
    if (!pathExists(tax, p)) errors.push('consumer read path absent from the taxonomy: ' + p);
    else if (leafSet.has(p) && classOf(map, p) === null) errors.push('consumer read unclassified path: ' + p);
  }
  return { errors: errors, consumed: seen.size };
}

function main() {
  requireCapabilities('classification-consistency');
  const out = checkConsistency(ROOT);
  for (const e of out.errors) console.error('FAIL: ' + e);
  if (out.errors.length) process.exit(1);
  console.log('[classification-consistency] OK: taxonomy fully classified; ' + out.consumed + ' consumed paths all registered+classified (ADR-0086)');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkConsistency, leafPaths, classOf, pathExists, recordProxy };
