#!/usr/bin/env node
'use strict';
// check-claim-registration.js - grill-t39 T-12 (ADR-0099 section P-A, ledger
// D-006.1): the defer-0089 cash-out. A committed sentence that CLAIMS a
// registration must name a row id that resolves inside the claim anchor commit.
//
// WHY THIS EXISTS. The repository could walk registry -> claim but not claim ->
// registry, so "已登记 defer-00NN" could be written about a row that was never
// appended (the live instance: ADR-0096:51 over-reported a registration). The
// audit-standards precedent (ISA 315 / PCAOB AS 1105) is that a claim and its
// record are reconciled in both directions; the missing direction is the forward
// one, and this leg is it.
//
// FORWARD-ONLY, LIKE EVERY OTHER AUTHORITY HERE. Claims introduced before this
// script's own registration commit are exempt - history is never rewritten and a
// new assertion does not retro-convict the prose that preceded it (ADR-0096
// D-E's effect-clause triple, applied to the claim side). The leg bites on
// every claim written from its anchor forward, including this round's own.
//
// THE ANCHOR IS THE CLAIM, NOT THE FILE. A file added three rounds ago can
// carry a registration sentence added last week, so the object judged is the
// commit that introduced that (file, id) pair, found with a pickaxe. Reading the
// registry at the file's add-commit would judge a claim against a registry it
// could never have seen - a false red that looks exactly like a real one.
//
// STATUTORY SENTENCE FORMS (the closed pattern set). A bare id in a table cell
// is a reference, not a registration act, and is deliberately not judged here.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const REGISTRY_REL = path.join('docs', 'deferred-registry.json');
const REGISTRY_POSIX = 'docs/deferred-registry.json';
const SELF_REL = 'scripts/check-claim-registration.js';

const CLAIM_PATTERNS = [
  /已登记[^\n]{0,12}?(defer-\d{4})/g,
  /登记为[^\n]{0,12}?(defer-\d{4})/g,
  /registered as `?(defer-\d{4})/gi,
  /registration(?: row)? (?:is |= )?`?(defer-\d{4})/gi,
  /row id `?(defer-\d{4})/gi,
  /rides (?:the same anchor as |the existing )?`?(defer-\d{4})/gi,
  /cash(?:es|es|ing)? out(?: deferred row)? `?(defer-\d{4})/gi,
  /the deferred row `?(defer-\d{4})/gi,
];

function git(args, cwd) {
  return execFileSync('git', args, { cwd: cwd || ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

function commitTs(rev) {
  try { return Date.parse(git(['log', '-1', '--format=%cI', rev])) / 1000; } catch (e) { return null; }
}

// The commit that introduced this claim in this file (the earliest pickaxe hit).
// Returns null when the artifact is not committed yet - then the worktree
// registry is the honest read, and that fact is disclosed.
function claimAnchor(rel, id) {
  try {
    const out = git(['log', '--format=%H', '-S', id, '--', rel]);
    const list = out.split('\n').map((s) => s.trim()).filter(Boolean);
    return list.length ? list[list.length - 1] : null;
  } catch (e) { return null; }
}

function registrationCommit() {
  try {
    const out = git(['log', '--diff-filter=A', '--format=%H', '--', SELF_REL]);
    const adds = out.split('\n').map((s) => s.trim()).filter(Boolean);
    return adds.length ? adds[adds.length - 1] : null;
  } catch (e) { return null; }
}

function idsAtRev(rev) {
  let text;
  try { text = git(['show', rev + ':' + REGISTRY_POSIX]); } catch (e) { return null; }
  try {
    const reg = JSON.parse(text);
    return new Set((reg.entries || []).map((e) => e && e.id).filter(Boolean));
  } catch (e) { return null; }
}

function idsInWorktree() {
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_REL), 'utf8'));
    return new Set((reg.entries || []).map((e) => e && e.id).filter(Boolean));
  } catch (e) { return null; }
}

// Tracked claim artifacts only: the population comes from git, so a workspace
// residue file cannot join the judged set (and cannot escape it by deletion).
function claimSurfaces() {
  const files = git(['ls-files']).split('\n').map((s) => s.trim()).filter(Boolean);
  return files.filter(function (f) {
    if (/^\.scratch\/grill-[^/]+\/(reports|handoffs)\/.*\.md$/.test(f)) return true;
    if (/^docs\/adr\/\d{4}-.+\.md$/.test(f)) return true;
    return f === 'AGENTS.md' || f === 'CONTEXT.md';
  });
}

function claimsIn(text) {
  const ids = new Set();
  for (const re of CLAIM_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) ids.add(m[1]);
  }
  return Array.from(ids).sort();
}

function check(opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const files = (o.files || claimSurfaces());
  const legAnchor = o.legAnchor !== undefined ? o.legAnchor : registrationCommit();
  const legTs = legAnchor ? commitTs(legAnchor) : null;
  const errors = [];
  const warnings = [];
  let claims = 0;
  let judged = 0;
  let exempt = 0;
  const worktreeIds = idsInWorktree();
  if (worktreeIds === null) {
    return { errors: ['claim-registration: ' + REGISTRY_POSIX + ' unreadable in the worktree - fail closed'], warnings: [], claims: 0, judged: 0, exempt: 0, files: files.length };
  }
  for (const rel of files) {
    let text;
    try { text = fs.readFileSync(path.join(root, rel.split('/').join(path.sep)), 'utf8'); } catch (e) { continue; }
    for (const id of claimsIn(text)) {
      claims++;
      const anchor = o.forceAnchor !== undefined ? o.forceAnchor : claimAnchor(rel, id);
      const ts = anchor ? commitTs(anchor) : null;
      if (anchor && legTs !== null && ts !== null && ts < legTs) { exempt++; continue; }
      let ids = null;
      if (anchor) ids = idsAtRev(anchor);
      if (ids === null) {
        ids = worktreeIds;
        warnings.push('claim-registration: ' + rel + ' / ' + id + ' has no resolvable claim anchor; judged against the worktree registry (disclosed, not silent)');
      }
      judged++;
      if (!ids.has(id)) {
        errors.push('claim-registration: ' + rel + ' claims a registration of ' + id + ' which does not resolve in ' +
          (anchor ? 'the claim anchor ' + anchor.slice(0, 9) : 'the registry') +
          ' - a claim of registration without a resolvable row id is not a registration (ADR-0099 section P-A)');
      }
    }
  }
  return { errors, warnings, claims, judged, exempt, files: files.length, legAnchor: legAnchor };
}

function main() {
  requireCapabilities('claim-registration');
  const r = check();
  for (const e of r.errors) console.error('FAIL: ' + e);
  if (r.errors.length) process.exit(1);
  for (const w of r.warnings) console.error('WARN: ' + w);
  console.log('[claim-registration] OK: ' + r.claims + ' registration claim(s) across ' + r.files +
    ' tracked claim-surface artifact(s); ' + r.judged + ' judged, ' + r.exempt +
    ' exempt as pre-anchor history (forward-only), every judged claim resolved to a row id' +
    (r.legAnchor ? ' - anchor ' + r.legAnchor.slice(0, 9) : ' - anchor not landed yet'));
  process.exit(0);
}

if (require.main === module) main();
module.exports = { check, claimSurfaces, claimsIn, claimAnchor, registrationCommit, CLAIM_PATTERNS };
