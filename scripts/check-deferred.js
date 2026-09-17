#!/usr/bin/env node
// check-deferred.js - ADR-0033 deferred/unfreeze registry guard (zero-dependency).
//
// (a) shape: schema_version/_doc; entries carry id/subject/source_adr/rationale/
//     unfreeze_if{type,check,verified_by?}/review_at/status (ADR-0033 D2).
// (b) semantics (D3): confirmatory fail-closed; external-event and free-text
//     predicates are not machine-evaluable -> status must be pending-evaluation
//     (tracked, time-boxed, never silently whitelisted); presence-condition and
//     count-threshold keep status deferred ONLY with verified_by (ADR-0035 D6).
// (c) freshness (D4): review_at expiry = STALE fail-closed (k8s feature-gate
//     semantics: activate / re-defer with new review_at / remove; no 4th exit).
// (d) anchors: existence-based - source_adr file must exist and the entry id
//     must appear in some ADR text or CONTEXT.md (dangling registration fails).
// (e) threshold link: a thresholds.json gate with tier deferred-with-unfreeze
//     must be registered here via thresholds_gate (D2 zero-tolerance schema
//     reservation; current tier set is empty).
// (f) coupling (ADR-0027 D2 shared rule): registry diff without a same-range
//     ADR/CONTEXT change fails (only when a base ref is available).
// (g) ADR-0035: cadence_tier + registered_at on every entry; D2 residency SLA
//     (pending-evaluation outstaying min(2 cycles, 12 months) fails); D3
//     check-in discipline (external-event last_check_in per cycle, warn-level,
//     never shifts exit code); D6 verified_by enforcement (evaluable type
//     without an existing assertion script is forced to pending-evaluation).
//
// Usage: node scripts/check-deferred.js [BASE_REF]

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { couplingViolation } = require('./check-bench-thresholds');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('docs', 'deferred-registry.json');
const THRESHOLDS_REL = path.join('bench', 'polygraph', 'thresholds.json');
const ID_RE = new RegExp('^defer-[0-9]{4}$');
const ISO_DATE = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
const TYPES = ['presence-condition', 'count-threshold', 'external-event', 'free-text'];
const NON_EVALUABLE = ['external-event', 'free-text'];
const EVALUABLE = ['presence-condition', 'count-threshold'];
const STATUSES = ['deferred', 'pending-evaluation', 'closed', 'actioned'];
// ADR-0074 D-E (R2 dispositions): terminal dispositions. 'closed' = review
// executed and dispositioned (same-commit ADR or ledger note); 'actioned' =
// the deferred work was performed. Terminal rows stay in the registry so
// trend-inventory deferred_entry references keep resolving; they carry
// closure fields and are exempt from freshness/semantics/SLA/discipline.
const TERMINAL = ['closed', 'actioned'];
const TIERS = ['quarterly', 'half-yearly', 'yearly'];
const TIER_DAYS = { quarterly: 92, 'half-yearly': 183, yearly: 365 };
const DAY_MS = 86400000;

function loadRegistry() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));
}

function isRealDate(s) { const d = new Date(s + String.fromCharCode(84,48,48,58,48,48,58,48,48,90)); return !isNaN(d) && d.toISOString().slice(0,10) === s; }

function daysBetween(fromISO, toISO) {
  return Math.floor((new Date(toISO) - new Date(fromISO)) / DAY_MS);
}

