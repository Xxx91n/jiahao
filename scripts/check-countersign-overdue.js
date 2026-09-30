#!/usr/bin/env node
'use strict';
// scripts/check-countersign-overdue.js - ADR-0090 leg (grill-t34 D-003(v)(vi)):
// the countersign-overdue three-stage ladder (ADR-0089 D-E precedent).
//   inside return-by            -> SUGGEST (advisory, exit 0)
//   return-by..return-by+30d    -> grace window: SUGGEST (advisory, exit 0)
//   past grace                  -> FAIL (exit 1), declared-drift-shaped red
//                                  output naming rebuild / re-seal /
//                                  declared-drift exits
// The leg asserts "no unadjudicated queue member may be silently permanent"
// - it NEVER asserts "the owner must have acted by date X"; the red-light
// response is a human call. Membership derives from the shared
// scripts/countersign-queue.js surface (never a maintained count).
//
// Registered constants (declared reasons, not bare numbers):
//   TIDE = 2026-12-15 - the countersign return-by registered on every
//     awaiting member's status line and in the defer-0068 second_reviewer
//     slot; moving it is a registered owner-side amendment, not an edit
//     here.
//   GRACE_DAYS = 30 - covers ONE post-tide owner working window (~1/3 of
//     the tide interval); it is the alert phase, not permission to lapse.
//
// Injectable seams for the battery: opts.now (clock), opts.queue
// (pre-derived member sets for fixture tests).

const { requireCapabilities } = require('../src/shared/capability');
const q = require('./countersign-queue');

requireCapabilities(['repo-tree']);

const TIDE = '2026-12-15';
const GRACE_DAYS = 30;

function stage(now, returnByMs) {
  if (now.getTime() <= returnByMs) return 'in-term';
  const graceEnd = returnByMs + GRACE_DAYS * 24 * 60 * 60 * 1000;
  if (now.getTime() <= graceEnd) return 'grace';
  return 'past-grace';
}

function members(opts) {
  if (opts && opts.queue) return opts.queue;
  const derived = q.queueMembers();
  return [].concat(derived['awaiting-old-form'], derived['awaiting-e13-pointer'], derived['awaiting-new-form']);
}

// Pure core (injected clock): returns {stage, exit, lines}.
function evaluate(now, opts) {
  const returnByMs = Date.parse(TIDE + 'T23:59:59Z');
  const ms = members(opts);
  const s = stage(now, returnByMs);
  if (s === 'past-grace') {
    const lines = [
      'FAIL: ' + ms.length + ' unadjudicated countersign queue member(s) are past the ' + TIDE + ' return-by + ' + GRACE_DAYS + 'd grace - silently permanent is not a registered state (ADR-0090 D-003).',
      'Registered red-light exits (human call, in the tide adjudication surface):',
      '  - rebuild: countersign/ratify the queue as registered;',
      '  - re-seal: re-open the queue registration via a scoped successor ADR;',
      '  - declared-drift: record the drift in ERRATA and proceed knowingly.',
      'Members: ' + ms.join(' '),
    ];
    return { stage: s, exit: 1, lines: lines };
  }
  const phase = s === 'in-term'
    ? 'countersign return-by is ' + TIDE + ' (not yet due)'
    : 'grace window after the ' + TIDE + ' return-by (+' + GRACE_DAYS + 'd: one post-tide owner working window, ~1/3 of the tide interval)';
  const lines = [
    'SUGGEST: ' + ms.length + ' countersign queue member(s) awaiting entity-level adjudication - ' + phase + '.',
    'Members: ' + ms.join(' '),
    'Past grace this leg FAILS with the declared-drift exits (rebuild / re-seal / declared-drift).',
  ];
  return { stage: s, exit: 0, lines: lines };
}

if (require.main === module) {
  const result = evaluate(new Date(), null);
  result.lines.forEach(function (l) { console.log(l); });
  process.exit(result.exit);
}

module.exports = { evaluate, stage, TIDE, GRACE_DAYS };
