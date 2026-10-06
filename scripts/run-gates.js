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
// (g) grill-t37 T-0/T-2/T-3/T-4: per-leg timing + the derived status
//     inventory emission. Each leg's wall time is measured at the spawn seam
//     (the runner is the only party that can see it) and BOTH artifacts land
//     in the per-run artifact dir (test-artifacts/, the junit.xml family):
//       leg-timing/<run_id>.json      - per-leg durations + p50/p95, EMIT
//                                     ONLY, nothing gates on it (D-006.6);
//                                     tier timeout defaults stay unset until
//                                     the measured distribution fills them.
//       status-inventory/<run_id>.json- non-green rows only (D-002.2), written
//                                     incrementally so the member set up to
//                                     the currently-running leg is on disk.
//     timeout_s (per-leg gates.json field, optional positive int) and the
//     ::jiahao declared_reason=<code> channel are live now; an out-of-set
//     declared_reason is a registry violation and fails the leg (D-003.1).
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
// ADR-0093 D-4 (grill-t36 D-006): the tracked-surface snapshot module. Required
// DEFERRED inside runGates(), for the same reason checkCoupling defers
// check-bench-thresholds (ADR-0040 D2): the --check-alignment / --check-coupling
// paths and the registry-load failure path must not need runtime deps, and the
// wiring tests spawn this file into a bare tmp tree that carries only the
// modules those paths actually use.

const ROOT = path.join(__dirname, '..');
const REGISTRY_REL = path.join('docs', 'gates.json');
const PACKAGE_REL = 'package.json';
const TIERS = ['confirmatory', 'observational', 'deferred-with-unfreeze'];
const META_ENTRIES = ['gates-alignment', 'ci-wiring', 'gates-coupling'];

// grill-t37 D-003.4 / D-006.7: tier-derived timeout defaults. EMPTY until the
// T-0 measured distribution fills them - 'measure before legislate' is the
// standing rule (ADR-0078's accident shape is forbidden), so before the T-0
// distribution lands no leg times out by default. A per-leg timeout_s field
// overrides; the field itself is live immediately.
const TIER_TIMEOUT_S = {};

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
    // grill-t37 D-003.4: optional per-leg timeout_s, positive integer seconds.
    if (e && e.timeout_s !== undefined && !(Number.isInteger(e.timeout_s) && e.timeout_s > 0)) {
      errors.push(tag + ': timeout_s must be a positive integer of seconds when present (grill-t37 D-003.4)');
    }
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

function defaultExec(command, execOpts) {
  const o = execOpts || {};
  const spawnOpts = { shell: true, cwd: ROOT, encoding: 'utf8', env: process.env };
  // grill-t37 D-003.4: the runner owns the clock - spawn-start is the timing
  // origin (queue time never enters the leg's own clock; the timeout marker
  // is a runner-side observation, never the leg's self-report).
  if (o.timeout_ms) spawnOpts.timeout = o.timeout_ms;
  const r = spawnSync(command, spawnOpts);
  const timedOut = Boolean((r.error && r.error.code === 'ETIMEDOUT') || (r.status === null && r.signal));
  return {
    code: r.status === null ? 1 : r.status,
    output: (r.stdout || '') + (r.stderr || ''),
    timedOut: timedOut,
  };
}

// Per-leg timeout resolution (D-003.4 + D-006.7): explicit timeout_s wins;
// otherwise the tier default - which is UNSET until the T-0 measured
// distribution fills it, so nothing times out by default before then.
function resolveTimeoutMs(entry) {
  if (entry && Number.isInteger(entry.timeout_s) && entry.timeout_s > 0) return entry.timeout_s * 1000;
  const tier = TIER_TIMEOUT_S[entry && entry.tier];
  return Number.isInteger(tier) && tier > 0 ? tier * 1000 : null;
}

// ---- grill-t37 inventory emission ---------------------------------------
// Deferred require (ADR-0093 D-4 bare-tree precedent): these modules are
// needed only on the running path; --check-alignment / --check-coupling and
// the wiring-test tmp trees must not need them loaded.
function invLib() {
  return require('../src/shared/status-inventory');
}
function emitLib() {
  return require('../src/shared/per-run-artifacts');
}

