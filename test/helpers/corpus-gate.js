'use strict';

// test/helpers/corpus-gate.js -- ADR-0056 D-A test-capability probe.
// resolveCorpus() answers which corpus tier this test process runs against:
//   full   - private bench corpus present (ADR-0038 D2 maintainer/CI asset)
//   public - committed fixture corpus present (test/fixtures/corpus)
//   none   - neither; suites degrade through the ADR-0057 reason-carrying skip
//
// Tier resolution reuses the bench-corpus probe semantics of
// src/shared/capability.js and extends them with public-fixture presence.
// A resolution is computed once per suite (cached), before any corpus read.
//
// JIAHAO_TEST_TIER (full|public|none) is the test-only override used by the
// recurrence script (ADR-0056 D-D) and the tier-none wiring lock (ADR-0057
// D-B). It never widens a tier: forcing 'full' without the corpus still
// resolves to the real answer.

const fs = require('fs');
const path = require('path');
const capability = require('../../src/shared/capability');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURE_DIR = path.join(ROOT, 'test', 'fixtures', 'corpus');
const TIERS = ['full', 'public', 'none'];

const FORCED = process.env.JIAHAO_TEST_TIER && TIERS.indexOf(process.env.JIAHAO_TEST_TIER) >= 0
  ? process.env.JIAHAO_TEST_TIER
  : null;

let cached = null;

function resolveCorpus() {
  if (cached) return cached;
  const full = capability.probe('bench-corpus') ? 'full' : null;
  const pub = fs.existsSync(path.join(FIXTURE_DIR, 'fingerprints.json')) ? 'public' : null;
  let tier = full || pub || 'none';
  // The override may narrow only (full -> public/none, public -> none).
  if (FORCED && TIERS.indexOf(FORCED) > TIERS.indexOf(tier)) tier = FORCED;
  cached = {
    tier: tier,
    forced: FORCED,
    dir: tier === 'public' ? FIXTURE_DIR : null,
  };
  return cached;
}

// Resolve a corpus file for the current tier. Tier 'full' delegates to the
// canonical resolver chain (JIAHAO_CORPUS_DIR -> install dir -> repo-private)
// and fails closed like every production caller; tier 'public' reads the
// committed fixture; tier 'none' must never call this.
function corpusFile(name) {
  const r = resolveCorpus();
  if (r.tier === 'public') return path.join(FIXTURE_DIR, name);
  if (r.tier === 'full') return require('../../src/shared/paths').requireCorpus(name);
  throw new Error('corpus tier none: no corpus file available (ADR-0056 D-A)');
}

module.exports = { resolveCorpus, corpusFile, FIXTURE_DIR, TIERS };
