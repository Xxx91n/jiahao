'use strict';

// src/plan-contract.js -- ADR-0055 D-A/D-B/D-C planning surface.
//
// This is deliberately a small pure validator. Git-side merge evidence lives
// in scripts/check-plan-baseline.js because that is where process execution
// already exists in this repository.

const SCHEMA_VERSION = 1;
const COMMIT_RE = /^[0-9a-f]{7,64}$/;

function isCommit(value) {
  return typeof value === 'string' && COMMIT_RE.test(value);
}

function isTimestamp(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  return Number.isFinite(Date.parse(value));
}

function createWorkBaselineAnchor(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('work baseline anchor must be an object');
  }
  const anchor = {
    schema_version: SCHEMA_VERSION,
    base_commit: input.base_commit,
    latest_upstream_commit: input.latest_upstream_commit,
    checked_at: input.checked_at,
  };
  const problems = workBaselineAnchorProblems(anchor);
  if (problems.length > 0) {
    throw new Error('invalid work baseline anchor: ' + problems.join('; '));
  }
  return anchor;
}

function workBaselineAnchorProblems(input) {
  const problems = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['anchor must be an object'];
  }
  if (input.schema_version !== SCHEMA_VERSION) {
    problems.push('schema_version must be ' + SCHEMA_VERSION);
  }
  if (!isCommit(input.base_commit)) problems.push('base_commit must be a 7-64 character hex commit');
  if (!isCommit(input.latest_upstream_commit)) problems.push('latest_upstream_commit must be a 7-64 character hex commit');
  if (!isTimestamp(input.checked_at)) problems.push('checked_at must be a parseable timestamp');
  return problems;
}

function isPlanStale(anchor, currentUpstreamCommit) {
  if (!anchor || !isCommit(currentUpstreamCommit)) return true;
  return anchor.latest_upstream_commit !== currentUpstreamCommit;
}

module.exports = {
  SCHEMA_VERSION,
  createWorkBaselineAnchor,
  workBaselineAnchorProblems,
  isPlanStale,
  isCommit,
};
