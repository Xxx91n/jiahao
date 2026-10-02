#!/usr/bin/env node
'use strict';
// scripts/check-audit-surface.js - ADR-0091 leg (grill-t34 D-004(iii)): the
// audit-surface leg. Asserts the LATEST in-scope audit report's
// <!-- audit-coverage v1 --> coverage block is a SUPERSET of the derived CI
// checklist (docs/governance/audit-checklist.json). Missing block, missing
// items, or an unparseable block all FAIL.
//
// Temporal scope (commit-date effectiveness mirror, D-004(iii)): only
// reports whose first git commit date is on/after the ADR-0091 registration
// landing are asserted. t33's committed reports predate the convention and
// are never retro-convicted. A report not yet committed (bootstrap) counts
// as newest.
//
// The coverage block asserts DECLARED re-run coverage - it never co-signs
// result truth; verdict authority stays with the audit protocol. No
// prose-grep assertions: the asserted object is the contract block.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const roles = require('./shared/claim-surface-roles');

requireCapabilities('audit-surface'); // ADR-0040 D7d: the leg declares its own registry identity

// The AUDIT-REPORT SELECTOR IS REGISTRY CONSUMPTION, NOT FILENAME MATCHING
// (ADR-0093 D-5; grill-t36 D-005). This supersedes the filename selector
// registered by ADR-0091 D-E (the audit-surface coverage extractor and its
// checklist consumer): the registered candidates are now the claim-surface role
// registry's rows. The regex retired with this change - `^\d{4}-\d{2}-\d{2}-
// (audit|report)` over the round reports/handoffs directories - and it retires in
// the SAME commit as the registry leg: two mechanisms reading one surface across
// a window is dual reading (ADR-0083 D-003). The registry rows are the candidate
// set; the coverage block itself remains the assertion object, so an artifact is a
// subject only when it carries the contract. CLAIM_RE survives in
// scripts/shared/claim-surface-roles.js: a range assertion ("is this path on a
// claim surface?") is not a role assertion, and dropping it would widen the
// surface this leg treats as claim.
const ROOT = path.join(__dirname, '..');
const CHECKLIST_REL = path.join('docs', 'governance', 'audit-checklist.json');
const SENTINEL = '<!-- audit-coverage v1 -->';

// Pure: report text -> the coverage array (fail-closed on every gap).
function extractCoverage(reportText) {
  const s = reportText.indexOf(SENTINEL);
  if (s < 0) throw new Error('audit-coverage v1 block missing');
  const fence = reportText.indexOf('```json', s);
  if (fence < 0) throw new Error('audit-coverage v1 block has no json fence');
  const end = reportText.indexOf('```', fence + 8);
  if (end < 0) throw new Error('audit-coverage v1 json fence unterminated');
  const arr = JSON.parse(reportText.slice(fence + 8, end));
  if (!Array.isArray(arr) || !arr.length || !arr.every(function (x) { return typeof x === 'string'; })) {
    throw new Error('audit-coverage v1 block is not a non-empty JSON array of command strings');
  }
  return arr;
}

// git first-commit date (iso) for a repo-relative path; '' for an
// uncommitted file (bootstrap = sorts newest).
function firstCommitDate(rel) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%ad', '--date=iso', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
    return out ? out.split('\n').pop().trim() : '';
  } catch (e) { return ''; }
}

// Pure: candidates [{rel, date}] -> the in-scope latest (date >= scopeDate;
// uncommitted '' sorts newest). Returns null when nothing is in scope.
function pickLatest(candidates, scopeDateMs) {
  let best = null;
  for (const c of candidates) {
    // committed -> first-commit date; uncommitted -> file mtime (a workspace
    // may carry foreign uncommitted claim files; mtime keeps them honest
    // without granting them automatic precedence over committed reports).
    const ms = c.date ? Date.parse(c.date) : (c.mtimeMs || 0);
    if (ms < scopeDateMs) continue;
    if (!best || ms >= best.ms) best = { rel: c.rel, ms: ms };
  }
  return best;
}

