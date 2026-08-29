#!/usr/bin/env node
// check-deferred.js - ADR-0033 deferred/unfreeze registry guard (zero-dependency).
//
// (a) shape: schema_version/_doc; entries carry id/subject/source_adr/rationale/
//     unfreeze_if{type,check,verified_by?}/review_at/status (ADR-0033 D2).
// (b) semantics (D3): confirmatory fail-closed; external-event and free-text
//     predicates are not machine-evaluable -> status must be pending-evaluation
//     (tracked, time-boxed, never silently whitelisted); presence-condition and
//     count-threshold keep status deferred.
// (c) freshness (D4): review_at expiry = STALE fail-closed (k8s feature-gate
//     semantics: activate / re-defer with new review_at / remove; no 4th exit).
// (d) anchors: existence-based - source_adr file must exist and the entry id
//     must appear in some ADR text or CONTEXT.md (dangling registration fails).
// (e) threshold link: a thresholds.json gate with tier deferred-with-unfreeze
//     must be registered here via thresholds_gate (D2 zero-tolerance schema
//     reservation; current tier set is empty).
// (f) coupling (ADR-0027 D2 shared rule): registry diff without a same-range
//     ADR/CONTEXT change fails (only when a base ref is available).
//
// Usage: node scripts/check-deferred.js [BASE_REF]

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { couplingViolation } = require('./check-bench-thresholds');

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('docs', 'deferred-registry.json');
const THRESHOLDS_REL = path.join('bench', 'polygraph', 'thresholds.json');
const ID_RE = new RegExp('^defer-[0-9]{4}$');
const ISO_DATE = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
const TYPES = ['presence-condition', 'count-threshold', 'external-event', 'free-text'];
const NON_EVALUABLE = ['external-event', 'free-text'];
const STATUSES = ['deferred', 'pending-evaluation'];

function loadRegistry() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));
}

function validateShape(cfg) {
  const errors = [];
  if (cfg.schema_version !== 1) errors.push('schema_version must be 1');
  if (typeof cfg._doc !== 'string' || cfg._doc.length < 20) errors.push('_doc header missing or too short');
  if (!Array.isArray(cfg.entries)) {
    errors.push('entries must be an array');
    return errors;
  }
  const seen = {};
  for (const e of cfg.entries) {
    if (!e || typeof e !== 'object') { errors.push('entry must be an object'); continue; }
    const tag = typeof e.id === 'string' ? e.id : '(no id)';
    if (typeof e.id !== 'string' || !ID_RE.test(e.id)) errors.push(tag + ': id must match defer-NNNN');
    else if (seen[e.id]) errors.push(tag + ': duplicate id');
    seen[e.id] = true;
    if (typeof e.subject !== 'string' || e.subject.length < 10) errors.push(tag + ': subject missing or too short');
    if (typeof e.source_adr !== 'string' || !e.source_adr) errors.push(tag + ': source_adr missing');
    if (typeof e.rationale !== 'string' || e.rationale.length < 20) errors.push(tag + ': rationale missing or too short');
    if (!e.unfreeze_if || typeof e.unfreeze_if !== 'object') {
      errors.push(tag + ': unfreeze_if missing');
    } else {
      if (!TYPES.includes(e.unfreeze_if.type)) errors.push(tag + ': unfreeze_if.type must be one of ' + TYPES.join('|'));
      if (typeof e.unfreeze_if.check !== 'string' || e.unfreeze_if.check.length < 10) errors.push(tag + ': unfreeze_if.check missing or too short');
    }
    if (typeof e.review_at !== 'string' || !ISO_DATE.test(e.review_at)) errors.push(tag + ': review_at must be an ISO date YYYY-MM-DD');
    if (!STATUSES.includes(e.status)) errors.push(tag + ': status must be one of ' + STATUSES.join('|') + ', got ' + e.status);
  }
  return errors;
}

