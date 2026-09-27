// ADR-0034 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Covers D1/D4 (registry schema + CRTM-as-entry ordering), D2/D5 (package.json
// alignment + ci.yml single-entrypoint wiring with negative fixtures), D3
// (run-all-then-aggregate, --fail-fast tier-aware short-circuit, advisory
// warning aggregation).
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const gates = require('../scripts/run-gates');
const wiring = require('../scripts/check-ci-wiring');

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const ciYml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');

function clone(o) { return JSON.parse(JSON.stringify(o)); }

describe('ADR-0034 D1/D4 registry schema', () => {
  test('real registry validates', () => {
    expect(gates.validateRegistry(registry)).toEqual([]);
  });

  test('CRTM-as-entry: meta-checks hold the minimal orders', () => {
    const byOrder = registry.entries.slice().sort((a, b) => a.order - b.order);
    expect(byOrder.slice(0, 3).map(e => e.name)).toEqual(['gates-alignment', 'ci-wiring', 'gates-coupling']);
  });

  test('negative: missing order is a schema violation (fail-closed)', () => {
    const bad = clone(registry);
    delete bad.entries[3].order;
    expect(gates.validateRegistry(bad).some(m => /order must be an integer/.test(m))).toBe(true);
  });

  test('negative: unknown tier is rejected (ADR-0031 D3 vocabulary)', () => {
    const bad = clone(registry);
    bad.entries[3].tier = 'guard';
    expect(gates.validateRegistry(bad).some(m => /tier must be one of/.test(m))).toBe(true);
  });

  test('negative: duplicate order is rejected', () => {
    const bad = clone(registry);
    bad.entries[4].order = bad.entries[3].order;
    expect(gates.validateRegistry(bad).some(m => /duplicate order/.test(m))).toBe(true);
  });

  test('negative: meta-check displaced from the minimal orders fails', () => {
    const bad = clone(registry);
    bad.entries.find(e => e.name === 'ci-wiring').order = 500;
    expect(gates.validateRegistry(bad).some(m => /CRTM-as-entry|band contract/.test(m))).toBe(true);
  });

  test('negative: source_adr must resolve to an existing file', () => {
    const bad = clone(registry);
    bad.entries[3].source_adr = 'docs/adr/0099-nonexistent.md';
    expect(gates.validateRegistry(bad).some(m => /source_adr not found/.test(m))).toBe(true);
  });
});

describe('ADR-0034 D2/D5 registry to package.json alignment', () => {
  test('real package.json aligns', () => {
    expect(gates.checkAlignment(registry, pkg)).toEqual([]);
  });

  test('negative: gate:all script must be the single entrypoint', () => {
    const bad = clone(pkg);
    bad.scripts['gate:all'] = 'node scripts/bench-gate.js';
    expect(gates.checkAlignment(registry, bad).some(m => /gate:all/.test(m))).toBe(true);
  });

  test('negative: alias part with no registry entry is caught', () => {
    const bad = clone(registry);
    bad.entries = bad.entries.filter(e => e.name !== 'probe-corpus');
    expect(gates.checkAlignment(bad, pkg).some(m => /probes:gate/.test(m))).toBe(true);
  });
});

describe('ADR-0034 D5 registry to ci.yml wiring', () => {
  const blocked = wiring.blockedTokens(registry, pkg);

  test('real ci.yml passes (exactly one gate:all, no direct invocations)', () => {
    expect(wiring.checkWiring(ciYml, blocked)).toEqual([]);
  });

  test('negative: if-masked duplicate gate:all fails closed', () => {
    const bad = ciYml.replace('npm run gate:all',
      'npm run gate:all\n      - if: always()\n        run: npm run gate:all --fail-fast');
    expect(wiring.checkWiring(bad, blocked).some(m => /exactly 1/.test(m))).toBe(true);
  });

  test('negative: direct gate invocation fails closed', () => {
    const bad = ciYml + '\n      - run: node scripts/check-drift.js\n';
    expect(wiring.checkWiring(bad, blocked).some(m => /direct gate invocation/.test(m))).toBe(true);
  });

  test('negative: trailing comment does not hide a direct invocation', () => {
    const bad = ciYml + '\n      - run: node scripts/bench-gate.js # temporary\n';
    expect(wiring.checkWiring(bad, blocked).some(m => /direct gate invocation/.test(m))).toBe(true);
  });

  test('negative: a commented-out gate:all does not count as the invocation', () => {
    const bad = ciYml.replace('- run: npm run gate:all', '# - run: npm run gate:all');
    expect(wiring.checkWiring(bad, blocked).some(m => /exactly 1/.test(m))).toBe(true);
  });

  test('multi-line run block counts one gate:all and catches direct calls', () => {
    const ok = 'jobs:\n  j:\n    steps:\n      - run: |\n          npm run gate:all\n';
    expect(wiring.checkWiring(ok, blocked)).toEqual([]);
    const bad = 'jobs:\n  j:\n    steps:\n      - run: |\n          npm run gate:all\n          node scripts/check-deferred.js\n';
    expect(wiring.checkWiring(bad, blocked).some(m => /direct gate invocation/.test(m))).toBe(true);
  });

  test('negative: direct run-gates.js invocation is a second entrypoint (S1)', () => {
    const bad2 = 'jobs:\n  j:\n    steps:\n      - run: npm run gate:all\n      - run: node scripts/run-gates.js --fail-fast\n';
    expect(wiring.checkWiring(bad2, blocked).some(m => /direct gate invocation/.test(m))).toBe(true);
  });

  test('negative: npm alias wrapping a gate command fails closed even without :gate suffix (S2)', () => {
    const bad2 = 'jobs:\n  j:\n    steps:\n      - run: npm run gate:all\n      - run: npm run judge:bias\n';
    expect(wiring.checkWiring(bad2, blocked).some(m => /direct gate invocation/.test(m))).toBe(true);
  });
});


