#!/usr/bin/env node
'use strict';
// scripts/check-claim-surface-roles.js - ADR-0093 D-5 (grill-t36 D-005): the leg
// that asserts THE REGISTRY ITSELF, because a registry nobody checks is a
// registry nobody can trust, and trusting it before it has been tested is the
// coexistence window ADR-0083 D-003 forbids.
//
// What it asserts, over docs/governance/claim-surface-roles.json and the tracked
// claim surface (git ls-files n CLAIM_RE):
//   1. the schema: header fields, schema_version, the declared roles_enum equal
//      to the closed enum in code (no silent widening of the set), and the
//      ADR-0086 three-class field governance the ledger names;
//   2. `generated_from` appears NOWHERE - the registry is a declared-facts
//      surface, and a derived-artifact stamp on it is the confusion D-003 and
//      D-005 each forbid from their own side;
//   3. per row: literal claim-surface path, role inside the closed enum,
//      declared_by present (the declaration rests on two surfaces - the row and
//      the landing channel, git author/committer shape), declared_at, and a
//      status legal for that role;
//   4. the exception channel on examiner rows: a pending request carries the
//      ADR-0086 fields, and a ratified row names a ratified_by that may not
//      equal declared_by - the mechanical form of "the agent registers and
//      reports; it never self-certifies";
//   5. THE FAIL-CLOSED DIRECTION: every tracked claim-surface artifact has a
//      row, and every non-archived row's path exists in the tree.
//
// Disclosures printed on every run (never a verdict, always visible state):
// the per-role row counts, and the examiner class split by lifecycle status - so
// a reader of CI output can see how much of the owner-ratified class is still
// only requested.
//
// Usage: node scripts/check-claim-surface-roles.js

const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const lib = require('./shared/claim-surface-roles');

const ROOT = path.join(__dirname, '..');

function run(root) {
  const loaded = lib.loadRegistry(root);
  if (loaded.parseError) return { errors: [loaded.parseError], counts: null, examiner: null };
  let tracked;
  try {
    tracked = lib.claimSurfacePaths(root);
  } catch (e) {
    return { errors: ['tracked claim-surface enumeration failed (' + e.message + ') - the registry asserts over a surface it could not read'], counts: null, examiner: null };
  }
  return {
    errors: lib.validateRegistry(loaded.registry, { trackedClaimPaths: tracked }),
    counts: lib.roleCounts(loaded.registry),
    examiner: lib.examinerStatusCounts(loaded.registry),
    rows: loaded.registry.entries.length,
    tracked: tracked.length,
  };
}

if (require.main === module) {
  requireCapabilities('claim-surface-roles');
  const out = run(ROOT);
  for (const e of out.errors) console.error('FAIL: claim-surface-roles: ' + e);
  if (out.errors.length) {
    console.error('The registry is a declared-facts surface: a claim-surface artifact with no row is an error, and a new artifact lands in the same commit as its row.');
    process.exit(1);
  }
  console.log('[claim-surface-roles] OK: ' + out.rows + ' rows cover all ' + out.tracked +
    ' tracked claim-surface artifacts (every registered path exists; every role is inside the closed enum)');
  console.log('[claim-surface-roles] rows by role: examiner=' + out.counts.examiner +
    ' implementer=' + out.counts.implementer + ' mechanical=' + out.counts.mechanical);
  console.log('[claim-surface-roles] examiner class by lifecycle: pending-confirmation=' + out.examiner['pending-confirmation'] +
    ' ratified=' + out.examiner.ratified + ' revoked=' + out.examiner.revoked + ' lapsed=' + out.examiner.lapsed +
    ' - the class is owner-ratified; the registering agent may request a row, never self-certify one');
  process.exit(0);
}

module.exports = { run };
