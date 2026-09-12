// test/adr-0041-wiring.test.js -- ADR-0041 wiring assertions (ADR-0031 D1).
// D2: exit 2 has exactly one meaning (probed capability absence); fail-closed
// and usage paths are exit 1 with a closed-enum stderr prefix. D3: prefix
// vocabulary locked. D5: ::error annotation on stdout with comma-separated
// properties. Aggregator: a child's exit 2 lands in UNVERIFIABLE, never fail.
// D4 (H1 record): gates.json registers probe-corpus (order 155) and
// judge-bias (order 170) with requires ["bench-corpus"] at HEAD; at the HEAD
// tree the two scripts did NOT yet call requireCapabilities - that wiring
// arrived as the parallel ride-along edits (sv/mqo) added by the corp-side
// agent, confirmed present in the working tree on 2026-09-02. The audit's H1
// claim matched an earlier ref; both facts are recorded here under the
// ADR-0041 Q4 dichotomy note, and the assertions below lock the integrated
// end state so an omission fails red at lane-integration time.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const cap = require('../src/shared/capability');
const { PREFIXES } = require('../src/shared/prefix-vocab'); // ADR-0043 D-E
const gates = require('../scripts/run-gates');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));

// ---------- D3: closed-enum prefix vocabulary ----------

describe('ADR-0041 D3 prefix vocabulary', () => {
  test('the closed enum appears verbatim in ADR-0041', () => {
    const adr = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0041-exit-semantics-unification-structured-stderr-prefixes-lane-integration.md'), 'utf8');
    Object.keys(PREFIXES).forEach(function (k) { expect(adr).toContain(PREFIXES[k]); });
  });

  test('no registry gate script exits 2 outside src/shared/capability.js', () => {
    for (const e of registry.entries) {
      const m = /^node\s+(\S+\.js)/.exec(e.command);
      if (!m) continue; // 'npm test' path: jest holds the exit contract
      const src = fs.readFileSync(path.join(ROOT, m[1]), 'utf8');
      const bad = src.match(/process\.exit\(2\)/g) || [];
      expect(e.name + ' has ' + bad.length + ' exit(2) sites').toBe(e.name + ' has 0 exit(2) sites');
    }
  });

  test('ConfigLoadError is a checked registry-load failure', () => {
    expect(() => gates.loadRegistry(path.join(ROOT, 'docs', 'missing-gates.json'))).toThrow(gates.ConfigLoadError);
  });

  test('missing gates.json spawn fails closed with [config]: prefix and no stack', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0042-config-'));
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'src', 'shared'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'run-gates.js'), path.join(tmp, 'scripts', 'run-gates.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'capability.js'), path.join(tmp, 'src', 'shared', 'capability.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'prefix-vocab.js'), path.join(tmp, 'src', 'shared', 'prefix-vocab.js')); // ADR-0043: run-gates dep
    const r = spawnSync(process.execPath, ['scripts/run-gates.js'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(PREFIXES.config + ' FAIL: cannot load registry');
    expect(r.stderr).not.toMatch(/\n\s+at /);
  });

  test('reference integrity: every registry command and source ADR exists', () => {
    for (const e of registry.entries) {
      const m = /^node\s+(\S+\.js)/.exec(e.command);
      if (m) expect(fs.existsSync(path.join(ROOT, m[1]))).toBe(true);
      expect(fs.existsSync(path.join(ROOT, e.source_adr))).toBe(true);
    }
  });

  test('warning rule codes are title-only and do not use [jiahao] identity', () => {
    const freshness = fs.readFileSync(path.join(ROOT, 'scripts', 'check-corpus-freshness.js'), 'utf8');
    const reverify = fs.readFileSync(path.join(ROOT, 'scripts', 'reverify.js'), 'utf8');
    expect(freshness).toContain('::warning title=corpus-freshness::');
    expect(reverify).toContain('::warning title=judge-stale::');
    expect(freshness).not.toContain('[jiahao]');
    expect(reverify).not.toContain('[jiahao]');
  });
});

// ---------- D5: annotation format ----------

describe('ADR-0041 D5 annotation format', () => {
  test('comma-separated properties on the machine line', () => {
    const line = cap.unverifiableLines('probes', 'bench-corpus')[0];
    expect(line).toBe('::error title=UNVERIFIABLE,gate=probes,requires=bench-corpus::capability bench-corpus deterministically absent');
  });

  test('escWf escapes %/CR/LF in property order (percent first)', () => {
    expect(cap.escWf('a%b\n' + 'c\r' + 'd')).toBe('a%25b%0Ac%0Dd');
    expect(cap.unverifiableLines('ga%te', 'bench-corpus')[0]).toContain('gate=ga%25te');
  });

  // Audit-repair round 2 (2026-09-12, audit B1 residual R1): the escaping is
  // complete by construction - every property separator is escaped too, and
  // '%' is still escaped first so the escapes themselves cannot be re-encoded.
  test('escWf escapes the property separators , and : (complete by construction)', () => {
    expect(cap.escWf('a,b:c')).toBe('a%2Cb%3Ac');
    expect(cap.escWf('a%b,c')).toBe('a%25b%2Cc');
  });
});

// ---------- D3 run-gates aggregator: child exit 2 -> UNVERIFIABLE ----------

