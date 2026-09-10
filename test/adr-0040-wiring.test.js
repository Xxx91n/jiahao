// test/adr-0040-wiring.test.js -- ADR-0040 wiring assertions (ADR-0031 D1).
// D1/D3: capability.js helper unit locks (probe verdicts, unknown-name
// rejection, message assembly). D5: run-gates precheck + UNVERIFIABLE column
// (stubbed exec/probe). D7a: cover. D7b: four spawn representatives, one per
// capability, asserting exit 2 + the two-line honest message. D7c tarball
// smoke stays in adr-0038-wiring. D7d: static wiring anchor over all gates.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const cap = require('../src/shared/capability');
const gates = require('../scripts/run-gates');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));

// ---------- D1/D3 helper unit locks ----------

describe('ADR-0040 D1/D3 capability helper', () => {
  test('probe: existence verdicts on a synthetic root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-cap-'));
    expect(cap.probe('repo-tree', { root: tmp, env: {} })).toBe(false);
    expect(cap.probe('docs-adr', { root: tmp, env: {} })).toBe(false);
    fs.mkdirSync(path.join(tmp, '.git'));
    fs.mkdirSync(path.join(tmp, 'docs', 'adr'), { recursive: true });
    expect(cap.probe('repo-tree', { root: tmp, env: {} })).toBe(true);
    expect(cap.probe('docs-adr', { root: tmp, env: {} })).toBe(true);
  });

  test('probe: bench-corpus follows the ADR-0036 D2 resolution chain', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-cap-'));
    const env = {};
    expect(cap.probe('bench-corpus', { root: tmp, env })).toBe(false);
    const envDir = path.join(tmp, 'external-corpus');
    env.JIAHAO_CORPUS_DIR = envDir;
    expect(cap.probe('bench-corpus', { root: tmp, env: { JIAHAO_CORPUS_DIR: envDir } })).toBe(false); // set but missing
    fs.mkdirSync(envDir);
    expect(cap.probe('bench-corpus', { root: tmp, env: { JIAHAO_CORPUS_DIR: envDir } })).toBe(true);
    expect(cap.probe('bench-corpus', { root: tmp, env: {} })).toBe(false);
    fs.mkdirSync(path.join(tmp, 'private', 'bench-corpus'), { recursive: true });
    expect(cap.probe('bench-corpus', { root: tmp, env: {} })).toBe(true); // repo-private tier
  });

  test('probe: ci-mode needs GITHUB_ACTIONS or CI', () => {
    expect(cap.probe('ci-mode', { env: {} })).toBe(false);
    expect(cap.probe('ci-mode', { env: { CI: 'true' } })).toBe(true);
    expect(cap.probe('ci-mode', { env: { GITHUB_ACTIONS: 'true' } })).toBe(true);
  });

  test('unregistered name throws (registry violation - never exit 2)', () => {
    expect(() => cap.probe('bogus-cap', { env: {} })).toThrow(/unregistered capability/);
  });

  test('message assembly: machine line, then human line (ADR-0041 D5 format)', () => {
    const lines = cap.unverifiableLines('probes', 'bench-corpus');
    expect(lines[0]).toBe('::error title=UNVERIFIABLE,gate=probes,requires=bench-corpus::capability bench-corpus deterministically absent');
    expect(lines[1]).toMatch(/\[probes\] UNVERIFIABLE/);
    expect(lines[1]).toContain('JIAHAO_CORPUS_DIR');
  });

  test('validateRequires: closed enum + required field', () => {
    expect(cap.validateRequires(registry.entries)).toEqual([]); // real registry passes
    const bad = JSON.parse(JSON.stringify(registry));
    delete bad.entries[3].requires;
    expect(cap.validateRequires(bad.entries).some(m => /requires must be an array/.test(m))).toBe(true);
    bad.entries[3].requires = ['nope'];
    expect(cap.validateRequires(bad.entries).some(m => /unknown capability/.test(m))).toBe(true);
  });

  test('D1 content anchor: every capability name appears verbatim in ADR-0040', () => {
    const adr = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0040-gate-runtime-capability-declaration-three-state-exit-honest-unverifiable.md'), 'utf8');
    for (const c of cap.CAPABILITIES) expect(adr).toContain(c);
  });
});

// ---------- D5 aggregator precheck ----------