describe('ADR-0034 D3 execution semantics (stubbed exec)', () => {
  function fakeRegistry() {
    return { entries: [
      { name: 'm1', command: 'c0', tier: 'confirmatory', source_adr: 'x', order: 0 },
      { name: 'g1', command: 'c1', tier: 'confirmatory', source_adr: 'x', order: 100 },
      { name: 'g2', command: 'c2', tier: 'confirmatory', source_adr: 'x', order: 110 },
      { name: 'g3', command: 'c3', tier: 'observational', source_adr: 'x', order: 120 },
      { name: 'g4', command: 'c4', tier: 'deferred-with-unfreeze', source_adr: 'x', order: 130 },
    ] };
  }
  function execStub(codes) {
    const calls = [];
    const exec = (cmd) => { calls.push(cmd); return codes[cmd] || { code: 0, output: '' }; };
    return { calls, exec };
  }

  test('default complete-run aggregates all breaches (decision/evidence separation)', () => {
    const { calls, exec } = execStub({ c1: { code: 1, output: 'boom' } });
    const res = gates.runGates(fakeRegistry(), { exec: exec });
    expect(calls).toEqual(['c0', 'c1', 'c2', 'c3']); // failure never stops evidence collection
    expect(res.results.find(r => r.name === 'g4').status).toBe('skipped-deferred');
    expect(res.exitCode).toBe(1);
  });

  test('--fail-fast short-circuits confirmatory failures only', () => {
    const { calls, exec } = execStub({ c1: { code: 1, output: 'boom' } });
    const res = gates.runGates(fakeRegistry(), { exec: exec, failFast: true });
    expect(calls).toEqual(['c0', 'c1']);
    expect(res.results.find(r => r.name === 'g2').status).toBe('skipped-fail-fast');
    expect(res.results.find(r => r.name === 'g3').status).toBe('skipped-observational');
    expect(res.exitCode).toBe(1);
  });

  test('observational failure never blocks the run', () => {
    const t = execStub({ c3: { code: 1, output: 'warn' } });
    const res = gates.runGates(fakeRegistry(), { exec: t.exec });
    expect(res.exitCode).toBe(0);
  });

  test('advisory warnings aggregate and strip child annotations (ADR-0027 D3)', () => {
    const t = execStub({
      c1: { code: 0, output: '::warning file=a::band hit\nplain evidence' },
      c3: { code: 0, output: '::warning title=b::one more' },
    });
    const res = gates.runGates(fakeRegistry(), { exec: t.exec });
    expect(res.results.find(r => r.name === 'g1').warnings).toBe(1);
    expect(res.results.find(r => r.name === 'g3').warnings).toBe(1);
    expect(res.results.find(r => r.name === 'g1').output.indexOf('::warning')).toBe(-1);
    expect(res.results.find(r => r.name === 'g1').output.indexOf('plain evidence')).not.toBe(-1);
    expect(res.exitCode).toBe(0);
  });
});

describe('ADR-0034 smoke (real child processes)', () => {
  test('--check-alignment exits 0', () => {
    expect(() => execFileSync('node', ['scripts/run-gates.js', '--check-alignment'], { cwd: ROOT })).not.toThrow();
  });
  test('check-ci-wiring exits 0 on the real ci.yml', () => {
    expect(() => execFileSync('node', ['scripts/check-ci-wiring.js'], { cwd: ROOT, env: Object.assign({}, process.env, { CI: 'true' }) })).not.toThrow();
  });
  test('--check-coupling without a base ref skips green', () => {
    expect(() => execFileSync('node', ['scripts/run-gates.js', '--check-coupling'], { cwd: ROOT })).not.toThrow();
  });
});
