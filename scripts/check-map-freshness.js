#!/usr/bin/env node
'use strict';
// check-map-freshness.js - grill-t30 D-004 (E-17 wave-closeout mechanization).
//
// Authority layer of the two-layer freshness contract. For every
// claim-surface-touching commit C on the post-registration range:
//   (a) coverage   - every hex citation inside C's tracked doc surface has a
//                    doc_refs row in the docs/rewrite-map.json committed
//                    INSIDE C's tree, and no doc_refs row points at a file
//                    present in C's tree but carrying a phantom cite;
//                    rows for files absent from C's tree are tolerated
//                    (the map is generated against the workspace union -
//                    parallel-lane artifacts are non-applicable, not stale);
//   (b) consistency - that map satisfies the --published-only internal
//                    assertions with the published-line oracle bound to C:
//                    ancestry is evaluated against C itself, never against
//                    the ambient origin/main ref.
// Assertion inputs are strictly tree-internal - C's citation set + C's
// committed map. The worktree, the index and origin/main are never
// consulted; the verdict cannot change without a new commit (the
// alexandria#185 class: a check whose result changes with no commit is not
// a trustworthy gate).
//
// Claim-commit scope: a commit whose landed files touch the registered
// claim surface (.scratch/grill-<id>/(reports|handoffs)/, classified
// 'claim' by the surface taxonomy) minus exception-channel entries
// effective at the commit's own date (ADR-0086 commit-point semantics).
//
// Registration anchor: the commit that added this script
// (git log --diff-filter=A, oldest wins). Commits before it are exempt -
// forward-only, history is never rewritten (check-anchoring-footer
// convention, grill-t29 D-006).
//
// Generation-side pairing (D-004(ii)): .githooks/pre-commit-user blocks a
// staged claim-surface commit while the map is stale; this leg is the
// enforcement authority because the hook layer is bypassable (lane ops,
// `but commit`, raw git). Repair on red = human regen + follow-up wave -
// never a bot commit (ADR-0083 D-C).
//
// Usage: node scripts/check-map-freshness.js

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const fresh = require('./evidence-freshness');
const rm = require('./build-rewrite-map');

const ROOT = path.join(__dirname, '..');
const SELF_REL = 'scripts/check-map-freshness.js';
const MAP_REL = 'docs/rewrite-map.json';
const CLAIM_SCOPE_RE = /^\.scratch\/grill-[^/]+\//;

const gitAt = (root) => (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const gitOkAt = (root) => (args) => spawnSync('git', args, { cwd: root }).status === 0;

function registrationCommit(root) {
  const adds = gitAt(root)(['log', '--diff-filter=A', '--format=%H', '--', SELF_REL]).split('\n').filter(Boolean);
  return adds.length ? adds[adds.length - 1] : null;
}

// Does commit `sha` land files on the claim surface that are not exempted
// at the commit's own date? Same predicate family as evaluateRound's claim
// walk (claim class + live exception channel), kept on exported parts.
function isClaimCommit(root, sha, cx) {
  const files = fresh.commitInfo(root, sha, cx).files;
  if (!files || !files.length) return false;
  const when = gitAt(root)(['log', '-1', '--format=%cs', sha]);
  for (const f of files) {
    if (fresh.classifyFile(f, cx) !== 'claim') continue;
    const dir = (f.match(CLAIM_SCOPE_RE) || [])[0];
    if (!dir) continue;
    const under = cx.claimDirs.some((d) => f.startsWith(dir + d));
    if (!under) continue;
    const exempt = (cx.claimExceptions || []).some(
      (e) => fresh.exceptionActive(e, { when: when, sha: sha }) && dir + e.path === f
    );
    if (!exempt) return true;
  }
  return false;
}

function showAt(root, ref, file) {
  try { return gitAt(root)(['show', ref + ':' + file]); } catch (e) { return null; }
}

// (a)+(b) for one commit: the map inside C's tree must cover C's own doc
// citations and stay internally consistent with ancestry bound to C.
function checkCommit(root, sha) {
  const errs = [];
  const mapText = showAt(root, sha, MAP_REL);
  if (mapText === null) {
    return ['map-freshness: ' + sha.slice(0, 9) + ' claim commit lacks ' + MAP_REL + ' in its tree'];
  }
  let map;
  try { map = JSON.parse(mapText); } catch (e) {
    return ['map-freshness: ' + sha.slice(0, 9) + ' ' + MAP_REL + ' unparseable at this commit: ' + e.message];
  }
  const occ = rm.scanDocTokensAt(root, sha);
  const treeFiles = new Set(
    gitAt(root)(['ls-tree', '-r', sha, '--name-only']).split('\n').filter(Boolean)
  );
  const inner = rm.verifyPublishedOnly(map, sha, { occurrences: occ, commitBound: true, root: root, treeFiles: treeFiles });
  for (const e of inner) errs.push('map-freshness: ' + sha.slice(0, 9) + ' ' + e);
  return errs;
}

function checkFreshness(root) {
  const git = gitAt(root);
  const errors = [];
  const cx = fresh.classifiers(fresh.loadFreshness(root));
  const reg = registrationCommit(root);
  if (!reg) { errors.push('map-freshness: registration commit not found (script never landed?)'); return { errors: errors, checked: 0 }; }
  const parented = (function () {
    try { return git(['rev-parse', '-q', '--verify', reg + '^']) !== ''; }
    catch (e) { return false; }
  })();
  const range = parented ? reg + '^..HEAD' : 'HEAD';
  const regDate = git(['log', '-1', '--format=%ct', reg]);
  // Same forward-only scope as check-anchoring-footer: descendants of the
  // registration commit OR commits created after it (a parallel lane's
  // pre-registration commits join the ancestry via the workspace merge but
  // stay exempt). The registration commit itself precedes its own rule.
  const commits = git(['rev-list', '--no-merges', range])
    .split('\n').filter(Boolean)
    .filter((sha) => !git(['log', '-1', '--format=%s', sha]).startsWith(fresh.WORKSPACE_SUBJECT))
    .filter((sha) => {
      if (sha === reg) return false;
      const cdate = git(['log', '-1', '--format=%ct', sha]);
      if (Number(cdate) > Number(regDate)) return true;
      return gitOkAt(root)(['merge-base', '--is-ancestor', reg, sha]);
    });
  let checked = 0;
  for (const sha of commits) {
    if (!isClaimCommit(root, sha, cx)) continue;
    checked++;
    errors.push.apply(errors, checkCommit(root, sha));
  }
  return { errors: errors, checked: checked, reg: reg };
}

function main() {
  requireCapabilities('map-freshness');
  const out = checkFreshness(ROOT);
  for (const e of out.errors) console.error('FAIL: ' + e);
  if (out.errors.length) process.exit(1);
  console.log('[map-freshness] OK: ' + out.checked + ' claim-surface commit(s) verified tree-internally (E-17, grill-t30 D-004)');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkFreshness, isClaimCommit, checkCommit, registrationCommit, MAP_REL };
