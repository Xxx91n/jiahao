'use strict';
// scripts/shared/claim-surface-roles.js - ADR-0093 D-5 (grill-t36 D-005): the
// claim-surface ROLE REGISTRY - one loader, one closed role enum, one range
// predicate, and the pure validators both consumers and the registry leg share.
//
// WHY A REGISTRY (the lesion, restated in code): role attribution used to be
// inferred from filename shape, so naming an artifact changed its governance.
// The registry makes attribution a DECLARED fact read from one committed
// surface, which is what retires the filename selectors registered by ADR-0091
// D-E and ADR-0092 D-S1.
//
// DECLARED FACTS, NOT DERIVED: `generated_from` is FORBIDDEN in this file. D-003
// stamps that field on artifacts a generator produced; role attribution is a
// discretionary judgment with no mechanical source - if it were derivable, this
// registry would not exist. validateRegistry enforces the prohibition instead of
// trusting the convention.
//
// FAIL-CLOSED DIRECTION: a claim-surface artifact with NO row is an error. The
// anti-forgery boundary lives in the consumer: a file that calls itself an
// examiner's report is invisible to a checker that reads only examiner rows, so
// asserting the registry cannot catch it and only this reverse enumeration can
// (ADR-0093 D-5; SLSA's Mini-Shai-Hulud lesson).
//
// ENUMERATION BASE: `git ls-files` (tracked) intersected with CLAIM_RE. This is
// the tracked base ADR-0093 D-1 uses for tracked text, and CLAIM_RE is the range
// predicate the post-land sentinel already carried - a RANGE assertion ("is this
// path on a claim surface?"), deliberately not a role assertion: dropping it
// would widen what the sentinel treats as claim surface. Both live here now so
// the two consumers cannot drift into two range predicates.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REGISTRY_REL = 'docs/governance/claim-surface-roles.json';

// The closed role enum. Adding a name is a Declaration, never a convenience:
// the registry pre-registers owner discretionary decisions and countersign
// records as the expected growth directions, and the set does not open on
// convenience (ADR-0093 D-5).
const ROLES = Object.freeze(['examiner', 'implementer', 'mechanical']);

// Row lifecycle. implementer/mechanical rows are registrations: `active`, or
// `archived` when the artifact leaves the claim surface (rows accumulate, they
// are never deleted - honest history; deleting a row is an owner act plus a
// Declaration). examiner rows ride the ADR-0086 exception-channel lifecycle,
// where the agent may REQUEST but never self-certify.
const STATUS_BY_ROLE = Object.freeze({
  examiner: Object.freeze(['pending-confirmation', 'ratified', 'revoked', 'lapsed']),
  implementer: Object.freeze(['active', 'archived']),
  mechanical: Object.freeze(['active', 'archived']),
});

