'use strict';

// ADR-0058 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Audit-repair round (2026-09-12) adds the A1/A3/A4/A5 locks (R8-R12).
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
const yml = (jobsText) => 'name: ci\n\njobs:\n' + jobsText;
const job = (name, bodyText) => '  ' + name + ':\n    runs-on: x\n' + (bodyText || '    steps: []\n');

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
    expect(wrapper).not.toMatch(/requireCapabilities\(\s*['"]test['"]\s*\)/);
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

  // Audit-repair round 2 (2026-09-12, audit B1 residual R1): a multi-element
  // inline declaration must not inject a workflow-command property separator.
  // Direct path exercises escWf's ',' escaping via unverifiableLines; the
  // end-to-end path exercises the comma-free 'a+b' label from requireCapabilities.
  test('a multi-element inline declaration cannot inject a property separator', () => {
    const line = cap.unverifiableLines(['repo-tree', 'docs-adr'], 'docs-adr')[0];
    expect(line).toMatch(/^::error title=UNVERIFIABLE,gate=[^,]*,requires=[^,]*::/);
    expect(line).not.toMatch(/gate=repo-tree,docs-adr/);

    const probe2 = 'const c=require(process.argv[1]);c.requireCapabilities([process.argv[2],process.argv[3]],{root:process.argv[4]});console.log("CAP-OK");';
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0058-cap2-'));
    const bad = spawnSync(process.execPath, ['-e', probe2, capPath, 'repo-tree', 'docs-adr', tmp], { cwd: tmp, encoding: 'utf8' });
    expect(bad.status).toBe(2);
    const machine = bad.stdout.split(/\r?\n/).find(l => l.indexOf('::error title=UNVERIFIABLE') === 0);
    expect(machine).toBeTruthy();
    expect(machine).toMatch(/^::error title=UNVERIFIABLE,gate=[^,]*,requires=[^,]*::/);
    expect(machine).not.toMatch(/gate=repo-tree,docs-adr/);
  });
});

describe('ADR-0058 R9 summary result-count guard (audit A3)', () => {
  test('the aggregator counts results and asserts seen == expected', () => {
    const s = body('summary');
    expect(s).toContain('seen=$((seen + 1))');
    expect(s).toContain('if [ "$seen" -ne "$expected" ]');
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

describe('ADR-0058 R11 adjacent-doc truth (audit A4)', () => {
  test('ADR-0057 Context no longer claims the test gate is the current home', () => {
    const a = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0057-test-skip-honesty-and-suite-count-assertion.md'), 'utf8');
    expect(a).not.toMatch(/currently execute inside gate:all/);
    expect(a).toMatch(/independent CI test job/);
  });
});

describe('ADR-0058 R12 gitignore hygiene (audit A5)', () => {
  test('mr-artifacts/ is ignored alongside its three siblings', () => {
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    for (const d of ['bench-artifacts/', 'probe-artifacts/', 'test-artifacts/', 'mr-artifacts/']) {
      expect(gi).toContain(d);
    }
  });
});

describe('defer-0004 narrowed trigger (grill-t15 D-003 re-defer)', () => {
  const { evaluate, presence } = require('../scripts/check-ci-jobs');

  test('negative fixture: the live shape (single workflow, 3 jobs, no matrix) does NOT satisfy the narrowed trigger', () => {
    const text = yml(job('gate-all') + job('test') + job('summary', '    if: always()\n    needs: [gate-all, test]\n'));
    const p = presence(text, { workflowFiles: 1 });
    expect(p.defer0004.satisfied).toBe(false);
    expect(p.defer0004.multi_workflow).toBe(false);
    expect(p.defer0004.any_matrix).toBe(false);
    expect(p.defer0004.over_three_jobs).toBe(false);
    expect(p.defer0026.satisfied).toBe(true);
    expect(evaluate(text, { workflowFiles: 1 }).unmet).toEqual(['defer0004']);
  });

  test('positive fixtures: multi-workflow OR any matrix OR >3 jobs each satisfy the narrowed trigger', () => {
    const base = yml(job('gate-all') + job('test') + job('summary', '    if: always()\n'));
    expect(presence(base, { workflowFiles: 2 }).defer0004.satisfied).toBe(true);
    const withMatrix = yml(job('test', '    strategy:\n      matrix:\n        node: [20]\n') + job('gate-all') + job('summary', '    if: always()\n'));
    const pm = presence(withMatrix, { workflowFiles: 1 });
    expect(pm.defer0004.any_matrix).toBe(true);
    expect(pm.defer0004.satisfied).toBe(true);
    const inlineMatrix = yml(job('test', '    strategy:\n      matrix: {os: [ubuntu-latest]}\n') + job('gate-all') + job('summary', '    if: always()\n'));
    expect(presence(inlineMatrix, { workflowFiles: 1 }).defer0004.any_matrix).toBe(true); // F-E nit: inline matrix: {...} form
    const four = yml(job('a') + job('b') + job('c') + job('d'));
    const p4 = presence(four, { workflowFiles: 1 });
    expect(p4.defer0004.over_three_jobs).toBe(true);
    expect(p4.defer0004.satisfied).toBe(true);
  });

  test('boundary: exactly three jobs with no matrix stays deferred', () => {
    const three = yml(job('a') + job('b') + job('c'));
    expect(presence(three, { workflowFiles: 1 }).defer0004.satisfied).toBe(false);
  });

  test('the live ci.yml reports defer0004 unmet and defer0026 satisfied', () => {
    const res = evaluate(fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8'), { workflowFiles: 1 });
    expect(res.predicates.defer0004.satisfied).toBe(false);
    expect(res.predicates.defer0026.satisfied).toBe(true);
  });

  test('the registry row carries the narrowed prose trigger with the same verified_by', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
    const d = reg.entries.find(function (e) { return e.id === 'defer-0004'; });
    expect(d.status).toBe('deferred');
    expect(d.unfreeze_if.verified_by).toBe('scripts/check-ci-jobs.js');
    expect(d.unfreeze_if.check).toContain('multiple workflow files');
    expect(d.unfreeze_if.check).toContain('matrix');
    expect(d.unfreeze_if.check).toContain('> 3');
    expect(d.rationale).toContain('narrowed');
  });
});

describe('ADR-0077 D-A consuming-row exit semantics (grill-t16)', () => {
  const { evaluate, presence, CONSUMING_ROW } = require('../scripts/check-ci-jobs');
  const script = path.join(ROOT, 'scripts', 'check-ci-jobs.js');
  const run = (ymlText) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-cijobs-'));
    try {
      const f = path.join(dir, 'ci.yml');
      fs.writeFileSync(f, ymlText);
      return spawnSync(process.execPath, [script, f], { cwd: ROOT, encoding: 'utf8' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  test('the consuming row is defer0004 (the only live consumer)', () => {
    expect(CONSUMING_ROW).toBe('defer0004');
    const res = evaluate(fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8'), { workflowFiles: 1 });
    expect(res.satisfied).toBe(res.predicates.defer0004.satisfied);
  });

  test('direction 1 - consuming row satisfied -> exit 0', () => {
    const text = yml(job('a') + job('b') + job('c') + job('d', '    strategy:\n      matrix: {os: [x]}\n'));
    const r = run(text);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('defer0004=SATISFIED');
    expect(r.stdout).toContain('human review suggested');
  });

  test('direction 2 - consuming row unmet -> exit 1 (live shape)', () => {
    const text = yml(job('gate-all') + job('test') + job('summary', '    if: always()\n    needs: [gate-all, test]\n'));
    const r = run(text);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('defer0004=unmet');
    expect(r.stdout).toContain('the deferral remains valid');
  });

  test('direction 3 - a regressed non-consuming row stays diagnostic: exit 0 with defer0026=unmet printed', () => {
    const text = yml(job('a') + job('b') + job('c') + job('d')); // 4 jobs satisfies defer0004; no test/summary jobs regress defer0026
    const res = evaluate(text, { workflowFiles: 1 });
    expect(res.predicates.defer0026.satisfied).toBe(false);
    expect(res.satisfied).toBe(true); // the union-exit class is dead
    expect(res.unmet).toEqual(['defer0026']); // diagnostics still report it
    const r = run(text);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('defer0026=unmet');
  });

  test('a crash exits 2 with a stderr line - never masquerades as unsatisfied', () => {
    const missing = path.join(os.tmpdir(), 'jh-cijobs-no-such-file.yml');
    const r = spawnSync(process.execPath, [script, missing], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('verifier broken');
    expect(r.stdout).not.toContain('the deferral remains valid');
  });

  test('the header registers the convention verbatim and the discharge re-point clause', () => {
    const src = fs.readFileSync(script, 'utf8');
    expect(src).toContain('currently consuming');
    expect(src).toContain('multi-row reporting is diagnostic, never exit-driving');
    expect(src).toContain('re-points or retires in the same commit');
    expect(src).toContain('exit 2');
  });
});
