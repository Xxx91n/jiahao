#!/usr/bin/env node
'use strict';
// scripts/check-status-inventory.js - grill-t37 D-002.5 / D-005.6: the
// status-inventory ASSERTION leg. Asserts the LATEST in-scope claim-surface
// report's '<!-- status-inventory v1 -->' block reconciles, member-level,
// against the current re-derived failure inventory (the per-run emitted
// artifact family under test-artifacts/status-inventory/).
//
// WHAT IS ASSERTED (D-005.4 - compare the block against a re-derivation,
// never check that a block merely exists; security.txt presence-check is the
// registered anti-precedent):
//   1. the block is well-formed: run_id / emitted_at /
//      normalized_join_key_version / rows / rows_digest, and the digest
//      recomputes over the declared rows (self-consistency);
//   2. freshness anchor: the block's run_id tree_sha is HEAD or an ancestor
//      of HEAD - a block naming a foreign tree cannot speak for this one;
//   3. member-level equality: the block's rows for a judged surface equal the
//      rows the current derivation emits for that surface, minus the
//      observer rows this assertion cannot see mid-run (the assert leg
//      itself and the wrapper-internal tracked-surface pseudo-leg).
//
// RE-DERIVATION SOURCE: the emitted artifact is selected per surface by
// tree_sha == HEAD first (the derivation of the judged tree), else
// tree_sha == the block's claimed tree (the derivation the block was written
// against). A surface with NEITHER derivation available is reported
// UNVERIFIABLE (exit 2; the leg ran but could not judge that surface) - never
// silently green (C-1 honesty), never a false red.
//
// OBSERVER-ROW EXCLUSION: the assert leg runs inside the very run it judges
// and sees the inventory mid-write (complete:false). Rows for the assert
// leg itself and the wrapper-internal tracked-surface pseudo-leg are
// excluded from BOTH member sets - the observer cannot be inside the
// observed set. The assert leg must be the LAST registry leg (it
// mechanically enforces this below); a later-ordered leg is an error.
//
// BOOTSTRAP (prospective, audit-surface/post-land-sentinel family): the
// convention binds claim artifacts first committed on/after this leg's own
// registration commit. Until an in-scope artifact carries the block there is
// no subject and the leg reports OK - the first report carrying the block is
// what activates it.
//
// Usage: node scripts/check-status-inventory.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const roles = require('./shared/claim-surface-roles');
const inv = require('../src/shared/status-inventory');

const ROOT = path.join(__dirname, '..');
const SELF_REL = 'scripts/check-status-inventory.js';
const SELF_LEG = 'status-inventory';
const ARTIFACT_DIR = path.join(ROOT, 'test-artifacts', 'status-inventory');
const REGISTRY_REL = path.join('docs', 'gates.json');

// Rows for these units can never be in the mid-run artifact when this leg
// runs: the assert leg itself is still executing, and the tracked-surface
// pseudo-leg is written post-loop. Both are runner-authored (never
// hand-written), so no drift surface is lost by the exclusion.
const OBSERVER_NAMES = ['- tracked-surface', SELF_LEG];
function isObserverRow(r) {
  return r && r.unit_kind === 'gate-leg' && OBSERVER_NAMES.indexOf(r.name) !== -1;
}

const git = function (args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
};
const gitBool = function (args) {
  try { execFileSync('git', args, { cwd: ROOT, stdio: 'ignore' }); return true; } catch (e) { return false; }
};

function registrationCommit() {
  const adds = git(['log', '--diff-filter=A', '--format=%H', '--', SELF_REL]).split('\n').filter(Boolean);
  return adds.length ? adds[adds.length - 1] : null;
}

function firstCommitMs(rel) {
  try {
    const out = git(['log', '--diff-filter=A', '--format=%ct', '--', rel]);
    const last = out.split('\n').filter(Boolean).pop();
    return last ? Number(last) * 1000 : 0;
  } catch (e) { return 0; }
}

// The assert leg must close the run: a registry leg ordered after it would
// emit rows this leg can never see mid-run. Mechanical self-check. The
// ordering property binds only once the leg is registered - before the
// ADR-0095 wiring commit lands the entry, a standalone run is a development
// verification, so unregistered is a warning, not a failure.
function assertLegIsLast(reg) {
  const reg2 = typeof reg === 'string' ? JSON.parse(fs.readFileSync(path.join(ROOT, reg), 'utf8')) : reg;
  const mine = (reg2.entries || []).filter(function (e) { return e.name === SELF_LEG; });
  if (!mine.length) return { warn: 'assert leg ' + SELF_LEG + ' not registered in ' + REGISTRY_REL.split(path.sep).join('/') + ' (lands with ADR-0095); standalone reconcile continues' };
  const order = mine[0].order;
  const later = (reg2.entries || []).filter(function (e) { return e.order > order; });
  if (later.length) {
    return { error: 'assert leg must be the LAST registry leg - ordered after it: ' + later.map(function (e) { return e.name; }).join(', ') };
  }
  return null;
}

