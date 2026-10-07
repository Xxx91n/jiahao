'use strict';
// src/shared/per-run-artifacts.js - grill-t37 D-005.1: the ONE write point
// discipline for per-run emitted artifacts. Normalized JSON lands in an
// EXISTING per-run artifact directory (the junit.xml family, gitignored,
// ADR-0027 D4) with the run_id in the filename. This module owns the
// mkdir+write so run-gates.js and run-test-gate.js cannot grow two writers.
//
// Honesty contract: emission failure is LOUD (throws to the caller, which
// reports it as its own error line) - a runner whose evidence channel broke
// does not get to look like a runner that emitted.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// The existing per-run family (gitignored, ADR-0027 D4). junit.xml's home.
const DEFAULT_DIR = path.join(ROOT, 'test-artifacts');

// emitArtifact({dir?, subdir, prefix, run_id_obj, payload}) -> absolute path.
// Filename: <subdir>/<prefix>.<file_safe run_id>.json
function emitArtifact(opts) {
  const dir = opts.dir || DEFAULT_DIR;
  const sub = opts.subdir ? path.join(dir, opts.subdir) : dir;
  fs.mkdirSync(sub, { recursive: true });
  const file = path.join(sub, opts.prefix + '.' + opts.runId.file_safe + '.json');
  fs.writeFileSync(file, JSON.stringify(opts.payload, null, 2) + '\n', 'utf8');
  return file;
}

// Newest artifact for a surface in a dir, by filename mtime. Used by the
// assert leg's re-derivation read.
function newestArtifact(dir, subdir, prefix, surface) {
  const sub = path.join(dir, subdir);
  let names;
  try { names = fs.readdirSync(sub); } catch (e) { return null; }
  const head = prefix + '.' + surface + '.';
  const hits = names.filter(function (n) { return n.indexOf(head) === 0 && n.slice(-5) === '.json'; });
  if (!hits.length) return null;
  hits.sort(function (a, b) {
    return fs.statSync(path.join(sub, b)).mtimeMs - fs.statSync(path.join(sub, a)).mtimeMs;
  });
  const file = path.join(sub, hits[0]);
  try { return { file: file, artifact: JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch (e) { return null; }
}

module.exports = { emitArtifact, newestArtifact, DEFAULT_DIR };
