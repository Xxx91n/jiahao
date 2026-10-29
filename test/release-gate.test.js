'use strict';
// test/release-gate.test.js - #63: the tag gate has to fail closed.
//
// Only the pieces that can be asserted without a tag are tested here: tag
// parsing, the pack contract as a pure function, the tree hash, and the CLI's
// exit codes for "no tag", "tag that disagrees with the version", and "unknown
// step". The full green path needs a real tag and a clean tree, so it runs on
// the tag build itself (.github/workflows/ci.yml), not in this suite.

const path = require('path');
const { spawnSync } = require('child_process');

const { parseTag, auditPackFiles, treeHash, REQUIRED_PACK_FILES } = require('../scripts/release-gate');

const ROOT = path.join(__dirname, '..');
const GATE = path.join(ROOT, 'scripts', 'release-gate.js');
const pkg = require('../package.json');

function gate(args) {
  return spawnSync(process.execPath, [GATE].concat(args), {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

describe('tag parsing', () => {
  test('a version tag yields its version; anything else is refused', () => {
    expect(parseTag('v0.2.0')).toBe('0.2.0');
    expect(parseTag('0.2.0')).toBeNull();       // release tags are prefixed
    expect(parseTag('v0.2')).toBeNull();
    expect(parseTag('v0.2.0-rc.1')).toBeNull(); // pre-releases are not a release gate subject
    expect(parseTag('')).toBeNull();
    expect(parseTag(undefined)).toBeNull();
  });
});

describe('pack contract', () => {
  const complete = REQUIRED_PACK_FILES.concat(['README.md']);

  test('a complete, clean file list has no problems', () => {
    expect(auditPackFiles(complete)).toEqual([]);
  });

  test('a missing exit is named, not silently ignored', () => {
    const problems = auditPackFiles(complete.filter((p) => p !== 'adapters/claude-code/hooks/hooks.json'));
    expect(problems).toEqual([{ kind: 'missing', rel: 'adapters/claude-code/hooks/hooks.json' }]);
  });

  test('private corpus and research records are refused wherever they appear', () => {
    const problems = auditPackFiles(complete.concat([
      'private/phrases.json',
      'bench/research/out/run.json',
      'docs/research/skill-distribution.md',
    ]));
    expect(problems.map((p) => p.rel)).toEqual([
      'private/phrases.json',
      'bench/research/out/run.json',
      'docs/research/skill-distribution.md',
    ]);
    expect(problems.every((p) => p.kind === 'forbidden')).toBe(true);
  });
});

describe('tree hash', () => {
  // Sorted path + content hash: the same tree must hash the same twice, and
  // two different exits must not collide into "unchanged".
  test('is stable across calls and separates the two bundles', () => {
    expect(treeHash('skills/jiahao')).toBe(treeHash('skills/jiahao'));
    expect(treeHash('adapters/codebuddy')).not.toBe(treeHash('adapters/claude-code'));
  });
});

describe('CLI', () => {
  test('no tag is a usage error, not a silent skip', () => {
    const r = gate(['--only', 'metadata']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('no tag given');
  });

  test('a tag that disagrees with package.json fails the first step', () => {
    const r = gate(['--tag', 'v9.9.9', '--only', 'metadata']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('FAIL metadata');
    expect(r.stderr).toContain('package.json version is ' + pkg.version);
  });

  test('a tag that is not vX.Y.Z fails instead of guessing', () => {
    const r = gate(['--tag', pkg.version, '--only', 'metadata']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('is not vMAJOR.MINOR.PATCH');
  });

  test('an unknown step is refused', () => {
    const r = gate(['--tag', 'v0.0.0', '--only', 'metadata,bogus']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('unknown step(s)');
  });
});
