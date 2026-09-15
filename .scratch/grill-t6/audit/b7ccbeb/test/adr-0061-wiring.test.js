'use strict';

// ADR-0061 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Covers D-A (pre-registered gate amendment closure: policy before value,
// trend anchor supersedes the one-shot M trigger, second_reviewer + review_at),
// D-B (judge identity stays content-hash; surface narrowed to judge-behavioral
// text; semantic digests rejected), D-C (declaration-scoped tagging, append-only
// disposition, look-back review), D-D (output-tethered convergence; tide is
// cadence, metric is criterion; exemption counting), D-E (mixed anchoring of
// governance artifacts; minimal external witness), D-F (measurement-unblock
// sequencing).
//
// CONTENT-ANCHOR SEED - asserts the doc-round facts (ADR file, glossary terms,
// registry entries). Implementation-round facts (gate amendment value,
// instrument re-pin, artifact re-hosting) are asserted by the implementation
// round when those edits land.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const adrPath = path.join(
  ROOT,
  'docs/adr/0061-pre-registered-gate-amendment-closure-surface-narrowed-judge-identity-and-output-tethered-convergence.md'
);
const glossaryPath = path.join(ROOT, 'CONTEXT.md');
const registryPath = path.join(ROOT, 'docs', 'deferred-registry.json');

describe('ADR-0061 gate amendment closure and output-tethered convergence', () => {
  const adr = () => fs.readFileSync(adrPath, 'utf8');

  test('the ADR exists and records all six decisions', () => {
    const text = adr();
    for (const id of ['D-A', 'D-B', 'D-C', 'D-D', 'D-E', 'D-F']) {
      expect(text).toContain('### ' + id);
    }
  });

  test('D-A anchors the amendment discipline', () => {
    const text = adr();
    expect(text).toContain('5567bd8');
    expect(text).toContain('second_reviewer');
    expect(text).toContain('review_at');
    expect(text).toContain('trend anchor');
  });

  test('D-B rejects the semantic digest and keeps content-hash identity', () => {
    const text = adr();
    expect(text).toContain('judge-behavioral text');
    expect(text).toContain('semantic');
  });

  test('the registry carries defer-0035 and defer-0036', () => {
    const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const ids = reg.entries.map(e => e.id);
    expect(ids).toContain('defer-0035');
    expect(ids).toContain('defer-0036');
  });

  test('CONTEXT.md carries the five new terms', () => {
    const g = fs.readFileSync(glossaryPath, 'utf8');
    for (const term of [
      'Pre-Registered Gate Amendment Closure',
      'Surface-Narrowed Identity Anchor',
      'Declaration-Scoped Out-of-Service Tag',
      'Output-Tethered Convergence',
      'Witnessed Digest Anchor',
    ]) {
      expect(g).toContain(term);
    }
  });
});