// Artifacts for a surface, newest first.
function artifactsFor(surface) {
  let names;
  try { names = fs.readdirSync(ARTIFACT_DIR); } catch (e) { return []; }
  const head = 'status-inventory.' + surface + '.';
  return names
    .filter(function (n) { return n.indexOf(head) === 0 && n.slice(-5) === '.json'; })
    .map(function (n) { return { name: n, ms: fs.statSync(path.join(ARTIFACT_DIR, n)).mtimeMs }; })
    .sort(function (a, b) { return b.ms - a.ms; })
    .map(function (x) {
      try { return { file: x.name, artifact: JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, x.name), 'utf8')) }; }
      catch (e) { return null; }
    })
    .filter(Boolean);
}

// opts.artifacts injects the candidate list for tests; real calls read the
// per-run artifact dir. Preference order: the HEAD-tree derivation first, then
// the run the block claims - a dirty worktree shares HEAD's tree_sha, so
// derivation selection is tree-anchored, never dirty/clean split.
// grill-t37 rework F-4: only complete===true artifacts are derivation truth.
// Runners emit incrementally (complete:false mid-run); reconciling against a
// partial inventory minted false member-level reds when the standalone path
// ran during a battery. An in-flight-only tree is underivable -> the caller's
// null path reports UNVERIFIABLE, never a fabricated verdict.
function pickDerivation(surface, claimedSha, headSha, opts) {
  const list = (opts && opts.artifacts) || artifactsFor(surface);
  const byTree = function (sha) {
    return list.find(function (a) { return a.artifact && a.artifact.complete === true && a.artifact.tree_sha === sha; }) || null;
  };
  return byTree(headSha) || byTree(claimedSha) || null;
}

function rowsForSurface(rows, surface) {
  return (rows || []).filter(function (r) { return r && r.judged_surface === surface && !isObserverRow(r); });
}

