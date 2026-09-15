'use strict';

// test/adr-0052-wiring.test.js -- ADR-0052 implementation-round wiring lock.
// Locks the status migration matrix, no-silent-rewrite, the degraded-breakpoint
// append policy (soft/hard deadlines with injected time), the hard-stop error
// code, the human-gated rebuild, mandatory full verification after rebuild,
// and ADR-0050 compatibility.

const fs = require('fs');
const os = require('os');
const path = require('path');

jest.setTimeout(60000);

const el = require('../src/evidence-log');
const { createEvidenceLog, WITNESS_RECOVERY, WITNESS_HARD_STOP_CODE } = el;
const anchorApi = createEvidenceLog(path.join(os.tmpdir(), 'jiahao-adr0052-api-' + Date.now()));
const KNOWN_ANCHOR_STATUS = anchorApi.KNOWN_ANCHOR_STATUS;
const readTailAnchor = anchorApi.readTailAnchor;
const readGenesisAnchor = anchorApi.readGenesisAnchor;

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function mktmp(tag) {
  const dir = path.join(os.tmpdir(), 'jiahao-adr0052-' + tag + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeClockedLog(dir) {
  let nowMs = 1_789_000_000_000; // fixed epoch
  const log = createEvidenceLog(dir, { now: () => nowMs });
  return { log: log, advance: (ms) => { nowMs += ms; }, get: () => nowMs };
}

function seedAndSeal(log) {
  log.append([log.createRecord('seed', 'deterministic', 'passed', 'seed', 0.9, null)]);
  return log.sealForwardIfNeeded();
}

function nextRecord(log, tag) {
  const all = log.readAll();
  return log.createRecord(tag, 'deterministic', 'passed', tag, 0.9, all[all.length - 1].event_hash);
}

describe('ADR-0052 status migration matrix', () => {
  test('never-sealed chain keeps ADR-0050 ENOENT auto-write behavior', () => {
    const dir = mktmp('mig-fresh');
    const { log } = makeClockedLog(dir);
    log.append([log.createRecord('a', 'deterministic', 'passed', 'a', 0.9, null)]);
    expect(readGenesisAnchor(log.genesisAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.never_anchored);
    expect(log.sealForwardIfNeeded().status).toBe('first_seal');
    expect(readGenesisAnchor(log.genesisAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.anchored);
    expect(log.verifyFull().valid).toBe(true);
    log.clear();
  });

  test('torn witness -> witness_unavailable; present-but-wrong stays corruption family', () => {
    const dir = mktmp('mig-torn');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);

    // Torn: parse failure -> witness_unavailable (was 'unreadable').
    fs.writeFileSync(log.headAnchorPath(), '{broken', 'utf8');
    expect(readTailAnchor(log.headAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.witness_unavailable);

    // Present-but-wrong checksum: corruption family, unchanged.
    fs.writeFileSync(log.headAnchorPath(), JSON.stringify({
      version: 1, latest_seq: 0, total_count: 1, head_hash: 'deadbeef', checksum: 'wrong',
    }), 'utf8');
    expect(readTailAnchor(log.headAnchorPath()).status).toBe(KNOWN_ANCHOR_STATUS.unreadable);
    log.clear();
  });

  test('sealed chain with missing genesis anchor reports witness_unavailable', () => {
    const dir = mktmp('mig-missing');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());
    const seal = log.readAll().find(function (r) { return r.kind === 'forward_seal'; });
    const full = log.verifyFull();
    expect(full.valid).toBe(true);
    expect(full.fallback).toBe('last_good_seal');
    expect(full.recovery_window).toEqual({ sealed_seq: 0, sealed_total_count: 1, sealed_head_hash: seal.sealed_head_hash, post_seal_count: 0 });
    log.clear();
  });
});

describe('ADR-0052 no silent rewrite + fail-closed verify', () => {
  test('seal and append never rewrite a lost genesis anchor silently', () => {
    const dir = mktmp('nosilent');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());

    expect(log.sealForwardIfNeeded().status).toBe('witness_unavailable');
    expect(fs.existsSync(log.genesisAnchorPath())).toBe(false);

    log.append([nextRecord(log, 'during-loss')]);
    expect(fs.existsSync(log.genesisAnchorPath())).toBe(false);
    expect(log.verifyFull().valid).toBe(true);
    log.clear();
  });

  test('verify fails closed when the last good seal is unacceptable', () => {
    const dir = mktmp('failclosed');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    const segDir = path.join(dir, '.jiahao-evidence');
    const seg = path.join(segDir, fs.readdirSync(segDir).find(f => f.endsWith('.jsonl')));
    const lines = fs.readFileSync(seg, 'utf8').split('\n').filter(Boolean);
    const idx = lines.findIndex(line => JSON.parse(line).kind === 'forward_seal');
    const rec = JSON.parse(lines[idx]);
    rec.sealed_total_count += 1;
    lines[idx] = JSON.stringify(rec);
    fs.writeFileSync(seg, lines.join('\n') + '\n', 'utf8');
    fs.unlinkSync(log.headAnchorPath());
    expect(log.verifyTail().valid).toBe(false);
    expect(log.verifyFull().valid).toBe(false);
    log.clear();
  });
});

describe('ADR-0052 degraded append policy with injected clock', () => {
  test('breakpoint record, soft warning, hard stop with explicit code', () => {
    const dir = mktmp('degraded');
    const { log, advance, get } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());

    // Detection: first append writes the in-chain degraded breakpoint.
    log.append([nextRecord(log, 'post-loss-1')]);
    let all = log.readAll();
    const bp = all.find(r => r.kind === 'witness_degraded');
    expect(bp).toBeDefined();
    expect(bp.consumer).toBe('human_auditor');
    expect(Date.parse(bp.detected_at)).toBe(get());

    // Before the soft deadline: silent continuation beyond the breakpoint.
    const notes = [];
    const realWrite = process.stderr.write;
    log.append([nextRecord(log, 'early')]); // no warning expected
    expect(all.length + 1).toBe(log.readAll().length);

    // Past the soft deadline: out-of-chain warning on stderr.
    advance(WITNESS_RECOVERY.soft_ms + HOUR);
    process.stderr.write = (msg) => { notes.push(msg); return true; };
    try { log.append([nextRecord(log, 'post-soft')]); }
    finally { process.stderr.write = realWrite; }
    expect(notes.some(m => /WITNESS UNAVAILABLE/.test(m) && /human_auditor/.test(m))).toBe(true);

    // Past the hard deadline with unverified post-detection appends: stop.
    advance(WITNESS_RECOVERY.hard_ms - WITNESS_RECOVERY.soft_ms);
    let err = null;
    try { log.append([nextRecord(log, 'blocked')]); } catch (e) { err = e; }
    expect(err).not.toBeNull();
    expect(err.code).toBe(WITNESS_HARD_STOP_CODE);
    // The rejected record was not appended.
    expect(log.readAll().some(r => r.gate_id === 'blocked')).toBe(false);
    log.clear();
  });

  test('hard deadline alone without post-detection appends allows one more append', () => {
    const dir = mktmp('hard-edge');
    const { log, advance } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());
    advance(WITNESS_RECOVERY.hard_ms + HOUR); // jump past hard with no post-detection appends
    // First append after loss is the detection event: breakpoint lands and
    // the clock starts at detected_at (ADR-0052 D-D), so no block yet.
    log.append([nextRecord(log, 'first-after-detect')]);
    // One unverified post-detection append now exists; past the hard
    // deadline the next append stops with the explicit code.
    advance(WITNESS_RECOVERY.hard_ms + HOUR);
    let err = null;
    try { log.append([nextRecord(log, 'second')]); } catch (e) { err = e; }
    expect(err && err.code).toBe(WITNESS_HARD_STOP_CODE);
    log.clear();
  });

  test('bookkeeping records after detection do not count toward the hard stop', () => {
    const dir = mktmp('bookkeeping-count');
    const { log, advance } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());
    // Detection without an evidence append: the degraded breakpoint is the
    // only new record. The forward seal after it is bookkeeping.
    log.append([]);
    expect(log.readAll().some(r => r.kind === 'witness_degraded')).toBe(true);
    log.sealForwardIfNeeded({ reanchorCommits: 1 });
    advance(WITNESS_RECOVERY.hard_ms + HOUR);
    // Zero real post-detection evidence appends: the spurious forward seal
    // must not trip the hard stop.
    let err = null;
    try { log.append([nextRecord(log, 'allowed-by-seal')]); } catch (e) { err = e; }
    expect(err).toBeNull();
    log.clear();
  });

  test('a witness scan read failure is refused loudly, not silently continued', () => {
    const dir = mktmp('scan-fail');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());
    const realRead = fs.readFileSync;
    const realWrite = process.stderr.write;
    const notes = [];
    const rec = nextRecord(log, 'refused-scan');
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(function (p, ...args) {
      if (typeof p === 'string' && p.endsWith('.jsonl')) throw new Error('scan boom');
      return realRead(p, ...args);
    });
    process.stderr.write = function (msg) { notes.push(msg); return true; };
    try {
      log.append([rec]);
    } finally {
      spy.mockRestore();
      process.stderr.write = realWrite;
    }
    expect(log.readAll().some(function (r) { return r.gate_id === 'refused-scan'; })).toBe(false);
    expect(notes.some(function (m) { return /witness scan failed/.test(m); })).toBe(true);
    log.clear();
  });
});

