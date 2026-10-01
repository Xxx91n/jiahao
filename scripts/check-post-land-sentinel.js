#!/usr/bin/env node
'use strict';
// scripts/check-post-land-sentinel.js - ADR-0092 D-S1 (grill-t35 D-004/D-007):
// the ASSERTION leg for the post-land-verify contract block.
//
// What it asserts, over committed closeout artifacts:
//   1. the '<!-- post-land-verify v1 -->' block is present;
//   2. BOTH segments are present and are read INDEPENDENTLY.
//
// Anti-masking (ADR-0091 D-D, carried into ADR-0092): pre_land and post_land
// are two assertions about two objects and neither can excuse the other. A
// green post_land next to a red pre_land is a FAILURE, not a pass - which is
// the whole point of splitting them, since the t34 defect class was precisely
// a green reading of the wrong object.
//
//   3. pre_land.ran_at >= the committer-date of the wave's LAST claim-surface
//      mutation. This is the mechanically assertable form of 'the battery was
//      re-run after the last change' (the merge-queue 'check SHA == merge
//      group SHA' shape): the timestamp must not predate the edit it verifies.
//
// TIMING / NON-RETROACTIVITY: prospective from this script's own registration
// commit. Artifacts committed before registration predate the convention and
// are never retro-convicted; an artifact not yet committed does not count as
// newest (mirrors the audit-surface temporal-scope precedent).
//
// ANTI-MASKING, stated again because it is load-bearing: this leg is
// DETECTIVE. The committer and the writer share a trust domain, so a
// self-declared ran_at catches FORGETFULNESS (nobody re-ran the battery) and
// not FORGERY. The forgery authority is git-show-level replay; the forgery
// defense is F-7 plus the second-party audit channel (defer-0030), which this
// SUBORDINATES to and never replaces - the sentinel shrinks the window a
// forgetful writer leaves, it does not close the window.
//
// Usage: node scripts/check-post-land-sentinel.js

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const { SENTINEL } = require('./check-post-land');

const ROOT = path.join(__dirname, '..');
const SELF_REL = 'scripts/check-post-land-sentinel.js';
const CLAIM_RE = /^\.scratch\/grill-[^/]+\/(reports|handoffs)\//;
const CLOSEOUT_RE = /(closeout|report)/;

const gitAt = (root) => (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

const gitOk = (root) => (args) => spawnSync('git', args, { cwd: root }).status === 0;

function registrationCommit(root) {
  const adds = gitAt(root)(['log', '--diff-filter=A', '--format=%H', '--', SELF_REL]).split('\n').filter(Boolean);
  return adds.length ? adds[adds.length - 1] : null;
}

// Pure: artifact text -> { pre, post }. Fail-closed on a malformed block, a
// missing segment, or a segment that is not an object with a checks array.
function extractSegments(text) {
  const s = text.indexOf(SENTINEL);
  if (s < 0) return { error: 'post-land-verify v1 block missing' };
  const body = text.slice(s);
  const grab = function (tag) {
    const marker = '<!-- segment: ' + tag + ' -->';
    const at = body.indexOf(marker);
    if (at < 0) return { error: 'segment ' + tag + ' missing (the two segments are read independently; one never substitutes for the other)' };
    const fence = body.indexOf('```json', at);
    if (fence < 0) return { error: 'segment ' + tag + ' has no json fence' };
    const end = body.indexOf('```', fence + 8);
    if (end < 0) return { error: 'segment ' + tag + ' json fence unterminated' };
    let obj;
    try { obj = JSON.parse(body.slice(fence + 8, end)); }
    catch (e) { return { error: 'segment ' + tag + ' is not valid JSON: ' + e.message }; }
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.checks)) {
      return { error: 'segment ' + tag + ' must be an object carrying a checks array' };
    }
    return { seg: obj };
  };
  const pre = grab('pre_land');
  if (pre.error) return { error: pre.error };
  const post = grab('post_land');
  if (post.error) return { error: post.error };
  return { pre: pre.seg, post: post.seg };
}

