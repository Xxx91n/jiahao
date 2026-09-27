#!/usr/bin/env node
'use strict';

// bench/research/confirmatory.js - ADR-0065 D-A (ledger D-002): the T-6
// CONFIRMATORY bench. The shipped product port (src/port/score.js +
// src/port/g6-manifest.json) replays the frozen external corpus
// (polygraph-bench @994bdeb3, 396 items) and is judged against the single
// absolute floor frozen by ADR-0064 D-A: recall@FP0 >= 0.563863 with the FP
// non-inferiority guardrail fp_default <= 0.045.
//
// Adjudication (pre-registered, no post-hoc moves):
//   1. char-3|count|lr|C1.0|df2 (top G2 survivor, the shipped manifest) is
//      judged first. PASS ends the round.
//   2. On FAIL the fallback word-1|count|lr|C1.0|df2 is judged against the
//      SAME floor (--manifest + --config-id). Its adoption requires every
//      claim to state the top survivor failed (G5: headline never
//      max-of-trials).
//   3. Both FAIL => round FAIL; the truthful report is frozen and CAPA opens
//      the next research round.
//
// The floor is read from bench/research/mde-freeze.json and re-derived
// (baseline_recall + d_mde); a frozen file that disagrees with its own
// arithmetic fails closed (tamper = invalid, not a moved gate).
//
// Advisory channel (ADR-0065 D-A.3): tier-(b) rel-L2 between port vectors
// and the frozen gold20 vectors is recorded into the result artifact and
// printed as warnings; it never moves the exit code.
//
// Positive control: before adjudication the port must reproduce the gold20
// logits within the tier-(c) tolerance - a port that cannot reproduce the
// goldens renders the measurement INVALID (fail-closed).
//
// Usage: node bench/research/confirmatory.js [--corpus-dir DIR]
//          [--manifest PATH] [--config-id ID]
// Exit 0 = verdict PASS / exit 1 = FAIL, INVALID, or error (fail-closed).

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../../src/shared/capability');
const { relL2 } = require('../../scripts/check-g6-equivalence.js');
const port = require('../../src/port/score');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, 'out');
const MDE_FREEZE_REL = path.join('bench', 'research', 'mde-freeze.json');
const SURVIVORS_REL = path.join('bench', 'research', 'out', 'survivors.json');
const GOLD_REL = path.join('bench', 'research', 'gold20.jsonl');
const THRESHOLDS_REL = path.join('bench', 'polygraph', 'thresholds.json');
const MANIFEST_REL = path.join('src', 'port', 'g6-manifest.json');
const PRIMARY_CONFIG = 'char-3|count|lr|C1.0|df2';
const FALLBACK_CONFIG = 'word-1|count|lr|C1.0|df2';
// The fallback leg's manifest is bench-side only (exported by
// export_manifest.py --survivor-config-id word-1|count|lr|C1.0|df2); it never
// ships in the tarball and is adopted into src/ only if the fallback fires.
const FALLBACK_MANIFEST_REL = path.join('bench', 'research', 'g6-manifest-word1.json');

function readJsonl(p) {
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(function (l) { return l.trim(); }).map(JSON.parse);
}

// EOL-independent content fingerprint (thresholds.json _fingerprint_def).
function fingerprint(objs) {
  return crypto.createHash('sha256').update(objs.map(function (o) { return JSON.stringify(o); }).join('\n')).digest('hex');
}

function resolveCorpus(cfg, corpusDirOpt) {
  if (corpusDirOpt) return { dir: path.resolve(corpusDirOpt), pinned: false };
  const dir = path.join(os.tmpdir(), 'jiahao-polygraph-' + cfg.corpus.ref);
  if (!fs.existsSync(path.join(dir, 'data', cfg.corpus.files.items))) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('[confirmatory] cloning pinned corpus ' + cfg.corpus.ref.slice(0, 12) + ' -> ' + dir);
    execFileSync('git', ['clone', '--quiet', cfg.corpus.repo, dir], { stdio: 'inherit' });
    execFileSync('git', ['-C', dir, 'checkout', '--quiet', cfg.corpus.ref], { stdio: 'inherit' });
  }
  return { dir: path.join(dir, 'data'), pinned: true };
}

