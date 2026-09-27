'use strict';

// test/adr-0051-wiring.test.js -- ADR-0051 implementation-round wiring lock.
// Locks D-A closed PERSISTENCE_CAPABILITY enum + capability dispatch, D-B
// probe with the operator declaration authoritative, and D-C the audit
// annotation on anchor writes. Platform behavior is preserved (win32 stays a
// dir-sync-unsupported no-op).

const fs = require('fs');
const os = require('os');
const path = require('path');

jest.setTimeout(60000);

const el = require('../src/evidence-log');
const { createEvidenceLog } = el;
const { PERSISTENCE_CAPABILITY, probePersistenceCapability, resolvePersistenceCapability } = el;

const DURABLE = PERSISTENCE_CAPABILITY.dir_sync_durable;
const UNSUPPORTED = PERSISTENCE_CAPABILITY.dir_sync_unsupported;

function mktmp(tag) {
  const dir = path.join(os.tmpdir(), 'jiahao-adr0051-' + tag + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe('ADR-0051 D-A closed registry and capability dispatch', () => {
  test('registry is closed with exactly the two ADR-0051 classes', () => {
    expect(Object.keys(PERSISTENCE_CAPABILITY).sort()).toEqual(['dir_sync_durable', 'dir_sync_unsupported']);
    expect(Object.isFrozen(PERSISTENCE_CAPABILITY)).toBe(true);
  });

  test('dispatch keys on the injected class, not process.platform', () => {
    const bogus = path.join(os.tmpdir(), 'jiahao-adr0051-no-such-' + Date.now());
    // Unsupported class is a no-op: never touches the filesystem.
    expect(() => el.fsyncDirectory(bogus, UNSUPPORTED)).not.toThrow();
    // Durable class actually runs the open+fsync recipe (fails loudly on a
    // missing directory — proof the dispatch, not a platform test, decided).
    expect(() => el.fsyncDirectory(bogus, DURABLE)).toThrow();
    // Non-Windows behavior lock: on win32 the directory fsync genuinely
    // fails (EPERM), which is why the platform default is the no-op class.
    if (process.platform === 'win32') {
      const d = mktmp('fsync');
      expect(() => el.fsyncDirectory(d, DURABLE)).toThrow();
    }
  });

  test('unknown class fails loudly instead of guessing a recipe', () => {
    const d = mktmp('unknown');
    expect(() => el.fsyncDirectory(d, 'posix-ish')).toThrow(/unknown persistence capability/);
  });
});

describe('ADR-0051 D-B probe, declaration authoritative', () => {
  test('probe records the observed class; win32 probing resolves unsupported', () => {
    const d = mktmp('probe');
    const probed = probePersistenceCapability(d);
    expect([DURABLE, UNSUPPORTED]).toContain(probed);
    if (process.platform === 'win32') expect(probed).toBe(UNSUPPORTED);
  });

  test('declaration wins over an inconclusive probe; injection over all', () => {
    const d = mktmp('decl');
    const declFile = path.join(d, el.PERSISTENCE_DECLARATION_FILENAME);

    fs.writeFileSync(declFile, JSON.stringify({ declared: DURABLE, probed: UNSUPPORTED }), 'utf8');
    expect(resolvePersistenceCapability(undefined, d)).toBe(DURABLE);

    fs.writeFileSync(declFile, JSON.stringify({ probed: DURABLE }), 'utf8');
    expect(resolvePersistenceCapability(undefined, d)).toBe(DURABLE);

    expect(resolvePersistenceCapability(UNSUPPORTED, d)).toBe(UNSUPPORTED);

    fs.writeFileSync(declFile, '{broken', 'utf8');
    expect(resolvePersistenceCapability(undefined, d)).toBe(
      process.platform === 'win32' ? UNSUPPORTED : DURABLE);
  });
});

describe('ADR-0051 D-C audit annotation and unchanged platform baseline', () => {
  test('every anchor write carries the resolved capability class', () => {
    const d = mktmp('audit');
    const log = createEvidenceLog(d, { capability: UNSUPPORTED });
    expect(log.persistenceCapability()).toBe(UNSUPPORTED);
    log.append([log.createRecord('a', 'deterministic', 'passed', 'a', 0.9, null)]);
    log.sealForwardIfNeeded();
    const tail = JSON.parse(fs.readFileSync(log.headAnchorPath(), 'utf8'));
    expect(tail.persistence).toBe(UNSUPPORTED);
    const genesis = JSON.parse(fs.readFileSync(log.genesisAnchorPath(), 'utf8'));
    expect(genesis.persistence).toBe(UNSUPPORTED);
    expect(log.verifyFull().valid).toBe(true);
    log.clear();
  });

  test('default resolution preserves current platform behavior end-to-end', () => {
    const d = mktmp('default');
    const log = createEvidenceLog(d);
    const expected = process.platform === 'win32' ? UNSUPPORTED : DURABLE;
    expect(log.persistenceCapability()).toBe(expected);
    log.append([log.createRecord('b', 'deterministic', 'passed', 'b', 0.9, null)]);
    expect(log.sealForwardIfNeeded().status).toBe('first_seal');
    expect(log.verifyFull().valid).toBe(true);
    log.clear();
  });

  test('constructor reuses the single resolution path for operator declarations', () => {
    const d = mktmp('constructor-decl');
    const declFile = path.join(d, el.PERSISTENCE_DECLARATION_FILENAME);
    fs.writeFileSync(declFile, JSON.stringify({ declared: UNSUPPORTED }), 'utf8');
    const log = createEvidenceLog(d);
    expect(log.persistenceCapability()).toBe(UNSUPPORTED);
    log.append([log.createRecord('c', 'deterministic', 'passed', 'c', 0.9, null)]);
    log.sealForwardIfNeeded();
    const tail = JSON.parse(fs.readFileSync(log.headAnchorPath(), 'utf8'));
    expect(tail.persistence).toBe(UNSUPPORTED);
    log.clear();
  });
});
