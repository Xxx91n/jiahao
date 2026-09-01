// test/adr-0036-wiring.test.js — ADR-0036 wiring assertions (D1 convention).
// D2 corpus resolver + install seeding; D6 leak gate; D4 params consistency;
// D5 freshness ladder arithmetic and state machine.

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const paths = require('../src/shared/paths');
const leak = require('../scripts/check-corpus-leak.js');
const params = require('../scripts/check-gate-params.js');
const fresh = require('../scripts/check-corpus-freshness.js');
const { MONTH_MS } = require('../src/reverify-schedule.js');

describe('D2 corpus resolution', () => {
  test('corpusPath falls back to install dir; JIAHAO_CORPUS_DIR wins', () => {
    const prev = process.env.JIAHAO_CORPUS_DIR;
    delete process.env.JIAHAO_CORPUS_DIR;
    expect(paths.corpusPath('probes.jsonl')).toBe(path.join(paths.configDir(), 'private', 'bench-corpus', 'probes.jsonl'));
    process.env.JIAHAO_CORPUS_DIR = '/x/y';
    expect(paths.corpusPath('twins.jsonl')).toBe(path.join('/x/y', 'twins.jsonl'));
    if (prev === undefined) delete process.env.JIAHAO_CORPUS_DIR; else process.env.JIAHAO_CORPUS_DIR = prev;
  });

  test('repo-private corpus is readable from the maintainer tree', () => {
    expect(fs.existsSync(paths.repoCorpusPath('probes.jsonl'))).toBe(true);
  });

  test('requireCorpus exits 1 [config]: with the ADR-0038 D3 env-override hint when the corpus is truly absent (ADR-0041 D3 cutover)', () => {
    // Relocate the module out of the repo so its repo-private fallback also
    // resolves to nothing; env points at an empty dir. Assert the real exit 1.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-absent-'));
    try {
      const modPath = path.join(tmp, 'paths.js');
      fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'paths.js'), modPath);
      const empty = path.join(tmp, 'empty');
      fs.mkdirSync(empty);
      const r = spawnSync(process.execPath, ['-e',
        "process.env.JIAHAO_CORPUS_DIR=process.argv[1]; require(process.argv[2]).requireCorpus('probes.jsonl'); console.log('NO-EXIT');",
        empty, modPath], { encoding: 'utf8' });
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/^\[config\]:/m);
      expect(r.stderr).toMatch(/JIAHAO_CORPUS_DIR/);
      expect(r.stdout).not.toMatch(/NO-EXIT/);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
});

describe('D2 thresholds.json private_corpus anchors', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'), 'utf8'));
  test('private_corpus lists the four corpora with sha256', () => {
    expect(Array.isArray(cfg.private_corpus)).toBe(true);
    expect(cfg.private_corpus).toHaveLength(4);
    for (const e of cfg.private_corpus) expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
  test('public anchors match the local corpus bytes', () => {
    for (const e of cfg.private_corpus) {
      const buf = fs.readFileSync(paths.repoCorpusPath(e.id));
      expect(crypto.createHash('sha256').update(buf).digest('hex')).toBe(e.sha256);
    }
  });
});

describe('D6 check-corpus-leak', () => {
  const corpusDir = path.join(ROOT, 'private', 'bench-corpus');
  const rules = leak.buildRules({ 'probes.jsonl': path.join(corpusDir, 'probes.jsonl'), 'judge-twins.jsonl': path.join(corpusDir, 'judge-twins.jsonl'), 'twins.jsonl': path.join(corpusDir, 'twins.jsonl'), 'mr-probes.jsonl': path.join(corpusDir, 'mr-probes.jsonl') });

  test('real worktree scan is clean', () => {
    expect(leak.checkLeaks(ROOT, rules, null)).toEqual([]);
  });

  test('planted copy in a scanned dir is detected (line + whole file)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-leak-'));
    try {
      const src = fs.readFileSync(path.join(corpusDir, 'probes.jsonl'), 'utf8');
      fs.writeFileSync(path.join(tmp, 'stash.txt'), src, 'utf8');
      const hits = leak.checkLeaks(tmp, rules, null);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0]).toMatch(/probes\.jsonl/);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });

  test('skip list excludes the corpus home and node_modules from walking', () => {
    expect(leak.SKIP_DIRS.has('private')).toBe(true);
    expect(leak.SKIP_DIRS.has('node_modules')).toBe(true);
  });

  test('canary GUID is optional detection-only (env-driven)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-canary-'));
    try {
      fs.writeFileSync(path.join(tmp, 'doc.md'), 'text\ncanary-12345-xyz\n', 'utf8');
      expect(leak.checkLeaks(tmp, rules, 'canary-12345-xyz').length).toBe(1);
      expect(leak.checkLeaks(tmp, rules, null)).toEqual([]);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
});

describe('D4 gate params declaration-vs-execution', () => {
  test('parseFlags extracts bool and value flags', () => {
    expect(params.parseFlags('node x.js --ci --artifacts-dir probe-artifacts')).toEqual({ ci: true, 'artifacts-dir': 'probe-artifacts' });
    expect(params.parseFlags('npm test')).toEqual({});
  });
  test('every gates.json entry declares params that match its command', () => {
    const { loadRegistry } = require('../scripts/run-gates.js');
    expect(params.checkParams(loadRegistry())).toEqual([]);
  });
  test('drift is caught: undeclared flag or wrong value fails', () => {
    const reg = { entries: [{ name: 'x', command: 'node s.js --newflag', params: {} }] };
    expect(params.checkParams(reg).join('\n')).toMatch(/newflag/);
    const reg2 = { entries: [{ name: 'y', command: 'node s.js --ci', params: { ci: true, extra: true } }] };
    expect(params.checkParams(reg2).length).toBeGreaterThan(0);
  });
});

