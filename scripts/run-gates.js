#!/usr/bin/env node
// run-gates.js - ADR-0034 gate registry runner (zero-dependency, thin CLI + pure core).
//
// (a) D1/D4 schema: docs/gates.json entries carry {name, command, tier,
//     source_adr, order}. order is a required integer (missing = fail-closed).
//     Meta-check entries (gates-alignment, ci-wiring, gates-coupling) are
//     structurally hard-coded here and must occupy the smallest orders
//     (band 0-99; functional gates 100+) - CRTM-as-entry.
// (b) D3 semantics: default complete-run aggregates every breach;
//     --fail-fast is opt-in and short-circuits confirmatory failures only;
//     observational entries never block and are skipped under --fail-fast;
//     deferred-with-unfreeze entries are always skipped.
// (c) D2 advisory discipline: child ::warning annotation lines are stripped
//     from passthrough evidence and re-emitted as ONE aggregated ::warning
//     (ADR-0027 D3 vs the GitHub 10-annotation/step limit).
// (d) --check-alignment: registry <-> package.json face (D5). gate:all must
//     be "node scripts/run-gates.js"; every <name>:gate alias part must be a
//     token-prefix of some registry entry command (aliases are the debug
//     form; the registry command may add CI-only flags).
// (e) --check-coupling [BASE_REF]: docs/gates.json same-commit ADR guard via
//     the shared ADR-0027 couplingViolation (BASE_REF arg or CI_BASE_REF;
//     absent base = skip, repo convention).
// (f) ADR-0040: per-entry requires capability precheck via
//     src/shared/capability.js; a deterministic absence yields status
//     'unverifiable' (exit 2 gate-side), listed separately and never
//     blocking; unknown capability names are registry violations.
//
// Usage: node scripts/run-gates.js [--fail-fast]
//        node scripts/run-gates.js --check-alignment
//        node scripts/run-gates.js --check-coupling [BASE_REF]

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { probe, requireCapabilities, validateRequires } = require('../src/shared/capability');
const { PREFIXES } = require('../src/shared/prefix-vocab'); // ADR-0043 D-E: prefix vocabulary fact source

const ROOT = path.join(__dirname, '..');
const REGISTRY_REL = path.join('docs', 'gates.json');
const PACKAGE_REL = 'package.json';
const TIERS = ['confirmatory', 'observational', 'deferred-with-unfreeze'];
const META_ENTRIES = ['gates-alignment', 'ci-wiring', 'gates-coupling'];

class ConfigLoadError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ConfigLoadError';
    this.cause = cause;
  }
}

function loadRegistry(regPath) {
  const file = regPath || path.join(ROOT, REGISTRY_REL);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new ConfigLoadError('cannot load registry ' + file + ': ' + err.message, err);
  }
}

function validateRegistry(reg, root) {
  const base = root || ROOT;
  const errors = [];
  if (!reg || !Array.isArray(reg.entries)) return ['registry: entries must be an array'];
  const names = new Set();
  const orders = new Set();
  reg.entries.forEach(function (e, i) {
    const tag = 'entry[' + i + ']' + (e && e.name ? ' ' + e.name : '');
    if (!e || typeof e.name !== 'string' || !e.name) errors.push(tag + ': name missing');
    else if (names.has(e.name)) errors.push(tag + ': duplicate name');
    if (e && e.name) names.add(e.name);
    if (!e || typeof e.command !== 'string' || !e.command.trim()) errors.push(tag + ': command missing');
    if (!e || TIERS.indexOf(e.tier) === -1) errors.push(tag + ': tier must be one of ' + TIERS.join('/'));
    if (!e || typeof e.source_adr !== 'string' || !e.source_adr) errors.push(tag + ': source_adr missing');
    else if (!fs.existsSync(path.join(base, e.source_adr))) errors.push(tag + ': source_adr not found: ' + e.source_adr);
    if (!e || !Number.isInteger(e.order)) errors.push(tag + ': order must be an integer (required, no default - ADR-0034 D4)');
    else if (orders.has(e.order)) errors.push(tag + ': duplicate order ' + e.order);
    if (e && Number.isInteger(e.order)) orders.add(e.order);
  });
  if (errors.length) return errors;
  const sorted = reg.entries.slice().sort(function (a, b) { return a.order - b.order; });
  const head = sorted.slice(0, META_ENTRIES.length).map(function (e) { return e.name; });
  META_ENTRIES.forEach(function (m) {
    if (!names.has(m)) errors.push('meta-check entry missing: ' + m + ' (ADR-0034 D4)');
  });
  if (JSON.stringify(head) !== JSON.stringify(META_ENTRIES)) {
    errors.push('meta-check entries must occupy the smallest orders in sequence ' + META_ENTRIES.join(' < ') + ' (CRTM-as-entry, ADR-0034 D4)');
  }
  reg.entries.forEach(function (e) {
    const meta = META_ENTRIES.indexOf(e.name) !== -1;
    if (meta && e.order >= 100) errors.push(e.name + ': meta-check order must be < 100 (band contract)');
    if (!meta && e.order < 100) errors.push(e.name + ': functional gate order must be >= 100 (band contract)');
  });
  return errors.concat(validateRequires(reg.entries));
}

