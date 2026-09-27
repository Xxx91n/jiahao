// test/corpus-restore.test.js - grill-t27 D-002: restore-step integrity.
// The ci.yml 'restore bench corpus' step is validate-or-absent; these legs
// rehearse it end-to-end with real tarballs so the degrade path is tested,
// not assumed. Jest drives restore() directly with an injected manifest
// (ADR-0029 D4 shape) - no network, no private corpus content leaves the
// maintainer's private/ dir.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { restore } = require('../scripts/restore-bench-corpus');
const { probe } = require('../src/shared/capability');

const TMP = path.join(os.tmpdir(), 'jiahao-t27-restore-test');
const sha = function (s) { return crypto.createHash('sha256').update(s).digest('hex'); };

const FILES = { 'probes.jsonl': '{"a":1}\n', 'mr-probes.jsonl': '{"b":2}\n' };
const MANIFEST = Object.keys(FILES).map(function (id) { return { id: id, sha256: sha(FILES[id]), source_adr: 'test' }; });

beforeEach(function () { fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true }); });
afterAll(function () { fs.rmSync(TMP, { recursive: true, force: true }); });

// tar argv stays basename-only under an explicit cwd - no absolute path is
// ever handed to tar (GNU tar would parse 'C:\...' as <host>:<path>).
function makeTarball(name, fileSet, topDir) {
  const stage = path.join(TMP, name);
  const dir = path.join(stage, topDir || 'bench-corpus');
  fs.mkdirSync(dir, { recursive: true });
  for (const id of Object.keys(fileSet)) fs.writeFileSync(path.join(dir, id), fileSet[id]);
  const r = spawnSync('tar', ['-czf', 'corpus.tar.gz', topDir || 'bench-corpus'], { cwd: stage, encoding: 'utf8' });
  expect(r.status).toBe(0);
  return path.join(stage, 'corpus.tar.gz');
}

function run(tarball, destParent) {
  const out = []; const err = [];
  const res = restore({ tarball: tarball, destParent: destParent, manifest: MANIFEST,
    log: function (s) { out.push(s); }, errLog: function (s) { err.push(s); } });
  return { res: res, out: out, err: err };
}

// The same existence probe the four corpus gates consult, scoped to the
// rehearsal dir - install/repo fallbacks point at an empty home so a dev
// machine's real corpus cannot leak into the verdict.
function probeAt(destParent) {
  const dead = path.join(TMP, 'no-such-home');
  return probe('bench-corpus', { root: dead, env: {
    JIAHAO_CORPUS_DIR: path.join(destParent, 'bench-corpus'),
    CLAUDE_CONFIG_DIR: dead, HOME: dead } });
}

test('complete tarball validates and lands via rename (probe: present)', function () {
  const dest = path.join(TMP, 'dest-ok'); fs.mkdirSync(dest, { recursive: true });
  const r = run(makeTarball('ok', FILES), dest);
  expect(r.res.ok).toBe(true);
  expect(fs.existsSync(path.join(dest, 'bench-corpus', 'mr-probes.jsonl'))).toBe(true);
  expect(r.res.files).toEqual(Object.keys(FILES).sort());
  expect(r.out.join('\n')).toContain('[restore-bench-corpus] validated');
  expect(probeAt(dest)).toBe(true);
  expect(fs.readdirSync(dest).filter(function (f) { return /^\.bench-corpus-restore-/.test(f); })).toEqual([]);
});

test('partial tarball (missing mr-probes.jsonl) degrades to absent + ::error', function () {
  const dest = path.join(TMP, 'dest-partial'); fs.mkdirSync(dest, { recursive: true });
  const partial = { 'probes.jsonl': FILES['probes.jsonl'] };
  const r = run(makeTarball('partial', partial), dest);
  expect(r.res.ok).toBe(false);
  expect(r.res.detail).toContain('missing: mr-probes.jsonl');
  expect(fs.existsSync(path.join(dest, 'bench-corpus'))).toBe(false);
  expect(r.out.join('\n')).toContain('::error title=corpus-restore::');
  expect(r.err.join('\n')).toContain('UNVERIFIABLE');
  expect(probeAt(dest)).toBe(false); // the gates' probe reads absent
  expect(fs.readdirSync(dest).filter(function (f) { return /^\.bench-corpus-restore-/.test(f); })).toEqual([]);
});

test('stale-but-complete tarball (sha256 mismatch) degrades the same way', function () {
  const dest = path.join(TMP, 'dest-stale'); fs.mkdirSync(dest, { recursive: true });
  const stale = { 'probes.jsonl': FILES['probes.jsonl'], 'mr-probes.jsonl': '{"b":999}\n' };
  const r = run(makeTarball('stale', stale), dest);
  expect(r.res.ok).toBe(false);
  expect(r.res.detail).toContain('sha256 mismatch: mr-probes.jsonl');
  expect(fs.existsSync(path.join(dest, 'bench-corpus'))).toBe(false);
  expect(probeAt(dest)).toBe(false);
});

test('layout drift (no bench-corpus/ top dir) degrades to absent', function () {
  const dest = path.join(TMP, 'dest-layout'); fs.mkdirSync(dest, { recursive: true });
  const r = run(makeTarball('layout', FILES, 'not-bench-corpus'), dest);
  expect(r.res.ok).toBe(false);
  expect(r.res.detail).toContain('lacks bench-corpus/');
  expect(probeAt(dest)).toBe(false);
});

test('extra files beyond the manifest are tolerated (required set, not closed inventory)', function () {
  const dest = path.join(TMP, 'dest-extra'); fs.mkdirSync(dest, { recursive: true });
  const extra = Object.assign({}, FILES, { 'fingerprints.json': '{"fp":1}\n' });
  const r = run(makeTarball('extra', extra), dest);
  expect(r.res.ok).toBe(true);
  expect(r.res.files).toContain('fingerprints.json');
  expect(probeAt(dest)).toBe(true);
});

test('corrupt tarball degrades instead of failing the step', function () {
  const dest = path.join(TMP, 'dest-corrupt'); fs.mkdirSync(dest, { recursive: true });
  const bad = path.join(TMP, 'bad.tar.gz'); fs.writeFileSync(bad, 'not a gzip stream');
  const r = run(bad, dest);
  expect(r.res.ok).toBe(false);
  expect(r.res.detail).toContain('tar extraction failed');
  expect(r.out.join('\n')).toContain('::error title=corpus-restore::');
  expect(probeAt(dest)).toBe(false);
});

test('versioned manifest contract: private_corpus carries id+sha256+source_adr', function () {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'bench', 'polygraph', 'thresholds.json'), 'utf8'));
  expect(Array.isArray(cfg.private_corpus)).toBe(true);
  for (const e of cfg.private_corpus) {
    expect(typeof e.id).toBe('string');
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
  }
  expect(cfg.private_corpus.map(function (e) { return e.id; })).toContain('mr-probes.jsonl');
});
