#!/usr/bin/env node
'use strict';
// scripts/check-secret-scan.js — defer-0054 actioned (authority: ADR-0074 R2-
// dispositions bullet + t13 ledger "T-2 dispositions"; not the D-E plan itself):
// repo-side pattern scanner, <=3 rules, zero dependencies. Scope: tracked files
// (index union committed tree) PLUS the commit-message surface (grill-t25,
// ADR-0084 D-G) - the GitHub-official push-protection enumeration does not
// cover commit-message bodies; a token pasted into a message is the same
// exposure class, so the same three rules scan it.
// Spec deviation registered (T-3 F-7): the spec'd cheap high-entropy check is
// substituted by R3 purged-path classes — a generic entropy rule false-positives
// on the sha256 digests throughout .scratch reports; entropy detection stays on
// the defer-0054 gitleaks-revisit trigger.
//
// The purge surface classes this guards against (ADR-0074 D-A):
//   R1 content: private-key PEM material
//   R2 content: well-known provider token shapes (github/gitlab/aws/slack/llm)
//   R3 path:    the purged recurrence classes \u2014 host-config-backup/, *.tgz,
//               .env* files, settings.local.json
//
// Fail-closed: any hit exits 1 with file+rule lines. This is a tripwire, not
// a gitleaks replacement \u2014 the full-scanner revisit stays on the defer-0054
// unfreeze clause.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const MAX_BYTES = 1024 * 1024;

const RULES = [
  { id: 'R1-private-key', kind: 'content', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY( BLOCK)?-----/ },
  { id: 'R2-provider-token', kind: 'content', re: /\b(ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/ },
  { id: 'R3-purged-path-class', kind: 'path', re: /(^|\/)host-config-backup(\/|$)|\.tgz$|(^|\/)\.env($|\.)|(^|\/)settings\.local\.json$/i }
];

function scanFile(rel, readContent) {
  const hits = [];
  for (const r of RULES) {
    if (r.kind === 'path') {
      if (r.re.test(rel)) hits.push({ file: rel, rule: r.id });
    }
  }
  // injected readers own the source (tests may point outside ROOT); the
  // filesystem probe only runs in real scan mode.
  const abs = path.join(ROOT, rel.split('/').join(path.sep));
  let text;
  if (readContent) {
    text = readContent(abs);
  } else {
    let st;
    try { st = fs.statSync(abs); } catch (e) { return hits; }
    if (!st.isFile()) return hits;
    if (st.size > MAX_BYTES) { oversized.push(rel); return hits; }
    text = fs.readFileSync(abs, 'utf8');
  }
  for (const r of RULES) {
    if (r.kind === 'content' && r.re.test(text)) hits.push({ file: rel, rule: r.id });
  }
  return hits;
}

const oversized = [];
let enumCounts = { index: 0, tree: 0, union: 0 };

// T-3 F-1: the mutable index alone is NOT authoritative — GitButler's virtual-
// branch index can lag HEAD, silently shrinking scan scope (a "fail-closed"
// gate with a fail-open enumeration). Union the index with the committed tree.
function trackedFiles() {
  const opts = { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 };
  const index = execFileSync('git', ['ls-files'], opts)
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  const tree = execFileSync('git', ['ls-tree', '-r', 'HEAD', '--name-only'], opts)
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  const union = Array.from(new Set(index.concat(tree))).sort();
  enumCounts = { index: index.length, tree: tree.length, union: union.length };
  return union;
}

// Fourth enumeration surface (grill-t25, ADR-0084 D-G): commit messages.
// Reachable history on HEAD is the public surface - the maintainer-only
// gb-local/* messages are deliberately NOT enumerated (the published tree is
// the contract). Same content rules, pseudo-path commit:<sha12>.
function commitMessages() {
  const raw = execFileSync('git', ['log', '--format=%H%x1f%B%x1e'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return raw.split('\x1e').map(function (rec) {
    const i = rec.indexOf('\x1f');
    if (i === -1) return null;
    return { sha: rec.slice(0, i).trim(), body: rec.slice(i + 1) };
  }).filter(function (r) { return r && /^[0-9a-f]{40}$/.test(r.sha); });
}

function scanMessage(sha, body) {
  const hits = [];
  for (const r of RULES) {
    if (r.kind === 'content' && r.re.test(body)) hits.push({ file: 'commit:' + sha.slice(0, 12), rule: r.id });
  }
  return hits;
}

function main() {
  if (process.argv.indexOf('--help') !== -1 || process.argv.indexOf('-h') !== -1) {
    console.log('usage: node scripts/check-secret-scan.js  (scans tracked files + commit messages; exit 1 on any hit)');
    return;
  }
  requireCapabilities('secret-scan');
  const hits = [];
  for (const f of trackedFiles()) hits.push.apply(hits, scanFile(f));
  const msgs = commitMessages();
  for (const m of msgs) hits.push.apply(hits, scanMessage(m.sha, m.body));
  if (hits.length) {
    console.error('[secret-scan] FAIL - ' + hits.length + ' hit(s):');
    for (const h of hits) console.error('  ' + h.rule + '  ' + h.file);
    process.exit(1);
  }
  const extra = ' - enum index/tree/union ' + enumCounts.index + '/' + enumCounts.tree + '/' + enumCounts.union +
    (oversized.length ? '; skipped-oversized ' + oversized.length + ' [' + oversized.join(', ') + ']' : '; oversized-skip 0') + '; commit-messages ' + msgs.length;
  console.log('[secret-scan] OK - ' + RULES.length + ' rules, 0 hits' + extra);
}

if (require.main === module) main();
module.exports = { RULES, scanFile, scanMessage, trackedFiles, commitMessages, oversized, enumCounts };
