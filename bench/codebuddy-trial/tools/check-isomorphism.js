#!/usr/bin/env node
// bench/codebuddy-trial/tools/check-isomorphism.js — D-005 five structural
// isomorphism assertions over volumes a/b/c. Structural equivalence is the
// only machine-checked equivalence; difficulty equivalence stays declared
// in the volumes' declared_not_proven blocks (never asserted here).
//
// A1 category x count identical across volumes (non-replay tasks)
// A2 base needle-type multiset identical (replay needles excluded)
// A3 prompt-shape signature multiset identical (skeleton, content-stripped)
// A4 shape_group bijection: identical group sets, 1 base task per group per volume
// A5 replay sanity: 2-3 replay tasks, each pointing at an existing A-group,
//    and every task's workbench_site + check file exists on disk.
//
// Usage: node check-isomorphism.js [--trial-root <dir>]
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('./lib/common');
const paths = require('./lib/paths');

const args = parseArgs(process.argv.slice(2));
const T = paths.resolve(args['trial-root']);
const errors = [];

const vols = {};
for (const v of ['a', 'b', 'c']) {
  vols[v] = JSON.parse(fs.readFileSync(path.join(T.VOLUMES, v + '.json'), 'utf8'));
}
const base = (v) => vols[v].tasks.filter((t) => t.replay_shape_group === null);
const repl = (v) => vols[v].tasks.filter((t) => t.replay_shape_group !== null);

// A1: category x count over non-replay tasks.
const catCount = (v) => {
  const c = {};
  for (const t of base(v)) c[t.category] = (c[t.category] || 0) + 1;
  return JSON.stringify(c, Object.keys(c).sort());
};
const cc = ['a', 'b', 'c'].map((v) => catCount(v));
if (cc[0] !== cc[1] || cc[1] !== cc[2]) errors.push('A1 category-count mismatch: ' + cc.join(' vs '));

// A2: base needle-type multiset (type lives in the needles[] inventory).
const needleTypes = (v) => (vols[v].needles || []).filter((n) => !/^rep-/.test(n.needle_id)).map((n) => n.type).sort();
const nt = ['a', 'b', 'c'].map((v) => JSON.stringify(needleTypes(v)));
if (nt[0] !== nt[1] || nt[1] !== nt[2]) errors.push('A2 needle-type multiset mismatch: ' + nt.join(' vs '));

// A3: prompt-shape signature — structural skeleton with content words
// stripped. Prompts share a template per slot; the skeleton must align
// per shape_group across volumes (weakest-formal-content evidence).
const skeleton = (p) => p
  .replace(/bench\/codebuddy-trial\/workbenches\/w[abc]/g, '<WB>')
  .replace(/src\/[\w.]+|tests\/[\w.]+|docs\/[\w.]+/g, '<SITE>')
  .replace(/'[^']*'/g, '<Q>')
  .replace(/\b[A-Z][a-zA-Z]+\.\w+\(\)?|\b\w+\(\)/g, '<CALL>')
  .replace(/\b\w+\b/g, 'W').replace(/\s+/g, ' ').trim();
const sigByGroup = {};
for (const v of ['a', 'b', 'c']) for (const t of base(v)) {
  (sigByGroup[t.shape_group] = sigByGroup[t.shape_group] || {})[v] = skeleton(t.prompt_text);
}
for (const [g, m] of Object.entries(sigByGroup)) {
  if (!(m.a === m.b && m.b === m.c)) errors.push('A3 prompt-skeleton divergence in ' + g + ': ' + JSON.stringify(m));
}

// A4: shape_group bijection — identical base group sets, exactly one base
// task per group per volume.
const groups = (v) => [...new Set(base(v).map((t) => t.shape_group))].sort();
const g = ['a', 'b', 'c'].map((v) => JSON.stringify(groups(v)));
if (g[0] !== g[1] || g[1] !== g[2]) errors.push('A4 shape-group sets differ: ' + g.join(' vs '));
for (const v of ['a', 'b', 'c']) {
  const counts = {};
  for (const t of base(v)) counts[t.shape_group] = (counts[t.shape_group] || 0) + 1;
  for (const [grp, n] of Object.entries(counts)) if (n !== 1) errors.push('A4 ' + v + ' group ' + grp + ' has ' + n + ' base tasks');
}

// A5: replay sanity + every site/check file exists.
const aGroups = new Set(groups('a'));
let repCount = 0;
for (const v of ['a', 'b', 'c']) {
  const wdir = path.join(T.WORKBENCHES, vols[v].workbench.replace(/^workbenches\//, ''));
  for (const t of vols[v].tasks) {
    if (t.replay_shape_group !== null) {
      repCount++;
      if (!aGroups.has(t.replay_shape_group)) errors.push('A5 ' + t.task_id + ' replays unknown group ' + t.replay_shape_group);
      if (t.shape_group !== t.replay_shape_group) errors.push('A5 ' + t.task_id + ' shape_group must equal replay_shape_group');
    }
    if (!fs.existsSync(path.join(wdir, t.workbench_site))) errors.push('A5 ' + t.task_id + ' missing site ' + t.workbench_site);
    if (!fs.existsSync(path.join(wdir, t.check))) errors.push('A5 ' + t.task_id + ' missing check ' + t.check);
  }
}
if (repCount < 2 || repCount > 3) errors.push('A5 replay task count ' + repCount + ' outside 2-3');

// structural file-shape parity: workbench trees must carry the same
// dir x extension histogram — identical layout and per-dir file-type counts,
// domain-named files differ by content (same shape, different content).
const treeShape = (v) => {
  const wdir = path.join(T.WORKBENCHES, vols[v].workbench.replace(/^workbenches\//, ''));
  const hist = {};
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort()) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { const rel = path.relative(wdir, p).split(path.sep).join('/'); const dir = rel.indexOf('/') < 0 ? '.' : rel.slice(0, rel.lastIndexOf('/')); const ext = path.extname(rel); hist[dir + '|' + ext] = (hist[dir + '|' + ext] || 0) + 1; } } };
  walk(wdir);
  return JSON.stringify(Object.keys(hist).sort().map((k) => k + '=' + hist[k]));
};
const tl = ['a', 'b', 'c'].map((v) => treeShape(v));
if (tl[0] !== tl[1] || tl[1] !== tl[2]) errors.push('workbench file-shape differs: ' + tl.join(' vs '));

if (errors.length) {
  console.log(JSON.stringify({ status: 'isomorphism-failed', errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'isomorphic', groups: JSON.parse(g[0]).length, replays: repCount }, null, 2));