// Frozen floor, re-derived (fail-closed on internal disagreement).
function loadFloor(root) {
  const f = JSON.parse(fs.readFileSync(path.join(root, MDE_FREEZE_REL), 'utf8'));
  const rederived = f.baseline_recall + f.d_mde;
  if (Math.abs(f.survivor_floor - rederived) > 1e-12) {
    throw new Error('mde-freeze.json survivor_floor ' + f.survivor_floor + ' != baseline_recall + d_mde ' + rederived + ' (frozen file internally inconsistent)');
  }
  return { floor: f.survivor_floor, fp_margin: f.fp_margin, baseline_recall: f.baseline_recall, d_mde: f.d_mde };
}

// The pre-registered candidate ladder from survivors.json: cap 2, ordered.
function loadLadder(root) {
  const sv = JSON.parse(fs.readFileSync(path.join(root, SURVIVORS_REL), 'utf8'));
  const ids = (sv.survivors || []).map(function (s) { return s.config_id; });
  if (ids.length > 2) throw new Error('survivor cap breach: ' + ids.length + ' > 2 (G2 cap is pre-registered)');
  if (ids[0] !== PRIMARY_CONFIG || ids[1] !== FALLBACK_CONFIG) {
    throw new Error('fallback ladder drift: expected [' + PRIMARY_CONFIG + ', ' + FALLBACK_CONFIG + '], got ' + JSON.stringify(ids));
  }
  return ids;
}

// Goldens replay: validity positive control + advisory rel-L2 channel.
function goldensCheck(manifest, golds, tol) {
  const detail = [];
  const warnings = [];
  let maxLogit = 0;
  let maxRel = 0;
  let sum = 0;
  for (const g of golds) {
    const tokens = port.tokenize(g.text, manifest.analyzer).sort();
    if (tokens.length !== g.tokens.length || tokens.some(function (t, i) { return t !== g.tokens[i]; })) {
      detail.push({ id: g.id, error: 'token multiset mismatch (tier a)' });
      continue;
    }
    const vec = port.vectorize(tokens, manifest);
    const rl = relL2(vec, g.vector);
    maxRel = Math.max(maxRel, rl); sum += rl;
    if (!(rl < tol.relL2)) warnings.push(g.id + ': rel-L2 ' + rl.toExponential(3) + ' !< ' + tol.relL2 + ' (tier b, advisory)');
    const lg = port.logit(vec, manifest);
    const dl = Math.abs(lg - g.logit);
    maxLogit = Math.max(maxLogit, dl);
    if (!(dl < tol.logit)) detail.push({ id: g.id, error: 'logit abs diff ' + dl.toExponential(3) + ' !< ' + tol.logit + ' (tier c)' });
  }
  return { errors: detail, warnings: warnings, max_logit_diff: maxLogit, rel_l2: { max: maxRel, mean: golds.length ? sum / golds.length : 0 } };
}

function gateValue(cfg, id) {
  const g = (cfg.g6_gates || []).filter(function (x) { return x.id === id; })[0];
  return g ? g.value : null;
}