// Pure: one segment + the wave's last claim-mutation time -> errors for that
// segment ALONE. Splitting the evaluation is what makes anti-masking
// mechanical instead of a matter of reading order: a caller cannot accidentally
// let one segment's green absorb the other's red.
function judgeSegment(name, seg, ctx) {
  const errs = [];
  for (const c of seg.checks || []) {
    if (!c || typeof c.status !== 'string') { errs.push(name + ': a check entry lacks a status'); continue; }
    if (c.status !== 'pass') {
      errs.push(name + ': check ' + String(c.name) + ' is ' + c.status + ' - ' + String(c.detail || '').slice(0, 200));
    }
  }
  if (name === 'pre_land') {
    const ranAt = Date.parse(seg.ran_at || '');
    if (Number.isNaN(ranAt)) {
      errs.push('pre_land: ran_at is missing or unparseable (' + JSON.stringify(seg.ran_at) + ') - the run timestamp is a required field');
    } else if (ctx && typeof ctx.lastClaimMs === 'number') {
      if (ranAt < ctx.lastClaimMs) {
        errs.push('pre_land: ran_at (' + seg.ran_at + ') predates the wave\'s last claim-surface mutation (' + new Date(ctx.lastClaimMs).toISOString() +
          ') - the battery must run AFTER the last change it verifies');
      }
    }
    if (!seg.last_claim_mutation) {
      errs.push('pre_land: last_claim_mutation is absent - the wave\'s last claim mutation sha is a required field');
    }
  }
  if (name === 'post_land') {
    if (!/^[0-9a-f]{7,40}$/.test(String(seg.tip || ''))) {
      errs.push('post_land: tip is absent or not a sha (' + JSON.stringify(seg.tip) + ') - the landed tip must be named so the verdict is anchored to an object');
    }
  }
  return errs;
}

