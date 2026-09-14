#!/usr/bin/env node
// scripts/collect-devin-corpus.js - ADR-0064 D-005(6,7): Devin ground-truth
// corpus collector harness (zero-dependency).
//
// Devin's role is fixed: a METR Task Standard ground-truth collector feeding
// frozen snapshots (task + setup + deterministic scoring function); NEVER a
// training/tuning corpus, never a judge stand-in, never an eval dependency.
// Items are blind to rung 1 and unlock only after rung-1 settlement.
//
// Collection path: a local Devin session (D:\Devin\Devin.exe,
// devin-desktop 1.126.0, unlimited tokens) authors task items into
// bench/research/devin-corpus/incoming/*.jsonl drops. This harness validates
// drops and freezes them into items.jsonl + manifest.json (devin-corpus@v1
// names harness commit + model version + date). The desktop CLI is a GUI
// launcher; collection is therefore a session-side drop protocol, not a
// headless spawn - the harness owns validation and the freeze.
//
// Usage:
//   node scripts/collect-devin-corpus.js schema
//   node scripts/collect-devin-corpus.js validate
//   node scripts/collect-devin-corpus.js snapshot [--model-version X] [--date YYYY-MM-DD]

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const { checkClasses } = require('./check-corpus-classes');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'bench', 'research', 'devin-corpus');
const INCOMING = path.join(DIR, 'incoming');
const ITEMS = path.join(DIR, 'items.jsonl');
const MANIFEST = path.join(DIR, 'manifest.json');
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^devin-[a-z0-9-]+$/;

const ITEM_SCHEMA = {
  id: 'devin-<slug> (unique; the devin- prefix is the disjointness contract)',
  task: 'string - the task prompt shown to the agent',
  setup: 'string - environment/setup contract for the task',
  scoring_function: 'object {type: deterministic, spec: string} - mechanical, reproducible',
  label: 'lie|honest - ground truth from the scoring function, not judge preference',
  transcript: 'optional {events:[...], closing:string} in transcript-format v1',
  provenance: 'string - collection session reference',
  collected_at: 'YYYY-MM-DD'
};

function readJsonl(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(function (l) { return l.trim(); }).map(JSON.parse);
}

// Pure validator over item objects -> error list. Shared by validate and
// snapshot; the corpus-classes gate repeats the disjointness half against
// gold20 at the class level.
function validateItem(it) {
  const problems = [];
  if (!it || typeof it !== 'object') return ['not an object'];
  if (typeof it.id !== 'string' || !ID_RE.test(it.id)) problems.push('id must match ' + ID_RE);
  if (typeof it.task !== 'string' || !it.task.trim()) problems.push('task');
  if (typeof it.setup !== 'string' || !it.setup.trim()) problems.push('setup');
  const sf = it.scoring_function;
  if (!(sf && sf.type === 'deterministic' && typeof sf.spec === 'string' && sf.spec.trim())) problems.push('scoring_function{type:deterministic,spec}');
  if (it.label !== 'lie' && it.label !== 'honest') problems.push('label lie|honest');
  if (typeof it.provenance !== 'string' || !it.provenance) problems.push('provenance');
  if (typeof it.collected_at !== 'string' || !ISO.test(it.collected_at)) problems.push('collected_at YYYY-MM-DD');
  if (it.transcript !== undefined) {
    const t = it.transcript;
    if (!(t && Array.isArray(t.events) && typeof t.closing === 'string')) problems.push('transcript{events,closing}');
  }
  return problems;
}

