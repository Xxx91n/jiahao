// test/adr-0079-wiring.test.js — ADR-0079 bilingual-mirror convention wiring
// (grill-t20 doc round). R3 documentation surface - no carve-out.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const pairing = require('../scripts/shared/readme-pairing');
const ROOT = path.join(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const MIRROR = path.join(ROOT, 'README-zh-CN.md');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }

function baseline() {
  const m = read(MIRROR).match(/<!--\s*translation-baseline:\s*([0-9a-fA-F]{40})\s*-->/);
  return m ? m[1] : null;
}
function h2s(text) { return text.match(/^## .+$/gm) || []; }

describe('ADR-0079 bilingual mirror convention (grill-t20)', () => {
  test('D1: the zh-CN mirror exists beside the primary', () => {
    expect(fs.existsSync(MIRROR)).toBe(true);
    expect(read(MIRROR).length).toBeGreaterThan(1000);
  });

  test('D2: the autonym language-switch pair opens both files (current bold + unlinked)', () => {
    expect(read(README)).toContain('**English** | [中文](README-zh-CN.md)');
    expect(read(MIRROR)).toContain('[English](README.md) | **中文**');
  });

  test('D3 (amended by ADR-0092 D-P1): the baseline comment carries a 40-hex sha, as a display-form provenance record', () => {
    const sha = baseline();
    expect(sha).not.toBeNull();
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    // WITHDRAWN (grill-t35 D-006): "the sha exists in git history" and "the sha is
    // an ancestor of HEAD". Both asserted a lane-era object that the landing rewrite
    // destroys - the t34 pin named 613a2471, unrepresentable in public history.
    // Re-pinning only relocated the fragility. The record is kept; what is asserted
    // is its SHAPE, so the provenance line cannot silently disappear. The enforced
    // obligation moved to the D6 pairing scan below.
  });

  test('D3 amendment is registered in the ADR text, not only in a mirror comment (ADR-0083 D-003, no dual reading)', () => {
    const a = read(path.join(ROOT, 'docs', 'adr', '0079-bilingual-readme-mirror-convention.md'));
    expect(a).toContain('AMENDED by ADR-0092 D-P1');
    expect(a).toContain('display-form provenance line');
    expect(a).toContain('WITHDRAWN');
    // the mirror comment must not be the only carrier of the downgrade
    expect(read(MIRROR)).toContain('display-form provenance');
  });

  test('skeleton: both files share the same top-level ## heading skeleton', () => {
    expect(h2s(read(MIRROR))).toEqual(h2s(read(README)));
  });

  test('D4: translated pinned blocks carry the English-original-prevails pointer', () => {
    expect(read(MIRROR)).toContain('English original prevails');
  });

  test('D5: the mirror is absent from the package files and the npm tarball', () => {
    const pkg = readJson(path.join(ROOT, 'package.json'));
    expect(pkg.files).not.toContain('README-zh-CN.md');
    // the empirical check the convention depends on: npm's always-include
    // readme.* glob must not catch the hyphenated basename (a dotted
    // README.* name would be force-packed - see ADR-0079 D1 filename note)
    // npm-cli.js lives beside the node binary by install layout (grill-t27
    // D-004 D5): win32 <bindir>/node_modules/npm/bin, unix
    // <bindir>/../lib/node_modules/npm/bin. PATH fallback derives it from the
    // npm launcher - realpath() resolves the unix symlink into npm-cli.js, the
    // win32 npm.cmd sits beside node_modules/npm/. Bare spawnSync('npm.cmd')
    // is EINVAL under CVE-2024-27980 hardening; shell:true + args array is
    // DEP0190 - both rejected, so the launcher spawn carries cmd.exe on win32.
    const BINDIR = path.dirname(process.execPath);
    const candidates = [
      path.join(BINDIR, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      path.join(BINDIR, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    ];
    let NPMCLI = candidates.filter(function (c) { return fs.existsSync(c); })[0];
    if (!NPMCLI) {
      const probe = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['npm'], { encoding: 'utf8' });
      const hits = String(probe.stdout || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      for (const h of hits) {
        const bases = [h];
        try { bases.push(fs.realpathSync(h)); } catch (e) {}
        for (const b of bases) {
          const derived = [/npm-cli\.js$/i.test(b) ? b : null,
            path.join(path.dirname(b), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
            path.join(path.dirname(b), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')];
          NPMCLI = derived.filter(function (d) { return d && fs.existsSync(d); })[0] || NPMCLI;
          if (NPMCLI) break;
        }
        if (NPMCLI) break;
      }
    }
    const r = NPMCLI
      ? spawnSync(process.execPath, [NPMCLI, 'pack', '--dry-run'], { cwd: ROOT, encoding: 'utf8' })
      : (process.platform === 'win32'
        ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm', 'pack', '--dry-run'], { cwd: ROOT, encoding: 'utf8' })
        : spawnSync('npm', ['pack', '--dry-run'], { cwd: ROOT, encoding: 'utf8' }));
    expect(r.status).toBe(0);
    const packed = (r.stdout + r.stderr).split('\n').filter(function (l) { return /zh-CN/i.test(l); });
    expect(packed).toEqual([]);
  });

  // D6 drift pin WITHDRAWN by ADR-0092 D-P1 (grill-t35 D-006): it asserted
  // `git log -1 README.md` equals the recorded baseline sha - a restack-fragile
  // assertion over a lane-era object. Replaced by the pairing scan below.

  test('D6 (amended): every published-line README.md commit pairs the mirror in the same commit', () => {
    // Zero sha names in the rule: a property of the published line, so a restack
    // that renames every commit cannot invalidate it.
    const live = pairing.scanViolations(ROOT, { tip: 'origin/main' });
    expect(live.anchor).toBeTruthy();
    const baselineFile = pairing.loadBaseline(ROOT);
    expect(baselineFile).not.toBeNull();
    const registered = new Set((baselineFile.entries || []).map((e) => e.sha));
    const unsuppressed = live.violations.filter((v) => !registered.has(v.sha));
    expect(unsuppressed.map((v) => v.sha + ' ' + v.subject)).toEqual([]);
  });

  test('D6 ratchet: baseline rows are real, current, and re-derived (no prose waiver channel)', () => {
    const live = pairing.scanViolations(ROOT, { tip: 'origin/main' });
    const baselineFile = pairing.loadBaseline(ROOT);
    const real = new Set(live.violations.map((v) => v.sha));
    const stale = (baselineFile.entries || []).filter((e) => !real.has(e.sha));
    // A stale row is the classic baseline rot that hides a reintroduced drift of the
    // same commit: the ratchet only ever moves DOWN.
    expect(stale.map((e) => e.sha)).toEqual([]);
    for (const e of baselineFile.entries || []) {
      expect(e.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(typeof e.subject).toBe('string');
    }
    expect(baselineFile.anchor).toBe(live.anchor);
    expect(baselineFile.generated_by).toBe('scripts/build-readme-pairing-baseline.js');
  });

  test('D6 scan is NOT remediation-aware (the three-step laundering window stays closed)', () => {
    // Regression lock on the negative requirement. If the scan were made
    // remediation-aware, a violation would be cleared by any LATER commit touching
    // both files - exactly 'move README alone, then patch zh, then re-pin'. Every
    // registered violation on this line IS followed by a both-file commit, so a
    // remediation-aware rule would report zero violations and wash the backlog.
    const live = pairing.scanViolations(ROOT, { tip: 'origin/main' });
    const shas = pairing.rangeCommits(ROOT, live.anchor, 'origin/main');
    let followedByBothFile = 0;
    for (const v of live.violations) {
      const idx = shas.indexOf(v.sha);
      for (let k = shas.length - 1; k > idx; k--) {
        const files = pairing.changedFiles(ROOT, shas[k]);
        if (files.indexOf(pairing.EN) !== -1 && files.indexOf(pairing.ZH) !== -1) { followedByBothFile++; break; }
      }
    }
    expect(live.violations.length).toBeGreaterThan(0);
    expect(followedByBothFile).toBe(live.violations.length);
  });

  test('D6 semantics + Context sentence: re-pin rhythm, same-commit rule, policy-home line', () => {
    const a = read(path.join(ROOT, 'docs', 'adr', '0079-bilingual-readme-mirror-convention.md'));
    expect(a).toContain('MUST update README-zh-CN.md in the same commit');
    expect(a).toContain('re-pin');
    expect(a).toContain('the convention needs a policy home');
    // the amended clause names the retained obligation and its carrier
    expect(a).toContain('historical pairing scan');
    expect(a).toContain('readme-pairing-baseline.json');
  });
});
