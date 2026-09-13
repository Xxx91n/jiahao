// test/adr-0061-governance-anchors.test.js -- ADR-0061 D-E (Witnessed Digest Anchor)
// wiring assertions: authoritative governance copies live in git-tracked storage
// OUTSIDE the npm tarball whitelist, with machine-generated digests and a
// regen-and-diff check.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'docs', 'governance');
const FILES = ['decision-ledger-adr0059.md', 'decision-ledger-adr0061.md', 'audit-report-adr0058.md', 'ERRATA.md'];

describe('ADR-0061 D-E witnessed digest anchor', () => {
  test('authoritative copies exist and are non-empty', () => {
    for (const f of FILES) {
      const p = path.join(DIR, f);
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.readFileSync(p, 'utf8').length).toBeGreaterThan(0);
    }
  });

  test('digests regenerate cleanly (regen-and-diff)', () => {
    const r = execFileSync(process.execPath, ['scripts/build-governance-anchors.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(r).toContain('digests in sync');
  });

  test('anchors.json carries a sha256 per artifact and a witness statement', () => {
    const a = JSON.parse(fs.readFileSync(path.join(DIR, 'anchors.json'), 'utf8'));
    expect(a.artifacts.length).toBeGreaterThanOrEqual(4);
    for (const x of a.artifacts) {
      expect(x.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(x.bytes).toBeGreaterThan(0);
    }
    expect(a.witness).toContain('defer-0024');
  });

  test('the copies are outside the npm tarball whitelist', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.files.some((f) => f.startsWith('docs/governance'))).toBe(false);
    expect(pkg.files).not.toContain('docs/');
  });
});
