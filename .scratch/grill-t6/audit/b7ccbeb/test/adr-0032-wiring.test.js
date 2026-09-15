// ADR-0032 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Covers D2 (gsr headers + parser), D3 (coverage map gate), D5 (lifecycle
// state machine: cap, superseded-by, active-only coverage targets).
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const NL = String.fromCharCode(10);

const { splitByProfile, parseGsrHeaders, validateGsrHeaders, GSR_ACTIVE_CAP } = require('../hooks/jiahao-profile');
const { buildAdapters } = require('../scripts/build-adapters');
const checkCoverage = require('../scripts/check-coverage');

const skill = fs.readFileSync(path.join(ROOT, 'src', 'SKILL.md'), 'utf8');
const gen = splitByProfile(skill).generator;
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'coverage-map.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10); // same clock the CLI gate uses

function synthGen(rules) {
  // rules: [{id, domain, status, check, supersededBy, bullet}] -> generator-shaped text
  const parts = ['## Generator Profile', '', '### Surface Signal Rules', ''];
  for (const r of rules) {
    let h = '<!-- gsr:' + r.id + ' | signal-domain: ' + (r.domain || 'x') + ' | status: ' + (r.status || 'active');
    if (r.check) h += ' | check: ' + r.check;
    if (r.supersededBy) h += ' | superseded-by: gsr:' + r.supersededBy;
    if (r.reason) h += ' | reason: ' + r.reason;
    h += ' -->';
    parts.push(h);
    parts.push('- **' + r.bullet + '.** body');
  }
  parts.push('## Boundaries');
  return parts.join(NL);
}

describe('ADR-0032 D2 gsr headers', () => {
  test('real SKILL.md carries exactly 3 well-formed active headers', () => {
    const rules = parseGsrHeaders(gen);
    expect(rules.map(r => r.id)).toEqual([1, 2, 3]);
    expect(rules.every(r => r.status === 'active')).toBe(true);
    expect(rules.map(r => r.domain)).toEqual(['completion-claim', 'state-change', 'tool-evidence']);
    expect(rules.every(r => r.check === 'adr-0032-wiring')).toBe(true);
    expect(validateGsrHeaders(gen)).toEqual([]);
  });

  test('headers travel into every generator-tier adapter (injection proof)', () => {
    const adapters = buildAdapters(); // throws if gsr validation fails
    const seen = [];
    for (const [rel, content] of Object.entries(adapters)) {
      if (rel.includes('generator')) seen.push(rel);
      expect(content.includes('gsr:')).toBe(rel.includes('generator'));
    }
    expect(seen.length).toBeGreaterThan(0);
  });

  test('negative: rule bullet without preceding header is caught', () => {
    const text = synthGen([{ id: 1, bullet: 'R one' }]) + NL + '- **R orphan.** body';
    const errors = validateGsrHeaders(text);
    expect(errors.some(e => e.includes('without gsr header'))).toBe(true);
  });

  test('negative: duplicate ids are caught', () => {
    const text = synthGen([{ id: 1, bullet: 'A' }, { id: 1, bullet: 'B' }]);
    expect(validateGsrHeaders(text).some(e => e.includes('duplicate gsr id'))).toBe(true);
  });

  test('negative: superseded without superseded-by is caught; dangling link resolved check', () => {
    const missing = synthGen([{ id: 1, bullet: 'A', status: 'superseded' }]);
    expect(validateGsrHeaders(missing).some(e => e.includes('without superseded-by'))).toBe(true);
    const dangling = synthGen([{ id: 1, bullet: 'A', status: 'superseded', supersededBy: 9 }]);
    expect(validateGsrHeaders(dangling).some(e => e.includes('does not resolve'))).toBe(true);
    const ok = synthGen([{ id: 1, bullet: 'A', status: 'superseded', supersededBy: 2, reason: 'merged' }, { id: 2, bullet: 'B' }]);
    expect(validateGsrHeaders(ok)).toEqual([]);
  });

  test('lifecycle: retirement requires exactly one reason tag (ADR-0032 D5)', () => {
    const noReason = synthGen([{ id: 1, bullet: 'A', status: 'deprecated' }]);
    expect(validateGsrHeaders(noReason).some(e => e.includes('without reason tag'))).toBe(true);
    const activeWithReason = synthGen([{ id: 1, bullet: 'A', reason: 'merged' }]);
    expect(validateGsrHeaders(activeWithReason).some(e => e.includes('carries reason'))).toBe(true);
    const ok = synthGen([{ id: 1, bullet: 'A', status: 'deprecated', reason: 'not-in-scope' }]);
    expect(validateGsrHeaders(ok)).toEqual([]);
  });

  test('negative: enforced-active cap is enforced', () => {
    const rules = [];
    for (let i = 1; i <= GSR_ACTIVE_CAP + 1; i++) rules.push({ id: i, bullet: 'R' + i });
    expect(validateGsrHeaders(synthGen(rules)).some(e => e.includes('active rule cap exceeded'))).toBe(true);
  });
});