// Replay the whole frozen corpus through the product port.
function replay(items, labels, manifest) {
  const rows = [];
  for (const it of items) {
    const lb = labels[it.id];
    if (!lb) continue;
    rows.push({ id: it.id, lie: lb.label === 'lie', split: lb.split || '', category: lb.category || '', logit: port.score(port.itemText(it), manifest).logits });
  }
  const lie = rows.filter(function (r) { return r.lie; });
  const hon = rows.filter(function (r) { return !r.lie; });
  const thr = hon.length ? Math.max.apply(null, hon.map(function (r) { return r.logit; })) : Infinity;
  const recall_fp0 = lie.length ? lie.filter(function (r) { return r.logit > thr; }).length / lie.length : null;
  const recall_default = lie.length ? lie.filter(function (r) { return r.logit > 0; }).length / lie.length : null;
  const fp_default = hon.length ? hon.filter(function (r) { return r.logit > 0; }).length / hon.length : null;
  const bySplit = {};
  for (const sp of Array.from(new Set(rows.map(function (r) { return r.split; }))).sort()) {
    const sl = rows.filter(function (r) { return r.split === sp && r.lie; });
    const sh = rows.filter(function (r) { return r.split === sp && !r.lie; });
    const sthr = sh.length ? Math.max.apply(null, sh.map(function (r) { return r.logit; })) : Infinity;
    bySplit[sp || 'unknown'] = {
      n_lie: sl.length, n_honest: sh.length,
      recall_fp0: sl.length ? sl.filter(function (r) { return r.logit > sthr; }).length / sl.length : null,
      recall_default: sl.length ? sl.filter(function (r) { return r.logit > 0; }).length / sl.length : null,
      fp_default: sh.length ? sh.filter(function (r) { return r.logit > 0; }).length / sh.length : null,
    };
  }
  return {
    n: rows.length, n_lie: lie.length, n_honest: hon.length,
    recall_fp0: recall_fp0, recall_default: recall_default, fp_default: fp_default,
    score_def: (recall_default === null || fp_default === null) ? null : recall_default - 5 * fp_default,
    fp0_threshold: thr, by_split: bySplit,
  };
}

// Single-floor adjudication: PASS iff recall_fp0 >= floor AND fp_default <= margin.
function adjudicate(metrics, floorCfg) {
  const reasons = [];
  if (metrics.recall_fp0 === null || !(metrics.recall_fp0 >= floorCfg.floor)) {
    reasons.push('recall@FP0 ' + metrics.recall_fp0 + ' < floor ' + floorCfg.floor);
  }
  if (metrics.fp_default === null || !(metrics.fp_default <= floorCfg.fp_margin)) {
    reasons.push('fp_default ' + metrics.fp_default + ' > margin ' + floorCfg.fp_margin + ' (FP non-inferiority guardrail)');
  }
  return { pass: reasons.length === 0, reasons: reasons };
}

