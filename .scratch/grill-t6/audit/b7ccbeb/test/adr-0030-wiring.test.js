// test/adr-0030-wiring.test.js — ADR-0030 D4 verdict-gate wiring tests.
// The hook loads its dead-man assets from the tree next to __dirname, so these
// tests spawn a copied hook tree whose ledger is crafted per scenario; the
// evidence/config side stays under CLAUDE_CONFIG_DIR like the ADR-0022 tests.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const BASE = path.join(os.tmpdir(), 'jiahao-adr0030-wiring').replace(/\\/g, '/');
const TREE = BASE + '/tree';
const CFG = BASE + '/cfg';

const { createRecord: createEvidence } = require('../src/evidence-log');
const { appendEntry } = require('../scripts/reverify');

function ledgerAged(months) {
  const t = new Date(Date.now() - months * 30 * 24 * 3600 * 1000).toISOString();
  return appendEntry([], { collected_at: t, metrics: {}, conclusion: 'pass' });
}

function setupTree(ledger) {
  fs.rmSync(BASE, { recursive: true, force: true });
  fs.mkdirSync(TREE + '/bench/polygraph', { recursive: true });
  fs.mkdirSync(CFG, { recursive: true });
  fs.cpSync(REPO + '/hooks', TREE + '/hooks', { recursive: true });
  fs.cpSync(REPO + '/src', TREE + '/src', { recursive: true });
  fs.mkdirSync(TREE + '/scripts', { recursive: true });
  fs.copyFileSync(REPO + '/scripts/reverify.js', TREE + '/scripts/reverify.js');
  fs.copyFileSync(REPO + '/bench/polygraph/deadline.json', TREE + '/bench/polygraph/deadline.json');
  fs.writeFileSync(TREE + '/bench/polygraph/reverify-ledger.json', JSON.stringify(ledger), 'utf8');
}

function runGate(profile, records) {
  fs.writeFileSync(CFG + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(CFG + '/.jiahao-profile', profile, 'utf8');
  fs.writeFileSync(CFG + '/.jiahao-evidence', JSON.stringify(records), 'utf8');
  const input = JSON.stringify({ stop_hook_active: false });
  try {
    const out = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: CFG, JIAHAO_NO_SENTINEL: '1' },
      timeout: 15000, shell: 'bash', cwd: TREE,
    });
    return { exit: 0, out: JSON.parse(out) };
  } catch (e) {
    if (!e.stdout) throw e;
    return { exit: e.status, out: JSON.parse(e.stdout) };
  }
}

const highDet = { suspicious: true, severity: 'high', matched_phrases: ['done'], coverage: 'full' };
const partialHighDet = {
  suspicious: true, severity: 'high', matched_phrases: ['done'], coverage: 'partial',
  degradation: { kind: 'truncation', detail: { bytes_seen: 65536, bytes_total: 10000000, threshold: 65536 } },
};
const cleanDet = { suspicious: false, severity: null, matched_phrases: [], coverage: 'full' };
const rec = det => createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });

afterAll(() => { fs.rmSync(BASE, { recursive: true, force: true }); });

describe('ADR-0030 D4 hook wiring (audit T1)', () => {
  test('degraded (10mo ledger): high severity degrades to advisory, exit 0', () => {
    setupTree(ledgerAged(10));
    const { exit, out } = runGate('verifier', [rec(highDet)]);
    expect(exit).toBe(0);
    expect(out.decision).toBe('allow');
    expect(out.systemMessage).toMatch(/JIAHAO DEGRADED/);
    expect(out.systemMessage).toMatch(/unblocked/);
  });

  test('audit F1: degraded + partial coverage still ESCALATEs, exit 2', () => {
    setupTree(ledgerAged(10));
    const { exit, out } = runGate('verifier', [rec(partialHighDet)]);
    expect(exit).toBe(2);
    expect(out.decision).toBe('block');
    expect(out.reason).toMatch(/ESCALATE \(partial coverage\)/);
    expect(out.reason).not.toMatch(/JIAHAO DEGRADED/);
  });

  test('fresh ledger + high severity still blocks, exit 2 (control)', () => {
    setupTree(ledgerAged(0));
    const { exit, out } = runGate('verifier', [rec(highDet)]);
    expect(exit).toBe(2);
    expect(out.decision).toBe('block');
    expect(out.reason).toMatch(/VERIFIER BLOCK \(high severity\)/);
  });

  test('warn (7mo ledger): soft-deadline banner rides pendingText on quiet path', () => {
    setupTree(ledgerAged(7));
    const { exit, out } = runGate('verifier', [rec(cleanDet)]);
    expect(exit).toBe(0);
    expect(out.systemMessage).toMatch(/RE-VERIFICATION DUE/);
  });

  test('audit F3: tampered ledger tail is treated as broken chain -> degraded', () => {
    const ledger = ledgerAged(0);
    ledger[0].collected_at = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(); // mutate without re-hash -> hash mismatch
    setupTree(ledger);
    const { exit, out } = runGate('verifier', [rec(highDet)]);
    expect(exit).toBe(0);
    expect(out.decision).toBe('allow');
    expect(out.systemMessage).toMatch(/JIAHAO DEGRADED/);
  });
});
