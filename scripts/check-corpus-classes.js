#!/usr/bin/env node
// scripts/check-corpus-classes.js - ADR-0064 D-C/D-003: four-class corpus
// taxonomy guard (zero-dependency, thin CLI + pure core).
//
// Verifies bench/research/corpus-classes.json against the live tree:
//   (a) exactly the four pre-registered classes exist; homes are distinct
//       (no class merges into or substitutes for another).
//   (b) external-bench delegates to thresholds.json corpus pin (one home).
//   (c) private-probes files resolve via the ADR-0036 D2 corpus chain and
//       match the public fingerprints in thresholds.json private_corpus.
//   (d) judge-conformity: judge-twins.jsonl line count == declared n (26)
//       and n < min_n (100) -> status indeterminate; no_rung_statistics.
//   (e) devin-truth: manifest exists; status=collecting allows empty items;
//       status=frozen requires harness_commit + model_version + collected_at
//       + item_count == items.jsonl lines; every item id carries the devin-
//       prefix and collides with no gold20 id (committed file).
//   (f) no_rung_statistics: every non-bench class must declare it (D-003/
//       D-004(4): judge n=26 enters no rung statistic; Devin blind to rung 1).
//
// Usage: node scripts/check-corpus-classes.js
// Exit 0 pass / exit 1 fail. Pure core exported for the wiring test.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireCapabilities } = require('../src/shared/capability');
const { requireCorpus } = require('../src/shared/paths');

const MANIFEST_REL = path.join('bench', 'research', 'corpus-classes.json');
const THRESHOLDS_REL = path.join('bench', 'polygraph', 'thresholds.json');
const DEVIN_DIR_REL = path.join('bench', 'research', 'devin-corpus');
const GOLD_REL = path.join('bench', 'research', 'gold20.jsonl');
const CLASS_IDS = ['external-bench', 'private-probes', 'judge-conformity', 'devin-truth'];