// The exception-channel fields an examiner row must carry (ADR-0086 shape:
// status / requested_by / reason / expires_at / scope). A `pending-confirmation`
// examiner row is a request; only owner ratification promotes it, and
// `ratified` additionally names `ratified_by`, which may never equal
// `declared_by` - that inequality is the mechanical form of "the agent
// registers and reports; it never self-certifies".
const EXAMINER_REQUEST_FIELDS = Object.freeze(['requested_by', 'reason', 'expires_at', 'scope']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WILDCARD = /[*?%[\]{}]/;

// The retained claim-surface range predicate (ADR-0092 D-S1's CLAIM_RE, single
// implementation).
const CLAIM_RE = /^\.scratch\/grill-[^/]+\/(reports|handoffs)\//;

// Field-level governance, three classes inherited from ADR-0086. The path->role
// mapping is fenced; examiner rows are the exception channel; the descriptive
// header fields are editorial. validateRegistry asserts that the ledger's classes
// are the ones declared, so the governance split cannot quietly erode into
// "everything is editable".
const REQUIRED_FIELD_GOVERNANCE = Object.freeze({
  'entries[].path': 'fenced',
  'entries[].role': 'fenced',
  'entries[].status': 'fenced',
  'entries[].declared_by': 'fenced',
  'entries[].examiner_channel': 'exception-channel',
  '_doc': 'editorial',
  'source_adr': 'editorial',
  'schema_version': 'editorial',
});

// Tracked claim-surface paths: `git ls-files` (the tracked base) intersected
// with CLAIM_RE. A read-verb git call, so it stays raw (the ADR-0086 hermeticity
// wrapper covers WRITE verbs only).
function claimSurfacePaths(root) {
  const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter(function (f) { return CLAIM_RE.test(f); });
}

// Deep scan for a forbidden key. `generated_from` anywhere in the registry is an
// error: a derived-artifact provenance stamp on a declared-facts surface is the
// exact confusion D-003 and D-005 each forbid from their own side.
function findKey(obj, key, trail, hits) {
  if (!obj || typeof obj !== 'object') return hits;
  for (const k of Object.keys(obj)) {
    const p = trail ? trail + '.' + k : k;
    if (k === key) hits.push(p);
    findKey(obj[k], key, p, hits);
  }
  return hits;
}

function isLiteralClaimPath(p) {
  return typeof p === 'string' && p.length > 0 && CLAIM_RE.test(p) &&
    p.indexOf('..') === -1 && p.charAt(0) !== '/' && p.indexOf('\\') === -1 && !WILDCARD.test(p);
}

function roleOf(registry, rel) {
  const entries = (registry && registry.entries) || [];
  for (const e of entries) if (e && e.path === rel) return e.role;
  return null;
}

// Rows a consumer may select on. `archived` rows are history: they keep the path
// on the record (ratchet monotonicity - rows only accumulate) but are not live
// claim surface.
function activeEntries(registry) {
  return ((registry && registry.entries) || []).filter(function (e) { return e && e.status !== 'archived'; });
}

function registeredPaths(registry) {
  return activeEntries(registry).map(function (e) { return e.path; });
}

// The reverse (fail-closed) assertion: every tracked claim-surface artifact needs
// a row. This is the direction that catches a self-labelled examiner file.
function unregisteredPaths(registry, trackedClaimPaths) {
  const have = {};
  for (const p of registeredPaths(registry)) have[p] = true;
  return trackedClaimPaths.filter(function (p) { return !have[p]; });
}

function roleCounts(registry) {
  const counts = { examiner: 0, implementer: 0, mechanical: 0 };
  for (const e of (registry && registry.entries) || []) {
    if (e && Object.prototype.hasOwnProperty.call(counts, e.role)) counts[e.role]++;
  }
  return counts;
}

function examinerStatusCounts(registry) {
  const counts = { 'pending-confirmation': 0, ratified: 0, revoked: 0, lapsed: 0 };
  for (const e of (registry && registry.entries) || []) {
    if (e && e.role === 'examiner' && Object.prototype.hasOwnProperty.call(counts, e.status)) counts[e.status]++;
  }
  return counts;
}

function loadRegistry(root) {
  const full = path.join(root, REGISTRY_REL.split('/').join(path.sep));
  let registry = null;
  let parseError = null;
  try {
    registry = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    parseError = 'registry unreadable or unparseable (' + e.message + ') - the declared-facts surface failed to load';
  }
  return { registry: registry, parseError: parseError };
}

// Pure validation. `opts.trackedClaimPaths` supplies the enumeration base; with
// it, the fail-closed direction is asserted too. Every check fails closed: a
// missing or malformed structure is an error, never a skipped check.
function validateRegistry(registry, opts) {
  const o = opts || {};
  const errors = [];

  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    return ['registry is not an object - the declared-facts surface failed to load'];
  }
  for (const f of ['_doc', 'source_adr']) {
    if (typeof registry[f] !== 'string' || !registry[f].trim()) errors.push(f + ': required header field missing or empty');
  }
  if (registry.schema_version !== 1) errors.push('schema_version: expected 1, got ' + JSON.stringify(registry.schema_version));

  for (const hit of findKey(registry, 'generated_from', '', [])) {
    errors.push(hit + ': the registry is a declared-facts surface - generated_from is forbidden here (ADR-0093 D-5 / D-003)');
  }

  if (!Array.isArray(registry.roles_enum)) {
    errors.push('roles_enum: missing - the closed role enumeration must be declared in the registry as well as in code');
  } else if (registry.roles_enum.join('|') !== ROLES.join('|')) {
    errors.push('roles_enum: ' + JSON.stringify(registry.roles_enum) + ' does not equal the closed enum [' + ROLES.join(', ') +
      '] - widening or reordering it is a Declaration, not an edit');
  }

  const fg = registry.field_governance && registry.field_governance.classification;
  if (!fg || typeof fg !== 'object') {
    errors.push('field_governance.classification: missing - the three-class split (fenced / exception-channel / editorial) is load-bearing (ADR-0086)');
  } else {
    for (const field of Object.keys(REQUIRED_FIELD_GOVERNANCE)) {
      if (fg[field] !== REQUIRED_FIELD_GOVERNANCE[field]) {
        errors.push('field_governance.classification.' + field + ': expected ' + REQUIRED_FIELD_GOVERNANCE[field] +
          ', got ' + JSON.stringify(fg[field]) + ' - the governance split is declared, not conventional');
      }
    }
  }

  if (!Array.isArray(registry.entries) || !registry.entries.length) {
    errors.push('entries: missing or empty - the registry is the assertion object, not an optional annotation');
    return errors;
  }

  const seen = {};
  let prevPath = null;
  registry.entries.forEach(function (e, i) {
    const tag = 'entries[' + i + ']';
    if (!e || typeof e !== 'object' || Array.isArray(e)) { errors.push(tag + ': entry must be an object'); return; }
    if (!isLiteralClaimPath(e.path)) {
      errors.push(tag + '.path: ' + JSON.stringify(e.path) + ' is not a literal repo-relative claim-surface path (CLAIM_RE, no wildcards, no .., no leading /)');
    }
    if (ROLES.indexOf(e.role) === -1) {
      errors.push(tag + '.role: ' + JSON.stringify(e.role) + ' is outside the closed enum [' + ROLES.join(', ') + ']');
    }
    if (typeof e.declared_by !== 'string' || !e.declared_by.trim()) {
      errors.push(tag + '.declared_by: required - the declaration rests on two surfaces (the row and the landing channel), git author/committer shape');
    }
    if (typeof e.declared_at !== 'string' || !ISO_DATE.test(e.declared_at)) {
      errors.push(tag + '.declared_at: must be an ISO date YYYY-MM-DD');
    }
    const allowed = STATUS_BY_ROLE[e.role];
    if (!allowed) {
      errors.push(tag + '.status: ' + JSON.stringify(e.status) + ' cannot be judged - role ' + JSON.stringify(e.role) + ' is outside the closed enum');
    } else if (allowed.indexOf(e.status) === -1) {
      errors.push(tag + '.status: ' + JSON.stringify(e.status) + ' not in the ' + e.role + ' status enum [' + allowed.join('|') + ']');
    }
    if (e.role === 'examiner') {
      // The exception channel: a request carries the ADR-0086 fields; a ratified
      // row names its ratifier, and the ratifier may not be the declarer. This is
      // where "never self-certify" stops being a sentence and becomes a check.
      if (e.status === 'pending-confirmation') {
        for (const f of EXAMINER_REQUEST_FIELDS) {
          if (typeof e[f] !== 'string' || !e[f].trim()) errors.push(tag + '.' + f + ': required on a pending examiner request (ADR-0086 channel schema)');
        }
        if (typeof e.expires_at === 'string' && e.expires_at && !ISO_DATE.test(e.expires_at)) {
          errors.push(tag + '.expires_at: must be an ISO date YYYY-MM-DD');
        }
        // ADR-0086's channel is literal-scope only: a wildcard scope is how an
        // exception quietly becomes an exemption.
        if (typeof e.scope === 'string' && (WILDCARD.test(e.scope) || e.scope.indexOf('..') !== -1 || e.scope.charAt(0) === '/')) {
          errors.push(tag + '.scope: must be a literal repo-relative path (no wildcards, no .., no leading /) - the channel is literal-scope only');
        }
      }
      if (e.status === 'ratified') {
        if (typeof e.ratified_by !== 'string' || !e.ratified_by.trim()) {
          errors.push(tag + '.ratified_by: required - the owner ratifies an examiner row; it does not take effect on the declarer\'s word');
        } else if (typeof e.declared_by === 'string' && e.ratified_by === e.declared_by) {
          errors.push(tag + '.ratified_by equals declared_by: self-certification - the agent registers and reports, it never self-certifies');
        }
      }
    } else if (e.ratified_by !== undefined || e.requested_by !== undefined) {
      errors.push(tag + ': the exception-channel fields belong to examiner rows only (' + e.role + ' row)');
    }
    if (e.path !== undefined) {
      if (seen[e.path]) errors.push(tag + '.path: duplicate row for ' + e.path);
      seen[e.path] = true;
      if (prevPath !== null && e.path < prevPath) {
        errors.push(tag + '.path: entries are not sorted (' + JSON.stringify(e.path) + ' after ' + JSON.stringify(prevPath) +
          ') - a registry whose diff cannot be read is a registry nobody reviews');
      }
      prevPath = e.path;
    }
  });

  if (o.trackedClaimPaths) {
    const trackedSet = {};
    o.trackedClaimPaths.forEach(function (p) { trackedSet[p] = true; });
    for (const p of unregisteredPaths(registry, o.trackedClaimPaths)) {
      errors.push(p + ': tracked claim-surface artifact with NO registry row - fail-closed (a new artifact and its row land in the same commit)');
    }
    for (const e of registry.entries) {
      if (!e || typeof e !== 'object' || e.path === undefined) continue;
      if (e.status === 'archived') continue; // history rows may outlive their path
      if (!trackedSet[e.path]) {
        errors.push(e.path + ': registered path is not a tracked claim-surface artifact in the tree - every registered path must exist in the tree');
      }
    }
  }
  return errors;
}

module.exports = {
  REGISTRY_REL,
  ROLES,
  STATUS_BY_ROLE,
  EXAMINER_REQUEST_FIELDS,
  REQUIRED_FIELD_GOVERNANCE,
  CLAIM_RE,
  ISO_DATE,
  claimSurfacePaths,
  findKey,
  validateRegistry,
  loadRegistry,
  activeEntries,
  registeredPaths,
  roleOf,
  roleCounts,
  examinerStatusCounts,
  unregisteredPaths,
};
