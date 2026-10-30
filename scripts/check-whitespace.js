#!/usr/bin/env node
'use strict';
// check-whitespace.js — trailing whitespace and blank lines at EOF, over every
// text file in the working tree, tracked or not (#102).
//
// `git diff --check` only sees the lines a diff carries: a brand-new untracked
// file is invisible to it, and so is a file the reviewer never staged. The
// local check has to cover what is actually on disk, which means enumerating
// tracked + untracked (never ignored) paths from git and reading them.
//
// Usage: node scripts/check-whitespace.js
// Exit 0 = clean; 1 = violations or a bad allowlist entry; 2 = git could not
// enumerate the tree (fail closed rather than report a clean scan of nothing).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Frozen evaluation records keep the bytes they were captured with. Every entry
// needs a reason, and an entry that stops matching a real violation is reported
// as stale so this list cannot quietly become permission for new files.
const ALLOWLIST = {
  'bench/polygraph/results/report-v2-run4.md': 'frozen evaluation record (#102): trailing spaces are the captured tool output',
  'bench/polygraph/results/report-v2-run5.md': 'frozen evaluation record (#102): trailing spaces are the captured tool output',
  'bench/polygraph/results/report-v2-run6.md': 'frozen evaluation record (#102): trailing spaces are the captured tool output',
};

// Binary detection by suffix first (cheap) and by a NUL byte in the first
// block second (catches a binary with a text-looking name).
const BINARY_EXT = /\.(?:png|ico|icns|jpg|jpeg|gif|webp|exe|dll|node|pdb|msi|so|dylib|bin|zip|gz|tar|7z|tgz|pdf)$/i;

function scanText(text) {
  const problems = [];
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const endsWithNewline = normalized.endsWith('\n');
  const body = endsWithNewline ? lines.slice(0, -1) : lines;

  body.forEach((line, i) => {
    if (/[ \t]+$/.test(line)) problems.push({ line: i + 1, kind: 'trailing-whitespace' });
  });

  if (endsWithNewline && body.length > 0 && body[body.length - 1] === '') {
    let blank = 0;
    for (let i = body.length - 1; i >= 0 && body[i] === ''; i--) blank++;
    problems.push({ line: body.length - blank + 1, kind: 'blank-line-at-eof' });
  }
  return problems;
}

function isBinary(buffer) {
  const probe = buffer.subarray(0, 8000);
  return probe.includes(0);
}

// files: repo-relative POSIX paths already filtered to the scan set.
function auditFiles(files, opts) {
  const options = Object.assign({
    root: process.cwd(),
    allowlist: ALLOWLIST,
    readFile: (abs) => fs.readFileSync(abs),
  }, opts || {});
  const allowlist = options.allowlist || {};
  const scanned = new Set(files);
  const problems = [];
  const allowlistProblems = [];
  const used = new Set();
  let textFiles = 0;
  let binaryFiles = 0;

  for (const rel of files) {
    if (BINARY_EXT.test(rel)) { binaryFiles++; continue; }
    let buffer;
    try {
      buffer = options.readFile(path.join(options.root, ...rel.split('/')));
    } catch (e) {
      continue;
    }
    if (isBinary(buffer)) { binaryFiles++; continue; }
    textFiles++;
    const found = scanText(buffer.toString('utf8'));
    if (found.length === 0) continue;
    if (Object.prototype.hasOwnProperty.call(allowlist, rel)) {
      used.add(rel);
      continue;
    }
    for (const v of found) problems.push({ file: rel, line: v.line, kind: v.kind });
  }

  for (const [rel, reason] of Object.entries(allowlist)) {
    if (typeof reason !== 'string' || !reason.trim()) {
      allowlistProblems.push({ file: rel, kind: 'allowlist-reason' });
      continue;
    }
    if (!scanned.has(rel)) allowlistProblems.push({ file: rel, kind: 'stale-allowlist' });
    else if (!used.has(rel)) allowlistProblems.push({ file: rel, kind: 'redundant-allowlist' });
  }

  return { problems, allowlistProblems, textFiles, binaryFiles, allowlisted: [...used].sort() };
}

function listWorkingTree(root) {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return out.split('\0').filter(Boolean);
}

const KIND_LABEL = {
  'trailing-whitespace': 'trailing whitespace',
  'blank-line-at-eof': 'blank line at EOF',
};

const ALLOWLIST_LABEL = {
  'allowlist-reason': 'allowlisted without a reason',
  'stale-allowlist': 'allowlisted but not in the working tree',
  'redundant-allowlist': 'allowlisted but has no violation; drop the entry',
};

function main() {
  let root;
  try {
    root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (e) {
    console.error('error: not inside a git working tree; the scan set comes from git');
    process.exit(2);
  }

  let files;
  try {
    files = listWorkingTree(root);
  } catch (e) {
    console.error('error: git ls-files failed: ' + (e.stderr ? String(e.stderr).trim() : e.message));
    process.exit(2);
  }

  const result = auditFiles(files, { root: root });

  for (const p of result.problems) {
    console.error(p.file + ':' + p.line + ': ' + KIND_LABEL[p.kind]);
  }
  for (const p of result.allowlistProblems) {
    console.error(p.file + ': ' + ALLOWLIST_LABEL[p.kind]);
  }

  if (result.problems.length || result.allowlistProblems.length) {
    console.error('\n' + result.problems.length + ' violation(s) in tracked + untracked text files.');
    if (result.problems.length) console.error('Fix them, or add a path to ALLOWLIST in scripts/check-whitespace.js with a reason.');
    process.exit(1);
  }

  console.log(result.textFiles + ' text files scanned (tracked + untracked, ' +
    result.binaryFiles + ' binary skipped): no trailing whitespace, no blank line at EOF' +
    (result.allowlisted.length ? ' (' + result.allowlisted.length + ' frozen record(s) allowlisted)' : ''));
  process.exit(0);
}

if (require.main === module) main();

module.exports = { scanText, auditFiles, listWorkingTree, ALLOWLIST };
