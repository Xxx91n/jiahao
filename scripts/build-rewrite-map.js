#!/usr/bin/env node
'use strict';
// scripts/build-rewrite-map.js \u2014 ADR-0074 D-B/D-C: generate docs/rewrite-map.json
// Spec: docs/rewrite-map-generator-spec.md. Zero-dep (stdlib + git subprocess).
//
// The sanitized-history publish (ADR-0074 D-A) rewrote the tip region of the
// published line; pre-rewrite objects are retained only on local refs. Doc
// citations of pre-rewrite SHAs therefore dangle against origin/main. This map
// is the single translation point: every hex citation in tracked docs gets a
// class \u2014 rewritten | local-only | published-unchanged \u2014 and every old-side
// commit gets its new-side counterpart (or null).
//
// Old-side discovery: a gb-local/* ref (gitbutler/* internals excluded) is a
// retained pre-purge line when (a) it carries commits the published side
// lacks AND (b) it does not contain any published-side rewritten commit or
// the published tip. Post-purge working branches descend from those objects
// even when they predate the current tip (the tip test alone goes stale the
// moment origin/main advances past the rewrite region) or carry unpublished
// work of their own. The prior map's commits[].new + published_tip supply
// the anchor; the first generation falls back to the tip test. The rule is
// mechanical, not a name convention.
//
// Modes: default writes the map; --check regenerates and diffs (generated_at
// excluded); --verify re-derives each row's truth from git (subjects, empties,
// boundary trees) and asserts doc_refs completeness. The map file itself is
// excluded from the citation scan (self-reference would make regen unstable).
// --published-only asserts only the published-side subset (committed-map
// internal consistency: citation coverage, class enum, count self-consistency,
// published-side ancestry) - it needs no old-side refs and runs identically
// on a fresh clone. Clone-degradability contract (grill-t25): old-side refs
// are a maintainer-only asset; when none exist --check/--verify/default-write
// exit 2 UNVERIFIABLE, never 1 - absence is a capability negative, not a red
// map.
//
// ADR-0089 (grill-t32) supersedes the classification input surface: classes
// derive from four declared facts - pair/removed tables, pinned published_tip
// ancestry, cat-file object existence, orphan-cites registry membership.
// Ref topology is demoted to the per-row `qualifiers.reachable_via` field
// (written, displayed, never judged). --check compares classes/pairs/
// resolved_to/counts only; qualifiers are exempt but weakly consistency-
// checked. `unresolved` rows (absent AND unregistered) are hard red.
// Injectable seams for the acceptance battery: opts.exec (low-level git call
// failures only) + opts.now (clock) + opts.root (fixture repos).

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { requireCapabilities, exitUnverifiable } = require('../src/shared/capability');
const { NO_REPLACE_ENV } = require('./git-facade');
const oc = require('./orphan-cites');

const ROOT = path.join(__dirname, '..');
const OUT_REL = path.join('docs', 'rewrite-map.json');
const SELF = 'docs/rewrite-map.json';
// The orphan-cites registry is likewise exempt from the citation scan: its
// hex literals are internal payload fields (cited_sha, snapshot.parents,
// successor_sha), not claims needing adjudication - scanning them would
// recurse the parent's unreachable ancestor chain into the registry.
const REGISTRY_INPUT = 'docs/governance/orphan-cites.json';
const HEX_RE = /(^|[^0-9a-zA-Z_])([0-9a-f]{7,40})(?![0-9a-zA-Z_])/g;
const DOC_PATH_RE = /^(docs\/|README\.md$|AGENTS\.md$|CONTEXT\.md$|\.scratch\/)/;
const DOC_EXT_RE = /\.(md|json|txt|patch|jsonl)$/;

// ADR-0089 D-006 seam: every git call on this path goes through git()/gitOk()
// which dispatch to the injected executor when tests set one, and always run
// under GIT_NO_REPLACE_OBJECTS=1 (replace semantics never enter declared
// facts - ADR-0089 D-D). _root moves git+fs reads together for fixture repos.
let _execOverride = null; // fn(args, opts) -> stdout string; throw on non-zero
let _root = ROOT;
function git(args, opts) {
  if (_execOverride) return String(_execOverride(args, opts));
  return execFileSync('git', args, Object.assign({ cwd: _root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: NO_REPLACE_ENV }, opts || {}));
}
function gitOk(args) {
  try { git(args); return true; } catch (e) { return false; }
}

function revListObjects(ref) {
  const out = git(['rev-list', '--objects', ref]);
  return out.split('\n').map(function (s) { return s.split(' ')[0].trim(); }).filter(Boolean);
}
// %H <US> %s <US> %B <RS> per record \u2014 full message is the join key on
// subject collisions (spec: GitButler rewrites preserve messages).
function logMeta(ref) {
  const out = git(['log', '--format=%H%x1f%s%x1f%B%x1e', ref]);
  const rows = [];
  for (const rec of out.split('\x1e')) {
    const t = rec.replace(/^\s+/, '');
    if (!t) continue;
    const p = t.split('\x1f');
    if (p.length < 3) continue;
    rows.push({ sha: p[0], subject: p[1], message: p.slice(2).join('\x1f').trim() });
  }
  return rows;
}

function discoverOldRefs(newRef, publishedSide) {
  const anchors = (publishedSide && publishedSide.length) ? publishedSide : [newRef];
  const refs = git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/gb-local/'])
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
    .filter(function (r) { return r.indexOf('gitbutler') === -1; });
  return refs.filter(function (r) {
    // (a) carries objects the published side lacks - a ref fully contained
    // in published history has nothing to translate.
    const uniq = git(['rev-list', '--count', newRef + '..' + r]).trim();
    if (uniq === '0') return false;
    // (b) does not descend from a published-side object - post-purge
    // working branches do, even when they also carry unpublished commits.
    for (const s of anchors) {
      if (gitOk(['merge-base', '--is-ancestor', s, r])) return false;
    }
    return true;
  });
}

function isEmptyCommit(sha) {
  // diff-tree with no output = empty commit (first-parent diff).
  const out = git(['diff-tree', '--no-commit-id', '--name-only', '-r', sha]);
  return out.trim() === '';
}

