#!/usr/bin/env node
// scripts/reverify.js -- ADR-0030 D3: judge re-verification runbook
// (LLVM "How To Validate a New Release" shape: rerun the frozen corpus,
// compare against the baseline ledger, human reads and commits the artifact).
//
//   - Runs the frozen private judge-twins.jsonl corpus (ADR-0036 D2) through the
//     SAME judgeItem bridge the bench gates use, recomputes the ADR-0025 D3
//     four-metric telemetry contract (invocations, latency_ms_avg, fail_soft,
//     overrides_accepted) plus Wilson 95% bounds and the STALE count.
//   - Emits bench/polygraph/results/reverify-YYYYMMDD.json; first run freezes
//     the baseline for later delta comparison.
//   - Appends an entry to bench/polygraph/reverify-ledger.json: append-only
//     hash chain {seq, collected_at, metrics, conclusion, adr_ref, prev_hash,
//     event_hash} where event_hash = sha256(canonical(entry-sans-hash) +
//     '|' + prev_hash) and prev_hash is part of the hashed input
//     (ADR-0013's own incident: excluding it lets a truncated chain re-link).
//   - --stale-hook: warning-only staleness notice for .githooks/pre-commit
//     (ADR-0027 alarm-fatigue discipline: aggregate, single line, exit 0).
//
// Usage: node scripts/reverify.js [--stale-hook]

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const { requireCorpus } = require('../src/shared/paths');
const LEDGER = path.join(ROOT, 'bench', 'polygraph', 'reverify-ledger.json');
const RESULTS = path.join(ROOT, 'bench', 'polygraph', 'results');
const { MONTH_MS } = require('../src/reverify-schedule');
const ROT_MS = 6 * MONTH_MS; // 6 months, coarse - single source: src/reverify-schedule.js
const GENESIS = 'GENESIS'; // fixed, documented, verified on append (hash-chain trap: empty string is indistinguishable from a missing field)
const ADR_REF = '0030';
const { resolveInstrumentIdentity } = require('../src/instrument-identity');

// ---- ADR-0049: decision-rule anchor + metrological ledger completion ----
const DECISION_RULE_ID = 'ilac-g8-guarded-acceptance'; // ILAC-G8:09/2019 + JCGM 106:2012
const DECISION_RULE_VERSION = '0060.1'; // ADR-0060 D-A: min_n joins the rule identity (row-carried; ADR-0035 external-event cadence)
const DECISION_RULE_MIN_N = 100; // ADR-0060 D-A: pre-registered minimum flip-eligible sample (power table in the ADR)
const DECISION_RULE_SPEC_REF = 'bench/polygraph/thresholds.json#judge_bias_gates/judge-style-flip';
const JUDGE_TWINS_CORPUS_ID = 'judge-twins.jsonl'; // ADR-0036 D2 frozen private corpus
const JUDGE_TWINS_CORPUS_VERSION = '1.1';
// ADR-0049 D-E: single source of truth lives in src/evidence-log.js.
const { KNOWN_EVIDENCE_KINDS: LOOKBACK_EVIDENCE_KINDS } = require('../src/evidence-log');

// Default: guarded acceptance w=1, k=2 (PFA ~2.5%). Simple acceptance (w=0)
// needs a negotiated TUR >= 4:1, enforced in evaluateConformity.
function defaultDecisionRule(specLimit) {
  return {
    id: DECISION_RULE_ID,
    version: DECISION_RULE_VERSION,
    w: 1,
    k: 2,
    min_n: DECISION_RULE_MIN_N,
    spec_limit: typeof specLimit === 'number' ? specLimit : null,
    spec_ref: DECISION_RULE_SPEC_REF,
    // ADR-0049 D-B: annotate the uncertainty input basis (not MPE-only).
    // The interval is Wilson 95% by default, exact Clopper-Pearson only for
    // small/extreme samples (proportionCI95); the half-width approximates
    // U95 = k*u with k ~= 1.96, recorded as the nominal k=2 anchor.
    uncertainty_basis: 'CI95 half-width (Wilson; exact Clopper-Pearson in small/extreme samples), not MPE-only',
  };
}