// grill-t38 D-004 (T-3): the emission-side anchor for a status-inventory
// artifact. tree_sha MIRRORS the run_id's tree segment (run_id keeps its
// addressing role; its syntax is not touched, D-004.1); mode is the read
// discipline (a dirty worktree read is 'working-tree read', D-004.3); ref_context
// is the observation-context record classified by the ONE shared classifier
// (status-inventory.classifyRefContext). The live-branch enumeration is REUSED
// from evidence-freshness (the T-6 shard's liveAnchorRefs) - never re-rolled.
// Exported so run-test-gate.js shares this single implementation (D-M1).
function deriveAnchor(root, runId) {
  const inv = invLib();
  const { worktreeDirty } = require('../src/shared/run-id');
  const git = function (args) {
    try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch (e) { return ''; }
  };
  let liveRefs = [];
  try { liveRefs = require('./evidence-freshness').liveAnchorRefs(root); } catch (e) { liveRefs = []; }
  const facts = {
    head_sha: git(['rev-parse', 'HEAD']),
    head_ref: git(['symbolic-ref', '-q', 'HEAD']),
    origin_main_sha: git(['rev-parse', '--verify', '-q', 'origin/main']),
    workspace_ref: inv.WORKSPACE_REF,
    merge_base_sha: git(['merge-base', inv.WORKSPACE_REF, 'origin/main']),
    live_refs: liveRefs,
  };
  return {
    tree_sha: (runId && runId.tree_sha) || null,
    ref_context: inv.classifyRefContext(facts),
    mode: worktreeDirty(root) ? 'working-tree read' : 'tree-internal read',
  };
}

// One inventory row per non-green result (D-002.2: greens aggregate in the
// committed manifest, never here). The row carries the runner-adjudicated
// reason_code (authoritative) and any leg-declared_reason (reference-only).
function rowForResult(e, r, surface) {
  const inv = invLib();
  const row = {
    unit_kind: 'gate-leg',
    name: e.name,
    command: e.command,
    exit: typeof r.code === 'number' ? r.code : null,
    status: r.status,
    judged_surface: surface,
    evidence_ref: 'rerun: ' + e.command,
    duration_ms: typeof r.duration_ms === 'number' ? r.duration_ms : null,
  };
  const rc = inv.attributeReason(r);
  if (rc) row.reason_code = rc;
  if (r.declared_reason) row.declared_reason = r.declared_reason;
  return row;
}

