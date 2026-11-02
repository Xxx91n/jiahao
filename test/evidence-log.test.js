// test/evidence-log.test.js — EvidenceLog cases (moved from gate.test.js).
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

// Legacy replace-mode helpers expressed via the factory:
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


test('writeEvidence writes to the genesis segment', () => {
  const TMP = require('os').tmpdir().replace(/\\/g, '/');
  const chain = [createEvidence('t', 'deterministic', 'passed', 'ok', 0.9)];
  writeEvidence(chain, TMP);
  // .jiahao-evidence is a directory of JSONL segments;
  // reads go through the factory, not the raw path.
  expect(fs.existsSync(TMP + '/.jiahao-evidence/00000000000000000000.jsonl')).toBe(true);
  const log = createEvidenceLog(TMP);
  const read = log.readAll();
  expect(read).toHaveLength(1);
  expect(read[0].gate_id).toBe('t');
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



// appendEvidence dedups on _idem (same Stop re-fire → no-op).
test('appendEvidence idempotent skip on duplicate _idem', () => {
  const { createEvidenceLog: mkLog } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
  mkLog(TMP).clear(); // evidence path may be a segment directory
  const rec = (i) => ({ gate_id: 'det-' + i, status: 'passed', prev_hash: null, _idem: 'k' + i });
  mkLog(TMP).append([rec(0)]);
  mkLog(TMP).append([rec(0), rec(1)]); // k0 replayed, k1 new
  const chain = mkLog(TMP).readAll();
  expect(chain).toHaveLength(2);
  expect(chain.map(r => r.gate_id)).toEqual(['det-0', 'det-1']);
});

test('appendEvidence rejects records whose prev_hash does not match the chain tail', () => {
  const { createEvidenceLog: mkLog } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));
  mkLog(TMP).clear(); // evidence path may be a segment directory
  const tail = { gate_id: 'det-0', status: 'passed', prev_hash: null, event_hash: 'a'.repeat(64), _idem: 'k0' };
  mkLog(TMP).append([tail]);
  // Record claims a different prev_hash than the current tail — must be skipped.
  const bad = { gate_id: 'det-1', status: 'passed', prev_hash: 'b'.repeat(64), _idem: 'k1' };
  mkLog(TMP).append([bad]);
  const chain = mkLog(TMP).readAll();
  expect(chain).toHaveLength(1);
  expect(chain[0].gate_id).toBe('det-0');
});



test('human_verdict record appends and chain stays valid', () => {
  const dir = TMP + '/hv-' + Date.now();
  fs.mkdirSync(dir, { recursive: true });
  const log = createEvidenceLog(dir);
  const det = createEvidence('det-0', 'deterministic', 'passed', 'tests ok', 0.9);
  log.append([det]);

  const hv = {
    kind: 'human_verdict',
    reviewer_id: 'alice',
    verdict: 'fail',
    reason: 'critic timed out; diff shows missing migration',
    corrected_output: null,
    second_reviewer: null,
    overturn: true,
    timestamp: new Date().toISOString(),
    prev_hash: det.event_hash,
  };
  hv.event_hash = recordHash(hv);
  log.append([hv]);

  const chain = log.readAll();
  expect(chain).toHaveLength(2);
  expect(chain[1].kind).toBe('human_verdict');
  expect(chain[1].reviewer_id).toBe('alice');
  expect(verifyChain(chain).valid).toBe(true);
});

// #119 finding 4: 'null' is legal JSON, so both anchor readers dereferenced
// the parsed value before judging its shape; the TypeError fell into the
// outer catch and classified a present-but-wrong witness as
// witness_unavailable — the degradable class (read errors and
// missing-on-sealed witnesses land there too, not just torn files) —
// instead of unreadable (corruption). Shape must be judged
// before any dereference.
test('finding 4: a null witness file reads as unreadable, not witness_unavailable', () => {
  const dir = path.join(TMP, 'null-anchor-' + process.pid + '-' + Date.now());
  fs.mkdirSync(dir, { recursive: true });
  const log = createEvidenceLog(dir);
  fs.writeFileSync(log.headAnchorPath(), 'null', 'utf8');
  expect(log.readTailAnchor(log.headAnchorPath()).status).toBe('unreadable');
  fs.writeFileSync(log.genesisAnchorPath(), 'null', 'utf8');
  expect(log.readGenesisAnchor(log.genesisAnchorPath()).status).toBe('unreadable');
});