// Shape of one ADR-0035 field group; returns error strings (tag-prefixed).
function shapeExtras(e, tag, errors) {
  if (!TIERS.includes(e.cadence_tier)) errors.push(tag + ': cadence_tier must be one of ' + TIERS.join('|') + ' (ADR-0035 D1)');
  if (typeof e.registered_at !== 'string' || !ISO_DATE.test(e.registered_at)) errors.push(tag + ': registered_at must be an ISO date YYYY-MM-DD (ADR-0035 D2)');
  else if (!isRealDate(e.registered_at)) errors.push(tag + ': registered_at is not a real calendar date');
  if (e.last_check_in !== undefined) {
    const c = e.last_check_in;
    if (!c || typeof c !== 'object' || typeof c.date !== 'string' || !ISO_DATE.test(c.date) || !isRealDate(c.date) || typeof c.note !== 'string' || c.note.length < 5) {
      errors.push(tag + ': last_check_in must be {date: YYYY-MM-DD, note: string} (ADR-0035 D3)');
    }
  }
  if (e.unfreeze_if && e.unfreeze_if.verified_by !== undefined) {
    const v = e.unfreeze_if.verified_by;
    if (typeof v !== 'string' || !v) errors.push(tag + ': verified_by must be a non-empty path string (ADR-0035 D6)');
    else if (!fs.existsSync(path.join(ROOT, v.split('/').join(path.sep)))) errors.push(tag + ': verified_by script missing: ' + v + ' (ADR-0035 D6)');
  }
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
    if (typeof e.review_at !== 'string' || !ISO_DATE.test(e.review_at)) { errors.push(tag + ': review_at must be an ISO date YYYY-MM-DD'); } else if (!isRealDate(e.review_at)) { errors.push(tag + ': review_at is not a real calendar date'); }
    if (!STATUSES.includes(e.status)) errors.push(tag + ': status must be one of ' + STATUSES.join('|') + ', got ' + e.status);
    if (e.status === 'closed') {
      if (typeof e.closed_at !== 'string' || !ISO_DATE.test(e.closed_at) || !isRealDate(e.closed_at)) errors.push(tag + ': closed requires closed_at (ISO date)');
      if (typeof e.closed_via !== 'string' || e.closed_via.length < 10) errors.push(tag + ': closed requires closed_via (same-commit ADR or ledger note)');
    }
    if (e.status === 'actioned') {
      if (typeof e.actioned_at !== 'string' || !ISO_DATE.test(e.actioned_at) || !isRealDate(e.actioned_at)) errors.push(tag + ': actioned requires actioned_at (ISO date)');
      if (typeof e.actioned_via !== 'string' || e.actioned_via.length < 10) errors.push(tag + ': actioned requires actioned_via');
    }
    shapeExtras(e, tag, errors);
  }
  return errors;
}

