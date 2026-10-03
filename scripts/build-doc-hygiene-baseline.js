#!/usr/bin/env node
"use strict";
// scripts/build-doc-hygiene-baseline.js - ADR-0093 D-1 (grill-t36 D-004, wave
// one): the generator for the committed doc-hygiene ratchet baseline.
//
// WHY A BASELINE AT ALL. D-1 widens the enumeration surface from
// caller-selected subsets to every tracked text file. Widening a surface that
// currently has violations is exactly how a leg goes always-green in its first
// hour: either the newly-visible backlog is waved through, or the leg is red
// and stays red. The ratchet is the third option - the backlog is ENUMERATED
// into a committed file, so the leg is red only on what is NEW.
//
// Ratchet discipline (the readme-pairing-baseline precedent, ADR-0092 D-P2):
//   --write  regenerates the entry list from the live scan (a deliberate act;
//           every diff is a human looking at newly registered violations)
//   --check  reconciles committed-vs-live and fails on ANY divergence
// Entries are RE-DERIVED, never trusted: an entry whose file is clean is
// STALE and fails, because a stale row masks a reintroduced corruption of the
// same class in the same file. There is no prose waiver channel - every entry
// names a path and a signature, and both are re-derived on every run.
//
// ONE FORMAT BOUNDARY, declared because this file writes committed surface:
// an entry is (path, signature, count). The count is the number of hits of
// that signature in that file, so a file that grows MORE instances of an
// already-registered signature is a real regression rather than a row that
// silently absorbs it. Offsets are deliberately NOT in the entry: a byte offset
// moves on every unrelated edit above it, which would make the baseline churn
// on changes that did not touch the corruption at all.
//
// Usage: node scripts/build-doc-hygiene-baseline.js [--write|--check]

const fs = require("fs");
const path = require("path");
const { docHygiene } = require("./shared/doc-hygiene");
const trackedText = require("./shared/tracked-text");

// NOTE ON CAPABILITIES, stated because the sibling generator calls
// requireCapabilities and this one deliberately does not: D-004's rejected list
// names "opening a new gates.json leg", so this baseline is not a leg. It is
// consumed by the surfaces that already exist - the jest wiring pin (which runs
// in the CI test job and in gate:all via the test battery) and
// scripts/check-post-land.js's subset. A leg identity is therefore not
// something this script may claim for itself, and calling requireCapabilities
// with an unregistered name would throw a registry violation.

const ROOT = path.join(__dirname, "..");
const OUT_REL = "docs/governance/doc-hygiene-baseline.json";

// The signature label without its byte offset: `mid-line TAB (eaten-$ class) @1589
// (byte offset)` -> `mid-line TAB (eaten-$ class)`. Offsets move on unrelated
// edits; the signature class does not. Stripping them here is what keeps the
// baseline diff meaningful instead of noisy.
function signatureOf(hit) {
  return String(hit).replace(/ @\d+( \(byte offset\))?$/, "");
}

// Live scan -> [{ path, signature, count }], sorted for a stable diff.
function scanViolations(root) {
  const scan = trackedText.trackedTextScan(root);
  const entries = [];
  for (const rel of scan.files) {
    let buf;
    try {
      buf = fs.readFileSync(path.join(root, rel.split("/").join(path.sep)));
    } catch (e) {
      continue;
    }
    const counts = new Map();
    for (const hit of docHygiene(buf)) {
      const sig = signatureOf(hit);
      counts.set(sig, (counts.get(sig) || 0) + 1);
    }
    for (const sig of Array.from(counts.keys()).sort()) {
      entries.push({ path: rel, signature: sig, count: counts.get(sig) });
    }
  }
  entries.sort((a, b) =>
    a.path === b.path
      ? a.signature < b.signature
        ? -1
        : a.signature > b.signature
          ? 1
          : 0
      : a.path < b.path
        ? -1
        : 1,
  );
  return { entries, scan };
}

function key(e) {
  return e.path + " :: " + e.signature;
}

// Reconcile the live scan against the committed baseline. Returns errors;
// empty means reconciled. Four failure classes, all fail-closed:
//   unsuppressed - a live violation with no baseline row (the ratchet bites)
//   count        - a registered row whose instance count GREW (more corruption
//                  of an already-registered class, which a bare row would hide)
//   stale        - a row that is no longer a violation (must be REMOVED; a
//                  stale row is the classic baseline rot)
//   unreadable   - a tracked path the scanner could not read
function reconcile(root, opts) {
  const o = opts || {};
  const errors = [];
  const live = scanViolations(root);
  const outAbs = path.join(root, OUT_REL.split("/").join(path.sep));
  let baseline = null;
  if (o.baseline !== undefined) baseline = o.baseline;
  else if (fs.existsSync(outAbs))
    baseline = JSON.parse(fs.readFileSync(outAbs, "utf8"));
  if (!baseline || !Array.isArray(baseline.entries)) {
    errors.push(
      "doc-hygiene: " +
        OUT_REL +
        " absent or malformed - run: node scripts/build-doc-hygiene-baseline.js --write",
    );
    return { errors, live };
  }
  const registered = new Map(
    (baseline.entries || []).map((e) => [key(e), e.count]),
  );
  const liveKeys = new Set(live.entries.map(key));
  for (const e of live.entries) {
    const k = key(e);
    if (!registered.has(k)) {
      errors.push(
        "doc-hygiene: " +
          e.path +
          " carries " +
          e.signature +
          " and is not in the baseline - repair the bytes, or register them deliberately with --write (ADR-0093 D-1 ratchet)",
      );
    } else if (e.count > registered.get(k)) {
      errors.push(
        "doc-hygiene: " +
          e.path +
          " has " +
          e.count +
          " x " +
          e.signature +
          " but the baseline registers " +
          registered.get(k) +
          " - MORE corruption of an already-registered class is not absorbed by the row",
      );
    }
  }
  for (const [k, count] of registered) {
    if (!liveKeys.has(k)) {
      errors.push(
        "doc-hygiene: baseline row " +
          k +
          " (x" +
          count +
          ") is no longer a violation (stale) - remove the row; a stale row masks a reintroduced corruption of the same class",
      );
    }
  }
  for (const rel of live.scan.unreadable) {
    errors.push(
      "doc-hygiene: tracked file " +
        rel +
        " is unreadable - a scanner that cannot read a file must not report the corpus as clean",
    );
  }
  return { errors, live };
}

