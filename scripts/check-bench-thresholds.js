#!/usr/bin/env node
// check-bench-thresholds.js — ADR-0027 D2 governance guard (zero-dependency).
//
// Two checks:
//   (a) content anchor — every gate value must appear in the text of its
//       `source_adr` file (catches editing thresholds.json without touching
//       the registry). target values must appear in `target_source_adr`.
//   (b) same-commit coupling (only when a base ref is given, e.g. a PR base
//       SHA) — if bench/polygraph/thresholds.json changed in base...HEAD
//       without any docs/adr/*.md change in the same range, fail.
//
// The guard never judges direction (raising a threshold is a legitimate
// ADR-led change); it only forbids SILENT change. Parsing numbers out of
// ADR prose is rejected by design.
//
// Usage: node scripts/check-bench-thresholds.js [BASE_REF]

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('bench', 'polygraph', 'thresholds.json');

// A value n is "anchored" in ADR text if any of its plausible written forms
// appears: raw form ("0.46"), percent form ("46.0%"), or decimal form of a
// ratio derived from a percent (>46.0% @ FP <= 4.5% — the ADR writes both).
function valueAnchored(adrText, value) {
  const forms = new Set();
  forms.add(String(value));
  forms.add(value.toFixed(3));
  forms.add(value.toFixed(2));
  forms.add((value * 100).toFixed(1) + '%');
  if (Number.isInteger(value * 100)) forms.add(String(value * 100) + '%');
  for (const f of forms) if (adrText.includes(f)) return f;
  return null;
}

function findAdrFile(adrId) {
  const dir = path.join(ROOT, 'docs', 'adr');
  if (!fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir).find(f => f.startsWith(adrId + '-') && f.endsWith('.md'));
  return hit ? path.join(dir, hit) : null;
}

function checkContentAnchors(cfg) {
  const errors = [];
  const textCache = new Map();
  const adrText = (id) => {
    if (!textCache.has(id)) {
      const f = findAdrFile(id);
      textCache.set(id, f === null ? null : fs.readFileSync(f, 'utf8'));
    }
    return textCache.get(id);
  };
  // ADR-0029 D2: probe_gates (zero-miss smoke gates) share the same
  // content-anchor governance; no band/target semantics on this side.
  // S-1 fail-closed: probe_gates removal must fail here too, not only in check-probes.js.
  if (!Array.isArray(cfg.probe_gates) || cfg.probe_gates.length === 0) {
    errors.push('probe_gates missing or empty (ADR-0029 D2): zero-miss probe gates must not fail open');
  }
  // ADR-0031 D2/D3: judge_bias_gates share the same content anchoring.
  if (!Array.isArray(cfg.judge_bias_gates) || cfg.judge_bias_gates.length === 0) {
    errors.push('judge_bias_gates missing or empty (ADR-0031 D3): bias gates must not fail open');
  }
  // ADR-0037 D4: mr_gates (metamorphic symmetry) share the same anchoring.
  if (!Array.isArray(cfg.mr_gates) || cfg.mr_gates.length === 0) {
    errors.push('mr_gates missing or empty (ADR-0037 D4): symmetry gates must not fail open');
  }
  const allGates = (cfg.gates || []).concat(cfg.probe_gates || []).concat(cfg.judge_bias_gates || []).concat(cfg.mr_gates || []);
  for (const g of allGates) {
    const text = adrText(g.source_adr);
    if (text === null) {
      errors.push(`gate ${g.id}: source_adr ${g.source_adr} file not found in docs/adr/`);
      continue;
    }
    const found = valueAnchored(text, g.value);
    if (!found) {
      errors.push(`gate ${g.id}: value ${g.value} not found in ADR-${g.source_adr} (silent threshold change?)`);
    }
    if (g.target != null) {
      const tSrc = g.target_source_adr || g.source_adr;
      const tText = adrText(tSrc);
      if (tText === null) {
        errors.push(`gate ${g.id}: target_source_adr ${tSrc} file not found in docs/adr/`);
      } else if (!valueAnchored(tText, g.target)) {
        errors.push(`gate ${g.id}: target ${g.target} not found in ADR-${tSrc} (silent band change?)`);
      }
    }
  }
  return errors;
}

// ADR-0030 D4: deadline.json constants are derived config; their numbers must
// appear in the ADR text (same discipline as gate values). Returns errors.
function checkDeadlineAnchors(deadline) {
  const errors = [];
  if (!deadline) { errors.push('bench/polygraph/deadline.json missing — dead-man switch has no anchored deadlines (ADR-0030 D4 bypass closure)'); return errors; }
  if (deadline.source_adr !== '0030') errors.push('deadline.json: source_adr must be "0030" (ADR-0030 D4)');
  const f = findAdrFile(deadline.source_adr || '0030');
  if (f === null) { errors.push('deadline.json: source_adr 0030 file not found in docs/adr/'); return errors; }
  const text = fs.readFileSync(f, 'utf8');
  for (const key of ['interval_months', 'hard_interval_months']) {
    if (typeof deadline[key] !== 'number') { errors.push('deadline.json: missing numeric ' + key); continue; }
    if (!valueAnchored(text, deadline[key])) errors.push('deadline.json: ' + key + ' value ' + deadline[key] + ' not anchored in ADR-0030 text');
  }
  return errors;
}