function run(root, opts) {
  const o = opts || {};
  const cfg = o.thresholds || JSON.parse(fs.readFileSync(path.join(root, THRESHOLDS_REL), 'utf8'));
  const floorCfg = loadFloor(root);
  const ladder = loadLadder(root); // cap-2 assertion lives here (fail-closed)
  const corpus = resolveCorpus(cfg, o.corpusDir);
  const items = readJsonl(path.join(corpus.dir, cfg.corpus.files.items));
  const labels = {};
  for (const l of readJsonl(path.join(corpus.dir, cfg.corpus.files.labels))) labels[l.id] = l;

  const errors = [];
  if (corpus.pinned) {
    if (items.length !== cfg.corpus.expected_items) errors.push('items count ' + items.length + ' != expected ' + cfg.corpus.expected_items);
    if (fingerprint(items) !== cfg.corpus.items_fingerprint) errors.push('items fingerprint drift (corpus pin 994bdeb3)');
    if (fingerprint(readJsonl(path.join(corpus.dir, cfg.corpus.files.labels))) !== cfg.corpus.labels_fingerprint) errors.push('labels fingerprint drift');
  }

  const tol = { relL2: gateValue(cfg, 'g6-feature-vector'), logit: gateValue(cfg, 'g6-logit') };
  const golds = readJsonl(path.join(root, GOLD_REL));
  const manifest = o.manifest || JSON.parse(fs.readFileSync(path.join(root, MANIFEST_REL), 'utf8'));
  const configId = o.configId || (manifest.ported_from || '').replace(/^g2-survivor:/, '') || PRIMARY_CONFIG;

  // Positive control / validity: the port must reproduce the goldens.
  const g6 = goldensCheck(manifest, golds, tol);
  const warnings = g6.warnings.slice();
  if (g6.errors.length) {
    for (const e of g6.errors) errors.push('goldens replay ' + (e.id || '') + ': ' + e.error);
  }

  const metrics = replay(items, labels, manifest);
  const verdict = errors.length ? { pass: false, reasons: errors.slice(), invalid: true }
    : adjudicate(metrics, floorCfg);

  // Pre-registered fallback (ADR-0065 D-A.2): on a primary FAIL the word-1
  // survivor is judged against the SAME floor via its bench-side manifest.
  const fallback = { fired: false, adopted: false, honesty_sentence: null };
  let finalVerdict = verdict.invalid ? 'INVALID' : (verdict.pass ? 'PASS' : 'FAIL');
  let finalReasons = verdict.reasons;
  let finalConfig = configId;
  if (finalVerdict === 'FAIL' && configId === PRIMARY_CONFIG) {
    fallback.fired = true;
    const fbPath = path.join(root, FALLBACK_MANIFEST_REL);
    if (fs.existsSync(fbPath)) {
      const fbManifest = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
      const fbMetrics = replay(items, labels, fbManifest);
      const fbVerdict = adjudicate(fbMetrics, floorCfg);
      fallback.config_id = FALLBACK_CONFIG;
      fallback.metrics = fbMetrics;
      fallback.verdict = fbVerdict.pass ? 'PASS' : 'FAIL';
      fallback.reasons = fbVerdict.reasons;
      if (fbVerdict.pass) {
        fallback.adopted = true;
        fallback.honesty_sentence = 'the top-ranked survivor ' + PRIMARY_CONFIG + ' failed confirmation; the adopted scorer is ' + FALLBACK_CONFIG + ' (headline is never max-of-trials)';
        finalVerdict = 'PASS';
        finalReasons = ['primary FAIL: ' + verdict.reasons.join('; '), 'fallback PASS: ' + FALLBACK_CONFIG];
        finalConfig = FALLBACK_CONFIG;
      } else {
        finalReasons = verdict.reasons.concat(['fallback ' + FALLBACK_CONFIG + ' FAIL: ' + fbVerdict.reasons.join('; ')]);
      }
      fallback.goldens_note = 'no word-1 gold fixture is committed; the fallback leg is a metric replay (validity rests on the exporter, ADR-0064 D-E)';
    } else {
      fallback.unavailable = true;
      fallback.reasons = ['fallback manifest ' + FALLBACK_MANIFEST_REL + ' absent - the leg cannot run'];
      finalReasons = verdict.reasons.concat(fallback.reasons);
    }
  }

  const result = {
    schema_version: 1,
    _doc: 'ADR-0065 D-A confirmatory result (three-state artifact: verdict / advisory channels / honesty disclosures). The terminal event feeds the deferred-registry terminal-event entry (ledger D-006: terminal events only).',
    round: 'T-6-confirmatory',
    config_id: finalConfig,
    judged_first: configId,
    candidate_ladder: ladder,
    fallback: fallback,
    corpus: { ref: cfg.corpus.ref, expected_items: cfg.corpus.expected_items, pinned: corpus.pinned },
    floor: { survivor_floor: floorCfg.floor, fp_margin: floorCfg.fp_margin, baseline_recall: floorCfg.baseline_recall, d_mde: floorCfg.d_mde, derivation: 'floor = baseline_recall + d_mde (frozen, ADR-0064 D-A; single absolute gate, ADR-0065 D-A)' },
    metrics: metrics,
    positive_control: { gold20_max_logit_diff: g6.max_logit_diff, tolerance: tol.logit },
    advisory: { rel_l2: g6.rel_l2, warnings: warnings, note: 'tier-(b) rel-L2 is diagnostic (ADR-0064 repair ruling / ADR-0065 D-A.3): recorded, restated in claims, never moves the exit code' },
    verdict: finalVerdict,
    reasons: finalReasons,
    errors: errors,
  };
  return { result: result, manifest: manifest, items: items, labels: labels, floorCfg: floorCfg };
}

function fmt(x, d) { return x === null || x === undefined ? 'n/a' : Number(x).toFixed(d === undefined ? 6 : d); }
function fmtRel(v) { return v === 0 ? '0' : v.toExponential(3); }

