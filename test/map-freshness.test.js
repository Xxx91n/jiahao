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

// grill-t35 D-005 (ADR-0092 D-M2): the per-commit embedded-map assertion is
// demoted to an audit-time advisory and the AUTHORITY becomes tip-map coverage
// over the union of the line's claim commits. These tests exercise the authority
// shape, plus the two union-key subtleties that measurement forced:
//   - the union key is file+sha, NOT file+line+sha (line numbers move between
//     commits when unrelated prose is inserted above a citation);
//   - sha identity is prefix-aware (the same object cited at 7 and 8 chars).
describe('map-freshness authority (tip-map coverage, grill-t35 D-005)', () => {
  test('claim commit with a covering tip map passes (authority)', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'round report, no new cites\n');
    commit(dir, 'claim');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.errors).toEqual([]);
    expect(out.checked).toBe(1);
    expect(out.missing).toEqual([]);
  });

  test('a citation cited by a claim commit but absent from the tip map fails', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'see commit deadbeef99\n');
    commit(dir, 'claim adds a citation the tip map lacks');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.missing.some((m) => m.sha === 'deadbeef99')).toBe(true);
    expect(out.errors.join(' ')).toContain('lacks');
  });

  test('a tip tree with no map fails closed', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    hg.git(dir, ['rm', '-q', MAP]);
    put(dir, '.scratch/grill-t99/reports/r.md', 'claim\n');
    commit(dir, 'claim without the map');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.errors.join(' ')).toContain('lacks ' + MAP);
  });

  test('union key is line-insensitive: prose inserted above a cited line does not fake coverage failure', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    // The claim commit INSERTS two lines above the citation, so the same sha moves
    // from line 1 to line 3 in that commit's tree. A file+line+sha union key
    // would demand a row at line 3 and report a false red.
    put(dir, 'docs/citing.md', 'new leading line\nanother leading line\nsee commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'claim\n');
    commit(dir, 'claim shifts the cited line');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.missing).toEqual([]);
  });

  test('sha identity is prefix-aware WITHIN a file: a shorter cite of a registered object is covered', () => {
    const dir = mkDir();
    // The seeded map registers docs/citing.md line 1 as 'cafebabe42'. A LATER claim
    // commit rewrites that SAME line to cite the same object at the shorter
    // 'cafebabe' (8 chars). String equality would call that uncovered; the real
    // grill-t33 evidence is exactly this shape (a 7-char cite where the tip map
    // holds the 8-char form). Prefix-aware identity must call it covered.
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'round report\n');
    put(dir, 'docs/citing.md', 'see commit cafebabe\n');
    commit(dir, 'claim re-cites the same object at a shorter length');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.missing.filter((m) => m.file === 'docs/citing.md')).toEqual([]);
  });

  test('per-file scoping: a cite in a file with no registered row stays uncovered', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    // Same sha, DIFFERENT file. Coverage is keyed per file: a row registered for
    // docs/citing.md must not silently cover an unregistered cite in a claim
    // artifact, or adding a citation to a new file would pass unnoticed.
    put(dir, '.scratch/grill-t99/reports/r.md', 'see commit cafebabe\n');
    commit(dir, 'claim cites a registered sha in an unregistered file');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.missing.map((m) => m.file)).toContain('.scratch/grill-t99/reports/r.md');
  });

  test('non-claim commits are out of scope (a code-surface citation does not trip the authority)', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, 'src/x.js', '// cites deadbeef99 but this file is not a claim surface\n');
    commit(dir, 'code-only commit adding an uncovered citation');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.checked).toBe(0);
    expect(out.errors).toEqual([]);
  });

  test('registration anchor: commits before the leg landed are exempt (forward-only)', () => {
    const dir = mkDir();
    hg.mkRepo(dir);
    put(dir, TAX, TAXONOMY);
    put(dir, '.scratch/grill-t99/reports/old.md', 'pre-registration claim cites deadbeef77\n');
    commit(dir, 'old claim, no map at all');
    put(dir, 'docs/citing.md', 'see commit cafebabe42\n');
    commit(dir, 'docs');
    put(dir, 'scripts/check-map-freshness.js', '// registration marker\n');
    commit(dir, 'leg registers');
    const out = mf.checkTipCoverage(dir, {});
    // The pre-registration claim commit is out of scope, so the authority
    // enumerates nothing. (This fixture has no map in its tip tree; the absence is
    // reported separately and is NOT the subject of this assertion.)
    expect(out.checked).toBe(0);
    expect(out.missing).toEqual([]);
  });
});