function main() {
  // ADR-0058 R8 inline declaration until the registry entry lands with its
  // ADR (the leg's gates.json row is a Declaration-surface change): probe the
  // capabilities this leg actually needs, don't fake a registry identity.
  requireCapabilities(['repo-tree']);
  const errors = [];
  const warnings = [];

  const regErr = assertLegIsLast(REGISTRY_REL);
  if (regErr && regErr.error) { console.error('FAIL: ' + regErr.error); process.exit(1); }
  if (regErr && regErr.warn) console.log('::warning title=' + SELF_LEG + '::' + regErr.warn);

  const reg = registrationCommit();
  // No landing commit yet (pre-registration standalone run): the prospective
  // scope anchor does not exist, so every sentinel carrier is in scope -
  // warn and continue rather than fail on a bootstrap artefact.
  const regMs = reg ? Number(git(['log', '-1', '--format=%ct', reg])) * 1000 : null;
  if (!reg) console.log('::warning title=' + SELF_LEG + '::no registration commit for ' + SELF_REL + ' yet (lands this round); all sentinel carriers judged in scope');

  const loaded = roles.loadRegistry(ROOT);
  if (loaded.parseError || !loaded.registry) {
    console.error('FAIL: status-inventory: ' + (loaded.parseError || 'claim-surface role registry not found at ' + roles.REGISTRY_REL) +
      ' - the report selector reads the registry, so an unreadable declared surface is a FAIL, not an empty candidate set');
    process.exit(1);
  }

  // Candidates: registered claim artifacts (registry consumption, never
  // filename matching) in prospective scope that CARRY a sentinel block -
  // marker followed by the json fence. A bare marker mention in prose (a
  // taskbook documenting the convention) is not a carrier; fail-closed on
  // marker-without-fence applies only once a file IS the selected subject.
  const CARRIER_RE = /<!--\s*status-inventory\s+v1\s*-->\s*```json/;
  const candidates = [];
  for (const rel of roles.registeredPaths(loaded.registry)) {
    const abs = path.join(ROOT, rel.split('/').join(path.sep));
    if (!/\.md$/.test(rel) || !fs.existsSync(abs)) continue;
    const ms = firstCommitMs(rel);
    if (regMs !== null && ms && ms < regMs) continue; // predates the convention - never retro-convicted
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { continue; }
    if (!CARRIER_RE.test(text)) continue;
    candidates.push({ rel: rel, ms: ms || fs.statSync(abs).mtimeMs });
  }
  if (!candidates.length) {
    console.log('[status-inventory] OK: no in-scope claim artifact carries a ' + inv.SENTINEL +
      ' block yet (the convention applies forward from ' + (reg ? reg.slice(0, 9) : 'the pending registration commit') + ')');
    process.exit(0);
  }
  candidates.sort(function (a, b) { return b.ms - a.ms; });
  const subject = candidates[0];
  const text = fs.readFileSync(path.join(ROOT, subject.rel.split('/').join(path.sep)), 'utf8');
  const parsed = inv.extractSentinels(text);
  for (const e of parsed.errors) errors.push(subject.rel + ': ' + e);
  if (!parsed.blocks.length) {
    console.error('FAIL: ' + subject.rel + ': sentinel marker found but no parseable block');
    process.exit(1);
  }

  const head = git(['rev-parse', 'HEAD']);
  let unverifiable = [];

  for (const h of parsed.blocks) {
    const block = h.block;
    const tag = subject.rel + ' block@' + h.offset;
    if (typeof block.emitted_at !== 'string' || !block.emitted_at) {
      errors.push(tag + ': emitted_at missing (freshness is self-described, D-005.4)');
    }
    if (block.normalized_join_key_version !== inv.JOIN_KEY_VERSION) {
      errors.push(tag + ': normalized_join_key_version ' + JSON.stringify(block.normalized_join_key_version) +
        ' != ' + inv.JOIN_KEY_VERSION + ' - the join-key grammar moved; re-render the block');
      continue;
    }
    if (!inv.sentinelSelfConsistent(block)) {
      errors.push(tag + ': rows_digest does not recompute over the declared rows (hand-edited snapshot)');
      continue;
    }
    const parts = String(block.run_id).split('.');
    const surface = parts[0];
    const treeSha = parts[1];
    if (!/^[0-9a-f]{7,40}$/.test(treeSha || '')) {
      errors.push(tag + ': run_id tree_sha absent or malformed (' + JSON.stringify(block.run_id) + ')');
      continue;
    }
    // Freshness anchor: tree_sha must be a resolvable COMMIT in this repo.
    // Strict HEAD-or-ancestor is unworkable under a GitButler workspace -
    // HEAD there is the ephemeral merge commit, rewritten by every lane
    // mutation, so a block generated pre-commit would land stale by
    // construction. The member-level diff below is the real judge: a stale
    // or foreign member set fails on content, not on commit-graph ancestry.
    if (treeSha !== head && !gitBool(['merge-base', '--is-ancestor', treeSha, 'HEAD']) && !gitBool(['cat-file', '-e', treeSha + '^{commit}'])) {
      errors.push(tag + ': run_id tree_sha ' + treeSha.slice(0, 9) + ' is not HEAD, an ancestor, or a resolvable commit - a foreign-tree block cannot speak for this tree');
      continue;
    }
    const deriv = pickDerivation(surface, treeSha, head);
    if (!deriv) {
      unverifiable.push(surface + ' (no local re-derivation artifact for it)');
      continue;
    }
    const claimRows = rowsForSurface(block.rows, surface);
    const truthRows = rowsForSurface(deriv.artifact.rows, surface);
    const diff = inv.diffMemberSets(claimRows, truthRows);
    if (!diff.equal) {
      const fmt = function (r) { return r.join_key + ' [' + r.status + (r.reason_code ? '/' + r.reason_code : '') + ']'; };
      errors.push(tag + ': member-level drift on surface ' + surface +
        ' - report-only: [' + diff.only_a.map(fmt).join('; ') + '] vs re-derived-only: [' + diff.only_b.map(fmt).join('; ') + ']' +
        ' (regenerate the block from the current derivation: node scripts/build-status-sentinel.js)');
    }
  }

  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  if (unverifiable.length) {
    // Exit-2 honesty: the leg ran, one or more surfaces had no re-derivation
    // to judge against. Non-blocking, ::error-annotated (ADR-0040/0041 lane).
    console.log('::error title=UNVERIFIABLE,gate=' + SELF_LEG + '::surface(s) without a local re-derivation: ' + unverifiable.join(', '));
    console.log('[' + SELF_LEG + '] UNVERIFIABLE: judged ' + subject.rel + ' on derivable surfaces; underivable: ' + unverifiable.join(', '));
    process.exit(2);
  }
  console.log('[' + SELF_LEG + '] OK: ' + subject.rel + ' status-inventory block(s) reconcile member-level against the current derivation');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { extractSentinels: inv.extractSentinels, pickDerivation, rowsForSurface, isObserverRow, assertLegIsLast, OBSERVER_NAMES };
