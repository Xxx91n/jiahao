#!/usr/bin/env node
'use strict';
// scripts/check-expected-red.js - grill-t37 T-7 (D-001.2): the expected-red
// registration channel's mechanical guard, plus the C-1 escalation-hook
// evaluator (D-003.5: the N-run hook hangs on a deferred-registry row,
// per-row N - never a global constant).
//
// Registry: docs/governance/expected-red.json
//   codes_enum - CLOSED set; an entry's reason_code outside it is a
//     registry violation (capability naming discipline, D-003.1 isomorph).
//   entries[]  - {key, reason_code, expires_at, approved_by, registered_at,
//     note}. key = the inventory join key verbatim
//     (unit_kind::filepath::suite::name; gate legs are
//     'gate-leg:<name>'-shaped: 'gate-leg::::::post-land-sentinel').
//
// Mechanical predicate (the test every consumer shares): a red is a legal
// expected red iff registered AND unexpired AND code-in-set. Expired rows
// stop certifying and are named, never silently dropped.
//
// Escalation-hook evaluation (D-003.5 + D-003.7): deferred-registry entries
// MAY carry an appended field
//   escalation_hook: { reason_code, key_prefix, consecutive_runs }
// which this leg evaluates against the emitted inventory history under
// test-artifacts/status-inventory/: N consecutive runs whose inventory rows
// for keys matching key_prefix carry reason_code X fire the trigger. A fired
// trigger is a TRIGGERED report line (owner adjudication point - never an
// automatic semantic flip), evaluated per-row.
//
// Usage: node scripts/check-expected-red.js [NOW_ISO]

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const inv = require('../src/shared/status-inventory');

const ROOT = path.join(__dirname, '..');
const REGISTRY_ABS = path.join(ROOT, inv.EXPECTED_RED_RELS.split('/').join(path.sep));
const DEFERRED_ABS = path.join(ROOT, 'docs', 'deferred-registry.json');
const ARTIFACT_DIR = path.join(ROOT, 'test-artifacts', 'status-inventory');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s) { const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }

function validateShape(reg) {
  const errors = [];
  if (!reg || typeof reg !== 'object' || Array.isArray(reg)) return ['registry is not an object'];
  if (reg.schema_version !== 1) errors.push('schema_version must be 1');
  if (typeof reg._doc !== 'string' || reg._doc.length < 40) errors.push('_doc header missing or too short - a closed-set registry must carry its own discipline');
  if (!Array.isArray(reg.codes_enum) || !reg.codes_enum.length) {
    errors.push('codes_enum must be a non-empty closed set');
  } else {
    for (const c of reg.codes_enum) {
      if (typeof c !== 'string' || !/^[a-z][a-z0-9-]*$/.test(c)) errors.push('codes_enum member ' + JSON.stringify(c) + ' is not a code-shaped token');
    }
    const seen = new Set();
    for (const c of reg.codes_enum) { if (seen.has(c)) errors.push('codes_enum duplicate: ' + c); seen.add(c); }
  }
  if (!Array.isArray(reg.entries)) { errors.push('entries must be an array'); return errors; }
  const keys = new Set();
  for (const e of reg.entries) {
    const tag = e && typeof e.key === 'string' ? e.key : '(no key)';
    if (!e || typeof e !== 'object') { errors.push(tag + ': entry must be an object'); continue; }
    if (typeof e.key !== 'string' || !e.key.includes('::')) errors.push(tag + ': key must be an inventory join key (unit_kind::...) verbatim');
    else if (keys.has(e.key)) errors.push(tag + ': duplicate key');
    keys.add(e.key);
    if (typeof e.reason_code !== 'string' || (Array.isArray(reg.codes_enum) && reg.codes_enum.indexOf(e.reason_code) === -1)) {
      errors.push(tag + ': reason_code ' + JSON.stringify(e.reason_code) + ' is outside codes_enum - out-of-set is a registry violation (D-001.2)');
    }
    if (typeof e.expires_at !== 'string' || !ISO_DATE.test(e.expires_at) || !isRealDate(e.expires_at)) {
      errors.push(tag + ': expires_at must be a real ISO date YYYY-MM-DD (deadline is mandatory - an undeadline expected-red is a permanent exemption)');
    }
    if (typeof e.approved_by !== 'string' || e.approved_by.length < 10) {
      errors.push(tag + ': approved_by must point at the owner-approval line (ledger/ADR/commit pointer, >=10 chars) - the channel exists to prevent self-approved expected reds');
    }
    if (typeof e.registered_at !== 'string' || !ISO_DATE.test(e.registered_at) || !isRealDate(e.registered_at)) {
      errors.push(tag + ': registered_at must be a real ISO date');
    }
  }
  return errors;
}

function validateFreshness(reg, now) {
  const errors = [];
  const warnings = [];
  for (const e of reg.entries || []) {
    if (!e || typeof e.expires_at !== 'string' || !ISO_DATE.test(e.expires_at)) continue;
    if (e.expires_at < now) {
      errors.push(e.key + ': STALE - expires_at ' + e.expires_at + ' is before ' + now +
        ' (an expired expected-red certifies nothing: re-register with owner approval, or let the red read honestly)');
    }
  }
  return { errors: errors, warnings: warnings };
}

