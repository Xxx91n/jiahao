#!/usr/bin/env node
// check-host-contracts.js — ADR-0028 D4 governance guard (zero-dependency).
//
// (a) shape: schema_version/_doc present; every contract entry well-formed.
// (b) anchors: each entry's term names a CONTEXT.md glossary term
//     (existence anchor, not prose parsing); source_adr file exists.
// (c) lifecycle: every adapters/<host>/ directory registered with a state
//     in {active, deprecated, eol} (ADR-0028 D6).
// (d) coupling: editing the registry without a docs/adr/*.md or CONTEXT.md
//     change in the same commit range fails — reuses the ADR-0027 shared
//     couplingViolation pure function. Strict-first; relax only on ADR noise.
//
// The registry itself is consumed by tests only, never at runtime (R4).
//
// Usage: node scripts/check-host-contracts.js [BASE_REF]

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { couplingViolation } = require('./check-bench-thresholds');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('test', 'fixtures', 'host-contracts.json');
const CONTEXT_REL = 'CONTEXT.md';
const STATES = ['active', 'deprecated', 'eol'];
const TRANSCRIPT_FILE = ['present', 'absent', 'unverifiable']; // ADR-0070 D-C(c)
const REQUIRED_FIELDS = ['id', 'host', 'event', 'exit_codes', 'decision_keys', 'decision_values', 'fail_soft', 'term', 'source_adr', 'transcript_file'];

function loadRegistry() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));
}

function validateShape(cfg) {
  const errors = [];
  if (cfg.schema_version !== 1) errors.push('schema_version must be 1');
  if (typeof cfg._doc !== 'string' || cfg._doc.length < 20) errors.push('_doc header missing or too short');
  if (!Array.isArray(cfg.contracts) || cfg.contracts.length === 0) errors.push('contracts must be a non-empty array');
  if (!cfg.lifecycle || typeof cfg.lifecycle !== 'object') errors.push('lifecycle register missing');
  const ids = new Set();
  for (const c of (cfg.contracts || [])) {
    for (const f of REQUIRED_FIELDS) {
      if (!(f in c)) errors.push((c.id || '?') + ': missing field ' + f);
    }
    if (ids.has(c.id)) errors.push('duplicate id: ' + c.id);
    ids.add(c.id);
    if (c.exit_codes && typeof c.exit_codes === 'object') {
      for (const [k, v] of Object.entries(c.exit_codes)) {
        if (!Number.isInteger(v) || v < 0 || v > 255) errors.push(c.id + ': exit_codes.' + k + ' not an int 0..255');
      }
    }
    if (c.decision_values && c.decision_values.decision) {
      for (const d of c.decision_values.decision) {
        if (d !== 'allow' && d !== 'block') errors.push(c.id + ': decision value not allow|block: ' + d);
      }
    }
    if (c.transcript_file !== undefined && TRANSCRIPT_FILE.indexOf(c.transcript_file) === -1) {
      errors.push(c.id + ': transcript_file must be present|absent|unverifiable, got ' + c.transcript_file);
    }
    if (c.hook && !fs.existsSync(path.join(ROOT, c.hook))) errors.push(c.id + ': hook file missing: ' + c.hook);
    for (const h of (c.hooks || [])) {
      if (!fs.existsSync(path.join(ROOT, h))) errors.push(c.id + ': hook file missing: ' + h);
    }
    if (c.config && !fs.existsSync(path.join(ROOT, c.config))) errors.push(c.id + ': config file missing: ' + c.config);
    for (const f of (c.files || [])) {
      if (!fs.existsSync(path.join(ROOT, f))) errors.push(c.id + ': adapter file missing: ' + f);
    }
  }
  return errors;
}

function validateAnchors(cfg) {
  const errors = [];
  const contextText = fs.readFileSync(path.join(ROOT, CONTEXT_REL), 'utf8');
  for (const c of cfg.contracts) {
    if (!contextText.includes('**' + c.term)) {
      errors.push(c.id + ': term "' + c.term + '" is not a CONTEXT.md glossary term');
    }
    if (!fs.existsSync(path.join(ROOT, c.source_adr))) {
      errors.push(c.id + ': source_adr file missing: ' + c.source_adr);
    }
  }
  return errors;
}

function validateLifecycle(cfg) {
  const errors = [];
  const adaptersDir = path.join(ROOT, 'adapters');
  const dirs = fs.readdirSync(adaptersDir, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name).sort();
  const registered = Object.keys(cfg.lifecycle).sort();
  for (const d of dirs) {
    if (!cfg.lifecycle[d]) errors.push('lifecycle: adapters/' + d + ' not registered');
  }
  for (const k of registered) {
    if (!dirs.includes(k)) errors.push('lifecycle: ' + k + ' has no adapters/' + k + ' directory');
    const st = cfg.lifecycle[k].state;
    if (!STATES.includes(st)) errors.push('lifecycle: ' + k + ' state must be active|deprecated|eol, got ' + st);
  }
  const contractHosts = new Set(cfg.contracts.map(c => c.host));
  for (const d of dirs) {
    if (!contractHosts.has(d)) errors.push('coverage: adapters/' + d + ' has no contract entry');
  }
  // ADR-0070 D-C(c): conviction-lane reachability is a per-host declaration —
  // every host must carry the same transcript_file state across its entries
  // and 'present' must be documented somewhere (the registry is the record).
  const byHost = new Map();
  for (const c of cfg.contracts) {
    const prev = byHost.get(c.host);
    if (prev === undefined) byHost.set(c.host, c.transcript_file);
    else if (prev !== c.transcript_file) errors.push('transcript_file: host ' + c.host + ' declares inconsistent states (' + prev + ' vs ' + c.transcript_file + ')');
  }
  for (const d of dirs) {
    if (!byHost.has(d) || TRANSCRIPT_FILE.indexOf(byHost.get(d)) === -1) {
      errors.push('transcript_file: adapters/' + d + ' has no declared reachability state');
    }
  }
  return errors;
}

function checkCoupling(baseRef) {
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only', baseRef + '...HEAD'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    return ['coupling check: git diff ' + baseRef + '...HEAD failed: ' + String(e.message).split('\n')[0]];
  }
  const changed = diff.split('\n').map(s => s.trim()).filter(Boolean);
  return couplingViolation(changed, baseRef, {
    cfgRel: CFG_REL,
    allowContextMd: true,
    reason: 'host contract changes require an ADR (ADR-0028 D4)',
  });
}

function main() {
  requireCapabilities('host-contracts');
  const baseRef = process.argv[2] || process.env.CI_BASE_REF || null;
  const cfg = loadRegistry();
  let errors = [];
  errors = errors.concat(validateShape(cfg));
  errors = errors.concat(validateAnchors(cfg));
  errors = errors.concat(validateLifecycle(cfg));
  if (baseRef) errors = errors.concat(checkCoupling(baseRef));
  else console.log('[host-contracts] no base ref given — coupling check skipped (shape/anchors/lifecycle only)');
  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  console.log('[host-contracts] OK — ' + cfg.contracts.length + ' contracts, ' +
    Object.keys(cfg.lifecycle).length + ' lifecycle entries' + (baseRef ? '; coupling OK' : ''));
  process.exit(0);
}

if (require.main === module) main();

module.exports = { loadRegistry, validateShape, validateAnchors, validateLifecycle, checkCoupling };
