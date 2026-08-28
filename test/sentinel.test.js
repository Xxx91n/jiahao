// test/sentinel.test.js — ADR-0023 D1-D6
const fs = require('fs');
const path = require('path');
const os = require('os');
const { begin, reconcile, PREFIX } = require('../src/sentinel');
const { createRecord, KNOWN_DEGRADATION_KINDS } = require('../src/evidence-log');

const DIR = path.join(os.tmpdir(), 'jiahao-sentinel-test');

beforeEach(() => {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
});
afterAll(() => { fs.rmSync(DIR, { recursive: true, force: true }); });

function readEvidence() {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, '.jiahao-evidence'), 'utf8')); }
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
  // surfaced by the ADR-0023 audit's atomcode industry review).
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
