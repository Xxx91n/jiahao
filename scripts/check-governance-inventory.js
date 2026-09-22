#!/usr/bin/env node
// scripts/check-governance-inventory.js - ADR-0064 D-F: structural
// governance-inventory gate (zero-dependency, thin CLI + pure core).
//
// Three structural checks over the registry + ADR tree:
//   (a) every gates.json entry's source_adr file exists and carries a live
//       status (Status: Accepted* or Amended-by*).
//   (b) no command string is registered twice (silent double-registration).
//   (c) supersede/updated-by references close bidirectionally: an ADR
//       declaring "Supersedes: ADR-XXXX" requires the target to record the
//       back-edge (Superseded-by:/Status: Superseded); same for
//       Updates:/Updated-by: pairs.
// Plus the trend-inventory surface (D-F): schema sanity, adr_added files
// exist, deferred_entry ids resolve in docs/deferred-registry.json, and the
// advisory series is replayed (two consecutive doc rounds with net additions
// >0 -> exactly one advisory; never a block).
// Plus the opt-in coverage leg (--coverage-base <ref>): the latest row must
//
// Usage: node scripts/check-governance-inventory.js [--coverage-base <ref>]
// Exit 0 pass (possibly with advisory warnings) / exit 1 fail.

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const surfaceTaxonomy = require('./surface-taxonomy'); // ADR-0076 D-A: surface classification authority

const ROOT = path.join(__dirname, '..');
const GATES_REL = path.join('docs', 'gates.json');
const ADR_DIR = path.join('docs', 'adr');
const REGISTRY_REL = path.join('docs', 'deferred-registry.json');
const TREND_REL = path.join('docs', 'governance', 'trend-inventory.json');
const LIVE_STATUS = /^(Accepted|Amended-by)/;
const ADR_ID = /^\d{4}-.+/;

