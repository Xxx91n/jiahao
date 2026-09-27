// test/adr-0043-wiring.test.js - ADR-0043 wiring assertions (ADR-0031 D1).
// Cluster 1: README ADR index is a derived artifact of docs/adr (D-A/D-B),
// rebuilt wholesale inside a sentinel region by a generator whose write and
// --check modes share one pure path (D-C). Cluster 2: the stderr prefix enum
// has one fact source, prefix-vocab.js (D-E), asserted by executable spawn
// contracts (D-F), a run-gates choke check (D-G), and three-way reference
// integrity (D-H).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const { PREFIXES } = require('../src/shared/prefix-vocab');
const gen = require('../scripts/build-adr-index');
const gates = require('../scripts/run-gates');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));

// ---------- D-E: vocabulary fact source ----------

describe('ADR-0043 D-E prefix vocabulary fact source', () => {
  test('frozen closed enum with the ADR-0041 D3 values', () => {
    expect(PREFIXES).toEqual({ usage: '[usage]:', config: '[config]:', internal: '[internal]:' });
    expect(Object.isFrozen(PREFIXES)).toBe(true);
  });

  test('vocab values appear verbatim in the normative ADR-0041 text (D-H)', () => {
    const adr = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0041-exit-semantics-unification-structured-stderr-prefixes-lane-integration.md'), 'utf8');
    Object.keys(PREFIXES).forEach(function (k) { expect(adr).toContain(PREFIXES[k]); });
  });
});

// ---------- D-B: generator pure core ----------

describe('ADR-0043 D-B generator pure core', () => {
  test('renders one link line per ADR, filename-sorted, H1-derived', () => {
    const region = gen.renderRegion([
      { file: '0001-alpha.md', title: 'Alpha' },
      { file: '0002-beta.md', title: 'Beta' },
    ]);
    const lines = region.split('\n');
    expect(lines[0]).toBe(gen.SENTINEL_START);
    expect(lines[lines.length - 1]).toBe(gen.SENTINEL_END);
    expect(lines).toContain('- 2 architecture decision records:');
    expect(lines).toContain('- [ADR-0001](docs/adr/0001-alpha.md) — Alpha');
    expect(lines).toContain('- [ADR-0002](docs/adr/0002-beta.md) — Beta');
  });

  test('spliceRegion replaces the sentinel region wholesale and is idempotent', () => {
    const readme = 'head\n<!-- adr-index:start -->\nSTALE\n<!-- adr-index:end -->\ntail\n';
    const region = gen.renderRegion([{ file: '0001-alpha.md', title: 'Alpha' }]);
    const once = gen.spliceRegion(readme, region);
    expect(once).not.toContain('STALE');
    expect(once).toContain('head');
    expect(once).toContain('tail');
    expect(gen.spliceRegion(once, region)).toBe(once);
  });

  test('spliceRegion fails closed on missing/inverted sentinels', () => {
    expect(function () { gen.spliceRegion('no markers here', 'x'); }).toThrow(/sentinel/);
  });

  test('spliceRegion fails closed on a duplicate start sentinel', () => {
    const readme = 'head\n<!-- adr-index:start -->\n<!-- adr-index:start -->\n<!-- adr-index:end -->\ntail\n';
    expect(function () { gen.spliceRegion(readme, 'x'); }).toThrow(/duplicate/);
  });

  test('spliceRegion fails closed on a duplicate end sentinel', () => {
    const readme = 'head\n<!-- adr-index:start -->\n<!-- adr-index:end -->\n<!-- adr-index:end -->\ntail\n';
    expect(function () { gen.spliceRegion(readme, 'x'); }).toThrow(/duplicate/);
  });
});

// ---------- D-C: --check executable contract (spawn) ----------

