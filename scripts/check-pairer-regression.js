#!/usr/bin/env node
'use strict';
// scripts/check-pairer-regression.js — ADR-0070 D-A clause 4: the v3 corpus
// converted to the pairer's continuous regression gate. Replays the frozen
// devin-corpus-v3 items through the SHIPPED artifact src/capa-pairer.js and
// diffs {family,state,claim,evidence,reason} against the stored v3 report
// rows. Any drift fails closed (the move to src/ changed the pin's path,
// never its content — a changed artifact requires a new pin under a
// same-commit ADR).
//
// Usage: node scripts/check-pairer-regression.js
// Exit 0 pass / 1 fail / 2 capability absent (ADR-0040 three-state).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const ITEMS = path.join(ROOT, 'bench', 'research', 'devin-corpus-v3', 'items.jsonl');
const REPORT = path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.json');
const PAIRER = path.join(ROOT, 'src', 'capa-pairer.js');
const PIN_SHA256 = '9ff2d0ada931628b0bffcb8685125cc7d97ddbd599e8a67123d8811f83917445';
const PIN_BYTES = 10697;

function fail(msg) { console.error('[pairer-regression] FAIL: ' + msg); process.exit(1); }

function main() {
  requireCapabilities('pairer-regression');

  const buf = fs.readFileSync(PAIRER);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== PIN_SHA256 || buf.length !== PIN_BYTES) {
    fail('shipped pairer drifted from the adjudicated pin: sha256 ' + sha.slice(0, 8) + ' / ' + buf.length + 'B vs pinned 9ff2d0ad / 10697B');
  }

  const items = fs.readFileSync(ITEMS, 'utf8').split(/\r?\n/).filter(Boolean).map(function (l) { return JSON.parse(l); });
  const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const rows = report.items || [];
  if (items.length !== rows.length) fail('item count drift: corpus ' + items.length + ' vs report ' + rows.length);
  const byId = {};
  for (const r of rows) byId[r.id] = r;

  const pairer = require(PAIRER);
  let drift = 0, flagged = 0, undetermined = 0;
  for (const it of items) {
    const got = pairer.pairItem(it);
    const exp = byId[it.id];
    if (!exp) { console.error('[pairer-regression] item ' + it.id + ' missing from stored report'); drift++; continue; }
    for (const f of ['family', 'state', 'claim', 'evidence', 'reason']) {
      if (JSON.stringify(got[f]) !== JSON.stringify(exp[f])) {
        console.error('[pairer-regression] ' + it.id + '.' + f + ': got ' + JSON.stringify(got[f]) + ' vs report ' + JSON.stringify(exp[f]));
        drift++;
        break;
      }
    }
    if (got.state === 'flagged') flagged++;
    if (got.state === 'undetermined') undetermined++;
  }
  if (drift) fail(drift + ' item(s) diverge from the stored v3 report rows');
  console.log('[pairer-regression] OK: ' + items.length + ' items replayed through src/capa-pairer.js (pinned 9ff2d0ad), all rows match the burned v3 report (' + flagged + ' flagged, ' + undetermined + ' undetermined)');
  process.exit(0);
}

if (require.main === module) main();
module.exports = { PIN_SHA256: PIN_SHA256, PIN_BYTES: PIN_BYTES };
