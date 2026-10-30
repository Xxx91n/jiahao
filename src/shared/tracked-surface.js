'use strict';
// src/shared/tracked-surface.js - (grill-t36 D-006): the
// tracked-surface snapshot, shared by the run-gates wrapper (D-4) and, per
// D-1, the `git ls-files` (index) enumeration base. The M1 static scan
// (trackedTextFiles in scripts/shared/tracked-text.js) uses index UNION tree;
// this M2 runtime snapshot uses index only because it runs inside a gate
// execution where the working tree IS the index being mutated. One enumeration
// base per surface; the ADR names both so neither side can silently narrow it.
//
// WHAT THIS IS NOT, and why that is a finding rather than a caveat: it asserts
// that nothing changed INSIDE the window in which it ran. It asserts nothing
// about the window's outside. That is a narrowing, not a closure - the same
// shape as F-6's wording constraint.
//
// Enumeration base: `git ls-files` (index only). The M2 runtime snapshot runs
// inside a gate execution where the working tree IS the index being mutated,
// so the index is the correct base here. The M1 static scan
// (trackedTextFiles in scripts/shared/tracked-text.js) uses index UNION tree
// because it runs outside gate execution where the tree is stable.
// D-1 names both bases so neither side can silently narrow it; this file's
// comment must not conflate the two.
//
// The untracked surface is excluded by construction - that is the ignore
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
  // index only - see header for the M1/M2 base distinction.
  // -z keeps paths verbatim and newline-safe: the default core.quotePath
  // escapes non-ASCII bytes as octal, and a quoted path is unusable to any
  // caller that filters or opens it.
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

// The working-tree surface: index UNION untracked-but-not-ignored (#102). It is
// a third named base, not a loosening of the two above - the local whitespace
// check exists precisely because a file that was never `git add`ed is invisible
// to both the index snapshot and `git diff --check`. Ignored paths stay out:
// that exclusion is the ignore mechanism's, exactly as for listTrackedPaths.
function listWorkingTreePaths(root) {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split('\0').filter(Boolean);
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

module.exports = { trackedSurface, listTrackedPaths, listWorkingTreePaths, hashTrackedPaths, changedPaths, MISSING };
