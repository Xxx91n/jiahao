'use strict';
// test/skill-external.test.js - #67: the two external assertions must fail
// closed, and their reading of tool output is testable without the network.
//
// Only the pure halves live here: the version pins, the `skills --list`
// parser, and the installed-file audit. The halves that fetch skills-ref
// from PyPI and skills from npm run in CI (branch job: npm run check:skill;
// tag job: the gate's skill-spec / skill-install steps), not in this suite -
// a unit suite that needs the network would go red for the wrong reasons and
// teach everyone to ignore it.

const {
  SKILLS_REF_VERSION,
  SKILLS_CLI_VERSION,
  SKILLS_CLI_PACKAGE,
  EXPECTED_INSTALL_FILES,
  stripAnsi,
  parseSkillsList,
  auditInstalledFiles,
} = require('../scripts/check-skill-external');

describe('external tool pins', () => {
  test('both tools are pinned to one exact x.y.z, never a range or a tag', () => {
    expect(SKILLS_REF_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(SKILLS_CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    // The package spec the gate hands to npm exec must be the same pin, or
    // "pinned" is a comment rather than a fact.
    expect(SKILLS_CLI_PACKAGE).toBe('skills@' + SKILLS_CLI_VERSION);
  });
});

describe('skills --list parsing', () => {
  test('the #67 evidence shape reads as exactly one skill, jiahao', () => {
    const parsed = parseSkillsList('◇  Found 1 skill  │    jiahao\n');
    expect(parsed.count).toBe(1);
    expect(parsed.hasJiahao).toBe(true);
  });

  test('colour codes and carriage returns do not hide the discovery line', () => {
    const raw = '\x1b[36m◇\x1b[39m  Found 1 skill\r\n  jiahao - Anti-false-completion discipline\n';
    const parsed = parseSkillsList(raw);
    expect(parsed.count).toBe(1);
    expect(parsed.hasJiahao).toBe(true);
    expect(stripAnsi(raw)).not.toContain('\x1b');
  });

  test('a second discoverable skill changes the count the gate asserts on', () => {
    const parsed = parseSkillsList('Found 2 skills\n  jiahao\n  other-skill\n');
    expect(parsed.count).toBe(2);
    expect(parsed.hasJiahao).toBe(true);
  });

  test('output with no discovery line parses to count null (caller fails closed)', () => {
    const parsed = parseSkillsList('skills: something unexpected happened\n');
    expect(parsed.count).toBeNull();
    expect(parsed.hasJiahao).toBe(false);
  });
});

describe('installed file audit', () => {
  test('the evidenced landing set passes', () => {
    expect(auditInstalledFiles(EXPECTED_INSTALL_FILES.slice())).toEqual([]);
    expect(auditInstalledFiles(['skills-lock.json', '.claude/skills/jiahao/SKILL.md'])).toEqual([]);
  });

  test('a runtime file riding along is named as unexpected', () => {
    const landed = EXPECTED_INSTALL_FILES.concat(['.claude/skills/jiahao/calibration.js']);
    expect(auditInstalledFiles(landed)).toEqual(['unexpected .claude/skills/jiahao/calibration.js']);
  });

  test('a missing SKILL.md is named as missing', () => {
    expect(auditInstalledFiles(['skills-lock.json'])).toEqual(['missing .claude/skills/jiahao/SKILL.md']);
  });
});