// #71 (PR #97 review): lock failure and a throw from the commit body are
// different events. The body used to be retried WITHOUT the lock after any
// throw, so a make() that had already appended could append twice.
test('#71: a make() throw inside the lock is not retried unlocked', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jiahao-evidence-commit-'));
  const log = createEvidenceLog(dir);
  let calls = 0;
  log.commit(function () {
    calls += 1;
    throw new Error('make failed');
  });
  expect(calls).toBe(1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('#71: commit returns the count written; a deduped append returns 0', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jiahao-evidence-count-'));
  const log = createEvidenceLog(dir);
  const mk = function () {
    const r = log.createRecord('gate-71', 'deterministic', 'passed', 'ok', null, null, {});
    r._idem = 'idem-71';
    r.event_hash = recordHash(r);
    return r;
  };
  expect(log.commit(function () { return [mk()]; })).toBe(1);
  expect(log.commit(function () { return [mk()]; })).toBe(0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('#71: a mid-write throw reports the records that landed before it', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jiahao-evidence-partial-'));
  const log = createEvidenceLog(dir);
  const good = log.createRecord('gate-71c', 'deterministic', 'passed', 'ok', null, null, {});
  const circular = { prev_hash: good.event_hash };
  circular.self = circular; // JSON.stringify throws after `good` is on disk
  const written = log.commit(function () { return [good, circular]; });
  expect(written).toBe(1);
  fs.rmSync(dir, { recursive: true, force: true });
});

// #71 (CodeRabbit on PR #133): a batch that throws after one record landed must
// leave the seal sidecar and tail anchor describing what is actually on disk.
// Otherwise the next verifyTail sees an anchor that is behind the chain and
// calls it corrupt.
test('#71: a mid-write throw repairs the tail anchor and dedup sidecar', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jiahao-evidence-repair-'));
  const log = createEvidenceLog(dir);
  const a = log.createRecord('gate-71d', 'deterministic', 'passed', 'first', null, null, {});
  expect(log.commit(function () { return [a]; })).toBe(1);

  const b = log.createRecord('gate-71e', 'deterministic', 'passed', 'second', null, a.event_hash, {});
  b._idem = 'idem-partial';
  b.event_hash = recordHash(b);
  const circular = { prev_hash: b.event_hash };
  circular.self = circular; // JSON.stringify throws after `b` is on disk
  expect(log.commit(function () { return [b, circular]; })).toBe(1);

  expect(log.verifyTail().valid).toBe(true);
  const keys = fs.readFileSync(path.join(dir, '.jiahao-evidence.keys'), 'utf8');
  expect(keys).toContain('idem-partial');
  fs.rmSync(dir, { recursive: true, force: true });
});

// #71 (CodeRabbit on PR #133, round 2): the metadata repair must cover the
// whole per-record batch. A rotation splice re-hashes the pending record; a
// throw there happens after earlier records landed and outside the append call.
test('#71: a rotation-time throw also repairs metadata before rethrowing', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jiahao-evidence-rotate-repair-'));
  const log = createEvidenceLog(dir, { rotateBytes: 1 }); // rotate before every follow-up write
  const a = log.createRecord('gate-71f', 'deterministic', 'passed', 'first', null, null, {});
  expect(log.commit(function () { return [a]; })).toBe(1);

  const b = log.createRecord('gate-71g', 'deterministic', 'passed', 'second', null, a.event_hash, {});
  b._idem = 'idem-rotation';
  b.event_hash = recordHash(b);
  const circular = { prev_hash: b.event_hash, event_hash: 'deadbeef' };
  circular.self = circular; // rotation calls recordHash(circular) -> throws

  expect(log.commit(function () { return [b, circular]; })).toBeGreaterThan(0);
  const keys = fs.readFileSync(path.join(dir, '.jiahao-evidence.keys'), 'utf8');
  expect(keys).toContain('idem-rotation');
  expect(log.verifyTail().valid).toBe(true);
  fs.rmSync(dir, { recursive: true, force: true });
});
