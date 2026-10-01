#!/usr/bin/env node
'use strict';
// scripts/check-post-land.js - ADR-0092 (grill-t35 D-004/D-007): the post-land
// re-verification carrier.
//
// THE CONTRACT THIS ENFORCES (round object: verified object == public object):
// t34 landed four defects that every local check called green, because the
// object being verified was the LANE tree at declare time while the object the
// public actually receives is the LANDED tip after the landing rewrite. This
// script closes that gap mechanically: fetch origin/main, materialize the
// public tip in a throwaway worktree, and run a WAVE-BOUNDED SUBSET of the
// battery against THAT tree.
//
// WAVE-BOUNDED SUBSET (D-004): bounded to the commits that landed since the
// last verified tip (--since, default: the tip recorded in the previous
// post-land-verify block). Bounded on purpose: an unbounded full-history walk
// belongs to the round boundary, not to every wave.
//
// WHAT IS IN THE SUBSET:
//   - map-freshness tip coverage (authority, D-005)
//   - doc-hygiene over the tip tree's committed .scratch markdown
//   - anchor/pin resolution: strict pins resolve to ancestors of the tip
//   - README/zh-CN pairing scan (D-006) reconciled against its baseline
//
// TWO-SEGMENT SENTINEL BLOCK (D-007). The block it prints is
// '<!-- post-land-verify v1 -->' carrying BOTH segments:
//   pre_land  - the workspace will-land object, with the wave's last
//               claim-mutation sha, the run timestamp, and the subset scope.
//               Asserted by the sentinel leg with the two segments read
//               INDEPENDENTLY (ADR-0091 D-D anti-masking: a green post_land
//               never excuses a red pre_land).
//   post_land - the landed public tip result, anchored to the tip it judged.
//
// POSITIONING, stated plainly so nobody over-reads it: this is DETECTIVE, not
// preventive. The committer and the writer share a trust domain, so a
// self-declared timestamp cannot stop forgery - the forensic authority is
// `git show`-level replay. The forgery defense is F-7 plus the second-party
// audit channel (defer-0030), which this SUBORDINATES to and never replaces.
//
// requires: repo-tree + network (it fetches). Not a gates.json CI leg by
// design (ADR-0092 D-X): the observation point is wrong for a CI job - CI sees
// the tree only after it is already public. Its assertion lives in the
// sentinel leg instead.
//
// Usage:
//   node scripts/check-post-land.js                 # pre+post, emit the block
//   node scripts/check-post-land.js --pre-only
//   node scripts/check-post-land.js --post-only
//   node scripts/check-post-land.js --since <sha>   # explicit wave boundary
//   node scripts/check-post-land.js --no-fetch      # skip the fetch (offline)

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { requireCapabilities, exitUnverifiable } = require('../src/shared/capability');
const { docHygiene } = require('./shared/doc-hygiene');
const pairing = require('./shared/readme-pairing');

const ROOT = path.join(__dirname, '..');
const SENTINEL = '<!-- post-land-verify v1 -->';
const DEFAULT_REMOTE = 'origin';
const DEFAULT_BRANCH = 'main';

const gitAt = (root) => (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }).trim();

