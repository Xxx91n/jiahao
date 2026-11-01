// test/file-lock.test.js — issue #121 acceptance
// Race paths in withLockSync must throw (not run fn() unlocked) and must not
// rmdir a lock that belongs to someone else. evidence-log commit() owns the
// degrade path, so throwing is the correct contract.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { withLockSync, STALE_MS } = require('../src/file-lock');

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-file-lock-test-'));
afterAll(() => {
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
});

test('normal path: fn runs under lock, lock released, return value kept', () => {
  const target = path.join(DIR, 'normal.jsonl');
  const ld = target + '.lock';
  let sawLock = false;
  const out = withLockSync(target, () => {
    sawLock = fs.existsSync(ld);
    return 42;
  });
  expect(out).toBe(42);
  expect(sawLock).toBe(true);
  expect(fs.existsSync(ld)).toBe(false);
});

test('fresh lock held by competitor within retry budget: throws EEXIST, fn not run', () => {
  const target = path.join(DIR, 'fresh.jsonl');
  const ld = target + '.lock';
  fs.mkdirSync(ld); // fresh mtime — a live owner
  let ran = false;
  expect(() => withLockSync(target, () => { ran = true; }, { retries: 1, retrySleepMs: 1 }))
    .toThrow(/EEXIST/);
  expect(ran).toBe(false);
  expect(fs.existsSync(ld)).toBe(true); // competitor's lock untouched
  fs.rmdirSync(ld);
});

test('race path 1: lock dir vanishes between mkdir and stat on every attempt — throws, fn not run, foreign lock kept', () => {
  const target = path.join(DIR, 'vanish.jsonl');
  const ld = target + '.lock';
  fs.mkdirSync(ld); // stands for the competitor's lock dir
  const orig = fs.statSync;
  const spy = jest.spyOn(fs, 'statSync').mockImplementation((p, opts) => {
    if (String(p) === ld) { const e = new Error('enoent'); e.code = 'ENOENT'; throw e; }
    return orig.call(fs, p, opts);
  });
  let ran = false;
  try {
    expect(() => withLockSync(target, () => { ran = true; }, { retries: 2, retrySleepMs: 1 }))
      .toThrow(/file lock not acquired/);
  } finally { spy.mockRestore(); }
  expect(ran).toBe(false);
  expect(fs.existsSync(ld)).toBe(true); // must not rmdir the lock we never held
  fs.rmdirSync(ld);
});

test('race path 2: stale takeover lost to a faster competitor — throws, fn not run, competitor lock survives', () => {
  const target = path.join(DIR, 'stale-race.jsonl');
  const ld = target + '.lock';
  fs.mkdirSync(ld);
  const old = new Date(Date.now() - STALE_MS * 2);
  fs.utimesSync(ld, old, old); // looks stale — dead owner
  const orig = fs.rmdirSync;
  // Our rmdir of the stale lock succeeds, but a competitor re-creates and
  // holds the lock immediately after — the exact "someone else took it" race.
  const spy = jest.spyOn(fs, 'rmdirSync').mockImplementation((p, opts) => {
    const r = orig.call(fs, p, opts);
    if (String(p) === ld) fs.mkdirSync(ld); // competitor takes over
    return r;
  });
  let ran = false;
  try {
    expect(() => withLockSync(target, () => { ran = true; }, { retries: 0 }))
      .toThrow(/file lock not acquired/);
  } finally { spy.mockRestore(); }
  expect(ran).toBe(false);
  expect(fs.existsSync(ld)).toBe(true); // competitor's lock must survive
  fs.rmdirSync(ld);
});