// Deferred-registry escalation_hook appended-field shape check + evaluation.
// Shape: {reason_code in REASON_CODES, key_prefix non-empty, consecutive_runs int>=2}
function validateHooks(defReg) {
  const errors = [];
  for (const e of (defReg && defReg.entries) || []) {
    if (!e || e.escalation_hook === undefined) continue;
    const tag = (e.id || '?') + '.escalation_hook';
    const h = e.escalation_hook;
    if (!h || typeof h !== 'object') { errors.push(tag + ': must be an object'); continue; }
    if (typeof h.reason_code !== 'string' || inv.REASON_CODES.indexOf(h.reason_code) === -1) {
      errors.push(tag + ': reason_code ' + JSON.stringify(h.reason_code) + ' outside the C-1 closed set [' + inv.REASON_CODES.join(', ') + ']');
    }
    if (typeof h.key_prefix !== 'string' || !h.key_prefix) errors.push(tag + ': key_prefix must be a non-empty join-key prefix');
    if (!Number.isInteger(h.consecutive_runs) || h.consecutive_runs < 2) errors.push(tag + ': consecutive_runs must be an integer >= 2 (a single occurrence is a fact, not a trigger)');
  }
  return errors;
}

// Evaluate hooks: newest-first artifact history; a hook fires when the last
// N consecutive artifacts (newest backward, per surface) each carry at least
// one row matching {key_prefix, reason_code}. Emission gaps (a surface with
// no artifacts) skip without judgment - absence of history is not a streak.
// grill-t37 rework F-3: the artifact directory mixes surfaces on mtime, so
// the streak must be evaluated inside each judged_surface's own sequence -
// an interleaved other-surface artifact is not a break.
function evaluateHooks(defReg, artifactDir) {
  const dir = artifactDir || ARTIFACT_DIR;
  const fired = [];
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return fired; }
  const files = names.filter(function (n) { return n.indexOf('status-inventory.') === 0 && n.slice(-5) === '.json'; })
    .map(function (n) { return { n: n, ms: fs.statSync(path.join(dir, n)).mtimeMs }; })
    .sort(function (a, b) { return b.ms - a.ms; });
  const bySurface = new Map();
  for (const f of files) {
    let a;
    try { a = JSON.parse(fs.readFileSync(path.join(dir, f.n), 'utf8')); }
    catch (e) { continue; } // a corrupt artifact is skipped, never counted either way
    const surface = a && a.judged_surface;
    if (typeof surface !== 'string' || !surface) continue;
    if (!bySurface.has(surface)) bySurface.set(surface, []);
    bySurface.get(surface).push(a);
  }
  for (const e of (defReg && defReg.entries) || []) {
    const h = e && e.escalation_hook;
    if (!h || typeof h !== 'object' || !h.key_prefix || !h.reason_code || !Number.isInteger(h.consecutive_runs)) continue;
    let maxStreak = 0;
    for (const seq of bySurface.values()) {
      let streak = 0;
      for (const a of seq) {
        const rows = Array.isArray(a.rows) ? a.rows : [];
        const hit = rows.some(function (r) {
          return r && typeof r.reason_code === 'string' && r.reason_code === h.reason_code &&
            inv.joinKey(r).indexOf(h.key_prefix) === 0;
        });
        if (hit) streak++; else break; // consecutive means consecutive
        if (streak >= h.consecutive_runs) break;
      }
      if (streak > maxStreak) maxStreak = streak;
    }
    if (maxStreak >= h.consecutive_runs) {
      fired.push((e.id || '?') + ': escalation_hook FIRED - ' + h.consecutive_runs +
        ' consecutive runs with reason_code ' + h.reason_code + ' under ' + h.key_prefix +
        ' - forced adjudication point (owner: activate / accept / flip semantics)');
    }
  }
  return fired;
}

function main(argv) {
  requireCapabilities(['repo-tree']);
  const now = (argv && argv[2]) || process.env.EXPECTED_RED_NOW || new Date().toISOString().slice(0, 10);
  let reg;
  try { reg = JSON.parse(fs.readFileSync(REGISTRY_ABS, 'utf8')); }
  catch (e) {
    console.error('FAIL: expected-red registry unreadable: ' + e.message + ' (the registration channel fails closed - an unreadable registry means no expected red is legal)');
    process.exit(1);
  }
  let defReg = null;
  try { defReg = JSON.parse(fs.readFileSync(DEFERRED_ABS, 'utf8')); } catch (e) { defReg = null; }

  let errors = validateShape(reg);
  errors = errors.concat(validateFreshness(reg, now).errors);
  if (defReg) errors = errors.concat(validateHooks(defReg));

  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  const fired = defReg ? evaluateHooks(defReg) : [];
  for (const f of fired) console.log('TRIGGERED: ' + f);
  console.log('[expected-red] OK: ' + reg.entries.length + ' registered row(s), ' + reg.codes_enum.length + '-code closed set' +
    (fired.length ? ', ' + fired.length + ' escalation hook(s) TRIGGERED' : ''));
  process.exit(0);
}

if (require.main === module) main(process.argv);

module.exports = { validateShape, validateFreshness, validateHooks, evaluateHooks, REGISTRY_ABS };
