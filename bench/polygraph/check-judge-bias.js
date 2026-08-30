#!/usr/bin/env node
// bench/polygraph/check-judge-bias.js -- ADR-0031 D2/D3: judge bias
// calibration gate (three metrics over judge-twins.jsonl v1.1 pairs).
//
//   style_flip_rate          fraction of style-control pairs whose two
//                            surfaces get DIFFERENT verdicts (markdown vs
//                            plain). Tier: observational (first-cycle
//                            calibration; promote_if pre-registered).
//   length_discrimination    fraction of length-control pairs that behave
//                            as pre-registered: expansion pairs must NOT
//                            flip; truncation pairs MUST flip (lost
//                            discrimination = dead judge). Tier: confirmatory
//                            (fail-closed from day one).
//   swap_order_inconsistency pair-evaluation order sensitivity. The current
//                            judge bridge is stateless per item, so this is
//                            instrument-only: measured over evaluating each
//                            pair in both member orders. Observational-only
//                            forever (ADR-0031 R3).
//
// Bridge: default judgeFn is the same judgeItem the bench gate and the
// reverify runbook use (single caller pattern; the semantics corpus feeds a
// future scoring-mode judge — nothing in this script presumes the runtime).
//
// Gate tiers come from thresholds.json judge_bias_gates (ADR-0031 D3);
// confirmatory gates exit 1 on violation, observational gates report.
// The script is a thin CLI: pure core exported for jest (ADR-0029 D4 shape).
// Usage: node bench/polygraph/check-judge-bias.js

'use strict';

const fs = require('fs');
const path = require('path');

const CFG = path.join(__dirname, 'thresholds.json');
const { requireCorpus } = require('../../src/shared/paths');

// ---- pure core ----

// Map the corpus's expected_judge vocabulary to the judge bridge vocabulary.
// override = judge rescues a heuristic-suspicious turn -> verdict 'honest'.
// uphold   = judge agrees the turn is a lie -> verdict 'lie'.
function expectedVerdict(e) { return e.expected_judge === 'override' ? 'honest' : 'lie'; }

function pairEval(entries, judgeFn) {
  // entries: iterable of corpus entries. Returns { perPair: Map, verdicts: Map }.
  const byId = new Map();
  for (const e of entries) {
    let v;
    try { v = judgeFn(e).verdict; } catch (err) { v = 'judge-error'; }
    byId.set(e.id, v);
  }
  const pairs = new Map();
  for (const e of entries) {
    if (!e.pair_id) continue;
    if (!pairs.has(e.pair_id)) pairs.set(e.pair_id, { kind: e.kind, length_control: e.length_control || null, members: [] });
    pairs.get(e.pair_id).members.push(e);
  }
  for (const p of pairs.values()) {
    for (const m of p.members) m.observed_verdict = byId.get(m.id);
  }
  return { pairs, verdicts: byId };
}

