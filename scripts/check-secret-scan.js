#!/usr/bin/env node
// scripts/check-secret-scan.js \u2014 defer-0054 actioned (ADR-0074 D-E / t13 ledger):
// repo-side pattern scanner, <=3 rules, zero dependencies, git ls-files scope.
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
    if (!st.isFile() || st.size > MAX_BYTES) return hits;
    text = fs.readFileSync(abs, 'utf8');
  }
  for (const r of RULES) {
    if (r.kind === 'content' && r.re.test(text)) hits.push({ file: rel, rule: r.id });
  }
  return hits;
}

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
}

function main() {
  if (process.argv.indexOf('--help') !== -1 || process.argv.indexOf('-h') !== -1) {
    console.log('usage: node scripts/check-secret-scan.js  (scans git ls-files; exit 1 on any hit)');
    return;
  }
  requireCapabilities('secret-scan');
  const hits = [];
  for (const f of trackedFiles()) hits.push.apply(hits, scanFile(f));
  if (hits.length) {
    console.error('[secret-scan] FAIL - ' + hits.length + ' hit(s):');
    for (const h of hits) console.error('  ' + h.rule + '  ' + h.file);
    process.exit(1);
  }
  console.log('[secret-scan] OK - ' + RULES.length + ' rules, 0 hits');
}

if (require.main === module) main();
module.exports = { RULES, scanFile, trackedFiles };
