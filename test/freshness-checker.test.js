'use strict';
// test/freshness-checker.test.js - fixture unit tests for the shared
// evidence-freshness checker (D-005 hedge 1: correlated failure is
// intercepted pre-merge by the checker's own suite, independent of the
// round-scoped wiring suites that consume it).
// The fixture is a real temp git repo with a synthetic round history:
// machinery anchors, evidence captures, claim commits, bookkeeping, and a
// SEAL declaration - exercising every checker leg against known truth.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const fresh = require('../scripts/evidence-freshness');

const TAXONOMY = {
  claim_surfaces: { closed_enum: ['reports/', 'handoffs/'] },
  non_anchoring_classes: {
    evidence_dirs: ['evidence/'],
    seal_file: 'SEAL',
    round_bookkeeping: ['GOAL.md', 'decision-ledger.md', 'round-facts.json', 'human-authority-package.md', 'handoffs/next-round.md'],
    round_bookkeeping_glob: ['spec-*.md'],
    mechanism_regen_outputs: ['docs/rewrite-map.json'],
  },
  orphan_ancestry: {
    artifact_scope: '\\.scratch/grill-[^/]+/',
    workspace_ref: 'refs/heads/gitbutler/workspace',
    errata_exemptions: [],
  },
};

let ROOT;
const g = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
function commit(msg, files) {
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
    execFileSync('git', ['add', rel], { cwd: ROOT });
  }
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', msg], { cwd: ROOT });
  return g(['rev-parse', 'HEAD']);
}
const evalT99 = () => fresh.evaluateRound(ROOT, TAXONOMY, { id: 'grill-t99', base: BASE });
let BASE, A2, C4;

beforeAll(() => {
  ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-freshness-'));
  execFileSync('git', ['init', '-q'], { cwd: ROOT });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: ROOT });
});

