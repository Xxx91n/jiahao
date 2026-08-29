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
  const allGates = (cfg.gates || []).concat(cfg.probe_gates || []);
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
  if (baseRef) errors.push(...checkSameCommitCoupling(baseRef));
  else console.log('[thresholds] no base ref given — coupling check skipped (content anchor only)');

  if (errors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  console.log(`[thresholds] OK — ${(cfg.gates || []).length + (cfg.probe_gates || []).length} gates anchored to ADRs` + (baseRef ? '; coupling OK' : ''));
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkContentAnchors, checkSameCommitCoupling, couplingViolation, valueAnchored };
