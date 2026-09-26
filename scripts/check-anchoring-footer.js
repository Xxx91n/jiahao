#!/usr/bin/env node
// check-anchoring-footer.js - grill-t29 D-006 (F-11): the [ANCHORING] footer
// leg. Every non-merge, non-"GitButler Workspace Commit" commit after the
// convention's registration commit must carry a footer line
//
//   [ANCHORING] <space-separated landed-file list>
//
// whose file set equals `git show --name-only` for the commit. The footer is
// a replayable self-description: forensic, not preventive (the writer and
// committer share a trust domain; it does not stop forgery) - live truth is
// always git show --name-only, which is exactly what this leg rechecks.
//
// Registration anchor: the commit that introduced this script
// (git log --diff-filter=A, oldest wins). Commits before it are exempt -
// the convention applies going forward only, history is never rewritten.
//
// Usage: node scripts/check-anchoring-footer.js

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const SELF_REL = 'scripts/check-anchoring-footer.js';
const FOOTER_RE = /^\[ANCHORING\]\s+(.*)$/m;
const WORKSPACE_SUBJECT = 'GitButler Workspace Commit';

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();

function registrationCommit() {
  // oldest commit that added this script = the convention's registration point
  const adds = git(['log', '--diff-filter=A', '--format=%H', '--', SELF_REL]).split('\n').filter(Boolean);
  return adds.length ? adds[adds.length - 1] : null;
}

function landedFiles(sha) {
  return git(['show', '--name-only', '--format=', sha]).split('\n').map((s) => s.trim()).filter(Boolean).sort();
}

function footerFiles(sha) {
  const msg = git(['log', '-1', '--format=%B', sha]);
  const m = msg.match(FOOTER_RE);
  if (!m) return null;
  return m[1].trim().split(/\s+/).filter(Boolean).sort();
}

function checkFooters(root) {
  const errors = [];
  const reg = registrationCommit();
  if (!reg) { errors.push('anchoring-footer: registration commit not found (script never landed?)'); return { errors, checked: 0 }; }
  const parented = git(['rev-parse', '-q', '--verify', reg + '^']) !== '';
  const range = parented ? reg + '^..HEAD' : 'HEAD';
  const commits = git(['rev-list', '--no-merges', range])
    .split('\n').filter(Boolean)
    .filter((sha) => !git(['log', '-1', '--format=%s', sha]).startsWith(WORKSPACE_SUBJECT));
  let checked = 0;
  for (const sha of commits) {
    const landed = landedFiles(sha);
    if (!landed.length) continue; // empty commits carry nothing to name
    const foot = footerFiles(sha);
    if (foot === null) {
      errors.push('anchoring-footer: ' + sha.slice(0, 9) + ' lacks the [ANCHORING] footer (post-registration commit; AGENTS.md convention, grill-t29 D-006)');
      continue;
    }
    checked++;
    const a = landed.join(' ');
    const b = foot.join(' ');
    if (a !== b) {
      errors.push('anchoring-footer: ' + sha.slice(0, 9) + ' footer names {' + b + '} but landed {' + a + '} - derive the list, never hand-type it');
    }
  }
  return { errors: errors, checked: checked, reg: reg };
}

function main() {
  requireCapabilities('anchoring-footer');
  const out = checkFooters(ROOT);
  for (const e of out.errors) console.error('FAIL: ' + e);
  if (out.errors.length) process.exit(1);
  console.log('[anchoring-footer] OK: ' + out.checked + ' post-registration commits verified against git show --name-only (grill-t29 D-006)');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkFooters, landedFiles, footerFiles, registrationCommit, FOOTER_RE };