function sha256buf(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function readJsonlSafe(p) {
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(function (l) { return l.trim(); }).map(function (l) { try { return JSON.parse(l); } catch (e) { return { __parse_error: String(e.message) }; } });
}

function checkClasses(root, opts) {
  const o = opts || {};
  const base = root || path.join(__dirname, '..');
  const errors = [];
  const m = o.manifest || JSON.parse(fs.readFileSync(path.join(base, MANIFEST_REL), 'utf8'));
  const cfg = o.thresholds || JSON.parse(fs.readFileSync(path.join(base, THRESHOLDS_REL), 'utf8'));

  // (a) class set + distinct homes
  const classes = (m && m.classes) || [];
  const ids = classes.map(function (c) { return c.id; });
  for (const want of CLASS_IDS) if (ids.indexOf(want) === -1) errors.push('class missing: ' + want + ' (D-C registers exactly four classes)');
  for (const c of classes) if (CLASS_IDS.indexOf(c.id) === -1) errors.push('unknown class ' + c.id + ' - the taxonomy is closed at four');
  const homes = classes.map(function (c) { return c.home; });
  if (new Set(homes).size !== homes.length) errors.push('class homes not distinct - a shared home is a merger vector (D-C)');

  const byId = {};
  for (const c of classes) byId[c.id] = c;

  // (b) external-bench delegates to the thresholds pin
  const eb = byId['external-bench'];
  if (eb) {
    if (eb.home !== 'bench/polygraph/thresholds.json#corpus') errors.push('external-bench home must be the thresholds.json corpus pin');
    if (eb.no_rung_statistics !== false) errors.push('external-bench is the sole rung feed - no_rung_statistics must be false');
  }

  // (c) private-probes: files resolve + match public fingerprints
  const pp = byId['private-probes'];
  if (pp) {
    const pins = {};
    for (const p of cfg.private_corpus || []) pins[p.id] = p.sha256;
    for (const f of pp.files || []) {
      if (!(f in pins)) { errors.push('private-probes file ' + f + ' has no public fingerprint in thresholds.json private_corpus'); continue; }
      if (o.skipFs) continue;
      let fp;
      try { fp = requireCorpus(f); } catch (e) { errors.push('private-probes file ' + f + ' unresolvable: ' + e.message); continue; }
      const actual = sha256buf(fs.readFileSync(fp));
      if (actual !== pins[f]) errors.push('private-probes ' + f + ' sha256 drift: ' + actual + ' != ' + pins[f]);
    }
  }

  // (d) judge-conformity n=26 indeterminate
  const jc = byId['judge-conformity'];
  if (jc) {
    if (jc.n !== 26) errors.push('judge-conformity n must be 26 (ADR-0064 D-C(3))');
    if (!(jc.min_n === 100 && jc.n < jc.min_n && jc.status === 'indeterminate')) {
      errors.push('judge-conformity must record n<min_n=100 -> indeterminate (ADR-0060 D-B)');
    }
    if (!o.skipFs) {
      let jf;
      try { jf = requireCorpus('judge-twins.jsonl'); } catch (e) { jf = null; errors.push('judge-twins.jsonl unresolvable: ' + e.message); }
      if (jf) {
        const n = fs.readFileSync(jf, 'utf8').split(/\r?\n/).filter(function (l) { return l.trim(); }).length;
        if (n !== jc.n) errors.push('judge-twins.jsonl holds ' + n + ' lines, manifest declares ' + jc.n);
      }
    }
  }

  // (e) devin-truth manifest + disjointness
  const dt = byId['devin-truth'];
  if (dt) {
    if (dt.snapshot !== 'devin-corpus@v1') errors.push('devin-truth snapshot must be devin-corpus@v1');
    const dmPath = path.join(base, DEVIN_DIR_REL, 'manifest.json');
    let dm = o.devinManifest || null;
    if (!dm && fs.existsSync(dmPath)) dm = JSON.parse(fs.readFileSync(dmPath, 'utf8'));
    if (!dm) errors.push('devin-corpus manifest.json missing');
    else {
      if (dm.snapshot !== 'devin-corpus@v1') errors.push('devin manifest snapshot must be devin-corpus@v1');
      const items = o.devinItems !== undefined ? o.devinItems : readJsonlSafe(path.join(base, DEVIN_DIR_REL, dm.items_file || 'items.jsonl'));
      if (dm.status === 'frozen') {
        for (const k of ['harness_commit', 'model_version', 'collected_at']) {
          if (!dm[k]) errors.push('frozen devin-corpus manifest missing ' + k + ' (D-C(4) snapshot naming)');
        }
        if (dm.item_count !== (items ? items.length : 0)) errors.push('frozen manifest item_count ' + dm.item_count + ' != items lines ' + (items ? items.length : 0));
      } else if (dm.status !== 'collecting') {
        errors.push('devin manifest status must be collecting|frozen, got ' + dm.status);
      }
      if (items) {
        const seen = new Set();
        const goldIds = new Set();
        const gold = o.goldItems !== undefined ? o.goldItems : readJsonlSafe(path.join(base, GOLD_REL));
        for (const g of gold || []) if (g && g.id) goldIds.add(g.id);
        // Item-level disjointness (D-C): every devin item is checked against
        // the private corpus id space and the public bench id prefix (pb-*).
        const privIds = new Set();
        if (o.privateIds) { for (const x of o.privateIds) privIds.add(x); }
        else {
          const ppFiles = ((byId['private-probes'] || {}).files) || [];
          for (const f of ppFiles) {
            let pf = null;
            try { pf = requireCorpus(f); } catch (e) { pf = null; }
            if (!pf) continue;
            for (const row of readJsonlSafe(pf) || []) {
              if (row && row.id) privIds.add(row.id);
              if (row && row.twin_id) privIds.add(row.twin_id);
            }
          }
        }
        for (const it of items) {
          if (it.__parse_error) { errors.push('devin item parse error: ' + it.__parse_error); continue; }
          if (typeof it.id !== 'string' || it.id.indexOf('devin-') !== 0) errors.push('devin item id must carry the devin- prefix: ' + JSON.stringify(it.id));
          if (seen.has(it.id)) errors.push('devin item id duplicate: ' + it.id);
          seen.add(it.id);
          if (goldIds.has(it.id)) errors.push('devin item ' + it.id + ' collides with a gold20 id (D-C disjointness)');
          if (privIds.has(it.id)) errors.push('devin item ' + it.id + ' collides with a private-corpus id (D-C disjointness)');
          if (it.id.indexOf('pb-') === 0) errors.push('devin item ' + it.id + ' carries the public bench pb- prefix (D-C disjointness)');
          if (typeof it.task !== 'string' || !it.task) errors.push('devin item ' + it.id + ' missing task');
          if (!(it.scoring_function && it.scoring_function.type === 'deterministic')) errors.push('devin item ' + it.id + ' missing deterministic scoring_function (METR)');
          if (it.label !== 'lie' && it.label !== 'honest') errors.push('devin item ' + it.id + ' label must be lie|honest');
        }
      }
    }
  }

  // (f) non-bench classes stay out of rung statistics
  for (const c of classes) {
    if (c.id !== 'external-bench' && c.no_rung_statistics !== true) {
      errors.push('class ' + c.id + ' must declare no_rung_statistics:true (D-003/D-004(4))');
    }
  }
  if (m.source_adr !== '0064') errors.push('source_adr must be 0064');
  return errors;
}

function main() {
  requireCapabilities('corpus-classes');
  const errors = checkClasses();
  for (const e of errors) console.error('FAIL: ' + e);
  if (errors.length) process.exit(1);
  console.log('[corpus-classes] OK: four classes distinct, pinned, disjointness rules armed');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkClasses, MANIFEST_REL, CLASS_IDS };
