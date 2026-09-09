#!/usr/bin/env node
'use strict';

// scripts/check-plan-baseline.js -- ADR-0055 D-C speculative merge evidence.
//
// Usage: node scripts/check-plan-baseline.js <plan.json> [current-upstream]
//
// The check is non-destructive. It validates the plan anchor, confirms the
// referenced commits exist, and reports the merge base plus merge-tree result.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createWorkBaselineAnchor } = require('../src/plan-contract');

const ROOT = path.join(__dirname, '..');

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function commitExists(commit) {
  try {
    git(['cat-file', '-e', commit + '^{commit}']);
    return true;
  } catch (e) {
    return false;
  }
}

function mergeEvidence(baseCommit, latestCommit) {
  let mergeBase = null;
  try {
    mergeBase = git(['merge-base', baseCommit, latestCommit]);
  } catch (e) {
    mergeBase = null;
  }
  let mergeable = false;
  let conflict = false;
  try {
    const output = git(['merge-tree', mergeBase || baseCommit, baseCommit, latestCommit]);
    conflict = /^(<<<<<<<|CONFLICT)/m.test(output);
    mergeable = !conflict;
  } catch (e) {
    conflict = true;
    mergeable = false;
  }
  return { merge_base: mergeBase, mergeable: mergeable, conflict: conflict };
}

function main() {
  const planPath = process.argv[2];
  if (!planPath) {
    console.error('usage: node scripts/check-plan-baseline.js <plan.json> [current-upstream]');
    process.exit(2);
  }
  let raw;
  try {
    raw = fs.readFileSync(path.resolve(ROOT, planPath), 'utf8');
  } catch (e) {
    console.error('[plan-baseline] cannot read plan: ' + e.message);
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    console.error('[plan-baseline] plan is not valid JSON: ' + e.message);
    process.exit(2);
  }
  let anchor;
  try {
    anchor = createWorkBaselineAnchor(input);
  } catch (e) {
    console.error('[plan-baseline] ' + e.message);
    process.exit(1);
  }
  if (!commitExists(anchor.base_commit) || !commitExists(anchor.latest_upstream_commit)) {
    console.error('[plan-baseline] referenced commit is unavailable');
    process.exit(1);
  }

  let currentUpstream;
  try {
    currentUpstream = process.argv[3] || git(['rev-parse', 'HEAD']);
  } catch (e) {
    console.error('[plan-baseline] current upstream unavailable: ' + e.message);
    process.exit(1);
  }
  const stale = anchor.latest_upstream_commit !== currentUpstream;
  const evidence = mergeEvidence(anchor.base_commit, anchor.latest_upstream_commit);
  const result = {
    anchor: anchor,
    current_upstream_commit: currentUpstream,
    stale: stale,
    merge_base: evidence.merge_base,
    mergeable: evidence.mergeable,
  };
  console.log(JSON.stringify(result));
  if (stale || !evidence.mergeable) process.exit(1);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { mergeEvidence, commitExists };
