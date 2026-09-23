'use strict';
// test/adr-0083-wiring.test.js - grill-t24 documentation round pins.
// Scope: the never-commit registry schema + seed coverage + tracked-tree
// cleanliness, the AGENTS.md allowlist clause, the captured-at-head
// provenance-header shape on committed t24 captures, the ci.yml suite-count
// sync obligation (glob equality + lower bound + known-file hit), the
// defer-0069 registration, the t24 trend row, the CONTEXT umbrella term.
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const ADR = path.join(ROOT, 'docs', 'adr', '0083-declared-vs-actual-drift-clauses.md');
const NC = path.join(ROOT, 'docs', 'governance', 'never-commit.json');
const TREND = path.join(ROOT, 'docs', 'governance', 'trend-inventory.json');
const REG = path.join(ROOT, 'docs', 'deferred-registry.json');
const CTX = path.join(ROOT, 'CONTEXT.md');
const AGENTS = path.join(ROOT, 'AGENTS.md');
const EVD_REL = '.scratch/grill-t24/evidence';
const BASE = 'c526de301c5d2d25e653bc910a80a9ae56dd252a'; // t24 round base (t23 merge)
const COVERAGE_BASE = 'fc390d5e778db567d12b072f7a25cbf1e73b03f8'; // t25 re-anchor: the latest row is now grill-t25's, so the coverage diff window pairs with the t25 base (ADR-0081 D-A convention, re-anchored grill-t25)
const HEAD_RE = /^captured-at-head: ([0-9a-f]{7,40})$/;

