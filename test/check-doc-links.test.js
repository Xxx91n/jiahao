'use strict';
// test/check-doc-links.test.js - #102: a link that is correct in the repository
// and dead in the tarball. `files` in package.json decides what ships, so the
// check has to answer against the pack listing, not the working tree.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { auditDocLinks, linksIn, maskCode, resolveTarget } = require('../scripts/check-doc-links');

const TEMP_DIRS = [];

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-links-'));
  TEMP_DIRS.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text, 'utf8');
  }
  return dir;
}

afterAll(() => {
  for (const dir of TEMP_DIRS) fs.rmSync(dir, { recursive: true, force: true });
});

function audit(dir, packFiles) {
  return auditDocLinks(packFiles, { root: dir });
}

describe('link extraction', () => {
  test('inline links and images are both read, with their 1-based line', () => {
    const found = linksIn('a\n[x](one.md) ![y](two.png)\n');
    expect(found).toEqual([
      { target: 'one.md', line: 2 },
      { target: 'two.png', line: 2 },
    ]);
  });

  test('a title after the target does not become part of it', () => {
    expect(linksIn('[x](docs/a.md "the doc")')).toEqual([{ target: 'docs/a.md', line: 1 }]);
  });

  // A fenced example is documentation of a link, not a link; treating it as one
  // would make the check red on files that teach the syntax.
  test('links inside fenced code and inline spans are not collected', () => {
    const text = [
      '```md',
      '[dead](not-packed.md)',
      '```',
      '`[dead](not-packed.md)`',
      '[live](packed.md)',
    ].join('\n');
    expect(linksIn(text)).toEqual([{ target: 'packed.md', line: 5 }]);
  });

  // Both READMEs switch languages with raw HTML, which is the first relative
  // link a reader hits on npmjs; missing it would leave that one unchecked.
  test('raw HTML href and src are read as links', () => {
    const found = linksIn('<a href="README-zh-CN.md">中文</a>\n<img src="docs/x.png">\n');
    expect(found).toEqual([
      { target: 'README-zh-CN.md', line: 1 },
      { target: 'docs/x.png', line: 2 },
    ]);
  });

  test('an HTML link inside a code fence is not collected', () => {
    expect(linksIn('```html\n<a href="gone.md">x</a>\n```\n')).toEqual([]);
  });

  test('masking preserves length so offsets still map to the same line', () => {
    const text = '```\nabc\n```\nreal\n';
    expect(maskCode(text).length).toBe(text.length);
  });
});

describe('path resolution', () => {
  test('a link resolves against the directory of the file that carries it', () => {
    expect(resolveTarget('adapters/codex/README.md', 'rules/jiahao-verifier.md')).toBe('adapters/codex/rules/jiahao-verifier.md');
    expect(resolveTarget('README.md', 'adapters/codex/')).toBe('adapters/codex');
  });

  test('a link that climbs out of the package is null, not a path with .. left in it', () => {
    expect(resolveTarget('README.md', '../outside.md')).toBeNull();
  });
});

describe('audit', () => {
  test('a link to a packed file passes', () => {
    const dir = fixture({ 'README.md': '[a](docs/a.md)\n', 'docs/a.md': '# a\n' });
    expect(audit(dir, ['README.md', 'docs/a.md'])).toEqual([]);
  });

  test('a link to a packed directory passes even when only some of it ships', () => {
    const dir = fixture({ 'README.md': '[a](docs/)\n', 'docs/a.md': '# a\n' });
    expect(audit(dir, ['README.md', 'docs/a.md'])).toEqual([]);
  });

  // The whole point: the file exists on disk, so a working-tree check is green,
  // but `files` leaves it (and its directory) out of the tarball.
  test('a link the working tree can satisfy but the pack cannot is red', () => {
    const dir = fixture({ 'README.md': 'see [the server](jiahao-mcp/)\n', 'jiahao-mcp/index.js': '' });
    expect(audit(dir, ['README.md'])).toEqual([
      { file: 'README.md', line: 1, target: 'jiahao-mcp/', reason: 'not in the package' },
    ]);
  });

  test('a dead HTML href lands in the same report as a dead inline link', () => {
    const dir = fixture({ 'README.md': '<a href="gone.md">中文</a>\n[ok](a.md)\n', 'a.md': '# a\n' });
    expect(audit(dir, ['README.md', 'a.md'])).toEqual([
      { file: 'README.md', line: 1, target: 'gone.md', reason: 'not in the package' },
    ]);
  });

  test('external URLs, anchors, and mailto are out of scope', () => {
    const dir = fixture({
      'README.md': [
        '[a](https://example.com/x.md)',
        '[b](#section)',
        '[c](mailto:x@example.com)',
        '[d](https://example.com/x.md#frag)',
        '[packed](a.md)',
      ].join('\n'),
      'a.md': '# a\n',
    });
    expect(audit(dir, ['README.md', 'a.md'])).toEqual([]);
  });

  test('a fragment or query is stripped before the target is looked up', () => {
    const dir = fixture({ 'README.md': '[a](docs/a.md#heading)\n', 'docs/a.md': '# a\n' });
    expect(audit(dir, ['README.md', 'docs/a.md'])).toEqual([]);
  });

  test('a link climbing above the package root is red with that reason', () => {
    const dir = fixture({ 'docs/README.md': '[a](../../outside.md)\n' });
    expect(audit(dir, ['docs/README.md'])).toEqual([
      { file: 'docs/README.md', line: 1, target: '../../outside.md', reason: 'escapes the package root' },
    ]);
  });

  test('a parent step that stays inside the package resolves normally', () => {
    expect(resolveTarget('docs/README.md', '../outside.md')).toBe('outside.md');
  });

  test('only Markdown in the pack is scanned', () => {
    const dir = fixture({ 'README.md': '[a](a.md)\n', 'a.md': '# a\n', 'notes.txt': '[dead](nope.md)\n' });
    expect(audit(dir, ['README.md', 'a.md', 'notes.txt'])).toEqual([]);
  });

  // A scan over an empty set asserts nothing; that has to be a failure, not a
  // green run.
  test('a pack with no Markdown is red', () => {
    const dir = fixture({ 'package.json': '{}' });
    expect(audit(dir, ['package.json'])).toEqual([
      { file: 'package.json', line: 0, target: '', reason: 'the pack carries no Markdown, so this scan proves nothing' },
    ]);
  });

  // The subtler empty case: Markdown exists but carries no relative link, so
  // every link checked was absolute and the loop asserted nothing.
  test('Markdown with no relative link at all is red, not a vacuous pass', () => {
    const dir = fixture({ 'README.md': '[a](https://example.com/x.md)\n# heading\n' });
    expect(audit(dir, ['README.md'])).toEqual([
      { file: 'package.json', line: 0, target: '', reason: 'no relative link found in any packed Markdown, so this scan proves nothing' },
    ]);
  });
});
