#!/usr/bin/env node
// scripts/restore-bench-corpus.js - grill-t27 D-002: CI bench-corpus restore
// with validate-or-absent semantics (consumed by .github/workflows/ci.yml's
// 'restore bench corpus' step; ADR-0036 keeps the corpus out of git, ADR-0040
// D2 keeps the capability probe existence-only - integrity lives HERE).
//
// Contract:
//   - extract the tarball into a temp dir SIBLING to the destination (same
//     filesystem, so final placement is an atomic rename),
//   - validate the extracted bench-corpus/ against the git-versioned expected
//     state in bench/polygraph/thresholds.json private_corpus (every manifest
//     id present as a file AND sha256-equal; extra files tolerated - the
//     manifest is a required set, not a closed inventory),
//   - mismatch / layout drift / extraction failure: delete the temp dir, emit
//     a ::error-level annotation (visible, never silent), exit 0 - the
//     capability probe then judges the corpus absent and the four corpus
//     gates report their registered exit-2 UNVERIFIABLE degrade (ADR-0040/0061
//     D-F) instead of running on a stale/partial corpus and failing red,
//   - success: fs.rename into <destParent>/bench-corpus.
//
// Shape (ADR-0029 D4): pure-ish core (jest drives restore() with injected
// manifest/log - it never spawns this process) + thin CLI. The CLI exits 0
// on every deterministic degrade; non-zero is reserved for usage/wiring
// bugs, which must fail loudly instead of masquerading as a degrade.
// GNU-tar-on-Windows note: every tar argv token is a basename under an
// explicit cwd - no absolute path ever reaches tar, so 'C:\x' is never
// parsed as <host>:<path>.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { escWf } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const MANIFEST_REL = path.join('bench', 'polygraph', 'thresholds.json');

// The git-versioned expected state: [{id, sha256, source_adr}]. Consumed,
// never hardcoded (D-002: corpus growth = a manifest PR, not a script edit).
function loadManifest(root) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root || ROOT, MANIFEST_REL), 'utf8'));
  if (!Array.isArray(cfg.private_corpus) || !cfg.private_corpus.length) {
    throw new Error(MANIFEST_REL + ': private_corpus manifest missing or empty - fail-closed');
  }
  return cfg.private_corpus;
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

// Every manifest id must exist as a file AND hash-match the pinned expected
// state. A stale-but-complete tarball (right names, old content) is the same
// failure class as a partial one: the restore degrades instead of letting a
// corpus the repo never declared run its gates.
function validateCorpusDir(dir, manifest) {
  const missing = [];
  const mismatched = [];
  for (const e of manifest) {
    const p = path.join(dir, e.id);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) { missing.push(e.id); continue; }
    if (typeof e.sha256 === 'string' && sha256File(p) !== e.sha256) mismatched.push(e.id);
  }
  return { missing: missing, mismatched: mismatched };
}

function verdictSummary(verdict) {
  const parts = [];
  if (verdict.missing.length) parts.push('missing: ' + verdict.missing.join(', '));
  if (verdict.mismatched.length) parts.push('sha256 mismatch: ' + verdict.mismatched.join(', '));
  return parts.join('; ') || 'no files';
}

// opts: { tarball, destParent, manifest?, root?, log?, errLog? } - manifest/
// log are injected by tests; production defaults read the versioned manifest
// and write to stdout/stderr.
function restore(opts) {
  const destParent = opts.destParent;
  const manifest = opts.manifest || loadManifest(opts.root);
  const log = opts.log || console.log;
  const errLog = opts.errLog || console.error;
  const destDir = path.join(destParent, 'bench-corpus');
  const extractDir = path.join(destParent, '.bench-corpus-restore-' + process.pid + '-' + Date.now());
  const degrade = function (detail) {
    log('::error title=corpus-restore::' + escWf('corpus tarball failed manifest validation (' + detail + '); directory removed - corpus gates degrade to UNVERIFIABLE'));
    errLog('[restore-bench-corpus] UNVERIFIABLE-pending: ' + detail + ' - refresh JIAHAO_BENCH_CORPUS_B64 with a full private/bench-corpus tarball');
    fs.rmSync(extractDir, { recursive: true, force: true });
    return { ok: false, placed: false, detail: detail };
  };

  fs.mkdirSync(extractDir, { recursive: true });
  // Stage the tarball INSIDE the extract dir and untar by basename: no
  // absolute path reaches tar (Git-Bash GNU tar would read 'C:' as a remote
  // host), and a corrupt archive can never leak files outside extractDir.
  fs.copyFileSync(opts.tarball, path.join(extractDir, 'corpus.tar.gz'));
  const r = spawnSync('tar', ['-xzf', 'corpus.tar.gz'], { cwd: extractDir, encoding: 'utf8' });
  if (r.status !== 0) return degrade('tar extraction failed: ' + String(r.stderr || r.error || 'exit ' + r.status).split('\n')[0]);

  const stagedDir = path.join(extractDir, 'bench-corpus');
  if (!fs.existsSync(stagedDir) || !fs.statSync(stagedDir).isDirectory()) {
    return degrade('tarball top-level layout lacks bench-corpus/');
  }
  const verdict = validateCorpusDir(stagedDir, manifest);
  if (verdict.missing.length || verdict.mismatched.length) return degrade(verdictSummary(verdict));

  // Atomic placement: same-parent rename. The dest never pre-exists on a
  // fresh runner; the rm is the local-rehearsal path only.
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
  fs.renameSync(stagedDir, destDir);
  fs.rmSync(extractDir, { recursive: true, force: true });
  const files = fs.readdirSync(destDir).sort();
  log('[restore-bench-corpus] validated ' + manifest.length + ' manifest file(s), placed ' + destDir + ' (' + files.join(', ') + ')');
  return { ok: true, placed: true, dest: destDir, files: files };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length !== 2) {
    console.error('usage: node scripts/restore-bench-corpus.js <corpus.tar.gz> <dest-parent-dir>');
    process.exit(1); // wiring bug, not a degrade - fail loudly
  }
  restore({ tarball: argv[0], destParent: argv[1] });
  process.exit(0); // success AND every degrade both exit 0 - UNVERIFIABLE is
                   // the corpus gates' registered channel, never this step's
}

module.exports = { restore, validateCorpusDir, loadManifest };