function checkSentinels(root) {
  const git = gitAt(root);
  const errors = [];
  const reg = registrationCommit(root);
  if (!reg) { errors.push('post-land-sentinel: registration commit not found (script never landed?)'); return { errors, checked: 0 }; }
  const regMs = Number(git(['log', '-1', '--format=%ct', reg])) * 1000;

  const files = git(['ls-files']).split('\n').filter((f) =>
    CLAIM_RE.test(f) && /\.md$/.test(f) && CLOSEOUT_RE.test(f));
  const inScope = [];
  for (const f of files) {
    let added = null;
    try { added = git(['log', '--diff-filter=A', '--format=%ct', '--', f]); } catch (e) { added = null; }
    const ms = added ? Number(added.split('\n').pop()) * 1000 : 0;
    // prospective: an artifact whose FIRST commit predates registration is out
    // of scope entirely (never retro-convicted).
    if (ms && ms < regMs) continue;
    inScope.push({ file: f, ms: ms });
  }
  inScope.sort(function (a, b) { return b.ms - a.ms; });
  if (!inScope.length) {
    console.log('[post-land-sentinel] OK: no in-scope closeout artifact yet (the convention applies forward from ' + reg.slice(0, 9) + ')');
    return { errors, checked: 0, reg: reg };
  }

  // Which artifact is judged. Round 2 selected the newest in-scope artifact by
  // add-date, which made the verdict depend on commit timestamps AND on an
  // alphabetical tie-break when two artifacts share a second - so the same tree
  // could pass alone and fail inside a full run. Selection is now by CONTENT:
  // the newest artifact that actually carries a post-land-verify block. An
  // artifact with no block is not the subject of this contract.
  const blockCarriers = [];
  for (const cand of inScope) {
    let txt = null;
    try { txt = fs.readFileSync(path.join(root, cand.file.split('/').join(path.sep)), 'utf8'); } catch (e) { txt = null; }
    if (txt && txt.indexOf(SENTINEL) !== -1) blockCarriers.push(cand);
  }
  if (!blockCarriers.length) {
    console.log('[post-land-sentinel] OK: no in-scope artifact carries a ' + SENTINEL +
      ' block yet (the convention applies forward from ' + reg.slice(0, 9) + ')');
    return { errors, checked: 0, reg: reg };
  }
  const latest = blockCarriers[0];
  const text = fs.readFileSync(path.join(root, latest.file.split('/').join(path.sep)), 'utf8');
  const parsed = extractSegments(text);
  if (parsed.error) {
    errors.push('post-land-sentinel: ' + latest.file + ' - ' + parsed.error);
    return { errors, checked: 0, reg: reg };
  }

  // WAVE context - REWRITTEN after the round-2 audit (R2-2).
  //
  // Round 1 bounded the wave by the block OWN declared last_claim_mutation. That
  // was wrong in a way the previous form was not: the check took its oracle from
  // the artifact it was auditing, so a stale block certified itself. Round-1 block
  // still named f3c56469 while two later claim commits had landed, and the leg
  // read green. The boundary of a freshness claim must come from HISTORY, and the
  // block declaration must be CHECKED AGAINST it.
  //
  // The derived truth is the latest claim-surface commit reachable from HEAD. Two
  // independent failures then become detectable, which is the point:
  //   1. STALE BLOCK - the declared boundary is not the latest claim commit, so the
  //      battery demonstrably did not run after the last change (R2-1);
  //   2. LATE RUN - ran_at predates that latest claim commit, so even a
  //      correctly-scoped block was produced before its last edit.
  //
  // The block-carrying commit is itself a claim-surface commit, so the latest claim
  // commit at HEAD is always one commit AFTER the ran_at it records. Making
  // failure 2 unsatisfiable again would be a regression, so the resolution is a
  // SAME-COMMIT requirement rather than a relaxed comparison: the block must be
  // regenerated against the settled tree and landed in the same commit as the last
  // claim change. The equality below forces that regen instead of documenting it.
  //
  // Derivation is anchored at the leg own registration commit (forward-only) and
  // uses the registered claim predicate, not a re-stated one.
  // The boundary: the newest claim-surface commit that is NOT the commit carrying
  // this block.
  //
  // Direction (round-2 audit R2-2): the truth is DERIVED from history and the
  // block declaration is the thing under test. Round 1 read the boundary out of
  // the block, so a stale block certified itself.
  //
  // Why the carrier is excluded: the commit that transports the block is itself a
  // claim-surface commit, and a commit cannot contain its own sha, so a block can
  // never legitimately name its own carrier. That single exclusion is what makes
  // a same-commit regeneration expressible at all.
  //
  // Why order does NOT matter: a claim commit that landed AFTER the block - even
  // one that does not touch the artifact - means the battery was not re-run after
  // the last change, which is exactly what the assertion exists to catch. So the
  // comparison set is every claim commit except the carrier, newest first,
  // regardless of whether it sits above or below the carrier in time.
  const claimCommits = function () {
    const shas = git(['rev-list', '--no-merges', reg + '..HEAD']).split('\n').filter(Boolean);
    const rows = [];
    for (const sha of shas) {
      const fl = git(['show', '--name-only', '--format=', sha]).split('\n').map((x) => x.trim()).filter(Boolean);
      if (!fl.some((f) => CLAIM_RE.test(f))) continue;
      rows.push({ sha: sha, ms: Number(git(['log', '-1', '--format=%ct', sha])) * 1000, files: fl });
    }
    rows.sort(function (a, b) { return b.ms - a.ms; });
    return rows;
  };
  const claimRows = claimCommits();
  const carrier = (claimRows.find(function (r) { return r.files.indexOf(latest.file) !== -1; }) || {}).sha || null;
  const expected = claimRows.filter(function (r) { return r.sha !== carrier; })[0] || null;
  const declaredSha = String(parsed.pre.last_claim_mutation || '');
  let lastClaimMs = null;
  if (!/^[0-9a-f]{7,40}$/.test(declaredSha)) {
    errors.push('post-land-sentinel: pre_land.last_claim_mutation is absent or not a sha (' +
      JSON.stringify(parsed.pre.last_claim_mutation) + ') - the wave boundary is a declared field and is CHECKED AGAINST history');
  } else if (!expected) {
    errors.push('post-land-sentinel: no claim-surface commit other than the block carrier was found since the leg registered (' + reg.slice(0, 9) + ')');
  } else {
    if (declaredSha !== expected.sha) {
      errors.push('post-land-sentinel: pre_land.last_claim_mutation ' + declaredSha.slice(0, 9) +
        ' is NOT the newest claim-surface commit other than this block carrier (' + expected.sha.slice(0, 9) +
        ') - the block is stale: re-run the battery after the last claim change and land the regenerated block in the same commit as that change (E-19 forbids announcing inside the exposure window)');
    }
    lastClaimMs = expected.ms;
  }
  const ctx = { lastClaimMs: lastClaimMs };

  // Read the two segments INDEPENDENTLY and report both verdicts.
  const preErrs = judgeSegment('pre_land', parsed.pre, ctx);
  const postErrs = judgeSegment('post_land', parsed.post, ctx);
  errors.push.apply(errors, preErrs);
  errors.push.apply(errors, postErrs);
  return { errors, checked: 1, file: latest.file, reg: reg, preErrs: preErrs, postErrs: postErrs };
}

function main() {
  requireCapabilities('post-land-sentinel');
  const out = checkSentinels(ROOT);
  for (const e of out.errors) console.error('FAIL: ' + e);
  if (out.errors.length) process.exit(1);
  if (out.checked) {
    console.log('[post-land-sentinel] OK: ' + out.file + ' carries both post-land-verify segments; pre_land and post_land read independently (no masking)');
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { extractSegments, judgeSegment, checkSentinels, registrationCommit, SENTINEL };