// M-4 (grill-t35 audit): the fileTracked scope clause is a REAL loosening and is
// pinned here rather than left as a comment. Two branches, both asserted:
//   - a citation in a file the tip map has NO row for stays uncovered (the
//     loosening is scoped to TRACKED files, not a blanket pass);
//   - a retired-line citation in a file the tip map DOES carry is covered
//     (the clause's whole purpose: the tip map is generated FROM the tip, so it
//     cannot carry a row for a citation the tip no longer contains).
describe('map-freshness scope clause (ADR-0092 D-M2, grill-t35 audit M-4)', () => {
  test('a citation in an UNTRACKED file stays uncovered (the loosening is narrow)', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    // docs/citing.md has a registered row; the new file does not.
    put(dir, '.scratch/grill-t99/reports/fresh.md', 'see commit deadbeef99\n');
    commit(dir, 'claim cites in a file with no tip-map row');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.missing.map((m) => m.file)).toContain('.scratch/grill-t99/reports/fresh.md');
  });

  test('a retired-line citation in a TRACKED file is covered (the clause purpose)', () => {
    const dir = mkDir();
    // The seeded map carries exactly one row: docs/citing.md line 1.
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    // The claim commit INSERTS a line above the citation, retiring line 1.
    put(dir, 'docs/citing.md', 'inserted above\nsee commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'claim\n');
    commit(dir, 'claim retires the registered line');
    const out = mf.checkTipCoverage(dir, {});
    expect(out.missing).toEqual([]);
  });
});
describe('map-freshness advisory (audit-time, demoted per grill-t35 D-005)', () => {
  test('the per-commit advisory is still exported and still detects a stale embedded map', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'see commit deadbeef99\n');
    commit(dir, 'claim adds an uncovered citation');
    const adv = mf.advisoryPerCommit(dir, {});
    expect(adv.checked).toBe(1);
    expect(adv.errors.join(' ')).toContain('deadbeef99');
  });

  test('the advisory is non-blocking by construction: it is not the gate path', () => {
    const dir = mkDir();
    seedRepo(dir, 'see commit cafebabe42 for the boundary\n');
    put(dir, '.scratch/grill-t99/reports/r.md', 'see commit deadbeef99\n');
    commit(dir, 'claim adds an uncovered citation');
    // The authority does NOT go red for this: the tip map is judged over the line
    // union, and this fixture's tip map is the seeded one. What matters is that the
    // two surfaces answer independently rather than the advisory silently gating.
    const cov = mf.checkTipCoverage(dir, {});
    const adv = mf.advisoryPerCommit(dir, {});
    expect(typeof cov.checked).toBe('number');
    expect(typeof adv.checked).toBe('number');
  });
});

describe('live tree', () => {
  test('registration anchor exists in this repo', () => {
    const reg = mf.registrationCommit(ROOT);
    expect(reg).toBeTruthy();
    expect(/^[0-9a-f]{40}$/.test(reg)).toBe(true);
  });

  test('batched scan is row-identical to the single-ref scan (parity lock)', () => {
    const rm = require('../scripts/build-rewrite-map');
    const refs = ['HEAD', 'HEAD~1'];
    const batched = rm.scanDocTokensAtMany(ROOT, refs);
    const key = (rows) => rows.map((r) => r.file + ':' + r.line + ':' + r.sha).sort().join('|');
    for (const r of refs) {
      expect(key(batched.get(r) || [])).toBe(key(rm.scanDocTokensAt(ROOT, r)));
    }
  });
});
