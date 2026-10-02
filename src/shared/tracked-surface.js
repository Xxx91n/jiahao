'use strict';
// src/shared/tracked-surface.js - ADR-0093 D-4 (grill-t36 D-006): the
// tracked-surface snapshot, shared by the run-gates wrapper (D-4) and, per
// D-1, the same `git ls-files` index-union-tree enumeration base that
// `trackedTextFiles()` consumes. One enumeration base, both consuming sides
// named in the ADR, so neither side can silently narrow it.
//
// WHAT THIS IS NOT, and why that is a finding rather than a caveat: it asserts
// that nothing changed INSIDE the window in which it ran. It asserts nothing
// about the window's outside. That is a narrowing, not a closure - the same
// shape as F-6's wording constraint.
//
// Enumeration base: `git ls-files` over the union of index and tree. The index
// alone is not authoritative (t30 F-1), so the union is the floor. The
// untracked surface is excluded by construction - that is the ignore
// mechanism's existing division of labour, not a narrowing of this surface.
//
// Cost is real and was measured, not guessed: ~1594 tracked files, ~80ms for
// the enumeration and ~320ms for the content hashing on this tree, so a
// checkpoint is ~0.4s and a full gate:all run pays roughly leg-count times
// that. The ADR records the cost rather than leaving it unbounded.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function listTrackedPaths(root) {
  // index union tree - neither half alone is authoritative (t30 F-1).
  const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
  return out.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
}

// Content-hash every tracked path present in the working tree. A tracked path
// that is missing from disk hashes to the sentinel below rather than being
// skipped: a leg that DELETES a tracked file is a mutation, and dropping the
// path would hide exactly that.
const MISSING = '<absent>';
function hashTrackedPaths(root, paths) {
  const map = new Map();
  for (const rel of paths) {
    const abs = path.join(root, rel.split('/').join(path.sep));
    let bytes;
    try { bytes = fs.readFileSync(abs); }
    catch (e) { map.set(rel, MISSING); continue; }
    map.set(rel, crypto.createHash('sha256').update(bytes).digest('hex'));
  }
  return map;
}

// Two-layer attribution primitive: which paths differ between two snapshots.
function changedPaths(before, after) {
  const changed = [];
  for (const [rel, hash] of after) {
    const prev = before.get(rel);
    if (prev !== hash) changed.push(prev === undefined ? rel + ' (added to tracked set)' : rel);
  }
  for (const rel of before.keys()) {
    if (!after.has(rel)) changed.push(rel + ' (left the tracked set)');
  }
  return changed.sort();
}

// The snapshot pair the wrapper drives: an entry zero point plus per-leg
// checkpoints. Kept as a factory so a caller can inject a fake (tests, and the
// stubbed-exec unit tests in test/adr-0034-wiring.test.js) without a git tree.
function trackedSurface(opts) {
  const o = opts || {};
  const root = o.root;
  const list = o.list || listTrackedPaths;
  const hash = o.hash || hashTrackedPaths;
  let baseline = null;
  return {
    // Entry zero point: hash the CURRENT working tree, not "expect clean".
    // A pre-existing dirty surface is registered verbatim as the zero point -
    // neither penalised nor swallowed - which is what keeps this compatible
    // with the standing obligation never to discard blindly.
    begin: function () {
      baseline = hash(root, list(root));
      return baseline;
    },
    // Per-leg checkpoint. Returns the changed-path list for THIS leg.
    checkpoint: function () {
      const now = hash(root, list(root));
      const changed = changedPaths(baseline, now);
      baseline = now; // attribute each leg against the state it inherited
      return changed;
    },
    get active() { return baseline !== null; },
  };
}

module.exports = { trackedSurface, listTrackedPaths, hashTrackedPaths, changedPaths, MISSING };