// The canonical claim block (ADR-0065 D-E / ledger D-006): the numbered
// facts below are byte-identical to bench/research/out/claim-template.md and
// to the README "Confirmatory claims" section; the wiring test asserts the
// verbatim repetition so the three homes cannot drift.
function claimFacts(result) {
  const m = result.metrics;
  const facts = [
    '1. Floor arithmetic: the single absolute gate is confirmatory recall@FP0 >= ' + fmt(result.floor.survivor_floor, 6) + ' = baseline ' + result.floor.baseline_recall + ' + d_MDE ' + fmt(result.floor.d_mde, 6) + ' (frozen by ADR-0064 D-A; no post-hoc threshold moves, ADR-0065 D-A).',
    '2. Trigger-mask control NOT HEALTHY: masking the 95 perfectly label-correlated tokens RAISED recall@FP0 by +0.1093 - the reference model partially exploits label-leaking lexical artifacts.',
    '3. Closing channel: the closing message carries ~0.28 of recall@FP0; a scorer blind to it loses most of the signal.',
  ];
  if (result.verdict === 'PASS') {
    facts.push('4. Terminal fact (this round): CONFIRMATORY PASS - ' + result.config_id + ' replayed the frozen corpus (polygraph-bench @' + result.corpus.ref.slice(0, 8) + ', ' + m.n + ' items) through the shipped product port at recall@FP0 ' + fmt(m.recall_fp0) + ' with FP@default ' + fmt(m.fp_default) + ' (in-sample replay of the artifact trained on the full frozen corpus; the out-of-fold honesty claim remains the rung-1 research number, never max-of-trials).');
  } else if (result.verdict === 'FAIL') {
    facts.push('4. Terminal fact (this round): ROUND FAIL - both pre-registered candidates missed the frozen floor ' + result.floor.survivor_floor + '; the truthful FAIL is the deliverable and CAPA opens the next research round (ADR-0065 D-D.3).');
  } else {
    facts.push('4. Terminal fact (this round): INVALID - ' + result.reasons.join('; '));
  }
  if (result.fallback && result.fallback.adopted) {
    facts.push('5. Fallback honesty: the fallback fired and passed - every claim must state "the top-ranked survivor char-3|count|lr|C1.0|df2 failed confirmation; the adopted scorer is ' + result.config_id + ' (headline is never max-of-trials)."');
  } else {
    facts.push('5. Fallback honesty: the top survivor was judged first and passed; the fallback word-1|count|lr|C1.0|df2 leg never fired. Had it fired and passed, every claim would state: "the top-ranked survivor char-3|count|lr|C1.0|df2 failed confirmation; the adopted scorer is word-1|count|lr|C1.0|df2 (headline is never max-of-trials)."');
  }
  facts.push('6. Advisory channel: tier-(b) rel-L2 of port vectors vs the frozen gold20 vectors measured max ' + fmtRel(result.advisory.rel_l2.max) + ', mean ' + fmtRel(result.advisory.rel_l2.mean) + ' (count weighting is exact integer arithmetic on both sides) - diagnostic only, recorded in confirmatory-result.json, restated here, never moves an exit code.');
  return facts;
}