// Incremental per-run emission: after every leg the member set so far is on
// disk, so the assert leg (which runs inside this same run, near the end of
// the registry order) reads the derivation for all legs that precede it.
// Emission failure is loud, never silent, and never rewrites a leg verdict:
// the runner notes it and the run's own output names it.
function emitInventory(state) {
  if (!state.emit) return;
  const emit = emitLib();
  const inv = invLib();
  // Expected-red annotation (D-001.2): the registry is read once per run and
  // certifying entries ride on the artifact rows as evidence detail -
  // expected_red is member-identity-excluded (registration state is not a
  // member identity, it is adjudication metadata).
  if (state.expectedRed === undefined) {
    try {
      const p = path.join(ROOT, inv.EXPECTED_RED_RELS.split('/').join(path.sep));
      state.expectedRed = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { state.expectedRed = null; }
  }
  const rows = state.rows.map(function (r) {
    const m = inv.isExpectedRed(r, state.expectedRed);
    return m ? Object.assign({}, r, { expected_red: { key: m.key, reason_code: m.reason_code, expires_at: m.expires_at } }) : r;
  });
  const payload = {
    schema: 'status-inventory v1',
    run_id: state.runId.run_id,
    judged_surface: state.runId.judged_surface,
    tree_sha: state.runId.tree_sha,
    // grill-t38 D-004 (T-3): the emission-side anchor (additive v1.1).
    anchor: state.anchor,
    runner_ctx: state.runId.runner_ctx,
    emitted_at: new Date().toISOString(),
    complete: state.complete === true,
    normalized_join_key_version: inv.JOIN_KEY_VERSION,
    rows: rows,
    closeout: state.complete ? {
      reason_code_breakdown: inv.reasonCodeBreakdown(rows),
      counts: {
        fail: rows.filter(function (r) { return r.status === 'fail'; }).length,
        unverifiable: rows.filter(function (r) { return r.status === 'unverifiable'; }).length,
      },
    } : null,
  };
  try {
    state.file = emit.emitArtifact({
      dir: state.emit.dir, subdir: 'status-inventory',
      prefix: 'status-inventory', runId: state.runId, payload: payload,
    });
  } catch (err) {
    state.emitErrors.push('status-inventory emission failed: ' + err.message);
  }
}

function emitTiming(state) {
  if (!state.emit) return;
  const emit = emitLib();
  const durations = state.results
    .filter(function (r) { return typeof r.duration_ms === 'number'; })
    .map(function (r) { return { order: r.order, name: r.name, tier: r.tier, status: r.status, duration_ms: r.duration_ms }; })
    .sort(function (a, b) { return a.duration_ms - b.duration_ms; });
  const pct = function (p) {
    if (!durations.length) return null;
    const i = Math.min(durations.length - 1, Math.ceil(p * durations.length) - 1);
    return durations[i].duration_ms;
  };
  try {
    emit.emitArtifact({
      dir: state.emit.dir, subdir: 'leg-timing',
      prefix: 'leg-timing', runId: state.runId,
      payload: {
        schema: 'leg-timing v1',
        run_id: state.runId.run_id,
        judged_surface: state.runId.judged_surface,
        emitted_at: new Date().toISOString(),
        note: 'EMIT ONLY - nothing gates on this distribution (grill-t37 D-006.6); the tier timeout default fills from measured values in the T-0 legislation commit',
        legs: durations,
        summary: { leg_count: durations.length, p50_ms: pct(0.50), p95_ms: pct(0.95), max_ms: durations.length ? durations[durations.length - 1].duration_ms : null },
      },
    });
  } catch (err) {
    state.emitErrors.push('leg-timing emission failed: ' + err.message);
  }
}

function runGates(reg, opts) {
  const o = opts || {};
  const exec = o.exec || defaultExec;
  const schedule = reg.entries.slice().sort(function (a, b) { return a.order - b.order; });
  const results = [];
  let confirmFailed = false;
  const state = {
    emit: o.emit || null,
    runId: o.runId || null,
    surface: (o.runId && o.runId.judged_surface) || 'gates',
    rows: [],
    results: results,
    emitErrors: [],
    complete: false,
    // grill-t38 D-004 (T-3): the emission-side anchor, derived ONCE per run
    // (the observation context is the run's, not the leg's). Injectable via
    // o.anchor for tests; only derived when the run actually emits.
    anchor: o.anchor !== undefined ? o.anchor
      : (o.emit ? deriveAnchor(o.root || ROOT, o.runId) : null),
  };
  // ADR-0093 D-4: entry zero point over the whole tracked tree. This is
  // wrapper-level instrumentation, not a gates.json leg - a leg is
  // structurally unable to observe the other legs, and an observation point
  // in the wrong place is the argument that rejected a CI leg in t35-D-L1.
  // (Same shape, different substance: where a thing can see vs who can see
  // what. The two rejections are written apart in the ADR on purpose.)
  // Opt out with trackedSurface:false; there is deliberately NO per-leg
  // exemption channel - a leg that must write a tracked path has a contract
  // problem, and an exemption list is where that would go to hide.
  const surface = o.trackedSurface === false ? null
    : require('../src/shared/tracked-surface').trackedSurface({ root: o.root || ROOT });
  const surfaceRows = [];
  if (surface) surface.begin();
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
      const row = { name: e.name, order: e.order, tier: e.tier, status: 'unverifiable', code: 2, missing: missing, warnings: 0, output: '' };
      results.push(row);
      state.rows.push(rowForResult(e, row, state.surface));
      emitInventory(state);
      return;
    }
    const t0 = Date.now();
    const r = exec(e.command, { timeout_ms: resolveTimeoutMs(e) });
    const duration_ms = Date.now() - t0;
    // ADR-0093 D-4: recompute after each leg. Attribution granularity is
    // two-layer - leg number plus file - and the changed-path list is not
    // expanded into a full diff.
    if (surface) {
      const changed = surface.checkpoint();
      if (changed.length) {
        surfaceRows.push({ order: e.order, name: e.name, files: changed });
      }
    }
    // grill-t37 D-003.1: the declared_reason channel. Parse + strip the
    // marker line; an out-of-set code is a registry violation (fail), and a
    // declared-vs-inferred mismatch is recorded on the row, never blocking
    // (D-003.7: the first real case decides the blocking semantics).
    const declared = [];
    const keptLines = [];
    let declaredViolation = null;
    for (const l of String(r.output || '').split(/\r?\n/)) {
      const m = invLib().DECLARED_REASON_RE.exec(l);
      if (m) {
        if (invLib().REASON_CODES.indexOf(m[1]) === -1) declaredViolation = m[1];
        else declared.push(m[1]);
        continue;
      }
      keptLines.push(l);
    }
    const lines = keptLines;
    const warnLines = lines.filter(function (l) { return /^::warning/.test(l); });
    // grill-t37 D-003.1 + rework F-2: an out-of-set declared_reason is a
    // registry violation observed in the leg's output - it fails the leg
    // BEFORE the timedOut/exit-2 branches, which would otherwise return
    // unverifiable rows that silently swallow the violation.
    if (declaredViolation) {
      lines.push('DECLARED-REASON violation: ::jiahao declared_reason=' + declaredViolation + ' is outside the closed set [' + invLib().REASON_CODES.join(', ') + '] (grill-t37 D-003.1 - registry violation, never a certification)');
      const vrow = {
        name: e.name, order: e.order, tier: e.tier, status: 'fail',
        code: r.timedOut ? 2 : r.code,
        missing: null, timedOut: Boolean(r.timedOut), warnings: warnLines.length,
        declared_reason: null, duration_ms: duration_ms,
        output: lines.filter(function (l) { return !/^::warning/.test(l); }).join('\n'),
      };
      if (e.tier === 'confirmatory') confirmFailed = true;
      results.push(vrow);
      state.rows.push(rowForResult(e, vrow, state.surface));
      emitInventory(state);
      return;
    }
    // grill-t37 D-003.3 timeout bucket: a leg the runner's clock killed is
    // UNVERIFIABLE with reason_code 'timeout' - the run produced no verdict
    // on it, which is honest, and never reads as a leg verdict.
    if (r.timedOut) {
      const row = {
        name: e.name, order: e.order, tier: e.tier, status: 'unverifiable', code: 2,
        missing: null, timedOut: true, warnings: warnLines.length,
        declared_reason: declared[declared.length - 1] || null,
        duration_ms: duration_ms,
        output: lines.filter(function (l) { return !/^::warning/.test(l); }).join('\n')
          + '\n[timedOut]: leg exceeded timeout_s ' + (resolveTimeoutMs(e) / 1000) + 's (runner-side clock; spawn-start origin)',
      };
      results.push(row);
      state.rows.push(rowForResult(e, row, state.surface));
      emitInventory(state);
      return;
    }
    // ADR-0041 D2/D3: exit 2 has exactly one meaning - probed capability
    // absence. A child that exits 2 never ran its check; it lands in the
    // UNVERIFIABLE column, never in fail.
    if (r.code === 2) {
      const row = {
        name: e.name, order: e.order, tier: e.tier, status: 'unverifiable', code: 2,
        missing: null, warnings: 0, declared_reason: declared[declared.length - 1] || null,
        duration_ms: duration_ms,
        output: lines.filter(function (l) { return !/^::warning/.test(l); }).join('\n'),
      };
      results.push(row);
      state.rows.push(rowForResult(e, row, state.surface));
      emitInventory(state);
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
    // grill-t37 D-003.1: out-of-set declared_reason = registry violation -
    // handled above the timedOut/exit-2 returns (rework F-2); this path is
    // unreachable by construction.
    const fail = r.code !== 0 || badPrefix.length > 0;
    if (fail && e.tier === 'confirmatory') confirmFailed = true;
    const row = {
      name: e.name, order: e.order, tier: e.tier,
      status: fail ? 'fail' : 'pass', code: r.code, warnings: warnLines.length,
      declared_reason: declared[declared.length - 1] || null,
      duration_ms: duration_ms,
      output: lines.filter(function (l) { return !/^::warning/.test(l); }).join('\n'),
    };
    results.push(row);
    if (row.status !== 'pass') state.rows.push(rowForResult(e, row, state.surface));
    emitInventory(state);
  });
  // ADR-0093 D-4: the synthetic result row. Its tier is confirmatory blocking
  // and does not drop to advisory - a leg that mutates the tree it measured is
  // exactly the lesion this contract exists to make visible, and a visible
  // lesion that cannot block is a comment.
  if (surface) {
    const clean = surfaceRows.length === 0;
    const lines = clean
      ? ['no tracked file changed during this run (whole tracked tree hashed at entry and again after each leg)']
      : surfaceRows.map(function (row) {
        return 'leg ' + row.order + ' ' + row.name + ' mutated ' + row.files.length + ' tracked path(s): ' + row.files.join(', ');
      });
    const tsRow = {
      name: '- tracked-surface', order: 'D-4', tier: 'confirmatory',
      status: clean ? 'pass' : 'fail', code: clean ? 0 : 1, warnings: 0,
      output: lines.join('\n'),
    };
    results.push(tsRow);
    if (tsRow.status !== 'pass') {
      state.rows.push(rowForResult({ name: '- tracked-surface', command: 'tracked-surface checkpoint (wrapper-internal, ADR-0093 D-4)' }, tsRow, state.surface));
    }
  }
  state.complete = true;
  emitInventory(state);
  emitTiming(state);
  const exitCode = results.some(function (r) { return r.status === 'fail' && r.tier === 'confirmatory'; }) ? 1 : 0;
  return { results: results, exitCode: exitCode, trackedSurface: surfaceRows, inventory: state.rows, emitErrors: state.emitErrors };
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

  const res = runGates(reg, {
    failFast: failFast,
    // grill-t37 D-005.1/.2: per-run emission is always on for real runs;
    // the artifact dir is the existing gitignored per-run family.
    emit: { dir: require('../src/shared/per-run-artifacts').DEFAULT_DIR },
    runId: require('../src/shared/run-id').buildRunId({ surface: 'gates', root: ROOT }),
  });
  for (const e of res.emitErrors) console.error('[status-inventory] EMISSION DEFECT: ' + e);
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

module.exports = { ConfigLoadError, loadRegistry, validateRegistry, checkAlignment, checkCoupling, runGates, tokenPrefix, META_ENTRIES, TIERS, REGISTRY_REL, deriveAnchor };