// Guarded acceptance: pass iff flip_rate <= spec_limit - w*u (u = CI half-width).
// The guard-band conditional zone (acceptance_limit < x <= spec_limit) yields
// NO pass statement (ADR-0049 D-B).
function evaluateConformity(flipRate, flipCI, rule, n) {
  if (!rule || typeof rule.spec_limit !== 'number' || typeof flipRate !== 'number' || !flipCI) {
    return { result: 'conditional', acceptance_limit: null, lookback: false }; // no numeric rule: no pass statement
  }
  // ADR-0060 D-A/D-B: the sampling plan is part of the rule identity. Below
  // min_n the guard band consumes the spec limit and the rule cannot return
  // `pass` for any observation, so the honest statement is "evidence
  // insufficient" (indeterminate), never a confirmed non-conformity.
  const minN = typeof rule.min_n === 'number' ? rule.min_n : null;
  const nEligible = typeof n === 'number' ? n : null;
  if (minN !== null && nEligible !== null && nEligible < minN) {
    const uu = Math.max(0, (flipCI[1] - flipCI[0]) / 2);
    const lb = flipCI[1] > rule.spec_limit || flipRate > rule.spec_limit;
    return { result: 'indeterminate', acceptance_limit: rule.spec_limit - rule.w * uu, lookback: lb, min_n: minN, n: nEligible };
  }
  if (rule.w === 0) {
    if (!(rule.tur >= 4)) throw new Error('simple acceptance requires negotiated TUR >= 4:1 (ADR-0049 D-B)');
    return { result: flipRate <= rule.spec_limit ? 'pass' : 'fail', acceptance_limit: rule.spec_limit, lookback: flipCI[1] > rule.spec_limit || flipRate > rule.spec_limit };
  }
  const u = Math.max(0, (flipCI[1] - flipCI[0]) / 2);
  const acceptanceLimit = rule.spec_limit - rule.w * u;
  // ADR-0049 D-E: the drift-exposure look-back signal is the Wilson interval
  // over limit (CI upper bound) OR the point estimate over limit (17025
  // 6.4.10: shown outside specified requirements); it is a look-back
  // obligation, not a conclusion change.
  const lookback = flipCI[1] > rule.spec_limit || flipRate > rule.spec_limit;
  if (flipRate <= acceptanceLimit) return { result: 'pass', acceptance_limit: acceptanceLimit, lookback: lookback };
  if (flipRate <= rule.spec_limit) return { result: 'conditional', acceptance_limit: acceptanceLimit, lookback: lookback };
  return { result: 'fail', acceptance_limit: acceptanceLimit, lookback: lookback };
}

// ADR-0049 D-C corpus content digest — same SHA-256 over stringified lines
// as thresholds.json _fingerprint_def (EOL-independent).
function corpusDigest(entries) {
  return crypto.createHash('sha256').update(entries.map(e => JSON.stringify(e)).join('\n'), 'utf8').digest('hex');
}

// spec_limit fact source for the judge flip-rate decision rule.
function readFlipSpecLimit() {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'), 'utf8'));
    const g = (t.judge_bias_gates || []).filter(x => x.id === 'judge-style-flip')[0];
    return g && typeof g.value === 'number' ? g.value : null;
  } catch (e) { return null; }
}

// ---- pure core (jest testable) ----

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(s => s.trim()).map(s => JSON.parse(s));
}

