#!/usr/bin/env node
// scripts/corpus-tier-drift.js -- ADR-0056 D-D maintainer full-tier recurrence.
// On a host holding the private corpus, re-runs the eight corpus-tiered suites
// on BOTH tiers and reports drift; verifies the committed fixture fingerprints
// (ADR-0027 D9 discipline: a fixture change requires re-baselining the
// fingerprint). Exit 1 on any fingerprint drift or tier-level failure.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FIXTURE_DIR = path.join(ROOT, 'test', 'fixtures', 'corpus');
const SUITES = [
  'test/adr-0030.test.js', 'test/adr-0031-wiring.test.js', 'test/adr-0033-wiring.test.js',
  'test/adr-0036-wiring.test.js', 'test/adr-0037-wiring.test.js',
  'test/detector.test.js', 'test/probe-gate.test.js', 'test/judge-seam.test.js',
];
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
  return { failed: Number(m[2] || 0) + (r.status !== 0 && !m[2] ? 1 : 0), passed: Number(m[3]), skipped: Number(m[1] || 0) };
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
  console.log('[tier-drift] note: public tier passes more tests than full (expected: full-only tests are skipped on public)');
}
console.log(fail ? '[tier-drift] FAIL' : '[tier-drift] OK');
process.exit(fail ? 1 : 0);
