#!/usr/bin/env node
// bench/codebuddy-trial/tools/selfcheck.js — D-006 replay validation.
// Asserts, over the committed+Tier-1 surfaces:
//   (a) deviation cursor coverage: every deviations.jsonl row is aggregated
//       into judgment-lines.deviations[] (no appended-but-unsummarized gap);
//   (b) manifest tally consistency: sealed manifest observed_session_ids
//       equal the sessions visible in that run's capture store;
//   (c) Tier-1 hash stability: raw sink files referenced by capture rows,
//       when still reachable via the manifest's telemetry_dir, still hash to
//       the recorded file_sha256 (a drifted raw file is a tamper signal);
//   (d) claim file integrity: body sha256 matches its header pin.
// Exit 0 = all checks pass; exit 1 = failures listed (never silently green).
//
// Usage: node selfcheck.js [--trial-root <dir>]
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, sha256File, sha256, readJsonl } = require('./lib/common');
const M = require('./lib/manifest');
const paths = require('./lib/paths');
const D = require('./lib/deviations');
const CL = require('./lib/claims');

const args = parseArgs(process.argv.slice(2));
const T = paths.resolve(args['trial-root']);
const checks = [];
const push = (name, ok, detail) => checks.push({ name, ok, detail });

// (a) cursor == jsonl coverage + deviations[] back-pointer integrity.
const cc = D.checkCursor(T);
push('deviation-cursor-coverage', cc.errs.length === 0,
  cc.errs.length ? cc.errs.join('; ') : 'cursor ' + cc.cursor.last_seq + ' == ledger ' + cc.ledgerMax + ' == registered ' + cc.registered);

// (b) manifest tally vs store visibility.
const sealed = M.listManifests(T).filter((r) => r.manifest.status === 'sealed');
let tallyBad = [];
for (const r of sealed) {
  const sf = T.captureStore(r.manifest.run_id);
  if (!fs.existsSync(sf)) { tallyBad.push(r.manifest.run_id + ': no capture store'); continue; }
  const sids = new Set();
  for (const row of readJsonl(sf).rows) {
    if (!row.parse_error && row.obj && row.obj.session_id && row.obj.event_type !== 'session-binding' && row.obj.event_type !== 'session-signals') sids.add(row.obj.session_id);
  }
  const owned = new Set(r.manifest.observed_session_ids || []);
  const spans = new Set(r.manifest.spans_boundary_sessions || []);
  const missing = [...owned].filter((s) => !sids.has(s) && !spans.has(s));
  const extra = [...sids].filter((s) => !owned.has(s));
  if (missing.length || extra.length) tallyBad.push(r.manifest.run_id + ': missing=' + JSON.stringify(missing) + ' extra=' + JSON.stringify(extra));
}
push('manifest-tally-vs-store', tallyBad.length === 0, tallyBad.length ? tallyBad.join(' | ') : sealed.length + ' sealed manifest(s) consistent');

// (c) Tier-1 hash stability on raw inputs still reachable.
const hashBad = [], hashMissing = [];
for (const r of sealed) {
  const m = r.manifest;
  if (!m.telemetry_dir) continue;
  const sf = T.captureStore(m.run_id);
  if (!fs.existsSync(sf)) continue;
  const seenFiles = new Map();
  for (const row of readJsonl(sf).rows) {
    const o = row.obj;
    if (!o || !o.source || !o.source.file || !o.source.file_sha256) continue;
    if (!seenFiles.has(o.source.file)) seenFiles.set(o.source.file, o.source.file_sha256);
  }
  for (const [rel, sha] of seenFiles) {
    const abs = path.join(path.resolve(m.telemetry_dir), rel);
    if (!fs.existsSync(abs)) { hashMissing.push(m.run_id + '/' + rel); continue; }
    if (sha256File(abs) !== sha) hashBad.push(m.run_id + '/' + rel);
  }
}
push('tier1-hash-stability', hashBad.length === 0, hashBad.length ? 'drifted: ' + hashBad.join(', ') : (hashMissing.length ? 'ok (' + hashMissing.length + ' raw file(s) no longer present: ' + hashMissing.join(', ') + ')' : 'all reachable raw files hash-match'));

// (d) claim file integrity.
const claimBad = [];
for (const r of sealed) {
  for (const c of CL.listClaims(T.CLAIMS, r.manifest.run_id)) {
    if (c.malformed) { claimBad.push(c.file + ': malformed header'); continue; }
    if (c.headers.claim_sha256 && c.headers.claim_sha256 !== c.body_sha256) claimBad.push(c.file + ': body sha drift');
  }
}
push('claim-integrity', claimBad.length === 0, claimBad.length ? claimBad.join(' | ') : 'ok');

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ status: failed.length === 0 ? 'pass' : 'fail', checks }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);