// src/sentinel.js — ADR-0023 D1-D2: per-hook timeout sentinel + reconciliation.
//
// Crash-only semantics (Candea & Fox): a hook killed by the host's stdin
// timeout cannot report its own death, so the NEXT hook start reconciles any
// residual sentinel into an evidence record (degradation kind='timeout'),
// which routes through the ADR-0022 D4 fail-closed coverage path.
// ponytail: sentinel files live in configDir shared across sessions — a
// same-name hook from a parallel session can theoretically interleave; host
// hooks are serialized per session, so accepted.
// Explicitly NOT done (ADR-0023 Consequences): periodic heartbeats, signed
// sentinels, instant alerting, WAL/queue.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { configDir } = require('./shared/paths');

const PREFIX = '.jiahao-sentinel.';
const PHASES = ['stdin', 'scan', 'verify', 'write']; // Phase Intent (ADR-0023 D3)

function sentinelPath(dir, hook) { return path.join(dir, PREFIX + hook); }

// Find residual sentinels, append one timeout record each, remove the file.
// Best-effort: reconciliation must never break the calling hook.
function reconcile(dir) {
  let files;
  try {
    files = fs.readdirSync(dir).filter(f => f.startsWith(PREFIX));
  } catch (e) { return []; }
  if (files.length === 0) return [];

  let evidenceLog = null;
  try {
    evidenceLog = require('./evidence-log').createEvidenceLog(dir);
  } catch (e) { /* no evidence sink — still clean up */ }

  const healed = [];
  for (const f of files) {
    const file = path.join(dir, f);
    let s = {};
    try { s = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* corrupt sentinel */ }
    const hook = typeof s.hook === 'string' && s.hook ? s.hook : f.slice(PREFIX.length);
    const orphaned_at = new Date().toISOString();
    if (evidenceLog) {
      try {
        const chain = evidenceLog.readAll() || [];
        const prevHash = chain.length > 0 ? chain[chain.length - 1].event_hash : null;
        const detail = 'hook killed before sentinel.end: ' + hook + ' at phase ' + (s.phase || 'stdin');
        const rec = evidenceLog.createRecord('sentinel-reconcile', 'sentinel', 'suspect', detail, null, prevHash, {
          detector: {
            suspicious: false, matched_phrases: [], severity: null,
            coverage: 'partial',
            degradation: {
              kind: 'timeout',
              detail: {
                hook: hook,
                turn: typeof s.turn === 'string' ? s.turn : null,
                phase: PHASES.indexOf(s.phase) >= 0 ? s.phase : 'stdin',
                orphaned_at: orphaned_at,
              },
            },
          },
        });
        rec._idem = crypto.createHash('sha256')
          .update('sentinel|' + hook + '|' + String(s.started_at || orphaned_at)).digest('hex');
        // _idem participates in the hash — recompute after stamping it.
        rec.event_hash = require('./evidence-log').recordHash(rec);
        evidenceLog.append([rec]);
        healed.push(hook);
      } catch (e) { /* evidence sink failed — sentinel still removed below */ }
    }
    try { fs.unlinkSync(file); } catch (e) { /* gone */ }
  }
  return healed;
}

// begin(hookName) — one line at hook entry. Reconciles residuals, then plants
// this hook's sentinel. Returns { set(phase), end() }. Normal exit removes the
// sentinel via a process exit hook, so killed processes leave it behind.
function begin(hook, overrideDir) {
  const dir = overrideDir || configDir();
  reconcile(dir);

  const file = sentinelPath(dir, hook);
  const now = new Date().toISOString();
  const state = { hook: hook, turn: null, started_at: now, phase: 'stdin', phase_at: now };
  let fd = null;
  try {
    fd = fs.openSync(file, 'w');
    fs.writeSync(fd, JSON.stringify(state), 0, 'utf8');
    fs.fsyncSync(fd); // existence durability (D2) — fsync once at creation
  } catch (e) { fd = null; }

  let ended = false;
  function end() {
    if (ended) return;
    ended = true;
    if (fd !== null) { try { fs.closeSync(fd); } catch (e) {} fd = null; }
    try { fs.unlinkSync(file); } catch (e) { /* gone */ }
  }
  process.on('exit', end); // sync cleanup on any normal exit path

  return {
    // Phase transition: pwrite in place, no fsync per D2 durability budget.
    set(phase, turn) {
      if (turn && typeof turn === 'string') state.turn = turn;
      const t = new Date().toISOString();
      if (PHASES.indexOf(phase) >= 0) { state.phase = phase; state.phase_at = t; }
      if (fd === null) return;
      try {
        const buf = Buffer.from(JSON.stringify(state), 'utf8');
        fs.ftruncateSync(fd, 0);
        fs.writeSync(fd, buf, 0, buf.length, 0);
      } catch (e) { /* phase update is best-effort */ }
    },
    end: end,
  };
}

module.exports = { begin, reconcile, PHASES, PREFIX };