// Wilson score interval (95%) for a binomial rate.
function wilson95(k, n) {
  if (!n) return null;
  const z = 1.96, p = k / n;
  const den = 1 + z * z / n;
  const centre = (p + z * z / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / den;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

function logGamma(x) {
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 1; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function logBeta(a, b) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function betaContinuedFraction(a, b, x) {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(-logBeta(a, b) + a * Math.log(x) + b * Math.log1p(-x));
  if (x < (a + 1) / (a + b + 2)) return front * betaContinuedFraction(a, b, x) / a;
  return 1 - front * betaContinuedFraction(b, a, 1 - x) / b;
}

function betaQuantile(p, a, b) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (incompleteBeta(mid, a, b) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Clopper-Pearson exact 95% interval for a binomial proportion.
function clopperPearson95(k, n) {
  if (!n) return null;
  const x = Math.max(0, Math.min(n, Math.round(k)));
  if (x === 0) return [0, 1 - Math.pow(0.025, 1 / n)];
  if (x === n) return [Math.pow(0.025, 1 / n), 1];
  return [betaQuantile(0.025, x, n - x + 1), betaQuantile(0.975, x + 1, n - x)];
}

// ADR-0048 D-A: Wilson by default, exact Clopper-Pearson in small/extreme samples.
function proportionCI95(k, n) {
  if (!n) return null;
  if (n < 30 || k <= 0 || k >= n) return clopperPearson95(k, n);
  return wilson95(k, n);
}

function cohenKappaPairs(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  let a = 0, b = 0, c = 0, d = 0;
  for (const pair of pairs) {
    const first = pair.a === 'honest';
    const second = pair.b === 'honest';
    if (first && second) a++;
    else if (first && !second) b++;
    else if (!first && second) c++;
    else d++;
  }
  const n = a + b + c + d;
  const po = (a + d) / n;
  const pe = ((a + b) / n) * ((a + c) / n) + ((c + d) / n) * ((b + d) / n);
  return { n, agreement: po, kappa: pe >= 1 ? null : (po - pe) / (1 - pe) };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrapKappaLower(pairs, iterations, rng) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  const point = cohenKappaPairs(pairs);
  if (!point || point.kappa === null) return null;
  const iter = iterations || 2000;
  const random = rng || mulberry32(0x9e3779b9);
  const samples = [];
  for (let i = 0; i < iter; i++) {
    const sample = [];
    for (let j = 0; j < pairs.length; j++) sample.push(pairs[Math.floor(random() * pairs.length)]);
    const k = cohenKappaPairs(sample);
    if (k && k.kappa !== null) samples.push(k.kappa);
  }
  samples.sort((x, y) => x - y);
  const lower = samples.length ? samples[Math.max(0, Math.floor(samples.length * 0.025))] : point.kappa;
  return { point: point.kappa, lower_95: lower, samples: samples.length, iterations: iter };
}

function expectedVerdict(entry) {
  return entry && entry.expected_judge === 'override' ? 'honest' : 'lie';
}

function computeMetrology(metrics, identity, opts) {
  const o = opts || {};
  const pairs = (metrics.per_entry || []).filter(e => e && (e.observed === 'honest' || e.observed === 'lie')).map(e => ({ a: expectedVerdict(e), b: e.observed }));
  const kappa = o.kappa || bootstrapKappaLower(pairs, o.bootstrapIterations, o.rng);
  const flipEligible = metrics.need_override != null ? metrics.need_override : metrics.invocations;
  const overrides = metrics.overrides_accepted != null ? metrics.overrides_accepted : 0;
  const flipRate = metrics.override_rate != null ? metrics.override_rate : (flipEligible ? overrides / flipEligible : null);
  const flipCI = proportionCI95(overrides, flipEligible);
  const observed = (metrics.per_entry || []).filter(e => e && (e.observed === 'honest' || e.observed === 'lie'));
  const scoreDistribution = {
    honest: observed.filter(e => e.observed === 'honest').length,
    lie: observed.filter(e => e.observed === 'lie').length,
  };
  const asFound = {
    invocations: metrics.invocations,
    fail_soft: metrics.fail_soft,
    overrides_accepted: overrides,
    override_rate: flipRate,
    flip_rate_ci95: flipCI,
    kappa: kappa ? kappa.point : null,
    kappa_bootstrap_lower_95: kappa ? kappa.lower_95 : null,
    score_distribution: scoreDistribution,
  };
  // ADR-0049 D-C: corpus_ref anchors the row identity (content digest + version).
  const corpusRef = o.corpusRef || null;
  const prevRow = o.previous || null;
  const prevBaseline = prevRow ? (prevRow.as_left || prevRow.as_found) : null;
  const sameCorpus = !!(corpusRef && prevRow && prevRow.corpus_ref && prevRow.corpus_ref.digest === corpusRef.digest);
  // ADR-0049 D-C: cross-cycle drift is comparable only within the same
  // corpus_ref; cross-baseline delta requires the ADR-0047 D-B overlap splice.
  // Silent subtraction across corpus_ref is forbidden.
  const drift = prevBaseline && sameCorpus ? {
    overrides_accepted: overrides - (prevBaseline.overrides_accepted || 0),
    override_rate: flipRate !== null && prevBaseline.override_rate != null ? flipRate - prevBaseline.override_rate : null,
    fail_soft: (metrics.fail_soft || 0) - (prevBaseline.fail_soft || 0),
  } : null;
  const crossBaseline = prevRow && !sameCorpus ? 'non-comparable (ADR-0049 D-C)' : null;
  // ADR-0049 D-B: pass / no_adjustment are conformity declarations under the
  // pre-registered decision-rule anchor.
  const rule = o.decisionRule || defaultDecisionRule(o.specLimit);
  const conformity = evaluateConformity(flipRate, flipCI, rule, flipEligible);
  const out = {
    identity_triple: {
      rules_digest: identity.rules_digest,
      model_checkpoint_digest: identity.model_checkpoint_digest,
      inference_config_hash: identity.inference_config_hash,
      triple_hash: identity.triple_hash,
    },
    sample_size: metrics.invocations,
    flip_eligible: flipEligible,
    flip_rate: flipRate,
    flip_rate_ci95: flipCI,
    kappa_bootstrap_lower_95: kappa ? kappa.lower_95 : null,
    as_found: asFound,
    drift_vs_previous_as_left: drift,
  };
  if (crossBaseline) out.cross_baseline = crossBaseline;
  out.corpus_ref = corpusRef;
  out.decision_rule = Object.assign({}, rule, { acceptance_limit: conformity.acceptance_limit });
  out.conformity = conformity.result;
  // ADR-0049 D-E: CI-upper-over-limit is a look-back obligation, separate
  // from the pass/conditional/fail conformity statement.
  out.lookback_required = conformity.lookback === true;
  if (o.adjustment) {
    // ADR-0049 D-A: as-left appears only on an adjustment event (rebaseline or
    // criteria change), paired with its date.
    out.as_left = o.adjustment.as_left;
    out.as_left_date = o.adjustment.date;
    out.adjustment = { type: o.adjustment.type, date: o.adjustment.date };
    if (o.adjustment.type === 'rebaseline') {
      // ADR-0049 D-C: a rebaseline moves as-left onto a new corpus_ref; the
      // as-left vs as-found subtraction is then cross-baseline and forbidden.
      // Comparability flows through the ADR-0047 D-B old-new overlap instead.
      out.observed_delta = null;
      if (!out.cross_baseline) out.cross_baseline = 'non-comparable (ADR-0049 D-C)';
    } else {
      out.observed_delta = {
        overrides_accepted: (o.adjustment.as_left.overrides_accepted || 0) - asFound.overrides_accepted,
        override_rate: (o.adjustment.as_left.override_rate != null && asFound.override_rate != null) ? o.adjustment.as_left.override_rate - asFound.override_rate : null,
        fail_soft: (o.adjustment.as_left.fail_soft || 0) - asFound.fail_soft,
      };
    }
  } else {
    // ADR-0049 D-A: no adjustment is a declared single result; the declaration
    // exists only when conformity passes (ADR-0049 D-B).
    out.no_adjustment = conformity.result === 'pass';
    out.observed_delta = { overrides_accepted: 0, override_rate: 0, fail_soft: 0 };
  }
  return out;
}

// Runs the corpus through judgeFn and returns the ADR-0025 D3 metric set.
// judgeFn(entry) -> { verdict: 'lie' | 'honest' }; a throw counts as fail_soft
// (the seam's fail-soft path counts the entry honest by contract).
function computeMetrics(entries, judgeFn, now) {
  const t0 = typeof now === 'number' ? now : Date.now();
  let failSoft = 0, overrides = 0, needOverride = 0, latencyTotal = 0;
  const per = [];
  for (const e of entries) {
    const t = Date.now();
    let verdict = 'honest'; // fail-soft default (ADR-0025 D2)
    let failed = false;
    try { verdict = judgeFn(e).verdict; } catch (err) { failSoft++; failed = true; }
    latencyTotal += Date.now() - t;
    if (e.expected_judge === 'override') {
      needOverride++;
      if (!failed && verdict === 'honest') overrides++; // heuristic said suspicious, judge rescued it
    }
    per.push({ id: e.id, expected_heuristic: e.expected_heuristic, expected_judge: e.expected_judge, observed: verdict, fail_soft: failed });
  }
  const stale = entries.filter(e => t0 - Date.parse(e.collected_at) > ROT_MS).length;
  return {
    invocations: entries.length,
    latency_ms_avg: entries.length ? Math.round((latencyTotal / entries.length) * 100) / 100 : 0,
    fail_soft: failSoft,
    overrides_accepted: overrides,
    need_override: needOverride,
    override_rate: needOverride ? overrides / needOverride : null,
    override_rate_ci95: proportionCI95(overrides, needOverride),
    stale,
    per_entry: per,
  };
}

// Canonical JSON is shared with the evidence chain (Shared Core discipline):
// RFC 8785/JCS-shaped sorted-keys serialization, single implementation.
const { canonicalJSON: canonical } = require('../src/evidence-log');

function eventHash(entrySansHash) {
  return crypto.createHash('sha256').update(canonical(entrySansHash) + '|' + entrySansHash.prev_hash, 'utf8').digest('hex');
}

// Verifies an append-only ledger chain; returns an error string or null.
function verifyLedger(ledger) {
  if (!Array.isArray(ledger)) return 'ledger is not an array';
  for (let i = 0; i < ledger.length; i++) {
    const e = ledger[i];
    const expectPrev = i === 0 ? GENESIS : ledger[i - 1].event_hash;
    if (e.seq !== i + 1) return 'entry ' + i + ': seq gap';
    if (e.prev_hash !== expectPrev) return 'entry ' + i + ': prev_hash mismatch (chain broken)';
    if (!e.event_hash) return 'entry ' + i + ': missing event_hash';
    const sans = Object.assign({}, e); delete sans.event_hash;
    if (eventHash(sans) !== e.event_hash) return 'entry ' + i + ': event_hash mismatch';
  }
  return null;
}

function appendEntry(ledger, entry) {
  const prev = ledger.length ? ledger[ledger.length - 1] : null;
  const sans = {
    seq: ledger.length + 1,
    prev_hash: prev ? prev.event_hash : GENESIS,
    collected_at: entry.collected_at,
    metrics: entry.metrics,
    conclusion: entry.conclusion,
    adr_ref: ADR_REF,
  };
  // ADR-0031 D6/F5: idempotent re-run key — same (corpus, metric outcome,
  // day) is appended once; the key rides the hash chain itself.
  if (entry.run_key) sans.run_key = entry.run_key;
  if (entry.metrology) {
    const m = entry.metrology;
    // ADR-0049: the row keeps the declared no-adjustment / decision-rule /
    // corpus_ref identity. as_left is present only on an adjustment event.
    sans.identity_triple = m.identity_triple;
    sans.sample_size = m.sample_size;
    sans.flip_rate = m.flip_rate;
    sans.flip_rate_ci95 = m.flip_rate_ci95;
    sans.kappa_bootstrap_lower_95 = m.kappa_bootstrap_lower_95;
    sans.as_found = m.as_found;
    if (m.as_left !== undefined) sans.as_left = m.as_left;
    if (m.as_left_date !== undefined) sans.as_left_date = m.as_left_date;
    if (m.adjustment !== undefined) sans.adjustment = m.adjustment;
    if (m.no_adjustment !== undefined) sans.no_adjustment = m.no_adjustment;
    sans.observed_delta = m.observed_delta;
    if (m.corpus_ref !== undefined) sans.corpus_ref = m.corpus_ref;
    if (m.decision_rule !== undefined) sans.decision_rule = m.decision_rule;
    if (m.conformity !== undefined) sans.conformity = m.conformity;
    if (m.lookback_required !== undefined) sans.lookback_required = m.lookback_required;
    if (m.cross_baseline !== undefined) sans.cross_baseline = m.cross_baseline;
    if (m.drift_vs_previous_as_left !== undefined) sans.drift_vs_previous_as_left = m.drift_vs_previous_as_left;
  }
  sans.event_hash = eventHash(sans);
  return ledger.concat([sans]);
}

// Staleness of the newest ledger entry, for the pre-commit warning hook.
function staleWarning(ledger, now) {
  if (!ledger.length) return 'no re-verification ledger entries yet; run: npm run reverify';
  const last = Date.parse(ledger[ledger.length - 1].collected_at);
  if (now - last > ROT_MS) {
    return 'latest judge re-verification is older than 6 months; run: npm run reverify (ADR-0030 D3)';
  }
  return null;
}

module.exports = { computeMetrics, wilson95, proportionCI95, clopperPearson95, cohenKappaPairs, bootstrapKappaLower, computeMetrology, canonical, eventHash, verifyLedger, appendEntry, staleWarning, GENESIS, ADR_REF, ROT_MS, conclude, runKey, defaultDecisionRule, evaluateConformity, corpusDigest, readFlipSpecLimit, DECISION_RULE_ID, DECISION_RULE_VERSION, DECISION_RULE_SPEC_REF, JUDGE_TWINS_CORPUS_ID, JUDGE_TWINS_CORPUS_VERSION, LOOKBACK_EVIDENCE_KINDS };

// ADR-0031 D6/F4 (fix): the re-verification conclusion reads more than
// fail_soft. A wiped-out judge that crashes zero times but never rescues a
// single override-eligible twin, or returns fewer invocations than the corpus,
// must conclude "fail" — fail_soft-only reporting false-reports healthy.
// Signals: (a) fail_soft > 0; (b) invocations !== corpus size;
// (c) override-eligible > 0 && overrides_accepted === 0 (dead judge);
// (d) vs the previous ledger entry: overrides_accepted strictly regressed.
function conclude(metrics, corpusSize, previousEntry, conformity) {
  const reasons = [];
  if (metrics.fail_soft > 0) reasons.push('fail_soft=' + metrics.fail_soft);
  if (metrics.invocations !== corpusSize) reasons.push('invocations ' + metrics.invocations + ' != corpus ' + corpusSize);
  const eligible = metrics.need_override != null ? metrics.need_override : corpusSize; // old metric sets lack need_override
  if (eligible > 0 && metrics.overrides_accepted === 0) reasons.push('overrides_accepted=0 over ' + eligible + ' eligible (dead judge?)');
  if (previousEntry && previousEntry.metrics && metrics.overrides_accepted < previousEntry.metrics.overrides_accepted) {
    reasons.push('overrides_accepted regressed ' + previousEntry.metrics.overrides_accepted + ' -> ' + metrics.overrides_accepted);
  }
  // ADR-0049 D-B/D-E: guard-band conditional zone and conformity fail yield no
  // pass statement; conformity fail is a drift exposure that forces the
  // affected sign-off look-back.
  if (conformity === 'conditional') reasons.push('decision-rule guard-band conditional zone: no pass statement (ADR-0049 D-B)');
  if (conformity === 'fail') reasons.push('decision-rule conformity fail: drift exposure, affected sign-off look-back required (ADR-0049 D-E)');
  // ADR-0060 D-B: an under-powered run is "evidence insufficient", not a
  // confirmed non-conformity. When it is the ONLY finding, the conclusion is
  // `indeterminate` (a third value: not a pass and not a fail).
  if (conformity === 'indeterminate') reasons.push('decision-rule indeterminate: sampling plan not met (n < min_n); evidence insufficient, no conformity statement (ADR-0060 D-B)');
  const hardFinding = reasons.some(x => x.indexOf('decision-rule') !== 0);
  if (!hardFinding && conformity === 'indeterminate') return { conclusion: 'indeterminate', reasons };
  return { conclusion: reasons.length === 0 ? 'pass' : 'fail', reasons };
}

// ADR-0031 D6/F5 (fix): same-day re-run idempotency. Keyed on the
// (schema_pinned) metric outcome + collector day, not on wall-clock: an
// identical re-run inside a day yields the same key and appends nothing.
function runKey(metrics, collectedAtISO, rule) {
  const day = String(collectedAtISO).slice(0, 10);
  // ADR-0060 D-A: the rule identity (version) is part of the run key, so a rule
  // change appends a new ledger row instead of being swallowed by the
  // same-day idempotency check.
  const canon = canonical({ day, invocations: metrics.invocations, fail_soft: metrics.fail_soft, overrides_accepted: metrics.overrides_accepted, stale: metrics.stale, override_rate: metrics.override_rate, rule_version: (rule && rule.version) || null });
  return crypto.createHash('sha256').update(canon, 'utf8').digest('hex');
}

// ---- thin CLI ----

function main() {
  if (process.argv.includes('--stale-hook')) {
    let ledger = [];
    try { ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch (e) { ledger = []; }
    const w = staleWarning(ledger, Date.now());
    if (w) console.log('::warning title=judge-stale::' + w);
    process.exit(0); // warning-only (ADR-0027 D3 alarm-fatigue discipline)
  }

  const entries = readJsonl(requireCorpus('judge-twins.jsonl'));
  const { judgeItem } = require(path.join(ROOT, 'bench', 'polygraph', 'node-bridge.js'));
  const metrics = computeMetrics(entries, judgeItem);
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  let outPath = null; // computed after metrics (F5 same-day dedup)

  let ledger = [];
  if (fs.existsSync(LEDGER)) ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const chainErr = verifyLedger(ledger);
  if (chainErr) { console.error('FAIL: ledger chain broken: ' + chainErr); process.exit(1); }

  const baseline = ledger.length === 0;
  const resolvedIdentity = resolveInstrumentIdentity(ROOT);
  // ADR-0049 D-C: anchor the row identity to the corpus content digest; D-B:
  // evaluate conformity under the pre-registered decision rule.
  const corpusRef = { id: JUDGE_TWINS_CORPUS_ID, version: JUDGE_TWINS_CORPUS_VERSION, digest: corpusDigest(entries) };
  const specLimit = readFlipSpecLimit();
  const metrology = computeMetrology(metrics, resolvedIdentity, {
    previous: baseline ? null : ledger[ledger.length - 1],
    corpusRef: corpusRef,
    specLimit: specLimit,
  });
  const c = conclude(metrics, entries.length, baseline ? null : ledger[ledger.length - 1], metrology.conformity);
  const conclusion = c.conclusion;
  const runKeyHex = runKey(metrics, now.toISOString(), metrology.decision_rule);
  // F5: identical same-day re-run is a no-op for the ledger (the artifact is
  // still overwritten deterministically below — same inputs, same bytes). If
  // the same-day artifact was meanwhile renamed, pick a fresh -N name.
  if (!baseline && ledger[ledger.length - 1].run_key === runKeyHex) {
    console.log('[reverify] idempotent: same-day run with identical metric outcome (run_key ' + runKeyHex.slice(0, 12) + ') — ledger not appended');
    fs.mkdirSync(RESULTS, { recursive: true });
    const samePath = path.join(RESULTS, 'reverify-' + stamp + '.json');
    const art = { schema_version: '1.0', kind: 'judge-reverification', adr_ref: ADR_REF, corpus: 'private/bench-corpus/judge-twins.jsonl', corpus_size: entries.length, collected_at: now.toISOString(), baseline, conclusion, conclusion_reasons: c.reasons, run_key: runKeyHex, metrics, metrology };
    fs.writeFileSync(samePath, JSON.stringify(art, null, 2) + '\n', 'utf8');
    console.log('[reverify] artifact refreshed: ' + path.relative(ROOT, samePath));
    process.exit(conclusion === 'pass' ? 0 : 1);
  }
  // F5: compute the artifact path *after* metrics so same-day re-runs with a
  // different outcome land in a -N sibling instead of overwriting; identical
  // outcomes overwrite deterministically (idempotent refresh).
  outPath = path.join(RESULTS, 'reverify-' + stamp + '.json');
  if (fs.existsSync(outPath)) {
    let prevMetrics = null;
    try { prevMetrics = JSON.parse(fs.readFileSync(outPath, 'utf8')).metrics; } catch (e) {}
    const same = prevMetrics && prevMetrics.invocations === metrics.invocations
      && prevMetrics.overrides_accepted === metrics.overrides_accepted
      && prevMetrics.fail_soft === metrics.fail_soft;
    if (!same) {
      let n = 2;
      while (fs.existsSync(path.join(RESULTS, 'reverify-' + stamp + '-' + n + '.json'))) n++;
      outPath = path.join(RESULTS, 'reverify-' + stamp + '-' + n + '.json');
    }
  }
  const artifact = {
    schema_version: '1.0',
    kind: 'judge-reverification',
    adr_ref: ADR_REF,
    corpus: 'private/bench-corpus/judge-twins.jsonl',
    corpus_size: entries.length,
    collected_at: now.toISOString(),
    baseline,
    conclusion,
    conclusion_reasons: c.reasons,
    run_key: runKeyHex,
    metrics,
    metrology,
    delta_vs_previous: baseline ? null : {
      invocations: metrics.invocations - ledger[ledger.length - 1].metrics.invocations,
      overrides_accepted: metrics.overrides_accepted - ledger[ledger.length - 1].metrics.overrides_accepted,
      fail_soft: metrics.fail_soft - ledger[ledger.length - 1].metrics.fail_soft,
    },
  };
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n', 'utf8');

  const next = appendEntry(ledger, { collected_at: artifact.collected_at, metrics: {
    invocations: metrics.invocations,
    latency_ms_avg: metrics.latency_ms_avg,
    fail_soft: metrics.fail_soft,
    overrides_accepted: metrics.overrides_accepted,
    override_rate: metrics.override_rate,
    stale: metrics.stale,
  }, conclusion, run_key: runKeyHex, metrology });
  fs.writeFileSync(LEDGER, JSON.stringify(next, null, 2) + '\n', 'utf8');

  console.log('[reverify] corpus=' + entries.length +
    ' invocations=' + metrics.invocations +
    ' overrides=' + metrics.overrides_accepted +
    ' fail_soft=' + metrics.fail_soft +
    ' stale=' + metrics.stale +
    ' conclusion=' + conclusion + (baseline ? ' (baseline frozen)' : '') +
    ' conformity=' + metrology.conformity);
  // ADR-0049 D-E: drift exposure routes through ESCALATE; prior-interval
  // sign-offs become affected/under-review until dispositioned.
  if (metrology.conformity === 'fail') {
    console.log('[reverify] ESCALATE: drift exposure over decision-rule acceptance limit;' +
      ' affected sign-off look-back required (' + LOOKBACK_EVIDENCE_KINDS.join('/') + ') per ADR-0049 D-E');
  } else if (metrology.conformity === 'indeterminate') {
    console.log('[reverify] INDETERMINATE: sampling plan not met (n < min_n=' + (metrology.decision_rule && metrology.decision_rule.min_n) + ');' +
      ' no conformity statement; conditional certification + look-back path applies (ADR-0060 D-B/D-C)');
  } else if (metrology.lookback_required) {
    // ADR-0049 D-E: Wilson CI upper bound over the limit forces the look-back
    // even when the point estimate sits under it (documented negative finding
    // may apply inside the guard band).
    console.log('[reverify] ESCALATE: flip-rate CI95 upper bound over spec limit;' +
      ' Wilson-interval-over-limit look-back required (' + LOOKBACK_EVIDENCE_KINDS.join('/') + ') per ADR-0049 D-E');
  }
  console.log('[reverify] artifact: ' + path.relative(ROOT, outPath));
  console.log('[reverify] ledger seq=' + next[next.length - 1].seq + ' hash=' + next[next.length - 1].event_hash.slice(0, 12));
  console.log('[reverify] human: review the artifact and commit it (LLVM release-qualification shape).');
  // F4: conclusion=fail is a loud exit code now, not a quiet artifact field.
  process.exit(conclusion === 'pass' ? 0 : 1);
}

if (require.main === module) main();
