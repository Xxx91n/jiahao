'use strict';

// ADR-0058 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Audit-repair round (2026-09-12) adds the A1/A3/A4/A5 locks (R8-R11).
// Covers D-002 (success-only aggregator), D-004 (two-layer verification),
// D-005 (gate-layer entrypoint narrowing), D-006 (test gate removed from
// gates.json), D-007 (summary needs the full parallel set), D-008
// (JIAHAO_TEST_TIER=public, no corpus secret), D-009 (order 100 retired).
//
// This is a CONTENT-ANCHOR SEED - assertions are intent-shaped, not
// golden-master snapshots. Update single lines when ci.yml structure evolves.
//
// Repair note (2026-09-12, implementation round): the gate-layer job id is
// gate-all, not gate:all - a GitHub Actions job_id may contain only
// alphanumeric characters, - and _ (a colon is rejected). The gate:all SCRIPT
// name is unchanged, and needs.gate-all.result is valid property dereference
// syntax (property names allow -).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ciPath = path.join(ROOT, '.github', 'workflows', 'ci.yml');
const gatesPath = path.join(ROOT, 'docs', 'gates.json');
const adrPath = path.join(ROOT, 'docs', 'adr', '0058-ci-test-job-independence-and-gate-layer-entrypoint-narrowing.md');

const { parseJobs } = require('../scripts/check-ci-jobs');
const wiring = require('../scripts/check-ci-wiring');

const ciContent = fs.readFileSync(ciPath, 'utf8');
const gates = JSON.parse(fs.readFileSync(gatesPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const jobs = parseJobs(ciContent);
const body = (name) => (jobs[name] || []).join('\n');

describe('ADR-0058 D-006/D-009 registry narrowing', () => {
  test('gates.json does not contain a test gate entry', () => {
    expect(gates.entries.find(e => e.command && e.command.includes('run-test-gate'))).toBeUndefined();
  });

  test('no gate entry exists at order 100 (retired, do not reuse)', () => {
    expect(gates.entries.find(e => e.order === 100)).toBeUndefined();
  });

  test('ADR-0058 prose records order 100 as retired', () => {
    expect(fs.readFileSync(adrPath, 'utf8')).toMatch(/order\s+100\s+retired/i);
  });
});

describe('ADR-0058 D-004/D-005 ci.yml job topology', () => {
  test('every job id is a valid GitHub Actions job_id (charset has no colon)', () => {
    const names = Object.keys(jobs);
    expect(names).toEqual(['gate-all', 'test', 'summary']);
    for (const n of names) expect(n).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
  });

  test('ci.yml contains exactly one npm run gate:all (single gate-layer entrypoint)', () => {
    expect((ciContent.match(/npm run gate:all/g) || []).length).toBe(1);
  });

  test('the gate-all job no longer carries the test step', () => {
    expect(body('gate-all')).not.toMatch(/run-test-gate/);
    expect(body('gate-all')).not.toMatch(/npm test/);
  });

  test('no path filter can silently skip the test job', () => {
    expect(ciContent).not.toMatch(/^\s*paths(-ignore)?:/m);
  });
});

describe('ADR-0058 D-007/D-002 summary aggregation', () => {
  test('summary job uses if: always() unconditionally (not !cancelled())', () => {
    expect(body('summary')).toMatch(/^\s*if:\s*always\(\)\s*$/m);
    expect(body('summary')).not.toMatch(/!cancelled\(\)/);
  });

  test('summary job needs the full parallel set (gate-all + test)', () => {
    expect(body('summary')).toMatch(/needs:\s*\[[^\]]*\bgate-all\b[^\]]*\]/);
    expect(body('summary')).toMatch(/needs:\s*\[[^\]]*\btest\b[^\]]*\]/);
  });

  test('aggregation is success-only: skipped/failure/cancelled all read red', () => {
    expect(body('summary')).toMatch(/!=\s*"success"/);
    expect(body('summary')).toMatch(/needs\.gate-all\.result/);
    expect(body('summary')).toMatch(/needs\.test\.result/);
    expect(body('summary')).not.toMatch(/success\s*\|\|\s*skipped/);
    expect(ciContent).not.toMatch(/continue-on-error:\s*true/);
  });
});