function adrHeader(text) {
  // ADR status conventions in this tree: "Status: X" (0064), "- Status: X"
  // (0029), or a "## Status" section whose value is the next non-empty line
  // (0027).
  let status = (text.match(/^-?\s*Status:\s*(.+)$/m) || [])[1];
  if (!status) {
    const m = text.match(/^##\s+Status\s*$/m);
    if (m) {
      const rest = text.slice(m.index + m[0].length).split(/\r?\n/);
      status = (rest.filter(function (l) { return l.trim(); })[0] || '').trim();
    }
  }
  const supersedes = (text.match(/^-?\s*Supersedes:\s*(.+)$/m) || [])[1];
  const supersededBy = (text.match(/^-?\s*Superseded-by:\s*(.+)$/m) || [])[1];
  const updates = (text.match(/^-?\s*Updates:\s*(.+)$/m) || [])[1];
  const updatedBy = (text.match(/^-?\s*Updated-by:\s*(.+)$/m) || [])[1];
  const pick = (v) => (v ? (v.match(/ADR-\d{4}/g) || []) : []);
  return { status: status, supersedes: pick(supersedes), supersededBy: pick(supersededBy), updates: pick(updates), updatedBy: pick(updatedBy) };
}

function checkInventory(root, opts) {
  const o = opts || {};
  const base = root || ROOT;
  const errors = [];
  const warnings = [];
  const reg = o.gates || JSON.parse(fs.readFileSync(path.join(base, GATES_REL), 'utf8'));
  const adrDir = o.adrDir || path.join(base, ADR_DIR);

  const adrFiles = fs.readdirSync(adrDir).filter(function (f) { return ADR_ID.test(f); });
  const adrById = {};
  const headers = {};
  for (const f of adrFiles) {
    const id = 'ADR-' + f.slice(0, 4);
    adrById[id] = path.join(adrDir, f);
    headers[id] = adrHeader(fs.readFileSync(adrById[id], 'utf8'));
  }

  // (a) source_adr exists + live status
  for (const e of reg.entries || []) {
    const src = e.source_adr;
    if (typeof src !== 'string' || !src) { errors.push(e.name + ': source_adr missing'); continue; }
    const p = path.isAbsolute(src) ? src : path.join(base, src);
    if (!fs.existsSync(p)) { errors.push(e.name + ': source_adr file missing: ' + src); continue; }
    const st = adrHeader(fs.readFileSync(p, 'utf8')).status || '';
    if (!LIVE_STATUS.test(st)) errors.push(e.name + ': source_adr ' + src + ' status not live: ' + st);
  }

  // (b) no command registered twice
  const seen = new Map();
  for (const e of reg.entries || []) {
    if (seen.has(e.command)) errors.push('command registered twice: "' + e.command + '" (' + seen.get(e.command) + ', ' + e.name + ')');
    seen.set(e.command, e.name);
  }

  // (c) supersede/updated-by bidirectional closure
  for (const id of Object.keys(headers)) {
    for (const tgt of headers[id].supersedes) {
      const th = headers[tgt];
      if (!th) { errors.push(id + ' supersedes ' + tgt + ' which does not exist'); continue; }
      const closed = th.supersededBy.indexOf(id) !== -1 || /^Superseded/.test(th.status || '');
      if (!closed) errors.push(id + ' supersedes ' + tgt + ' but ' + tgt + ' records no Superseded-by/Superseded back-edge');
    }
    for (const tgt of headers[id].updates) {
      const th = headers[tgt];
      if (!th) { errors.push(id + ' updates ' + tgt + ' which does not exist'); continue; }
      if (th.updatedBy.indexOf(id) === -1) errors.push(id + ' updates ' + tgt + ' but ' + tgt + ' records no Updated-by back-edge');
    }
  }

  // (d) trend-inventory surface
  const tiPath = path.join(base, TREND_REL);
  let ti = o.trend || null;
  if (!ti && fs.existsSync(tiPath)) ti = JSON.parse(fs.readFileSync(tiPath, 'utf8'));
  if (!ti) errors.push('trend-inventory missing: ' + TREND_REL);
  else {
    if (ti.schema_version !== 1) errors.push('trend-inventory schema_version must be 1');
    if (!(ti.anchor && ti.anchor.adr_count_base === 63 && ti.anchor.K === 2)) {
      errors.push('trend-inventory anchor must be {adr_count_base:63, K:2} (ADR-0064 D-F)');
    }
    const registry = o.registry || JSON.parse(fs.readFileSync(path.join(base, REGISTRY_REL), 'utf8'));
    const regIds = new Set(registry.entries.map(function (e) { return e.id; }));
    let streak = 0;
    let carveStreak = 0;
    let closureSet = null;
    let mechOutputs = null;
    let reclasses = null;
    const shapeBad = (d) => !d || typeof d !== 'object' || !Array.isArray(d.files) || !d.files.length || typeof d.reason !== 'string' || d.reason.length < 10;
    for (const r of ti.rounds || []) {
      // ADR-0078 D-A: kind admits documentation|fix. A fix row MUST
      // disclose R2 hand-edits via governance_tooling_diff; carve_out_used
      // is not counted for fix rows; exempt from the D-F deferred assert.
      if (r.kind !== 'documentation' && r.kind !== 'fix') { errors.push('trend round ' + r.round + ': kind must be documentation|fix (ADR-0078)'); continue; }
      if (r.kind === 'fix' && r.governance_tooling_diff === undefined) {
        errors.push('trend round ' + r.round + ': fix rounds must disclose R2 hand-edits via governance_tooling_diff (ADR-0078 D-A)');
      }
      for (const a of r.adr_added || []) {
        const file = '0000' + a;
        if (!adrFiles.some(function (f) { return f.slice(0, 4) === file.slice(-4); })) errors.push('trend round ' + r.round + ': adr_added ' + a + ' has no docs/adr file');
      }
      if (typeof r.net_additions !== 'number') errors.push('trend round ' + r.round + ': net_additions must be a number');
      else if (r.net_additions !== ((r.adr_added || []).length - (r.adr_superseded_or_closed || []).length)) {
        errors.push('trend round ' + r.round + ': net_additions ' + r.net_additions + ' recomputes to ' + ((r.adr_added || []).length - (r.adr_superseded_or_closed || []).length) + ' (recorded, not recomputed)');
      }
      if (r.kind === 'documentation' && r.zero_product_diff === true && (r.adr_added || []).length > 0) {
        if (!r.deferred_entry || !regIds.has(r.deferred_entry)) {
          errors.push('trend round ' + r.round + ': zero-product-diff + new ADR requires a deferred-registry entry (D-F clause 3)');
        }
      }
      // ADR-0076 D-B: a declared gtd is recomputed against the taxonomy,
      // never trusted - every listed file must classify R2 (R1 hard-fails;
      // R3 is a mislabeled row).
      if (r.governance_tooling_diff !== undefined) {
        const gtd = r.governance_tooling_diff;
        if (shapeBad(gtd)) {
          errors.push('trend round ' + r.round + ': governance_tooling_diff must be {files: non-empty string[], reason: string>=10} - a bare marker hard-fails (ADR-0076 D-B; carve_out_used:0 + field omitted is the no-carve-out form)');
        } else {
          if (!closureSet) closureSet = new Set(surfaceTaxonomy.computeRuntimeClosure(base));
          for (const f of gtd.files) {
            const cls = surfaceTaxonomy.classifyPath(f, closureSet);
            if (cls === 'R1') {
              errors.push('trend round ' + r.round + ': governance_tooling_diff lists runtime-surface file ' + f + ' - R1 is implementation-round territory absolutely (ADR-0076 D-A)');
            } else if (cls !== 'R2') {
              // ADR-0080 D-B: a file moved off R2 by a reclassification
              // effective AFTER the row's date was R2 at row time - excused;
              // a row dated on/after the effective date still fails.
              if (!reclasses) {
                const taxJson = surfaceTaxonomy.loadTaxonomy(base);
                reclasses = Array.isArray(taxJson.reclassifications) ? taxJson.reclassifications : [];
              }
              const excused = reclasses.some(function (rc) {
                if (!rc || rc.from !== 'R2' || rc.to !== cls || !r.date || !(r.date < rc.effective)) return false;
                try { return new RegExp(rc.pattern).test(f); } catch (e) { return false; }
              });
              if (!excused) {
                errors.push('trend round ' + r.round + ': governance_tooling_diff file ' + f + ' classifies ' + cls + ', not R2 - mislabeled disclosure');
              }
            }
          }
        }
        if (r.kind === 'documentation' && r.carve_out_used !== 0 && r.carve_out_used !== 1) {
          errors.push('trend round ' + r.round + ': carve_out_used must be 0|1 with governance_tooling_diff (ADR-0076 D-B)');
        }
      }
      if (r.carve_out_used === 1 && !(r.governance_tooling_diff && Array.isArray(r.governance_tooling_diff.files) && r.governance_tooling_diff.files.length)) {
        errors.push('trend round ' + r.round + ': carve_out_used=1 requires non-empty governance_tooling_diff.files');
      }
      // ADR-0077 D-B sibling marker: mechanism_output_diff records faithful
      // regenerations of mechanism-output artifacts - it never feeds
      // burn-rate. Files must be in the mechanism_outputs enum + R2.
      if (r.mechanism_output_diff !== undefined) {
        const mod = r.mechanism_output_diff;
        if (shapeBad(mod)) {
          errors.push('trend round ' + r.round + ': mechanism_output_diff must be {files: non-empty string[], reason: string>=10} - a bare marker hard-fails (ADR-0077 D-B)');
        } else {
          if (!closureSet) closureSet = new Set(surfaceTaxonomy.computeRuntimeClosure(base));
          if (!mechOutputs) {
            const tax = surfaceTaxonomy.loadTaxonomy(base);
            mechOutputs = ((tax.mechanism_outputs && tax.mechanism_outputs.entries) || []).map(function (e) { return e.file; });
          }
          for (const f of mod.files) {
            if (mechOutputs.indexOf(f) === -1) {
              errors.push('trend round ' + r.round + ': mechanism_output_diff file ' + f + ' is not in the mechanism_outputs closed enumeration (ADR-0077 D-B)');
            } else if (surfaceTaxonomy.classifyPath(f, closureSet) !== 'R2') {
              errors.push('trend round ' + r.round + ': mechanism_output_diff file ' + f + ' does not classify R2 - mislabeled marker (ADR-0077 D-B)');
            }
          }
        }
      }
      // ADR-0078 D-A (grill-t19): kind:fix rows are outside both advisory
      // streaks - skip-not-reset: never feed the net-additions streak,
      // never reset either streak; doc-fix-doc adjacency still counts.
      if (r.kind === 'fix') continue;
      carveStreak = (r.carve_out_used === 1) ? carveStreak + 1 : 0;
      streak = (r.net_additions > 0) ? streak + 1 : 0;
    }
    if (carveStreak >= 2) {
      warnings.push('::warning title=Governance carve-out burn-rate::' + carveStreak + ' consecutive documentation rounds used the governance carve-out - advisory only, never blocks (ADR-0076 D-B)');
    }
    const fired = (ti.rounds || []).filter(function (r) { return r.advisory_fired; }).length;
    // D-F: exactly one advisory when the streak reaches K; advisory never blocks.
    const expected = streak >= (ti.anchor && ti.anchor.K) ? 1 : 0;
    if (fired !== expected) {
      warnings.push('trend-anchor advisory drift: ' + fired + ' fired vs ' + expected + ' expected (streak ' + streak + ' of ' + (ti.anchor && ti.anchor.K) + ')');
    }
    if (streak >= (ti.anchor && ti.anchor.K)) {
      warnings.push('::warning title=Governance trend anchor::two consecutive documentation rounds added ADRs (streak ' + streak + ' >= K=' + ti.anchor.K + ') - advisory only, never blocks (ADR-0064 D-F)');
    }
    // --coverage-base (t21 audit C-1): every R2 file in the committed
    // diff <base>..HEAD must ride a declared channel of the latest row;
    // an R1 file fails.
    if (o.coverageBase) {
      if (!closureSet) closureSet = new Set(surfaceTaxonomy.computeRuntimeClosure(base));
      const rows = ti.rounds || [];
      const changed = execFileSync('git', ['diff', '--name-only', o.coverageBase, 'HEAD'], { cwd: base, encoding: 'utf8' })
        .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      const gaps = coverageGaps(changed, rows[rows.length - 1] || {}, closureSet);
      gaps.r1.forEach(function (f) { errors.push('coverage: ' + f + ' is R1 - zero_product_diff violated (ADR-0076 D-A)'); });
      gaps.undeclaredR2.forEach(function (f) { errors.push('coverage: ' + f + ' is R2 but undeclared in the latest row (t21 audit C-1)'); });
    }
  }

  return { errors: errors, warnings: warnings };
}

// Pure: committed paths + the coverage-budget row -> {r1, undeclaredR2}.
// Declared = gtd.files + mechanism_output_diff.files (the sibling marker).
function coverageGaps(changed, row, closureSet) {
  const declared = new Set(((row.governance_tooling_diff || {}).files || []).concat(((row.mechanism_output_diff || {}).files || [])));
  const r1 = [], undeclared = [];
  for (const f of changed) {
    const c = surfaceTaxonomy.classifyPath(f, closureSet);
    if (c === 'R1') r1.push(f);
    else if (c === 'R2' && !declared.has(f)) undeclared.push(f);
  }
  return { r1: r1, undeclaredR2: undeclared };
}

function main() {
  requireCapabilities('governance-inventory');
  const ci = process.argv.indexOf('--coverage-base');
  const out = checkInventory(ROOT, ci !== -1 ? { coverageBase: process.argv[ci + 1] } : undefined);
  for (const w of out.warnings) console.warn(w);
  for (const e of out.errors) console.error('FAIL: ' + e);
  if (out.errors.length) process.exit(1);
  console.log('[governance-inventory] OK: ' + (JSON.parse(fs.readFileSync(path.join(ROOT, GATES_REL), 'utf8')).entries || []).length + ' entries, live source_adr, unique commands, closed references');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkInventory, adrHeader, coverageGaps };
