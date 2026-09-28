// bench/codebuddy-trial/tools/lib/manifest.js — run-manifest spine (D-002).
// Schema v1. Open fields: run_id/phase/volume/planned_task_ids/opened_at/
// host_version/bundle_sha/manifest_schema_version (+ probes plan). Close
// fields: closed_at/status:sealed/observed_session_ids/spans_boundary_sessions/
// task_completion_tally/probes outcome. Sealed manifests are immutable —
// corrections issue a new manifest, never an edit (errata-isomorphic).
//
// All functions take T = require("./paths").resolve(trialRoot) so fixture
// roots and the real bench tree share one code path.
'use strict';
const fs = require('fs');
const path = require('path');
const { isIsoUtc, writeJson, fail } = require('./common');

const MANIFEST_SCHEMA_VERSION = 1;
const PHASES = ['P0', 'P1', 'P2'];
const VOLUMES = ['a', 'b', 'c'];
const ITEM0_TASK_ID = 'item-0-telemetry-probe';

function loadManifest(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function listManifests(T) {
  const dir = T.RUNS;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^.+\.json$/.test(f) && f !== 'deviations-cursor.json')
    .sort()
    .map((f) => ({ file: path.join(dir, f), manifest: loadManifest(path.join(dir, f)) }));
}

// The single-open-window invariant (D-002 iv): an unsealed manifest on the
// lane hard-errors the next open — forgetting end blocks instead of
// silently double-owning sessions.
function openWindows(T) {
  return listManifests(T).filter((r) => r.manifest.status === 'open');
}

function validateOpenShape(m) {
  const errs = [];
  for (const k of ['run_id', 'phase', 'volume', 'planned_task_ids', 'opened_at',
    'host_version', 'bundle_sha', 'manifest_schema_version', 'status']) {
    if (m[k] === undefined) errs.push('missing:' + k);
  }
  if (errs.length) return errs;
  if (m.manifest_schema_version !== MANIFEST_SCHEMA_VERSION) errs.push('bad:manifest_schema_version');
  if (PHASES.indexOf(m.phase) < 0) errs.push('bad:phase');
  if (VOLUMES.indexOf(m.volume) < 0) errs.push('bad:volume');
  if (!Array.isArray(m.planned_task_ids) || m.planned_task_ids.some((t) => typeof t !== 'string')
    || m.planned_task_ids.length === 0) errs.push('bad:planned_task_ids');
  if (!isIsoUtc(m.opened_at)) errs.push('bad:opened_at (ISO-8601-UTC required)');
  if (m.status !== 'open') errs.push('bad:status (open expected)');
  return errs;
}

function validateSealedShape(m) {
  const errs = validateOpenShape(m).filter((e) => e !== 'bad:status (open expected)');
  if (m.status !== 'sealed') errs.push('bad:status (sealed expected)');
  if (!isIsoUtc(m.closed_at)) errs.push('bad:closed_at (ISO-8601-UTC required)');
  if (!Array.isArray(m.observed_session_ids)) errs.push('bad:observed_session_ids');
  if (!Array.isArray(m.spans_boundary_sessions)) errs.push('bad:spans_boundary_sessions');
  if (!m.task_completion_tally || typeof m.task_completion_tally !== 'object') errs.push('bad:task_completion_tally');
  return errs;
}

function openManifest(T, opts) {
  const open = openWindows(T);
  if (open.length > 0) {
    fail('single-open-window violation: ' + open.map((r) => r.manifest.run_id).join(', ')
      + ' still unsealed — run tools/end.js first (D-002 iv)');
  }
  const m = {
    manifest_schema_version: MANIFEST_SCHEMA_VERSION,
    run_id: opts.run_id,
    phase: opts.phase,
    volume: opts.volume,
    planned_task_ids: opts.planned_task_ids.slice(),
    opened_at: opts.opened_at,
    host_version: opts.host_version,
    bundle_sha: opts.bundle_sha,
    probes: { item0_task_id: opts.phase === 'P0' ? ITEM0_TASK_ID : null },
    status: 'open',
    closed_at: null,
    observed_session_ids: [],
    spans_boundary_sessions: [],
    task_completion_tally: null,
  };
  const errs = validateOpenShape(m);
  if (errs.length) fail('manifest open-shape invalid: ' + errs.join('; '));
  const file = T.manifestPath(m.run_id);
  if (fs.existsSync(file)) fail('run_id already exists: ' + m.run_id + ' (manifests are immutable once written)');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeJson(file, m);
  return { file, manifest: m };
}

// Seal: fill close fields and flip status. Never edits a sealed manifest.
function sealManifest(T, runId, close) {
  const file = T.manifestPath(runId);
  if (!fs.existsSync(file)) fail('no such run manifest: ' + runId);
  const m = loadManifest(file);
  if (m.status === 'sealed') fail('manifest already sealed: ' + runId + ' (sealed manifests are immutable — issue a new manifest for corrections)');
  if (m.status !== 'open') fail('manifest in unknown status: ' + m.status);
  if (!isIsoUtc(close.closed_at)) fail('closed_at must be ISO-8601-UTC');
  m.closed_at = close.closed_at;
  m.status = 'sealed';
  m.observed_session_ids = close.observed_session_ids.slice().sort();
  m.spans_boundary_sessions = close.spans_boundary_sessions.slice().sort();
  m.task_completion_tally = close.task_completion_tally;
  m.probes = Object.assign({}, m.probes, close.probes || {});
  if (close.telemetry_dir !== undefined) m.telemetry_dir = close.telemetry_dir;
  const errs = validateSealedShape(m);
  if (errs.length) fail('manifest sealed-shape invalid: ' + errs.join('; '));
  writeJson(file, m);
  return { file, manifest: m };
}

module.exports = {
  MANIFEST_SCHEMA_VERSION, PHASES, VOLUMES, ITEM0_TASK_ID,
  loadManifest, listManifests, openWindows,
  validateOpenShape, validateSealedShape, openManifest, sealManifest,
};