describe('ADR-0058 D-008 test-layer tier contract', () => {
  test('test job sets JIAHAO_TEST_TIER=public', () => {
    expect(body('test')).toMatch(/JIAHAO_TEST_TIER:\s*public/);
  });

  test('test job does not reference the bench corpus secret', () => {
    expect(body('test')).not.toMatch(/JIAHAO_BENCH_CORPUS_B64/);
  });

  test('registered suite count on the ci.yml call line matches the on-disk suite count', () => {
    const m = body('test').match(/--expected-suites\s+(\d+)/);
    expect(m).toBeTruthy();
    const onDisk = fs.readdirSync(path.join(ROOT, 'test')).filter(f => f.endsWith('.test.js')).length;
    expect(Number(m[1])).toBe(onDisk);
  });
});

describe('ADR-0058 D-005/D-006 blocklist narrowing', () => {
  test('run-test-gate.js and npm test are no longer blocked tokens', () => {
    const blocked = wiring.blockedTokens(gates, pkg);
    expect(blocked.some(t => t.indexOf('run-test-gate') !== -1)).toBe(false);
    expect(blocked.some(t => /^npm (run )?test$/.test(t))).toBe(false);
  });
});

// ---- audit-repair round (2026-09-12): A1 / A3 / A4 / A5 regression locks ----

describe('ADR-0058 R8 test-job capability declaration (audit A1)', () => {
  const cap = require('../src/shared/capability');
  const wrapper = fs.readFileSync(path.join(ROOT, 'scripts', 'run-test-gate.js'), 'utf8');
  const capPath = path.join(ROOT, 'src', 'shared', 'capability.js');
  const probeScript = 'const c=require(process.argv[1]);c.requireCapabilities([process.argv[2]],{root:process.argv[3]});console.log("CAP-OK");';

  test('the wrapper no longer resolves a removed registry entry', () => {
    expect(wrapper).not.toMatch(/requireCapabilities\(\'test\'\)/);
  });

  test('the wrapper declares its capabilities inline, inside the closed enum', () => {
    const m = wrapper.match(/requireCapabilities\(\[([^\]]*)\]\)/);
    expect(m).toBeTruthy();
    const declared = m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    expect(declared.length).toBeGreaterThan(0);
    for (const c of declared) expect(cap.CAPABILITIES).toContain(c);
  });

  test('the public-tier test job does not declare bench-corpus', () => {
    expect(wrapper).not.toMatch(/requireCapabilities\(\[[^\]]*bench-corpus/);
  });

  test('array form: present capability passes, absent one exits 2 honestly', () => {
    const ok = spawnSync(process.execPath, ['-e', probeScript, capPath, 'repo-tree', ROOT], { cwd: ROOT, encoding: 'utf8' });
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain('CAP-OK');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0058-cap-'));
    const bad = spawnSync(process.execPath, ['-e', probeScript, capPath, 'repo-tree', tmp], { cwd: tmp, encoding: 'utf8' });
    expect(bad.status).toBe(2);
    expect(bad.stdout).toContain('::error title=UNVERIFIABLE');
  });

  test('an unknown name in the array is still a registry violation, never exit 2', () => {
    const r = spawnSync(process.execPath, ['-e', probeScript, capPath, 'nope-cap', ROOT], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/unregistered capability/);
  });
});

describe('ADR-0058 R9 summary result-count guard (audit A3)', () => {
  test('the aggregator counts results and asserts seen == expected', () => {
    const s = body('summary');
    expect(s).toMatch(/seen=/);
    expect(s).toMatch(/expected=(\d+)/);
    expect(s).toMatch(/-ne\s+"[$]expected"/);
  });

  test('expected equals the parsed needs count (cannot drift)', () => {
    const s = body('summary');
    const m = s.match(/expected=(\d+)/);
    expect(m).toBeTruthy();
    const needsLine = s.match(/^\s*needs:\s*\[([^\]]*)\]/m);
    expect(needsLine).toBeTruthy();
    const needs = needsLine[1].split(',').map(x => x.trim()).filter(Boolean);
    expect(Number(m[1])).toBe(needs.length);
  });
});

describe('ADR-0058 R10 adjacent-doc truth (audit A4)', () => {
  test('ADR-0057 Context no longer claims the test gate is the current home', () => {
    const a = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0057-test-skip-honesty-and-suite-count-assertion.md'), 'utf8');
    expect(a).not.toMatch(/currently execute inside gate:all/);
    expect(a).toMatch(/independent CI test job/);
  });
});

describe('ADR-0058 R11 gitignore hygiene (audit A5)', () => {
  test('mr-artifacts/ is ignored alongside its three siblings', () => {
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    for (const d of ['bench-artifacts/', 'probe-artifacts/', 'test-artifacts/', 'mr-artifacts/']) {
      expect(gi).toContain(d);
    }
  });
});