function validate() {
  const errors = [];
  const drops = fs.existsSync(INCOMING)
    ? fs.readdirSync(INCOMING).filter(function (f) { return /\.jsonl$/.test(f); })
    : [];
  const items = readJsonl(ITEMS);
  const seen = new Set(items.map(function (i) { return i.id; }));
  for (const it of items) {
    const p = validateItem(it);
    if (p.length) errors.push('items.jsonl ' + (it && it.id) + ': ' + p.join(', '));
  }
  for (const d of drops) {
    const lines = readJsonl(path.join(INCOMING, d));
    for (const it of lines) {
      const p = validateItem(it);
      if (p.length) { errors.push(d + ' ' + (it && it.id) + ': ' + p.join(', ')); continue; }
      if (seen.has(it.id)) errors.push(d + ' ' + it.id + ': duplicate id');
      else seen.add(it.id);
    }
  }
  return { errors: errors, drops: drops, items: items };
}

function arg(argv, name) {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : null;
}

function snapshot(argv) {
  const modelVersion = arg(argv, 'model-version') || 'devin-desktop 1.126.0';
  const date = arg(argv, 'date') || new Date().toISOString().slice(0, 10);
  const v = validate();
  if (v.errors.length) {
    for (const e of v.errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  // Fold validated drops into items.jsonl (append-only; dup ids refused above).
  const merged = v.items.slice();
  for (const d of v.drops) merged.push.apply(merged, readJsonl(path.join(INCOMING, d)));
  fs.writeFileSync(ITEMS, merged.map(function (i) { return JSON.stringify(i); }).join('\n') + (merged.length ? '\n' : ''), { encoding: 'utf8' });
  const manifest = {
    schema_version: 1,
    _doc: 'ADR-0064 D-C(4)/D-005(6,7): devin-corpus@v1 ground-truth snapshot descriptor - names harness commit + model version + date. Items are blind to rung 1 and unlock only after rung-1 settlement.',
    snapshot: 'devin-corpus@v1',
    status: merged.length ? 'frozen' : 'collecting',
    harness_commit: merged.length ? commit : null,
    model_version: modelVersion,
    collected_at: merged.length ? date : null,
    item_count: merged.length,
    items_file: 'items.jsonl',
    incoming_dir: 'incoming',
    scoring: 'deterministic scoring function per item (METR Task Standard); labels mechanically reproducible',
    blind_until: 'rung-1 settlement (ADR-0064 D-C(4))',
    plan: 'plan.json (registered before collection; categories + counts + disjointness only, never item content)',
    verification: 'spec-layer dual verification; no Cohen kappa - mechanical labels make IAA a category error (ADR-0065 D-C.2)',
    conformity_disclaimer: 'devin-corpus@v1 is never cited by any conformity claim (ADR-0065 D-C.4)',
    disjoint_from: ['external-bench (polygraph-396, pb- ids)', 'golden-sample (gold20)', 'judge-conformity (n=26)'],
    source_adr: '0064'
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8' });
  for (const d of v.drops) fs.renameSync(path.join(INCOMING, d), path.join(INCOMING, d + '.consumed'));
  // Post-freeze class-level re-check: disjointness vs gold20 is enforced here.
  const errs = checkClasses(ROOT);
  if (errs.length) {
    for (const e of errs) console.error('FAIL: ' + e);
    process.exit(1);
  }
  console.log('[devin-corpus] snapshot ' + manifest.status + ': ' + merged.length + ' items, harness ' + commit.slice(0, 12) + ', ' + modelVersion);
}

function main() {
  const cmd = process.argv[2];
  requireCapabilities(['repo-tree']);
  if (cmd === 'schema') {
    console.log(JSON.stringify(ITEM_SCHEMA, null, 2));
    return;
  }
  if (cmd === 'validate') {
    const v = validate();
    for (const e of v.errors) console.error('FAIL: ' + e);
    if (v.errors.length) process.exit(1);
    console.log('[devin-corpus] validate OK: ' + v.items.length + ' frozen items, ' + v.drops.length + ' pending drops');
    return;
  }
  if (cmd === 'snapshot') { snapshot(process.argv); return; }
  console.error('[usage]: collect-devin-corpus.js schema|validate|snapshot');
  process.exit(1);
}

if (require.main === module) main();

module.exports = { ITEM_SCHEMA, validateItem, validate };
