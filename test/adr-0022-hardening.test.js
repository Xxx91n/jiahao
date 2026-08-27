// test/adr-0022-hardening.test.js — ADR-0022 D1-D5 unit + D7 adversarial fixtures.
const { detectFull, capField, TRUNC_MARKER, INPUT_CAP_BYTES } = require('../src/detector');
const { createRecord: createEvidence } = require('../src/evidence-log');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = path.join(os.tmpdir(), 'jiahao-adr0022-test').replace(/\\/g, '/');

function runGate(profile, records) {
  fs.mkdirSync(TMP, { recursive: true });
  fs.writeFileSync(TMP + '/.jiahao-active', 'full', 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-profile', profile, 'utf8');
  fs.writeFileSync(TMP + '/.jiahao-evidence', JSON.stringify(records), 'utf8');
  const input = JSON.stringify({ stop_hook_active: false });
  try {
    const out = execSync('echo \'' + input + '\' | node hooks/jiahao-verdict-gate.js', {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 10000, shell: 'bash',
      cwd: path.join(__dirname, '..'),
    });
    return { exit: 0, out: JSON.parse(out) };
  } catch (e) {
    return { exit: e.status, out: JSON.parse(e.stdout) };
  }
}
afterEach(() => { ['.jiahao-profile', '.jiahao-active', '.jiahao-evidence'].forEach(f => { try { fs.unlinkSync(TMP + '/' + f); } catch (e) {} }); });

describe('ADR-0022 D1/D3/D5 truncation gate + degradation contract', () => {
  test('small input: coverage full, degradation null', () => {
    const r = detectFull({ closingText: 'ok', toolResults: [] });
    expect(r.coverage).toBe('full');
    expect(r.degradation).toEqual({ kind: null, detail: null });
  });

  test('capField never splits a surrogate pair', () => {
    const s = 'a'.repeat(INPUT_CAP_BYTES - 1) + '\u{1F600}' + 'b'.repeat(10000);
    const c = capField(s);
    expect(c.capped).toBe(true);
    expect(c.text.includes('\uFFFD')).toBe(false);
    expect(c.text.endsWith(TRUNC_MARKER)).toBe(true);
    expect(c.seen).toBeLessThanOrEqual(INPUT_CAP_BYTES);
    expect(c.total).toBeGreaterThan(INPUT_CAP_BYTES);
  });

  test('D7 fixture: 10 MB transcript — no crash, censoring metadata, coverage partial', () => {
    const toolResults = [{ output: 'a'.repeat(10 * 1024 * 1024) }];
    const t0 = Date.now();
    const r = detectFull({ closingText: '', toolResults });
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(r.coverage).toBe('partial');
    expect(r.degradation.kind).toBe('truncation');
    expect(r.degradation.detail).toEqual({ truncated: true, bytes_seen: INPUT_CAP_BYTES, bytes_total: 10 * 1024 * 1024, threshold: INPUT_CAP_BYTES });
  }, 15000);

  test('D7 fixture: closingText over threshold — marker + kind, claim beyond face not matched', () => {
    const r = detectFull({ closingText: 'x'.repeat(70000) + '\u641e\u5b9a', toolResults: [] });
    expect(r.degradation.kind).toBe('truncation');
    expect(r.degradation.detail.bytes_seen).toBe(INPUT_CAP_BYTES);
    expect(r.matched_phrases).toEqual([]);
    expect(capField('y'.repeat(70000)).text.endsWith(TRUNC_MARKER)).toBe(true);
  });
});

describe('ADR-0022 D2: pages cap', () => {
  test('D7 fixture: 8001 pages — no RangeError, exhaustion pairing abandoned', () => {
    const pages = [];
    for (let i = 1; i <= 8001; i++) pages.push({ output: 'item-' + i });
    const r = detectFull({ closingText: 'complete list, all 8001 items fetched.', toolResults: pages });
    // audit-fix G1: abandoned exhaustion pairing is scan-skip, not silent full coverage
    expect(r.coverage).toBe('partial');
    expect(r.degradation.kind).toBe('scan-skip');
    expect(r.degradation.detail.scans).toContain('pagination-exhaustion');
    expect(r.degradation.detail.pages_seen).toBeGreaterThan(4096);
    // claim unproven => stays armed => high severity
    expect(r.severity).toBe('high');
  });
});

describe('ADR-0022 audit-fix G2: wordlist missing => scan-skip', () => {
  test('isolated module with broken wordlist => degradation scan-skip + partial coverage', () => {
    const path = require('path');
    const os = require('os');
    // JIAHAO_WORDLIST is the highest-priority wordlist override; pointing it at a
    // missing file forces loadPhrases() into the degraded state deterministically.
    const prev = process.env.JIAHAO_WORDLIST;
    process.env.JIAHAO_WORDLIST = path.join(os.tmpdir(), 'jiahao-no-such-' + process.pid + '.json');
    let det;
    try {
      jest.isolateModules(() => { det = require('../src/detector'); });
    } finally {
      if (prev === undefined) delete process.env.JIAHAO_WORDLIST; else process.env.JIAHAO_WORDLIST = prev;
    }
    const r = det.detectFull({ closingText: 'all items fetched', toolResults: [{ output: 'x' }] });
    expect(r.wordlist_degraded).toBe(true);
    expect(r.degradation.kind).toBe('scan-skip');
    expect(r.degradation.detail.scans).toContain('wordlist');
    expect(r.coverage).toBe('partial');
  });
});

describe('ADR-0022 D4: gate profile split on coverage', () => {
  const det = detectFull({ closingText: '', toolResults: [{ output: 'a'.repeat(10 * 1024 * 1024) }] });
  const rec = () => createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null, { detector: det });

  test('record keeps coverage+degradation on chain', () => {
    const r = rec();
    expect(r.detector.coverage).toBe('partial');
    expect(r.detector.degradation.kind).toBe('truncation');
    expect(r.detector.degradation.detail.bytes_seen).toBe(INPUT_CAP_BYTES);
  });

  test('verifier: partial coverage routes to ESCALATE (block, exit 2)', () => {
    const { exit, out } = runGate('verifier', [rec()]);
    expect(exit).toBe(2);
    expect(out.decision).toBe('block');
    expect(out.reason).toMatch(/ESCALATE \(partial coverage\)/);
    expect(out.reason).toMatch(/jiahao resolve --verdict/);
  });

  test('generator: partial coverage is advisory only (allow, exit 0)', () => {
    const { exit, out } = runGate('generator', [rec()]);
    expect(exit).toBe(0);
    expect(out.decision).toBe('allow');
    expect(out.systemMessage).toMatch(/partial coverage/);
  });
});
