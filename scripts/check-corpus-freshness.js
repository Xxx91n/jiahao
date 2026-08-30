#!/usr/bin/env node
// scripts/check-corpus-freshness.js - ADR-0036 D5: corpus freshness gate
// (Soft-Hard Freshness Ladder; TUF-tiered-expiry shape: per-corpus tier,
// warn at tier expiry, fail-closed at tier x fail_multiplier).
//
// Fact sources (no duplicated state): judge-twins reads the reverify-ledger
// tail (ADR-0030 single fact source); probes reads max(collected_at) inside
// the corpus (the ADR-0036 D3 refresh seeds it); twins reads fresh_since in
// bench/polygraph/corpus-freshness.json - it has no reverify channel and no
// collected_at field, the registry entry is the bootstrap anchor.
// Exit 0 when all fresh; warn prints ::warning:: and still exits 0
// (ADR-0027 D3 alarm-fatigue discipline); stale (tier x multiplier) exits 1;
// missing corpus / unparseable fact fails closed (exit 2 or stale).
// --hook: warn-only variant for .githooks/pre-commit-user (never fails).

'use strict';

const fs = require('fs');
const path = require('path');
const { MONTH_MS } = require('../src/reverify-schedule');
const { requireCorpus } = require('../src/shared/paths');

const ROOT = path.join(__dirname, '..');
const CFG_REL = path.join('bench', 'polygraph', 'corpus-freshness.json');
const LEDGER_REL = path.join('bench', 'polygraph', 'reverify-ledger.json');

// ---- pure core ----

// fresh | warn | stale; tierMonths 6 with mult 1.5 -> warn >= 6mo, stale >= 9mo.
function freshnessState(lastAtMs, tierMonths, now, mult) {
  if (lastAtMs === null || Number.isNaN(lastAtMs)) return 'stale'; // no fact = fail closed
  if (lastAtMs > now) return 'stale'; // future timestamp = fail closed (a time you cannot verify is not fresh)
  const age = now - lastAtMs;
  if (age >= tierMonths * mult * MONTH_MS) return 'stale';
  if (age >= tierMonths * MONTH_MS) return 'warn';
  return 'fresh';
}

// Ladder self-audit: fail months equal tier x 1.5 (the ADR-0030 6/9 dead-man
// ladder re-derived as 6 x 1.5 = 9).
function ladderMonths(tierMonths, mult) {
  return { warnMonthly: tierMonths, failMonthly: tierMonths * mult };
}

function maxCollectedAt(entries) {
  let max = null;
  for (const e of entries) {
    const t = Date.parse(e.collected_at);
    if (!Number.isNaN(t) && (max === null || t > max)) max = t;
  }
  return max;
}

function ledgerTail(ledger) {
  if (!Array.isArray(ledger) || !ledger.length) return null;
  const t = Date.parse(ledger[ledger.length - 1].collected_at);
  return Number.isNaN(t) ? null : t;
}

module.exports = { freshnessState, ladderMonths, maxCollectedAt, ledgerTail };

// ---- thin CLI ----

function resolveFacts(cfg) {
  const facts = {};
  // ledger chain must verify before its tail is trusted (audit F3 shape).
  let ledger = null;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER_REL), 'utf8'));
    const { verifyLedger } = require('./reverify');
    if (!verifyLedger(raw)) ledger = raw;
  } catch (e) { ledger = null; }
  for (const name of Object.keys(cfg.tiers)) {
    if (name === 'judge-twins.jsonl') { facts[name] = ledgerTail(ledger); continue; }
    const file = requireCorpus(name); // exit 2 + run-install hint when absent
    if (name === 'probes.jsonl') {
      const entries = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(x => x.trim()).map(JSON.parse);
      facts[name] = maxCollectedAt(entries);
    } else {
      facts[name] = Date.parse((cfg.fresh_since || {})[name] || ''); // NaN -> stale
    }
  }
  return facts;
}

function main(argv) {
  const hook = argv.includes('--hook');
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, CFG_REL), 'utf8'));
  if (!cfg.fail_multiplier || cfg.fail_multiplier <= 1) { console.error('FAIL-CLOSED: fail_multiplier must be > 1 (ADR-0036 D5)'); process.exit(2); }
  const now = Date.now();
  const facts = resolveFacts(cfg);
  let hasStale = false;
  const warnLines = [];
  for (const [name, tier] of Object.entries(cfg.tiers)) {
    const st = freshnessState(facts[name], tier, now, cfg.fail_multiplier);
    const lad = ladderMonths(tier, cfg.fail_multiplier);
    if (st === 'stale') hasStale = true;
    const msg = name + ': ' + st + ' (tier ' + lad.warnMonthly + 'mo, fail at ' + lad.failMonthly + 'mo, last=' + (Number.isFinite(facts[name]) ? new Date(facts[name]).toISOString().slice(0, 10) : 'unknown') + ')';
    if (st === 'warn') warnLines.push(msg);
    console.log('[corpus-freshness] ' + msg);
  }
  if (hook) {
    if (warnLines.length || hasStale) console.error('[jiahao] WARNING: corpus freshness: ' + (warnLines[0] || 'stale corpus - reverify before relying on gate verdicts'));
    process.exit(0); // warn-only; a blocked commit train is the runbook's call (ADR-0027 D3)
  }
  if (hasStale) { console.error('[corpus-freshness] FAIL: a corpus exceeded tier x ' + cfg.fail_multiplier + ' (ADR-0036 D5)'); process.exit(1); }
  for (const w of warnLines) console.log('::warning title=corpus-freshness::' + w + ' - reverify via the ADR-0030 channel or declare exemption');
  console.log('[corpus-freshness] OK (ADR-0036 D5)');
  process.exit(0);
}

if (require.main === module) main(process.argv);