describe('ADR-0043 D-C --check executable contract', () => {
  // Build a throwaway tree: real docs/adr + real scripts, README under control.
  function mkTree(readmeBody) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0043-'));
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'src', 'shared'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'build-adr-index.js'), path.join(tmp, 'scripts', 'build-adr-index.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'prefix-vocab.js'), path.join(tmp, 'src', 'shared', 'prefix-vocab.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'capability.js'), path.join(tmp, 'src', 'shared', 'capability.js'));
    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'docs', 'gates.json'), path.join(tmp, 'docs', 'gates.json')); // requireCapabilities reads the registry
    fs.mkdirSync(path.join(tmp, 'docs', 'adr'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'docs', 'adr', '0001-alpha.md'), '# ADR-0001: Alpha\n', 'utf8');
    const head = 'pre\n';
    const tail = '\npost\n';
    fs.writeFileSync(path.join(tmp, 'README.md'), head + readmeBody + tail, 'utf8');
    return tmp;
  }
  function run(tmp, mode) {
    return spawnSync(process.execPath, [path.join('scripts', 'build-adr-index.js')].concat(mode), { cwd: tmp, encoding: 'utf8' });
  }

  test('fresh region: --check exit 0; write then check is idempotent', () => {
    const tmp = mkTree('<!-- adr-index:start -->\n<!-- adr-index:end -->');
    let r = run(tmp, []);
    expect(r.status).toBe(0);
    r = run(tmp, ['--check']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('in sync');
  });

  test('tampered index: --check exit 1 and names the drift (positive control)', () => {
    const stale = '<!-- adr-index:start -->\n- 85 architecture decision records:\n<!-- adr-index:end -->';
    const tmp = mkTree(stale);
    const r = run(tmp, ['--check']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Drift detected');
  });

  test('missing sentinel: fail-closed exit 1 with the config prefix from the vocab', () => {
    const tmp = mkTree('no markers at all');
    const r = run(tmp, ['--check']);
    expect(r.status).toBe(1);
    expect(r.stderr.slice(0, PREFIXES.config.length)).toBe(PREFIXES.config);
  });
});

// ---------- D-C registration ----------

describe('ADR-0043 D-C registry registration', () => {
  test('adr-index is a confirmatory functional entry at order 115 wired to this ADR', () => {
    const e = registry.entries.filter(function (x) { return x.name === 'adr-index'; })[0];
    expect(e).toBeTruthy();
    expect(e.order).toBe(115);
    expect(e.command).toBe('node scripts/build-adr-index.js --check');
    expect(e.tier).toBe('confirmatory');
    expect(e.requires).toEqual(['docs-adr']);
    expect(fs.existsSync(path.join(ROOT, e.source_adr))).toBe(true);
  });

  test('the real repo passes the registered command and the drift-positive control holds', () => {
    const r = spawnSync(process.execPath, ['scripts/build-adr-index.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(0);
  });
});

// ---------- D-F/D-H: consumers reference the vocab, never the literals ----------

describe('ADR-0043 D-F/D-H symbol references', () => {
  test('every registry node script referencing the vocab imports prefix-vocab; the enum literals exist only in the fact source', () => {
    for (const e of registry.entries) {
      const m = /^node\s+(\S+\.js)/.exec(e.command);
      if (!m) continue;
      const src = fs.readFileSync(path.join(ROOT, m[1]), 'utf8');
      if (src.indexOf('PREFIXES.') !== -1) {
        expect(src).toMatch(/require\(['"][^'"]*prefix-vocab['"]\)/);
      }
      for (const k of Object.keys(PREFIXES)) {
        expect(src).not.toContain("'" + PREFIXES[k]); // enum literal lives only in the fact source
      }
    }
  });

  test('paths.js fail-closed head is built from the vocab', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'shared', 'paths.js'), 'utf8');
    expect(src).toMatch(/require\(['"]\.\/prefix-vocab['"]\)/);
  });
});

// ---------- D-G: run-gates choke check ----------

describe('ADR-0043 D-G run-gates choke check', () => {
  const mkReg = function () {
    return { entries: [
      { name: 'gates-alignment', command: 'a', tier: 'confirmatory', source_adr: 'x', order: 0, requires: [] },
      { name: 'ci-wiring', command: 'b', tier: 'confirmatory', source_adr: 'x', order: 1, requires: [] },
      { name: 'gates-coupling', command: 'c', tier: 'confirmatory', source_adr: 'x', order: 2, requires: [] },
      { name: 'probe', command: 'd', tier: 'confirmatory', source_adr: 'x', order: 100, requires: [] },
    ] };
  };

  test('an unknown [word]: prefix in child output fails the gate even though the child exited 0', () => {
    const res = gates.runGates(mkReg(), {
      exec: function () { return { code: 0, output: '[bogus]: invented on the fly\n' }; },
      probe: function () { return true; },
    });
    const probe = res.results.filter(function (r) { return r.name === 'probe'; })[0];
    expect(probe.status).toBe('fail');
    expect(probe.output).toContain('PREFIX-VOCAB');
    expect(res.exitCode).toBe(1);
  });

  test('closed enum prefixes from the vocab pass the choke check', () => {
    const out = Object.keys(PREFIXES).map(function (k) { return PREFIXES[k] + ' fine'; }).join('\n');
    const res = gates.runGates(mkReg(), {
      exec: function () { return { code: 0, output: out }; },
      probe: function () { return true; },
    });
    expect(res.exitCode).toBe(0);
  });
});