function committedUnder(relDir) {
  return execFileSync('git', ['ls-tree', '-r', 'HEAD', '--name-only', '--', relDir], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
}

describe('ADR-0083 doc surface (grill-t24 drift-clause round)', () => {
  test('title, status, date, ledger + spec anchors', () => {
    const a = read(ADR);
    expect(a).toContain('# ADR-0083:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-23');
    expect(a).toContain('grill-t24/decision-ledger.md');
    expect(a).toContain('spec-t24-disposition.md');
  });

  test('D-A evidence freshness: ordering invariant + idempotent endpoint + captured-at-head + qualification/archival split', () => {
    const a = read(ADR);
    expect(a).toContain('last content-mutating commit');
    expect(a).toContain('idempotent endpoint');
    expect(a).toContain('captured-at-head: <sha>');
    expect(a).toContain('Qualification/archival split');
  });

  test('D-B never-commit single-sourcing: id-referenced labels + same-commit coupling + deprecate-not-delete', () => {
    const a = read(ADR);
    expect(a).toContain('docs/governance/never-commit.json');
    expect(a).toContain('nc-NNN');
    expect(a).toContain('Deprecate-not-delete');
    expect(a).toContain('same commit');
    expect(a).toContain('ADR-0027');
  });

  test('D-C commit allowlist + post-commit inspection (self-drafted, receipts named)', () => {
    const a = read(ADR);
    expect(a).toContain('allowlist');
    expect(a).toContain('git show --name-only');
    expect(a).toContain('self-drafted');
  });

  test('D-D suite-count sync obligation codified', () => {
    const a = read(ADR);
    expect(a).toContain('--expected-suites');
    expect(a).toContain('glob(test/*.test.js)');
    expect(a).toContain('equal-wrong-values');
  });

  test('D-E audit-window inheritance: the three check lines declared mandatory scope', () => {
    const a = read(ADR);
    expect(a).toContain('audit window');
    expect(a).toContain('MUST');
    expect(a).toContain('evidence-freshness ordering check');
    expect(a).toContain('never-commit label coverage');
    expect(a).toContain('commit file-list conformance');
    expect(a).toContain('defer-0069');
  });

  test('never-commit.json registry validity (schema + rule shape + compilable patterns)', () => {
    const reg = readJson(NC);
    expect(reg.schema_version).toBe(1);
    expect(Array.isArray(reg.rules)).toBe(true);
    expect(reg.rules.length).toBeGreaterThanOrEqual(5);
    const seen = new Set();
    for (const r of reg.rules) {
      expect(r.id).toMatch(/^nc-\d{3}$/);
      expect(seen.has(r.id)).toBe(false);
      seen.add(r.id);
      expect(typeof r.reason).toBe('string');
      expect(r.reason.length).toBeGreaterThanOrEqual(20);
      expect(r.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['active', 'deprecated']).toContain(r.status);
      expect(() => new RegExp(r.pattern)).not.toThrow();
    }
  });

  test('registry seed covers the historical never-commit classes (positive probes + one negative)', () => {
    const reg = readJson(NC);
    const active = reg.rules.filter(function (r) { return r.status === 'active'; });
    const hits = (p) => active.some(function (r) { return new RegExp(r.pattern).test(p); });
    const probes = [
      '.scratch/grill-t23/audit-evidence/x.txt',
      '.scratch/grill-t21/audit2-evidence/x.txt',
      '.scratch/grill-t20/audit-evidence/round-diff.patch',
      '.scratch/grill-t17/audit-evidence/round-commits.txt',
      '.scratch/grill-t23/ref-assets/logo.png',
      'jiahao-0.0.1.tgz',
      'gate-all.log',
      'bench-artifacts/gate-metrics.json',
      'host-config-backup/agent.json',
      '.codex-tmp/work/x.txt',
    ];
    for (const p of probes) expect(hits(p)).toBe(true);
    expect(hits('docs/adr/0083-declared-vs-actual-drift-clauses.md')).toBe(false);
  });

  test('tracked tree is clean of every active never-commit rule (git ls-tree -r HEAD)', () => {
    const reg = readJson(NC);
    const active = reg.rules.filter(function (r) { return r.status === 'active'; });
    const tracked = execFileSync('git', ['ls-tree', '-r', 'HEAD', '--name-only'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    const hits = tracked.filter(function (f) {
      return active.some(function (r) { return new RegExp(r.pattern).test(f); });
    });
    // Grandfathered instances committed BEFORE the convention was codified -
    // a closed enumeration, not a license: any NEW match fails the suite.
    const LEGACY = [
      '.scratch/grill-t12/audit-evidence/round-commits.txt',
      '.scratch/grill-t12/audit-evidence/round-diff.patch',
      '.scratch/grill-t13/audit-evidence/reverify-2026-09-17.json',
      '.scratch/grill-t15/audit-evidence/audit-report-2026-09-18.md',
      '.scratch/grill-t7/reports/audit-diff.patch',
    ];
    expect(hits.slice().sort()).toEqual(LEGACY.slice().sort());
  });

  test('AGENTS.md carries the commit allowlist + post-commit inspection clause (D-C)', () => {
    const a = read(AGENTS);
    expect(a).toContain('allowlist');
    expect(a).toContain('git show --name-only');
    expect(a).toContain('ADR-0083 D-C');
  });

  test('t24 capture artifacts carry the captured-at-head provenance header resolving to a commit', () => {
    const evd = path.join(ROOT, EVD_REL.split('/').join(path.sep));
    const isCapture = function (f) { return /\.(txt|md)$/.test(f) && !/\.fixture\./.test(f); }; // *.fixture.* files are scan INPUTS, not captures
    const onDisk = fs.existsSync(evd)
      ? fs.readdirSync(evd).filter(isCapture)
      : [];
    expect(onDisk.length).toBeGreaterThanOrEqual(10); // floor: the acceptance battery leg set must exist on disk
    const committed = committedUnder(EVD_REL).filter(isCapture);
    const names = committed.concat(onDisk.map(function (f) { return EVD_REL + '/' + f; }));
    const seen = new Set();
    for (const f of names) {
      if (seen.has(f)) continue;
      seen.add(f);
      const first = read(path.join(ROOT, f.split('/').join(path.sep))).split(/\r?\n/)[0];
      const m = first.match(HEAD_RE);
      expect(m).not.toBeNull();
      const kind = execFileSync('git', ['cat-file', '-t', m[1]], { cwd: ROOT, encoding: 'utf8' }).trim();
      expect(kind).toBe('commit');
    }
  });

  test('D-A ordering invariant: every committed capture names a sha at-or-after the freshness anchor', () => {
    // Anchor = newest commit in BASE..HEAD whose diff touches anything
    // outside the non-anchoring set {evidence dir + faithful regen outputs}.
    const NON_ANCHOR = new Set(['docs/rewrite-map.json', 'docs/governance/anchors.json', '.scratch/grill-t24/round-facts.json', 'bench/research/out/g6-publish-replay.json', 'src/instrument-state.json']);
    const commits = execFileSync('git', ['rev-list', BASE + '..HEAD'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
      .filter(function (sha) {
        const subj = execFileSync('git', ['log', '--format=%s', '-1', sha], { cwd: ROOT, encoding: 'utf8' }).trim();
        return subj.indexOf('GitButler Workspace Commit') !== 0;
      });
    let anchor = null;
    for (const sha of commits) {
      const files = execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', sha], { cwd: ROOT, encoding: 'utf8' })
        .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      const anchoring = files.some(function (f) {
        return f.indexOf(EVD_REL + '/') !== 0 && !NON_ANCHOR.has(f);
      });
      if (anchoring) { anchor = sha; break; }
    }
    expect(anchor).not.toBeNull();
    for (const f of committedUnder(EVD_REL).filter(function (x) { return /\.(txt|md)$/.test(x) && !/\.fixture\./.test(x); })) { // *.fixture.* = scan inputs, not captures
      const first = read(path.join(ROOT, f.split('/').join(path.sep))).split(/\r?\n/)[0];
      const m = first.match(HEAD_RE);
      expect(m).not.toBeNull();
      const r = spawnSync('git', ['merge-base', '--is-ancestor', anchor, m[1]], { cwd: ROOT });
      expect(r.status).toBe(0); // anchor is ancestor-or-equal of the header sha: captured at-or-after the anchor
    }
  });
  test('ci.yml --expected-suites equals the live glob(test/*.test.js) count + lower bound + known-file hit', () => {
    const ci = read(path.join(ROOT, '.github', 'workflows', 'ci.yml'));
    const m = ci.match(/--expected-suites\s+(\d+)/);
    expect(m).not.toBeNull();
    const suites = fs.readdirSync(path.join(ROOT, 'test')).filter(function (f) { return /\.test\.js$/.test(f); });
    expect(Number(m[1])).toBe(suites.length);
    expect(suites.length).toBeGreaterThanOrEqual(79); // lower bound: a broken glob returning 0 cannot pass
    expect(suites).toContain('adr-0083-wiring.test.js'); // known-file hit: the glob saw this very suite
  });

  test('defer-0069 discharged-by-trigger: the 2026-09-23 audit named all three scope lines with verdicts', () => {
    const d = readJson(REG).entries.find(function (e) { return e.id === 'defer-0069'; });
    expect(d).toBeDefined();
    expect(d.status).toBe('closed');
    expect(d.closed_via).toContain('2026-09-23');
    expect(d.source_adr).toContain('0083');
    expect(d.review_at).toBe('2026-12-15');
    expect(d.cadence_tier).toBe('quarterly');
    expect(d.registered_at).toBe('2026-09-23');
    expect(d.unfreeze_if.check).toContain('audit window');
  });

  test('the t24 trend row is the declared single-file carve-out form', () => {
    const ti = readJson(TREND);
    const row = ti.rounds[ti.rounds.length - 1];
    expect(row.round).toBe('grill-t24-doc-round');
    expect(row.kind).toBe('documentation');
    expect(row.adr_added).toEqual(['0083']);
    expect(row.net_additions).toBe(1);
    expect(row.deferred_entry).toBe('defer-0069');
    expect(row.zero_product_diff).toBe(true);
    expect(row.carve_out_used).toBe(1);
    expect(row.governance_tooling_diff.files).toEqual(['.github/workflows/ci.yml']);
    expect(row.mechanism_output_diff.files).toContain('bench/research/out/g6-publish-replay.json');
  });

  test('coverage leg: the committed diff anchored at the current round base validates the latest row', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-governance-inventory.js'), '--coverage-base', COVERAGE_BASE], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(0);
  });

  test('CONTEXT umbrella term names the three narrow mechanisms verbatim', () => {
    const c = read(CTX);
    expect(c).toContain('**Declared-vs-Actual Drift (声明-实际漂移)**');
    const term = c.split('**Declared-vs-Actual Drift (声明-实际漂移)**')[1].split('**')[0].replace(/\s+/g, ' ');
    expect(term).toContain('frozen-tree final re-capture');
    expect(term).toContain('never-commit single-sourcing');
    expect(term).toContain('commit allowlist + post-commit inspection');
    expect(term).toContain('ADR-0083');
  });

  test('README index rebuilt: 83 records incl. ADR-0083', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('83 architecture decision records');
    expect(r).toContain('0083-declared-vs-actual-drift-clauses.md');
  });
});
