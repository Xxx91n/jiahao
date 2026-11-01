// test/sentinel.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { begin, reconcile, PREFIX } = require('../src/sentinel');
const { tryLockSync } = require('../src/file-lock');
const { createRecord, KNOWN_DEGRADATION_KINDS } = require('../src/evidence-log');

const DIR = path.join(os.tmpdir(), 'jiahao-sentinel-test');

beforeEach(() => {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
});
afterAll(() => { fs.rmSync(DIR, { recursive: true, force: true }); });

// evidence is a segmented log directory — read via the factory.
function readEvidence() {
  try { return require('../src/evidence-log').createEvidenceLog(DIR).readAll(); }
  catch (e) { return null; }
}

test('D1/D2: orphaned sentinel is reconciled into a timeout record and removed', () => {
  const stale = { hook: 'jiahao-dead', turn: 't-7', started_at: '2026-08-28T00:00:00.000Z', phase: 'verify', phase_at: '2026-08-28T00:00:01.000Z' };
  fs.writeFileSync(path.join(DIR, PREFIX + 'jiahao-dead'), JSON.stringify(stale), 'utf8');

  const healed = reconcile(DIR);

  expect(healed).toEqual(['jiahao-dead']);
  expect(fs.existsSync(path.join(DIR, PREFIX + 'jiahao-dead'))).toBe(false);

  const chain = readEvidence();
  expect(Array.isArray(chain)).toBe(true);
  expect(chain).toHaveLength(1);
  const rec = chain[0];
  expect(rec.detector.coverage).toBe('partial');
  expect(rec.detector.degradation.kind).toBe('timeout');
  expect(rec.detector.degradation.detail.hook).toBe('jiahao-dead');
  expect(rec.detector.degradation.detail.phase).toBe('verify');
  expect(rec.detector.degradation.detail.turn).toBe('t-7');
  expect(typeof rec.detector.degradation.detail.orphaned_at).toBe('string');

  // Idempotent: reconciling again (file gone) appends nothing new.
  reconcile(DIR);
  expect(readEvidence()).toHaveLength(1);
});

test('D1: begin() plants a sentinel and end() removes it', () => {
  const s = begin('jiahao-demo', DIR);
  const file = path.join(DIR, PREFIX + 'jiahao-demo');
  expect(fs.existsSync(file)).toBe(true);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).phase).toBe('stdin');
  s.set('scan', 'turn-1');
  const live = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(live.phase).toBe('scan');
  expect(live.turn).toBe('turn-1');
  s.end();
  expect(fs.existsSync(file)).toBe(false);
});

test('D1: begin() reconciles residuals before planting its own sentinel', () => {
  fs.writeFileSync(path.join(DIR, PREFIX + 'old-hook'), JSON.stringify({ hook: 'old-hook', phase: 'scan' }), 'utf8');
  const s = begin('new-hook', DIR);
  expect(healedEvidenceKinds()).toEqual(['timeout']);
  expect(fs.existsSync(path.join(DIR, PREFIX + 'old-hook'))).toBe(false);
  expect(fs.existsSync(path.join(DIR, PREFIX + 'new-hook'))).toBe(true);
  s.end();
});
function healedEvidenceKinds() {
  return (readEvidence() || []).map(r => r.detector && r.detector.degradation && r.detector.degradation.kind);
}

test('#122: reconcile skips a begun-not-ended sentinel (no heal, file kept)', () => {
  const s = begin('jiahao-live', DIR);
  const file = path.join(DIR, PREFIX + 'jiahao-live');
  expect(reconcile(DIR)).toEqual([]);
  expect(fs.existsSync(file)).toBe(true);
  expect(readEvidence()).toBeNull();
  s.end();
  expect(fs.existsSync(file)).toBe(false);
});

// #122: the ownership lock must cover the sentinel's creation window. The
// injection fires at the creation fsync — the sentinel content is on disk and
// a parallel reconcile scans right here. Under the old file-first order it
// would win the lock, heal, and unlink a live sentinel; under lock-first the
// lock already exists and the reconciler skips.
test('#122: sentinel never visible unlocked — a reconcile racing at creation heals nothing', () => {
  const file = path.join(DIR, PREFIX + 'jiahao-race');
  const realFsync = fs.fsyncSync;
  const seen = { lockAtCreation: null, healed: null };
  const spy = jest.spyOn(fs, 'fsyncSync').mockImplementation(function (fd) {
    spy.mockRestore(); // one-shot; the injected reconcile below uses real fsyncs
    seen.lockAtCreation = fs.existsSync(file + '.lock');
    seen.healed = reconcile(DIR);
    return realFsync(fd);
  });
  let s;
  try { s = begin('jiahao-race', DIR); } finally { spy.mockRestore(); } // no leak into later tests if begin throws before fsync
  expect(seen.lockAtCreation).toBe(true);
  expect(seen.healed).toEqual([]);
  expect(fs.existsSync(file)).toBe(true);
  expect(readEvidence()).toBeNull();
  s.end();
  expect(fs.existsSync(file)).toBe(false);
});

