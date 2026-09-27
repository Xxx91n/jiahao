'use strict';

// test/adr-0063-wiring.test.js -- ADR-0063 wiring lock for the surface-narrowed
// judge identity anchor (ADR-0061 D-B).
//
// The narrowing is only real if it is POLAR:
//   (a) product-surface edits (frontmatter / H1 / Generator Profile) do NOT
//       change the resolved judge identity digest;
//   (b) ANY judge-surface edit (inside the Verifier Profile region, down to
//       EOF) DOES change it;
//   (c) a missing boundary heading fails closed - never a whole-file fallback
//       (that would silently restore the dual-purpose hash).
//
// Fixture shape follows test/adr-0046-wiring.test.js: a tmp tree carrying the
// pin plus an edited rules file, resolved through the real code path.

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const instrument = require('../src/instrument-identity');

const SKILL_REL = path.join('src', 'SKILL.md');
const PIN_REL = path.join('src', 'instrument-identity.json');
const ADR_REL = 'docs/adr/0063-surface-narrowed-judge-identity-anchor-semantic-digest-rejected.md';
const realSkill = fs.readFileSync(path.join(ROOT, SKILL_REL), 'utf8');

// Resolve the identity of an edited rules text through the real resolver
// (pin rules_alias = src/SKILL.md, so the tmp tree mirrors the repo layout).
function resolveDigest(skillText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0063-'));
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, PIN_REL), path.join(tmp, PIN_REL));
  fs.writeFileSync(path.join(tmp, SKILL_REL), skillText, 'utf8');
  return instrument.resolveInstrumentIdentity(tmp).rules_digest;
}

function edit(text, from, to) {
  expect(text.split(from).length - 1).toBe(1); // anchor must be unique
  return text.split(from).join(to);
}

const baseline = resolveDigest(realSkill);
const heading = instrument.JUDGE_SURFACE_HEADING;

describe('ADR-0063 surface-narrowed judge identity anchor', () => {
  test('the boundary is the Verifier Profile heading and the surface runs to EOF', () => {
    expect(heading).toBe('## Verifier Profile');
    const surface = instrument.judgeSurfaceText(realSkill);
    expect(surface.startsWith(heading + '\n')).toBe(true);
    expect(surface).toContain('You are the external verifier');
    expect(surface).not.toContain('## Generator Profile');
    expect(surface).not.toContain('name: jiahao');
  });

  test('the narrowed anchor still resolves to a 64-hex digest on the real tree', () => {
    expect(baseline).toMatch(/^[0-9a-f]{64}$/);
    expect(resolveDigest(realSkill)).toBe(baseline);
  });
});

describe('ADR-0063 polarity (a): product-surface edits do not re-pin', () => {
  test('frontmatter edit leaves the digest unchanged', () => {
    const edited = edit(realSkill, 'license: MIT', 'license: MIT\nx-product-edit: true');
    expect(resolveDigest(edited)).toBe(baseline);
  });

  test('H1 edit leaves the digest unchanged', () => {
    const edited = edit(realSkill, '# Jiahao (嘉豪)', '# Jiahao (嘉豪) - product edit');
    expect(resolveDigest(edited)).toBe(baseline);
  });

  test('Generator Profile edit leaves the digest unchanged', () => {
    const edited = edit(
      realSkill,
      '  confident prose, that is False Completion Syndrome.',
      '  confident prose, that is False Completion Syndrome. (product edit)');
    expect(resolveDigest(edited)).toBe(baseline);
  });
});

describe('ADR-0063 polarity (b): judge-surface edits still re-pin', () => {
  test('a one-word edit inside the Verifier Profile region changes the digest', () => {
    const edited = edit(realSkill, 'Stop at the first rung that holds:', 'Stop at the earliest rung that holds:');
    expect(resolveDigest(edited)).not.toBe(baseline);
  });

  test('a whitespace-only edit at EOF changes the digest', () => {
    expect(resolveDigest(realSkill + '\n')).not.toBe(baseline);
  });

  test('an edit to the verifier iron laws changes the digest', () => {
    const edited = edit(realSkill, '- **The judge cannot be the author.**', '- **The judge must never be the author.**');
    expect(resolveDigest(edited)).not.toBe(baseline);
  });
});

describe('ADR-0063 polarity (c): the boundary is fail-closed', () => {
  test('a missing heading throws instead of hashing the whole file', () => {
    expect(() => instrument.judgeSurfaceText('# Jiahao\n\n## Generator Profile\n- rule\n'))
      .toThrow(/judge surface heading/);
    expect(() => resolveDigest('# Jiahao\n\n## Generator Profile\n- rule\n'))
      .toThrow(/judge surface heading/);
  });

  test('renaming the heading away is unresolvable, never a whole-file fallback', () => {
    expect(() => instrument.judgeSurfaceText(realSkill.split(heading).join('## Renamed Profile')))
      .toThrow(/fail-closed/);
  });
});

describe('ADR-0063 content anchors', () => {
  test('the ADR declares the narrowing and bans the semantic digest', () => {
    const text = fs.readFileSync(path.join(ROOT, ADR_REL), 'utf8');
    expect(text).toContain('## Verifier Profile');
    expect(text).toContain('semantic digest');
    expect(text).toContain('JudgeSense');
    expect(text).toContain('review_at');
    expect(text).toContain('second_reviewer');
    expect(text).toContain('defer-0038');
  });

  test('the deferred registry carries defer-0038', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
    expect(reg.entries.map(e => e.id)).toContain('defer-0038');
  });
});