describe('ADR-0052 rebuild behind the human review gate', () => {
  test('rebuild is denied without reviewer, reason, or approval', () => {
    const dir = mktmp('deny');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());
    expect(() => log.rebuildGenesisAnchor({})).toThrow(/human review gate/);
    expect(() => log.rebuildGenesisAnchor({ reviewer: 'alice', reason: 'x' })).toThrow(/human review gate/);
    expect(() => log.rebuildGenesisAnchor({ reviewer: 'alice', approval: true })).toThrow(/human review gate/);
    let code = null;
    try { log.rebuildGenesisAnchor({}); } catch (e) { code = e.code; }
    expect(code).toBe('WITNESS_REBUILD_UNAUTHORIZED');
    // Denial changes nothing.
    expect(fs.existsSync(log.genesisAnchorPath())).toBe(false);
    log.clear();
  });

  test('rebuild refuses to whitewash a corrupt chain', () => {
    const dir = mktmp('corrupt-deny');
    const { log } = makeClockedLog(dir);
    seedAndSeal(log);
    fs.unlinkSync(log.genesisAnchorPath());
    const segDir = path.join(dir, '.jiahao-evidence');
    const seg = path.join(segDir, fs.readdirSync(segDir).find(f => f.endsWith('.jsonl')));
    const lines = fs.readFileSync(seg, 'utf8').split('\n').filter(Boolean);
    const rec0 = JSON.parse(lines[0]);
    rec0.confidence = 0.1;
    lines[0] = JSON.stringify(rec0);
    fs.writeFileSync(seg, lines.join('\n') + '\n', 'utf8');
    let code = null;
    try { log.rebuildGenesisAnchor({ reviewer: 'alice', reason: 'lost witness', approval: true }); }
    catch (e) { code = e.code; }
    expect(code).toBe('WITNESS_REBUILD_FAILED');
    log.clear();
  });

  test('authorized rebuild: audit record, generation++, forced full verify, recovery', () => {
    const dir = mktmp('rebuild');
    const { log, advance, get } = makeClockedLog(dir);
    seedAndSeal(log);
    expect(readGenesisAnchor(log.genesisAnchorPath()).anchor.generation).toBeUndefined();

    fs.unlinkSync(log.genesisAnchorPath());
    log.append([nextRecord(log, 'post-loss')]); // detection breakpoint
    advance(3 * HOUR);

    const result = log.rebuildGenesisAnchor({ reviewer: 'alice', reason: 'laptop disk replaced', approval: true });
    expect(result.status).toBe('rebuilt');
    expect(result.generation).toBe(1);
    expect(result.verify.valid).toBe(true); // forced full verification, degraded tail included

    const gen = readGenesisAnchor(log.genesisAnchorPath());
    expect(gen.status).toBe(KNOWN_ANCHOR_STATUS.anchored);
    expect(gen.anchor.generation).toBe(1);

    // Audit disposition lives in the append-only chain.
    const audit = log.readAll().find(r => r.kind === 'witness_recovery');
    expect(audit).toMatchObject({ reviewer: 'alice', reason: 'laptop disk replaced', approval: true, generation: 1 });
    expect(audit.detected_at).not.toBeNull();

    // Degraded state cleared: past-hard appends work again.
    advance(WITNESS_RECOVERY.hard_ms);
    log.append([nextRecord(log, 'after-rebuild')]);
    expect(log.verifyFull().valid).toBe(true);
    expect(log.verifyTail().valid).toBe(true);
    log.clear();
  });
});
