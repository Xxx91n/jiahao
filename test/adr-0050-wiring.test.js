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
    ]);

    const dir = mktmp('dc');
    const log = createEvidenceLog(dir);
    log.append([log.createRecord('x', 'deterministic', 'passed', 'x', 0.9, null)]);
    expect(readTailAnchor(log.headAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.never_anchored);

    log.sealForwardIfNeeded();
    fs.writeFileSync(log.headAnchorPath(), '{broken', 'utf8');
    expect(readTailAnchor(log.headAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.unreadable);
    const full = log.verifyFull();
    expect(full.valid).toBe(false);
    expect(full.reason).toContain('tail_anchor');
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
