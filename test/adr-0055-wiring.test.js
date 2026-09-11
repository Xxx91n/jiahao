'use strict';

// test/adr-0055-wiring.test.js -- ADR-0055 implementation-round wiring lock.
// Locks the plan anchor contract, speculative merge checker, bounded seal
// verification, and bounded ordinary append reads.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  createWorkBaselineAnchor,
  workBaselineAnchorProblems,
  isPlanStale,
} = require('../src/plan-contract');
const { createEvidenceLog } = require('../src/evidence-log');

const ROOT = path.join(__dirname, '..');
const FORWARD_SEAL_KIND = 'forward_seal';

function mktmp(tag) {
  const dir = path.join(os.tmpdir(), 'jiahao-adr0055-' + tag + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeLog(dir, opts) {
  return createEvidenceLog(dir, Object.assign({ rotateBytes: 128 }, opts || {}));
}

function appendRecords(log, count) {
  let prev = null;
  const records = [];
  for (let i = 0; i < count; i++) {
    const rec = log.createRecord('g' + i, 'deterministic', 'passed', 'payload-' + i, 0.9, prev);
    log.append([rec]);
    prev = rec.event_hash;
    records.push(rec);
  }
  return records;
}

function appendAfter(log, count, prev) {
  let tail = prev;
  for (let i = 0; i < count; i++) {
    const rec = log.createRecord('post' + i, 'deterministic', 'passed', 'payload-' + i, 0.9, tail);
    log.append([rec]);
    tail = rec.event_hash;
  }
  return tail;
}

function segmentPaths(dir) {
  const segDir = path.join(dir, '.jiahao-evidence');
  return fs.readdirSync(segDir).filter((name) => name.endsWith('.jsonl'))
    .sort().map((name) => path.join(segDir, name));
}

describe('ADR-0055 D-A plan anchor contract', () => {
  test('valid anchor normalizes and invalid fields are reported', () => {
    const anchor = createWorkBaselineAnchor({
      base_commit: '0123456789abcdef0123456789abcdef01234567',
      latest_upstream_commit: 'abcdef0123456789abcdef0123456789abcdef01',
      checked_at: '2026-09-09T00:00:00.000Z',
    });
    expect(anchor).toMatchObject({ schema_version: 1 });
    expect(isPlanStale(anchor, anchor.latest_upstream_commit)).toBe(false);
    expect(workBaselineAnchorProblems({ schema_version: 1, base_commit: '', latest_upstream_commit: '', checked_at: '' })).toEqual([
      'base_commit must be a 7-64 character hex commit',
      'latest_upstream_commit must be a 7-64 character hex commit',
      'checked_at must be a parseable timestamp',
    ]);
  });

  test('tail anchor writer only persists declared witness fields', () => {
    const dir = mktmp('anchor-fields');
    const log = makeLog(dir);
    log.writeTailAnchor(log.headAnchorPath(), 0, 1, 'a'.repeat(64), undefined, '2026-09-09T00:00:00.000Z', {
      witness_breakpoint_index: 0,
      witness_breakpoint_detected_at: null,
      witness_post_detection_evidence_appends: 0,
      unexpected: 'must not persist',
    });
    const anchor = JSON.parse(fs.readFileSync(log.headAnchorPath(), 'utf8'));
    expect(anchor.unexpected).toBeUndefined();
    expect(anchor.witness_breakpoint_index).toBe(0);
    log.clear();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('ADR-0055 D-C speculative merge checker', () => {
  test('current upstream produces clean merge evidence; stale upstream exits 1', () => {
    const dir = mktmp('plan-cli');
    // Deterministic stale instance: HEAD~1 always differs from the plan's origin/main tip,
    // whereas HEAD equals origin/main right after a merge (post-push host state made this flaky).
    const staleRef = spawnSync('git', ['rev-parse', 'HEAD~1'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    const latest = spawnSync('git', ['rev-parse', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    const planPath = path.join(dir, 'plan.json');
    fs.writeFileSync(planPath, JSON.stringify({
      base_commit: latest,
      latest_upstream_commit: latest,
      checked_at: new Date().toISOString(),
    }), 'utf8');

    const clean = spawnSync(process.execPath, [path.join(ROOT, 'scripts/check-plan-baseline.js'), planPath, latest], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(clean.status).toBe(0);
    expect(JSON.parse(clean.stdout)).toMatchObject({ stale: false, mergeable: true });

    const stale = spawnSync(process.execPath, [path.join(ROOT, 'scripts/check-plan-baseline.js'), planPath, staleRef], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(stale.status).toBe(1);
    expect(JSON.parse(stale.stdout)).toMatchObject({ stale: true });

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('ADR-0055 D-E bounded seal verification', () => {
  test('verifyTail reads a bounded window while verifyFull reads the cold chain', () => {
    const dir = mktmp('segments');
    const log = makeLog(dir);
    appendRecords(log, 24);
    const segs = segmentPaths(dir);
    expect(segs.length).toBeGreaterThanOrEqual(3);

    expect(log.sealForwardIfNeeded().status).toBe('first_seal');
    expect(fs.existsSync(path.join(dir, 'evidence-seal.json'))).toBe(true);
    fs.unlinkSync(log.headAnchorPath());

    const readFileSync = fs.readFileSync;
    const tailReads = [];
    const fullReads = [];
    const spyTail = jest.spyOn(fs, 'readFileSync').mockImplementation(function (p, ...args) {
      if (typeof p === 'string' && p.endsWith('.jsonl')) tailReads.push(p);
      return readFileSync(p, ...args);
    });
    const tail = log.verifyTail();
    spyTail.mockRestore();

    const spyFull = jest.spyOn(fs, 'readFileSync').mockImplementation(function (p, ...args) {
      if (typeof p === 'string' && p.endsWith('.jsonl')) fullReads.push(p);
      return readFileSync(p, ...args);
    });
    const full = log.verifyFull();
    spyFull.mockRestore();

    expect(tail.valid).toBe(true);
    expect(tail.fallback).toBe('last_good_seal');
    expect(full.valid).toBe(true);
    expect(new Set(tailReads).size).toBeLessThan(segs.length);
    expect(new Set(fullReads).size).toBeGreaterThanOrEqual(segs.length);
    log.clear();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('ordinary append does not materialize the historical chain', () => {
    const dir = mktmp('append-bounded');
    const log = makeLog(dir);
    appendRecords(log, 24);
    const segs = segmentPaths(dir);
    expect(segs.length).toBeGreaterThanOrEqual(3);

    const readFileSync = fs.readFileSync;
    const reads = [];
    const activePath = segs[segs.length - 1];
    const activeLines = readFileSync(activePath, 'utf8').split('\n').filter(Boolean);
    const validTail = JSON.parse(activeLines[activeLines.length - 1]);
    const newRec = log.createRecord('bounded', 'deterministic', 'passed', 'bounded', 0.9, validTail.event_hash);

    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(function (p, ...args) {
      if (typeof p === 'string' && p.endsWith('.jsonl')) reads.push(p);
      return readFileSync(p, ...args);
    });
    log.append([newRec]);
    spy.mockRestore();
    expect(new Set(reads).size).toBeLessThan(segs.length);
    log.clear();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('seal sidecar is validated against the segment containing an old seal', () => {
    const dir = mktmp('old-seal');
    const log = makeLog(dir);
    appendRecords(log, 18);
    const sealed = log.sealForwardIfNeeded();
    expect(sealed.status).toBe('first_seal');
    appendAfter(log, 60, sealed.sealed_head_hash);
    const sidecarPath = path.join(dir, 'evidence-seal.json');
    const good = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    const activePath = segmentPaths(dir).slice(-1)[0];
    const activeStart = JSON.parse(fs.readFileSync(activePath, 'utf8').trim().split('\n')[0]).seq_start;
    expect(good.seal_index).toBeLessThan(activeStart);
    fs.unlinkSync(log.headAnchorPath());
    expect(log.verifyTail()).toMatchObject({ valid: true, fallback: 'last_good_seal' });

    const tampered = Object.assign({}, good, { sealed_head_hash: '0'.repeat(64) });
    fs.writeFileSync(sidecarPath, JSON.stringify(tampered), 'utf8');
    expect(log.verifyTail().valid).toBe(false);
    log.clear();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('seal sidecar ahead of the chain is rejected', () => {
    const dir = mktmp('ahead-seal');
    const log = makeLog(dir);
    appendRecords(log, 18);
    expect(log.sealForwardIfNeeded().status).toBe('first_seal');
    const sidecarPath = path.join(dir, 'evidence-seal.json');
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    sidecar.seal_index += 5;
    sidecar.sealed_seq = sidecar.seal_index - 1;
    sidecar.sealed_total_count = sidecar.seal_index;
    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar), 'utf8');
    fs.unlinkSync(log.headAnchorPath());
    expect(log.verifyTail().valid).toBe(false);
    log.clear();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