describe('ADR-0040 D5 run-gates precheck', () => {
  const reg = { entries: [
    { name: 'a', command: 'cA', tier: 'confirmatory', source_adr: 'x', order: 100, requires: ['repo-tree'] },
    { name: 'b', command: 'cB', tier: 'confirmatory', source_adr: 'x', order: 200, requires: ['ci-mode'] },
  ] };

  test('missing capability marks the gate unverifiable and does not run it', () => {
    const calls = [];
    const exec = (cmd) => { calls.push(cmd); return { code: 0, output: '' }; };
    const probeFn = (c) => c !== 'ci-mode';
    const res = gates.runGates(reg, { exec, probe: probeFn });
    expect(calls).toEqual(['cA']); // b never spawned
    const b = res.results.find(r => r.name === 'b');
    expect(b.status).toBe('unverifiable');
    expect(b.code).toBe(2);
    expect(b.missing).toEqual(['ci-mode']);
    expect(res.exitCode).toBe(0);
  });

  test('unverifiable never merges into fail and does not trip fail-fast', () => {
    const exec = () => ({ code: 1, output: 'boom' });
    const res = gates.runGates(reg, { exec, probe: () => false, failFast: true });
    const st = res.results.map(r => r.status);
    expect(st).toEqual(['unverifiable', 'unverifiable']);
    expect(res.exitCode).toBe(0); // no confirmatory 'fail' row exists
  });

  test('gates with all capabilities present run normally', () => {
    const calls = [];
    const res = gates.runGates(reg, { exec: (c) => { calls.push(c); return { code: 0, output: '' }; }, probe: () => true });
    expect(calls).toEqual(['cA', 'cB']);
    expect(res.results.every(r => r.status === 'pass')).toBe(true);
  });
});

// ---------- D7b spawn representatives: one per capability ----------

describe('ADR-0040 D7b exit-2 spawn locks', () => {
  function mkTmp(files) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0040-'));
    const add = (rel) => {
      const to = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(path.join(ROOT, ...rel.split('/')), to);
    };
    files.forEach(add);
    return tmp;
  }
  const baseFiles = ['docs/gates.json', 'src/shared/capability.js', 'src/shared/prefix-vocab.js']; // ADR-0043: run-gates dep

  test('repo-tree via gates-coupling', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/run-gates.js']));
    const r = spawnSync(process.execPath, ['scripts/run-gates.js', '--check-coupling'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(2);
    // ADR-0041 D5: annotation on stdout, human hint on stderr.
    expect(r.stdout).toContain('::error title=UNVERIFIABLE,gate=gates-coupling,requires=repo-tree::');
    expect(r.stderr).toMatch(/UNVERIFIABLE/);
    expect(r.stderr).not.toMatch(/^::error/m);
  });

  test('docs-adr via bench-thresholds', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-bench-thresholds.js']));
    fs.mkdirSync(path.join(tmp, '.git')); // repo-tree present; only docs-adr absent
    const r = spawnSync(process.execPath, ['scripts/check-bench-thresholds.js'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('requires=docs-adr::');
  });

  test('bench-corpus via probes', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-probes.js', 'src/shared/paths.js', 'src/shared/prefix-vocab.js', 'bench/polygraph/thresholds.json']));
    fs.mkdirSync(path.join(tmp, '.git'));
    const env = Object.assign({}, process.env, { CI: 'true', HOME: tmp });
    delete env.JIAHAO_CORPUS_DIR;
    const r = spawnSync(process.execPath, ['scripts/check-probes.js'], { cwd: tmp, encoding: 'utf8', env });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('requires=bench-corpus::');
  });

  test('ci-mode via ci-wiring', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-ci-wiring.js', 'scripts/run-gates.js']));
    const env = Object.assign({}, process.env);
    delete env.CI; delete env.GITHUB_ACTIONS;
    const r = spawnSync(process.execPath, ['scripts/check-ci-wiring.js'], { cwd: tmp, encoding: 'utf8', env });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('requires=ci-mode::');
    expect(r.stderr).toMatch(/UNVERIFIABLE/);
  });

  test('audit F5/F2 companion: empty corpus fails closed exit 1 [config]: (probes; ADR-0041 D3 cutover)', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-probes.js', 'src/shared/paths.js', 'src/shared/prefix-vocab.js', 'bench/polygraph/thresholds.json']));
    fs.mkdirSync(path.join(tmp, '.git'));
    fs.mkdirSync(path.join(tmp, 'private', 'bench-corpus'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'private', 'bench-corpus', 'probes.jsonl'), '');
    const env = Object.assign({}, process.env, { CI: 'true', HOME: tmp });
    delete env.JIAHAO_CORPUS_DIR;
    const r = spawnSync(process.execPath, ['scripts/check-probes.js'], { cwd: tmp, encoding: 'utf8', env });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/corpus is empty/);
    expect(r.stderr).toMatch(/^\[config\]:/m);
  });
});

// ---------- D7d static wiring anchor ----------

describe('ADR-0040 D7d static wiring anchor', () => {
  for (const e of registry.entries) {
    test('gate ' + e.name + ' source calls requireCapabilities by name', () => {
      const m = /^node\s+(\S+\.js)/.exec(e.command);
      if (!m) {
        expect(e.requires).toEqual([]); // 'npm test' has no script surface and must declare none
        return;
      }
      const src = fs.readFileSync(path.join(ROOT, e.command.split(/\s+/)[1]), 'utf8');
      expect(src).toContain('requireCapabilities(' + JSON.stringify(e.name).replace(/"/g, '\'') + ')');
      expect(src).toContain('src/shared/capability');
    });
  }
});
