#!/usr/bin/env node
// scripts/corpus-tier-drift.js -- ADR-0056 D-D maintainer full-tier recurrence.
// On a host holding the private corpus, re-runs the corpus-tiered suites
// (derived: every test file requiring test/helpers/corpus-gate) on BOTH tiers
// and reports drift; an inverted outcome (public passes more than full) is
// DRIFT, not a note. verifies the committed fixture fingerprints
// (ADR-0027 D9 discipline: a fixture change requires re-baselining the
// fingerprint). Exit 1 on any fingerprint drift or tier-level failure.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FIXTURE_DIR = path.join(ROOT, 'test', 'fixtures', 'corpus');
// Derived from who actually resolves the corpus, so a newly tiered suite can
// never escape the recurrence gate silently (no manual list to keep in sync).
const SUITES = fs.readdirSync(path.join(ROOT, 'test'))
  .filter(f => /\.test\.js$/.test(f))
  .filter(f => fs.readFileSync(path.join(ROOT, 'test', f), 'utf8').indexOf('helpers/corpus-gate') !== -1)
  .map(f => 'test/' + f);
const SUMMARY_RE = /Tests:\s+(?:(\d+) skipped,\s+)?(?:(\d+) failed,\s+)?(\d+) passed/;

// 1. Fingerprint discipline: fingerprints.json must match fixture bytes.
function verifyFingerprints() {
  const fp = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'fingerprints.json'), 'utf8'));
  const drift = [];
  for (const [name, sha] of Object.entries(fp.files)) {
    const p = path.join(FIXTURE_DIR, name);
    if (!fs.existsSync(p)) { drift.push(name + ': missing file'); continue; }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    if (actual !== sha) drift.push(name + ': fingerprint drift (fixture changed without re-baselining, ADR-0027 D9)');
  }
  for (const f of fs.readdirSync(FIXTURE_DIR)) {
    if (f !== 'fingerprints.json' && !fp.files[f]) drift.push(f + ': new fixture without fingerprint');
  }
  return drift;
}

// 2. Run one tier; return { failed, passed, skipped }.
function runTier(tier) {
  const env = tier ? Object.assign({}, process.env, { JIAHAO_TEST_TIER: tier }) : process.env;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js')].concat(SUITES), {
    cwd: ROOT, encoding: 'utf8', env,
  });
  const m = SUMMARY_RE.exec((r.stdout || '') + (r.stderr || ''));
  if (!m) return { failed: 1, passed: 0, skipped: 0, note: 'no summary; status=' + r.status };
  const failed = m[2] ? Number(m[2]) : (r.status !== 0 ? 1 : 0); // summary shows failures, else exit code is the truth
  return { failed, passed: Number(m[3]), skipped: Number(m[1] || 0) };
}

const drift = verifyFingerprints();
console.log('[tier-drift] fingerprints:', drift.length ? 'DRIFT' : 'OK');
for (const d of drift) console.error('[tier-drift] DRIFT ' + d);

const full = runTier(null); // host default = full when the private corpus is present
console.log('[tier-drift] full:   ' + JSON.stringify(full));
const pub = runTier('public');
console.log('[tier-drift] public: ' + JSON.stringify(pub));

let fail = drift.length > 0 || full.failed > 0 || pub.failed > 0;
// Drift report: a fixture verdict differing from the full tier on the same
// suite set is the signal the maintainer must re-baseline or fix the fixture.
if (pub.passed > full.passed) {
  console.error('[tier-drift] DRIFT: public tier passes more tests than full-tier on the same suite set (verdict divergence; re-baseline or fix the fixture)');
  fail = true;
}
console.log(fail ? '[tier-drift] FAIL' : '[tier-drift] OK');
process.exit(fail ? 1 : 0);
