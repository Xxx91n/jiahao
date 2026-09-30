'use strict';
// scripts/countersign-queue.js - grill-t34 D-003(vi): the countersign-queue
// derivation extracted into the single shared surface (evidence-freshness.js
// precedent). Bound-by ADRs: ADR-0084 (original queue registration +
// ID-level-only labels) and ADR-0086 (new-form status declaration). Authority
// rule (t33 D-002(i)): each ADR's own declaration surface is the sole
// authority; the queue is a MECHANICALLY DERIVED SET, never a maintained
// count. Consumers: test/countersign-queue.test.js (member-level
// reconciliation) and scripts/check-countersign-overdue.js (the
// three-stage overdue leg).

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ADR_DIR = path.join(ROOT, 'docs', 'adr');
const REG_ABS = path.join(ROOT, 'docs', 'deferred-registry.json');

const adrs = fs.readdirSync(ADR_DIR).filter(function (f) { return /^\d{4}-.+\.md$/.test(f); }).sort();
const adrText = {};
for (const f of adrs) adrText[f] = fs.readFileSync(path.join(ADR_DIR, f), 'utf8');

const RE = {
  statusLine: /^-?\s?\*?Status\*?\s*:/im,
  oldFormStatus: /Status[^\n]*ID-level-only, awaiting entity-level/i,
  e13Pointer: /Errata pointer \(2026-09-26, ERRATA E-13, grill-t28 D-002\)/,
  newFormStatus: /Status[^\n]*awaiting entity-level countersign/i,
  countersignedStatus: /^-?\s?\*?Status\*?\s*:[^\n]*second_reviewer (?:countersigned|countersign discharged|countersign landed)/im,
};

const EXEMPTS = { '0082': /registered as defer-0068/ };

const STATUSLESS_FINAL = new Set([
  '0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009',
  '0016', '0017', '0018',
]);

function classify(f) {
  const t = adrText[f];
  const num = f.slice(0, 4);
  if (RE.newFormStatus.test(t)) return 'awaiting-new-form';
  if (RE.oldFormStatus.test(t)) return 'awaiting-old-form';
  if (RE.e13Pointer.test(t)) return 'awaiting-e13-pointer';
  if (EXEMPTS[num] && EXEMPTS[num].test(t)) return 'registered-exempt';
  if (RE.countersignedStatus.test(t)) return 'countersigned-or-final';
  const n = parseInt(num, 10);
  const legacyHeading = /^## Status\s*\n+\s*Accepted\b/im.test(t);
  if (legacyHeading) return 'countersigned-or-final';
  if (RE.statusLine.test(t)) {
    const bareAccepted = /^-?\s?\*?Status\*?\s*:\s*Accepted(?:\s*\([^\n]*\))?\s*$/im.test(t);
    if (bareAccepted && n < 64) return 'countersigned-or-final';
    return 'undeclared';
  }
  if (STATUSLESS_FINAL.has(num) && /^# /m.test(t)) return 'countersigned-or-final';
  return 'undeclared';
}

// The queue = the union of the three awaiting forms. Member sets, never
// counts (t33 D-002).
function queueMembers() {
  const queue = { 'awaiting-old-form': [], 'awaiting-e13-pointer': [], 'awaiting-new-form': [] };
  for (const f of adrs) {
    const c = classify(f);
    if (queue[c]) queue[c].push(f.slice(0, 4));
  }
  return queue;
}

module.exports = { adrs, adrText, classify, queueMembers, RE, ROOT, ADR_DIR, REG_ABS };