// grill-t30 D-004: root-parameterized variants so the per-commit freshness
// leg can assert inside fixture repos / arbitrary checkouts, never silently
// against the ambient worktree. Honors the same _execOverride seam as git()
// so injected executors see every child-process call on this path.
function gitAt(root, args) {
  if (_execOverride) return String(_execOverride(args, { cwd: root }));
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: NO_REPLACE_ENV }).trim();
}
function gitOkAt(root, args) {
  try { gitAt(root, args); return true; } catch (e) { return false; }
}
function isEmptyCommitAt(root, sha) {
  return gitAt(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', sha]).trim() === '';
}

// Doc citation token scan (the map file itself excluded - generated, not a
// source). Enumeration is the UNION of index + committed tree (the F-1
// lesson: GitButler's virtual index lags HEAD by committed files, so an
// index-only scan silently misses tracked docs). Untracked worktree files
// are deliberately NOT scanned - a doc joins the tracked surface only via
// a commit, so the map regen that follows the doc commit picks it up.
// Returns raw occurrences [{file, line (1-based), sha}]: classification
// needs the old-side object sets, but --published-only needs only this raw
// coverage set, so the scan is shared and the class pass is not.
function scanDocTokens() {
  const files = Array.from(new Set(
    git(['ls-files']).split('\n').concat(git(['ls-tree', '-r', 'HEAD', '--name-only']).split('\n'))
  )).map(function (x) { return x.trim(); }).filter(Boolean)
    .filter(function (f) { return f !== SELF && f !== REGISTRY_INPUT && DOC_PATH_RE.test(f) && DOC_EXT_RE.test(f); }).sort();
  const out = [];
  for (const f of files) {
    const abs = path.join(_root, f.split('/').join(path.sep));
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { continue; }
    const lines = text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      HEX_RE.lastIndex = 0;
      let m;
      while ((m = HEX_RE.exec(lines[li]))) {
        const token = m[2];
        if (!/[a-f]/.test(token)) continue;
        out.push({ file: f, line: li + 1, sha: token });
      }
    }
  }
  return out;
}

// grill-t30 D-004 (E-17 leg): the same token scan evaluated inside an
// arbitrary commit's tree — `git grep` at <ref> over the registered doc
// pathspec, then the identical HEX_RE/[a-f] predicate client-side. Never
// touches the worktree/index: the leg's verdict must be a pure function of
// the commit under test (tree-internal inputs only). The map file itself is
// excluded here exactly as above.
function scanDocTokensAt(root, ref) {
  let out;
  try {
    out = gitAt(root, ['-c', 'core.quotepath=false', 'grep', '-a', '-n', '-E', '-e', '[0-9a-f]{7,40}', ref, '--', 'docs', '.scratch', 'README.md', 'AGENTS.md', 'CONTEXT.md']);
  } catch (e) {
    if (e.status === 1 || e.code === 1) return []; // no matches at this ref
    throw e;
  }
  const prefix = String(ref) + ':';
  const rows = [];
  for (const line of out.split('\n')) {
    if (!line) continue;
    if (!line.startsWith(prefix)) throw new Error('git grep row lacks the ref prefix at ' + ref + ': ' + line.slice(0, 80));
    const m = /^(.*?):(\d+):([\s\S]*)$/.exec(line.slice(prefix.length));
    if (!m) throw new Error('unparseable git grep row at ' + ref + ': ' + line.slice(0, 80));
    const f = m[1], li = Number(m[2]), text = m[3];
    if (f === SELF || f === REGISTRY_INPUT || !DOC_PATH_RE.test(f) || !DOC_EXT_RE.test(f)) continue;
    HEX_RE.lastIndex = 0;
    let hm;
    while ((hm = HEX_RE.exec(text))) {
      const token = hm[2];
      if (!/[a-f]/.test(token)) continue;
      rows.push({ file: f, line: li, sha: token });
    }
  }
  return rows;
}