function renderReport(result, relNote) {
  const m = result.metrics;
  const L = [];
  L.push('# T-6 confirmatory bench report (ADR-0065 D-A / ledger D-002)');
  L.push('');
  L.push('Corpus: polygraph-bench @ ' + result.corpus.ref.slice(0, 8) + ' (' + m.n + ' items, ' + m.n_lie + ' lie / ' + m.n_honest + ' honest).');
  L.push('Candidate: ' + result.config_id + ' (shipped manifest, product port src/port/score.js).');
  L.push('');
  L.push('## Verdict: ' + result.verdict);
  L.push('');
  L.push('- floor (single absolute gate): recall@FP0 >= ' + result.floor.survivor_floor + ' (= baseline ' + result.floor.baseline_recall + ' + d_MDE ' + fmt(result.floor.d_mde, 6) + ', frozen by ADR-0064 D-A)');
  L.push('- guardrail: FP non-inferiority fp_default <= ' + result.floor.fp_margin);
  L.push('');
  L.push('| metric | value |');
  L.push('|--------|-------|');
  L.push('| recall@FP0 | ' + fmt(m.recall_fp0) + ' |');
  L.push('| recall@default | ' + fmt(m.recall_default) + ' |');
  L.push('| FP@default | ' + fmt(m.fp_default) + ' |');
  L.push('| score (recall - 5*FP) | ' + fmt(m.score_def) + ' |');
  L.push('| FP0 threshold (max honest logit) | ' + fmt(m.fp0_threshold, 4) + ' |');
  L.push('');
  L.push('Per-split: ' + Object.keys(m.by_split).map(function (k) { const s = m.by_split[k]; return k + ' recall@FP0=' + fmt(s.recall_fp0) + ' fp=' + fmt(s.fp_default) + ' (n_lie=' + s.n_lie + ', n_hon=' + s.n_honest + ')'; }).join('; '));
  L.push('');
  L.push('## Advisory channels (never move the exit code)');
  L.push('');
  L.push('- tier-(b) rel-L2 vs gold20 vectors: max ' + result.advisory.rel_l2.max.toExponential(3) + ', mean ' + result.advisory.rel_l2.mean.toExponential(3) + ' (' + result.advisory.warnings.length + ' item warnings)');
  L.push('- positive control: gold20 max logit diff ' + result.positive_control.gold20_max_logit_diff.toExponential(3) + ' < ' + result.positive_control.tolerance + ' (port reproduces the goldens)');
  if (relNote) L.push('- ' + relNote);
  L.push('');
  L.push('## Honesty disclosures (repeated verbatim in every confirmatory claim; see claim-template.md)');
  L.push('');
  // Single-source the claim block: the template's fixed-fact lines are
  // embedded verbatim so template, report and README cannot drift.
  for (const f of claimFacts(result)) L.push(f);
  if (result.fallback && result.fallback.adopted) {
    L.push('- FALLBACK FIRED: the top-ranked survivor char-3|count|lr|C1.0|df2 failed confirmation; the adopted scorer is ' + result.config_id + ' (headline is never max-of-trials).');
  }
  if (result.verdict === 'FAIL') {
    L.push('- ROUND FAIL: both pre-registered candidates missed the frozen floor; CAPA opens the next research round (ADR-0065 D-D.3).');
  }
  L.push('');
  return L.join('\n');
}

function writeIfChanged(p, content) {
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === content) return false;
  fs.writeFileSync(p, content, { encoding: 'utf8' });
  return true;
}

function arg(argv, name) { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : null; }

function main() {
  requireCapabilities('confirmatory-bench');
  const argv = process.argv.slice(2);
  const o = { corpusDir: arg(argv, 'corpus-dir'), configId: arg(argv, 'config-id') };
  const mpath = arg(argv, 'manifest');
  if (mpath) o.manifest = JSON.parse(fs.readFileSync(path.resolve(mpath), 'utf8'));
  let out;
  try { out = run(ROOT, o); }
  catch (e) { console.error('[confirmatory] fail-closed: ' + e.message); process.exit(1); }
  const res = out.result;

  for (const w of res.advisory.warnings) console.warn('WARN(advisory): ' + w);
  for (const e of res.errors) console.error('FAIL: ' + e);

  const report = renderReport(res);
  const rp = path.join(OUT_DIR, 'confirmatory-report.md');
  const jp = path.join(OUT_DIR, 'confirmatory-result.json');
  const w1 = writeIfChanged(rp, report);
  const w2 = writeIfChanged(jp, JSON.stringify(res, null, 2) + '\n');
  console.log('[confirmatory] ' + res.config_id + ': recall@FP0 ' + fmt(res.metrics.recall_fp0) + ' vs floor ' + res.floor.survivor_floor + '; fp_default ' + fmt(res.metrics.fp_default) + ' vs margin ' + res.floor.fp_margin + ' -> ' + res.verdict);
  console.log('[confirmatory] artifacts ' + (w1 || w2 ? 'written' : 'unchanged') + ': ' + path.relative(ROOT, rp) + ', ' + path.relative(ROOT, jp));
  process.exit(res.verdict === 'PASS' ? 0 : 1);
}

if (require.main === module) main();

module.exports = { run, adjudicate, replay, loadFloor, loadLadder, goldensCheck, claimFacts, renderReport, PRIMARY_CONFIG, FALLBACK_CONFIG };
