'use strict';
// test/adr-0093-m4-wiring.test.js - grill-t36 T-8 (ADR-0093 D-6, ledger D-003):
// generation-surface equivalence. Three things are locked here, in the order
// they matter: the artifact SAYS which tree it describes, the artifact's rows
// come only from that tree, and the GENERATOR cannot be talked into producing a
// row from outside it (the phantom-row shape, t35's registered defect).
//
// The third one is the load-bearing test. A vacuous generator - one that emits
// no rows at all - would pass any "no phantom" assertion, so every negative here
// is paired with a positive: the same fixture must still carry the row it is
// SUPPOSED to carry.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const hg = require('./helpers/git-hermetic');

const rm = require('../scripts/build-rewrite-map');
const pub = require('../scripts/build-rewrite-map').verifyPublishedOnly;

const ROOT = path.join(__dirname, '..');
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'rewrite-map.json'), 'utf8'));

const NOW = '2026-10-02T00:00:00.000Z';
// Holds the lane-fixture repo across the two tests that consume it (built in the
// phantom test, judged by the provenance test, removed there). Declared here so
// neither test leaks a temp repo when the other fails early.
let fixture = null;
function put(dir, rel, text) {
  const abs = path.join(dir, rel.split('/').join(path.sep));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
}
function commit(dir, msg) { hg.git(dir, ['add', '-A']); hg.git(dir, ['commit', '-q', '-m', msg]); }

describe('ADR-0093 D-6 generation-surface equivalence (grill-t36 T-8)', () => {
  test('the committed map names the tree it was generated from (buildinfo shape)', () => {
    expect(MAP.generated_from).toBeDefined();
    expect(MAP.generated_from.mode).toBe('tree-internal');
    expect(typeof MAP.generated_from['tree-ish']).toBe('string');
    expect(MAP.generated_from['tree-ish']).toBe(MAP.sides.new_refs[0]);
    expect(MAP.generated_from['tree-ish']).toBe('origin/main');
  });

  test('every recorded citation names a file present in the declared tree (measured: no phantom rows on this artifact)', () => {
    const tree = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', MAP.generated_from['tree-ish']],
      { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));
    const absent = MAP.doc_refs.filter((d) => !tree.has(d.file)).map((d) => d.file + ':' + d.line);
    expect(absent).toEqual([]);
    expect(MAP.doc_refs.length).toBeGreaterThan(0); // the surface is real, not vacuous
  });

  test('the generator does not emit a row from a file outside the assertion object (staged lane file, phantom shape)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-m4-'));
    try {
      hg.mkRepo(dir);
      hg.git(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']); // unborn main
      put(dir, 'docs/governance/orphan-cites.json',
        JSON.stringify({ schema_version: 1, _doc: 'fixture', entries: [] }, null, 2) + '\n');
      put(dir, 'docs/tracked.md', '# tracked\nrow-visible deadbee\n');
      commit(dir, 'tracked doc');

      // The t35 defect in miniature: a file that IS in the index (the pre-D-6
      // enumeration base, `ls-files`) but is NOT in the assertion object's tree.
      put(dir, 'docs/lane-only.md', '# lane\nrow-must-not-exist f00dbee\n');
      hg.git(dir, ['add', 'docs/lane-only.md']);
      const inIndex = hg.git(dir, ['ls-files', 'docs/lane-only.md']).trim();
      expect(inIndex).toBe('docs/lane-only.md'); // the old base would have seen it

      const map = rm.build([], 'main', { root: dir, now: NOW });
      expect(map.generated_from).toEqual({ 'tree-ish': 'main', mode: 'tree-internal' });
      // negative: the staged lane file contributes no row ...
      expect(map.doc_refs.some((d) => d.file === 'docs/lane-only.md')).toBe(false);
      // positive: the committed file still does (so the negative is not vacuous)
      expect(map.doc_refs.some((d) => d.file === 'docs/tracked.md')).toBe(true);
      fixture = { dir: dir, map: map };
    } finally {
      // the fixture is reused by the provenance-assertion test below (which runs
      // verifyPublishedOnly against it); cleanup happens there.
    }
  });

  test('--published-only machine-asserts the provenance field', () => {
    expect(fixture).not.toBeNull(); // built by the test above (same file, in order)
    const { dir, map } = fixture;
    try {
      const without = JSON.parse(JSON.stringify(map));
      delete without.generated_from;
      expect(pub(without, 'main', { root: dir })).toEqual(
        expect.arrayContaining([expect.stringContaining('generated_from missing')]));

      const wrongMode = JSON.parse(JSON.stringify(map));
      wrongMode.generated_from = { 'tree-ish': 'main', mode: 'worktree-union' };
      expect(pub(wrongMode, 'main', { root: dir })).toEqual(
        expect.arrayContaining([expect.stringContaining('generated_from.mode')]));

      const wrongTree = JSON.parse(JSON.stringify(map));
      wrongTree.generated_from = { 'tree-ish': 'some-other-ref', mode: 'tree-internal' };
      expect(pub(wrongTree, 'main', { root: dir })).toEqual(
        expect.arrayContaining([expect.stringContaining('generated_from.tree-ish')]));

      // and the untouched map still carries no provenance error (not always on)
      expect(pub(map, 'main', { root: dir }).filter((e) => e.indexOf('generated_from') !== -1)).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fixture = null;
    }
  });
});
