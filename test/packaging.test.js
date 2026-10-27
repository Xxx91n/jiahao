const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const BRAND = 'https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand';

let packed;

beforeAll(() => {
  const out = execSync('npm pack --dry-run --json', {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  packed = JSON.parse(out)[0].files.map((f) => f.path);
});

test('tarball contains the Chinese README', () => {
  expect(packed).toContain('README-zh-CN.md');
});

test('tarball contains no brand assets', () => {
  expect(packed.filter((p) => p.startsWith('docs/assets/'))).toEqual([]);
});

// npmjs rewrites relative URLs in the published README only when
// package.repository parses, so the "中文" nav link needs the field to work.
test('repository.url is set for npmjs URL rewriting', () => {
  expect(pkg.repository?.url).toMatch(/github\.com\/Xxx91n\/jiahao/);
  expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toContain(
    'href="README-zh-CN.md"'
  );
});

// npmjs rewrites <img src> against repository.url but leaves <source srcset>
// untouched, so a relative dark-mode logo fails on the published page.
test('both READMEs point at both brand assets by absolute URL', () => {
  for (const name of ['README.md', 'README-zh-CN.md']) {
    const content = fs.readFileSync(path.join(root, name), 'utf8');
    const src = content.match(/<img src="([^"]+)"/);
    const srcset = content.match(/<source[^>]+srcset="([^"]+)"/);
    expect(src && src[1]).toBe(`${BRAND}/logo.png`);
    expect(srcset && srcset[1]).toBe(`${BRAND}/logo-dark.png`);
  }
});
