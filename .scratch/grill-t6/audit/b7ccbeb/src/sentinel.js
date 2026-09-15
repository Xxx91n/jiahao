// src/sentinel.js — ADR-0023 D1-D2: per-hook timeout sentinel + reconciliation.
// ADR-0024: ownership via file-lock arbitration (D1), reconcile hardening (D2),
// SessionEnd sweep thin wrapper lives in hooks/jiahao-sweep.js (D3).
//
// Crash-only semantics (Candea & Fox): a hook killed by the host's stdin
// timeout cannot report its own death, so the NEXT hook start reconciles any
// residual sentinel into an evidence record (degradation kind='timeout'),
// which routes through the ADR-0022 D4 fail-closed coverage path.
// ADR-0024 D1: begin holds a mkdir lock on <sentinel>.lock for the hook's
// lifetime; reconcile try-locks residuals — lock obtained = owner is dead,
// lock refused (fresh) = a LIVE parallel session, keep the sentinel, append
// nothing. Stale (>STALE_MS) locks are reclaimed (dead owners leave a frozen
// lock dir behind; live owners refresh mtime on every set()).
// ADR-0024 D2b: before unlinking a residual we re-stat and compare
// (dev,ino) with the snapshot taken at lock time (SO 17708885 race class).
// ADR-0024 D2a: the reconcile record is produced INSIDE the evidence-log
// narrow lock via commit(make) — building it outside the lock from a
// previously-read tail is the lost-update race this ADR fixes.
// Explicitly NOT done (ADR-0023/0024): periodic heartbeats, signed sentinels,
// instant alerting, WAL/queue, watchdog daemon, global reconcile mutex,
// rename .processing, pid liveness probes.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { configDir } = require('./shared/paths');
const { tryLockSync, lockDir } = require('./file-lock');

const PREFIX = '.jiahao-sentinel.';
const PHASES = ['stdin', 'scan', 'verify', 'write']; // Phase Intent (ADR-0023 D3)

function sentinelPath(dir, hook) { return path.join(dir, PREFIX + hook); }

// ADR-0024 D2b: dev+ino identity check — rejects "unlink a same-named NEW
// inode planted by a parallel begin".
function sameFile(a, b) { return !!a && !!b && a.dev === b.dev && a.ino === b.ino; }

// Find residual sentinels, append one timeout record each, remove the file.
// Best-effort: reconciliation must never break the calling hook.
function reconcile(dir) {
  let files;
  try {
    files = fs.readdirSync(dir).filter(f => f.startsWith(PREFIX) && !f.endsWith('.lock'));
  } catch (e) { return []; }
  if (files.length === 0) return [];

  let evidenceLog = null;
  try {
    evidenceLog = require('./evidence-log').createEvidenceLog(dir);
  } catch (e) { /* no evidence sink — still clean up */ }

  const healed = [];
  for (const f of files) {
    const file = path.join(dir, f);
    // D1: try-lock arbitration. null = fresh lock held = live owner -> skip
    // silently (no record, no unlink). 'error' = fs refused -> degrade to
    // pre-ADR-0024 behavior with ownership:'unchecked'.
    const lockResult = tryLockSync(file);
    if (lockResult === null) continue;
    const release = lockResult === 'error' ? null : lockResult;
    const ownership = lockResult === 'error' ? 'unchecked' : 'locked';
    let st0 = null;
    try { st0 = fs.statSync(file); } catch (e) { /* vanished mid-reconcile */ }
    if (!st0) { if (release) release(); continue; }
    try {
      let s = {};
      try { s = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* corrupt sentinel */ }
      const hook = typeof s.hook === 'string' && s.hook ? s.hook : f.slice(PREFIX.length);
      const orphaned_at = new Date().toISOString();
      if (evidenceLog) {
        try {
          const detail = 'hook killed before sentinel.end: ' + hook + ' at phase ' + (s.phase || 'stdin');
          // D2a: produce the record inside the evidence-log narrow lock so
          // prev_hash is computed against the authoritative tail.
          evidenceLog.commit((chain, prevHash) => {
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
                    ownership: ownership, // ADR-0024 D1 degradation marker
                  },
                },
              },
            });
            rec._idem = crypto.createHash('sha256')
              .update('sentinel|' + hook + '|' + String(s.started_at || orphaned_at)).digest('hex');
            // _idem participates in the hash — recompute after stamping it.
            rec.event_hash = require('./evidence-log').recordHash(rec);
            return [rec];
          });
          healed.push(hook);
        } catch (e) { /* evidence sink failed — sentinel still removed below */ }
      }
      // D2b inode check: only unlink the same inode we locked/inspected.
      let st1 = null;
      try { st1 = fs.statSync(file); } catch (e) { /* already gone */ }
      if (sameFile(st0, st1)) {
        try { fs.unlinkSync(file); } catch (e) { /* gone */ }
      } // else: a parallel begin replaced it — leave the new live sentinel alone.
    } finally {
      if (release) release();
    }
  }
  return healed;
}

// begin(hookName) — one line at hook entry. Reconciles residuals, then plants
// this hook's sentinel and holds its ownership lock (ADR-0024 D1). Returns
// { set(phase), end() }. Normal exit removes both via a process exit hook, so
// killed processes leave them behind for the next reconcile.
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
    fs.fsyncSync(fd); // existence durability (ADR-0023 D2) — fsync once at creation
  } catch (e) { fd = null; }
  // ADR-0024 D1: hold the ownership lock for the hook's lifetime.
  // null = parallel live owner with the same hook name — keep going anyway
  // (unchecked); 'error' likewise. Never block the hook.
  const lockResult = tryLockSync(file);
  const release = (lockResult && lockResult !== 'error') ? lockResult : null;

  let ended = false;
  function end() {
    if (ended) return;
    ended = true;
    if (fd !== null) { try { fs.closeSync(fd); } catch (e) {} fd = null; }
    try { fs.unlinkSync(file); } catch (e) { /* gone */ }
    if (release) release(); // unlock LAST so a reconciler never heals a live hook
  }
  process.on('exit', end); // sync cleanup on any normal exit path

  return {
    // Phase transition: pwrite in place, no fsync per D2 durability budget.
    set(phase, turn) {
      if (turn && typeof turn === 'string') state.turn = turn;
      const t = new Date().toISOString();
      if (PHASES.indexOf(phase) >= 0) { state.phase = phase; state.phase_at = t; }
      // ADR-0024 D1: refresh the ownership lock mtime whenever we make
      // progress — a live lock stays young, a dead one freezes (stale reclaim).
      if (release) { try { fs.utimesSync(lockDir(file), t2(), t2()); } catch (e) { /* gone */ } }
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

function t2(){ return new Date(); }
module.exports = { begin, reconcile, PHASES, PREFIX, sameFile };
