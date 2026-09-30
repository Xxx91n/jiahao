#!/usr/bin/env node
'use strict';
// scripts/build-test-manifest.js - ADR-0091 (grill-t34 D-002): committed derived
// count manifest + README sentinel declaration regions (ADR-0043 D-B
// spliceRegion precedent - fail-closed on missing / inverted / duplicate
// sentinels). Lockfile pattern: committed artifact, hand-edit forbidden,
// regenerate + diff (D-008 weak self-consistency).
//
// Two independent count channels (D-002(i)):
//   - enumeration: jest --listTests (jest's own discovery - matches the
//     collection intent). The suites count derives from HERE only; a
//     JUnit-derived suites field is the forbidden circular shape and fails
//     --check structurally.
//   - junit: the generator's blessed jest run via scripts/jest-junit-lite.js
//     (tests / skipped; tests counts pending too, so it is tier-invariant).
//     --junit <path> consumes an existing artifact instead of re-running the
//     battery.
//
// Modes:
//   default        generate manifest and splice all four README regions
//   --junit <p>    consume an existing JUnit artifact instead of running jest
//   --check        regenerate the cheap declared surfaces (enumeration via
//                  --listTests, published_tip, junit.tier) and diff against
//                  the committed manifest (generated_at excluded); the junit
//                  section is validated structurally (forbidden suites field
//                  absent, integer fields present). Its LIVE freshness is
//                  asserted by run-test-gate post-jest (collected == manifest,
//                  suites AND tests) - a separate, non-simultaneous window per
//                  D-002 (staleness closed by two legs, never one).
//
// Injectable seams for the acceptance battery: opts.listTestsOutput,
// opts.gitOutput, opts.now, opts.root, opts.junitXml.

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MANIFEST_REL = path.join('docs', 'test-manifest.json');
const JUNIT_OUT = path.join('test-artifacts', 'junit.xml');
const README_PATHS = ['README.md', 'README-zh-CN.md'];

const MARKERS = {
  develop: {
    begin: '# test-manifest:develop:begin (derived - do not hand-edit; node scripts/build-test-manifest.js)',
    end: '# test-manifest:develop:end',
  },
  architecture: {
    begin: '<!-- test-manifest:architecture:begin (derived - do not hand-edit; node scripts/build-test-manifest.js) -->',
    end: '<!-- test-manifest:architecture:end -->',
  },
};

// ---- seams ----------------------------------------------------------------

function jestBin() {
  return require.resolve('jest-cli/bin/jest', { paths: [path.join(__dirname, '..')] });
}

// Enumeration channel: jest --listTests. Independent of any test execution.
function listTests(root) {
  const r = spawnSync(process.execPath, [jestBin(), '--listTests'], {
    cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: process.env,
  });
  if (r.error || r.status !== 0) throw new Error('[internal] jest --listTests failed: ' + (r.error ? r.error.message : 'exit ' + r.status));
  return String(r.stdout || '').split(/\r?\n/).map(function (s) { return s.trim(); })
    .filter(Boolean).map(function (f) { return path.relative(root, f).split(path.sep).join('/'); }).sort();
}

function gitRevParse(ref, root) {
  return execFileSync('git', ['rev-parse', ref], { cwd: root, encoding: 'utf8' }).trim();
}

// JUnit parse: tests/skipped ONLY. The suites count is never read from here.
function parseJunit(xml) {
  const head = String(xml).match(/<testsuites tests="(\d+)" failures="(\d+)" skipped="(\d+)"/);
  if (!head) throw new Error('[config] JUnit artifact missing the testsuites header - collection reporting broken');
  return { tests: Number(head[1]), skipped: Number(head[3]) };
}

// ---- manifest --------------------------------------------------------------

