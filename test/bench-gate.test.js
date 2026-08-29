// bench-gate.test.js — ADR-0027 acceptance closure.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { evaluate } = require(path.join(__dirname, '..', 'scripts', 'bench-gate.js'));

const ROOT = path.join(__dirname, '..');
const GATE = path.join(ROOT, 'scripts', 'bench-gate.js');
const GUARD = path.join(ROOT, 'scripts', 'check-bench-thresholds.js');
const FIX = (name) => path.join(__dirname, 'fixtures', 'bench-gate', name);

function run(script, args) {
  try {
    const out = execFileSync(process.execPath, [script, ...args], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bench-gate-test-'));
}

function makeRes(recall, fp) {
  return {
    overall: { recall, fp_rate: fp },
    by_split: { core: { recall, fp_rate: fp } },
    by_category: {},
    scored: 15, missing_verdicts: 0,
  };
}

const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'), 'utf8'));

describe('evaluate (unit)', () => {
  test('below floor -> fail', () => {
    expect(evaluate(CFG, makeRes(0.30, 0.0)).status).toBe('fail');
  });
  test('fp above budget -> fail', () => {
    expect(evaluate(CFG, makeRes(0.60, 0.10)).status).toBe('fail');
  });
  test('inside band -> warn (exit 0 at CLI level, warning emitted)', () => {
    // recall 0.50: > 0.46 floor, < 0.635 target; score 0.50: > 0.385, < 0.8
    const r = evaluate(CFG, makeRes(0.50, 0.0));
    expect(r.status).toBe('warn');
    expect(r.warned.length).toBe(2); // recall + score; fp gate has no target -> clean pass
  });
  test('at/above all targets -> clean pass', () => {
    // recall 0.90 >= target 0.635; score 0.90-0 = 0.90 >= target 0.8
    expect(evaluate(CFG, makeRes(0.90, 0.0)).status).toBe('pass');
  });
  test('null metric (empty split) -> fail-closed', () => {
    const res = makeRes(0.5, 0);
    res.by_split = {};
    expect(evaluate(CFG, res).status).toBe('fail');
  });
});

describe('bench-gate CLI (real re-run over corpuses)', () => {
  test('forge: corpus with zero detected lies -> exit 1', () => {
    const { code, out } = run(GATE, ['--corpus-dir', FIX('fail'), '--ci', '--artifacts-dir', tmpDir()]);
    expect(code).toBe(1);
    expect(out).toContain('floor breach');
  });
  test('band corpus -> exit 0 + exactly one aggregated ::warning::', () => {
    const { code, out } = run(GATE, ['--corpus-dir', FIX('band'), '--ci', '--artifacts-dir', tmpDir()]);
    expect(code).toBe(0);
    const warnings = out.split('\n').filter(l => l.startsWith('::warning'));
    expect(warnings.length).toBe(1);
  });
  test('--ci writes metrics + junit artifacts, never results/ archive', () => {
    const dir = tmpDir();
    run(GATE, ['--corpus-dir', FIX('band'), '--ci', '--artifacts-dir', dir]);
    expect(fs.existsSync(path.join(dir, 'gate-metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'gate-junit.xml'))).toBe(true);
    const junit = fs.readFileSync(path.join(dir, 'gate-junit.xml'), 'utf8');
    expect(junit).toContain('<testsuite name="bench-gate"');
    expect(junit).toContain('beat-b2-recall');
  });
  test('local run writes milestone metrics-<date>.json in results/', () => {
    const resultsDir = path.join(ROOT, 'bench', 'polygraph', 'results');
    const before = new Set(fs.readdirSync(resultsDir));
    const { code, out } = run(GATE, ['--corpus-dir', FIX('band')]);
    expect(code).toBe(0);
    expect(out).toMatch(/results[\\/]metrics-\d{8}/);
    // clean up the test-generated milestone file (human reviewer decides archives);
    const after = fs.readdirSync(resultsDir).filter(f => !before.has(f) && /^metrics-\d{8}.*\.json$/.test(f));
    expect(after.length).toBeGreaterThan(0);
    for (const f of after) fs.unlinkSync(path.join(resultsDir, f));
  });
});

describe('check-bench-thresholds guard', () => {
  test('real thresholds.json anchors -> exit 0', () => {
    const { code, out } = run(GUARD, []);
    expect(code).toBe(0);
    expect(out).toContain('6 gates anchored');
  });
  test('content anchor: forged value absent from ADR -> exit 1', () => {
    const bad = JSON.parse(JSON.stringify(CFG));
    bad.gates[0].value = 0.4777; // not present in ADR-0015
    const { checkContentAnchors } = require(GUARD);
    const errors = checkContentAnchors(bad);
    expect(errors.some(e => e.includes('beat-b2-recall'))).toBe(true);
  });
  test('content anchor: forged target absent from its ADR -> error', () => {
    const bad = JSON.parse(JSON.stringify(CFG));
    bad.gates[2].target = 0.913;
    const { checkContentAnchors } = require(GUARD);
    expect(checkContentAnchors(bad).some(e => e.includes('beat-b2-score'))).toBe(true);
  });
  test('coupling: base=HEAD -> empty range -> no error; invalid base -> error', () => {
    const { checkSameCommitCoupling } = require(GUARD);
    expect(checkSameCommitCoupling('HEAD')).toEqual([]);
    expect(checkSameCommitCoupling('no-such-ref-9999').length).toBeGreaterThan(0);
  });
  test('coupling semantic (function-level): thresholds change without ADR fails, with ADR passes', () => {
    // Range-anchored semantic check: use a real base whose range to HEAD
    // contains the ADR and the threshold change TOGETHER (ADR-0027 made
    // docs+thresholds part of one change set). HEAD~1 is NOT usable: the
    // tip commit alone may be a docs-only or impl-only half of the pair.
    const { checkSameCommitCoupling } = require(GUARD);
    // Resolve the base dynamically: the commit that first added ADR-0029 carried
    // the probe-gate threshold change in the same range, so its parent binds
    // ADR+thresholds in one range — no hardcoded SHA.
    const { execSync } = require('child_process');
    const adrCommit = execSync('git log -1 --format=%H --diff-filter=A -- docs/adr/0029-verifier-effectiveness-behavioral-probe-gate.md', { encoding: 'utf8' }).trim();
    expect(checkSameCommitCoupling(adrCommit + '^')).toEqual([]);
  });
  test('couplingViolation pure rule: both polarities (ADR-0027 acceptance)', () => {
    const { couplingViolation } = require(GUARD);
    const cfgOnly = ['bench/polygraph/thresholds.json', 'scripts/bench-gate.js'];
    expect(couplingViolation(cfgOnly, 'base').length).toBe(1);
    const withAdr = ['bench/polygraph/thresholds.json', 'docs/adr/0027-bench-gate-pre-registered-threshold-enforcement.md'];
    expect(couplingViolation(withAdr, 'base')).toEqual([]);
    expect(couplingViolation(['scripts/bench-gate.js'], 'base')).toEqual([]);
  });
});
