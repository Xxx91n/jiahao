'use strict';
// test/helpers/git-hermetic.js - grill-t29 D-004 (F-14 candidate): ambient-config
// hermetic git for test-side repositories. Every git WRITE op in test/**.js
// routes through this helper (lint-enforced by scripts/check-test-git-hermetic.js):
//
//   - identity is injected per invocation (-c user.email / -c user.name), so a
//     machine without a global git identity (the CI failure class that
//     motivated this) cannot fail on commit/tag/commit-tree;
//   - GIT_CONFIG_NOSYSTEM/GIT_CONFIG_GLOBAL/GIT_CONFIG_SYSTEM isolation keeps
//     ambient config (autocrlf, fsmonitor, signing hooks, aliases) out of
//     fixture repos entirely - the fixture sees a hermetic git, not the host's.
//
// Read-only ops may still spawn git directly (the lint leg whitelists the
// read verb set); anything that writes - or whose argv is not statically a
// read - routes here.
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const IDENT = ['-c', 'user.email=jiahao-test@localhost', '-c', 'user.name=jiahao-test'];

function hermeticEnv() {
  return Object.assign({}, process.env, {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: os.devnull,
    GIT_CONFIG_SYSTEM: os.devnull,
  });
}

// execFileSync wrapper: throws on non-zero, returns trimmed stdout.
function git(dir, args) {
  return execFileSync('git', IDENT.concat(args), {
    cwd: dir, env: hermeticEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

// spawnSync wrapper: boolean status only (probe-style).
function gitOk(dir, args) {
  return spawnSync('git', IDENT.concat(args), { cwd: dir, env: hermeticEnv() }).status === 0;
}

// Fresh temp-repo init with fixture-safe defaults.
function mkRepo(dir) {
  git(dir, ['init', '-q']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
}

module.exports = { git, gitOk, mkRepo, IDENT, hermeticEnv };
