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

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const OUT_REL = path.join('docs', 'rewrite-map.json');
const SELF = 'docs/rewrite-map.json';
const HEX_RE = /(^|[^0-9a-zA-Z_])([0-9a-f]{7,40})(?![0-9a-zA-Z_])/g;
const DOC_PATH_RE = /^(docs\/|README\.md$|AGENTS\.md$|CONTEXT\.md$|\.scratch\/)/;
const DOC_EXT_RE = /\.(md|json|txt|patch|jsonl)$/;

function git(args, opts) {
  return execFileSync('git', args, Object.assign({ cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, opts || {}));
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

// prefix-match a token against a sorted sha array; returns the match or null,
// or the string 'ambiguous' when more than one object shares the prefix.
function prefixLookup(sorted, token) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < token) lo = mid + 1; else hi = mid; }
  const hits = [];
  for (let i = lo; i < sorted.length && sorted[i].indexOf(token) === 0 && hits.length < 2; i++) hits.push(sorted[i]);
  if (hits.length === 0) return null;
  if (hits.length > 1) return 'ambiguous';
  return hits[0];
}

function isEmptyCommit(sha) {
  // diff-tree with no output = empty commit (first-parent diff).
  const out = git(['diff-tree', '--no-commit-id', '--name-only', '-r', sha]);
  return out.trim() === '';
}

function build(oldRefs, newRef) {
  const oldLog = [];
  const seenOld = {};
  for (const r of oldRefs) {
    for (const m of logMeta(r)) { if (!seenOld[m.sha]) { seenOld[m.sha] = 1; oldLog.push(m); } }
  }
  const newLog = logMeta(newRef);
  const newSet = {};
  newLog.forEach(function (m) { newSet[m.sha] = 1; });
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

  // object sets for citation resolution
  const pubObjects = new Set(revListObjects(newRef));
  const oldObjects = new Set();
  for (const r of oldRefs) for (const o of revListObjects(r)) oldObjects.add(o);
  const allObjects = new Set(revListObjects('--all'));
  const commitPool = Array.from(new Set(newLog.concat(oldLog).map(function (m) { return m.sha; }))).sort();
  const oldPairMap = {};
  commits.forEach(function (c) { oldPairMap[c.old] = c.new; });
  const removedSet = {};
  removed.forEach(function (m) { removedSet[m.sha] = 1; });
  const objSorted = Array.from(new Set(Array.from(pubObjects).concat(Array.from(oldObjects), Array.from(allObjects)))).sort();

  // doc citation scan (the map file itself excluded \u2014 generated, not a
  // source). Enumeration is the UNION of index + committed tree (the F-1
  // lesson: GitButler's virtual index lags HEAD by committed files, so an
  // index-only scan silently misses tracked docs). Untracked worktree files
  // are deliberately NOT scanned - a doc joins the tracked surface only via
  // a commit, so the map regen that follows the doc commit picks it up.
  const files = Array.from(new Set(
    git(['ls-files']).split('\n').concat(git(['ls-tree', '-r', 'HEAD', '--name-only']).split('\n'))
  )).map(function (s) { return s.trim(); }).filter(Boolean)
    .filter(function (f) { return f !== SELF && DOC_PATH_RE.test(f) && DOC_EXT_RE.test(f); }).sort();
  const docRefs = [];
  const problems = [];
  for (const f of files) {
    const abs = path.join(ROOT, f.split('/').join(path.sep));
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { continue; }
    const lines = text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      HEX_RE.lastIndex = 0;
      let m;
      while ((m = HEX_RE.exec(line))) {
        const token = m[2];
        if (!/[a-f]/.test(token)) continue;
        const hit = prefixLookup(commitPool, token);
        let cls, resolvedTo = null, label;
        if (hit === 'ambiguous') { problems.push(f + ':' + (li + 1) + ' ambiguous sha ' + token); continue; }
        if (hit && newSet[hit]) { cls = 'published-unchanged'; }
        else if (hit && oldPairMap[hit]) { cls = 'rewritten'; resolvedTo = oldPairMap[hit]; }
        else if (hit && removedSet[hit]) { cls = 'local-only'; label = 'old-side commit (removed by purge)'; }
        else if (hit) { cls = 'local-only'; label = 'local commit'; }
        else {
          const ohit = prefixLookup(objSorted, token);
          if (ohit === 'ambiguous') { problems.push(f + ':' + (li + 1) + ' ambiguous object ' + token); continue; }
          if (ohit && pubObjects.has(ohit)) cls = 'published-unchanged';
          else if (ohit && oldObjects.has(ohit)) { cls = 'local-only'; label = 'pre-purge object'; }
          else if (ohit) { cls = 'local-only'; label = 'local object'; }
          else { cls = 'local-only'; label = 'unresolved hex literal'; }
        }
        docRefs.push({ file: f, line: li + 1, sha: token, 'class': cls, resolved_to: resolvedTo, label: label });
      }
    }
  }
  if (problems.length) throw new Error('unresolvable citations:\n' + problems.join('\n'));

  const newest = commits.length ? commits[0] : null;
  const oldTip = newest ? newest.old : git(['rev-parse', oldRefs[0]]).trim();
  const base = git(['merge-base', oldTip, newRef]).trim();

  // Spec: commits present on both sides with the same SHA are emitted as
  // `same` rows (explicit is auditable; ~all commits at/below the shared
  // base). Removed pairs carry an explicit `new: null` rather than a
  // separate ad-hoc shape.
  const sameRaw = git(['log', '--format=%H%x00%s', base]).trim();
  const same = sameRaw ? sameRaw.split('\n').map(function (l) { const z = l.indexOf('\u0000'); return { sha: l.slice(0, z), subject: l.slice(z + 1) }; }) : [];

  return {
    schema_version: 1,
    _doc: 'ADR-0074 D-C: append-only, tool-generated single translation point. Regenerate: node scripts/build-rewrite-map.js; verify: --check.',
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
        'published-unchanged': docRefs.filter(function (d) { return d['class'] === 'published-unchanged'; }).length
      }
    },
    commits: commits,
    removed: removed.map(function (m) { return { old: m.sha, new: null, subject: m.subject }; }),
    published_only: publishedOnly,
    same: same,
    doc_refs: docRefs.map(function (d) { const r = { file: d.file, line: d.line, sha: d.sha, 'class': d['class'], resolved_to: d.resolved_to }; if (d.label) r.label = d.label; return r; })
  };
}

