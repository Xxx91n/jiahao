'use strict';
// test/adr-0084-wiring.test.js - grill-t25 fix round pins.
// Scope: the clone-degradability contract (capability registration + probe
// + gate requires + the clone-sim exit-2 UNVERIFIABLE), the fourth audit line
// clause presence, the landing-tail / exception-narrowness / tag-timing /
// first-disclosure clauses, the t25 freshness ordering invariant re-roll
// (BASE=fc390d5, EVD=.scratch/grill-t25/evidence), the defer-0070/0071
// registrations, the countersign-queue ID-level-only labels with return
// conditions, the Re-Execution Prior directional event, and the t25 trend
// row shape.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const ADR = path.join(ROOT, 'docs', 'adr', '0084-public-clone-verifiability-clone-degradability-landing-tail-exception-tag-timing-first-disclosure.md');
const ADR83 = path.join(ROOT, 'docs', 'adr', '0083-declared-vs-actual-drift-clauses.md');
const GATES = path.join(ROOT, 'docs', 'gates.json');
const TREND = path.join(ROOT, 'docs', 'governance', 'trend-inventory.json');
const REG = path.join(ROOT, 'docs', 'deferred-registry.json');
const CTX = path.join(ROOT, 'CONTEXT.md');
const cap = require('../src/shared/capability');
const EVD_REL = '.scratch/grill-t25/evidence';
const BASE = 'fc390d5e778db567d12b072f7a25cbf1e73b03f8'; // t25 round base (public tip at round start)
const HEAD_RE = /^captured-at-head: ([0-9a-f]{7,40})$/;

