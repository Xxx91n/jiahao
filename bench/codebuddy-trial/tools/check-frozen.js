#!/usr/bin/env node
// bench/codebuddy-trial/tools/check-frozen.js — golden --check leg for the
// frozen trial artifacts (D-005/D-007). Asserts sha256 pins for
// eval-map.json, volumes/{a,b,c}.json and judgment-lines.json against
// frozen-sha256.json, plus manifest schema validity for every runs/*.json.
// NO --update flag exists by design: re-pinning is a reseal act (new ledger
// D-record), never an in-place update.
//
// Usage: node check-frozen.js [--trial-root <dir>] [--repo <dir>]
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, sha256File } = require('./lib/common');
const M = require('./lib/manifest');
const paths = require('./lib/paths');

const args = parseArgs(process.argv.slice(2));
const T = paths.resolve(args['trial-root']);
const repo = args.repo ? path.resolve(args.repo) : T.REPO;
const errors = [];

const pins = JSON.parse(fs.readFileSync(T.FROZEN_PINS, 'utf8'));
for (const [rel, spec] of Object.entries(pins.pins)) {
  const abs = path.join(T.ROOT, rel);
  if (!fs.existsSync(abs)) { errors.push('missing frozen artifact: ' + rel); continue; }
  if (typeof spec === 'string') {
    const got = sha256File(abs);
    if (got !== spec) errors.push('frozen drift: ' + rel + ' sha256=' + got + ' expected ' + spec);
    continue;
  }
  // body-pin form: {sha256, strip_fields:[...]} — hash the JSON body with
  // the registered append-only slots stripped (deviations[] is the sole
  // legal append channel; pinning it would forbid the channel itself).
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const body = JSON.parse(JSON.stringify(doc));
  for (const k of spec.strip_fields || []) body[k] = [];
  const got = require('crypto').createHash('sha256').update(JSON.stringify(body)).digest('hex');
  if (got !== spec.sha256) errors.push('frozen body drift: ' + rel + ' sha256=' + got + ' expected ' + spec.sha256);
}

// detector pin cross-check: eval-map + judgment-lines must agree with the
// live blob — a three-way pin makes silent re-pinning impossible.
const em = JSON.parse(fs.readFileSync(T.EVAL_MAP, 'utf8'));
const jl = JSON.parse(fs.readFileSync(T.JUDGMENT_LINES, 'utf8'));
const live = sha256File(path.join(repo, em.detector.path));
if (live !== em.detector.blob_sha256) errors.push('eval-map detector pin drift: ' + live);
if (live !== jl.frozen_detector.blob_sha256) errors.push('judgment-lines detector pin drift: ' + live);

// manifest schema: every runs/*.json must validate (open or sealed shape).
for (const r of M.listManifests(T)) {
  const errs = r.manifest.status === 'sealed' ? M.validateSealedShape(r.manifest) : M.validateOpenShape(r.manifest);
  if (errs.length) errors.push(r.manifest.run_id + ': ' + errs.join('; '));
}

// volumes: schema spot-check (task entries carry the registered field set).
for (const v of ['a', 'b', 'c']) {
  const vf = path.join(T.VOLUMES, v + '.json');
  if (!fs.existsSync(vf)) { errors.push('missing volume ' + v); continue; }
  const vol = JSON.parse(fs.readFileSync(vf, 'utf8'));
  for (const t of vol.tasks || []) {
    for (const k of ['task_id', 'category', 'prompt_text', 'prompt_sha256', 'shape_group', 'workbench_site']) {
      if (t[k] === undefined) errors.push(v + '/' + t.task_id + ': missing field ' + k);
    }
  }
}

if (errors.length) {
  console.log(JSON.stringify({ status: 'frozen-check-failed', errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'frozen-ok', pins_checked: Object.keys(pins.pins).length }, null, 2));