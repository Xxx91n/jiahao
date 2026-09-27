// src/file-lock.js — ADR-0024 D1/D2: cross-platform sync file lock.
// proper-lockfile (the wheel evaluated in the ADR) is async-only; jiahao hooks
// are a strict-sync contract (host stdin timeouts). We keep the SAME atomic
// primitive proper-lockfile itself uses — mkdir(2) — behind a sync facade,
// plus its stale-mtime policy. No new dependency.
// ponytail: no mtime refresh timer — hosts kill hooks at 5-10s, and STALE_MS
// sits far above that, so a live owner never looks stale and a dead one is
// always reclaimable.
const fs = require('fs');

const STALE_MS = 20000; // host hook timeouts are 5-10s; 20s is unreachable alive
function lockDir(target) { return target + '.lock'; }

function spinSleep(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (e) { /* old node — just burn */ }
}

function makeRelease(ld) {
  let held = true;
  return function release() {
    if (!held) return;
    held = false;
    try { fs.rmdirSync(ld); } catch (e) { /* already gone / taken over */ }
  };
}

// tryLockSync(target) -> release() | null | 'error'
//   release()  : caller is the owner.
//   null       : a FRESH lock is held — a live owner (or a very recent death).
//   'error'    : filesystem refused (not merely held) — callers degrade to
//                ownership:'unchecked' per ADR-0024 D1, never blocking.
function tryLockSync(target) {
  const ld = lockDir(target);
  for (let attempt = 0; attempt < 2; attempt++) {
    try { fs.mkdirSync(ld); return makeRelease(ld); }
    catch (e) {
      if (e.code !== 'EEXIST') return 'error';
      let st = null;
      try { st = fs.statSync(ld); } catch (e2) { continue; } // vanished — retry
      if (attempt === 0 && Date.now() - st.mtimeMs > STALE_MS) {
        try { fs.rmdirSync(ld); } catch (e3) { return null; }
        continue; // stale takeover: dead owner, reclaim
      }
      return null; // held and fresh — live owner
    }
  }
  return null;
}

// withLockSync(target, fn, opts) — blocking narrow critical section
// (ADR-0024 D2a append lock). opts: { retries: 40, retrySleepMs: 10 }.
// Throws if the lock cannot be acquired within the retry budget.
function withLockSync(target, fn, opts) {
  const o = opts || {};
  const retries = o.retries == null ? 40 : o.retries;
  const sleep = o.retrySleepMs == null ? 10 : o.retrySleepMs;
  const ld = lockDir(target);
  let acquired = false;
  for (let i = 0; i <= retries && !acquired; i++) {
    try { fs.mkdirSync(ld); acquired = true; }
    catch (e) {
      if (e.code === 'EEXIST') {
        let st = null;
        try { st = fs.statSync(ld); } catch (e2) { continue; }
        if (Date.now() - st.mtimeMs > STALE_MS) {
          try { fs.rmdirSync(ld); } catch (e3) { /* someone else took it */ }
          continue;
        }
        if (i === retries) throw e;
        spinSleep(sleep);
        continue;
      }
      throw e;
    }
  }
  try { return fn(); } finally { try { fs.rmdirSync(ld); } catch (e) { /* taken over */ } }
}

module.exports = { tryLockSync, withLockSync, lockDir, STALE_MS };