// #122: lock lost to a parallel live owner — the existing unchecked-continue
// semantics: the sentinel is still planted and the hook is never blocked.
test('#122: lock held by a parallel owner — begin plants the sentinel unchecked', () => {
  const file = path.join(DIR, PREFIX + 'jiahao-contended');
  fs.mkdirSync(file + '.lock'); // a fresh lock: a parallel live owner of this hook
  const s = begin('jiahao-contended', DIR);
  expect(fs.existsSync(file)).toBe(true);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).phase).toBe('stdin');
  s.set('scan', 'turn-r');
  const live = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(live.phase).toBe('scan');
  expect(live.turn).toBe('turn-r');
  s.end();
  expect(fs.existsSync(file)).toBe(false);
  fs.rmdirSync(file + '.lock'); // the "parallel owner" cleans up its own lock
});

// Review finding on #125: a plant that throws after the lock was taken must
// give back everything it took — remove the half-created file, close the fd,
// release the lock — and end() must never unlink a sentinel that is not ours.
test('#125: failed plant releases the lock and end() spares a parallel sentinel', () => {
  const file = path.join(DIR, PREFIX + 'jiahao-fail');
  const realWriteSync = fs.writeSync;
  const spy = jest.spyOn(fs, 'writeSync').mockImplementation(function (fdArg, str) {
    if (typeof str === 'string' && str.indexOf('"jiahao-fail"') !== -1) throw new Error('injected plant failure');
    return realWriteSync.apply(fs, arguments);
  });
  const s = begin('jiahao-fail', DIR);
  spy.mockRestore();
  // nothing of ours stays behind: the half-created sentinel is cleaned up
  expect(fs.existsSync(file)).toBe(false);
  // the ownership lock was given back: a fresh try-lock wins
  const relock = tryLockSync(file);
  expect(typeof relock).toBe('function');
  relock();
  // a parallel begin now plants a live sentinel at the same path
  fs.writeFileSync(file, JSON.stringify({ hook: 'jiahao-fail', phase: 'scan' }), 'utf8');
  s.end(); // planted nothing -> must not unlink it, must not touch any lock
  expect(fs.existsSync(file)).toBe(true);
  fs.unlinkSync(file);
});

test('D4: unknown degradation kind is preserved in detail.unrecognized_kind', () => {
  const rec = createRecord('g1', 'test', 'ok', 'payload', 0.5, null, {
    detector: {
      suspicious: false, matched_phrases: [], severity: null,
      coverage: 'partial',
      degradation: { kind: 'power-loss', detail: { reason: 'demo' } },
    },
  });
  expect(rec.detector.degradation.kind).toBeNull();
  expect(rec.detector.degradation.detail.reason).toBe('demo');
  expect(rec.detector.degradation.detail.unrecognized_kind).toBe('power-loss');
  expect(rec.detector.coverage).toBe('partial');
  // Schema must accept the D4 fallback shape (audit fix: D4 vs D5 contradiction,
  // surfaced by the audit's atomcode industry review).
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schemas', 'degradation.schema.json'), 'utf8'));
  const unknown = schema.oneOf.find(v => v.properties.kind.const === null);
  expect(unknown).toBeDefined();
  expect(unknown.properties.detail.required).toContain('unrecognized_kind');
});

test('D5: schema enumerates the registered kinds plus the null fallback (evolution discipline)', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schemas', 'degradation.schema.json'), 'utf8'));
  const branchKinds = schema.oneOf.map(v => v.properties.kind.const);
  const schemaKinds = branchKinds.filter(k => k !== null).sort();
  const registered = KNOWN_DEGRADATION_KINDS.slice().sort();
  // The null branch is the D4 unknown-kind fail-closed fallback (required).
  expect(branchKinds).toContain(null);
  expect(schemaKinds).toEqual(registered);
  expect(schema.properties.kind.enum.filter(k => k !== null).sort()).toEqual(registered);
  expect(schema.properties.kind.enum).toContain(null);
});

test('D5: fixture validations per registered kind (structural, zero-dep)', () => {
  const fixtures = require('./fixtures/degradation.fixtures.json');
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schemas', 'degradation.schema.json'), 'utf8'));
  for (const f of fixtures) {
    const variant = schema.oneOf.find(v => v.properties.kind.const === f.expected.kind);
    expect(variant).toBeDefined();
    for (const req of (variant.properties.detail.required || [])) {
      expect(f.expected.detail).toHaveProperty(req);
    }
  }
});
