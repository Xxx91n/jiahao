// ADR-0035 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Covers D1 (cadence_tier ladder field), D2 (pending-evaluation residency
// SLA), D3 (last_check_in discipline, warn-level), D5 (check-ci-jobs
// assertion), D6 (verified_by fail-closed enforcement + suggestion semantics).
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const checkDeferred = require('../scripts/check-deferred');
const checkCiJobs = require('../scripts/check-ci-jobs');

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
const thresholds = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'), 'utf8'));
const sources = checkDeferred.loadSources();
const today = new Date().toISOString().slice(0, 10);

function clone(o) { return JSON.parse(JSON.stringify(o)); }

describe('ADR-0035 D1 cadence ladder fields', () => {
  test('every entry carries a valid cadence_tier and registered_at', () => {
    for (const e of registry.entries) {
      expect(checkDeferred.TIERS).toContain(e.cadence_tier);
      expect(e.registered_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('ladder review_at assignments match ADR-0035 D1', () => {
    const byId = Object.fromEntries(registry.entries.map(e => [e.id, e]));
    expect(byId['defer-0001'].review_at).toBe('2027-02-28'); // half-yearly
    expect(byId['defer-0002'].review_at).toBe('2026-11-30'); // quarterly
    expect(byId['defer-0003'].review_at).toBe('2027-08-31'); // yearly
    expect(byId['defer-0004'].review_at).toBe('2027-08-31'); // yearly
    expect(byId['defer-0005'].review_at).toBe('2026-11-30'); // quarterly
  });

  test('negative: missing cadence_tier / registered_at is a shape error', () => {
    const bad = clone(registry);
    delete bad.entries[0].cadence_tier;
    delete bad.entries[0].registered_at;
    const errs = checkDeferred.validateShape(bad);
    expect(errs.some(m => m.indexOf('cadence_tier') !== -1)).toBe(true);
    expect(errs.some(m => m.indexOf('registered_at') !== -1)).toBe(true);
  });
});

describe('ADR-0035 D2 residency SLA', () => {
  test('negative: pending-evaluation entry past min(2 cycles, 12 months) fails', () => {
    const bad = clone(registry);
    bad.entries[1].registered_at = '2025-01-01'; // quarterly cap = 184d; way past
    const errs = checkDeferred.validateEntries(bad, sources, thresholds, today);
    expect(errs.some(m => m.indexOf('SLA') !== -1 && m.indexOf('defer-0002') !== -1)).toBe(true);
  });

  test('special case: SLA failure is fail-closed even before review_at expiry', () => {
    const bad = clone(registry);
    // 0003 is yearly (cap 365d); register 2 years ago but keep review_at future
    bad.entries[2].registered_at = '2024-01-01';
    bad.entries[2].review_at = '2027-08-31';
    const errs = checkDeferred.validateEntries(bad, sources, thresholds, today);
    expect(errs.some(m => m.indexOf('SLA') !== -1 && m.indexOf('defer-0003') !== -1)).toBe(true);
  });
});

describe('ADR-0035 D3 check-in discipline (warn-level)', () => {
  test('real registry has no discipline warnings today', () => {
    expect(checkDeferred.validateDiscipline(registry, today)).toEqual([]);
  });

  test('warn: stale last_check_in and missing last_check_in are warnings, not errors', () => {
    const bad = clone(registry);
    bad.entries[1].last_check_in = { date: '2020-01-01', note: 'old check' };
    delete bad.entries[2].last_check_in;
    const warns = checkDeferred.validateDiscipline(bad, today);
    expect(warns.some(m => m.indexOf('defer-0002') !== -1)).toBe(true);
    expect(warns.some(m => m.indexOf('defer-0003') !== -1)).toBe(true);
    // warnings must NOT appear as errors
    const errs = checkDeferred.validateEntries(bad, sources, thresholds, today);
    expect(errs.some(m => m.indexOf('last_check_in') !== -1)).toBe(false);
  });

  test('negative: malformed last_check_in is a shape error', () => {
    const bad = clone(registry);
    bad.entries[1].last_check_in = { date: 'not-a-date', note: 'x' };
    expect(checkDeferred.validateShape(bad).some(m => m.indexOf('last_check_in') !== -1)).toBe(true);
  });
});

describe('ADR-0035 D5/D6 verified_by semantics', () => {
  test('defer-0004 carries verified_by pointing at a real assertion script', () => {
    const e = registry.entries.find(x => x.id === 'defer-0004');
    expect(e.unfreeze_if.verified_by).toBe('scripts/check-ci-jobs.js');
    expect(fs.existsSync(path.join(ROOT, 'scripts', 'check-ci-jobs.js'))).toBe(true);
  });

  test('negative: evaluable type without verified_by is forced to pending-evaluation', () => {
    const bad = clone(registry);
    bad.entries[0].status = 'deferred'; // 0001 has no verified_by
    const errs = checkDeferred.validateEntries(bad, sources, thresholds, today);
    expect(errs.some(m => m.indexOf('defer-0001') !== -1 && m.indexOf('forced to pending-evaluation') !== -1)).toBe(true);
  });

  test('negative: verified_by pointing at a missing script is a shape error', () => {
    const bad = clone(registry);
    bad.entries[3].unfreeze_if.verified_by = 'scripts/no-such-assertion.js';
    expect(checkDeferred.validateShape(bad).some(m => m.indexOf('verified_by script missing') !== -1)).toBe(true);
  });

  test('check-ci-jobs countJobs counts top-level jobs only', () => {
    const single = 'name: ci\non: push\njobs:\n  test-and-drift:\n    steps:\n      - run: npm test\n';
    const multi = 'name: ci\njobs:\n  a:\n    steps: []\n  b-c:\n    steps: []\n';
    expect(checkCiJobs.countJobs(single)).toBe(1);
    expect(checkCiJobs.countJobs(multi)).toBe(2);
  });

  test('check-ci-jobs on real ci.yml: single job today -> exit 1 (condition not met)', () => {
    let code = 0;
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-ci-jobs.js')], { stdio: 'pipe' });
    } catch (err) { code = err.status; }
    expect(code).toBe(1);
  });

  test('evalSuggestions: satisfied assertion suggests, unsatisfied stays silent', () => {
    // real registry: defer-0004 condition not met -> no suggestion
    expect(checkDeferred.evalSuggestions(registry)).toEqual([]);
    // synthetic: verified_by script that always exits 0 -> SUGGEST
    // (repo-relative: evalSuggestions resolves verified_by against ROOT)
    const tmp = path.join(ROOT, 'scripts', '.tmp-adr0035-satisfied.js');
    fs.writeFileSync(tmp, 'process.exit(0);\n');
    try {
      const fake = clone(registry);
      fake.entries[3].unfreeze_if.verified_by = 'scripts/.tmp-adr0035-satisfied.js';
      const s = checkDeferred.evalSuggestions(fake);
      expect(s.some(m => m.indexOf('defer-0004') !== -1 && m.indexOf('SATISFIED') !== -1)).toBe(true);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('audit fix: crashing verifier surfaces as WARN, not silent "not satisfied"', () => {
    const tmp = path.join(ROOT, 'scripts', '.tmp-adr0035-crash.js');
    fs.writeFileSync(tmp, 'process.exit(2);\n'); // node crashes also exit 1; contract: >1 = broken verifier
    try {
      const fake = clone(registry);
      fake.entries[3].unfreeze_if.verified_by = 'scripts/.tmp-adr0035-crash.js';
      const s = checkDeferred.evalSuggestions(fake);
      expect(s.some(m => m.indexOf('WARN') !== -1 && m.indexOf('defer-0004') !== -1)).toBe(true);
      expect(s.some(m => m.indexOf('SATISFIED') !== -1)).toBe(false);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

describe('ADR-0035 D4 defer-0002 split', () => {
  test('defer-0002 is pure external-event with upstream-issue check; defer-0005 carries the protocol verification', () => {
    const byId = Object.fromEntries(registry.entries.map(e => [e.id, e]));
    expect(byId['defer-0002'].unfreeze_if.type).toBe('external-event');
    expect(byId['defer-0002'].unfreeze_if.check).toMatch(/1730/);
    expect(byId['defer-0002'].unfreeze_if.check).not.toMatch(/official docs/i);
    expect(byId['defer-0005'].unfreeze_if.type).toBe('free-text');
    expect(byId['defer-0005'].status).toBe('pending-evaluation');
    expect(byId['defer-0005'].source_adr).toMatch(/0035/);
  });
});