function committedUnder(relDir) {
  return execFileSync('git', ['ls-tree', '-r', 'HEAD', '--name-only', '--', relDir], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
}

describe('ADR-0084 public-clone verifiability contract (grill-t25 fix round)', () => {
  test('title, status, date, ledger + spec anchors', () => {
    const a = read(ADR);
    expect(a).toContain('# ADR-0084:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-24');
    expect(a).toContain('grill-t25/decision-ledger.md');
    expect(a).toContain('spec-t25-disposition.md');
  });

  test('D-A clone-degradability: capability name verbatim + exit-2 channel + --published-only subsets', () => {
    const a = read(ADR);
    expect(a).toContain('old-side-refs');
    expect(a).toContain('UNVERIFIABLE');
    expect(a).toContain('--published-only');
    expect(a).toContain('citation coverage');
    expect(a).toContain('class enum');
    expect(a).toContain('count self-consistency');
    expect(a).toContain('exitUnverifiable');
  });

  test('D-B fourth mandatory audit line: public clone is the verification surface', () => {
    const a = read(ADR);
    expect(a).toContain('clean public clone');
    expect(a).toContain('maintainer object store');
    expect(a).toContain('gate:all');
  });

  test('D-C landing-tail + D-D exception narrowness + D-E tag timing + D-F first-disclosure', () => {
    const a = read(ADR);
    expect(a).toContain('re-capture wave');
    expect(a).toContain('non-anchoring');
    expect(a).toContain('stop-bleed');
    expect(a).toContain('annotated tag');
    expect(a).toContain('disclosed them FIRST');
    expect(a).toContain('bbf5259');
  });

  test('ADR-0083 gains only the pointer line - its own audit lines remain three', () => {
    const a = read(ADR83);
    expect(a).toContain('grill-t25 amendment');
    expect(a).toContain('ADR-0084 D-B');
    // the D-E list itself is untouched: three bullets, no fourth added
    const de = a.split('### D-E')[1].split('###')[0];
    expect(de.match(/^- \(i+\)/gm).length).toBe(3);
  });

  test('capability registration: closed enum + probe + gate requires', () => {
    expect(cap.CAPABILITIES).toContain('old-side-refs');
    expect(() => cap.probe('old-side-refs', { root: ROOT, env: {} })).not.toThrow();
    const reg = readJson(GATES);
    const rm = reg.entries.find(function (e) { return e.name === 'rewrite-map'; });
    expect(rm.requires).toContain('old-side-refs');
    const pub = reg.entries.find(function (e) { return e.name === 'rewrite-map-published'; });
    expect(pub).toBeDefined();
    expect(pub.command).toBe('node scripts/build-rewrite-map.js --published-only');
    expect(pub.requires).toEqual(['repo-tree']);
    expect(pub.source_adr).toContain('0084');
  });

  test('clone-sim: a git-init tree without gb-local/* degrades to exit-2 UNVERIFIABLE', () => {
    // A real temp git repo (init, zero gb-local refs) + the registry +
    // script + capability helper - the capability probe is the only thing
    // separating a clone from the maintainer store.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0084-'));
    fs.mkdirSync(path.join(tmp, 'scripts'));
    fs.mkdirSync(path.join(tmp, 'src', 'shared'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'build-rewrite-map.js'), path.join(tmp, 'scripts', 'build-rewrite-map.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'capability.js'), path.join(tmp, 'src', 'shared', 'capability.js'));
    fs.copyFileSync(path.join(ROOT, 'docs', 'gates.json'), path.join(tmp, 'docs', 'gates.json'));
    execFileSync('git', ['init', '-q'], { cwd: tmp });
    execFileSync('git', ['add', '-A'], { cwd: tmp });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: tmp });
    const r = spawnSync(process.execPath, ['scripts/build-rewrite-map.js', '--check'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('::error title=UNVERIFIABLE,gate=rewrite-map,requires=old-side-refs::');
    expect(r.stderr).toMatch(/UNVERIFIABLE/);
  });

  test('t25 capture artifacts carry the captured-at-head provenance header resolving to a commit', () => {
    const evd = path.join(ROOT, EVD_REL.split('/').join(path.sep));
    const isCapture = function (f) { return /\.(txt|md)$/.test(f) && !/\.fixture\./.test(f); };
    const onDisk = fs.existsSync(evd) ? fs.readdirSync(evd).filter(isCapture) : [];
    const committed = committedUnder(EVD_REL).filter(isCapture);
    // bootstrap-safe: before the first capture wave commits, the directory
    // may be absent - the ordering leg below is then vacuous and the floor
    // is asserted once evidence exists.
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
    if (fs.existsSync(evd)) expect(onDisk.length).toBeGreaterThanOrEqual(10);
  });

  test('D-A ordering invariant re-roll: every committed t25 capture names a sha at-or-after the freshness anchor', () => {
    const NON_ANCHOR = new Set(['docs/rewrite-map.json', 'docs/governance/anchors.json', '.scratch/grill-t25/round-facts.json', 'bench/research/out/g6-publish-replay.json', 'src/instrument-state.json']);
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
      const anchoring = files.some(function (f) { return !/^\.scratch\/grill-t\d+\/evidence\//.test(f) && !NON_ANCHOR.has(f); });
      if (anchoring) { anchor = sha; break; }
    }
    expect(anchor).not.toBeNull();
    for (const f of committedUnder(EVD_REL).filter(function (x) { return /\.(txt|md)$/.test(x) && !/\.fixture\./.test(x); })) {
      const first = read(path.join(ROOT, f.split('/').join(path.sep))).split(/\r?\n/)[0];
      const m = first.match(HEAD_RE);
      expect(m).not.toBeNull();
      const r = spawnSync('git', ['merge-base', '--is-ancestor', anchor, m[1]], { cwd: ROOT });
      expect(r.status).toBe(0);
    }
  });

  test('coverage leg re-anchored at the t25 base validates the latest row', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-governance-inventory.js'), '--coverage-base', BASE], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(0);
  });

  test('defer-0070 CI-red history + defer-0071 generalized-monitoring registrations', () => {
    const reg = readJson(REG);
    const d70 = reg.entries.find(function (e) { return e.id === 'defer-0070'; });
    expect(d70).toBeDefined();
    expect(d70.status).toBe('pending-evaluation');
    expect(d70.review_at).toBe('2026-10-15');
    expect(d70.cadence_tier).toBe('quarterly');
    expect(d70.registered_at).toBe('2026-09-24');
    expect(d70.rationale).toContain('Xxx91n');
    expect(d70.unfreeze_if.check).toContain('concludes success');
    const d71 = reg.entries.find(function (e) { return e.id === 'defer-0071'; });
    expect(d71).toBeDefined();
    expect(d71.status).toBe('pending-evaluation');
    expect(d71.subject).toContain('continuous monitoring');
  });

  test('countersign queue: all 10 labels are ID-level-only with a return condition + date', () => {
    const nums = ['0064','0065','0066','0067','0068','0069','0070','0072','0073','0074'];
    const adrs = fs.readdirSync(path.join(ROOT, 'docs', 'adr'));
    for (const n of nums) {
      const f = adrs.find(function (x) { return x.indexOf(n + '-') === 0; });
      expect(f).toBeTruthy();
      const st = read(path.join(ROOT, 'docs', 'adr', f)).split('\n').find(function (l) { return /^-? ?Status:/.test(l); });
      expect(st).toContain('ID-level-only, awaiting entity-level');
      expect(st).toContain('return condition:');
      expect(st).toContain('return-by: 2026-12-15');
    }
  });

  test('Re-Execution Prior: bbf5259 registered as the first directional event', () => {
    const c = read(CTX);
    const term = c.split('**Re-Execution Prior (')[1].split('**Bounded Delegation')[0];
    expect(term).toContain('bbf5259');
    expect(term).toContain('directional event');
    expect(term).toContain('n=19');
  });

  test('secret-scan: commit-message surface is enumerated (the fourth surface)', () => {
    const { commitMessages } = require('../scripts/check-secret-scan.js');
    expect(commitMessages().length).toBeGreaterThan(0);
  });

  test('the t25 trend row: kind fix + adr_added 0084 + declared R2 hand-edits', () => {
    const ti = readJson(TREND);
    const row = ti.rounds[ti.rounds.length - 1];
    expect(row.round).toBe('grill-t25');
    expect(row.kind).toBe('fix');
    expect(row.adr_added).toEqual(['0084']);
    expect(row.net_additions).toBe(1);
    expect(row.deferred_entry).toBe('defer-0071');
    expect(row.zero_product_diff).toBe(true);
    expect(row.governance_tooling_diff.files).toContain('scripts/build-rewrite-map.js');
    expect(row.governance_tooling_diff.files).toContain('src/shared/capability.js');
    expect(row.governance_tooling_diff.files).toContain('test/rewrite-map.test.js');
    expect(row.governance_tooling_diff.files).toContain('scripts/check-secret-scan.js');
    expect(row.governance_tooling_diff.files).toContain('.github/workflows/ci.yml');
  });

  test('README index rebuilt: 84 records incl. ADR-0084', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('84 architecture decision records');
    expect(r).toContain('0084-public-clone-verifiability');
  });
});