function computeBias(entries, judgeFn) {
  const { pairs } = pairEval(entries, judgeFn);
  const metrics = { style_flip_rate: null, length_discrimination: null, swap_order_inconsistency: null };
  const detail = [];

  const stylePairs = [...pairs.values()].filter(p => p.kind === 'style-control');
  if (stylePairs.length) {
    let flips = 0;
    for (const p of stylePairs) {
      const vs = p.members.map(m => m.observed_verdict);
      const flip = new Set(vs).size > 1;
      if (flip) flips++;
      detail.push({ pair_id: p.members[0].pair_id, kind: 'style-control', flip });
    }
    metrics.style_flip_rate = flips / stylePairs.length;
  }

  const lenPairs = [...pairs.values()].filter(p => p.kind === 'length-control');
  if (lenPairs.length) {
    let ok = 0;
    for (const p of lenPairs) {
      const vs = p.members.map(m => m.observed_verdict);
      const flipped = new Set(vs).size > 1;
      // pre-registered assertion (ADR-0031 D2): NO length pair may flip.
      // expansion flip without truncation flip => verbosity bias;
      // truncation flip => lost quality discrimination. Either is a failure.
      const good = !flipped;
      if (good) ok++;
      detail.push({ pair_id: p.members[0].pair_id, kind: 'length-control', length_control: p.length_control, flipped, good });
    }
    metrics.length_discrimination = ok / lenPairs.length;
  }

  // swap order: re-evaluate each pair feeding reversed member order; a
  // stateless bridge cannot flip here — the instrument exists so a future
  // stateful judge is measured from day one.
  if (pairs.size) {
    let inconsistent = 0;
    for (const p of pairs.values()) {
      const forward = p.members.map(m => { try { return judgeFn(m).verdict; } catch (e) { return 'judge-error'; } }).join('|');
      const backward = p.members.slice().reverse().map(m => { try { return judgeFn(m).verdict; } catch (e) { return 'judge-error'; } }).join('|');
      const fwd = forward.split('|');
      const bwd = backward.split('|').reverse();
      if (fwd.join('|') !== bwd.join('|')) inconsistent++;
    }
    metrics.swap_order_inconsistency = inconsistent / pairs.size;
  }

  // bias-probe: report expected-verdict hit rate per pair (no tier-gate
  // metric in ADR-0031 D2; gold comparisons surface in the report).
  const probePairs = [...pairs.values()].filter(p => p.kind === 'bias-probe');
  const probeHits = [];
  for (const p of probePairs) {
    for (const m of p.members) {
      const exp = expectedVerdict(m);
      probeHits.push({ id: m.id, expected: exp, observed: m.observed_verdict, hit: exp === m.observed_verdict });
    }
  }
  return { metrics, detail, probe_hits: probeHits };
}

// Gate evaluation under ADR-0031 D3 tiers. Returns { fail, lines }.
function applyGates(metrics, cfg) {
  const gates = (cfg && Array.isArray(cfg.judge_bias_gates)) ? cfg.judge_bias_gates : [];
  if (!gates.length) return { fail: true, lines: ['judge_bias_gates missing in thresholds.json (ADR-0031 D3) — refusing fail-open'] };
  const lines = [];
  let fail = false;
  for (const g of gates) {
    const v = metrics[g.metric];
    if (v == null) {
      // ADR-0031 D3: a confirmatory gate whose metric is not computable must
      // fail closed (an emptied corpus must never silently pass the gate).
      if (g.tier === 'confirmatory') {
        lines.push('FAIL ' + g.id + ': metric ' + g.metric + ' not computable on this corpus (fail-closed, ADR-0031 D3)');
        fail = true;
      } else {
        lines.push('SKIP ' + g.id + ': metric ' + g.metric + ' not computable on this corpus');
      }
      continue;
    }
    const pass = g.op === '>=' ? v >= g.value : g.op === '<=' ? v <= g.value : g.op === '>' ? v > g.value : g.op === '<' ? v < g.value : false;
    const line = (pass ? 'PASS' : (g.tier === 'confirmatory' ? 'FAIL' : 'OBSERVE')) +
      ' ' + g.id + ' = ' + v + ' (' + g.op + ' ' + g.value + ', tier ' + g.tier + ', ' + (g.source_adr ? 'ADR-' + g.source_adr : 'no-adr') + ')';
    lines.push(line);
    if (!pass && g.tier === 'confirmatory') fail = true;
  }
  return { fail, lines };
}

module.exports = { computeBias, applyGates, expectedVerdict, pairEval };

// ---- thin CLI ----

function main() {
  const entries = fs.readFileSync(requireCorpus('judge-twins.jsonl'), 'utf8').split('\n').filter(x => x.trim()).map(JSON.parse);
  const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
  const { judgeItem } = require(path.join(__dirname, 'node-bridge.js'));
  const { metrics, detail, probe_hits } = computeBias(entries, judgeItem);
  console.log('[judge-bias] pairs: ' + detail.length + ', bias-probe hits: ' + probe_hits.filter(h => h.hit).length + '/' + probe_hits.length);
  for (const h of probe_hits) if (!h.hit) console.log('[judge-bias] bias-probe MISS ' + h.id + ' expected=' + h.expected + ' observed=' + h.observed);
  const g = applyGates(metrics, cfg);
  for (const l of g.lines) console.log('[judge-bias] ' + l);
  if (g.fail) { console.error('[judge-bias] FAIL'); process.exit(1); }
  console.log('[judge-bias] OK');
  process.exit(0);
}

if (require.main === module) main();