describe('shared freshness checker (fixture repo)', () => {
  test('classification: exempt classes never anchor; unclassified anchors', () => {
    BASE = commit('init machinery', { 'src/app.js': 'x=1\n', '.scratch/grill-t99/GOAL.md': '# goal\n' });
    const cx = fresh.classifiers(TAXONOMY);
    expect(fresh.classifyFile('.scratch/grill-t99/evidence/x.txt', cx)).toBe('evidence');
    expect(fresh.classifyFile('.scratch/grill-t99/SEAL', cx)).toBe('seal');
    expect(fresh.classifyFile('.scratch/grill-t99/GOAL.md', cx)).toBe('bookkeeping');
    expect(fresh.classifyFile('.scratch/grill-t99/handoffs/next-round.md', cx)).toBe('bookkeeping');
    expect(fresh.classifyFile('docs/rewrite-map.json', cx)).toBe('regen');
    expect(fresh.classifyFile('.scratch/grill-t99/reports/r.md', cx)).toBe('claim');
    expect(fresh.classifyFile('.scratch/grill-t99/handoffs/h.md', cx)).toBe('claim');
    expect(fresh.classifyFile('src/app.js', cx)).toBe('anchoring');
    expect(fresh.classifyFile('.scratch/grill-t99/capture.cjs', cx)).toBe('anchoring');
  });

  test('claim-point floor: pure claims do not raise the floor; machinery does', () => {
    const A1 = commit('machinery one', { 'src/a1.js': 'x=1\n' });
    commit('capture at A1', { '.scratch/grill-t99/evidence/run.txt': 'captured-at-head: ' + A1 + '\nok\n' });
    const C1 = commit('claim one', { '.scratch/grill-t99/reports/r1.md': '# pass\n' });
    const C2 = commit('claim two (consecutive claim, no recapture)', { '.scratch/grill-t99/reports/r2.md': '# pass\n' });
    const r = evalT99();
    const c1 = r.claims.find((c) => c.commit === C1);
    const c2 = r.claims.find((c) => c.commit === C2);
    expect(c1.floor).toBe(A1);
    expect(c2.floor).toBe(A1); // C1 is a pure claim: excluded from the floor
    expect(c1.bad).toEqual([]);
    expect(c2.bad).toEqual([]);
  });

  test('stale detection: a machinery commit after the capture fails the next claim', () => {
    A2 = commit('machinery two', { 'src/a2.js': 'x=2\n' });
    const C3 = commit('claim three (stale evidence)', { '.scratch/grill-t99/reports/r3.md': '# pass\n' });
    const r = evalT99();
    const c3 = r.claims.find((c) => c.commit === C3);
    expect(c3.floor).toBe(A2);
    expect(c3.bad.length).toBe(1); // the old capture names A1 < A2
    // recapture at-or-after A2, then the next claim is clean
    commit('capture at A2 tip', { '.scratch/grill-t99/evidence/run.txt': 'captured-at-head: ' + g(['rev-parse', 'HEAD']) + '\nok\n' });
    C4 = commit('claim four (fresh again)', { '.scratch/grill-t99/reports/r4.md': '# pass\n' });
    const r2 = evalT99();
    const c4 = r2.claims.find((c) => c.commit === C4);
    expect(c4.floor).toBe(A2); // the capture commit itself is evidence-class, not an anchor
    expect(c4.bad).toEqual([]);
  });

  test('bookkeeping commits are exempt — ledger/spec/taskbook do not anchor', () => {
    commit('round docs only', {
      '.scratch/grill-t99/decision-ledger.md': '# ledger\n',
      '.scratch/grill-t99/spec-t99.md': '# spec\n',
      '.scratch/grill-t99/handoffs/next-round.md': '# next\n',
      '.scratch/grill-t99/round-facts.json': '{}\n',
    });
    const r = evalT99();
    // no new claim commits appear; the floor for the last claim is unchanged
    expect(r.claims.length).toBe(4);
  });

  test('seal resolution: declared sha pins the last substantive commit; freeze turns edits red', () => {
    // the last substantive commit so far is claim four (claims count for the
    // seal; the bookkeeping commit after it is exempt)
    const lastSubstantive = C4;
    // terminal wave: recapture at a post-anchor head before declaring
    commit('terminal wave', { '.scratch/grill-t99/evidence/run.txt': 'captured-at-head: ' + g(['rev-parse', 'HEAD']) + '\nok\n' });
    const sealBody = 'seal: ' + lastSubstantive + '\nrecorded_at: 2026-09-24\n';
    const D = commit('seal declaration', { '.scratch/grill-t99/SEAL': sealBody });
    let r = evalT99();
    expect(r.seal.present).toBe(true);
    expect(r.seal.declared).toBe(lastSubstantive);
    expect(r.seal.declarationCommit).toBe(D);
    expect(r.seal.expectedAnchor).toBe(lastSubstantive);
    expect(r.seal.inFlightClean).toBe(true);
    expect(r.seal.capturesAtSealOk).toBe(true);
    expect(r.seal.amended).toBe(false);
    expect(r.seal.freezeViolations).toEqual([]);
    expect(r.seal.tag.state).toBe('absent'); // fixture repo carries no tag
    // a byte edit to sealed evidence is a freeze violation
    commit('post-seal evidence tamper', { '.scratch/grill-t99/evidence/run.txt': 'captured-at-head: ' + g(['rev-parse', 'HEAD~0']) + '\nTAMPERED\n' });
    r = evalT99();
    expect(r.seal.freezeViolations.length).toBe(1);
  });

  test('seal declaration rejects an in-flight anchoring commit (wrong declared sha)', () => {
    // rewind is not available on the same repo; build the negative on a fresh
    // repo where the declared sha predates the real last substantive commit.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-fresh-neg-'));
    const gg = (args) => execFileSync('git', args, { cwd: tmp, encoding: 'utf8' }).trim();
    execFileSync('git', ['init', '-q'], { cwd: tmp });
    const put = (rel, body) => { const p = path.join(tmp, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); execFileSync('git', ['add', rel], { cwd: tmp }); };
    const ci = (m) => { execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', m], { cwd: tmp }); return gg(['rev-parse', 'HEAD']); };
    const base = ci('base');
    put('src/x.js', '1\n');
    const real = ci('real last substantive');
    put('.scratch/grill-t1/SEAL', 'seal: ' + base + '\nrecorded_at: 2026-09-24\n'); // WRONG: real is in flight
    ci('seal decl');
    const r = fresh.evaluateRound(tmp, TAXONOMY, { id: 'grill-t1', base });
    expect(r.seal.inFlightClean).toBe(false);
    expect(r.seal.expectedAnchor).toBe(real);
  });

  test('tag co-naming: the annotation must pin the bare sha, not just the target', () => {
    // t99 is sealed at C4. A tag naming the right sha but lacking the bare-sha
    // annotation is divergence, not endorsement (D-C byte-equivalence
    // precondition; audit F-2).
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'tag', '-a', 'adjudicated/grill-t99', C4, '-m', 'adjudicated without the sha'], { cwd: ROOT });
    let r = evalT99();
    expect(r.seal.tag.state).toBe('drift');
    expect(r.seal.tag.messageHasSha).toBe(false);
    g(['tag', '-d', 'adjudicated/grill-t99']);
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'tag', '-a', 'adjudicated/grill-t99', C4, '-m', 'adjudicated seal ' + C4], { cwd: ROOT });
    r = evalT99();
    expect(r.seal.tag.state).toBe('co-named');
    expect(r.seal.tag.messageHasSha).toBe(true);
    g(['tag', '-d', 'adjudicated/grill-t99']);
  });

  test('unregistered claim-like files produce a warning signal', () => {
    commit('unregistered verdict doc', { '.scratch/grill-t99/audit-evidence/audit-report.md': '# pass\n' });
    // added-then-removed still warns — the HEAD-tree leg alone misses it (audit F-6)
    commit('transient verdict add', { '.scratch/grill-t99/verdicts.md': '# v\n' });
    execFileSync('git', ['rm', '-q', '.scratch/grill-t99/verdicts.md'], { cwd: ROOT });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'transient verdict removed'], { cwd: ROOT });
    const r = evalT99();
    expect(r.unregisteredClaims).toContain('.scratch/grill-t99/audit-evidence/audit-report.md');
    expect(r.unregisteredClaims).toContain('.scratch/grill-t99/verdicts.md');
  });
});