function build(root, opts) {
  const o = opts || {};
  const live = scanViolations(root);
  return {
    schema_version: 1,
    _doc: "ADR-0093 D-1 (grill-t36 D-004): the doc-hygiene ratchet baseline - a committed, monotonically-shrinking registration of the corruption that already exists in the tracked TEXT surface. Generated by scripts/build-doc-hygiene-baseline.js; hand-edit forbidden. D-1 widened the enumeration surface from caller-selected subsets to every tracked text file, and the pre-existing violations that widening made visible are registered here rather than waved through or left red. Each entry is re-derived on every run (path + signature + instance count), so a row that stops being a real violation fails as stale. entries may only be REMOVED: a new violation fails until it is registered through --write, which is the moment a human looks at it. Byte offsets are deliberately absent - they move on unrelated edits above them. This baseline registers KNOWN INSTANCES; it does not claim the corruption CLASS is closed (ADR-0093 D-1 wording discipline: blind spots closed by declaration, the class repaired never closed).",
    generated_by: "scripts/build-doc-hygiene-baseline.js",
    generated_at: o.now || new Date().toISOString(),
    source_adr: "docs/adr/0093-observer-equivalence-contract.md",
    enumeration_surface: {
      implementation: "scripts/shared/tracked-text.js trackedTextFiles(root)",
      base: "git ls-files over the union of index and tree",
      base_scope:
        "M1's static scan only. The M2 runtime snapshot (D-4, src/shared/tracked-surface.js) uses git ls-files (index only) because it runs inside gate execution where the working tree IS the index being mutated; ADR-0093 D-1 declares both bases.",
      primary_criterion: "gitattributes text attribute",
      fallback: "NUL sniffing (first 8000 bytes, git's own window)",
      disclosed_skip_max_bytes: trackedText.MAX_BYTES,
      caller_contract:
        "callers pass a root and nothing else; no filter parameter, no extension set, no path carve-out, no in-code allowlist",
    },
    scanned_files: live.scan.files.length,
    oversized_disclosed: live.scan.oversized,
    entries: live.entries,
  };
}

// The fields that legitimately vary between runs and therefore must not make
// --check red on their own: the timestamp, and the surface SIZE (which grows
// with the tree - a written count is stale on arrival, the rot class M-8
// caught). Everything else is compared.
function stableCopy(m) {
  const c = JSON.parse(JSON.stringify(m));
  delete c.generated_at;
  delete c.scanned_files;
  return c;
}

function firstDiffPath(a, b) {
  const keys = Array.from(
    new Set(Object.keys(a).concat(Object.keys(b))),
  ).sort();
  for (const k of keys) {
    const va = a[k],
      vb = b[k];
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      if (typeof va === "object" && va && typeof vb === "object" && vb) {
        const sub = firstDiffPath(va, vb);
        if (sub) return sub;
      }
      return k;
    }
  }
  return null;
}

function main(argv) {
  const check = argv.indexOf("--check") !== -1;
  const write = argv.indexOf("--write") !== -1;
  const outAbs = path.join(ROOT, OUT_REL.split("/").join(path.sep));
  if (check) {
    const rec = reconcile(ROOT, {});
    for (const e of rec.errors) console.error("FAIL: " + e);
    let committed = null;
    try {
      committed = JSON.parse(fs.readFileSync(outAbs, "utf8"));
    } catch (e) {
      console.error(
        "FAIL: " +
          OUT_REL +
          " unreadable - run: node scripts/build-doc-hygiene-baseline.js --write",
      );
      process.exit(1);
    }
    const regen = build(ROOT, {});
    regen.generated_at = committed.generated_at;
    const d = firstDiffPath(stableCopy(committed), stableCopy(regen));
    if (d) {
      console.error(
        "FAIL: baseline drift at " +
          d +
          " - run: node scripts/build-doc-hygiene-baseline.js --write",
      );
      process.exit(1);
    }
    if (rec.errors.length) process.exit(1);
    console.log(
      "[doc-hygiene] OK: " +
        rec.live.entries.length +
        " registered pre-existing signature instance(s) over " +
        rec.live.scan.files.length +
        " tracked text file(s); oversized-disclosed " +
        rec.live.scan.oversized.length +
        "; baseline reconciled (ratchet holds)",
    );
    process.exit(0);
  }
  if (!write) {
    console.error(
      "FAIL: pass --write (regenerate the committed baseline) or --check (reconcile it)",
    );
    process.exit(1);
  }
  const b = build(ROOT, {});
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(b, null, 2) + "\n", "utf8");
  console.log(
    "[doc-hygiene] wrote " +
      OUT_REL +
      " (" +
      b.entries.length +
      " registered signature instance(s) over " +
      b.scanned_files +
      " tracked text file(s); oversized-disclosed " +
      b.oversized_disclosed.length +
      ")",
  );
  process.exit(0);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  build,
  stableCopy,
  firstDiffPath,
  scanViolations,
  reconcile,
  signatureOf,
  key: key,
  baselineKey: key,
  OUT_REL,
};
