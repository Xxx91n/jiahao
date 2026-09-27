#!/usr/bin/env node
// check-coverage.js - ADR-0032 D3/D5 governance guard (zero-dependency).
//
// (a) shape: schema_version/_doc; laws covers exactly L1..L7; every entry has
//     a known state (covered | declared-gap | needs-adr | undecidable).
// (b) anchors: covered targets resolve to gsr ids present in src/SKILL.md
//     generator headers and are status=active there; source_adr files exist.
// (c) freshness: declared-gap entries carry review_at; overdue review_at is a
//     STALE violation (ADR-0031 D3 dead-man discipline).
// (d) lifecycle: validateGsrHeaders (ADR-0032 D2/D5) is the single rule-side
//     state machine (cap, superseded-by, well-formedness).
// (e) coupling (ADR-0027 D2 shared rule): editing docs/coverage-map.json
//     without a docs/adr/*.md or CONTEXT.md change in the same range fails.
//
// The derived matrix is printed, never committed (ADR-0032 R4).
//
// Usage: node scripts/check-coverage.js [BASE_REF]

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { couplingViolation } = require('./check-bench-thresholds');
const { splitByProfile, parseGsrHeaders, validateGsrHeaders } = require('../hooks/jiahao-profile');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('docs', 'coverage-map.json');
const SKILL_REL = path.join('src', 'SKILL.md');
const STATES = ['covered', 'declared-gap', 'needs-adr', 'undecidable'];
const LAWS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
const GSR_REF = /^gsr:[0-9]+$/;
const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function loadRegistry() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));
}

function loadGsr() {
  const skill = fs.readFileSync(path.join(ROOT, SKILL_REL), 'utf8');
  const gen = splitByProfile(skill).generator;
  return { rules: parseGsrHeaders(gen), ruleErrors: validateGsrHeaders(gen) };
}

function validateShape(cfg) {
  const errors = [];
  if (cfg.schema_version !== 1) errors.push('schema_version must be 1');
  if (typeof cfg._doc !== 'string' || cfg._doc.length < 20) errors.push('_doc header missing or too short');
  if (!cfg.laws || typeof cfg.laws !== 'object' || Array.isArray(cfg.laws)) {
    errors.push('laws must be an object');
    return errors;
  }
  for (const law of LAWS) {
    if (!(law in cfg.laws)) errors.push('missing entry for iron law ' + law);
  }
  for (const k of Object.keys(cfg.laws)) {
    if (!LAWS.includes(k)) errors.push('unknown law key: ' + k);
    const e = cfg.laws[k];
    if (!e || typeof e !== 'object') { errors.push(k + ': entry must be an object'); continue; }
    if (!STATES.includes(e.state)) errors.push(k + ': state must be one of ' + STATES.join('|') + ', got ' + e.state);
  }
  return errors;
}

// now: ISO date string (YYYY-MM-DD), injectable for deterministic tests.
function validateEntries(cfg, gsr, now) {
  const errors = [];
  const byId = new Map(gsr.rules.map(r => ['gsr:' + r.id, r]));
  for (const law of LAWS) {
    const e = (cfg.laws || {})[law];
    if (!e || typeof e !== 'object') continue;
    if (e.state === 'covered') {
      if (!Array.isArray(e.targets) || e.targets.length === 0) {
        errors.push(law + ': covered requires non-empty targets');
        continue;
      }
      for (const t of e.targets) {
        if (typeof t !== 'string' || !GSR_REF.test(t)) { errors.push(law + ': target not a gsr:N reference: ' + t); continue; }
        const rule = byId.get(t);
        if (!rule) { errors.push(law + ': target ' + t + ' has no gsr header in src/SKILL.md'); continue; }
        if (rule.status !== 'active') errors.push(law + ': target ' + t + ' is not active (status ' + rule.status + ') - superseded/deprecated rules cannot cover (ADR-0032 D5)');
      }
    } else {
      if (e.targets) errors.push(law + ': ' + e.state + ' must not carry targets');
      if (typeof e.rationale !== 'string' || e.rationale.length < 20) errors.push(law + ': ' + e.state + ' requires rationale');
      if (typeof e.source_adr !== 'string' || !fs.existsSync(path.join(ROOT, e.source_adr || ''))) errors.push(law + ': source_adr missing or file absent: ' + e.source_adr);
      if (e.state === 'declared-gap') {
        if (typeof e.review_at !== 'string' || !ISO_DATE.test(e.review_at)) {
          errors.push(law + ': declared-gap requires review_at YYYY-MM-DD (ADR-0031 D3)');
        } else if (e.review_at < now) {
          errors.push(law + ': declared-gap review_at ' + e.review_at + ' is overdue (STALE)');
        }
      }
    }
  }
  return errors;
}

function printMatrix(cfg) {
  for (const law of LAWS) {
    const e = cfg.laws[law];
    const detail = e.state === 'covered' ? ' -> ' + e.targets.join(', ') : (e.review_at ? ' (review ' + e.review_at + ')' : '');
    console.log('  ' + law + '  ' + e.state + detail);
  }
}

function checkCoupling(baseRef) {
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only', '-z', baseRef + '...HEAD'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    return ['coupling check: git diff ' + baseRef + '...HEAD failed: ' + String(e.message).split(String.fromCharCode(10))[0]];
  }
  const changed = diff.split(String.fromCharCode(0)).map(s => s.trim()).filter(Boolean);
  return couplingViolation(changed, baseRef, {
    cfgRel: CFG_REL,
    allowContextMd: true,
    reason: 'coverage map changes require an ADR (ADR-0032 D3)',
  });
}

function main() {
  requireCapabilities('coverage');
  const baseRef = process.argv[2] || process.env.CI_BASE_REF || null;
  const now = process.env.COVERAGE_NOW || new Date().toISOString().slice(0, 10);
  const cfg = loadRegistry();
  const gsr = loadGsr();
  let errors = [];
  errors = errors.concat(validateShape(cfg));
  errors = errors.concat(validateEntries(cfg, gsr, now));
  errors = errors.concat(gsr.ruleErrors);
  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  console.log('[coverage] derived matrix (print artifact, not committed):');
  printMatrix(cfg);
  console.log('[coverage] OK - ' + LAWS.length + ' laws, ' + gsr.rules.length + ' gsr rules' + (baseRef ? '' : ' (no base ref: coupling skipped)'));
  if (baseRef) {
    const c = checkCoupling(baseRef);
    if (c.length) { for (const e of c) console.error('FAIL: ' + e); process.exit(1); }
    console.log('[coverage] coupling OK');
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateShape, validateEntries, checkCoupling, LAWS, STATES };
