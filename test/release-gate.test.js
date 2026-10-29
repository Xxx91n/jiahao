'use strict';
// test/release-gate.test.js - #63: the tag gate has to fail closed.
//
// Only the pieces that can be asserted without a tag are tested here: tag
// parsing, the pack contract as a pure function, the tree hash, and the CLI's
// exit codes for "no tag", "tag that disagrees with the version", and "unknown
// step". The full green path needs a real tag and a clean tree, so it runs on
// the tag build itself (.github/workflows/ci.yml), not in this suite.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { parseTag, auditPackFiles, treeHashAt, writeScopeRows, REQUIRED_PACK_FILES } = require('../scripts/release-gate');

const ROOT = path.join(__dirname, '..');
const GATE = path.join(ROOT, 'scripts', 'release-gate.js');
const pkg = require('../package.json');

function gate(args, extraEnv) {
  // The gate reads GITHUB_REF_NAME outside of --tag, and this suite runs inside
  // the tag build (npm test is the gate's own `tests` step). Inherit the rest of
  // the environment, but never the tag: otherwise "no tag" would silently become
  // "this tag" and the assertion below would test the opposite of its name.
  const env = Object.assign({}, process.env, extraEnv || {});
  delete env.GITHUB_REF_NAME;
  delete env.GITHUB_REF;
  return spawnSync(process.execPath, [GATE].concat(args), {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: env,
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
  // Sorted path + content hash, exercised on temp directories: reading a repo
  // tree from disk while another jest suite reruns the generator is the
  // truncated-read hazard test/skill-dir.test.js documents (38 partial reads in
  // 51 rebuilds), and the hash itself does not care which directory it reads.
  const roots = [];
  const makeTree = (files) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-tree-'));
    roots.push(dir);
    for (const [rel, text] of Object.entries(files)) {
      const abs = path.join(dir, rel.split('/').join(path.sep));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text, 'utf8');
    }
    return dir;
  };

  afterAll(() => {
    for (const dir of roots) fs.rmSync(dir, { recursive: true, force: true });
  });

  test('is stable across calls and separates different contents', () => {
    const a = makeTree({ 'SKILL.md': 'body', 'nested/part.json': '{"a":1}' });
    const b = makeTree({ 'SKILL.md': 'body', 'nested/part.json': '{"a":2}' });
    expect(treeHashAt(a)).toBe(treeHashAt(a));
    expect(treeHashAt(a)).not.toBe(treeHashAt(b));
  });

  test('a renamed path is a different tree, even with identical bytes', () => {
    const one = makeTree({ 'x/one.txt': 'same' });
    const two = makeTree({ 'y/one.txt': 'same' });
    expect(treeHashAt(one)).not.toBe(treeHashAt(two));
  });
});

describe('write-scope table reading', () => {
  // The declaration is the table, not the prose: a path named in a sentence
  // elsewhere in the document says nothing about where it gets written.
  test('only rows under ## 写入范围 count', () => {
    const doc = [
      '## 写入范围',
      '',
      '这一节前面的说明提到 .jiahao-profile，但那不是声明。',
      '',
      '| 谁写 | 写什么 |',
      '| --- | --- |',
      '| install | `<config>/.jiahao-profile` |',
      '',
      '## 无网络外呼',
      '',
      '正文也可以提到 .jiahao-sentinel.，同样不算。',
      '',
    ].join('\n');
    const rows = writeScopeRows(doc);
    expect(rows.length).toBe(3); // header + separator + one data row
    expect(rows.some((r) => r.includes('.jiahao-profile'))).toBe(true);
    expect(rows.some((r) => r.includes('.jiahao-sentinel.'))).toBe(false);
  });

  test('a document without the section has no rows', () => {
    expect(writeScopeRows('# 别的文档\n\n| a | b |\n')).toEqual([]);
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

  test('a value flag without a value is a usage error, not a crash', () => {
    const r = gate(['--only']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('needs a value');
  });

  // A subset run is an iteration aid. Both the exit status and the evidence
  // file have to say that, because a Release quote reads the file, not the log.
  test('a passing subset exits 3 and records itself as not ok', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-partial-'));
    try {
      const evidenceFile = path.join(dir, 'evidence.json');
      const r = gate(['--tag', 'v0.0.0', '--only', 'declarations', '--evidence', evidenceFile]);
      expect(r.status).toBe(3);
      expect(r.stdout).toContain('PARTIAL GREEN');
      expect(r.stdout).toContain('not a release verdict');
      const ev = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
      expect(ev.status).toBe('partial');
      expect(ev.ok).toBe(false);
      expect(ev.partial).toEqual(['declarations']);
      expect(ev.declarations.writeScope).toBe('docs/release.md#写入范围');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
