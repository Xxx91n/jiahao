'use strict';

// test/adr-0053-wiring.test.js -- ADR-0053 implementation-round wiring lock.
// Locks re-anchor triggering (commit-count and elapsed/TTL, injected clock),
// freshness renewal with no new data, last-good-seal fallback on witness
// loss, and the absence of new KNOWN_ANCHOR_STATUS values (D-C).

const fs = require('fs');
const os = require('os');
const path = require('path');

jest.setTimeout(60000);

const { createEvidenceLog } = require('../src/evidence-log');
const anchorApi = createEvidenceLog(path.join(os.tmpdir(), 'jiahao-adr0053-api-' + Date.now()));
const KNOWN_ANCHOR_STATUS = anchorApi.KNOWN_ANCHOR_STATUS;

const FORWARD_SEAL_KIND = 'forward_seal';
const HOUR = 3600 * 1000;
const REANCHOR_INTERVAL = 72 * HOUR;

function mktmp(tag) {
  const dir = path.join(os.tmpdir(), 'jiahao-adr0053-' + tag + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeClockedLog(dir) {
  let nowMs = 1_789_000_000_000;
  const log = createEvidenceLog(dir, { now: () => nowMs });
  return { log: log, advance: (ms) => { nowMs += ms; }, get: () => nowMs };
}

function seedAndSeal(log) {
  log.append([log.createRecord('seed', 'deterministic', 'passed', 'seed', 0.9, null)]);
  expect(log.sealForwardIfNeeded().status).toBe('first_seal');
}

function nextRecord(log, tag) {
  const all = log.readAll();
  return log.createRecord(tag, 'deterministic', 'passed', tag, 0.9, all[all.length - 1].event_hash);
}

function sealCount(log) {
  return log.readAll().filter(function (r) { return r.kind === FORWARD_SEAL_KIND; }).length;
}

describe('ADR-0053 D-A re-anchor triggers', () => {
  test('commit-count trigger appends a second seal', () => {
    const dir = mktmp('commits');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    log.append([nextRecord(log, 'one')]);
    expect(log.sealForwardIfNeeded({ reanchorCommits: 2 }).status).toBe('already_sealed');
    log.append([nextRecord(log, 'two')]);
    expect(log.sealForwardIfNeeded({ reanchorCommits: 2 }).status).toBe('reanchored');
    expect(sealCount(log)).toBe(2);
    expect(log.verifyTail().valid).toBe(true);
    expect(log.verifyFull().valid).toBe(true);
  });

  test('elapsed TTL trigger with injected clock re-anchors after new data', () => {
    const dir = mktmp('ttl-data');
    const { log, advance } = makeClockedLog(dir);
    seedAndSeal(log);
    advance(REANCHOR_INTERVAL - 1);
    log.append([nextRecord(log, 'one')]);
    expect(log.sealForwardIfNeeded({ reanchorMs: REANCHOR_INTERVAL }).status).toBe('already_sealed');
    advance(2);
    expect(log.sealForwardIfNeeded({ reanchorMs: REANCHOR_INTERVAL }).status).toBe('reanchored');
    expect(sealCount(log)).toBe(2);
  });

  test('either trigger suffices (both configured)', () => {
    const dir = mktmp('either');
    const { log, advance } = makeClockedLog(dir);
    seedAndSeal(log);
    advance(REANCHOR_INTERVAL + 1);
    log.append([nextRecord(log, 'one')]);
    expect(log.sealForwardIfNeeded({ reanchorCommits: 100, reanchorMs: REANCHOR_INTERVAL }).status).toBe('reanchored');
  });

  test('default anchored re-anchor cadence activates after 72h', () => {
    const dir = mktmp('default');
    const { log, advance } = makeClockedLog(dir);
    seedAndSeal(log);
    advance(REANCHOR_INTERVAL * 10);
    log.append([nextRecord(log, 'one')]);
    expect(log.sealForwardIfNeeded().status).toBe('reanchored');
    expect(sealCount(log)).toBe(2);
  });
});

describe('ADR-0053 D-A anchor freshness', () => {
  test('TTL expiry with no new data renews freshness without a new seal', () => {
    const dir = mktmp('fresh');
    const { log, advance } = makeClockedLog(dir);
    seedAndSeal(log);
    const before = log.readTailAnchor(log.headAnchorPath()).anchor.updated_at;
    advance(REANCHOR_INTERVAL + 1);
    expect(log.sealForwardIfNeeded({ reanchorMs: REANCHOR_INTERVAL }).status).toBe('freshness_renewed');
    expect(sealCount(log)).toBe(1);
    const after = log.readTailAnchor(log.headAnchorPath()).anchor;
    expect(Date.parse(after.updated_at)).not.toBe(Date.parse(before));
    expect(log.verifyTail().valid).toBe(true);
  });

  test('seal record carries the injected-clock timestamp', () => {
    const dir = mktmp('seal-ts');
    const { log, get } = makeClockedLog(dir);
    seedAndSeal(log);
    const seal = log.readAll().find(function (r) { return r.kind === FORWARD_SEAL_KIND; });
    expect(Date.parse(seal.timestamp)).toBe(get());
  });
});

describe('ADR-0053 D-B last-good-seal fallback', () => {
  test('lost tail witness on a sealed chain verifies against the last good seal', () => {
    const dir = mktmp('fallback');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    log.append([nextRecord(log, 'one')]);
    fs.unlinkSync(log.headAnchorPath());
    const seal = log.readAll().find(function (r) { return r.kind === FORWARD_SEAL_KIND; });
    const tail = log.verifyTail();
    expect(tail.valid).toBe(true);
    expect(tail.fallback).toBe('last_good_seal');
    expect(tail.recovery_window).toEqual({
      sealed_seq: 0,
      sealed_total_count: 1,
      sealed_head_hash: seal.sealed_head_hash,
      post_seal_count: 1,
    });
    const full = log.verifyFull();
    expect(full.valid).toBe(true);
    expect(full.fallback).toBe('last_good_seal');
    expect(full.recovery_window).toEqual({
      sealed_seq: 0,
      sealed_total_count: 1,
      sealed_head_hash: seal.sealed_head_hash,
      post_seal_count: 1,
    });
    expect(JSON.stringify(tail)).not.toContain(KNOWN_ANCHOR_STATUS.witness_unavailable);
  });

  test('never-sealed chains keep pre-0053 behavior (no witness problem, no fallback)', () => {
    const dir = mktmp('no-seal');
    const log = createEvidenceLog(dir);
    log.append([log.createRecord('seed', 'deterministic', 'passed', 'seed', 0.9, null)]);
    const r = log.verifyTail();
    expect(r.valid).toBe(true);
    expect(JSON.stringify(r)).not.toContain('last_good_seal');
  });

  test('unacceptable seal leaves witness loss fail-closed', () => {
    const dir = mktmp('bad-seal');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    log.append([nextRecord(log, 'one')]);
    const segDir = path.join(dir, '.jiahao-evidence');
    const seg = path.join(segDir, fs.readdirSync(segDir).find(f => f.endsWith('.jsonl')));
    const lines = fs.readFileSync(seg, 'utf8').split('\n').filter(Boolean);
    const seal = lines.findIndex(line => JSON.parse(line).kind === FORWARD_SEAL_KIND);
    const rec = JSON.parse(lines[seal]);
    rec.sealed_total_count += 1;
    lines[seal] = JSON.stringify(rec);
    fs.writeFileSync(seg, lines.join('\n') + '\n', 'utf8');
    fs.unlinkSync(log.headAnchorPath());
    const r = log.verifyTail();
    expect(r.valid).toBe(false);
    expect(r.reason).toContain(KNOWN_ANCHOR_STATUS.witness_unavailable);
  });

  test('lost genesis witness on a sealed chain also carries last-good-seal fallback', () => {
    const dir = mktmp('genesis-fallback');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());
    const seal = log.readAll().find(function (r) { return r.kind === FORWARD_SEAL_KIND; });
    const full = log.verifyFull();
    expect(full.valid).toBe(true);
    expect(full.fallback).toBe('last_good_seal');
    expect(full.recovery_window).toEqual({ sealed_seq: 0, sealed_total_count: 1, sealed_head_hash: seal.sealed_head_hash, post_seal_count: 0 });
  });
});

describe('ADR-0053 D-C status registry closure', () => {
  test('KNOWN_ANCHOR_STATUS unchanged by re-anchoring', () => {
    const dir = mktmp('registry');
    const { log, advance } = makeClockedLog(dir);
    seedAndSeal(log);
    advance(REANCHOR_INTERVAL + 1);
    log.append([nextRecord(log, 'one')]);
    log.sealForwardIfNeeded({ reanchorCommits: 1, reanchorMs: REANCHOR_INTERVAL });
    expect(Object.keys(KNOWN_ANCHOR_STATUS).sort()).toEqual([
      'anchor_ahead', 'anchor_behind', 'anchored', 'bytes_mismatch',
      'count_mismatch', 'expected_missing', 'hash_mismatch',
      'never_anchored', 'unreadable', 'witness_unavailable',
    ].sort());
  });
});