if (require.main === module) {
  const checklist = JSON.parse(fs.readFileSync(path.join(ROOT, CHECKLIST_REL), 'utf8'));
  // scope anchor: the ADR-0091 landing (the convention carrier's own
  // first-commit date).
  const adr91 = fs.readdirSync(path.join(ROOT, 'docs', 'adr')).find(function (f) { return f.indexOf('0091-') === 0; });
  if (!adr91) {
    console.error('FAIL: ADR-0091 (the convention carrier) not found - the temporal scope has no anchor');
    process.exit(1);
  }
  const scopeDateMs = Date.parse(firstCommitDate(path.join('docs', 'adr', adr91)) || new Date().toISOString());
  // Candidates: the REGISTERED claim artifacts that actually carry the coverage
  // contract. Registry enumeration is a committed surface, so workspace residue
  // that is not registered is not a candidate - and the reverse direction (a
  // registered-surface artifact with no row) is the claim-surface-roles leg's
  // assertion, so this leg never has to police it to stay honest.
  const loaded = roles.loadRegistry(ROOT);
  if (loaded.parseError || !loaded.registry) {
    // Fail closed on an unreadable declared surface: an empty candidate set would
    // otherwise be reported as "no in-scope report", which is a different claim.
    console.error('FAIL: ' + (loaded.parseError || 'claim-surface role registry not found at ' + roles.REGISTRY_REL) +
      ' - the audit-report selector reads the registry, so an unreadable declared surface is a FAIL, not an empty candidate set');
    process.exit(1);
  }
  const registry = loaded.registry;
  const candidates = [];
  for (const rel of roles.registeredPaths(registry)) {
    const abs = path.join(ROOT, rel.split('/').join(path.sep));
    if (!/\.md$/.test(rel) || !fs.existsSync(abs)) continue;
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { continue; }
    if (text.indexOf(SENTINEL) === -1) continue;
    const date = firstCommitDate(rel);
    candidates.push({ rel: rel, date: date, mtimeMs: date ? 0 : fs.statSync(abs).mtimeMs, role: roles.roleOf(registry, rel) });
  }
  const latest = pickLatest(candidates, scopeDateMs);
  if (!latest) {
    console.error('FAIL: no REGISTERED claim artifact authored on/after the ADR-0091 registration carries an audit-coverage v1 block - the coverage contract has no in-scope subject to assert (bootstrap: land the round report with the block AND its registry row in the same commit)');
    process.exit(1);
  }
  const reportText = fs.readFileSync(path.join(ROOT, latest.rel), 'utf8');
  let coverage;
  try { coverage = extractCoverage(reportText); } catch (e) {
    console.error('FAIL: ' + latest.rel + ' (' + e.message + ') - the latest in-scope audit report must carry the coverage contract (ADR-0091 D-004)');
    process.exit(1);
  }
  const missing = checklist.commands.filter(function (c) { return coverage.indexOf(c) === -1; });
  if (missing.length) {
    console.error('FAIL: ' + latest.rel + ' coverage block is missing ' + missing.length + ' checklist command(s):');
    missing.forEach(function (c) { console.error('  - ' + c); });
    console.error('Regenerate with: node scripts/build-audit-checklist.js emit (then attest what you actually re-ran)');
    process.exit(1);
  }
  console.log('[audit-surface] OK: latest in-scope audit report (' + latest.rel + ') declares coverage of the full checklist (' + checklist.commands.length + ' commands); verdict authority stays with the audit protocol');
  console.log('[audit-surface] subject selected from the claim-surface role registry (declared role: ' +
    roles.roleOf(registry, latest.rel) + ') - the filename selector is retired; naming an artifact no longer changes its governance');
  process.exit(0);
}

module.exports = { extractCoverage, pickLatest, SENTINEL, CHECKLIST_REL };