// grill-t35 D-005: the BATCHED form of scanDocTokensAt. One `git grep` per
// CHURN is the difference between a leg that runs in CI and a leg that times
// out - the t30 per-commit form spawned one full-tree grep per claim commit,
// which is why the public run reported UNVERIFIABLE rather than pass or fail.
// git grep accepts many tree-ish arguments and prefixes every hit with the rev
// it came from, so N commits cost ONE process and one pass over the object
// store.
//
// Returns Map<sha, Array<{file,line,sha}>>. Identical row semantics to
// scanDocTokensAt - same HEX_RE, same [a-f] predicate, same SELF/REGISTRY_INPUT
// and doc-path exclusions - so a batched row and a single-ref row are the same
// object and interchangeable downstream.
//
// Trees are chunked: a single argv can get long on a big line, and one huge
// grep would trade a timeout for an E2BIG. CHUNK commits per process.
function scanDocTokensAtMany(root, refs) {
  const CHUNK = 8;
  const out = new Map();
  const list = refs.filter(Boolean);
  for (const r of list) if (!out.has(r)) out.set(r, []);
  for (let i = 0; i < list.length; i += CHUNK) {
    const chunk = list.slice(i, i + CHUNK);
    // Buffer sizing is load-bearing, not decoration. Each chunk greps K full
    // trees and every hex citation line in each is emitted, so the output is
    // roughly K * (citations-per-tree). At K=24 over this repo that overflowed
    // the buffer (ENOBUFS) and killed the leg. CHUNK is sized so the worst
    // case stays well inside the budget, and the caller's ceiling is derived
    // from the chunk size rather than fixed by hope.
    const r = spawnSync('git',
      ['-c', 'core.quotepath=false', 'grep', '-a', '-n', '-E', '-e', '[0-9a-f]{7,40}']
        .concat(chunk, ['--', 'docs', '.scratch', 'README.md', 'AGENTS.md', 'CONTEXT.md']),
      { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
    if (r.error) throw r.error;
    if (r.status !== 0 && r.status !== 1) {
      throw new Error('git grep failed at chunk ' + i + ' (status ' + r.status + '): ' + String(r.stderr || '').slice(0, 200));
    }
    if (r.status === 1) continue; // no matches in this chunk
    for (const line of String(r.stdout || '').split('\n')) {
      if (!line) continue;
      const colon = line.indexOf(':');
      if (colon < 0) throw new Error('git grep row lacks a rev prefix: ' + line.slice(0, 80));
      const rev = line.slice(0, colon);
      if (!out.has(rev)) continue;
      const rest = line.slice(colon + 1);
      const m = /^(.*?):(\d+):([\s\S]*)$/.exec(rest);
      if (!m) throw new Error('unparseable git grep row at ' + rev + ': ' + line.slice(0, 80));
      const f = m[1], li = Number(m[2]), body = m[3];
      if (f === SELF || f === REGISTRY_INPUT || !DOC_PATH_RE.test(f) || !DOC_EXT_RE.test(f)) continue;
      HEX_RE.lastIndex = 0;
      let hm;
      while ((hm = HEX_RE.exec(body))) {
        const token = hm[2];
        if (!/[a-f]/.test(token)) continue;
        out.get(rev).push({ file: f, line: li, sha: token });
      }
    }
  }
  return out;
}

// ---- ADR-0089 D-006 injectable seams -------------------------------------
// opts.exec(args, opts) -> stdout string, throws on non-zero: the ONLY mock
// surface; tests delegate everything they do not fail to real git.
// opts.now -> ISO timestamp string: ladder/exists_at clock injection.
// opts.root: fixture-repo root (git cwd + doc-scan + registry load all move).
function withSeams(opts, body) {
  const o = opts || {};
  const prevExec = _execOverride, prevRoot = _root;
  if (o.exec) _execOverride = o.exec;
  if (o.root) _root = o.root;
  try { return body(); } finally { _execOverride = prevExec; _root = prevRoot; }
}

// Batch object facts for every unique cited token in one cat-file process
// (declared fact 3: existence). Returns Map token -> {status:'ok',sha,type,
// size} | {status:'absent'} | {status:'ambiguous'}. Ambiguous input lines are
// re-resolved individually so 'ambiguous' is certain, never guessed.
function batchObjectFacts(tokens) {
  const facts = new Map();
  let out;
  try {
    out = git(['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], { input: tokens.join('\n') + '\n' });
  } catch (e) {
    out = String(e.stdout || '');
  }
  const lines = String(out).split('\n');
  const needsSolo = [];
  for (let i = 0; i < tokens.length; i++) {
    const line = (lines[i] || '').trim();
    const m = /^([0-9a-f]{40}) (\S+) (\d+)$/.exec(line);
    if (m) facts.set(tokens[i], { status: 'ok', sha: m[1], type: m[2], size: parseInt(m[3], 10) });
    else if (/ missing$/.test(line)) facts.set(tokens[i], { status: 'absent' });
    else needsSolo.push(tokens[i]);
  }
  for (const t of needsSolo) {
    try {
      const sha = git(['rev-parse', '--verify', '--quiet', t + '^{object}']).trim();
      const ty = git(['cat-file', '-t', sha]).trim();
      const sz = parseInt(git(['cat-file', '-s', sha]).trim(), 10);
      facts.set(t, { status: 'ok', sha: sha, type: ty, size: sz });
    } catch (e) {
      if (/ambiguous/i.test(String(e.stderr || e.message))) facts.set(t, { status: 'ambiguous' });
      else facts.set(t, { status: 'absent' });
    }
  }
  return facts;
}

// committer/tagger timestamp for commit/tag objects (one spawn each - the
// intrinsic mtime; blob/tree objects have none and get loose-file mtime or
// null). Snapshot fields ride along for the registry-facing record.
function commitMeta(sha) {
  const text = git(['cat-file', 'commit', sha]);
  const head = text.split('\n\n')[0].split('\n');
  const f = function (k) { return head.filter(function (l) { return l.indexOf(k + ' ') === 0; }).map(function (l) { return l.slice(k.length + 1); }); };
  const cts = />\s*(\d+)(\s|$)/.exec(f('committer')[0] || '');
  return {
    subject: text.split('\n\n').slice(1).join('\n\n').split('\n')[0] || null,
    committer_ts: cts ? parseInt(cts[1], 10) : null,
  };
}
function objectMtime(sha, type) {
  if (type === 'commit') return commitMeta(sha).committer_ts;
  if (type === 'tag') {
    const text = git(['cat-file', 'tag', sha]);
    const m = /tagger\s.*>\s+(\d+)/.exec(text);
    return m ? parseInt(m[1], 10) : null;
  }
  const loose = path.join(_root, '.git', 'objects', sha.slice(0, 2), sha.slice(2));
  try { return Math.floor(fs.statSync(loose).mtimeMs / 1000); } catch (e) { return null; }
}

function build(oldRefs, newRef, opts) {
  return withSeams(opts, function () { return buildInner(oldRefs, newRef, opts || {}); });
}
function buildInner(oldRefs, newRef, o) {
  const now = typeof o.now === 'function' ? o.now() : (o.now || new Date().toISOString());
  const oldLog = [];
  const seenOld = {};
  for (const r of oldRefs) {
    for (const m of logMeta(r)) { if (!seenOld[m.sha]) { seenOld[m.sha] = 1; oldLog.push(m); } }
  }
  const newLog = logMeta(newRef);
  const oldSet = {};
  oldLog.forEach(function (m) { oldSet[m.sha] = 1; });

  // join: old commits absent from the new side pair with new-side commits by
  // subject (then full message). Ambiguity is a loud failure, never a guess.
  const unionOrder = git(['rev-list'].concat(oldRefs).concat(['--not', newRef]))
    .split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  const metaBySha = {};
  oldLog.forEach(function (m) { metaBySha[m.sha] = m; });
  const oldOnly = unionOrder.map(function (sha) { return metaBySha[sha]; }).filter(Boolean);
  const newOnly = newLog.filter(function (m) { return !oldSet[m.sha]; });
  const newBySubject = {};
  newOnly.forEach(function (m) { (newBySubject[m.subject] = newBySubject[m.subject] || []).push(m); });

  const commits = [];
  const pairedNew = {};
  const ambiguous = [];
  const removed = [];
  for (const o of oldOnly) {
    let cand = (newBySubject[o.subject] || []).filter(function (n) { return !pairedNew[n.sha]; });
    if (cand.length > 1) {
      const byMsg = cand.filter(function (n) { return n.message === o.message; });
      if (byMsg.length === 1) cand = byMsg;
    }
    if (cand.length > 1) { ambiguous.push(o.sha); continue; }
    if (cand.length === 0) { removed.push(o); continue; }
    pairedNew[cand[0].sha] = 1;
    commits.push({ old: o.sha, new: cand[0].sha, subject: o.subject });
  }
  if (ambiguous.length) {
    throw new Error('ambiguous message alignment for old commits: ' + ambiguous.join(', '));
  }
  const publishedOnly = newOnly.filter(function (n) { return !pairedNew[n.sha]; })
    .map(function (n) { return { new: n.sha, subject: n.subject }; });

  for (const c of commits) { if (isEmptyCommit(c.new)) c.empty = true; }
  // rev-list order is topological (newest first); keep rows in that order for
  // byte-stable output. commits[0] is the tip-most rewritten pair \u2014 the
  // rewrite boundary counterpart of the retained old tip.
  const oldOrder = {};
  oldOnly.forEach(function (m, i) { oldOrder[m.sha] = i; });
  commits.sort(function (a, b) { return oldOrder[a.old] - oldOrder[b.old]; });

  // ---- ADR-0089 declared-facts classification ----------------------------
  // fact 1: the pair/removed tables (commits/removed, built above).
  const oldPairMap = {};
  commits.forEach(function (c) { oldPairMap[c.old] = c.new; });
  const removedSet = {};
  removed.forEach(function (m) { removedSet[m.sha] = 1; });
  // fact 2: the pinned published_tip ancestry set.
  const publishedObjects = new Set(revListObjects(newRef));
  // fact 4: orphan-cites registry membership (load fails = fail-closed).
  const registry = oc.loadRegistry(_root).reg;
  const regErrors = oc.validateRegistry(registry);
  if (regErrors.length) throw new Error('orphan-cites registry fails self-consistency:\n' + regErrors.join('\n'));
  // fact 3: object existence, resolved in ONE batched cat-file process.
  const occurrences = scanDocTokens();
  const uniqTokens = Array.from(new Set(occurrences.map(function (x) { return x.sha; })));
  const facts = batchObjectFacts(uniqTokens);

  // qualifier input only: reachable_via over display refs (per-ref object
  // sets cached on this run - written and displayed, never judged).
  const displayRefs = git(['for-each-ref', '--format=%(refname)']).split('\n')
    .map(function (s) { return s.trim(); }).filter(Boolean)
    .filter(function (r) { return r.indexOf('gitbutler') === -1 && r.indexOf('refs/replace/') !== 0 });
  const refObjCache = new Map();
  const objectsOf = function (ref) {
    if (!refObjCache.has(ref)) refObjCache.set(ref, new Set(revListObjects(ref)));
    return refObjCache.get(ref);
  };
  const reachableVia = function (sha) {
    const via = [];
    for (const r of displayRefs) {
      try { if (objectsOf(r).has(sha)) via.push(r); } catch (e) { /* a ref failing enumeration is not reachability */ }
    }
    return via;
  };

  const nowTs = Date.parse(now) / 1000;
  const mtimeCache = new Map();
  const docRefs = [];
  const problems = [];
  const warnings = [];
  for (const occ of occurrences) {
    const f = occ.file, li = occ.line, token = occ.sha;
    const fact = facts.get(token);
    if (fact && fact.status === 'ambiguous') { problems.push(f + ':' + li + ' ambiguous sha ' + token + ' (fail-closed)'); continue; }
    let ent = null;
    try { ent = oc.entryForToken(registry, token); }
    catch (e) { problems.push(f + ':' + li + ' ' + e.message); continue; }
    const orphanedAdj = ent !== null && ent.disposition === 'orphaned';
    const sha40 = fact && fact.status === 'ok' ? fact.sha : null;
    let cls, resolvedTo = null, label;
    if (sha40 && oldPairMap[sha40]) { cls = 'rewritten'; resolvedTo = oldPairMap[sha40]; }
    else if (sha40 && publishedObjects.has(sha40)) { cls = 'published-unchanged'; }
    else if (sha40 && removedSet[sha40]) { cls = 'local-only'; label = 'old-side commit (removed by purge)'; }
    else if (orphanedAdj) { cls = 'orphaned-cite'; }
    else if (sha40) { cls = 'local-only'; label = fact.type === 'commit' ? 'local commit' : 'local object'; }
    else { cls = 'unresolved'; }
    const via = sha40 ? reachableVia(sha40) : [];
    let mt = null;
    if (sha40) { if (!mtimeCache.has(sha40)) mtimeCache.set(sha40, objectMtime(sha40, fact.type)); mt = mtimeCache.get(sha40); }
    // stage-2 (ADR-0089 D-E + D-007): exists + unreachable + unregistered +
    // over-age -> map warning channel ("register while alive"); the leg owns
    // stage 3. An unageable object (no object mtime - packed blob/tree) is
    // past stage 1 by construction: it warns at first observation, and the
    // leg's stage-3 clock for it runs on qualifiers.exists_at.
    if (sha40 && cls === 'local-only' && !ent && via.length === 0) {
      const unageable = mt === null;
      const ageDays = unageable ? null : (nowTs - mt) / 86400;
      if (unageable || ageDays > oc.ORPHAN_AGE_DAYS) {
        warnings.push({ sha: sha40, file: f, line: li, age_days: unageable ? null : Math.floor(ageDays), kind: 'orphan-window-open', unageable: unageable });
      }
    }
    docRefs.push({
      file: f, line: li, sha: token, 'class': cls, resolved_to: resolvedTo,
      label: label,
      qualifiers: {
        exists_at: now,
        object_mtime: mt,
        object_type: sha40 ? fact.type : null,
        object_size: sha40 ? fact.size : null,
        reachable_via: via,
      },
    });
  }
  if (problems.length) throw new Error('unresolvable citations:\n' + problems.join('\n'));

  const newest = commits.length ? commits[0] : null;
  // No old side at all (clone-side / fixtures): there is no fork point to
  // pin - boundary fields stay null and `same` is empty by construction.
  const oldTip = newest ? newest.old : (oldRefs.length ? git(['rev-parse', oldRefs[0]]).trim() : null);
  const base = oldTip ? git(['merge-base', oldTip, newRef]).trim() : null;

  // Spec: commits present on both sides with the same SHA are emitted as
  // `same` rows (explicit is auditable; ~all commits at/below the shared
  // base). Removed pairs carry an explicit `new: null` rather than a
  // separate ad-hoc shape.
  const sameRaw = base ? git(['log', '--format=%H%x00%s', base]).trim() : '';
  const same = sameRaw ? sameRaw.split('\n').map(function (l) { const z = l.indexOf('\u0000'); return { sha: l.slice(0, z), subject: l.slice(z + 1) }; }) : [];

  return {
    schema_version: 2,
    _doc: 'ADR-0074 D-C + ADR-0089: append-only, tool-generated single translation point. Classes derive from declared facts (pair/removed tables, pinned published_tip ancestry, cat-file existence, orphan-cites registry); ref topology lives only in qualifiers.reachable_via. Regenerate: node scripts/build-rewrite-map.js; verify: --check.',
    generated_by: 'scripts/build-rewrite-map.js',
    generated_at: new Date().toISOString(),
    published_tip: git(['rev-parse', newRef]).trim(),
    boundary: { shared_base: base, old_tip: oldTip, new_counterpart: newest ? newest.new : null },
    sides: { old_refs: oldRefs, new_refs: [newRef] },
    counts: {
      commits: commits.length,
      published_only: publishedOnly.length,
      removed: removed.length,
      same: same.length,
      doc_refs: docRefs.length,
      doc_refs_by_class: {
        rewritten: docRefs.filter(function (d) { return d['class'] === 'rewritten'; }).length,
        'local-only': docRefs.filter(function (d) { return d['class'] === 'local-only'; }).length,
        'published-unchanged': docRefs.filter(function (d) { return d['class'] === 'published-unchanged'; }).length,
        'orphaned-cite': docRefs.filter(function (d) { return d['class'] === 'orphaned-cite'; }).length,
        'unresolved': docRefs.filter(function (d) { return d['class'] === 'unresolved'; }).length
      }
    },
    warnings: warnings,
    commits: commits,
    removed: removed.map(function (m) { return { old: m.sha, new: null, subject: m.subject }; }),
    published_only: publishedOnly,
    same: same,
    doc_refs: docRefs.map(function (d) {
      const r = { file: d.file, line: d.line, sha: d.sha, 'class': d['class'], resolved_to: d.resolved_to };
      if (d.label) r.label = d.label;
      r.qualifiers = d.qualifiers;
      return r;
    })
  };
}

// doc_refs equality domain (ADR-0089 D-F): qualifiers are exempt - strip them.
function refFacts(rows) {
  return (rows || []).map(function (d) {
    const r = { file: d.file, line: d.line, sha: d.sha, 'class': d['class'], resolved_to: d.resolved_to };
    if (d.label) r.label = d.label;
    return r;
  });
}

function verify(map, opts) {
  return withSeams(opts, function () { return verifyInner(map, opts); });
}
function verifyInner(map, opts) {
  const errs = [];
  const newRef = map.sides.new_refs[0];
  for (const c of map.commits) {
    const subj = git(['log', '--format=%s', '-1', c.old]).trim();
    if (subj !== c.subject) errs.push('subject drift ' + c.old);
    if (!gitOk(['merge-base', '--is-ancestor', c.new, newRef])) errs.push('rewritten target not on ' + newRef + ': ' + c.new);
    if (c.empty === true && !isEmptyCommit(c.new)) errs.push('empty claim fails re-derivation: ' + c.new);
    if (c.empty !== true && isEmptyCommit(c.new)) errs.push('empty flag missing: ' + c.new);
  }
  const reBase = git(['merge-base', map.boundary.old_tip, newRef]).trim();
  const reSame = git(['rev-list', reBase]).trim().split('\n').filter(Boolean).sort();
  const mapSame = (map.same || []).map(function (s) { return s.sha; }).sort();
  if (JSON.stringify(mapSame) !== JSON.stringify(reSame)) errs.push('same list re-derivation differs');
  for (const r of map.removed || []) {
    if (gitOk(['merge-base', '--is-ancestor', r.old, newRef])) errs.push('removed commit is on published side: ' + r.old);
  }
  if (map.boundary && map.boundary.new_counterpart) {
    const d = git(['diff', '--name-only', map.boundary.old_tip, map.boundary.new_counterpart]);
    if (d.trim() !== '') errs.push('boundary trees differ: ' + d.trim().split('\n').join(', '));
  }
  const re = build(map.sides.old_refs, newRef, opts);
  if (JSON.stringify(refFacts(map.doc_refs)) !== JSON.stringify(refFacts(re.doc_refs))) errs.push('doc_refs re-derivation differs');
  if (JSON.stringify(map.commits) !== JSON.stringify(re.commits)) errs.push('commits re-derivation differs');
  return errs;
}

// --published-only (grill-t25 clone-degradability contract): the
// clone-verifiable subset of the map contract. Old-side refs never publish,
// so a fresh clone cannot re-derive the old-side join; what it CAN prove is
// (a) citation coverage - every hex citation in tracked docs appears in
// doc_refs, (b) class enum validity, and (c) count + published-side-ancestry
// self-consistency. Every check below derives from published objects alone.
// opts.occurrences (grill-t30 D-004): an externally-supplied citation set
// replaces the worktree/index scan - the per-commit freshness leg passes the
// citation set of the commit under test, keeping every input tree-internal.
function verifyPublishedOnly(map, newRef, opts) {
  const errs = [];
  const HEX40 = /^[0-9a-f]{40}$/;
  // ADR-0089 D-B: five-value class enum (v2 maps); v1 maps carry the 3-subset.
  const CLASSES = ['rewritten', 'local-only', 'published-unchanged', 'orphaned-cite', 'unresolved'];
  const vRoot = (opts && opts.root) || ROOT;
  const anc = function (sha, ref) { return gitOkAt(vRoot, ['merge-base', '--is-ancestor', sha, ref]); };
  const isEmpty = function (sha) { return isEmptyCommitAt(vRoot, sha); };

  if (map.schema_version !== 1 && map.schema_version !== 2) errs.push('schema_version ' + map.schema_version + ' outside {1,2}');
  if (map.generated_by !== 'scripts/build-rewrite-map.js') errs.push('generated_by drift: ' + map.generated_by);
  const b = map.boundary || {};
  for (const k of ['shared_base', 'old_tip', 'new_counterpart']) {
    if (!HEX40.test(b[k] || '')) errs.push('boundary.' + k + ' is not a full sha');
  }
  if (HEX40.test(b.shared_base || '') && !anc(b.shared_base, newRef)) errs.push('boundary.shared_base not on ' + newRef);
  if (HEX40.test(b.new_counterpart || '') && !anc(b.new_counterpart, newRef)) errs.push('boundary.new_counterpart not on ' + newRef);
  if (!HEX40.test(map.published_tip || '')) errs.push('published_tip is not a full sha');
  else if (!anc(map.published_tip, newRef)) errs.push('published_tip not on ' + newRef);
  if (opts && opts.commitBound) {
    // Per-commit port (grill-t30 D-004): newRef is the commit under test, not
    // a live refname - a map committed inside a historical tree names a REF
    // ('origin/main'), which is ambient state, not tree-internal truth. The
    // assertion degrades to shape-only; object anchoring is still proven by
    // the published_tip/boundary ancestry checks against the commit.
    if (!Array.isArray(map.sides && map.sides.new_refs) || map.sides.new_refs.length === 0) {
      errs.push('sides.new_refs is missing or empty');
    }
  } else if (!Array.isArray(map.sides && map.sides.new_refs) || map.sides.new_refs.indexOf(newRef) === -1) {
    errs.push('sides.new_refs does not name ' + newRef);
  }
  for (const c of map.commits || []) {
    if (!HEX40.test(c.old || '') || !HEX40.test(c.new || '')) { errs.push('commit row shape: ' + JSON.stringify(c).slice(0, 80)); continue; }
    if (!anc(c.new, newRef)) errs.push('commits[].new off published line: ' + c.new);
    if (c.empty === true && !isEmpty(c.new)) errs.push('empty claim fails on published side: ' + c.new);
    if (c.empty !== true && isEmpty(c.new)) errs.push('empty flag missing on published side: ' + c.new);
  }
  for (const sm of map.same || []) {
    if (!HEX40.test(sm.sha || '')) errs.push('same row shape: ' + JSON.stringify(sm).slice(0, 80));
    else if (HEX40.test(b.shared_base || '') && !anc(sm.sha, b.shared_base)) errs.push('same[] not under shared_base: ' + sm.sha);
  }
  for (const p of map.published_only || []) {
    if (!HEX40.test(p.new || '') || !anc(p.new, newRef)) errs.push('published_only[].new off line: ' + p.new);
  }
  for (const r of map.removed || []) {
    if (HEX40.test(r.old || '') && anc(r.old, newRef)) errs.push('removed commit is on published side: ' + r.old);
  }
  const docRefs = map.doc_refs || [];
  for (const d of docRefs) {
    if (CLASSES.indexOf(d['class']) === -1) { errs.push('doc_refs class outside enum: ' + d['class']); continue; }
    if (d['class'] === 'rewritten' && (!HEX40.test(d.resolved_to || '') || !anc(d.resolved_to, newRef))) {
      errs.push('doc_refs rewritten target off published line: ' + d.sha + ' -> ' + d.resolved_to);
    }
  }
  // citation coverage: re-scan the tracked doc surface; the map must name
  // every hex citation. Classification is the old-side part and is
  // deliberately not re-derived here - coverage alone is clone-verifiable.
  const live = ((opts && opts.occurrences) || scanDocTokens()).map(function (o) { return o.file + ':' + o.line + ':' + o.sha; }).sort();
  const recorded = docRefs.map(function (d) { return d.file + ':' + d.line + ':' + d.sha; }).sort();
  if (JSON.stringify(live) !== JSON.stringify(recorded)) {
    const have = {}; recorded.forEach(function (k) { have[k] = 1; });
    const missing = live.filter(function (k) { return !have[k]; });
    const liveSet = {}; live.forEach(function (k) { liveSet[k] = 1; });
    // Commit-bound mode (grill-t30 D-004): the map is generated against the
    // whole GitButler workspace union, so a lane commit's tree legitimately
    // omits files whose cites are recorded in the same committed map
    // (parallel-lane artifacts). Extras are violations only when the cited
    // file IS present in the commit's tree - a phantom row on a live file is
    // drift; a row for an absent file is non-applicable at this commit.
    const treeFiles = (opts && opts.treeFiles) || null;
    const phantom = treeFiles
      ? docRefs.filter(function (d) { return !liveSet[d.file + ':' + d.line + ':' + d.sha] && treeFiles.has(d.file); }).map(function (d) { return d.file + ':' + d.line + ':' + d.sha; })
      : recorded.filter(function (k) { return !liveSet[k]; });
    if (missing.length) errs.push('doc citation coverage differs (first missing: ' + missing.slice(0, 5).join(', ') + ')');
    if (phantom.length) errs.push('map records cites absent from the commit tree on live files (first: ' + phantom.slice(0, 5).join(', ') + ')');
  }
  const counts = map.counts || {};
  const expect = {
    commits: (map.commits || []).length,
    published_only: (map.published_only || []).length,
    removed: (map.removed || []).length,
    same: (map.same || []).length,
    doc_refs: docRefs.length
  };
  for (const k in expect) if (counts[k] !== expect[k]) errs.push('counts.' + k + ' = ' + counts[k] + ', recomputes to ' + expect[k]);
  const byClass = counts.doc_refs_by_class || {};
  for (const c of CLASSES) {
    const n = docRefs.filter(function (d) { return d['class'] === c; }).length;
    if (n > 0 && byClass[c] !== n) errs.push('counts.doc_refs_by_class.' + c + ' = ' + byClass[c] + ', recomputes to ' + n);
  }

  // ---- ADR-0089 D-H: clone-computable registry consistency + fail-closed --
  // unresolved rows are hard red (absent AND unregistered must be disclosed,
  // never carried silently). orphaned-cite rows must resolve to a committed
  // registry entry adjudicating 'orphaned'. Both derive from tracked files.
  const unresolved = docRefs.filter(function (d) { return d['class'] === 'unresolved'; });
  if (unresolved.length) {
    errs.push(unresolved.length + ' unresolved doc citation(s) - absent from the object DB and unregistered; disclose via orphan-cites.js (first: ' + unresolved.slice(0, 3).map(function (d) { return d.file + ':' + d.line + ':' + d.sha; }).join(', ') + ')');
  }
  const orphanRows = docRefs.filter(function (d) { return d['class'] === 'orphaned-cite'; });
  if (orphanRows.length) {
    // Registry source is tree-internal when commit-bound (the leg evaluates
    // historical commits), else the worktree file.
    //
    // opts.registryFromWorktree (grill-t35 D-005): a caller judging a
    // WORKING-TREE map with commitBound ancestry must read the WORKING-TREE
    // registry too. Without this seam the two halves disagree - the map
    // carries orphaned-cite rows admitted by a backfill that is not committed
    // yet, while the registry read goes to the older committed revision, and
    // every one of those rows is reported as 'has no registry entry'. The
    // registry must come from the SAME tree as the map it adjudicates.
    let regText = null;
    if (opts && opts.commitBound && !opts.registryFromWorktree) {
      try { regText = gitAt(vRoot, ['show', newRef + ':docs/governance/orphan-cites.json']); } catch (e) { regText = null; }
    } else {
      const rp = path.join(vRoot, 'docs', 'governance', 'orphan-cites.json');
      if (fs.existsSync(rp)) { try { regText = fs.readFileSync(rp, 'utf8'); } catch (e) { regText = null; } }
    }
    if (regText === null) {
      errs.push('doc_refs carry orphaned-cite rows but docs/governance/orphan-cites.json is absent at this revision');
    } else {
      let reg = null;
      try { reg = JSON.parse(regText); } catch (e) { errs.push('orphan-cites.json unparseable: ' + e.message); }
      if (reg) {
        for (const d of orphanRows) {
          let ent = null;
          try { ent = oc.entryForToken(reg, d.sha); } catch (e) { errs.push('orphaned-cite ' + d.sha + ' ambiguous in registry: ' + e.message); continue; }
          if (!ent) errs.push('orphaned-cite ' + d.sha + ' has no registry entry');
          else if (ent.disposition !== 'orphaned') errs.push('orphaned-cite ' + d.sha + ' resolved by a ' + ent.disposition + ' entry');
        }
      }
    }
  }
  // qualifier weak-consistency: reachable_via non-empty contradicts a class
  // asserting non-reachability (orphaned-cite/unresolved) - flag, never equal.
  for (const d of docRefs) {
    const q = d.qualifiers;
    if (!q) continue;
    if ((d['class'] === 'orphaned-cite' || d['class'] === 'unresolved') && Array.isArray(q.reachable_via) && q.reachable_via.length) {
      errs.push('qualifier inconsistency: ' + d.sha + ' classified ' + d['class'] + ' but reachable_via = [' + q.reachable_via.join(', ') + '] (register a revived entry if resurrected)');
    }
    if (q.object_type !== null && q.object_type !== undefined && ['commit', 'tag', 'tree', 'blob'].indexOf(q.object_type) === -1) {
      errs.push('qualifier inconsistency: ' + d.sha + ' object_type outside git enum: ' + q.object_type);
    }
  }
  return errs;
}
// ADR-0089 D-F: --check equality domain = declared facts + counts + classes.
// Exempt (still written, weak-consistency-checked): generated_at, warnings,
// every row's qualifiers object.
function stableCopy(m) {
  const c = JSON.parse(JSON.stringify(m));
  delete c.generated_at;
  delete c.warnings;
  for (const d of c.doc_refs || []) delete d.qualifiers;
  return c;
}

// Weak-consistency check over a generated map's qualifiers (spec 6.1):
// contradictions between class and reachable_via/type are errors, and any
// 'unresolved' row is hard red (absent AND unregistered - ADR-0089 D-E stage 4).
// D-008 (adjudicated): the check is bidirectional - --check runs it on the
// COMMITTED map too. Exempt-from-equality is never exempt-from-consistency;
// a committed qualifier contradiction is otherwise tamper-invisible.
function consistencyErrors(map) {
  const errs = [];
  for (const d of map.doc_refs || []) {
    const q = d.qualifiers;
    if (!q) continue;
    if ((d['class'] === 'orphaned-cite' || d['class'] === 'unresolved') && Array.isArray(q.reachable_via) && q.reachable_via.length) {
      errs.push(d.file + ':' + d.line + ' ' + d.sha + ' classified ' + d['class'] + ' but reachable_via = [' + q.reachable_via.join(', ') + ']');
    }
    if (q.object_type !== null && q.object_type !== undefined && oc.OBJECT_TYPES.indexOf(q.object_type) === -1) {
      errs.push(d.file + ':' + d.line + ' ' + d.sha + ' object_type outside git enum: ' + q.object_type);
    }
  }
  const unresolved = (map.doc_refs || []).filter(function (d) { return d['class'] === 'unresolved'; });
  if (unresolved.length) {
    errs.push(unresolved.length + ' unresolved citation(s) (absent AND unregistered) - disclose via node scripts/orphan-cites.js backfill; first: ' + unresolved.slice(0, 5).map(function (d) { return d.file + ':' + d.line + ':' + d.sha; }).join(', '));
  }
  return errs;
}

// D-007: exists_at is a FIRST-OBSERVATION stamp (the leg's unageable clock
// basis) - carry it forward across regens for rows that persist at the same
// file:line:sha. It is a qualifier, so the carry-forward never affects
// --check equality; it only stabilizes the committed artifact's clock.
function stabilizeExistsAt(map, prior) {
  const prev = new Map();
  for (const d of (prior && prior.doc_refs) || []) {
    prev.set(d.file + ':' + d.line + ':' + d.sha, d.qualifiers && d.qualifiers.exists_at);
  }
  for (const d of map.doc_refs || []) {
    const old = prev.get(d.file + ':' + d.line + ':' + d.sha);
    if (old && d.qualifiers) d.qualifiers.exists_at = old;
  }
}

// D-008: the --check consistency pair - weak self-consistency on BOTH the
// committed artifact and the regenerated one. Equality stays on stableCopy
// (qualifiers exempt); consistency never is.
function checkMapConsistency(committed, regenerated) {
  return consistencyErrors(regenerated).concat(
    consistencyErrors(committed).map(function (e) { return 'committed map: ' + e; }));
}

function main() {
  const args = process.argv.slice(2);
  const oldArgs = [];
  let newRef = 'origin/main', check = false, verifyMode = false, publishedOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--old') oldArgs.push(args[++i]);
    else if (args[i] === '--new') newRef = args[++i];
    else if (args[i] === '--check') check = true;
    else if (args[i] === '--verify') verifyMode = true;
    else if (args[i] === '--published-only') publishedOnly = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('usage: node scripts/build-rewrite-map.js [--check|--verify|--published-only] [--old <ref>]... [--new <ref>]');
      return;
    }
  }
  if (publishedOnly) {
    // Published-side consistency only - deliberately bypasses the registry
    // 'rewrite-map' capability set (which includes the old-side asset): the
    // whole point of this mode is running where the old side is absent.
    requireCapabilities('rewrite-map-published');
    const mapAbs = path.join(ROOT, OUT_REL);
    if (!fs.existsSync(mapAbs)) { console.error('[rewrite-map] PUBLISHED-ONLY FAIL: ' + OUT_REL + ' missing - the committed map is the assertion target'); process.exit(1); }
    let committed;
    try { committed = JSON.parse(fs.readFileSync(mapAbs, 'utf8')); }
    catch (e) { console.error('[rewrite-map] PUBLISHED-ONLY FAIL: ' + OUT_REL + ' unreadable: ' + (e && e.message)); process.exit(1); }
    const errs = verifyPublishedOnly(committed, newRef);
    if (errs.length) { console.error('[rewrite-map] PUBLISHED-ONLY FAIL:' + '\n' + errs.join('\n')); process.exit(1); }
    console.log('[rewrite-map] PUBLISHED-ONLY OK: ' + (committed.doc_refs || []).length + ' citations covered, class enum + counts consistent, published-side ancestry verified against ' + newRef);
    return;
  }
  requireCapabilities('rewrite-map');
  // Post-purge branches can predate the current tip without being pre-purge
  // lines: they descend from published-side rewritten commits. Anchor the
  // discovery on the prior map's new-side identities when one is committed
  // (the first generation falls back to the tip-only test).
  let publishedSide = null;
  let prior = null;
  const outAbs = path.join(ROOT, OUT_REL);
  try {
    prior = JSON.parse(fs.readFileSync(outAbs, 'utf8'));
    const rew = (prior.commits || []).map(function (c) { return c.new; }).filter(Boolean);
    if (prior.published_tip) rew.push(prior.published_tip);
    if (rew.length) publishedSide = rew;
  } catch (e) {
    if (e && e.code !== 'ENOENT') {
      console.error('[rewrite-map] FAIL: prior map ' + OUT_REL + ' exists but is unreadable (' + (e && e.message) + ') - discovery would silently degrade to the tip-only test; fix or remove the file');
      process.exit(1);
    }
    // ENOENT: first generation - tip-only test.
  }
  const oldRefs = oldArgs.length ? oldArgs : discoverOldRefs(newRef, publishedSide);
  if (!oldRefs.length) {
    // grill-t25 clone-degradability contract: gb-local/* old-side refs are a
    // maintainer-object-store asset that never publishes. Absence is a
    // deterministic capability negative - exit 2 UNVERIFIABLE, never a red
    // --check on a public clone. The published-side subset stays checkable
    // everywhere via --published-only.
    exitUnverifiable('rewrite-map', 'old-side-refs');
  }
  const map = build(oldRefs, newRef);
  // D-007: exists_at is the first-observation stamp the leg's unageable
  // clock runs on - carry it forward for rows that persist (same
  // file:line:sha), so regens do not restart the first-seen clock.
  stabilizeExistsAt(map, prior);
  if (verifyMode) {
    const errs = verify(map);
    if (errs.length) { console.error('[rewrite-map] VERIFY FAIL:\n' + errs.join('\n')); process.exit(1); }
    console.log('[rewrite-map] VERIFY OK: ' + map.counts.commits + ' rewritten pairs, ' + map.counts.doc_refs + ' doc citations classified');
    return;
  }
  if (check) {
    if (!fs.existsSync(outAbs)) { console.error('[rewrite-map] FAIL: ' + OUT_REL + ' missing \u2014 run the generator'); process.exit(1); }
    const committed = JSON.parse(fs.readFileSync(outAbs, 'utf8'));
    const consErrs = checkMapConsistency(committed, map);
    if (consErrs.length) {
      console.error('[rewrite-map] FAIL: consistency violations:\n' + consErrs.join('\n'));
      process.exit(1);
    }
    if (JSON.stringify(stableCopy(committed)) !== JSON.stringify(stableCopy(map))) {
      console.error('[rewrite-map] FAIL: ' + OUT_REL + ' is stale \u2014 regenerate with node scripts/build-rewrite-map.js');
      process.exit(1);
    }
    console.log('[rewrite-map] OK: map in sync (' + map.counts.doc_refs + ' doc citations classified)');
    return;
  }
  fs.writeFileSync(outAbs, JSON.stringify(map, null, 2) + '\n');
  console.log('[rewrite-map] wrote ' + OUT_REL + ': ' + map.counts.commits + ' rewritten, ' +
    map.counts.removed + ' removed, ' + map.counts.published_only + ' published-only, ' +
    map.counts.doc_refs + ' doc citations');
  if (map.warnings && map.warnings.length) {
    // ADR-0089 D-E stage 2: the orphan window is open - register while alive.
    console.error('[rewrite-map] note: ' + map.warnings.length + ' unreachable unregistered cite(s) past the age threshold - register while alive: node scripts/orphan-cites.js register <sha> --reason <text> (or backfill)');
  }
}

if (require.main === module) main();
module.exports = { build, verify, verifyPublishedOnly, scanDocTokens, scanDocTokensAt, scanDocTokensAtMany, discoverOldRefs, isEmptyCommit, stableCopy, consistencyErrors, checkMapConsistency, refFacts, stabilizeExistsAt };
