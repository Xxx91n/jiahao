'use strict';
// test/skill-external.test.js - #67: the two external assertions must fail
// closed, and their reading of tool output is testable without the network.
//
// Only the pure halves live here: the version pins, the `skills --list`
// parser, and the installed-file audit. The halves that fetch skills-ref
// from its pinned upstream commit and skills from npm run in CI (branch job: npm run check:skill;
// tag job: the gate's skill-spec / skill-install steps), not in this suite -
// a unit suite that needs the network would go red for the wrong reasons and
// teach everyone to ignore it.

const path = require('path');
const { spawnSync } = require('child_process');

const {
  SKILLS_REF_VERSION,
  SKILLS_REF_COMMIT,
  SKILLS_REF_REQUIREMENT,
  SKILLS_CLI_VERSION,
  SKILLS_CLI_PACKAGE,
  EXPECTED_INSTALL_FILES,
  SKILLS_CLI_MIN_NODE,
  versionGte,
  stripAnsi,
  parseSkillsList,
  auditInstalledFiles,
} = require('../scripts/check-skill-external');

describe('subcommand dispatch', () => {
  test('an unknown subcommand is a usage error (exit 2), never a silent pass', () => {
    // The release gate invokes this script as `spec` / `install`; the dispatch
    // itself gets one offline assertion so a typo'd step cannot exit 0.
    const res = spawnSync(process.execPath,
      [path.join(__dirname, '..', 'scripts', 'check-skill-external.js'), 'bogus'],
      { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('usage:');
  });
});

describe('external tool pins', () => {
  test('both tools are pinned to one exact x.y.z, never a range or a tag', () => {
    expect(SKILLS_REF_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(SKILLS_CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    // The package spec the gate hands to npm exec must be the same pin, or
    // "pinned" is a comment rather than a fact.
    expect(SKILLS_CLI_PACKAGE).toBe('skills@' + SKILLS_CLI_VERSION);
  });

  test('skills-ref comes from one pinned upstream commit, never a floating ref or PyPI', () => {
    // agentskills/agentskills#355: the PyPI package of this name is not the
    // maintainers' ("published by someone else and we have no control over
    // it"), so source is part of the pin, and a branch name would float.
    expect(SKILLS_REF_COMMIT).toMatch(/^[0-9a-f]{40}$/);
    expect(SKILLS_REF_REQUIREMENT).toContain('git+https://github.com/agentskills/agentskills.git@' + SKILLS_REF_COMMIT);
    expect(SKILLS_REF_REQUIREMENT).toContain('#subdirectory=skills-ref');
  });
});

describe('node floor for the pinned CLI', () => {
  test('skills@1.7.4 engines floor is a numeric comparison, not string order', () => {
    expect(SKILLS_CLI_MIN_NODE).toMatch(/^\d+\.\d+\.\d+$/);
    expect(versionGte('22.20.0', SKILLS_CLI_MIN_NODE)).toBe(true);
    expect(versionGte('v22.20.1', SKILLS_CLI_MIN_NODE)).toBe(true);
    expect(versionGte('24.0.0', SKILLS_CLI_MIN_NODE)).toBe(true);
    // String order would call 22.9 above 22.20; the whole point of the
    // helper is that it must not.
    expect(versionGte('22.9.0', SKILLS_CLI_MIN_NODE)).toBe(false);
    expect(versionGte('20.20.2', SKILLS_CLI_MIN_NODE)).toBe(false);
    expect(versionGte('not-a-version', SKILLS_CLI_MIN_NODE)).toBe(false);
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
