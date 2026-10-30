'use strict';
// test/check-whitespace.test.js - #102: `git diff --check` never sees an
// untracked file, so the local check enumerates tracked + untracked paths and
// reads them. These tests use temp files, so they also show the scan is not
// limited to what a diff carries.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { scanText, auditFiles } = require('../scripts/check-whitespace');

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-ws-'));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text, 'utf8');
  }
  return dir;
}

describe('scanText', () => {
  test('clean text has no problems', () => {
    expect(scanText('a\nb\n')).toEqual([]);
  });

  test('trailing spaces and tabs are reported with their line', () => {
    expect(scanText('a \nb\t\nc\n')).toEqual([
      { line: 1, kind: 'trailing-whitespace' },
      { line: 2, kind: 'trailing-whitespace' },
    ]);
  });

  test('whitespace-only lines count as trailing whitespace', () => {
    expect(scanText('a\n   \nb\n')).toEqual([{ line: 2, kind: 'trailing-whitespace' }]);
  });

  // The gap the ticket names: a file that ends with an empty line. git diff
  // calls it "new blank line at EOF"; it is invisible to a reader and shows up
  // as an extra diff line on the next edit.
  test('blank lines at EOF are reported, and more than one line is reported once', () => {
    expect(scanText('a\n\n')).toEqual([{ line: 2, kind: 'blank-line-at-eof' }]);
    expect(scanText('a\n\n\n')).toEqual([{ line: 2, kind: 'blank-line-at-eof' }]);
  });

  test('a single trailing newline is not a blank line at EOF', () => {
    expect(scanText('a\n')).toEqual([]);
  });

  test('CRLF is normalized before the scan, so a CR is not trailing whitespace', () => {
    expect(scanText('a\r\nb\r\n')).toEqual([]);
    expect(scanText('a \r\n')).toEqual([{ line: 1, kind: 'trailing-whitespace' }]);
  });
});

describe('auditFiles', () => {
  test('a clean tree is clean', () => {
    const dir = fixture({ 'a.md': 'ok\n' });
    expect(auditFiles(['a.md'], { root: dir, allowlist: {} }).problems).toEqual([]);
  });

  test('an untracked-style file (no git index in the fixture at all) is still scanned', () => {
    const dir = fixture({ 'new-file.js': 'let x = 1; \n' });
    expect(auditFiles(['new-file.js'], { root: dir, allowlist: {} }).problems).toEqual([
      { file: 'new-file.js', line: 1, kind: 'trailing-whitespace' },
    ]);
  });

  test('binary files are skipped by suffix and by a NUL byte', () => {
    const dir = fixture({ 'logo.png': 'x \n', 'noext': 'a\u0000b \n' });
    const result = auditFiles(['logo.png', 'noext'], { root: dir, allowlist: {} });
    expect(result.problems).toEqual([]);
    expect(result.binaryFiles).toBe(2);
    expect(result.textFiles).toBe(0);
  });

  test('an allowlisted path with a violation is skipped and counted', () => {
    const dir = fixture({ 'frozen.md': 'captured  \n\n' });
    const result = auditFiles(['frozen.md'], { root: dir, allowlist: { 'frozen.md': 'frozen record' } });
    expect(result.problems).toEqual([]);
    expect(result.allowlisted).toEqual(['frozen.md']);
  });

  // An entry that no longer matches anything is permission nobody reviewed.
  test('a redundant allowlist entry is a problem, not a silent pass', () => {
    const dir = fixture({ 'frozen.md': 'clean\n' });
    const result = auditFiles(['frozen.md'], { root: dir, allowlist: { 'frozen.md': 'frozen record' } });
    expect(result.allowlistProblems).toEqual([{ file: 'frozen.md', kind: 'redundant-allowlist' }]);
  });

  test('a stale allowlist entry (file gone) is a problem', () => {
    const result = auditFiles([], { root: os.tmpdir(), allowlist: { 'gone.md': 'frozen record' } });
    expect(result.allowlistProblems).toEqual([{ file: 'gone.md', kind: 'stale-allowlist' }]);
  });

  test('an allowlist entry without a reason is a problem', () => {
    const dir = fixture({ 'frozen.md': 'captured  \n' });
    for (const reason of ['', '   ', null, undefined]) {
      const result = auditFiles(['frozen.md'], { root: dir, allowlist: { 'frozen.md': reason } });
      expect(result.allowlistProblems).toEqual([{ file: 'frozen.md', kind: 'allowlist-reason' }]);
    }
  });
});
