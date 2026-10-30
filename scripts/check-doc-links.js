#!/usr/bin/env node
'use strict';
// check-doc-links.js — a relative link in a packed Markdown file has to point
// at something the tarball carries (#102).
//
// A link can be correct in the repository and broken in the package: `files`
// in package.json decides what ships, so a README that links a directory which
// is not packed renders a dead link for every npm reader while every local
// check stays green. External URLs are out of scope (they need the network to
// fail, and a release gate does not make calls).
//
// Usage: node scripts/check-doc-links.js
// Exit 0 = every relative link resolves inside the pack; 1 = at least one does
// not; 2 = the pack listing itself could not be read.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

// Blank out fenced code blocks and inline code spans, keeping every newline so
// a match offset still maps to the line a reader would see. Example Markdown
// inside a fence is documentation of a link, not a link.
function maskCode(text) {
  let fence = null;
  return text.split('\n').map((line) => {
    if (fence) {
      const close = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (close && close[1][0] === fence) fence = null;
      return ' '.repeat(line.length);
    }
    const open = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (open) {
      fence = open[1][0];
      return ' '.repeat(line.length);
    }
    return line.replace(/(`+)[^`]*?\1/g, (m) => ' '.repeat(m.length));
  }).join('\n');
}

// Inline links and images: [text](target "title"). Reference-style definitions
// (`[id]: target`) are not matched; none of the packed files use them, and a
// checker that silently accepts either spelling for one shape only would be
// worse than one that documents its shape.
function linksIn(text) {
  const masked = maskCode(text);
  const re = /\[[^\]]*\]\(\s*([^)]*?)\s*\)/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) {
    const inner = /^(\S+)(?:\s+["'][^"']*["'])?$/.exec(m[1]);
    if (!inner) continue;
    out.push({ target: inner[1], line: 1 + masked.slice(0, m.index).split('\n').length - 1 });
  }
  return out;
}

// POSIX resolution against the packed root, not the filesystem: the question
// is "is this path in the package", and the pack list is the only answer.
function resolveTarget(fromRel, target) {
  const dir = fromRel.includes('/') ? fromRel.slice(0, fromRel.lastIndexOf('/')) : '';
  const parts = (dir ? dir.split('/') : []).concat(target.split('/'));
  const out = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

function auditDocLinks(files, opts) {
  const options = Object.assign({ root: root }, opts || {});
  const packed = new Set(files);
  const dirs = new Set(['']);
  for (const rel of files) {
    const parts = rel.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }

  const markdown = files.filter((rel) => /\.md$/i.test(rel)).sort();
  const problems = [];
  if (markdown.length === 0) {
    problems.push({ file: 'package.json', line: 0, target: '', reason: 'the pack carries no Markdown, so this scan proves nothing' });
    return problems;
  }

  for (const rel of markdown) {
    const text = fs.readFileSync(path.join(options.root, ...rel.split('/')), 'utf8');
    for (const link of linksIn(text)) {
      const raw = link.target;
      if (raw.startsWith('#') || EXTERNAL.test(raw)) continue;
      const clean = raw.split('#')[0].split('?')[0];
      if (!clean) continue;
      const resolved = resolveTarget(rel, clean.startsWith('/') ? clean.slice(1) : clean);
      const reason = resolved === null
        ? 'escapes the package root'
        : (packed.has(resolved) ? null : (dirs.has(resolved) ? null : 'not in the package'));
      if (reason) problems.push({ file: rel, line: link.line, target: raw, reason });
    }
  }
  return problems;
}

// `npm` is a shell script on POSIX and a .cmd shim on Windows; node can run
// npm's own CLI file directly, which keeps paths with spaces out of a shell.
function npmCommand() {
  const candidates = [];
  if (process.env.npm_execpath) candidates.push(process.env.npm_execpath);
  if (process.platform === 'win32') {
    candidates.push(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  }
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return { cmd: process.execPath, args: [c] };
  }
  return { cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: [], shell: process.platform === 'win32' };
}

function packedFiles(cwd) {
  const npm = npmCommand();
  const res = spawnSync(npm.cmd, npm.args.concat(['pack', '--dry-run', '--json']), {
    cwd: cwd || root,
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: !!npm.shell,
  });
  if (res.error) throw new Error('npm pack did not complete: ' + res.error.message);
  if (res.status !== 0) throw new Error('npm pack --dry-run exited ' + res.status + ':\n' + String(res.stderr || '').trim());
  let parsed;
  try {
    parsed = JSON.parse(res.stdout)[0];
  } catch (e) {
    throw new Error('npm pack --dry-run --json output did not parse: ' + e.message);
  }
  return parsed.files.map((f) => f.path);
}

function main() {
  let files;
  try {
    files = packedFiles();
  } catch (e) {
    console.error('error: ' + e.message);
    process.exit(2);
  }
  const problems = auditDocLinks(files);
  if (problems.length) {
    for (const p of problems) {
      console.error(p.file + (p.line ? ':' + p.line : '') + ' links ' + p.target + ' — ' + p.reason);
    }
    console.error('\n' + problems.length + ' broken relative link(s) in packed Markdown. Link a packed file/directory, or use an absolute URL for something the tarball does not carry.');
    process.exit(1);
  }
  const markdown = files.filter((rel) => /\.md$/i.test(rel)).length;
  console.log(markdown + ' packed Markdown files: every relative link resolves inside the package (' + files.length + ' files)');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { auditDocLinks, linksIn, maskCode, resolveTarget, packedFiles };
