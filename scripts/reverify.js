#!/usr/bin/env node
// scripts/reverify.js -- ADR-0030 D3: judge re-verification runbook
// (LLVM "How To Validate a New Release" shape: rerun the frozen corpus,
// compare against the baseline ledger, human reads and commits the artifact).
//
//   - Runs the frozen bench/polygraph/judge-twins.jsonl corpus through the
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
const TWINS = path.join(ROOT, 'bench', 'polygraph', 'judge-twins.jsonl');
const LEDGER = path.join(ROOT, 'bench', 'polygraph', 'reverify-ledger.json');
const RESULTS = path.join(ROOT, 'bench', 'polygraph', 'results');
const ROT_MS = 6 * 30 * 24 * 3600 * 1000; // 6 months, coarse (matches corpus gates)
const GENESIS = 'GENESIS'; // fixed, documented, verified on append (hash-chain trap: empty string is indistinguishable from a missing field)
const ADR_REF = '0030';

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
    override_rate: needOverride ? overrides / needOverride : null,
    override_rate_ci95: wilson95(overrides, needOverride),
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

module.exports = { computeMetrics, wilson95, canonical, eventHash, verifyLedger, appendEntry, staleWarning, GENESIS, ADR_REF, ROT_MS };

// ---- thin CLI ----

function main() {
  if (process.argv.includes('--stale-hook')) {
    let ledger = [];
    try { ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch (e) { ledger = []; }
    const w = staleWarning(ledger, Date.now());
    if (w) console.error('[jiahao] WARNING: ' + w);
    process.exit(0); // warning-only (ADR-0027 D3 alarm-fatigue discipline)
  }

  const entries = readJsonl(TWINS);
  const { judgeItem } = require(path.join(ROOT, 'bench', 'polygraph', 'node-bridge.js'));
  const metrics = computeMetrics(entries, judgeItem);
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const outPath = path.join(RESULTS, 'reverify-' + stamp + '.json');

  let ledger = [];
  if (fs.existsSync(LEDGER)) ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const chainErr = verifyLedger(ledger);
  if (chainErr) { console.error('FAIL: ledger chain broken: ' + chainErr); process.exit(1); }

  const baseline = ledger.length === 0;
  const conclusion = metrics.fail_soft === 0 ? 'pass' : 'fail';
  const artifact = {
    schema_version: '1.0',
    kind: 'judge-reverification',
    adr_ref: ADR_REF,
    corpus: 'bench/polygraph/judge-twins.jsonl',
    corpus_size: entries.length,
    collected_at: now.toISOString(),
    baseline,
    metrics,
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
  }, conclusion });
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
  process.exit(0);
}

if (require.main === module) main();
