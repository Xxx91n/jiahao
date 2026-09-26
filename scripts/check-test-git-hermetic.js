#!/usr/bin/env node
// check-test-git-hermetic.js - grill-t29 D-004 (F-14 candidate): every git
// WRITE op in test/**.js must route through test/helpers/git-hermetic.js
// (inline identity + config-source isolation). Raw spawns with a read-verb
// literal argv stay lawful; a write verb or an unclassifiable argv is red.
//
// Static analysis, not trust: the leg extracts the verb from every raw
// `('git', argv)` spawn site; when argv is indirect (a runner's parameter),
// the runner's own call sites are classified instead - `git(someVar)` call
// sites are unclassifiable and red. Ambiguous verbs (tag/branch/config)
// classify by their flag set (list-form = read, else write).
//
// Usage: node scripts/check-test-git-hermetic.js

'use strict';

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const TEST_DIR = path.join('test');
const HELPER_REL = path.join('test', 'helpers', 'git-hermetic.js');

const READ_VERBS = new Set([
  'log', 'show', 'diff', 'diff-tree', 'diff-index', 'diff-files', 'ls-tree', 'ls-files',
  'ls-remote', 'rev-list', 'rev-parse', 'cat-file', 'merge-base', 'for-each-ref',
  'describe', 'status', 'blame', 'shortlog', 'grep', 'count-objects', 'name-rev',
  'verify-pack', 'var', 'reflog', 'show-ref', 'check-ignore', 'check-attr',
]);
const WRITE_VERBS = new Set([
  'init', 'add', 'rm', 'mv', 'commit', 'commit-tree', 'merge', 'update-ref',
  'checkout', 'restore', 'reset', 'write-tree', 'stash', 'cherry-pick', 'rebase',
  'am', 'apply', 'notes', 'replace', 'worktree', 'push', 'pull', 'fetch', 'clone',
  'submodule', 'gc', 'clean', 'revert', 'switch', 'symbolic-ref', 'update-index',
  'read-tree', 'merge-tree', 'mktag', 'hash-object', 'pack-refs', 'prune',
]);
// Verbs whose read/write class depends on the flag tail.
const READ_FLAGS = {
  tag: ['-l', '--list', '-n', '--points-at', '--contains', '--merged', '--no-merged', '--format', '--sort'],
  branch: ['-l', '--list', '-a', '-r', '-v', '-vv', '--show-current', '--contains', '--merged', '--no-merged', '--format'],
  config: ['--get', '-l', '--list', '--get-regexp', '--get-all', '--get-color', '--get-urlmatch', '--null'],
};
const AMBIGUOUS = Object.keys(READ_FLAGS);

const SPAWN_RE = /(?:execFileSync|spawnSync|execFile|spawn|execSync|exec)\(\s*['"`]git['"`]\s*,\s*/g;
const DEF_RE = /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/g;

// Extract the argv literal after a spawn call: balanced scan honoring
// quotes/backticks so a ']' inside a pattern string cannot truncate it.
function readArgv(text, start) {
  const s0 = text[start];
  if (s0 !== '[') {
    const m = text.slice(start).match(/^[A-Za-z_$][\w$.]*/);
    return { argv: null, argExpr: m ? m[0] : null };
  }
  let depth = 0;
  let i = start;
  let quote = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) break; }
  }
  return { argv: text.slice(start, i + 1), argExpr: null };
}

// argv literal '[ ... ]' -> token list (string literals and bare identifiers).
function argvTokens(argvSrc) {
  const toks = [];
  const re = /'([^']*)'|"([^"]*)"|`([^`]*)`|([A-Za-z_$][\w$.]*)|(-?\d+)/g;
  let m;
  const inner = argvSrc.slice(1, -1);
  while ((m = re.exec(inner))) toks.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4])));
  return toks;
}

// Verb = first bareword after option run; '-c x=y', '-C dir', '--git-dir=..'
// and other flags are skipped. Non-literal tokens end the scan (unknown).
function verbOf(argvSrc) {
  const toks = argvTokens(argvSrc);
  let skipValue = false;
  for (const t of toks) {
    if (skipValue) { skipValue = false; continue; }
    if (t === '-c' || t === '-C' || t === '--git-dir' || t === '--work-tree') { skipValue = true; continue; }
    if (typeof t !== 'string' || t.indexOf('-') === 0) continue;
    return t;
  }
  return null;
}