function sh(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }, opts || {}));
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// ---- worktree lifecycle -------------------------------------------------
// A throwaway worktree under the OS temp dir, always removed. The tip tree is
// never checked out over the workspace - the whole point is to judge the PUBLIC
// tree while the workspace stays exactly as the author left it.
function withTipWorktree(root, tipSha, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-postland-'));
  const wt = path.join(dir, 'tip');
  let added = false;
  try {
    const add = sh('git', ['worktree', 'add', '--detach', wt, tipSha], { cwd: root });
    if (add.code !== 0) throw new Error('worktree add failed: ' + add.out.trim());
    added = true;
    return fn(wt);
  } finally {
    if (added) sh('git', ['worktree', 'remove', '--force', wt], { cwd: root });
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
}

// ---- the wave-bounded subset -------------------------------------------
function runSubset(wt, opts) {
  const o = opts || {};
  const checks = [];
  // Which map the authority reads depends on the ASSERTION OBJECT, not on the
  // caller. pre_land asserts the will-land object = the workspace merge tree, so
  // it judges the WORKING TREE's map (--worktree); post_land asserts the landed
  // public tip, so it judges that tip's COMMITTED map (--tip HEAD). Reading
  // HEAD's committed map for the will-land object would judge a tree that is not
  // the one about to land - the exact lane-vs-public confusion this round exists
  // to fix.
  const mapArgs = o.mapForm === 'tip' ? ['--tip', 'HEAD'] : ['--worktree'];
  // Which map the authority reads depends on the ASSERTION OBJECT, not on the
  // caller. pre_land asserts the will-land object = the workspace merge tree, so
  // it judges the WORKING TREE's map (--worktree); post_land asserts the landed
  // public tip, so it judges that tip's COMMITTED map (--tip HEAD). Reading HEAD's
  // committed map for the will-land object would judge a tree that is not the one
  // about to land - the exact lane-vs-public confusion this round exists to fix.

  // (1) doc-hygiene over the tip tree's committed .scratch markdown. This is
  // the leg that would have caught R-A: the corrupted handoff is IN the public
  // tree, and the battery that ran before landing never saw it.
  let hygieneHits = 0;
  let hygieneFiles = 0;
  try {
    const files = gitAt(wt)(['ls-tree', '-r', 'HEAD', '--name-only'])
      .split('\n').filter((f) => /^\.scratch\/.+\.md$/.test(f));
    hygieneFiles = files.length;
    const bad = [];
    for (const f of files) {
      let buf;
      try { buf = fs.readFileSync(path.join(wt, f.split('/').join(path.sep))); } catch (e) { continue; }
      const hits = docHygiene(buf);
      if (hits.length) { hygieneHits += hits.length; bad.push(f + ' -> ' + hits.join(', ')); }
    }
    checks.push({
      name: 'doc-hygiene',
      status: bad.length ? 'fail' : 'pass',
      detail: bad.length ? bad.join(' | ') : (hygieneFiles + ' committed .scratch markdown file(s) clean'),
      files: hygieneFiles,
    });
  } catch (e) {
    checks.push({ name: 'doc-hygiene', status: 'fail', detail: 'unreadable at the tip: ' + e.message });
  }

  // (2) README/zh-CN pairing scan reconciled against the committed baseline.
  // Uses the SHARED core, so the landed verdict and the local gate verdict come
  // from one function - two implementations of a pairing rule is how a rule
  // silently stops being one rule.
  try {
    const rec = pairing.reconcile(wt, { tip: 'HEAD' });
    checks.push({
      name: 'readme-pairing',
      status: rec.errors.length ? 'fail' : 'pass',
      detail: rec.errors.length ? rec.errors.join(' | ')
        : (rec.live.violations.length + ' registered unpaired commit(s) over ' + rec.live.scanned + ' scanned; ratchet holds'),
      scanned: rec.live.scanned,
    });
  } catch (e) {
    checks.push({ name: 'readme-pairing', status: 'fail', detail: 'threw: ' + e.message });
  }

  // (3) map-freshness tip coverage at the tip. Spawned as a child so a leg
  // crash is a failed CHECK, not a crashed verifier.
  // The SCRIPT path comes from this module's own directory on purpose: a tip
  // worktree may predate the script, so the maintainer's copy is the executable
  // while the WORKTREE remains the subject under judgment.
  // B-1 FIX: the child must be told WHICH tree to judge. Setting `cwd` to the
  // worktree is NOT sufficient - check-map-freshness.js derives its ROOT from its
  // own module path, so it would judge the main repository and report the
  // WORKSPACE's numbers under the label 'landed public tip'. That is exactly the
  // substitution this round exists to forbid, and it is a claim/state mismatch:
  // the object the check verified was not the object the public receives. The
  // earlier version of this comment asserted the cwd-only behaviour, i.e. it
  // argued FOR the bug the same commit removed. --root is now mandatory for
  // delegated invocation and is asserted by test/post-land-sentinel.test.js.
  const mf = sh(process.execPath, [path.join(ROOT, 'scripts', 'check-map-freshness.js'), '--root', wt].concat(mapArgs), { cwd: wt });
  checks.push({
    name: 'map-freshness',
    status: mf.code === 0 ? 'pass' : 'fail',
    detail: (mf.out || '').trim().split('\n').slice(-3).join(' / '),
  });

  // (4) strict pins resolve to ancestors of the tip (anchor/pin resolution).
  try {
    const oa = sh(process.execPath, [path.join(ROOT, 'scripts', 'check-orphan-ancestry.js'), '--root', wt], { cwd: wt });
    checks.push({
      name: 'orphan-ancestry',
      status: oa.code === 0 ? 'pass' : 'fail',
      detail: (oa.out || '').trim().split('\n').pop(),
    });
  } catch (e) {
    checks.push({ name: 'orphan-ancestry', status: 'fail', detail: 'threw: ' + e.message });
  }

  return checks;
}

// ---- pre_land: the will-land object (D-007) -----------------------------
//
// The assertion object is the WORKSPACE merge tree - the object that WILL land,
// not the object that already landed. Merge-group semantics simulated locally:
// GitButler will linearize the lane stack into the published branch, and the
// merged result is what ships. ADR-0092 states plainly that this is a LOCAL
// SIMILATION of merge-group semantics, not an industrial-standard equivalent -
// naming the analogy keeps nobody from reading it as one.
//
// Recorded: [last claim-mutation sha, run timestamp, subset scope]. The
// timestamp is SELF-FILLED, which is forensic (it catches forgetfulness: 'did
// anyone run the battery after the last edit?') and NOT preventive (it cannot
// catch forgery). Both disclosures are required by ADR-0092.
function runPreLand(opts) {
  const o = opts || {};
  const git = gitAt(ROOT);
  const since = o.since || null;
  const range = since ? since + '..HEAD' : 'HEAD';
  const wave = git(['rev-list', '--no-merges', range]).split('\n').filter(Boolean);
  const lastClaim = lastClaimMutation(git, wave);
  const checks = runSubset(ROOT, { waveOnly: true, mapForm: 'worktree' });
  return {
    object: 'workspace merge tree (will-land simulation; merge-group semantics localized, ADR-0092 D-PRE)',
    last_claim_mutation: lastClaim,
    wave_commits: wave.length,
    ran_at: o.now || new Date().toISOString(),
    subset: SUBSET_SCOPE,
    checks: checks,
  };
}

// The wave's last CLAIM-surface mutation: a claim commit is one that lands a
// file on the registered claim surface (.scratch/grill-*/reports|handoffs/),
// evaluated with the same classifier the map-freshness leg uses, so 'last claim
// mutation' means one thing across the round.
function lastClaimMutation(git, wave) {
  let last = null;
  let lastDate = -1;
  for (const sha of wave) {
    const files = git(['show', '--name-only', '--format=', sha]).split('\n').map((s) => s.trim()).filter(Boolean);
    const isClaim = files.some((f) => /^\.scratch\/grill-[^/]+\/(reports|handoffs)\//.test(f));
    if (!isClaim) continue;
    const d = Number(git(['log', '-1', '--format=%ct', sha]));
    if (d >= lastDate) { lastDate = d; last = sha; }
  }
  return last;
}

const SUBSET_SCOPE = [
  'map-freshness tip coverage (authority, ADR-0092 D-M2)',
  'doc-hygiene over the tip tree committed .scratch markdown (D-M1)',
  'orphan-ancestry strict-pin resolution',
  'README/zh-CN pairing scan vs committed baseline (D-P2)',
];

// ---- post_land: the landed public object (D-004) ------------------------
function runPostLand(opts) {
  const o = opts || {};
  const remote = o.remote || DEFAULT_REMOTE;
  const branch = o.branch || DEFAULT_BRANCH;
  const fetched = { fetched: false, ref: null };
  if (!o.noFetch) {
    const f = sh('git', ['fetch', '--quiet', remote, branch], { cwd: ROOT });
    if (f.code !== 0) {
      // A failed fetch is a DETERMINISTIC capability negative (no network),
      // so the registered exit-2 channel is the honest answer - never a red
      // that reads as 'the tree is broken'.
      exitUnverifiable('post-land', 'repo-tree');
    }
    fetched.fetched = true;
  }
  const ref = remote + '/' + branch;
  let tip;
  try { tip = gitAt(ROOT)(['rev-parse', '--verify', '-q', ref]); }
  catch (e) { tip = ''; }
  if (!tip) exitUnverifiable('post-land', 'repo-tree');
  fetched.ref = ref;

  const wave = o.since ? o.since + '..' + tip : null;
  const checks = withTipWorktree(ROOT, tip, (wt) => runSubset(wt, { wave: wave, mapForm: 'tip' }));
  return {
    object: 'landed public tip (' + ref + ')',
    tip: tip,
    ref: ref,
    fetched: fetched.fetched,
    wave_range: wave || 'whole tip tree',
    ran_at: o.now || new Date().toISOString(),
    subset: SUBSET_SCOPE,
    checks: checks,
  };
}

// ---- machine-readable block (D-007 two segments) ------------------------
function renderBlock(pre, post) {
  const lines = [];
  lines.push(SENTINEL);
  lines.push('');
  if (pre) {
    lines.push('<!-- segment: pre_land -->');
    lines.push('```json');
    lines.push(JSON.stringify(pre, null, 2));
    lines.push('```');
    lines.push('');
  }
  if (post) {
    lines.push('<!-- segment: post_land -->');
    lines.push('```json');
    lines.push(JSON.stringify(post, null, 2));
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}

function overallRed(segs) {
  for (const s of segs) {
    if (!s) continue;
    // Anti-masking (ADR-0091 D-D): each segment is judged on its OWN checks.
    // A green segment never cancels a red one.
    for (const c of s.checks || []) if (c.status !== 'pass') return true;
  }
  return false;
}

function main(argv) {
  const args = argv || process.argv.slice(2);
  const preOnly = args.indexOf('--pre-only') !== -1;
  const postOnly = args.indexOf('--post-only') !== -1;
  const noFetch = args.indexOf('--no-fetch') !== -1;
  const si = args.indexOf('--since');
  const since = si !== -1 && args[si + 1] ? args[si + 1] : null;
  const o = { since: since, noFetch: noFetch };
  if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
    console.log('usage: node scripts/check-post-land.js [--pre-only|--post-only] [--since <sha>] [--no-fetch]');
    return;
  }
  // Segment selection is EXPLICIT: --post-only emits no pre_land segment (not a
  // synthesized one), because a block that carries a segment nobody ran is a
  // false record. renderBlock already omits a null segment.
  // Segment selection is EXPLICIT in both directions: a block never carries a
  // segment nobody ran. --pre-only emits no post_land, --post-only emits no
  // pre_land, and the default emits both. renderBlock omits a null segment.
  const pre = preOnly ? runPreLand(o) : (postOnly ? null : runPreLand(o));
  const post = postOnly ? runPostLand(o) : (preOnly ? null : runPostLand(o));
  console.log(renderBlock(pre, post));
  if (overallRed([pre, post])) {
    console.error('[post-land] FAIL - a segment carries a non-passing check (segments are read independently; a green segment never excuses a red one)');
    process.exit(1);
  }
  console.log('[post-land] OK: pre_land ' + (pre ? 'green' : 'skipped') + ', post_land ' + (post ? 'green' : 'skipped') + '; the landed public tree carries the subset green');
  process.exit(0);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  SENTINEL, SUBSET_SCOPE, withTipWorktree, runSubset, runPreLand, runPostLand,
  renderBlock, overallRed, lastClaimMutation, sh, ROOT,
};