describe('D5 corpus freshness ladder', () => {
  const NOW = Date.parse('2026-08-30T00:00:00Z');
  test('6/9 = 6 x 1.5 and 18 = 12 x 1.5 (the ADR-0030 dead-man re-derivation)', () => {
    const a = fresh.ladderMonths(6, 1.5);
    expect(a).toEqual({ warnMonthly: 6, failMonthly: 9 });
    expect(fresh.ladderMonths(12, 1.5).failMonthly).toBe(18);
  });
  test('state machine: fresh < tier <= warn < tier*mult <= stale; unknown fact = stale', () => {
    expect(fresh.freshnessState(NOW - 3 * MONTH_MS, 6, NOW, 1.5)).toBe('fresh');
    expect(fresh.freshnessState(NOW - 7 * MONTH_MS, 6, NOW, 1.5)).toBe('warn');
    expect(fresh.freshnessState(NOW - 10 * MONTH_MS, 6, NOW, 1.5)).toBe('stale');
    expect(fresh.freshnessState(null, 6, NOW, 1.5)).toBe('stale');
  });
  test('config tiers and multiplier as declared (half-yearly 6, yearly 12, mult 1.5)', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'corpus-freshness.json'), 'utf8'));
    expect(cfg.fail_multiplier).toBe(1.5);
    expect(cfg.tiers).toEqual({ 'probes.jsonl': 6, 'judge-twins.jsonl': 6, 'mr-probes.jsonl': 6, 'twins.jsonl': 12 });
  });
  test('the CLI is green against the current corpus + ledger', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-corpus-freshness.js')], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(0);
  });
});

describe('ADR-0036 audit follow-ups (2026-08-31)', () => {
  const corpusDirA = path.join(ROOT, 'private', 'bench-corpus');
  const NAMES = ['probes.jsonl', 'judge-twins.jsonl', 'mr-probes.jsonl', 'twins.jsonl'];

  test('freshness: a future timestamp fails closed (stale, never fresh)', () => {
    const NOW = Date.parse('2026-08-30T00:00:00Z');
    expect(fresh.freshnessState(NOW + 60 * 1000, 6, NOW, 1.5)).toBe('stale');
    expect(fresh.freshnessState(NOW + 200 * 24 * 3600 * 1000, 6, NOW, 1.5)).toBe('stale');
  });

  test('leak gate D6 scope: whole-line match only (Deviation D6a locks the semantics)', () => {
    const line = fs.readFileSync(path.join(corpusDirA, 'probes.jsonl'), 'utf8')
      .split(/\r?\n/).map(l => l.trim()).find(l => l.length >= 24);
    expect(line).toBeTruthy();
    const rules = leak.buildRules(Object.fromEntries(NAMES.map(n => [n, path.join(corpusDirA, n)])));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-scope-'));
    try {
      // the corpus line as its own line inside another file IS a hit
      fs.writeFileSync(path.join(tmp, 'a.txt'), 'prefix line\n' + line + '\nsuffix line\n', 'utf8');
      expect(leak.checkLeaks(tmp, rules, null)).toHaveLength(1);
      // the same text embedded inline on a longer line is intentionally out of
      // scope (Deviation D6a: shard n-grams false-positive on rule text the repo
      // legitimately shares - the whole-line fingerprint is the honest boundary)
      fs.rmSync(path.join(tmp, 'a.txt'));
      fs.writeFileSync(path.join(tmp, 'b.txt'), 'xx inline: ' + line + ' done\n', 'utf8');
      expect(leak.checkLeaks(tmp, rules, null)).toEqual([]);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });

  test('anchor validation checks the id set, not just the count (fail closed)', () => {
    const files = Object.fromEntries(NAMES.map(n => [n, path.join(corpusDirA, n)]));
    const sha = n => crypto.createHash('sha256').update(fs.readFileSync(files[n])).digest('hex');
    const good = NAMES.map(n => ({ id: n, sha256: sha(n) }));
    expect(leak.validateAnchors(good, files)).toBeNull();
    const missingId = good.filter(a => a.id !== 'twins.jsonl').concat([{ id: 'evil.jsonl', sha256: sha('twins.jsonl') }]);
    expect(leak.validateAnchors(missingId, files).code).toBe(1); // ADR-0041 D3: config failure is exit 1, never 2
    const badSha = good.map(a => (a.id === 'twins.jsonl' ? Object.assign({}, a, { sha256: '0'.repeat(64) }) : a));
    expect(leak.validateAnchors(badSha, files).code).toBe(1);
  });

  test('leak CLI also scans the evidence log outside the worktree', () => {
    const line = fs.readFileSync(path.join(corpusDirA, 'probes.jsonl'), 'utf8')
      .split(/\r?\n/).map(l => l.trim()).find(l => l.length >= 24);
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-ev-'));
    try {
      fs.writeFileSync(path.join(home, '.jiahao-evidence'), 'gate log tail\n' + line + '\n', 'utf8');
      const env = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: home });
      delete env.JIAHAO_CORPUS_DIR;
      const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-corpus-leak.js')], { cwd: ROOT, encoding: 'utf8', env });
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/evidence-log/);
    } finally { fs.rmSync(home, { recursive: true, force: true }); }
  });
});
