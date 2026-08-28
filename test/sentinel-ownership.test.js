// test/sentinel-ownership.test.js — ADR-0024 D5 acceptance
// D1 ownership arbitration, D2 append narrow-lock + inode check, D3 sweep.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync, execFileSync } = require('child_process');
const { begin, reconcile, PREFIX, sameFile } = require('../src/sentinel');
const { tryLockSync } = require('../src/file-lock');
const REPO = path.join(__dirname, '..');
const DIR = path.join(os.tmpdir(), 'jiahao-adr24-test');

function readEvidence() {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, '.jiahao-evidence'), 'utf8')); }
  catch (e) { return null; }
}

beforeEach(() => { fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true }); });
afterAll(() => { fs.rmSync(DIR, { recursive: true, force: true }); });

test('D1: fresh lock held by a live owner — reconcile skips, no record, file kept', () => {
  const file = path.join(DIR, PREFIX + 'live-hook');
  fs.writeFileSync(file, JSON.stringify({ hook: 'live-hook', phase: 'scan', started_at: 'x' }), 'utf8');
  const release = tryLockSync(file); // same fd-lifetime semantics as begin()
  expect(typeof release).toBe('function');
  const healed = reconcile(DIR);
  expect(healed).toEqual([]);
  expect(fs.existsSync(file)).toBe(true);
  expect(readEvidence()).toBeNull();
  release();
});

test('D1: owner gone (lock released) — residual is healed with ownership=locked', () => {
  const file = path.join(DIR, PREFIX + 'dead-hook');
  fs.writeFileSync(file, JSON.stringify({ hook: 'dead-hook', phase: 'verify', started_at: 't0' }), 'utf8');
  // hint of a previous lifecycle: lock existed and is already gone
  const healed = reconcile(DIR);
  expect(healed).toEqual(['dead-hook']);
  expect(fs.existsSync(file)).toBe(false);
  const chain = readEvidence();
  expect(chain).toHaveLength(1);
  expect(chain[0].detector.degradation.detail.ownership).toBe('locked');
});

test('D1: SIGKILLed holder — fresh lock still held (skip), then stale reclaim heals', (done) => {
  const child = spawn(process.execPath, [path.join(REPO, 'test', 'fixtures', 'sentinel-child.js'), path.join(REPO,'src','sentinel.js'), 'sigkill-hook', DIR]);
  const file = path.join(DIR, PREFIX + 'sigkill-hook');
  const ld = file + '.lock';
  const poll = setInterval(() => {
    if (!fs.existsSync(file) || !fs.existsSync(file + '.lock')) return;
    clearInterval(poll);
    child.kill('SIGKILL');
    child.on('exit', () => {
      try {
        // kernel-side truth: mkdir lock persists post-kill, its mtime freezes.
        expect(fs.existsSync(ld)).toBe(true);
        // Window 1 — within STALE_MS the lock looks held: skip, keep the file.
        expect(reconcile(DIR)).toEqual([]);
        expect(fs.existsSync(file)).toBe(true);
        // Window 2 — mtime older than STALE_MS: reclaim + heal (this is what
        // happens in practice — hosts killed the child minutes/hours ago).
        const old = new Date(Date.now() - 60000);
        fs.utimesSync(ld, old, old);
        expect(reconcile(DIR)).toContain('sigkill-hook');
        expect(fs.existsSync(file)).toBe(false);
        expect(readEvidence()).toHaveLength(1);
        done();
      } catch (e) { done(e); }
    });
  }, 25);
}, 15000);

test('D2a: concurrent appends from two processes do not lose records', (done) => {
  const args = (id) => [path.join(REPO, 'test', 'fixtures', 'append-writer.js'), path.join(REPO,'src','evidence-log.js'), DIR, id, '30'];
  let pending = 2, failed = null;
  const fin = (code) => { if (code !== 0) failed = code; if (--pending === 0) {
    try {
      expect(failed).toBeNull();
      const chain = readEvidence();
      expect(chain).toHaveLength(60); // a-0..29 + b-0..29, zero lost update
      const em = new Set(chain.map(r => r._idem));
      expect(em.size).toBe(60);
      done();
    } catch (e) { done(e); }
  } };
  spawn(process.execPath, args('a')).on('exit', fin);
  spawn(process.execPath, args('b')).on('exit', fin);
}, 20000);

test('D2b: sameFile() — inode identity check', () => {
  const f1 = path.join(DIR, 'a.tmp');
  fs.writeFileSync(f1, 'x');
  const s0 = fs.statSync(f1);
  expect(sameFile(s0, fs.statSync(f1))).toBe(true);
  fs.unlinkSync(f1);
  fs.writeFileSync(f1, 'y'); // new inode, same name
  const s1 = fs.statSync(f1);
  expect(sameFile(s0, s1)).toBe(false);
  expect(sameFile(s0, null)).toBe(false);
});

test('D3: sweep script exits 0 and heals residuals (SessionEnd e2e)', () => {
  const file = path.join(DIR, PREFIX + 'sweep-hook');
  fs.writeFileSync(file, JSON.stringify({ hook: 'sweep-hook', phase: 'write', started_at: 'z' }), 'utf8');
  const env = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: DIR });
  const r = spawnSync(process.execPath, [path.join(REPO, 'hooks', 'jiahao-sweep.js')], { env, encoding: 'utf8' });
  expect(r.status).toBe(0);
  expect(fs.existsSync(file)).toBe(false);
  expect(readEvidence()).toHaveLength(1);
});

test('D3: SessionEnd registered in both hook manifests', () => {
  const claude = JSON.parse(fs.readFileSync(path.join(REPO, 'hooks', 'jiahao-hooks.json'), 'utf8'));
  const codex = JSON.parse(fs.readFileSync(path.join(REPO, 'adapters', 'codex', 'hooks.json'), 'utf8'));
  expect(claude.hooks.SessionEnd[0].hooks[0].command).toContain('jiahao-sweep.js');
  expect(codex.hooks.SessionEnd[0].hooks[0].command).toContain('jiahao-sweep.js');
});
