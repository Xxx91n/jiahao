'use strict';

// test/adr-0050-wiring.test.js -- ADR-0050 implementation-round wiring lock.
// Locks D-A tail anchor sidecar, D-B protected genesis anchor, D-C structured
// anchor tri-state, D-D forward sealing, and D-E fail-closed/recoverable states.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const { createEvidenceLog } = require('../src/evidence-log');
const anchorApi = createEvidenceLog(path.join(os.tmpdir(), 'jiahao-adr0050-api-' + Date.now() + '-' + Math.floor(Math.random() * 1e6)));
const KNOWN_ANCHOR_STATUS = anchorApi.KNOWN_ANCHOR_STATUS;
const readTailAnchor = anchorApi.readTailAnchor;
const writeTailAnchor = anchorApi.writeTailAnchor;
const readGenesisAnchor = anchorApi.readGenesisAnchor;

function mktmp(tag) {
  const dir = path.join(os.tmpdir(), 'jiahao-adr0050-' + tag + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function chainState(log) {
  const all = log.readAll();
  return {
    first_hash: all[0].event_hash,
    latest_seq: all.length - 1,
    total_count: all.length,
    head_hash: all[all.length - 1].event_hash,
  };
}

function seedAndSeal(log) {
  const first = log.createRecord('seed', 'deterministic', 'passed', 'seed record', 0.9, null);
  log.append([first]);
  const seal = log.sealForwardIfNeeded();
  return { first, seal };
}

describe('ADR-0050 D-A tail anchor sidecar', () => {
  test('anchor is written after each anchored commit and round-trips', () => {
    const dir = mktmp('da');
    const log = createEvidenceLog(dir);
    seedAndSeal(log);

    let state = chainState(log);
    let anchor = readTailAnchor(log.headAnchorPath());
    expect(anchor.status).toBe(KNOWN_ANCHOR_STATUS.anchored);
    expect(anchor.anchor).toMatchObject({
      latest_seq: state.latest_seq,
      total_count: state.total_count,
      head_hash: state.head_hash,
    });

    const next = log.createRecord('next', 'deterministic', 'passed', 'next record', 0.9, state.head_hash);
    log.append([next]);
    state = chainState(log);
    anchor = readTailAnchor(log.headAnchorPath());
    expect(anchor.anchor).toMatchObject({
      latest_seq: state.latest_seq,
      total_count: state.total_count,
      head_hash: state.head_hash,
    });
    log.clear();
  });
});

describe('ADR-0050 D-B protected genesis anchor', () => {
  test('old chain is never_anchored and keeps verifying; install seal writes genesis outside data dir', () => {
    const dir = mktmp('db');
    const log = createEvidenceLog(dir);
    const first = log.createRecord('old', 'deterministic', 'passed', 'old chain', 0.9, null);
    log.append([first]);

    expect(readGenesisAnchor(log.genesisAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.never_anchored);
    expect(log.verifyTail().valid).toBe(true);
    expect(log.verifyFull().valid).toBe(true);

    expect(log.sealForwardIfNeeded().status).toBe('first_seal');
    const genesis = readGenesisAnchor(log.genesisAnchorPath());
    expect(genesis.status).toBe(KNOWN_ANCHOR_STATUS.anchored);
    expect(genesis.anchor.first_hash).toBe(first.event_hash);
    expect(fs.existsSync(path.join(dir, '.jiahao-evidence', log.genesisAnchorPath().split('/').pop()))).toBe(false);
    log.clear();
  });
});

describe('ADR-0050 D-C structured anchor tri-state', () => {
  test('KNOWN_ANCHOR_STATUS registry and unreadable sidecar fail closed', () => {
    expect(Object.keys(KNOWN_ANCHOR_STATUS)).toEqual([
      'anchored', 'never_anchored', 'expected_missing', 'unreadable',
      'hash_mismatch', 'bytes_mismatch', 'count_mismatch',
      'anchor_behind', 'anchor_ahead',
      // ADR-0052 additive: witness_unavailable (migration: a torn/missing
      // witness is no longer 'unreadable' or 'expected_missing').
      'witness_unavailable',
    ]);

    const dir = mktmp('dc');
    const log = createEvidenceLog(dir);
    log.append([log.createRecord('x', 'deterministic', 'passed', 'x', 0.9, null)]);
    expect(readTailAnchor(log.headAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.never_anchored);

    log.sealForwardIfNeeded();
    fs.writeFileSync(log.headAnchorPath(), '{broken', 'utf8');
    // ADR-0052 migration: torn witness -> witness_unavailable. With the
    // ADR-0053 last-good-seal fallback, verification passes against the seal
    // on this sealed chain instead of failing outright.
    expect(readTailAnchor(log.headAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.witness_unavailable);
    const full = log.verifyFull();
    expect(full.valid).toBe(true);
    expect(full.fallback).toBe('last_good_seal');
    log.clear();
  });
});

describe('ADR-0050 D-D forward seal', () => {
  test('seal record pins the current head and is idempotent', () => {
    const dir = mktmp('dd');
    const log = createEvidenceLog(dir);
    const { first } = seedAndSeal(log);
    const all = log.readAll();
    expect(all).toHaveLength(2);
    expect(all[1].kind).toBe('forward_seal');
    expect(all[1].sealed_head_hash).toBe(first.event_hash);
    expect(all[1].sealed_total_count).toBe(1);
    expect(all[1].sealed_seq).toBe(0);

    expect(log.sealForwardIfNeeded().status).toBe('already_sealed');
    expect(log.readAll()).toHaveLength(2);
    log.clear();
  });

  test('seal does not refresh a genesis anchor that no longer matches the first record', () => {
    const dir = mktmp('dd-tamper');
    const log = createEvidenceLog(dir);
    const first = log.createRecord('seed', 'deterministic', 'passed', 'seed record', 0.9, null);
    log.append([first]);
    log.sealForwardIfNeeded();
    const segmentDir = path.join(dir, '.jiahao-evidence');
    const segmentFile = fs.readdirSync(segmentDir).find(name => name.endsWith('.jsonl'));
    const segmentPath = path.join(segmentDir, segmentFile);
    const lines = fs.readFileSync(segmentPath, 'utf8').split('\n').filter(Boolean);
    const original = JSON.parse(lines[0]);
    original.gate_id = 'tampered';
    original.event_hash = 'not-the-original-hash';
    lines[0] = JSON.stringify(original);
    fs.writeFileSync(segmentPath, lines.join('\n') + '\n', 'utf8');

    const result = log.sealForwardIfNeeded();
    expect(result.status).toBe('corrupt');
    expect(result.reason).toContain('genesis anchor does not match chain first record');
    log.clear();
  });

  test('append does not advance the tail anchor when genesis no longer matches', () => {
    const dir = mktmp('dd-tamper-append');
    const log = createEvidenceLog(dir);
    seedAndSeal(log);
    const before = readTailAnchor(log.headAnchorPath()).anchor;
    const segmentDir = path.join(dir, '.jiahao-evidence');
    const segmentFile = fs.readdirSync(segmentDir).find(name => name.endsWith('.jsonl'));
    const segmentPath = path.join(segmentDir, segmentFile);
    const lines = fs.readFileSync(segmentPath, 'utf8').split('\n').filter(Boolean);
    const original = JSON.parse(lines[0]);
    original.gate_id = 'tampered';
    original.event_hash = 'not-the-original-hash';
    lines[0] = JSON.stringify(original);
    fs.writeFileSync(segmentPath, lines.join('\n') + '\n', 'utf8');
    const tail = log.readAll()[log.readAll().length - 1].event_hash;
    log.append([log.createRecord('next', 'deterministic', 'passed', 'next', 0.9, tail)]);

    const after = readTailAnchor(log.headAnchorPath()).anchor;
    expect(after.latest_seq).toBe(before.latest_seq);
    expect(after.total_count).toBe(before.total_count);
    expect(after.head_hash).toBe(before.head_hash);
    expect(log.verifyFull().valid).toBe(false);
    log.clear();
  });
});

describe('ADR-0050 D-E failure and recovery states', () => {
  test('anchor-behind is recoverable; anchor-ahead and count-mismatch are fail-closed', () => {
    const dir = mktmp('de');
    const log = createEvidenceLog(dir);
    seedAndSeal(log);

    let state = chainState(log);
    writeTailAnchor(log.headAnchorPath(), state.latest_seq - 1, state.total_count, state.head_hash);
    expect(log.verifyFull().valid).toBe(true);

    const next = log.createRecord('next', 'deterministic', 'passed', 'recover', 0.9, state.head_hash);
    log.append([next]);
    state = chainState(log);
    expect(readTailAnchor(log.headAnchorPath()).anchor.latest_seq).toBe(state.latest_seq);

    writeTailAnchor(log.headAnchorPath(), state.latest_seq + 5, state.total_count, state.head_hash);
    const ahead = log.verifyFull();
    expect(ahead.valid).toBe(false);
    expect(ahead.reason).toContain('anchor_ahead');

    writeTailAnchor(log.headAnchorPath(), state.latest_seq, state.total_count + 1, state.head_hash);
    const count = log.verifyFull();
    expect(count.valid).toBe(false);
    expect(count.reason).toContain('count_mismatch');
    log.clear();
  });

  test('segment data is fsynced before the tail anchor is advanced', () => {
    const dir = mktmp('de-fsync-order');
    const log = createEvidenceLog(dir);
    const first = log.createRecord('seed', 'deterministic', 'passed', 'seed record', 0.9, null);
    log.append([first]);
    log.sealForwardIfNeeded();

    const segmentDir = path.join(dir, '.jiahao-evidence');
    const segmentFile = fs.readdirSync(segmentDir).find(name => name.endsWith('.jsonl'));
    const segmentPath = path.join(segmentDir, segmentFile);
    const realFsync = fs.fsyncSync;
    const realAppend = fs.appendFileSync;
    const calls = [];
    let segmentAppendPending = false;
    fs.appendFileSync = function (file, data, options) {
      if (file === segmentPath) segmentAppendPending = true;
      return realAppend.call(this, file, data, options);
    };
    fs.fsyncSync = function (fd) {
      calls.push(segmentAppendPending);
      segmentAppendPending = false;
      return realFsync.call(this, fd);
    };
    try {
      const tail = log.readAll()[log.readAll().length - 1].event_hash;
      const next = log.createRecord('next', 'deterministic', 'passed', 'next record', 0.9, tail);
      log.append([next]);
    } finally {
      fs.fsyncSync = realFsync;
      fs.appendFileSync = realAppend;
    }

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toBe(true);
    expect(fs.existsSync(segmentPath)).toBe(true);
    log.clear();
  });

  test('anchor rename fsyncs its parent directory on non-Windows hosts', () => {
    const dir = mktmp('de-dir-fsync');
    const log = createEvidenceLog(dir);
    const platform = Object.getOwnPropertyDescriptor(process, 'platform');
    const realOpen = fs.openSync;
    const realRename = fs.renameSync;
    const realFsync = fs.fsyncSync;
    const anchorPath = log.headAnchorPath();
    const parent = path.dirname(anchorPath);
    let renamed = false;
    let dirFd = null;
    let dirFsyncedAfterRename = false;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    fs.renameSync = function (source, target) {
      renamed = true;
      return realRename.call(this, source, target);
    };
    fs.openSync = function (file, flags) {
      if (file === parent && flags === 'r') {
        dirFd = realOpen.call(this, __filename, 'r');
        return dirFd;
      }
      return realOpen.call(this, file, flags);
    };
    fs.fsyncSync = function (fd) {
      if (fd === dirFd && renamed) {
        dirFsyncedAfterRename = true;
        return;
      }
      return realFsync.call(this, fd);
    };
    try {
      seedAndSeal(log);
    } finally {
      fs.fsyncSync = realFsync;
      fs.openSync = realOpen;
      fs.renameSync = realRename;
      Object.defineProperty(process, 'platform', platform);
    }

    expect(renamed).toBe(true);
    expect(dirFsyncedAfterRename).toBe(true);
    log.clear();
  });
});

describe('ADR-0050 executable wiring', () => {
  test('instrument check/classify and verify-evidence --full run against real state', () => {
    const env = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: mktmp('exec-instrument') });
    const check = spawnSync(process.execPath, ['scripts/instrument.js', '--check'], { cwd: ROOT, encoding: 'utf8', env });
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('identity pinned and authoritative');

    const classified = spawnSync(process.execPath, ['scripts/instrument.js', '--classify', '--surface', 'schedule_gate'], { cwd: ROOT, encoding: 'utf8', env });
    expect(classified.status).toBe(0);
    expect(classified.stdout).toContain('schedule_gate -> record');

    const dir = mktmp('exec-verify');
    const log = createEvidenceLog(dir);
    seedAndSeal(log);
    const verify = spawnSync(process.execPath, ['scripts/verify-evidence.js', '--full', '--dir', dir], { cwd: ROOT, encoding: 'utf8' });
    expect(verify.status).toBe(0);
    expect(JSON.parse(verify.stdout).valid).toBe(true);
    log.clear();
  });
});
