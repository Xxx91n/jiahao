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

requireCapabilities(['repo-tree']);

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
    const ms = c.date ? Date.parse(c.date) : Infinity;
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
  // candidates: dated audit/report files on the claim surfaces
  const candidates = [];
  const scratch = path.join(ROOT, '.scratch');
  for (const round of fs.readdirSync(scratch).filter(function (d) { return /^grill-/.test(d); })) {
    for (const sub of ['reports', 'handoffs']) {
      const dir = path.join(scratch, round, sub);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!/^\d{4}-\d{2}-\d{2}-(audit|report)/.test(f) || !f.endsWith('.md')) continue;
        const rel = path.join('.scratch', round, sub, f).split(path.sep).join('/');
        candidates.push({ rel: rel, date: firstCommitDate(rel) });
      }
    }
  }
  const latest = pickLatest(candidates, scopeDateMs);
  if (!latest) {
    console.error('FAIL: no audit report authored on/after the ADR-0091 registration exists yet - the coverage contract has no in-scope report to assert (bootstrap: land the round report with an audit-coverage v1 block)');
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
  process.exit(0);
}

module.exports = { extractCoverage, pickLatest, SENTINEL, CHECKLIST_REL };
