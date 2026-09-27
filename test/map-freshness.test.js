'use strict';
// test/map-freshness.test.js - grill-t30 D-004 (E-17 mechanization): the
// per-commit tree-internal rewrite-map freshness leg. Fixture repos are
// hermetic (test/helpers/git-hermetic.js); the live-tree leg run is wired in
// the ADR-0087 wiring suite.

const fs = require('fs');
const os = require('os');
const path = require('path');
const hg = require('./helpers/git-hermetic');

const ROOT = path.join(__dirname, '..');
const mf = require('../scripts/check-map-freshness');

const MAP = 'docs/rewrite-map.json';
const TAX = 'docs/governance/surface-taxonomy.json';
const TAXONOMY = JSON.stringify({
  freshness: {
    claim_surfaces: { closed_enum: ['reports/', 'handoffs/'], scope: 'round dir .scratch/grill-<id>/', exceptions: [] },
    non_anchoring_classes: {
      evidence_dirs: ['evidence/'],
      seal_file: 'SEAL',
      round_bookkeeping: ['GOAL.md', 'decision-ledger.md', 'round-facts.json', 'handoffs/next-round.md'],
      round_bookkeeping_glob: ['spec-*.md'],
      mechanism_regen_outputs: ['docs/rewrite-map.json'],
    },
    orphan_ancestry: {
      artifact_scope: '\\.scratch/grill-[^/]+/',
      pin_patterns: ['^captured-at-head:\\s*([0-9a-f]{7,40})\\s*$', '^seal:\\s*([0-9a-f]{7,40})\\s*$'],
      workspace_ref: 'refs/heads/gitbutler/workspace',
      errata_exemptions: [],
    },
  },
});

function mkDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mf-')); }
function put(dir, rel, text) {
  const p = path.join(dir, rel.split('/').join(path.sep));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf8');
}
function commit(dir, msg) {
  hg.git(dir, ['add', '-A']);
  hg.git(dir, ['commit', '-q', '-m', msg]);
  return hg.git(dir, ['rev-parse', 'HEAD']);
}

// Minimal internally-consistent map for the fixture tree. `tip`/`base` are
// real fixture shas (ancestors of the commit the map lands in); docRefs are
// the citation rows the commit's own doc scan must reproduce exactly.
function mapJson(tip, base, docRefs) {
  const n = docRefs.length;
  return JSON.stringify({
    schema_version: 1,
    generated_by: 'scripts/build-rewrite-map.js',
    published_tip: tip,
    boundary: { shared_base: base, old_tip: 'f'.repeat(40), new_counterpart: tip },
    sides: { old_refs: [], new_refs: ['origin/main'] },
    counts: {
      commits: 0, published_only: 0, removed: 0, same: 0, doc_refs: n,
      doc_refs_by_class: { rewritten: 0, 'local-only': n, 'published-unchanged': 0 }
    },
    commits: [], removed: [], published_only: [], same: [], doc_refs: docRefs,
  }, null, 2) + '\n';
}

// c0: taxonomy + a citing doc + map covering it.
// c1: adds scripts/check-map-freshness.js (the registration anchor).
function seedRepo(dir, citeLine, mapRefs) {
  hg.mkRepo(dir);
  put(dir, TAX, TAXONOMY);
  put(dir, 'docs/citing.md', citeLine);
  const c0 = commit(dir, 'seed');
  put(dir, MAP, mapJson(mapRefs && mapRefs.tip || c0, mapRefs && mapRefs.base || c0, mapRefs && mapRefs.docRefs || [
    { file: 'docs/citing.md', line: 1, sha: 'cafebabe42', 'class': 'local-only', resolved_to: null },
  ]));
  const c0b = commit(dir, 'map');
  put(dir, 'scripts/check-map-freshness.js', '// registration marker\n');
  const c1 = commit(dir, 'leg registers');
  return { c0: c0b, c1: c1 };
}

describe('map-freshness leg (E-17, per-commit tree-internal)', () => {
  test('claim commit with a covering map passes', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'round report, no new cites\n');
    commit(dir, 'claim');
    const out = mf.checkFreshness(dir);
    expect(out.errors).toEqual([]);
    expect(out.checked).toBe(1);
  });

  test('claim commit adding a citation the committed map lacks fails (E-17 class)', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, 'docs/citing.md', 'see commit cafebabe42\nnew cite deadbeef99\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'claim\n');
    commit(dir, 'claim adds an uncovered citation');
    const out = mf.checkFreshness(dir);
    expect(out.checked).toBe(1);
    expect(out.errors.some((e) => e.indexOf('citation coverage differs') !== -1)).toBe(true);
  });

  test('claim commit whose tree has no map fails closed', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    hg.git(dir, ['rm', '-q', MAP]);
    put(dir, '.scratch/grill-t99/reports/r.md', 'claim\n');
    commit(dir, 'claim without the map');
    const out = mf.checkFreshness(dir);
    expect(out.errors.some((e) => e.indexOf('lacks ' + MAP) !== -1)).toBe(true);
  });

  test('claim commit with an internally inconsistent map fails (ancestry bound to the commit)', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    // Re-write the map INSIDE the claim commit: published_tip names an object
    // that is not an ancestor of this commit -> fail-closed.
    put(dir, MAP, mapJson('a'.repeat(40), 'b'.repeat(40), [
      { file: 'docs/citing.md', line: 1, sha: 'cafebabe42', 'class': 'local-only', resolved_to: null },
    ]));
    put(dir, '.scratch/grill-t99/reports/r.md', 'claim\n');
    commit(dir, 'claim with dangling published_tip');
    const out = mf.checkFreshness(dir);
    expect(out.errors.some((e) => e.indexOf('published_tip not on') !== -1)).toBe(true);
  });

  test('non-claim commits are out of scope (stale citations on the code surface do not trip the leg)', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, 'src/x.js', '// cites deadbeef99 but this file is not a claim surface\n');
    commit(dir, 'code-only commit adding an uncovered citation');
    const out = mf.checkFreshness(dir);
    expect(out.errors).toEqual([]);
    expect(out.checked).toBe(0);
  });

  test('registration anchor: commits before the leg landed are exempt', () => {
    const dir = mkDir();
    // Claim commit BEFORE the registration commit - exempt by forward-only rule.
    hg.mkRepo(dir);
    put(dir, TAX, TAXONOMY);
    put(dir, '.scratch/grill-t99/reports/old.md', 'pre-registration claim cites deadbeef77\n');
    commit(dir, 'old claim, no map at all');
    put(dir, 'docs/citing.md', 'see commit cafebabe42\n');
    commit(dir, 'docs');
    put(dir, 'scripts/check-map-freshness.js', '// registration marker\n');
    commit(dir, 'leg registers');
    const out = mf.checkFreshness(dir);
    expect(out.errors).toEqual([]);
    expect(out.checked).toBe(0);
  });
});

describe('live tree', () => {
  test('registration anchor exists in this repo', () => {
    const reg = mf.registrationCommit(ROOT);
    expect(reg).toBeTruthy();
    expect(/^[0-9a-f]{40}$/.test(reg)).toBe(true);
  });
});