function verify(map) {
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
  const re = build(map.sides.old_refs, newRef);
  if (JSON.stringify(map.doc_refs) !== JSON.stringify(re.doc_refs)) errs.push('doc_refs re-derivation differs');
  if (JSON.stringify(map.commits) !== JSON.stringify(re.commits)) errs.push('commits re-derivation differs');
  return errs;
}

function stableCopy(m) { const c = JSON.parse(JSON.stringify(m)); delete c.generated_at; return c; }

function main() {
  const args = process.argv.slice(2);
  const oldArgs = [];
  let newRef = 'origin/main', check = false, verifyMode = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--old') oldArgs.push(args[++i]);
    else if (args[i] === '--new') newRef = args[++i];
    else if (args[i] === '--check') check = true;
    else if (args[i] === '--verify') verifyMode = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('usage: node scripts/build-rewrite-map.js [--check|--verify] [--old <ref>]... [--new <ref>]');
      return;
    }
  }
  requireCapabilities('rewrite-map');
  // Post-purge branches can predate the current tip without being pre-purge
  // lines: they descend from published-side rewritten commits. Anchor the
  // discovery on the prior map's new-side identities when one is committed
  // (the first generation falls back to the tip-only test).
  let publishedSide = null;
  const outAbs = path.join(ROOT, OUT_REL);
  try {
    const prior = JSON.parse(fs.readFileSync(outAbs, 'utf8'));
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
  if (!oldRefs.length) { console.error('[rewrite-map] FAIL: no old-side refs discovered (no gb-local/* carries objects absent from ' + newRef + ' and not descended from published-side anchors)'); process.exit(1); }
  const map = build(oldRefs, newRef);
  if (verifyMode) {
    const errs = verify(map);
    if (errs.length) { console.error('[rewrite-map] VERIFY FAIL:\n' + errs.join('\n')); process.exit(1); }
    console.log('[rewrite-map] VERIFY OK: ' + map.counts.commits + ' rewritten pairs, ' + map.counts.doc_refs + ' doc citations classified');
    return;
  }
  if (check) {
    if (!fs.existsSync(outAbs)) { console.error('[rewrite-map] FAIL: ' + OUT_REL + ' missing \u2014 run the generator'); process.exit(1); }
    const committed = JSON.parse(fs.readFileSync(outAbs, 'utf8'));
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
}

if (require.main === module) main();
module.exports = { build, verify, discoverOldRefs, prefixLookup, isEmptyCommit };