function buildManifest(opts) {
  opts = opts || {};
  const root = opts.root || ROOT;
  const now = opts.now || new Date();
  const files = opts.listTestsOutput ? String(opts.listTestsOutput).split(/\r?\n/).filter(Boolean).sort() : listTests(root);
  let junit;
  if (opts.junitXml) {
    junit = parseJunit(opts.junitXml);
  } else {
    // Blessed run: same invocation shape as the CI test job (run-test-gate.js).
    const out = path.join(root, JUNIT_OUT);
    try { fs.unlinkSync(out); } catch (e) { /* first run */ }
    const r = spawnSync(process.execPath, [jestBin(), '--verbose', '--reporters=default',
      '--reporters=' + path.join(__dirname, 'jest-junit-lite.js')],
      { cwd: root, stdio: 'inherit', env: process.env });
    if (r.error || r.status !== 0) throw new Error('[internal] blessed jest run failed: ' + (r.error ? r.error.message : 'exit ' + r.status));
    junit = parseJunit(fs.readFileSync(out, 'utf8'));
  }
  const tier = process.env.JIAHAO_TEST_TIER || 'full';
  const tip = opts.gitOutput || gitRevParse('origin/main', root);
  return {
    schema_version: 1,
    _doc: 'ADR-0091 (grill-t34 D-002): committed derived count manifest - lockfile pattern, hand-edit forbidden, regenerate + diff. enumeration = jest --listTests (suites derive here, NEVER from JUnit - forbidden circular field); junit = blessed jest run via scripts/jest-junit-lite.js (tests counts pending, tier-invariant; skipped is tier-variant and display-only). Live assertions: run-test-gate post-jest collected == manifest; check-test-manifest leg = enumeration freshness + README sentinel regions. Regenerate: node scripts/build-test-manifest.js [--junit <artifact>]; verify: --check (generated_at excluded).',
    generated_by: 'scripts/build-test-manifest.js',
    generated_at: now.toISOString(),
    enumeration: {
      channel: 'jest --listTests',
      suites: files.length,
      suite_files: files,
    },
    junit: {
      tier: tier,
      tests: junit.tests,
      skipped: junit.skipped,
      artifact: 'test-artifacts/junit.xml',
    },
    published_tip: tip,
  };
}

// D-008 equality domain: generated_at is volatile, everything else compares.
function stableCopy(m) {
  const c = JSON.parse(JSON.stringify(m));
  delete c.generated_at;
  return c;
}

function firstDiffPath(a, b, prefix) {
  const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort();
  for (const k of keys) {
    const va = a[k]; const vb = b[k];
    const p = prefix ? prefix + '.' + k : k;
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      if (typeof va === 'object' && va && typeof vb === 'object' && vb) {
        const sub = firstDiffPath(va, vb, p);
        if (sub) return sub;
      }
      return p;
    }
  }
  return null;
}

// ---- README sentinel regions ----------------------------------------------

// Pure: manifest -> the four generated declaration lines.
function renderLines(manifest) {
  const suites = manifest.enumeration.suites;
  const tests = manifest.junit.tests;
  const tierNote = ' suites \x28full corpus tier; the public tier skips 7 corpus-bound tests with reasons, ADR-0056\x29';
  return {
    develop: 'npm test                              # ' + tests + ' tests across ' + suites + tierNote,
    architecture_en: '- `test/` — ' + suites + ' test suites, ' + tests + ' tests',
    architecture_zh: '- `test/` —— ' + suites + ' test suites, ' + tests + ' tests',
  };
}

// Pure: splice one region between its sentinel lines. Fail-closed (ADR-0043
// D-B): missing, inverted or duplicate sentinels all throw.
function spliceRegion(text, pair, content, label) {
  const i = text.indexOf(pair.begin);
  const j = text.indexOf(pair.end);
  if (i === -1 || j === -1 || j < i) throw new Error('[config] ' + label + ' sentinel region missing or inverted');
  if (text.indexOf(pair.begin, i + 1) !== -1 || text.indexOf(pair.end, j + 1) !== -1) throw new Error('[config] duplicate ' + label + ' sentinel marker');
  return text.slice(0, i) + pair.begin + '\n' + content + '\n' + text.slice(j);
}

function updateReadmes(root, manifest) {
  const lines = renderLines(manifest);
  for (const rel of README_PATHS) {
    const abs = path.join(root, rel);
    const text = fs.readFileSync(abs, 'utf8');
    const zh = rel !== 'README.md';
    let next = spliceRegion(text, MARKERS.develop, lines.develop, rel + ': develop region');
    next = spliceRegion(next, MARKERS.architecture, zh ? lines.architecture_zh : lines.architecture_en, rel + ': architecture region');
    if (next !== text) fs.writeFileSync(abs, next);
  }
}

