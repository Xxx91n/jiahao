'use strict';
// test/adr-0097-wiring.test.js - grill-t39 T-6 follow-up (ledger D-003.6, D-003.7).
//
// Both clauses were legislated into AGENTS.md and ADR-0097 while the product
// artifact (src/SKILL.md and its 54 generated adapters) still carried the old
// shape: the intensity tier table sat inside the VERIFIER region, where
// hooks/jiahao-profile.js splitByProfile() serves it to the audit face, and the
// negative domain existed only as prose in the rule files. A clause that lives
// only in the charter is a claim about the product, not evidence in it - these
// pins read the artifact itself and the split faces a host actually installs.
const fs = require('fs');
const path = require('path');
const { splitByProfile, validateGsrHeaders } = require('../hooks/jiahao-profile');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p.split('/').join(path.sep)), 'utf8');
const skill = () => splitByProfile(read('src/SKILL.md'));

describe('D-003.6: intensity is a generator axis - the verifier face carries no tier', () => {
  test('the product source names the tier as generator-only', () => {
    expect(read('src/SKILL.md')).toMatch(/### Intensity \(generator profile only\)/);
  });

  test('the verifier face names no tier selector', () => {
    // lite/ultra are unambiguous tier names; `full` is ordinary English in this
    // profile ("full verification discipline"), so the pin is on the selector
    // shapes, not on one word.
    const v = skill().verifier;
    expect(v).not.toMatch(/\blite\b/);
    expect(v).not.toMatch(/\bultra\b/);
    expect(v).not.toMatch(/\[lite\|full\|ultra\]/);
    expect(v).not.toMatch(/^\| Level \|/m);
    expect(v).not.toMatch(/argument-hint/);
    expect(v).toMatch(/Depth here is not a setting/);
  });

  test('the generator face still carries the tier table', () => {
    const g = skill().generator;
    expect(g).toMatch(/lite/);
    expect(g).toMatch(/ultra/);
    expect(g).toMatch(/^\| Level \|/m);
    expect(read('src/SKILL.md')).toMatch(/argument-hint: "\[lite\|full\|ultra\]"/);
  });

  test('the installed verifier adapters a host reads carry no tier selector', () => {
    const files = [
      'adapters/cline/jiahao.md',
      'adapters/codebuddy/rules/jiahao-verifier.md',
      'adapters/opencode/jiahao-verifier.md',
      'adapters/windsurf/jiahao.md',
    ];
    for (const f of files) {
      const t = read(f);
      expect(t).toMatch(/verifier/i);
      expect(t).not.toMatch(/\bultra\b/);
      expect(t).not.toMatch(/^\| Level \|/m);
      expect(t).not.toMatch(/argument-hint/);
    }
  });

  test('the generator adapter does carry it - the axis is real, not deleted', () => {
    expect(read('adapters/cline/jiahao-generator.md')).toMatch(/lite/);
    expect(read('adapters/cline/jiahao-generator.md')).toMatch(/^\| Level \|/m);
  });
});

describe('D-003.7: the explicit exclusion domain is on the artifact, not just the charter', () => {
  test('the skill description names the negative domain in the Do NOT use for form', () => {
    expect(read('src/SKILL.md')).toMatch(/Do NOT use for generating coaching content, for resident injection on hosts[\s\S]*non-audit tasks/);
  });

  test('the Boundaries section names all three exclusions and the no-tier clause', () => {
    const boundaries = read('src/SKILL.md').split('## Boundaries')[1];
    expect(boundaries).toMatch(/### Verifier exclusions/);
    expect(boundaries).toMatch(/Not for generating coaching content/);
    expect(boundaries).toMatch(/Not for resident injection on hosts without hook capability/);
    expect(boundaries).toMatch(/Not for non-audit tasks/);
    expect(boundaries).toMatch(/No runtime intensity tier on this profile/);
  });

  test('both faces inherit the Boundaries domain, so neither reads as unbounded', () => {
    const p = skill();
    for (const face of [p.generator, p.verifier]) {
      expect(face).toMatch(/Not for non-audit tasks/);
      expect(face).toMatch(/Not for generating coaching content/);
    }
  });

  test('the exclusion bullets do not masquerade as gsr rules', () => {
    // The gsr latch treats any `- **` line after ### Surface Signal Rules as a
    // rule bullet, so the exclusion domain must stay plain bullets: as bold-led
    // rules they would fail the adapter build and the three-rule cap would stop
    // being three rules.
    const errs = validateGsrHeaders(skill().generator);
    expect(errs).toEqual([]);
  });
});