function tokenPrefix(aliasTokens, cmdTokens) {
  if (aliasTokens.length > cmdTokens.length) return false;
  for (let i = 0; i < aliasTokens.length; i++) if (aliasTokens[i] !== cmdTokens[i]) return false;
  return true;
}

function checkAlignment(reg, pkg) {
  const errors = [];
  const scripts = (pkg && pkg.scripts) || {};
  if (scripts['gate:all'] !== 'node scripts/run-gates.js') {
    errors.push("alignment: package.json scripts['gate:all'] must be 'node scripts/run-gates.js' (ADR-0034 D2)");
  }
  Object.keys(scripts).forEach(function (k) {
    if (!/:gate$/.test(k)) return;
    scripts[k].split('&&').map(function (s) { return s.trim(); }).forEach(function (part) {
      const toks = part.split(/\s+/);
      const ok = reg.entries.some(function (e) { return tokenPrefix(toks, e.command.split(/\s+/)); });
      if (!ok) errors.push('alignment: alias ' + k + ' part "' + part + '" matches no gates.json entry (ADR-0034 D5)');
    });
  });
  return errors;
}

function defaultExec(command) {
  const r = spawnSync(command, { shell: true, cwd: ROOT, encoding: 'utf8', env: process.env });
  return { code: r.status === null ? 1 : r.status, output: (r.stdout || '') + (r.stderr || '') };
}

function runGates(reg, opts) {
  const o = opts || {};
  const exec = o.exec || defaultExec;
  const schedule = reg.entries.slice().sort(function (a, b) { return a.order - b.order; });
  const results = [];
  let confirmFailed = false;
  schedule.forEach(function (e) {
    function skip(status) { results.push({ name: e.name, order: e.order, tier: e.tier, status: status, warnings: 0, output: '' }); }
    if (e.tier === 'deferred-with-unfreeze') return skip('skipped-deferred');
    if (o.failFast && e.tier === 'observational') return skip('skipped-observational');
    if (o.failFast && confirmFailed) return skip('skipped-fail-fast');
    // ADR-0040 D2/D5 + ADR-0041 D2: capability precheck - a deterministically
    // absent capability degrades the gate to UNVERIFIABLE, never pass/fail;
    // a child's exit 2 aggregates into the same column below.
    const probeFn = o.probe || probe;
    const missing = (e.requires || []).filter(function (c) { return !probeFn(c); });
    if (missing.length) {
      results.push({ name: e.name, order: e.order, tier: e.tier, status: 'unverifiable', code: 2, missing: missing, warnings: 0, output: '' });
      return;
    }
    const r = exec(e.command);
    const lines = String(r.output || '').split(/\r?\n/);
    const warnLines = lines.filter(function (l) { return /^::warning/.test(l); });
    // ADR-0041 D2/D3: exit 2 has exactly one meaning - probed capability
    // absence. A child that exits 2 never ran its check; it lands in the
    // UNVERIFIABLE column, never in fail.
    if (r.code === 2) {
      results.push({
        name: e.name, order: e.order, tier: e.tier, status: 'unverifiable', code: 2,
        missing: null, warnings: 0,
        output: lines.filter(function (l) { return !/^::warning/.test(l); }).join('\n'),
      });
      return;
    }
    // ADR-0043 D-G: choke check - every gate's output funnels through here,
    // so one rule covers all children: a '[<word>]:' line outside the closed
    // enum (src/shared/prefix-vocab.js) is a contract breach. Second line of
    // defense; per-gate spawn contract tests remain the first.
    const badPrefix = lines.filter(function (l) {
      const m = /^\[[a-z][a-z-]*\]:/.exec(l);
      return m && Object.keys(PREFIXES).every(function (k) { return PREFIXES[k] !== m[0]; });
    });
    if (badPrefix.length) {
      lines.push('PREFIX-VOCAB violation: unknown prefix(es) ' + badPrefix.map(function (l) { return l.split(':')[0] + ':'; }).join(', ') + ' (ADR-0043 D-G; closed enum: src/shared/prefix-vocab.js)');
    }
    const fail = r.code !== 0 || badPrefix.length > 0;
    if (fail && e.tier === 'confirmatory') confirmFailed = true;
    results.push({
      name: e.name, order: e.order, tier: e.tier,
      status: fail ? 'fail' : 'pass', code: r.code, warnings: warnLines.length,
      output: lines.filter(function (l) { return !/^::warning/.test(l); }).join('\n'),
    });
  });
  const exitCode = results.some(function (r) { return r.status === 'fail' && r.tier === 'confirmatory'; }) ? 1 : 0;
  return { results: results, exitCode: exitCode };
}