// sources: map of repo-relative path -> file text (ADR texts + CONTEXT.md).
function validateEntries(cfg, sources, thresholds, now) {
  const errors = [];
  for (const e of cfg.entries || []) {
    if (!e || typeof e.id !== 'string') continue;
    const tag = e.id;
    const terminal = TERMINAL.indexOf(e.status) !== -1;
    // freshness: expiry forces action (terminal rows are exempt)
    if (!terminal && typeof e.review_at === 'string' && ISO_DATE.test(e.review_at) && e.review_at < now) {
      errors.push(tag + ': STALE - review_at ' + e.review_at + ' is before ' + now + ' (ADR-0033 D4: activate, re-defer with new review_at + rationale, or remove)');
    }
    // D3 status semantics + ADR-0035 D6 verified-by enforcement
    if (!terminal && e.unfreeze_if && TYPES.includes(e.unfreeze_if.type)) {
      if (NON_EVALUABLE.indexOf(e.unfreeze_if.type) !== -1 && e.status !== 'pending-evaluation') {
        errors.push(tag + ': ' + e.unfreeze_if.type + ' is not machine-evaluable; status must be pending-evaluation (ADR-0033 D3)');
      }
      if (EVALUABLE.indexOf(e.unfreeze_if.type) !== -1) {
        const hasVerifier = typeof e.unfreeze_if.verified_by === 'string' && e.unfreeze_if.verified_by;
        if (!hasVerifier && e.status === 'deferred') {
          errors.push(tag + ': ' + e.unfreeze_if.type + ' without verified_by is not evaluable; forced to pending-evaluation (ADR-0035 D6)');
        }
        if (hasVerifier && e.status === 'pending-evaluation') {
          errors.push(tag + ': ' + e.unfreeze_if.type + ' with verified_by is evaluable; status must be deferred, not pending-evaluation (ADR-0035 D6)');
        }
      }
    }
    // ADR-0035 D2 residency SLA: pending-evaluation outstays min(2 cycles, 12 months) -> fail
    if (!terminal && e.status === 'pending-evaluation' && typeof e.registered_at === 'string' && isRealDate(e.registered_at) && TIER_DAYS[e.cadence_tier]) {
      const cap = Math.min(2 * TIER_DAYS[e.cadence_tier], 365);
      if (daysBetween(e.registered_at, now) > cap) {
        errors.push(tag + ': pending-evaluation residency SLA breached (' + daysBetween(e.registered_at, now) + 'd > ' + cap + 'd cap; ADR-0035 D2: activate, re-defer with new review_at + rationale, or remove)');
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

// ADR-0035 D3 check-in discipline (warn-level): external-event entries record
// last_check_in at least once per cadence cycle. Violations are warnings; they
// never affect the exit code (alarm-fatigue evidence in ADR-0035 D3).
function validateDiscipline(cfg, now) {
  const warnings = [];
  for (const e of cfg.entries || []) {
    if (!e || typeof e.id !== 'string' || !e.unfreeze_if) continue;
    if (TERMINAL.indexOf(e.status) !== -1) continue;
    if (e.unfreeze_if.type !== 'external-event') continue;
    const cyc = TIER_DAYS[e.cadence_tier];
    if (!e.last_check_in || !isRealDate(e.last_check_in.date || '')) {
      warnings.push(e.id + ': external-event entry has no valid last_check_in (ADR-0035 D3: record one check-in per cycle)');
    } else if (cyc && daysBetween(e.last_check_in.date, now) > cyc) {
      warnings.push(e.id + ': last_check_in ' + e.last_check_in.date + ' is older than one ' + e.cadence_tier + ' cycle (' + cyc + 'd) (ADR-0035 D3)');
    }
  }
  return warnings;
}

// ADR-0035 D6 second half: a satisfied verified_by assertion only SUGGESTS
// activation; it never auto-activates or auto-removes an entry. Verifier
// contract: exit 0 = satisfied, exit 1 = not satisfied, exit >1 = the
// verifier itself is broken (WARN, must not masquerade as "not satisfied").
function evalSuggestions(cfg) {
  const suggestions = [];
  for (const e of cfg.entries || []) {
    if (!e || typeof e.id !== 'string' || !e.unfreeze_if) continue;
    if (e.status !== 'deferred' || typeof e.unfreeze_if.verified_by !== 'string') continue;
    const script = path.join(ROOT, e.unfreeze_if.verified_by.split('/').join(path.sep));
    if (!fs.existsSync(script)) continue; // shape check owns this error
    try {
      execFileSync(process.execPath, [script], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
      suggestions.push('SUGGEST: ' + e.id + ': verified_by ' + e.unfreeze_if.verified_by + ' reports the condition SATISFIED - a human should review activation (ADR-0035 D6)');
    } catch (err) {
      // exit 1 = condition not satisfied (silent); anything else = the
      // verifier itself is broken, which must not look like "not satisfied"
      if (err && typeof err.status === 'number' && err.status > 1) {
        suggestions.push('WARN: ' + e.id + ': verified_by ' + e.unfreeze_if.verified_by + ' exited ' + err.status + ' - the verifier is broken, not "condition unsatisfied"; fix the script (ADR-0035 R2 honesty)');
      }
    }
  }
  return suggestions;
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
  requireCapabilities('deferred');
  const baseRef = process.argv[2] || process.env.CI_BASE_REF || null;
  const now = process.env.DEFERRED_NOW || new Date().toISOString().slice(0, 10);
  const cfg = loadRegistry();
  let errors = validateShape(cfg);
  if (!errors.length) errors = errors.concat(validateEntries(cfg, loadSources(), loadThresholds(), now));
  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  for (const w of validateDiscipline(cfg, now)) console.warn('WARN: ' + w);
  for (const s of evalSuggestions(cfg)) console.log(s);
  const liveN = cfg.entries.filter(function (e) { return TERMINAL.indexOf(e.status) === -1; }).length;
  const termN = cfg.entries.length - liveN;
  console.log('[deferred] OK - ' + cfg.entries.length + ' entries (' + liveN + ' live, ' + termN + ' closed/actioned)' + (baseRef ? '' : ' (no base ref: coupling skipped)'));
  if (baseRef) {
    const c = checkCoupling(baseRef);
    if (c.length) { for (const e of c) console.error('FAIL: ' + e); process.exit(1); }
    console.log('[deferred] coupling OK');
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateShape, validateEntries, validateDiscipline, evalSuggestions, checkCoupling, loadSources, TYPES, NON_EVALUABLE, EVALUABLE, STATUSES, TIERS, TIER_DAYS, daysBetween };
