// test/adr-0079-wiring.test.js — ADR-0079 bilingual-mirror convention wiring
// (grill-t20 doc round). R3 documentation surface - no carve-out.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
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

  test('D3: the baseline comment carries a 40-hex sha that exists in git history', () => {
    const sha = baseline();
    expect(sha).not.toBeNull();
    expect(git(['cat-file', '-t', sha])).toBe('commit');
    // the recorded baseline is reachable from HEAD - not a dangling object
    execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { cwd: ROOT });
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

  test('D6 drift pin: git log -1 README.md equals the recorded baseline sha', () => {
    const head = git(['log', '-1', '--format=%H', '--', 'README.md']);
    expect(baseline()).toBe(head);
  });

  test('D6 semantics + Context sentence: re-pin rhythm, same-commit rule, policy-home line', () => {
    const a = read(path.join(ROOT, 'docs', 'adr', '0079-bilingual-readme-mirror-convention.md'));
    expect(a).toContain('MUST update README-zh-CN.md in the same commit');
    expect(a).toContain('re-pin');
    expect(a).toContain('the convention needs a policy home');
  });
});
