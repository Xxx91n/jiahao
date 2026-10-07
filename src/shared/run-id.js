'use strict';
// src/shared/run-id.js - grill-t37 D-005.2: the run_id triple for per-run
// emitted artifacts (status inventory, leg timing). One builder shared by
// run-gates.js and run-test-gate.js so the two runners cannot drift into two
// run_id grammars.
//
// run_id = {judged_surface, tree_sha, runner_ctx} joined by '.':
//   judged_surface - which surface this run judged ('gates' | 'test'; a
//     --worktree/default form difference is encoded by the EMITTER, not here:
//     the two forms are different rows on different surfaces, never merged).
//   tree_sha       - the HEAD commit sha of the judged tree (the commit the
//     worktree descends from; dirty state is flagged in runner_ctx).
//   runner_ctx     - CI:   GITHUB_RUN_ID.GITHUB_RUN_ATTEMPT.GITHUB_JOB
//                          (re-run disambiguation + job/matrix dimension)
//                    local: HEAD.{dirty|clean}.{start-iso} (same-HEAD repeat
//                          runs disambiguate by start timestamp).
//
// The filename form sanitizes run_id (':' etc.) - the JSON field keeps the
// exact value, the filename is derived, never authoritative.
//
// All git/env access is injectable so tests run without a repo.

const { execFileSync } = require('child_process');

function defaultGit(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

// tree_sha: HEAD commit sha. Returns null when the tree has no HEAD
// (unborn branch / not a repo) - the caller decides honesty, not this module.
function treeSha(root, gitFn) {
  try {
    return (gitFn || defaultGit)(root, ['rev-parse', 'HEAD']);
  } catch (e) {
    return null;
  }
}

// dirty: the index+worktree differ from HEAD in any tracked path. Read-verb
// git call (porcelain), so it stays raw per the hermeticity convention.
function worktreeDirty(root, gitFn) {
  try {
    const out = (gitFn || defaultGit)(root, ['status', '--porcelain']);
    return out.trim().length > 0;
  } catch (e) {
    return true; // cannot prove clean -> declare dirty, never the reverse
  }
}

// opts: { surface, root, env, startedAt, gitFn }
// Returns { run_id, judged_surface, tree_sha, runner_ctx, file_safe }.
function buildRunId(opts) {
  const o = opts || {};
  if (typeof o.surface !== 'string' || !o.surface) {
    throw new Error('run-id: surface is required (judged_surface is a run_id component, not a decoration)');
  }
  const env = o.env || process.env;
  const root = o.root;
  const sha = treeSha(root, o.gitFn) || 'no-head';
  const started = o.startedAt || new Date();
  const iso = started.toISOString().replace(/:/g, '-');

  let ctx;
  if (env.GITHUB_ACTIONS || env.CI) {
    const rid = env.GITHUB_RUN_ID || 'no-run-id';
    const attempt = env.GITHUB_RUN_ATTEMPT || '1';
    const job = env.GITHUB_JOB || 'no-job';
    ctx = rid + '.' + attempt + '.' + job;
  } else {
    const state = worktreeDirty(root, o.gitFn) ? 'dirty' : 'clean';
    ctx = 'HEAD.' + state + '.' + iso;
  }
  const runId = o.surface + '.' + sha + '.' + ctx;
  return {
    run_id: runId,
    judged_surface: o.surface,
    tree_sha: sha,
    runner_ctx: ctx,
    file_safe: runId.replace(/[^A-Za-z0-9._-]/g, '-'),
  };
}

module.exports = { buildRunId, treeSha, worktreeDirty };
