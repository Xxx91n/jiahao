// test/test-manifest.test.js - ADR-0091 (grill-t34 D-002) wiring: the derived
// count manifest + README sentinel declaration region contract. Fixture-driven
// (injected seams, no ambient fs writes); the repo-level sync assertions live
// in scripts/check-test-manifest.js (the registered leg), this suite pins the
// generator's own semantics.
'use strict';

const {
  buildManifest,
  parseJunit,
  renderLines,
  spliceRegion,
  stableCopy,
  firstDiffPath,
  structuralErrors,
  MARKERS,
} = require('../scripts/build-test-manifest');

const JUNIT_XML = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<testsuites tests="1580" failures="0" skipped="7">\n'
  + '<testsuite name="a.test.js" tests="2" failures="0" skipped="1"><testcase classname="a.test.js" name="x" time="0"/><testcase classname="a.test.js" name="y" time="0"><skipped/></testcase></testsuite>'
  + '\n</testsuites>\n';

function fixtureManifest(overrides) {
  const base = {
    schema_version: 1,
    _doc: 'x',
    generated_by: 'scripts/build-test-manifest.js',
    generated_at: '2026-09-30T00:00:00.000Z',
    enumeration: { channel: 'jest --listTests', suites: 2, suite_files: ['test/a.test.js', 'test/b.test.js'] },
    junit: { tier: 'full', tests: 1580, skipped: 0, artifact: 'test-artifacts/junit.xml' },
    published_tip: '89b9248722f322593a5b053c611052092341905e',
  };
  return Object.assign(base, overrides || {});
}

describe('test-manifest generator (ADR-0091, grill-t34 D-002)', () => {
  test('parseJunit reads tests/skipped from the testsuites header and nothing else', () => {
    expect(parseJunit(JUNIT_XML)).toEqual({ tests: 1580, skipped: 7 });
    expect(() => parseJunit('<testsuites><other/></testsuites>')).toThrow(/testsuites header/);
  });

  test('buildManifest derives suites from the enumeration channel and junit.tests/skipped from the artifact', () => {
    const m = buildManifest({
      listTestsOutput: 'test/b.test.js\ntest/a.test.js\n',
      junitXml: JUNIT_XML,
      gitOutput: 'a'.repeat(40),
      now: new Date('2026-09-30T00:00:00Z'),
    });
    expect(m.enumeration.suites).toBe(2);
    expect(m.enumeration.suite_files).toEqual(['test/a.test.js', 'test/b.test.js']);
    expect(m.junit.tests).toBe(1580);
    expect(m.junit.skipped).toBe(7);
    expect(m.published_tip).toBe('a'.repeat(40));
    expect(m.generated_at).toBe('2026-09-30T00:00:00.000Z');
  });

  test('FORBIDDEN circular shape: a JUnit-derived suites field fails structural validation', () => {
    const m = fixtureManifest({ junit: { tier: 'full', tests: 1580, skipped: 0, suites: 90, artifact: 'x' } });
    expect(structuralErrors(m).some((e) => /FORBIDDEN FIELD junit\.suites/.test(e))).toBe(true);
    expect(structuralErrors(fixtureManifest())).toEqual([]);
  });

  test('structuralErrors is fail-closed on bad pointers and missing fields', () => {
    expect(structuralErrors(fixtureManifest({ published_tip: 'deadbeef' })).length).toBeGreaterThan(0);
    expect(structuralErrors(fixtureManifest({ enumeration: { channel: 'x', suites: 0, suite_files: [] } })).length).toBeGreaterThan(0);
    expect(structuralErrors(fixtureManifest({ junit: { tier: 'full', skipped: 0, artifact: 'x' } })).length).toBeGreaterThan(0);
  });

  test('renderLines emits the byte-exact declaration sentences (en single em-dash, zh double)', () => {
    const lines = renderLines(fixtureManifest());
    expect(lines.develop).toBe('npm test                              # 1580 tests across 2 suites (full corpus tier; the public tier skips 7 corpus-bound tests with reasons, ADR-0056)');
    expect(lines.architecture_en).toBe('- \u0060test/\u0060 \u2014 2 test suites, 1580 tests');
    expect(lines.architecture_zh).toBe('- \u0060test/\u0060 \u2014\u2014 2 test suites, 1580 tests');
  });

  test('spliceRegion splices begin + content and keeps the end sentinel', () => {
    const text = ['before', MARKERS.develop.begin, 'STALE LINE', MARKERS.develop.end, 'after'].join('\n');
    const out = spliceRegion(text, MARKERS.develop, 'NEW LINE', 'test region');
    expect(out.split('\n')).toEqual(['before', MARKERS.develop.begin, 'NEW LINE', MARKERS.develop.end, 'after']);
  });

  test('spliceRegion is fail-closed: missing / inverted / duplicate sentinels all throw', () => {
    const good = [MARKERS.develop.begin, 'x', MARKERS.develop.end].join('\n');
    expect(() => spliceRegion('no markers here', MARKERS.develop, 'x', 'r')).toThrow(/missing or inverted/);
    expect(() => spliceRegion([MARKERS.develop.end, MARKERS.develop.begin].join('\n'), MARKERS.develop, 'x', 'r')).toThrow(/missing or inverted/);
    expect(() => spliceRegion(good + '\n' + MARKERS.develop.begin, MARKERS.develop, 'x', 'r')).toThrow(/duplicate/);
    expect(() => spliceRegion(good + '\n' + MARKERS.develop.end, MARKERS.develop, 'x', 'r')).toThrow(/duplicate/);
  });

  test('equality domain (D-008): generated_at is excluded; real drift is detected with its path', () => {
    const a = fixtureManifest();
    const b = fixtureManifest({ generated_at: '2027-01-01T00:00:00.000Z' });
    expect(firstDiffPath(stableCopy(a), stableCopy(b))).toBeNull();
    const c = fixtureManifest({ junit: { tier: 'full', tests: 1599, skipped: 0, artifact: 'test-artifacts/junit.xml' } });
    expect(firstDiffPath(stableCopy(a), stableCopy(c))).toBe('junit.tests');
  });
});
