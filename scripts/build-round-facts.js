#!/usr/bin/env node
// build-round-facts.js - ADR-0077 D-C facts canon: the round report's facts
// section is rendered deterministically from one regenerable artifact,
// .scratch/grill-<tN>/round-facts.json. "The report is narrative, never the
// home of numbers" - bare schema-key values outside the sentinel region are
// pinned red by wiring. report_commit stays null by design: the report
// cannot cite its own commit (self-reference disclosed, not faked). The
// artifact deliberately does NOT join the anchors chain - per-round
// regeneration would churn the slow-moving digest chain.
//
// Deterministic: fixed key order, no timestamps; battery_as_of_commit pins
// the tree the battery ran against. Write mode and --check share one
// generation path (regen-and-diff, ADR-0028 D2 precedent).
//
// Usage: node scripts/build-round-facts.js --round <slug> [--report <path>] [--check]
//   --round   round slug (grill-t16); artifact lands at .scratch/<slug>/round-facts.json
//   --report  splice the rendered facts block into the report's
//             <!-- round-facts:start --> / <!-- round-facts:end --> region
//   --check   exit 1 on drift instead of writing
//
// Exit 0 = written / in sync; exit 1 = drift or failure (fail-closed).

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities, probe } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const SENTINEL_START = '<!-- round-facts:start -->';
const SENTINEL_END = '<!-- round-facts:end -->';

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel.split('/').join(path.sep)), 'utf8'));

// jest --json summary -> {suites, passed, skipped}. Fact source = the suite
// itself (the battery's own numbers, never hand-typed).
function testFacts() {
  const out = execFileSync(process.execPath, [require.resolve('jest/bin/jest'), '--json', '--silent'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
  });
  const j = JSON.parse(out.slice(out.indexOf('{')));
  return { suites: j.numTotalTestSuites, passed: j.numPassedTests, skipped: j.numPendingTests };
}

// Unverifiable channels: gates whose declared capability is absent on this
// host - rederived from gates.json + the capability probe, not hand-listed.
function notRunChannels() {
  const gates = readJson('docs/gates.json');
  const missing = [];
  for (const e of gates.entries || []) {
    const reqs = e.requires || [];
    if (reqs.length && !reqs.every((c) => probe(c, { root: ROOT }))) missing.push(e.name);
  }
  return missing.sort();
}

function collect() {
  const t = testFacts();
  const replay = readJson('bench/research/out/g6-publish-replay.json');
  const instrument = readJson('src/instrument-state.json');
  const map = readJson('docs/rewrite-map.json');
  const reg = readJson('docs/deferred-registry.json');
  const anchors = readJson('docs/governance/anchors.json');
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  return {
    schema_version: 1,
    _doc: 'ADR-0077 D-C facts canon: regenerable at the closing step; the report facts section renders deterministically from this artifact. report_commit stays null - the report cannot cite its own commit. Not an anchors-chain member (per-round regeneration would churn the digest chain).',
    suites: t.suites,
    passed: t.passed,
    skipped: t.skipped,
    pack_bytes: replay.tarball.size,
    instrument_entries: (instrument.history || []).length,
    rewrite_map_citations: (map.counts || {}).doc_refs,
    registry_entries: (reg.entries || []).length,
    anchors_count: (anchors.artifacts || []).length,
    battery_as_of_commit: head,
    report_commit: null,
    not_run: notRunChannels(),
  };
}

// Pure: facts -> sentinel region text (sentinel lines included, fixed order).
function renderRegion(facts) {
  const lines = [SENTINEL_START];
  for (const k of ['suites', 'passed', 'skipped', 'pack_bytes', 'instrument_entries', 'rewrite_map_citations', 'registry_entries', 'anchors_count', 'battery_as_of_commit', 'report_commit']) {
    lines.push('- ' + k + ': ' + (facts[k] === null ? 'null' : facts[k]));
  }
  lines.push('- not_run: [' + facts.not_run.join(', ') + ']');
  lines.push(SENTINEL_END);
  return lines.join('\n');
}

// Pure: splice a region into report text between the sentinel lines.
function spliceRegion(text, region) {
  const i = text.indexOf(SENTINEL_START);
  const j = text.indexOf(SENTINEL_END);
  if (i === -1 || j === -1 || j < i) throw new Error('round-facts sentinel region missing or inverted in the report');
  if (text.indexOf(SENTINEL_START, i + 1) !== -1 || text.indexOf(SENTINEL_END, j + 1) !== -1) throw new Error('duplicate round-facts sentinel marker in the report');
  return text.slice(0, i) + region + text.slice(j + SENTINEL_END.length);
}

function main(argv) {
  requireCapabilities(['repo-tree'], { root: ROOT }); // non-registry consumer: inline declaration (ADR-0058 R8)
  const ri = argv.indexOf('--round');
  if (ri === -1 || !argv[ri + 1]) { console.error('FAIL: --round <slug> is required'); process.exit(1); }
  const slug = argv[ri + 1];
  const check = argv.indexOf('--check') !== -1;
  const repI = argv.indexOf('--report');
  const reportPath = repI !== -1 ? path.resolve(argv[repI + 1]) : null;
  const factsPath = path.join(ROOT, '.scratch', slug, 'round-facts.json');

  // Collect refreshes the artifact and requires a green battery (the canon
  // has no facts on a red tree). --report splices from the on-disk artifact:
  // the report renders the canon as committed, so a region fix never blocks
  // on re-running the suite. Collection runs on a bare write, on --check,
  // or when the artifact is missing.
  const cur = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : null;
  const needsCollect = !reportPath || check || cur === null;
  let facts;
  let drift = false;
  if (needsCollect) {
    facts = collect();
    const next = JSON.stringify(facts, null, 2) + '\n';
    if (check) {
      if (cur !== next) { console.error('FAIL: .scratch/' + slug + '/round-facts.json is stale - regenerate with node scripts/build-round-facts.js --round ' + slug); drift = true; }
    } else if (cur !== next) {
      fs.writeFileSync(factsPath, next, 'utf8');
      console.log('[round-facts] wrote .scratch/' + slug + '/round-facts.json');
    }
  } else {
    facts = JSON.parse(cur);
  }

  if (reportPath) {
    const region = renderRegion(facts);
    const text = fs.readFileSync(reportPath, 'utf8');
    const spliced = spliceRegion(text, region);
    if (check) {
      if (spliced !== text) { console.error('FAIL: report facts region is stale - regenerate with --report'); drift = true; }
    } else if (spliced !== text) {
      fs.writeFileSync(reportPath, spliced, 'utf8');
      console.log('[round-facts] spliced facts region into ' + path.basename(reportPath));
    }
  }
  if (drift) process.exit(1);
  if (check) console.log('[round-facts] OK - facts' + (reportPath ? ' and report region' : '') + ' in sync');
}

if (require.main === module) main(process.argv);
module.exports = { collect, renderRegion, spliceRegion, SENTINEL_START, SENTINEL_END };
