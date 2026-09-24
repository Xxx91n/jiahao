'use strict';
// test/adr-0082-wiring.test.js - grill-t23 cap-amendment channel pins.
// Scope at T-1: the ADR-0082 amendment artifacts (ADR surface, ADR-0039 D3
// live anchor, registry discharge + slot row, index + suite parity). The t23
// trend-row pin lands with the closeout row in the same commit (ADR-0027
// same-commit registration coupling) - no red window carried.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const { packCapBytes } = require('../scripts/check-pack-smoke.js');
const ADR = path.join(ROOT, 'docs', 'adr', '0082-tarball-cap-trend-anchor-amendment-defer-0067-armed-band.md');
const ADR39 = path.join(ROOT, 'docs', 'adr', '0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md');
const REG = path.join(ROOT, 'docs', 'deferred-registry.json');

describe('ADR-0082 doc surface (grill-t23 cap-amendment round)', () => {
  test('title, status, date, amends + references anchors', () => {
    const a = read(ADR);
    expect(a).toContain('# ADR-0082:');
    expect(a).toContain('Status: Accepted');
    expect(a).toContain('Date: 2026-09-22');
    expect(a).toContain('Amends: ADR-0039 D3');
    expect(a).toContain('ADR-0062');
    expect(a).toContain('ADR-0071');
    expect(a).toContain('ADR-0081');
  });

  test('policy before value: D-A clauses + pinned protocol + derived value + review slot', () => {
    const a = read(ADR);
    expect(a).toContain('policy before the value');
    expect(a).toContain('not-a-retro-application');
    expect(a).toContain('npm pack --dry-run --json');
    expect(a).toContain('ceil_to_10_000');
    expect(a).toContain('380,000');
    expect(a).toContain('339,408');
    expect(a).toContain('defer-0068');
    expect(a).toContain('second_reviewer');
  });

  test('ADR-0039 D3 live anchor now reads the amended cap', () => {
    const a39 = read(ADR39);
    expect(a39).toContain('out.size < 380,000 bytes');
    expect(a39).not.toContain('out.size < 340,000 bytes');
    expect(a39).toContain('ADR-0082');
    expect(packCapBytes()).toBe(380000);
  });

  test('defer-0067 discharged-by-trigger via this amendment', () => {
    const d = readJson(REG).entries.find((e) => e.id === 'defer-0067');
    expect(d.status).toBe('closed');
    expect(d.closed_at).toBe('2026-09-22');
    expect(d.closed_via).toContain('discharged-by-trigger');
    expect(d.closed_via).toContain('ADR-0082');
  });

  test('defer-0068 registers the second_reviewer countersign slot (pending-evaluation, tide)', () => {
    const d = readJson(REG).entries.find((e) => e.id === 'defer-0068');
    expect(d).toBeDefined();
    expect(d.status).toBe('pending-evaluation');
    expect(d.source_adr).toContain('0082');
    expect(d.review_at).toBe('2026-12-15');
    expect(d.cadence_tier).toBe('quarterly');
    expect(d.registered_at).toBe('2026-09-22');
  });

  test('README index rebuilt: 84 records incl. ADR-0082', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('84 architecture decision records');
    expect(r).toContain('0082-tarball-cap-trend-anchor-amendment-defer-0067-armed-band.md');
  });

  test('ci.yml suite parity declares the live expected suite count', () => {
    const ci = read(path.join(ROOT, '.github', 'workflows', 'ci.yml'));
    expect(ci).toContain('--expected-suites 81');
  });
});
