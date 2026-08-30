#!/usr/bin/env node
// check-ci-wiring.js - ADR-0034 D5 three-face wiring assertion (zero-dependency,
// thin CLI + pure core). Asserts on .github/workflows/ci.yml, line-level:
// (a) exactly one run line invokes "npm run gate:all" (any flag variant);
// (b) no run line directly invokes a gate command enumerated in
//     docs/gates.json - the blocklist is generated from the registry (script
//     tokens + npm invocations + <name>:gate aliases), never hard-coded.
// Full-line comments are not run lines; trailing comments do not hide one;
// multi-line run: | and run: > blocks are scanned. Fail-closed (exit 1).
//
// Usage: node scripts/check-ci-wiring.js [ci.yml path]

'use strict';

const fs = require('fs');
const path = require('path');
const { loadRegistry } = require('./run-gates');

const ROOT = path.join(__dirname, '..');
const CI_REL = path.join('.github', 'workflows', 'ci.yml');

function runLines(yml) {
  const out = [];
  const lines = String(yml).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.charAt(0) === '#') continue;
    const m = /^-?\s*run:\s*(.*)$/.exec(t);
    if (!m) continue;
    if (m[1] === '|' || m[1] === '>') {
      const runIndent = lines[i].search(/\S/);
      let j = i + 1;
      while (j < lines.length) {
        const lt = lines[j];
        if (lt.trim() === '') { j++; continue; }
        if (lt.search(/\S/) <= runIndent) break;
        const inner = lt.trim();
        if (inner.charAt(0) !== '#') out.push(inner);
        j++;
      }
      i = j - 1;
    } else {
      out.push(m[1].trim());
    }
  }
  return out;
}

function blockedTokens(reg, pkg) {
  const set = new Set();
  reg.entries.forEach(function (e) {
    const toks = e.command.split(/\s+/);
    toks.forEach(function (tk) {
      if (/\.js$/.test(tk)) set.add(tk);
    });
    if (toks[0] === 'npm') set.add(toks.slice(0, 2).join(' ')); // e.g. 'npm test'
  });
  const scripts = (pkg && pkg.scripts) || {};
  Object.keys(scripts).forEach(function (k) {
    if (k === 'gate:all') return;
    const toks = scripts[k].split(/\s+/);
    const isGate = reg.entries.some(function (e) {
      const cmd = e.command.split(/\s+/);
      return toks.length <= cmd.length && toks.every(function (t, i) { return t === cmd[i]; });
    });
    if (/:gate$/.test(k) || isGate) set.add('npm run ' + k);
  });
  return Array.from(set);
}

function checkWiring(yml, blocked) {
  const errors = [];
  const runs = runLines(yml);
  const gateAll = runs.filter(function (r) { return /(^|\s)npm run gate:all(\s|$)/.test(r); });
  if (gateAll.length !== 1) {
    errors.push('ci-wiring: expected exactly 1 run line invoking "npm run gate:all", found ' + gateAll.length);
  }
  runs.forEach(function (r) {
    blocked.forEach(function (b) {
      if (r.indexOf(b) !== -1) {
        errors.push('ci-wiring: direct gate invocation in ci.yml run line "' + r + '" hits blocked token "' + b + '" - use npm run gate:all (ADR-0034 D2)');
      }
    });
  });
  return errors;
}

function main(argv) {
  const ciPath = argv[2] || path.join(ROOT, CI_REL);
  const reg = loadRegistry();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const yml = fs.readFileSync(ciPath, 'utf8');
  const errors = checkWiring(yml, blockedTokens(reg, pkg));
  errors.forEach(function (e) { console.error('FAIL: ' + e); });
  if (errors.length) process.exit(1);
  console.log('ci wiring OK (1x gate:all, blocklist ' + blockedTokens(reg, pkg).length + ' tokens from registry)');
  process.exit(0);
}

if (require.main === module) main(process.argv);

module.exports = { runLines, blockedTokens, checkWiring, CI_REL };