describe('orphan-ancestry leg (grill-t28 D-005/D-006)', () => {
  // fresh repo helper: a committed evidence pin + a SEAL on a tiny history
  const buildRepo = (dir) => {
    const gg = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
    const put = (rel, body) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); execFileSync('git', ['add', rel], { cwd: dir }); };
    const ci = (m) => { execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', m], { cwd: dir }); return gg(['rev-parse', 'HEAD']); };
    return { gg, put, ci };
  };
  const run = (dir, cfg) => fresh.orphanAncestry(dir, cfg || TAXONOMY, {});

  test('ancestor-positive: committed pins resolve ancestral - leg green', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-orphan-pos-'));
    const { put, ci } = buildRepo(dir);
    const a1 = ci('machinery');
    put('.scratch/grill-t1/evidence/run.txt', 'captured-at-head: ' + a1 + '\nok\n');
    ci('capture');
    put('.scratch/grill-t1/reports/r.md', '# pass\n');
    const c1 = ci('claim');
    put('.scratch/grill-t1/evidence/run.txt', 'captured-at-head: ' + c1 + '\nok\n');
    ci('recapture');
    put('.scratch/grill-t1/SEAL', 'seal: ' + c1 + '\nrecorded_at: 2026-09-26\n');
    ci('seal');
    const r = run(dir);
    expect(r.pinCount).toBeGreaterThanOrEqual(2);
    expect(r.violations).toEqual([]);
    expect(r.red).toBe(false);
    // workspace ref absent in the fixture => clause reported, never silently skipped
    expect(r.trigger.state).toBe('not-evaluated');
  });

  test('orphaned pin: a non-ancestor sha in a committed artifact turns the leg red', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-orphan-neg-'));
    const { gg, put, ci } = buildRepo(dir);
    const a1 = ci('machinery');
    put('.scratch/grill-t1/evidence/run.txt', 'captured-at-head: ' + a1 + '\nok\n');
    ci('capture');
    // a commit object on NO ancestor path (rootless tree-commit: restack orphan analog)
    const tree = gg(['write-tree']);
    const orphan = gg(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit-tree', tree, '-m', 'orphaned commit']);
    put('.scratch/grill-t1/evidence/orphan.txt', 'captured-at-head: ' + orphan + '\norphan wave\n');
    ci('orphan wave committed');
    const r = run(dir);
    const bad = r.violations.filter((v) => v.file.endsWith('orphan.txt'));
    expect(bad.length).toBe(1);
    expect(bad[0].sha).toBe(orphan);
    expect(r.red).toBe(true);
    // a registered errata entry suppresses THAT pin only - reported, never silent
    const cfg2 = JSON.parse(JSON.stringify(TAXONOMY));
    cfg2.orphan_ancestry.errata_exemptions = [{ sha: orphan, file: '.scratch/grill-t1/evidence/orphan.txt', errata: 'E-99' }];
    const r2 = run(dir, cfg2);
    expect(r2.violations).toEqual([]);
    expect(r2.exempted.length).toBe(1);
    expect(r2.exempted[0].errata).toBe('E-99');
    expect(r2.red).toBe(false);
  });

  test('workspace trigger: non-fast-forward vs the last seal record turns the leg red', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-orphan-ws-'));
    const { gg, put, ci } = buildRepo(dir);
    const a1 = ci('machinery');
    put('.scratch/grill-t1/evidence/run.txt', 'captured-at-head: ' + a1 + '\nok\n');
    ci('capture');
    const c1 = ci('substantive');
    put('.scratch/grill-t1/SEAL', 'seal: ' + c1 + '\nrecorded_at: 2026-09-26\n');
    const d = ci('seal decl');
    // workspace descending from the seal: green
    gg(['branch', '-f', 'gitbutler/workspace', 'HEAD']);
    let r = run(dir);
    expect(r.trigger.state).toBe('ok');
    expect(r.trigger.seal.seal).toBe(c1);
    // a restacked workspace that no longer descends from the seal: red
    const tree = gg(['write-tree']);
    const alien = gg(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit-tree', tree, '-m', 'restacked workspace tip']);
    gg(['update-ref', 'refs/heads/gitbutler/workspace', alien]);
    r = run(dir);
    expect(r.trigger.state).toBe('violation');
    expect(r.red).toBe(true);
  });
});
