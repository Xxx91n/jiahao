'use strict';

// test/adr-0054-wiring.test.js -- ADR-0054 implementation-round wiring lock.
// Locks fallback identity, rebuild disposition, anchor config resolution,
// freshness/verdict synthesis, read-only verification, and CLI exit mapping.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

jest.setTimeout(60000);

const {
  createEvidenceLog,
} = require('../src/evidence-log');

const anchorApi = createEvidenceLog(path.join(os.tmpdir(), 'jiahao-adr0054-api-' + Date.now()));
const {
  ConfigLoadError,
  ANCHOR_CONFIG_FILENAME,
  ANCHOR_DEFAULT_REANCHOR_MS,
  ANCHOR_HARD_FACTOR,
  ANCHOR_FRESHNESS,
} = anchorApi;

const FORWARD_SEAL_KIND = 'forward_seal';

function mktmp(tag) {
  const dir = path.join(os.tmpdir(), 'jiahao-adr0054-' + tag + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeClockedLog(dir, startMs, opts) {
  let nowMs = startMs;
  const log = createEvidenceLog(dir, Object.assign({ now: () => nowMs }, opts || {}));
  return {
    log: log,
    advance: (ms) => { nowMs += ms; },
    get: () => nowMs,
  };
}

function seedAndSeal(log) {
  log.append([log.createRecord('seed', 'deterministic', 'passed', 'seed', 0.9, null)]);
  expect(log.sealForwardIfNeeded().status).toBe('first_seal');
}

function nextRecord(log, tag) {
  const all = log.readAll();
  return log.createRecord(tag, 'deterministic', 'passed', tag, 0.9, all[all.length - 1].event_hash);
}

function sealRecord(log) {
  return log.readAll().find((r) => r.kind === FORWARD_SEAL_KIND);
}

function cleanup(log, dir) {
  log.clear();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}

describe('ADR-0054 wiring', () => {
  test('D-A fallback identity and D-B rebuild disposition in one live loop', () => {
    const dir = mktmp('fallback-rebuild');
    const { log } = makeClockedLog(dir, Date.now());
    seedAndSeal(log);
    const seal = sealRecord(log);
    log.append([nextRecord(log, 'one')]);
    fs.unlinkSync(log.headAnchorPath());

    const tail = log.verifyTail();
    expect(tail.valid).toBe(true);
    expect(tail.fallback).toBe('last_good_seal');
    expect(tail.consumer).toBe('human_auditor');
    expect(tail.recovery_window).toEqual({
      sealed_seq: 0,
      sealed_total_count: 1,
      sealed_head_hash: seal.sealed_head_hash,
      post_seal_count: 1,
    });

    const full = log.verifyFull();
    expect(full.recovery_window.sealed_head_hash).toBe(seal.sealed_head_hash);

    const result = log.rebuildGenesisAnchor({ reviewer: 'alice', reason: 'recover witness', approval: true });
    expect(result.generation).toBe(1);
    expect(result.prev_generation).toBe(0);
    expect(result.last_good_seal).toEqual({
      sealed_seq: 0,
      sealed_total_count: 1,
      sealed_head_hash: seal.sealed_head_hash,
      post_seal_count: 1,
    });
    const audit = log.readAll().find((r) => r.kind === 'witness_recovery');
    expect(audit.prev_generation).toBe(0);
    expect(audit.last_good_seal).toEqual(result.last_good_seal);
    cleanup(log, dir);
  });

  test('D-B rebuild without a seal basis records null', () => {
    const dir = mktmp('null-basis');
    const log = createEvidenceLog(dir);
    log.append([log.createRecord('seed', 'deterministic', 'passed', 'seed', 0.9, null)]);
    const result = log.rebuildGenesisAnchor({ reviewer: 'alice', reason: 'hard stop', approval: true });
    expect(result.last_good_seal).toBeNull();
    expect(result.prev_generation).toBe(0);
    expect(log.readAll().find((r) => r.kind === 'witness_recovery').last_good_seal).toBeNull();
    cleanup(log, dir);
  });

  test('D-C missing config defaults, operator overrides, and injected overrides', () => {
    const dir = mktmp('config-resolution');
    expect(createEvidenceLog(dir).anchorConfig()).toEqual({ reanchorMs: ANCHOR_DEFAULT_REANCHOR_MS });
    cleanup(createEvidenceLog(dir), dir);

    const operatorDir = mktmp('operator-config');
    fs.writeFileSync(path.join(operatorDir, ANCHOR_CONFIG_FILENAME), JSON.stringify({ reanchorMs: 1234, reanchorCommits: 7 }), 'utf8');
    const operatorLog = createEvidenceLog(operatorDir);
    expect(operatorLog.anchorConfig()).toEqual({ reanchorMs: 1234, reanchorCommits: 7 });
    cleanup(operatorLog, operatorDir);

    const injectedDir = mktmp('injected-config');
    fs.writeFileSync(path.join(injectedDir, ANCHOR_CONFIG_FILENAME), JSON.stringify({ reanchorMs: 1234, reanchorCommits: 7 }), 'utf8');
    const injectedLog = createEvidenceLog(injectedDir, { reanchorMs: 2345, reanchorCommits: 9 });
    expect(injectedLog.anchorConfig()).toEqual({ reanchorMs: 2345, reanchorCommits: 9 });
    cleanup(injectedLog, injectedDir);
  });

  test('D-C malformed config fails closed with ConfigLoadError', () => {
    const jsonDir = mktmp('bad-json');
    fs.writeFileSync(path.join(jsonDir, ANCHOR_CONFIG_FILENAME), '{broken', 'utf8');
    expect(() => createEvidenceLog(jsonDir)).toThrow(ConfigLoadError);
    fs.rmSync(jsonDir, { recursive: true, force: true });

    const valueDir = mktmp('bad-value');
    fs.writeFileSync(path.join(valueDir, ANCHOR_CONFIG_FILENAME), JSON.stringify({ reanchorMs: 0 }), 'utf8');
    expect(() => createEvidenceLog(valueDir)).toThrow(/positive finite number/);
    fs.rmSync(valueDir, { recursive: true, force: true });
  });

  test('D-D freshness axis stays separate from integrity', () => {
    const dir = mktmp('freshness');
    const { log, advance } = makeClockedLog(dir, 1000000, { reanchorMs: 1000 });
    seedAndSeal(log);

    expect(log.verifyFull()).toMatchObject({ valid: true, freshness: ANCHOR_FRESHNESS.fresh, verdict: 'pass' });
    advance(1000);
    expect(log.verifyFull()).toMatchObject({ valid: true, freshness: ANCHOR_FRESHNESS.stale, verdict: 'warn' });
    advance(ANCHOR_HARD_FACTOR * 1000 - 1000);
    const hard = log.verifyFull();
    expect(hard.valid).toBe(true);
    expect(hard.freshness).toBe(ANCHOR_FRESHNESS.hard_stale);
    expect(hard.verdict).toBe('fail');
    cleanup(log, dir);
  });

  test('D-E verify remains read-only while sealForwardIfNeeded owns maintenance writes', () => {
    const dir = mktmp('read-only');
    const { log, advance } = makeClockedLog(dir, Date.now(), { reanchorMs: 1000 });
    seedAndSeal(log);
    const before = log.readTailAnchor(log.headAnchorPath()).anchor.updated_at;
    advance(1000);

    expect(log.verifyTail().verdict).toBe('warn');
    expect(log.readTailAnchor(log.headAnchorPath()).anchor.updated_at).toBe(before);
    expect(log.readAll().filter((r) => r.kind === FORWARD_SEAL_KIND).length).toBe(1);

    expect(log.sealForwardIfNeeded().status).toBe('freshness_renewed');
    expect(log.readTailAnchor(log.headAnchorPath()).anchor.updated_at).not.toBe(before);
    cleanup(log, dir);
  });

  test('CLI maps warn to exit 0 and hard_stale to exit 1', () => {
    const warnDir = mktmp('cli-warn');
    const warnSeed = makeClockedLog(warnDir, Date.now() - 1200, { reanchorMs: 1000 });
    seedAndSeal(warnSeed.log);
    fs.writeFileSync(path.join(warnDir, ANCHOR_CONFIG_FILENAME), JSON.stringify({ reanchorMs: 1000 }), 'utf8');
    const warn = spawnSync(process.execPath, ['scripts/verify-evidence.js', '--dir', warnDir], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    expect(warn.status).toBe(0);
    const warnOut = JSON.parse(warn.stdout);
    expect(warnOut).toMatchObject({ valid: true, freshness: ANCHOR_FRESHNESS.stale, verdict: 'warn' });
    expect(warn.stderr).toMatch(/stale/);
    cleanup(warnSeed.log, warnDir);

    const hardDir = mktmp('cli-hard');
    const hardSeed = makeClockedLog(hardDir, Date.now() - 2000, { reanchorMs: 1000 });
    seedAndSeal(hardSeed.log);
    fs.writeFileSync(path.join(hardDir, ANCHOR_CONFIG_FILENAME), JSON.stringify({ reanchorMs: 1000 }), 'utf8');
    const hard = spawnSync(process.execPath, ['scripts/verify-evidence.js', '--dir', hardDir], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    expect(hard.status).toBe(1);
    expect(JSON.parse(hard.stdout)).toMatchObject({ valid: true, freshness: ANCHOR_FRESHNESS.hard_stale, verdict: 'fail' });
    cleanup(hardSeed.log, hardDir);
  });
});
