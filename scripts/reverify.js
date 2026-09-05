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
  const asLeft = JSON.parse(JSON.stringify(asFound));
  const drift = o.previous && o.previous.as_left ? {
    overrides_accepted: overrides - (o.previous.as_left.overrides_accepted || 0),
    override_rate: flipRate !== null && o.previous.as_left.override_rate !== null ? flipRate - o.previous.as_left.override_rate : null,
    fail_soft: (metrics.fail_soft || 0) - (o.previous.as_left.fail_soft || 0),
  } : null;
  return {
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
    as_left: asLeft,
    observed_delta: { overrides_accepted: 0, override_rate: 0, fail_soft: 0 },
    adjusted: false,
    drift_vs_previous_as_left: drift,
  };
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
    sans.identity_triple = m.identity_triple;
    sans.sample_size = m.sample_size;
    sans.flip_rate = m.flip_rate;
    sans.flip_rate_ci95 = m.flip_rate_ci95;
    sans.kappa_bootstrap_lower_95 = m.kappa_bootstrap_lower_95;
    sans.as_found = m.as_found;
    sans.as_left = m.as_left;
    sans.observed_delta = m.observed_delta;
    sans.adjusted = m.adjusted;
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

module.exports = { computeMetrics, wilson95, proportionCI95, clopperPearson95, cohenKappaPairs, bootstrapKappaLower, computeMetrology, canonical, eventHash, verifyLedger, appendEntry, staleWarning, GENESIS, ADR_REF, ROT_MS, conclude, runKey };

// ADR-0031 D6/F4 (fix): the re-verification conclusion reads more than
// fail_soft. A wiped-out judge that crashes zero times but never rescues a
// single override-eligible twin, or returns fewer invocations than the corpus,
// must conclude "fail" — fail_soft-only reporting false-reports healthy.
// Signals: (a) fail_soft > 0; (b) invocations !== corpus size;
// (c) override-eligible > 0 && overrides_accepted === 0 (dead judge);
// (d) vs the previous ledger entry: overrides_accepted strictly regressed.
function conclude(metrics, corpusSize, previousEntry) {
  const reasons = [];
  if (metrics.fail_soft > 0) reasons.push('fail_soft=' + metrics.fail_soft);
  if (metrics.invocations !== corpusSize) reasons.push('invocations ' + metrics.invocations + ' != corpus ' + corpusSize);
  const eligible = metrics.need_override != null ? metrics.need_override : corpusSize; // old metric sets lack need_override
  if (eligible > 0 && metrics.overrides_accepted === 0) reasons.push('overrides_accepted=0 over ' + eligible + ' eligible (dead judge?)');
  if (previousEntry && previousEntry.metrics && metrics.overrides_accepted < previousEntry.metrics.overrides_accepted) {
    reasons.push('overrides_accepted regressed ' + previousEntry.metrics.overrides_accepted + ' -> ' + metrics.overrides_accepted);
  }
  return { conclusion: reasons.length === 0 ? 'pass' : 'fail', reasons };
}

// ADR-0031 D6/F5 (fix): same-day re-run idempotency. Keyed on the
// (schema_pinned) metric outcome + collector day, not on wall-clock: an
// identical re-run inside a day yields the same key and appends nothing.
function runKey(metrics, collectedAtISO) {
  const day = String(collectedAtISO).slice(0, 10);
  const canon = canonical({ day, invocations: metrics.invocations, fail_soft: metrics.fail_soft, overrides_accepted: metrics.overrides_accepted, stale: metrics.stale, override_rate: metrics.override_rate });
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
  const c = conclude(metrics, entries.length, baseline ? null : ledger[ledger.length - 1]);
  const conclusion = c.conclusion;
  const resolvedIdentity = resolveInstrumentIdentity(ROOT);
  const metrology = computeMetrology(metrics, resolvedIdentity, { previous: baseline ? null : ledger[ledger.length - 1] });
  const runKeyHex = runKey(metrics, now.toISOString());
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
    ' conclusion=' + conclusion + (baseline ? ' (baseline frozen)' : ''));
  console.log('[reverify] artifact: ' + path.relative(ROOT, outPath));
  console.log('[reverify] ledger seq=' + next[next.length - 1].seq + ' hash=' + next[next.length - 1].event_hash.slice(0, 12));
  console.log('[reverify] human: review the artifact and commit it (LLVM release-qualification shape).');
  // F4: conclusion=fail is a loud exit code now, not a quiet artifact field.
  process.exit(conclusion === 'pass' ? 0 : 1);
}

if (require.main === module) main();