describe('ADR-0041 D3 run-gates child-exit-2 aggregation', () => {
  const reg = { entries: [
    { name: 'a', command: 'cA', tier: 'confirmatory', source_adr: 'x', order: 100, requires: [] },
    { name: 'b', command: 'cB', tier: 'confirmatory', source_adr: 'x', order: 200, requires: [] },
  ] };

  test('child exit 2 lands in the unverifiable column and never trips fail', () => {
    const res = gates.runGates(reg, {
      exec: (c) => ({ code: c === 'cB' ? 2 : 1, output: '' }), // b "unverifiable", a real fail
      probe: () => true,
    });
    const b = res.results.find(r => r.name === 'b');
    expect(b.status).toBe('unverifiable');
    expect(b.code).toBe(2);
    const a = res.results.find(r => r.name === 'a');
    expect(a.status).toBe('fail');
    expect(res.exitCode).toBe(1); // a's confirmatory fail still blocks; b never does
  });

  test('all children exit 2 -> unverifiable-only run exits 0', () => {
    const res = gates.runGates(reg, { exec: () => ({ code: 2, output: '' }), probe: () => true });
    expect(res.results.every(r => r.status === 'unverifiable')).toBe(true);
    expect(res.exitCode).toBe(0);
  });
});

// ---------- D2 spawn locks: capacity absence is the only exit 2 ----------

describe('ADR-0041 D2 spawn locks', () => {
  function mkTmp(files) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0041-'));
    for (const rel of files) {
      const to = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(path.join(ROOT, ...rel.split('/')), to);
    }
    return tmp;
  }
  const baseFiles = ['docs/gates.json', 'src/shared/capability.js', 'src/shared/paths.js', 'src/shared/prefix-vocab.js'];

  test('mr-probes in a tree without corpus: exit 2, annotation on stdout', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-mr-probes.js']));
    const env = Object.assign({}, process.env, { CI: 'true', HOME: tmp, USERPROFILE: tmp });
    delete env.JIAHAO_CORPUS_DIR;
    const r = spawnSync(process.execPath, ['scripts/check-mr-probes.js'], { cwd: tmp, encoding: 'utf8', env });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('::error title=UNVERIFIABLE,gate=mr-probes,requires=bench-corpus::');
    expect(r.stderr).toMatch(/not distributed/);
    expect(r.stderr).not.toMatch(/^::error/m);
  });

  test('mr-probes with a corrupted corpus: exit 1 and [config]: prefix', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-mr-probes.js']));
    fs.mkdirSync(path.join(tmp, 'private', 'bench-corpus'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'private', 'bench-corpus', 'mr-probes.jsonl'), '{"id":"IL1-mr-v1"}\n{not json}\n');
    const env = Object.assign({}, process.env, { CI: 'true', HOME: tmp, USERPROFILE: tmp });
    delete env.JIAHAO_CORPUS_DIR;
    const r = spawnSync(process.execPath, ['scripts/check-mr-probes.js'], { cwd: tmp, encoding: 'utf8', env });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(PREFIXES.config);
    expect(r.stderr).toMatch(/not valid JSONL/);
  });

  test('check-probes with an unknown arg: exit 1 and [usage]: prefix', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-probes.js', 'bench/polygraph/thresholds.json']));
    const r = spawnSync(process.execPath, ['scripts/check-probes.js', '--bogus'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(PREFIXES.usage + ' unknown arg: --bogus');
  });

  test('bench-gate with an unknown arg: exit 1 and [usage]: prefix', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/bench-gate.js']));
    const r = spawnSync(process.execPath, ['scripts/bench-gate.js', '--bogus'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(PREFIXES.usage + ' unknown arg: --bogus');
  });

  test('corpus-freshness with a bad fail_multiplier: exit 1 and [config]: prefix', () => {
    const tmp = mkTmp(baseFiles.concat(['scripts/check-corpus-freshness.js', 'src/reverify-schedule.js']));
    fs.mkdirSync(path.join(tmp, 'bench', 'polygraph'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'bench', 'polygraph', 'corpus-freshness.json'), JSON.stringify({ fail_multiplier: 1, tiers: {} }));
    fs.mkdirSync(path.join(tmp, 'private', 'bench-corpus'), { recursive: true });
    const env = Object.assign({}, process.env, { HOME: tmp, USERPROFILE: tmp });
    delete env.JIAHAO_CORPUS_DIR;
    const r = spawnSync(process.execPath, ['scripts/check-corpus-freshness.js'], { cwd: tmp, encoding: 'utf8', env });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(PREFIXES.config);
    expect(r.stderr).toMatch(/fail_multiplier/);
  });
});

// ---------- D4: consumer-side registry wiring (H1 hardening) ----------

describe('ADR-0041 D4 consumer-side registry wiring', () => {
  test('probe-corpus and judge-bias are registered with requires ["bench-corpus"]', () => {
    const pc = registry.entries.find(e => e.name === 'probe-corpus');
    const jb = registry.entries.find(e => e.name === 'judge-bias');
    expect(pc && pc.order).toBe(155);
    expect(jb && jb.order).toBe(170);
    expect(pc.requires).toEqual(['bench-corpus']);
    expect(jb.requires).toEqual(['bench-corpus']);
  });

  test('both scripts call requireCapabilities with their registry names', () => {
    const pc = fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'check-probe-corpus.js'), 'utf8');
    const jb = fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'check-judge-bias.js'), 'utf8');
    expect(pc).toContain("requireCapabilities('probe-corpus')");
    expect(jb).toContain("requireCapabilities('judge-bias')");
  });
});