describe('ADR-0032 D3 coverage map gate', () => {
  test('real registry passes shape + entries on current rules', () => {
    const gsr = { rules: parseGsrHeaders(gen) };
    expect(checkCoverage.validateShape(registry)).toEqual([]);
    expect(checkCoverage.validateEntries(registry, gsr, today)).toEqual([]);
  });

  test('seed mapping matches ADR-0032 D3', () => {
    expect(registry.laws.L1).toMatchObject({ state: 'covered', targets: ['gsr:1', 'gsr:3'] });
    expect(registry.laws.L2.state).toBe('declared-gap');
    expect(registry.laws.L3).toMatchObject({ state: 'covered', targets: ['gsr:1'] });
    expect(registry.laws.L4.state).toBe('declared-gap');
    expect(registry.laws.L5).toMatchObject({ state: 'covered', targets: ['gsr:2'] });
    expect(registry.laws.L6.state).toBe('declared-gap');
    expect(registry.laws.L7).toMatchObject({ state: 'covered', targets: ['gsr:1', 'gsr:3'] });
  });

  test('negative: missing law entry and unknown state are caught', () => {
    const bad = JSON.parse(JSON.stringify(registry));
    delete bad.laws.L7;
    expect(checkCoverage.validateShape(bad).some(e => e.includes('L7'))).toBe(true);
    const bad2 = JSON.parse(JSON.stringify(registry));
    bad2.laws.L1.state = 'maybe-covered';
    expect(checkCoverage.validateShape(bad2).some(e => e.includes('state'))).toBe(true);
  });

  test('negative: covered target resolving to nothing or non-active is caught', () => {
    const gsr = { rules: parseGsrHeaders(gen) };
    const bad = JSON.parse(JSON.stringify(registry));
    bad.laws.L1.targets = ['gsr:99'];
    expect(checkCoverage.validateEntries(bad, gsr, today).some(e => e.includes('no gsr header'))).toBe(true);
    const gsrSup = { rules: [{ id: 1, status: 'superseded', supersededBy: 3 }, { id: 3, status: 'active' }].map(r => Object.assign({ domain: 'x', check: null }, r)) };
    expect(checkCoverage.validateEntries(registry, gsrSup, today).some(e => e.includes('not active'))).toBe(true);
  });

  test('negative: overdue declared-gap review_at is STALE; missing rationale caught', () => {
    const bad = JSON.parse(JSON.stringify(registry));
    bad.laws.L2.review_at = '2020-01-01';
    expect(checkCoverage.validateEntries(bad, { rules: parseGsrHeaders(gen) }, today).some(e => e.includes('STALE'))).toBe(true);
    const bad2 = JSON.parse(JSON.stringify(registry));
    delete bad2.laws.L4.rationale;
    expect(checkCoverage.validateEntries(bad2, { rules: parseGsrHeaders(gen) }, today).some(e => e.includes('rationale'))).toBe(true);
  });
});
