const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const BRAND = 'https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand';

const pack = JSON.parse(
  execSync('npm pack --dry-run --json', {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
)[0];
const packed = pack.files.map((f) => f.path);

test('tarball contains the Chinese README', () => {
  expect(packed).toContain('README-zh-CN.md');
});

test('tarball contains no brand assets', () => {
  expect(packed.filter((p) => p.startsWith('docs/assets/'))).toEqual([]);
});

test('repository.url lets npmjs resolve relative README references', () => {
  expect(pkg.repository && pkg.repository.url).toMatch(
    /github\.com\/Xxx91n\/jiahao/
  );
});

// npmjs rewrites <img src> against repository.url but leaves <source srcset>
// untouched, so a relative logo fails on the published page.
test('packed READMEs point at both brand assets by absolute URL', () => {
  const expected = [`${BRAND}/logo.png`, `${BRAND}/logo-dark.png`];
  for (const name of ['README.md', 'README-zh-CN.md']) {
    const content = fs.readFileSync(path.join(root, name), 'utf8');
    const urls = [...content.matchAll(/(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]);
    expect(urls).toEqual(expect.arrayContaining(expected));
    for (const url of urls) {
      expect(url.startsWith('https://')).toBe(true);
    }
  }
});
