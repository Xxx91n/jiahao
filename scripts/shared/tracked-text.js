'use strict';
// scripts/shared/tracked-text.js - ADR-0093 D-1 (grill-t36 D-004, wave one):
// THE tracked-text enumeration surface, as ONE implementation.
//
// WHY THIS FILE EXISTS. Before it, the corruption scanner's blast radius was
// chosen by its callers: the jest wiring pin picked `.scratch/**/*.md`, and
// `check-post-land` picked `.scratch/**/*.md` off a `ls-tree`. At the M-7
// measurement no caller's scope contained `scripts/**` at all, so a governance
// script could carry corruption that no caller would ever look at. That was
// ADR-0092 D-M1's declared blind spot and this file is its closure.
//
// THE CONTRACT (D-1), verbatim in mechanism:
//   - Primary criterion: the `gitattributes` `text` attribute.
//   - Fallback: NUL sniffing, for files no attribute speaks for.
//   - Disclosed skip: oversized files are skipped, and the skip is a
//     DISCLOSURE OF A CAPABILITY BOUNDARY, not an exemption. `check-secret-
//     scan`'s oversized disclosure is the in-repo precedent. Returning the
//     skipped set to the caller is what keeps this from rotting into a silent
//     allowlist - a caller that swallows `oversized` has reintroduced the
//     caller-chosen blind spot this file exists to withdraw.
//   - Base: `git ls-files` over the UNION of index and tree. The index alone is
//     not authoritative (t30 F-1 precedent), so the union is the floor and
//     neither half may be used alone.
//   - Callers pass a root and NOTHING ELSE. There is no filter parameter, no
//     extension allowlist, no path carve-out, and no in-code exemption list.
//     A caller that may narrow the surface is the original disease in a new
//     location: an observer that selects what it will not look at asserts about
//     a sample while its verdict is phrased about the population.
//
// The enumeration base is shared with ADR-0093 D-4 (the M2 tracked-surface
// snapshot) and D-6 (the M4 generation surface). Naming it once, here, is what
// keeps those two from silently inheriting a widening registered here.
//
// ZERO-DEPENDENCY by construction: required from scripts/**, which ships in the
// tarball.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// The oversized threshold. 1 MiB is `scripts/check-secret-scan.js`'s registered
// value; the same number keeps the two disclosures comparable rather than
// inventing a second boundary. Naming it here is the point: an unnamed limit is
// an exemption wearing a constant's clothes.
const MAX_BYTES = 1024 * 1024;

// git's own NUL-sniff window (`git grep`/`git diff` use the first 8000 bytes).
// Reusing git's number rather than picking our own is what makes the fallback
// agree with the tool it stands in for.
const SNIFF_BYTES = 8000;

const gitAt = (root) => (args, opts) =>
  execFileSync('git', args, Object.assign({
    cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
  }, opts || {}));

// ---- the base: index UNION tree -----------------------------------------
// Two spawns, not one. `ls-files` is the index (what is about to be committed);
// `ls-tree -r HEAD` is the committed tree (what the public already has). A
// file staged but uncommitted, or committed-but-deleted-in-index, appears in
// exactly one of the two - which is precisely the class of drift that makes an
// index-only enumeration wrong. Sorted for a stable, diffable baseline.
function baseTrackedPaths(root) {
  const g = gitAt(root);
  const index = g(['ls-files', '-z']).split('\0').filter(Boolean);
  let tree = [];
  try {
    tree = g(['ls-tree', '-r', 'HEAD', '--name-only', '-z']).split('\0').filter(Boolean);
  } catch (e) {
    // An unborn HEAD (fresh repo, empty tree) has nothing in the tree half. The
    // index half still stands; the union degrades to the index, which is
    // correct when there IS no tree yet rather than a reason to abort.
    tree = [];
  }
  return Array.from(new Set(index.concat(tree))).sort();
}

// ---- the primary criterion: the `text` attribute --------------------------
// `git check-attr -z text --stdin`, NUL-separated in and out (the newline form
// cannot represent a path containing a newline, and it mis-parses the -z
// output triples).
//
// Value semantics, which are git's, not ours:
//   set          - declared text
//   unset        - declared binary (`-text`, or a `binary` macro line)
//   auto         - git delegates to content sniffing; that delegation IS the
//                  NUL sniff, so it routes to the fallback rather than
//                  second-guessing git
//   unspecified  - no attribute speaks for this path
function attributeTextValues(root, paths) {
  const out = new Map();
  if (!paths.length) return out;
  const raw = gitAt(root)(['check-attr', '-z', 'text', '--stdin'], {
    input: paths.join('\0') + '\0',
  });
  const f = raw.split('\0');
  for (let i = 0; i + 2 < f.length; i += 3) {
    if (f[i]) out.set(f[i], f[i + 2]);
  }
  return out;
}

// ---- the fallback: NUL sniffing ------------------------------------------
// A NUL in the first SNIFF_BYTES is the binary signal git itself uses. Absent
// a NUL the file is text for our purposes - this is a byte-class question, not
// an encoding-decoding question, and a decode failure must not be able to turn
// a corrupted file into a skipped one.
function looksBinary(absPath) {
  let fd;
  try {
    fd = fs.openSync(absPath, 'r');
    const buf = Buffer.alloc(SNIFF_BYTES);
    const n = fs.readSync(fd, buf, 0, SNIFF_BYTES, 0);
    return buf.slice(0, n).indexOf(0) !== -1;
  } catch (e) {
    return false;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch (e) { /* already closed */ } }
  }
}

// ---- the scan -------------------------------------------------------------
// Returns { files, oversized, unreadable, total, max_bytes }:
//   files      - the enumeration surface, forward-slash repo-relative, sorted
//   oversized  - DISCLOSED skip, named per file, never silently dropped
//   unreadable - a path that exists but could not be read. Reported, never
//                silently counted as clean: a scanner that cannot read a file
//                must not report the corpus as clean.
// `total` is the base enumeration size, so a caller can see how much the skip
// classes removed rather than having to trust the survivor count.
function trackedTextScan(root) {
  const base = baseTrackedPaths(root);
  const attrs = attributeTextValues(root, base);
  const files = [];
  const oversized = [];
  const unreadable = [];
  for (const rel of base) {
    const v = attrs.get(rel);
    if (v === 'unset') continue; // declared binary: the attribute speaks, and it says no
    const abs = path.join(root, rel.split('/').join(path.sep));
    let st;
    try { st = fs.statSync(abs); }
    catch (e) { unreadable.push(rel); continue; }
    if (st.size > MAX_BYTES) { oversized.push(rel); continue; }
    if (v === 'set') { files.push(rel); continue; }
    // 'auto' and 'unspecified' both defer to content, and content is the sniff.
    if (looksBinary(abs)) continue;
    files.push(rel);
  }
  return {
    files: files,
    oversized: oversized,
    unreadable: unreadable,
    total: base.length,
    max_bytes: MAX_BYTES,
  };
}

// The narrow contract name D-1 registers. Returns the surface and nothing
// else, for the callers that have no use for the disclosure - those callers are
// still REQUIRED to surface `oversized` in whatever they print, or to call
// trackedTextScan directly. This function exists so that "a caller passes a root
// and nothing else" is mechanically true at every call site.
function trackedTextFiles(root) {
  return trackedTextScan(root).files;
}

module.exports = {
  MAX_BYTES, SNIFF_BYTES,
  baseTrackedPaths, attributeTextValues, looksBinary,
  trackedTextScan, trackedTextFiles,
};
