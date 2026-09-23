// test/rewrite-map.test.js \u2014 ADR-0074 D-C wiring: generated rewrite map
// completeness, classification truth, and the secret-scan tripwire (defer-0054).
const { execFileSync, spawnSync } = require('child_process');


const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'docs', 'rewrite-map.json');
const MAP = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
const CLASSES = ['rewritten', 'local-only', 'published-unchanged'];

// Clone-degradability contract (grill-t25): the old-side gb-local/* refs are a
// maintainer-object-store asset that never publishes. Where they are absent
// (fresh public clone) --check/--verify exit 2 UNVERIFIABLE instead of a red
// run; --published-only covers the clone-verifiable subset everywhere.
const HAS_OLD_SIDE = (function () {
  try {
    return execFileSync('git', ['for-each-ref', '--format=%(refname)', 'refs/remotes/gb-local/'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').some(function (r) { return r.trim() && r.indexOf('gitbutler') === -1; });
  } catch (e) { return false; }
})();


function run(args) {
  return execFileSync('node', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

describe('rewrite-map.json \u2014 generated single translation point', () => {
  test('shape + committed-file invariants', () => {
    expect(MAP.schema_version).toBe(1);
    expect(MAP.generated_by).toBe('scripts/build-rewrite-map.js');
    expect(MAP.published_tip).toMatch(/^[0-9a-f]{40}$/);
    expect(MAP.boundary.shared_base).toMatch(/^[0-9a-f]{40}$/);
    expect(MAP.boundary.old_tip).toMatch(/^[0-9a-f]{40}$/);
    expect(MAP.boundary.new_counterpart).toMatch(/^[0-9a-f]{40}$/);
    expect(MAP.sides.old_refs.length).toBeGreaterThan(0);
    expect(MAP.sides.new_refs).toContain('origin/main');
    // the map never cites itself (self-scan would make regen unstable)
    expect(MAP.doc_refs.some(d => d.file === 'docs/rewrite-map.json')).toBe(false);
  });

  test('every doc citation carries one of the three registered classes', () => {
    expect(MAP.doc_refs.length).toBeGreaterThan(0);
    for (const d of MAP.doc_refs) {
      expect(CLASSES).toContain(d.class);
      expect(d.sha).toMatch(/^[0-9a-f]{7,40}$/);
      expect(d.sha).toMatch(/[a-f]/); // all-digit tokens are numeric literals
      if (d.class === 'rewritten') expect(d.resolved_to).toMatch(/^[0-9a-f]{40}$/);
    }
    expect(MAP.counts.doc_refs).toBe(MAP.doc_refs.length);
    // T-3 F-9: spec-mandated forms — same rows emitted explicitly (shared
    // commits below the boundary); removed rows carry new:null when present.
    expect(Array.isArray(MAP.same)).toBe(true);
    expect(MAP.same.length).toBeGreaterThan(0);
    expect(MAP.same[0].sha).toMatch(/^[0-9a-f]{40}$/);
    for (const r of MAP.removed) expect(r.new).toBeNull();
    expect(MAP.sides.old_refs.every(r => r.indexOf('gitbutler') === -1)).toBe(true);
  });

  test('known anchors classify correctly', () => {
    const cls = (sha) => MAP.doc_refs.filter(d => d.sha === sha).map(d => d.class);
    // pre-purge rewritten commits cited in docs resolve to their new SHAs
    for (const h of MAP.doc_refs.filter(d => d.sha === '05fa697')) {
      expect(h.class).toBe('rewritten');
      expect(h.resolved_to).toMatch(/^2e9cdc9/);
    }
    for (const h of MAP.doc_refs.filter(d => d.sha === '2c93a30')) {
      expect(h.class).toBe('rewritten');
      expect(h.resolved_to).toMatch(/^3454d13/);
    }
    // the published tip and the shared base are published-unchanged
    for (const h of MAP.doc_refs.filter(d => d.sha === '051744a')) expect(h.class).toBe('published-unchanged');
    for (const h of MAP.doc_refs.filter(d => d.sha === '1ca81f5')) expect(h.class).toBe('published-unchanged');
    expect(cls('051744a').length).toBeGreaterThan(0);
  });

  test('commits rows: every pair shares subject; published_only recorded', () => {
    for (const c of MAP.commits) {
      expect(c.old).toMatch(/^[0-9a-f]{40}$/);
      expect(c.new).toMatch(/^[0-9a-f]{40}$/);
      expect(c.old).not.toBe(c.new);
    }
    const publishedOnlyShas = MAP.published_only.map(p => p.new.slice(0, 7));
    expect(publishedOnlyShas).toContain('051744a');
    expect(publishedOnlyShas).toContain('a6729a9');
    // the two registered empty commits carry the mechanical empty flag
    const emptyNew = MAP.commits.filter(c => c.empty).map(c => c.new.slice(0, 7));
    expect(emptyNew).toContain('b73e558');
    expect(emptyNew).toContain('e54c267');
  });

  test('--check green with old-side refs, exit-2 UNVERIFIABLE on a clone', () => {
    const r = spawnSync('node', ['scripts/build-rewrite-map.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
    const both = (r.stdout || '') + (r.stderr || '');
    if (HAS_OLD_SIDE) {
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('[rewrite-map] OK');
    } else {
      expect(r.status).toBe(2);
      expect(both).toContain('UNVERIFIABLE');
      expect(both).toContain('old-side-refs');
    }
  });

  test('--verify re-derives classifications and boundary truth (old-side present only)', () => {
    const r = spawnSync('node', ['scripts/build-rewrite-map.js', '--verify'], { cwd: ROOT, encoding: 'utf8' });
    if (HAS_OLD_SIDE) {
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('[rewrite-map] VERIFY OK');
    } else {
      expect(r.status).toBe(2);
      expect((r.stdout || '') + (r.stderr || '')).toContain('UNVERIFIABLE');
    }
  });

  test('--published-only asserts the clone-verifiable subset everywhere', () => {
    const r = spawnSync('node', ['scripts/build-rewrite-map.js', '--published-only'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('[rewrite-map] PUBLISHED-ONLY OK');
  });

  test('gate registered in docs/gates.json', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));
    const entry = g.entries.find(e => e.name === 'rewrite-map');
    expect(entry).toBeTruthy();
    expect(entry.command).toBe('node scripts/build-rewrite-map.js --check');
    expect(entry.requires).toContain('repo-tree');
  });
});

describe('check-secret-scan.js \u2014 defer-0054 tripwire (<=3 rules)', () => {
  const { RULES, scanFile } = require('../scripts/check-secret-scan.js');
  const os = require('os');

  test('rule count is the registered <=3 shape', () => {
    expect(RULES.length).toBeLessThanOrEqual(3);
    expect(RULES.map(r => r.id)).toEqual(['R1-private-key', 'R2-provider-token', 'R3-purged-path-class']);
  });

  test('planted samples are blocked by the expected rule', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-scan-'));
    const keyFile = path.join(dir, 'k.txt');
    // T-3 F-1: fixtures are assembled at runtime so the committed source never
    // contains a scannable literal — the scanner must still fire on the bytes.
    fs.writeFileSync(keyFile, '-----BEGIN ' + 'RSA PRIVATE KEY-----\nfake\n-----END ' + 'RSA PRIVATE KEY-----\n');
    const tokFile = path.join(dir, 't.txt');
    fs.writeFileSync(tokFile, 'token = "' + 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123456789' + '"\n');
    const envFile = path.join(dir, '.env');
    fs.writeFileSync(envFile, 'X=1\n');
    const keyRel = path.relative(ROOT, keyFile).split(path.sep).join('/');
    const tokRel = path.relative(ROOT, tokFile).split(path.sep).join('/');
    const envRel = path.relative(ROOT, envFile).split(path.sep).join('/');
    expect(scanFile(keyRel, () => fs.readFileSync(keyFile, 'utf8')).map(h => h.rule)).toContain('R1-private-key');
    expect(scanFile(tokRel, () => fs.readFileSync(tokFile, 'utf8')).map(h => h.rule)).toContain('R2-provider-token');
    expect(scanFile(envRel, () => 'X=1\n').map(h => h.rule)).toContain('R3-purged-path-class');
    expect(scanFile('host-config-backup/settings.json', () => '{}').map(h => h.rule)).toContain('R3-purged-path-class');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('enumeration covers the committed tree, not just the index (T-3 F-1)', () => {
    const { trackedFiles } = require('../scripts/check-secret-scan.js');
    const files = trackedFiles();
    expect(files).toContain('test/rewrite-map.test.js');
    expect(files).toContain('docs/rewrite-map.json');
  });

  test('clean tree passes the gate command', () => {
    const out = run(['scripts/check-secret-scan.js']);
    expect(out).toContain('[secret-scan] OK');
  });

  test('gate registered in docs/gates.json', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));
    const entry = g.entries.find(e => e.name === 'secret-scan');
    expect(entry).toBeTruthy();
    expect(entry.command).toBe('node scripts/check-secret-scan.js');
  });
});