function checkSameCommitCoupling(baseRef) {
  const errors = [];
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only', baseRef + '...HEAD'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    errors.push(`coupling check: git diff ${baseRef}...HEAD failed: ${String(e.message).split('\n')[0]}`);
    return errors;
  }
  const changed = diff.split('\n').map(s => s.trim()).filter(Boolean);
  return couplingViolation(changed, baseRef);
}

// Pure core of the coupling rule, exported for testing both polarities.
// ---- ADR-0031 D3 gate tier taxonomy ----
// Machine layer over the three K8s-admission-shaped tiers:
//   confirmatory            fail-closed immediately (default for integrity-critical gates)
//   observational           record-only; MUST pre-register review_at + promote_if;
//                           overdue review = STALE violation (fail this guard)
//   deferred-with-unfreeze  implementation withheld; MUST carry unfreeze_if
const TIERS = new Set(['confirmatory', 'observational', 'deferred-with-unfreeze']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Returns errors ([] = pass). now is injectable for deterministic tests.
function checkTiers(cfg, now) {
  const errors = [];
  const all = (cfg.gates || []).concat(cfg.probe_gates || []).concat(cfg.judge_bias_gates || []).concat(cfg.mr_gates || []);
  const t = typeof now === 'number' ? now : Date.now();
  for (const g of all) {
    if (typeof g.tier !== 'string' || !TIERS.has(g.tier)) {
      errors.push('gate ' + g.id + ': missing or unknown tier (ADR-0031 D3) — every gate must declare tier');
      continue;
    }
    if (g.tier === 'observational') {
      if (typeof g.review_at !== 'string' || !ISO_DATE.test(g.review_at) || Number.isNaN(Date.parse(g.review_at))) {
        errors.push('gate ' + g.id + ': observational tier requires review_at (ISO date)');
      } else if (t > Date.parse(g.review_at) + 24 * 3600 * 1000) {
        errors.push('gate ' + g.id + ': STALE — observational review overdue since ' + g.review_at + ' (ADR-0031 D3)');
      }
      if (typeof g.promote_if !== 'string' || !g.promote_if) {
        errors.push('gate ' + g.id + ': observational tier requires promote_if');
      }
    }
    if (g.tier === 'deferred-with-unfreeze' && (typeof g.unfreeze_if !== 'string' || !g.unfreeze_if)) {
      errors.push('gate ' + g.id + ': deferred-with-unfreeze tier requires unfreeze_if');
    }
  }
  return errors;
}

// opts (ADR-0028 D4 reuse): { cfgRel, allowContextMd, reason } lets the
// host-contracts guard share this rule against a different watched file.
function couplingViolation(changed, baseRef, opts) {
  const o = opts || {};
  const cfgRel = (o.cfgRel || CFG_REL).split(path.sep).join('/').replace(/\\/g, '/');
  const errors = [];
  const cfgChanged = changed.includes(cfgRel);
  const adrChanged = changed.some(f => /^docs\/adr\/\d+.*\.md$/.test(f));
  const ctxChanged = o.allowContextMd ? changed.includes('CONTEXT.md') : false;
  if (cfgChanged && !adrChanged && !ctxChanged) {
    const docs = o.allowContextMd ? 'docs/adr/*.md or CONTEXT.md' : 'docs/adr/*.md';
    errors.push(`coupling: ${cfgRel} changed without any ${docs} change in ${baseRef}...HEAD — ${o.reason || 'threshold changes require an ADR (ADR-0027 D2)'}`);
  }
  return errors;
}

function main() {
  const baseRef = process.argv[2] || process.env.CI_BASE_REF || null;
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));

  const errors = checkContentAnchors(cfg);
  errors.push.apply(errors, checkTiers(cfg));
  const deadlinePath = path.join(ROOT, 'bench', 'polygraph', 'deadline.json');
  // ADR-0030 D4 bypass closure: deleting deadline.json must not silently
  // disable the dead-man switch — absence is reported, never skipped.
  errors.push.apply(errors, checkDeadlineAnchors(
    fs.existsSync(deadlinePath) ? JSON.parse(fs.readFileSync(deadlinePath, 'utf8')) : null));
  if (baseRef) errors.push(...checkSameCommitCoupling(baseRef));
  else console.log('[thresholds] no base ref given — coupling check skipped (content anchor only)');

  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  console.log(`[thresholds] OK — ${(cfg.gates || []).length + (cfg.probe_gates || []).length + (cfg.judge_bias_gates || []).length + (cfg.mr_gates || []).length} gates anchored to ADRs` + (baseRef ? '; coupling OK' : ''));
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkContentAnchors, checkDeadlineAnchors, checkSameCommitCoupling, couplingViolation, valueAnchored, checkTiers, TIERS };
