// test/evidence-log.test.js — EvidenceLog cases (ADR-0016 D3, moved from gate.test.js).
// Chain integrity, hashing, canonical JSON, persistence, idempotency sidecar.

const fs = require('fs');
const path = require('path');

const TMP = require('os').tmpdir().replace(/\\/g, '/') + '/jiahao-evidence-log-test';
fs.mkdirSync(TMP, { recursive: true });

const {
  createEvidenceLog, canonicalJSON, recordHash, verifyChain,
  idempotencyKey, ESCALATION_BAND,
} = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));

// createRecord is pure (no fs); a default-path factory instance builds records.
const createEvidence = createEvidenceLog().createRecord;

// Legacy replace-mode helpers (ADR-0012 D4) expressed via the factory:
// writeEvidence = clear + append; clearEvidence = clear.
function writeEvidence(chain, dir) { const log = createEvidenceLog(dir); log.clear(); log.append(chain); }
function clearEvidence(dir) { createEvidenceLog(dir).clear(); }

test('ESCALATION_BAND is 0.4-0.7', () => {
  expect(ESCALATION_BAND.low).toBe(0.4);
  expect(ESCALATION_BAND.high).toBe(0.7);
});


test('createEvidence produces hash-chained record', () => {
  const e = createEvidence('test-0', 'deterministic', 'passed', 'tests passed', 0.95);
  expect(e.gate_id).toBe('test-0');
  expect(e.evidence_ref).toHaveLength(16);
  expect(e.status).toBe('passed');
  expect(e.confidence).toBe(0.95);
});


test('writeEvidence writes to file', () => {
  const TMP = require('os').tmpdir().replace(/\\/g, '/');
  const chain = [createEvidence('t', 'deterministic', 'passed', 'ok', 0.9)];
  writeEvidence(chain, TMP);
  const read = fs.readFileSync(TMP + '/.jiahao-evidence', 'utf8');
  expect(JSON.parse(read)).toHaveLength(1);
  clearEvidence(TMP);
});


test('clearEvidence removes file', () => {
  const TMP = require('os').tmpdir().replace(/\\/g, '/');
  writeEvidence([createEvidence('t', 'det', 'passed', 'ok', 0.9)], TMP);
  expect(fs.existsSync(TMP + '/.jiahao-evidence')).toBe(true);
  clearEvidence(TMP);
  expect(fs.existsSync(TMP + '/.jiahao-evidence')).toBe(false);
});


test('createEvidence includes prev_hash and event_hash', () => {
  const e = createEvidence('det-0', 'deterministic', 'passed', 'tests passed', 0.95, null);
  expect(e.prev_hash).toBeNull();
  expect(e.event_hash).toHaveLength(64);
});


test('second evidence links to first via prev_hash', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  expect(e2.prev_hash).toBe(e1.event_hash);
  expect(e2.event_hash).not.toBe(e1.event_hash);
});


test('verifyChain validates a correct chain', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  const result = verifyChain([e1, e2]);
  expect(result.valid).toBe(true);
});


test('verifyChain detects broken prev_hash link', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, 'wronghash');
  const result = verifyChain([e1, e2]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(1);
});


test('verifyChain detects tampered record (event_hash mismatch)', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const tampered = { ...e1, detail: 'HACKED' };
  // prev_hash still null, but event_hash no longer matches
  const result = verifyChain([tampered]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(0);
});


test('verifyChain detects deletion (missing middle record)', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  const e3 = createEvidence('det-2', 'deterministic', 'passed', 'third', 0.9, e2.event_hash);
  // Skip e2 — e3.prev_hash won't match e1.event_hash
  const result = verifyChain([e1, e3]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(1);
});


test('verifyChain detects reordering', () => {
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null);
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash);
  // Swap order
  const result = verifyChain([e2, e1]);
  expect(result.valid).toBe(false);
  expect(result.broken_at).toBe(0);
});


test('verifyChain rejects empty array', () => {
  const result = verifyChain([]);
  expect(result.valid).toBe(false);
});


test('canonicalJSON sorts keys deterministically', () => {
  const a = canonicalJSON({ b: 1, a: 2, c: { z: 1, y: 2 } });
  const b = canonicalJSON({ a: 2, b: 1, c: { y: 2, z: 1 } });
  expect(a).toBe(b);
});



// ADR-0013 D3: appendEvidence dedups on _idem (same Stop re-fire → no-op).
test('ADR-0013 D3: appendEvidence idempotent skip on duplicate _idem', () => {
  const { createEvidenceLog: mkLog } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
  const file = TMP + '/.jiahao-evidence';
  try { fs.unlinkSync(file); } catch (e) {}
  try { fs.unlinkSync(TMP + '/.jiahao-evidence.keys'); } catch (e) {}
  const rec = (i) => ({ gate_id: 'det-' + i, status: 'passed', prev_hash: null, _idem: 'k' + i });
  mkLog(TMP).append([rec(0)]);
  mkLog(TMP).append([rec(0), rec(1)]); // k0 replayed, k1 new
  const chain = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(chain).toHaveLength(2);
  expect(chain.map(r => r.gate_id)).toEqual(['det-0', 'det-1']);
});

test('ADR-0013 D3: appendEvidence rejects records whose prev_hash does not match the chain tail', () => {
  const { createEvidenceLog: mkLog } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
  const file = TMP + '/.jiahao-evidence';
  try { fs.unlinkSync(file); } catch (e) {}
  try { fs.unlinkSync(TMP + '/.jiahao-evidence.keys'); } catch (e) {}
  const tail = { gate_id: 'det-0', status: 'passed', prev_hash: null, event_hash: 'a'.repeat(64), _idem: 'k0' };
  mkLog(TMP).append([tail]);
  // Record claims a different prev_hash than the current tail — must be skipped.
  const bad = { gate_id: 'det-1', status: 'passed', prev_hash: 'b'.repeat(64), _idem: 'k1' };
  mkLog(TMP).append([bad]);
  const chain = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(chain).toHaveLength(1);
  expect(chain[0].gate_id).toBe('det-0');
});