function classifyVerb(verb, toks) {
  if (!verb) return 'unknown';
  if (READ_VERBS.has(verb)) return 'read';
  if (WRITE_VERBS.has(verb)) return 'write';
  if (AMBIGUOUS.indexOf(verb) !== -1) {
    const flags = toks.slice(toks.indexOf(verb) + 1).filter((t) => typeof t === 'string' && t.charAt(0) === '-');
    return flags.some((f) => READ_FLAGS[verb].indexOf(f) !== -1) ? 'read' : 'write';
  }
  return 'unknown';
}

function listTestFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push.apply(out, listTestFiles(p));
    else if (/\.js$/.test(e.name)) out.push(p);
  }
  return out;
}

// Scan one source text; returns violation strings (file-relative lines).
function scanSource(text, rel) {
  const errors = [];
  const runners = new Map(); // runner name -> list of def positions
  // Pass 1: literal-argv spawn sites + runner discovery.
  const spawns = [];
  let m;
  SPAWN_RE.lastIndex = 0;
  while ((m = SPAWN_RE.exec(text))) {
    const at = m.index;
    const read = readArgv(text, m.index + m[0].length);
    if (read.argv !== null) {
      const toks = argvTokens(read.argv);
      spawns.push({ at: at, verb: verbOf(read.argv), toks: toks });
    } else {
      // indirect argv: the enclosing function is a raw-git runner; its call
      // sites get classified instead.
      const arg = read.argExpr;
      let runner = null;
      DEF_RE.lastIndex = 0;
      let d;
      while ((d = DEF_RE.exec(text)) && d.index < at) runner = d[1] || d[2];
      spawns.push({ at: at, runner: runner || null, arg: arg });
    }
  }
  const lineOf = (i) => text.slice(0, i).split('\n').length;
  for (const s of spawns) {
    if (s.runner) {
      runners.set(s.runner, true);
      // classify every literal call site of the runner
      const callRe = new RegExp('\\b' + s.runner.replace(/[$]/g, '\\$') + '\\s*\\(', 'g');
      let c;
      while ((c = callRe.exec(text))) {
        // the runner's own `function name(...)` declaration is not a call site
        if (/function\s*$/.test(text.slice(0, c.index))) continue;
        const after = c.index + c[0].length;
        if (text[after] === '[') {
          const rd = readArgv(text, after);
          const toks = argvTokens(rd.argv);
          const verb = verbOf(rd.argv);
          const cls = classifyVerb(verb, toks);
          if (cls === 'write') errors.push(rel + ':' + lineOf(c.index) + ': git write op via runner ' + s.runner + '(["' + verb + '" ...]) bypasses test/helpers/git-hermetic.js');
          else if (cls === 'unknown') errors.push(rel + ':' + lineOf(c.index) + ': unclassifiable git argv via runner ' + s.runner + ' (verb ' + JSON.stringify(verb) + ') - route through the hermetic helper');
        } else {
          errors.push(rel + ':' + lineOf(c.index) + ': runner ' + s.runner + ' called with non-literal argv - unclassifiable; route through the hermetic helper');
        }
      }
      continue;
    }
    const cls = classifyVerb(s.verb, s.toks);
    if (cls === 'write') errors.push(rel + ':' + lineOf(s.at) + ': git write op "' + s.verb + '" bypasses test/helpers/git-hermetic.js (ADR: grill-t29 D-004)');
    else if (cls === 'unknown') errors.push(rel + ':' + lineOf(s.at) + ': unclassifiable git verb ' + JSON.stringify(s.verb) + ' - route through the helper or register the verb class');
  }
  return errors;
}

function main() {
  requireCapabilities('test-git-hermetic');
  const errors = [];
  for (const abs of listTestFiles(path.join(ROOT, TEST_DIR))) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (rel === HELPER_REL.split(path.sep).join('/')) continue; // the registered wrapper itself
    errors.push.apply(errors, scanSource(fs.readFileSync(abs, 'utf8'), rel));
  }
  for (const e of errors) console.error('FAIL: ' + e);
  if (errors.length) process.exit(1);
  console.log('[test-git-hermetic] OK: every git write op in test/**.js routes through the hermetic helper (grill-t29 D-004)');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { scanSource, verbOf, classifyVerb, argvTokens, READ_VERBS, WRITE_VERBS };
