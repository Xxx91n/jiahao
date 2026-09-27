#!/usr/bin/env node
// scripts/check-research-baseline.js - ADR-0064 D-B/D-002: T-1 research-round
// baseline harness guard (zero-dependency, thin CLI + pure core).
//
// Verifies bench/research/baseline-t1.json against the live tree:
//   (a) the recorded v2 core baseline is the pinned as-is state (47.92% recall
//       @ 4.29% FP, score 0.265, below the 0.385 floor - recorded, not
//       laundered); each literal is anchored in ADR-0064 text (ADR-0027 D2
//       content-anchor discipline).
//   (b) the corpus block equals the thresholds.json corpus pin (single home
//       for the corpus identity - no second copy to drift).
//   (c) the freeze pin: sha256 over the canonical confirmatory surface
//       (corpus + gates + probe_gates + judge_bias_gates + private_corpus + mr_gates +
//       score_def) still matches the live thresholds.json. The g6_gates
//       class is exempt (ADR-0064 D-E sanctions its pre-port registration).
//   (d) evidence cross-check: the committed metrics-v2-run4.json artifact
//       recomputes to the same baseline within 1e-6.
//   (e) waiver bifurcation: waiver.invoked must be false (ADR-0064 D-004(5)).
//
// Usage: node scripts/check-research-baseline.js
// Exit 0 pass / exit 1 fail. Pure core exported for the wiring test.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireCapabilities } = require('../src/shared/capability');

const BASELINE_REL = path.join('bench', 'research', 'baseline-t1.json');
const THRESHOLDS_REL = path.join('bench', 'polygraph', 'thresholds.json');
const RUN4_REL = path.join('bench', 'polygraph', 'results', 'metrics-v2-run4.json');
const ADR0064_REL = path.join('docs', 'adr', '0064-t6-product-round-pre-registration-mde-gates-and-governance-trend-anchor.md');
const EPS = 1e-6;

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// Canonical confirmatory surface: fixed key order, g6_gates excluded by
// baseline.freeze.exempt_keys (ADR-0064 D-E pre-port registration carve-out).
function surfaceHash(cfg, surfaceKeys) {
  const surface = {};
  for (const k of surfaceKeys) surface[k] = cfg[k];
  return sha256(JSON.stringify(surface));
}

function checkBaseline(root, opts) {
  const o = opts || {};
  const base = root || path.join(__dirname, '..');
  const errors = [];
  const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(base, rel), 'utf8'));

  const b = o.baseline || readJson(BASELINE_REL);
  const cfg = o.thresholds || readJson(THRESHOLDS_REL);
  const adr = o.adr || fs.readFileSync(path.join(base, ADR0064_REL), 'utf8');

  // (a) pinned as-is numbers + anchors
  const bl = b.baseline || {};
  const want = { recall: 0.4792, fp_rate: 0.0429, score: 0.265 };
  for (const k of Object.keys(want)) {
    if (typeof bl[k] !== 'number' || Math.abs(bl[k] - want[k]) > EPS) {
      errors.push('baseline.' + k + ' = ' + bl[k] + ' - expected pinned ' + want[k] + ' (ADR-0064 D-B as-is record)');
    }
  }
  for (const lit of ['47.92%', '4.29%', '0.265']) {
    if (adr.indexOf(lit) === -1) errors.push('baseline literal ' + lit + ' not anchored in ADR-0064 text');
  }
  if (bl.split !== 'core') errors.push('baseline.split must be core (D-002 pins the core-split metric, never v1/overall)');
  if (bl.detector !== 'jiahao-v2') errors.push('baseline.detector must be jiahao-v2');
  if (!(bl.floor && typeof bl.floor.score === 'number') || !(bl.score < bl.floor.score) || bl.status !== 'below-floor') {
    errors.push('below-floor state not recorded honestly (score ' + bl.score + ' vs floor ' + (bl.floor && bl.floor.score) + ', status ' + bl.status + ')');
  }
  if (!(bl.historical_reference && Math.abs(bl.historical_reference.overall_recall - 0.347) < 0.001)) {
    errors.push('v1 34.7% historical reference missing - D-002 requires it marked reference-only');
  }

  // (b) corpus identity single-homed in thresholds.json
  const bc = bl.corpus || {};
  for (const k of ['repo', 'ref', 'expected_items', 'items_fingerprint', 'labels_fingerprint']) {
    if (JSON.stringify(bc[k]) !== JSON.stringify(cfg.corpus && cfg.corpus[k])) {
      errors.push('baseline.corpus.' + k + ' differs from thresholds.json corpus pin (corpus identity has one home)');
    }
  }

  // (c) freeze pin over the confirmatory surface
  const fr = b.freeze || {};
  if (!Array.isArray(fr.surface_keys) || !fr.surface_keys.length) {
    errors.push('freeze.surface_keys missing');
  } else {
    const exempt = new Set(fr.exempt_keys || []);
    if (!exempt.has('g6_gates')) errors.push('freeze.exempt_keys must list g6_gates (ADR-0064 D-E carve-out)');
    const actual = surfaceHash(cfg, fr.surface_keys);
    if (actual !== fr.thresholds_surface_sha256) {
      errors.push('freeze: confirmatory surface drifted - sha256 ' + actual + ' != pinned ' + fr.thresholds_surface_sha256 + ' (D-002: no tuning this round)');
    }
  }

  // (d) evidence cross-check against the committed run-4 artifact
  let run4 = null;
  try { run4 = (o.run4 || readJson(RUN4_REL)).detectors['jiahao-v2-run4'].by_split.core; }
  catch (e) { errors.push('run-4 metrics artifact unreadable: ' + e.message); }
  // (d) the baseline stores the ADR-pinned rounded figures; the artifact
  // recomputation must agree at the recorded precision (round-trip, never a
  // second source of truth).
  const decimalsOf = (v) => { const s = String(v); const i = s.indexOf('.'); return i === -1 ? 0 : s.length - i - 1; };
  const agrees = (raw, recorded) => Number(raw.toFixed(decimalsOf(recorded))) === recorded;
  if (run4) {
    if (!agrees(run4.recall, bl.recall)) errors.push('run-4 artifact core recall ' + run4.recall + ' != baseline ' + bl.recall + ' at recorded precision');
    if (!agrees(run4.fp_rate, bl.fp_rate)) errors.push('run-4 artifact core fp_rate ' + run4.fp_rate + ' != baseline ' + bl.fp_rate + ' at recorded precision');
    if (!agrees(run4.recall - 5 * run4.fp_rate, bl.score)) errors.push('run-4 artifact core score ' + (run4.recall - 5 * run4.fp_rate) + ' != baseline ' + bl.score + ' at recorded precision');
  }

  // (e) waiver bifurcation closure
  if (!(b.waiver && b.waiver.invoked === false)) {
    errors.push('waiver.invoked must be false - ADR-0064 D-004(5) closes the ADR-0059 D-C bifurcation for T-6');
  }
  if (b.source_adr !== '0064') errors.push('source_adr must be 0064');
  return errors;
}

function main() {
  requireCapabilities('research-baseline');
  const errors = checkBaseline();
  for (const e of errors) console.error('FAIL: ' + e);
  if (errors.length) process.exit(1);
  console.log('[research-baseline] OK: v2 core 47.92% @ 4.29% / score 0.265 recorded as-is (below floor), confirmatory surface frozen');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkBaseline, surfaceHash, BASELINE_REL };