// sources: map of repo-relative path -> file text (ADR texts + CONTEXT.md).
function validateEntries(cfg, sources, thresholds, now) {
  const errors = [];
  for (const e of cfg.entries || []) {
    if (!e || typeof e.id !== 'string') continue;
    const tag = e.id;
    // freshness: expiry forces action
    if (typeof e.review_at === 'string' && ISO_DATE.test(e.review_at) && e.review_at < now) {
      errors.push(tag + ': STALE - review_at ' + e.review_at + ' is before ' + now + ' (ADR-0033 D4: activate, re-defer with new review_at + rationale, or remove)');
    }
    // D3 status semantics
    if (e.unfreeze_if && TYPES.includes(e.unfreeze_if.type)) {
      if (NON_EVALUABLE.indexOf(e.unfreeze_if.type) !== -1 && e.status !== 'pending-evaluation') {
        errors.push(tag + ': ' + e.unfreeze_if.type + ' is not machine-evaluable; status must be pending-evaluation (ADR-0033 D3)');
      }
      if (NON_EVALUABLE.indexOf(e.unfreeze_if.type) === -1 && e.status === 'pending-evaluation') {
        errors.push(tag + ': ' + e.unfreeze_if.type + ' is evaluable; status must be deferred, not pending-evaluation (ADR-0033 D3)');
      }
    }
    // existence anchors
    if (typeof e.source_adr === 'string') {
      const rel = e.source_adr.split('/').join(path.sep);
      if (!fs.existsSync(path.join(ROOT, rel))) errors.push(tag + ': source_adr file missing: ' + e.source_adr);
    }
    const anchored = Object.keys(sources).some(p => typeof sources[p] === 'string' && sources[p].indexOf(tag) !== -1);
    if (!anchored) errors.push(tag + ': id not referenced by any ADR text or CONTEXT.md (dangling registration)');
  }
  // D2 zero-tolerance schema reservation: thresholds deferred-with-unfreeze link
  const tiers = (thresholds && thresholds.gates ? thresholds.gates : []).filter(g => g && g.tier === 'deferred-with-unfreeze');
  for (const g of tiers) {
    const linked = (cfg.entries || []).some(e => e.thresholds_gate === g.id);
    if (!linked) errors.push('thresholds gate ' + g.id + ' has tier deferred-with-unfreeze but no registry entry (ADR-0033 D2)');
  }
  for (const e of cfg.entries || []) {
    if (e && e.thresholds_gate !== undefined) {
      const ok = tiers.some(g => g.id === e.thresholds_gate);
      if (!ok) errors.push(e.id + ': thresholds_gate ' + e.thresholds_gate + ' does not resolve to a deferred-with-unfreeze gate');
    }
  }
  return errors;
}


function loadSources() {
  const sources = {};
  const dir = path.join(ROOT, 'docs', 'adr');
  for (const f of fs.readdirSync(dir)) {
    if (/\.md$/.test(f)) sources[path.join('docs', 'adr', f).split(path.sep).join('/')] = fs.readFileSync(path.join(dir, f), 'utf8');
  }
  sources['CONTEXT.md'] = fs.readFileSync(path.join(ROOT, 'CONTEXT.md'), 'utf8');
  return sources;
}

function loadThresholds() {
  const p = path.join(ROOT, THRESHOLDS_REL);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { gates: [] };
}

function checkCoupling(baseRef) {
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only', '-z', baseRef + '...HEAD'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    return ['coupling check: git diff ' + baseRef + '...HEAD failed'];
  }
  const changed = diff.split(String.fromCharCode(0)).map(s => s.trim()).filter(Boolean);
  return couplingViolation(changed, baseRef, {
    cfgRel: CFG_REL,
    allowContextMd: true,
    reason: 'deferred registry changes require an ADR (ADR-0033 D4)',
  });
}

function main() {
  const baseRef = process.argv[2] || process.env.CI_BASE_REF || null;
  const now = process.env.DEFERRED_NOW || new Date().toISOString().slice(0, 10);
  const cfg = loadRegistry();
  let errors = validateShape(cfg);
  if (!errors.length) errors = errors.concat(validateEntries(cfg, loadSources(), loadThresholds(), now));
  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  console.log('[deferred] OK - ' + cfg.entries.length + ' deferred entries' + (baseRef ? '' : ' (no base ref: coupling skipped)'));
  if (baseRef) {
    const c = checkCoupling(baseRef);
    if (c.length) { for (const e of c) console.error('FAIL: ' + e); process.exit(1); }
    console.log('[deferred] coupling OK');
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateShape, validateEntries, checkCoupling, TYPES, NON_EVALUABLE, STATUSES };