function checkCoupling(baseRef) {
  const { couplingViolation } = require('./check-bench-thresholds'); // ADR-0040 D2: deferred require - probes run before runtime deps load
  const base = baseRef || process.env.CI_BASE_REF || null;
  if (!base) return []; // no base available -> skip (repo convention, ADR-0027 D2)
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only', '-z', base + '...HEAD'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) { return ['coupling check: git diff ' + base + '...HEAD failed']; }
  const changed = diff.split(String.fromCharCode(0)).map(function (s) { return s.trim(); }).filter(Boolean);
  return couplingViolation(changed, base, {
    cfgRel: REGISTRY_REL,
    reason: 'gate registry changes require a same-commit ADR (ADR-0034 D1)',
  });
}

function main(argv) {
  const args = argv.slice(2);
  const failFast = args.indexOf('--fail-fast') !== -1;
  let reg;
  try {
    reg = loadRegistry();
  } catch (err) {
    console.error(PREFIXES.config + ' FAIL: ' + err.message);
    process.exit(1);
  }
  const schemaErrors = validateRegistry(reg);

  if (args.indexOf('--check-alignment') !== -1) {
    requireCapabilities('gates-alignment');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, PACKAGE_REL), 'utf8'));
    const errors = schemaErrors.concat(checkAlignment(reg, pkg));
    errors.forEach(function (e) { console.error(PREFIXES.config + ' FAIL: ' + e); });
    if (errors.length) process.exit(1);
    console.log('gates alignment OK (' + reg.entries.length + ' entries, ' + META_ENTRIES.length + ' meta-checks)');
    process.exit(0);
  }

  const ci = args.indexOf('--check-coupling');
  if (ci !== -1) {
    requireCapabilities('gates-coupling');
    const next = args[ci + 1];
    const baseRef = next && next.indexOf('--') !== 0 ? next : null;
    const errors = checkCoupling(baseRef);
    errors.forEach(function (e) { console.error(PREFIXES.config + ' FAIL: ' + e); });
    if (errors.length) process.exit(1);
    console.log('gates coupling OK (base: ' + (baseRef || process.env.CI_BASE_REF || 'none - skipped') + ')');
    process.exit(0);
  }

  if (schemaErrors.length) {
    schemaErrors.forEach(function (e) { console.error(PREFIXES.config + ' FAIL: ' + e); });
    process.exit(1);
  }

  const res = runGates(reg, { failFast: failFast });
  res.results.forEach(function (r) {
    console.log('[' + r.order + ' ' + r.name + '] ' + r.status.toUpperCase());
    if (r.output && r.output.trim()) process.stdout.write(r.output.replace(/\n+$/, '') + '\n');
  });
  const warned = res.results.filter(function (r) { return r.warnings > 0; });
  if (warned.length) {
    const n = warned.reduce(function (a, r) { return a + r.warnings; }, 0);
    console.log('::warning title=gate:all::' + n + ' advisory/band warning(s) from gates: ' + warned.map(function (r) { return r.name; }).join(', '));
  }
  const unverifiable = res.results.filter(function (r) { return r.status === 'unverifiable'; });
  if (unverifiable.length) {
    // ADR-0040 D4/D5: ONE aggregated annotation (GitHub caps 10/step); the
    // per-gate rows above carry the detail in plain log lines.
    console.log('::error title=UNVERIFIABLE::' + unverifiable.length + ' gate(s) unverifiable: ' + unverifiable.map(function (r) { return r.name + ' requires ' + (r.missing ? r.missing.join('+') : '(child exit 2)'); }).join(', '));
  }
  console.log('gate:all exit ' + res.exitCode + ' (' + res.results.length + ' entries, ' + unverifiable.length + ' unverifiable, fail-fast ' + (failFast ? 'on' : 'off') + ')');
  process.exit(res.exitCode);
}

if (require.main === module) main(process.argv);

module.exports = { ConfigLoadError, loadRegistry, validateRegistry, checkAlignment, checkCoupling, runGates, tokenPrefix, META_ENTRIES, TIERS, REGISTRY_REL };