// ---- modes -----------------------------------------------------------------

function structuralErrors(m) {
  const errs = [];
  if (!m.enumeration || !Number.isInteger(m.enumeration.suites) || m.enumeration.suites <= 0) errs.push('enumeration.suites missing or not a positive integer');
  if (!Array.isArray(m.enumeration && m.enumeration.suite_files) || !m.enumeration.suite_files.length) errs.push('enumeration.suite_files missing or empty');
  if (!m.junit || !Number.isInteger(m.junit.tests) || m.junit.tests <= 0) errs.push('junit.tests missing or not a positive integer');
  if (!m.junit || !Number.isInteger(m.junit.skipped) || m.junit.skipped < 0) errs.push('junit.skipped missing or negative');
  if (m.junit && 'suites' in m.junit) errs.push('FORBIDDEN FIELD junit.suites present - JUnit-derived suite counts are the circularity red line (D-002(i))');
  if (!/^[0-9a-f]{40}$/.test(m.published_tip || '')) errs.push('published_tip is not a full sha');
  return errs;
}

function main(argv) {
  const junitIdx = argv.indexOf('--junit');
  const junitArg = junitIdx >= 0 ? argv[junitIdx + 1] : null;
  const check = argv.indexOf('--check') !== -1;
  const root = ROOT;
  const opts = {};
  if (junitArg) {
    opts.junitXml = fs.readFileSync(path.resolve(root, junitArg), 'utf8');
  }
  if (check) {
    // Cheap declared surfaces only: enumeration + pointer + tier. The junit
    // numbers stay pinned; their live window is run-test-gate post-jest.
    const committedAbs = path.join(root, MANIFEST_REL);
    let committed;
    try {
      committed = JSON.parse(fs.readFileSync(committedAbs, 'utf8'));
    } catch (e) {
      console.error('[config] FAIL: ' + MANIFEST_REL + ' unreadable - run: node scripts/build-test-manifest.js');
      process.exit(1);
    }
    const errs = structuralErrors(committed);
    if (errs.length) {
      errs.forEach(function (e) { console.error('[config] FAIL: ' + e); });
      process.exit(1);
    }
    // Cheap declared surfaces ONLY: enumeration (listTests), published_tip,
    // junit.tier. buildManifest() is deliberately NOT called here - without a
    // junit artifact it would trigger the blessed battery run, and the junit
    // live numbers are NOT re-derived in --check anyway (blessed-run trust:
    // regen points re-run the battery explicitly; run-test-gate post-jest
    // closes the live window in CI).
    const files = listTests(root);
    const regen = JSON.parse(JSON.stringify(committed));
    regen.enumeration = { channel: 'jest --listTests', suites: files.length, suite_files: files };
    regen.published_tip = gitRevParse('origin/main', root);
    regen.junit.tier = process.env.JIAHAO_TEST_TIER || 'full';
    const stableCommitted = stableCopy(committed);
    const stableRegen = stableCopy(regen);
    const d = firstDiffPath(stableCommitted, stableRegen);
    if (d) {
      console.error('[config] FAIL: manifest drift at ' + d + ' - run: node scripts/build-test-manifest.js');
      process.exit(1);
    }
    console.log('[test-manifest] OK: enumeration/published_tip/junit.tier in sync with committed manifest (' + committed.enumeration.suites + ' suites, published_tip ' + String(committed.published_tip).slice(0, 8) + ')');
    process.exit(0);
  }
  const manifest = buildManifest(opts);
  const errs = structuralErrors(manifest);
  if (errs.length) {
    errs.forEach(function (e) { console.error('[config] FAIL: ' + e); });
    process.exit(1);
  }
  const abs = path.join(root, MANIFEST_REL);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(manifest, null, 2) + '\n');
  updateReadmes(root, manifest);
  console.log('[test-manifest] wrote ' + MANIFEST_REL + ' (' + manifest.enumeration.suites + ' suites, ' + manifest.junit.tests + ' tests, tier ' + manifest.junit.tier + ') and spliced 4 README regions');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { buildManifest, parseJunit, renderLines, spliceRegion, stableCopy, firstDiffPath, structuralErrors, MARKERS, MANIFEST_REL, JUNIT_OUT, listTests, gitRevParse };
