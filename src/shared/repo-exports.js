'use strict';
// src/shared/repo-exports.js - grill-t37 D-004.2/.8: the s2 symbol domain's
// repo-wide export table, MECHANICALLY DERIVED (M4 binding: the table's bound
// generating source is this module - it is re-derived at every evaluation,
// never a hand-maintained list).
//
// Domain: for each .js file under the enumerated v1 dirs (scripts/, src/,
// test/), collect the names that file exports:
//   module.exports = { a, b: c, 'd-e': f }   -> keys a, b, d-e
//   module.exports = { NAME, OTHER }         -> shorthand keys
//   exports.x / module.exports.x = ...       -> x
//   module.exports = Ident / Ident.field     -> Ident (the bound name)
//   export function/const/class NAME / export {a, b as c}
// The result maps name -> [files]. A name exported by MULTIPLE files is
// recorded as ambiguous - the M-D leg treats ambiguity as unresolved
// (D-004: never heuristic-guess the target).
//
// Same-file declarations and imports are collected here too so the leg has
// one mechanical source for the whole s2 domain.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const V1_DIRS = ['scripts', 'src', 'test'];

function walk(dir, out) {
  let names;
  try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const n of names) {
    const p = path.join(dir, n.name);
    if (n.isDirectory()) walk(p, out);
    else if (/\.js$/.test(n.name)) out.push(p);
  }
  return out;
}

function v1Files(root) {
  const files = [];
  for (const d of V1_DIRS) walk(path.join(root || ROOT, d), files);
  return files;
}

// Names bound by a file's own code: declarations + function params +
// import/require bindings. Identifiers are the only names collected - a
// comment's backtick span can only ever name an identifier.
function fileDeclaredNames(text) {
  const names = new Set();
  let m;
  const declRe = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = declRe.exec(text))) names.add(m[1]);
  // destructured bindings: const {a, b: c} = ... / const {a} = require(...)
  const destrRe = /(?:const|let|var)\s*\{([^}]*)\}/g;
  while ((m = destrRe.exec(text))) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const bind = /([A-Za-z_$][\w$]*)\s*$/.exec(seg.split(':').pop() || seg);
      if (bind && bind[1]) names.add(bind[1]);
    }
  }
  // function params are same-file bindings (s2 includes them): function f(a,
  // {b, c}, d), arrow (a, {b}) =>, method m(a) {. Destructured params bind
  // the alias or the property name. Control-flow parens (if/for/while/...) are
  // USES not bindings - restricted to => { preceded-by-identifier forms so a
  // use can never masquerade as a declaration.
  const paramRe = /\(([^()]*)\)\s*=>|function\s*[A-Za-z_$]*\s*\(([^()]*)\)|(?:^|[,;{}\s])([A-Za-z_$][\w$]*)\s*\(([^()]*)\)\s*\{/gm;
  while ((m = paramRe.exec(text))) {
    const inner = m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[4]);
    for (const part of inner.split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      if (/^\{/.test(seg)) {
        for (const sub of seg.replace(/[{}]/g, ' ').split(',')) {
          const bind = /([A-Za-z_$][\w$]*)\s*(?:=\s*[^,]*)?$/.exec(sub.trim().split(':').pop() || '');
          if (bind && bind[1]) names.add(bind[1]);
        }
      } else {
        const bind = /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/.exec(seg);
        if (bind) names.add(bind[1]);
      }
    }
  }
  // single-param arrow without parens: x => ...
  const arrowRe = /(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*=>/g;
  while ((m = arrowRe.exec(text))) names.add(m[1]);
  // object-literal keys are same-file name declarations: a comment citing
  // `segment_anchor` cites a field the file itself declares. Only keys after
  // '{' or ',' count (labels/ternaries never carry that shape).
  const keyRe = /[{,]\s*([A-Za-z_$][\w$]*)\s*:/g;
  while ((m = keyRe.exec(text))) names.add(m[1]);
  // member-access tails (`d.shadow`) and ident-shaped string literals
  // ('segment_anchor') are names the file provably carries - a comment citing
  // one cites a token present in this file, which is same-file membership
  // for existence purposes.
  const memberRe = /\.([A-Za-z_$][\w$]*)/g;
  while ((m = memberRe.exec(text))) names.add(m[1]);
  const strRe = /'([A-Za-z_$][\w$-]*)'|"([A-Za-z_$][\w$-]*)"/g;
  while ((m = strRe.exec(text))) names.add(m[1] || m[2]);
  return names;
}

function fileImportNames(text) {
  const names = new Set();
  let m;
  // const {a, b: c} = require('x')  -> binds a and c (property names AND aliases)
  const reqDestr = /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\s*\(/g;
  while ((m = reqDestr.exec(text))) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const prop = /^\s*([A-Za-z_$][\w$]*)/.exec(seg);
      if (prop) names.add(prop[1]);
      const alias = /:\s*([A-Za-z_$][\w$]*)\s*$/.exec(seg);
      if (alias) names.add(alias[1]);
    }
  }
  // const X = require('x') / const X = require('x').y
  const reqNamed = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(/g;
  while ((m = reqNamed.exec(text))) names.add(m[1]);
  // import X from 'y' / import {a, b as c} from 'y' / import * as X from 'y'
  const impNamed = /^\s*import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/gm;
  while ((m = impNamed.exec(text))) names.add(m[1]);
  const impDestr = /^\s*import\s*\{([^}]*)\}\s*from/gm;
  while ((m = impDestr.exec(text))) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const prop = /^\s*([A-Za-z_$][\w$]*)/.exec(seg);
      if (prop) names.add(prop[1]);
      const alias = /\bas\s+([A-Za-z_$][\w$]*)\s*$/.exec(seg);
      names.add(alias ? alias[1] : prop ? prop[1] : seg);
    }
  }
  const impNs = /\bimport\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g;
  while ((m = impNs.exec(text))) names.add(m[1]);
  return names;
}

// A file's export names (the repo-wide table's per-file contribution).
function fileExportNames(text) {
  const names = new Set();
  let m;
  const meProp = /\b(?:module\.exports|exports)\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g;
  while ((m = meProp.exec(text))) names.add(m[1]);
  // module.exports = { a, b: c, 'd-e': f, ... } - object-literal keys.
  const meObj = /\bmodule\.exports\s*=\s*\{([^]*?)\}\s*;?/g;
  while ((m = meObj.exec(text))) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const key = /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*(?::|$)/.exec(seg);
      if (key) names.add(key[1] || key[2] || key[3]);
    }
  }
  // module.exports = Ident (single bound identifier as the export)
  const meIdent = /\bmodule\.exports\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;
  while ((m = meIdent.exec(text))) names.add(m[1]);
  // ESM: export function/const/class NAME, export {a, b as c}
  const esmDecl = /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = esmDecl.exec(text))) names.add(m[1]);
  const esmList = /\bexport\s*\{([^}]*)\}/g;
  while ((m = esmList.exec(text))) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const as = /\bas\s+([A-Za-z_$][\w$]*)\s*$/.exec(seg);
      names.add(as ? as[1] : seg);
    }
  }
  return names;
}

// buildExportTable(root) -> { names: {name: [relfile,...]}, files: n }
function buildExportTable(root) {
  const files = v1Files(root);
  const names = {};
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    const rel = path.relative(root || ROOT, f).split(path.sep).join('/');
    for (const n of fileExportNames(text)) {
      (names[n] = names[n] || []).push(rel);
    }
  }
  return { names: names, files: files.length };
}

module.exports = { buildExportTable, fileDeclaredNames, fileImportNames, fileExportNames, v1Files, V1_DIRS };
