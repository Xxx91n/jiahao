// test/install.test.js — ADR-0011 §2 Tier 1 install CLI tests

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const INSTALL = path.join(root, 'scripts', 'install.js');
const TMP = require('os').tmpdir().replace(/\\/g, '/') + '/jiahao-install-test';

function run(args, env) {
  return spawnSync('node', [INSTALL, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 10000,
  });
}

beforeAll(() => { fs.mkdirSync(TMP, { recursive: true }); });

afterAll(() => {
  ['.jiahao-profile'].forEach(f => {
    try { fs.unlinkSync(path.join(TMP, f)); } catch (e) {}
  });
  // ADR-0014 D2 cleanup for wordlist planted by install.js
  ['phrases.json'].forEach(f => {
    try { fs.unlinkSync(path.join(TMP, 'private', f)); } catch (e) {}
  });
  try { fs.rmdirSync(path.join(TMP, 'private')); } catch (e) {}
});

test('--profile verifier writes flag and matches readProfile', () => {
  const r = run(['init', '--profile', 'verifier'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(0);
  expect(fs.readFileSync(path.join(TMP, '.jiahao-profile'), 'utf8').trim()).toBe('verifier');
  const { readProfile } = require('../hooks/jiahao-profile');
  const prev = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = TMP;
  try { expect(readProfile()).toBe('verifier'); }
  finally { if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR; else process.env.CLAUDE_CONFIG_DIR = prev; }
});

test('--profile generator writes generator', () => {
  const r = run(['init', '--profile', 'generator'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(0);
  expect(fs.readFileSync(path.join(TMP, '.jiahao-profile'), 'utf8').trim()).toBe('generator');
  expect(r.stdout).toContain('Verifier Deployment Discipline');
});

test('invalid --profile exits 2', () => {
  const r = run(['init', '--profile', 'bogus'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(2);
  expect(r.stderr).toContain('Invalid profile');
});

test('non-interactive without --profile prints command and exits 1', () => {
  const r = run(['init'], { CLAUDE_CONFIG_DIR: TMP, CI: 'true' });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('jiahao init --profile verifier');
});

test('-y accepts default verifier', () => {
  // stdin.isTTY is false under spawn pipes, but -y must bypass before prompt
  const r = run(['init', '-y'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(0);
  expect(fs.readFileSync(path.join(TMP, '.jiahao-profile'), 'utf8').trim()).toBe('verifier');
});

test('--dry-run prints target without writing', () => {
  const target = path.join(TMP, '.jiahao-profile');
  try { fs.unlinkSync(target); } catch (e) {}
  const r = run(['init', '--profile', 'generator', '--dry-run'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(0);
  expect(r.stdout).toContain('dry-run');
  expect(fs.existsSync(target)).toBe(false);
});

test('unknown subcommand exits 1 with message', () => {
  const r = run(['frobnicate'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("unknown command 'frobnicate'");
});

test('--profile without value exits 1 with argument-missing message', () => {
  const r = run(['init', '--profile'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("option '--profile <value>' argument missing");
});

test('--help exits 0 and documents usage', () => {
  const r = run(['--help'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(0);
  expect(r.stdout).toContain('--profile generator|verifier');
});

// ADR-0014 D2 — the installed wordlist lives outside the cwd,
// and detector.loadPhrases can resolve it via CLAUDE_CONFIG_DIR.
test('ADR-0014 D2: install plants private wordlist outside cwd', () => {
  const r = run(['init', '--profile', 'verifier'], { CLAUDE_CONFIG_DIR: TMP });
  expect(r.status).toBe(0);
  const planted = path.join(TMP, 'private', 'phrases.json');
  expect(fs.existsSync(planted)).toBe(true);

  // Detector must be able to resolve it when CLAUDE_CONFIG_DIR is set.
  process.env.CLAUDE_CONFIG_DIR = TMP;
  const detPath = require.resolve(path.join(root, 'src', 'detector.js'));
  delete require.cache[detPath];
  const det = require(detPath);
  const { path: phrasesPath, source } = det.resolvePhrasesPath();
  expect(phrasesPath).toBe(planted);
  expect(source).toBe('config-private');  // planted at <config>/private/phrases.json
  delete require.cache[detPath];
  delete process.env.CLAUDE_CONFIG_DIR;
});
