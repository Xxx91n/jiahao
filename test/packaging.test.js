const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// The pack contract lives beside the release gate so the tag command and this
// assertion read one list instead of two copies that can disagree.
const { REQUIRED_PACK_FILES, FORBIDDEN_PACK_PREFIXES, auditPackFiles } = require('../scripts/release-gate');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const BRAND = 'https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand';

let packed;
let packMeta;

beforeAll(() => {
  const out = execSync('npm pack --dry-run --json', {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  packMeta = JSON.parse(out)[0];
  packed = packMeta.files.map((f) => f.path);
});

test('tarball contains the Chinese README', () => {
  expect(packed).toContain('README-zh-CN.md');
});

test('tarball contains no brand assets', () => {
  expect(packed.filter((p) => p.startsWith('docs/assets/'))).toEqual([]);
});

// #63: the packed artifact is the release artifact, so it has to carry both
// exits. The rules directory is generated, so it is also the one output a
// hand edit or a stale build could leave out without anyone noticing.
test('tarball carries the rules directory and every plugin bundle, and no private or research files', () => {
  expect(auditPackFiles(packed)).toEqual([]);
});

// Pin the contract itself: if REQUIRED_PACK_FILES lost an exit, the assertion
// above would still pass, because both sides would be equally wrong.
test('the pack contract names the rules file, every plugin manifest and hook map, the Qoder rules exit, and the marketplace', () => {
  for (const rel of [
    'skills/jiahao/SKILL.md',
    'adapters/codebuddy/.claude-plugin/plugin.json',
    'adapters/codebuddy/hooks/hooks.json',
    'adapters/claude-code/.claude-plugin/plugin.json',
    'adapters/claude-code/hooks/hooks.json',
    // #78: the Copilot bundle carries a host-native manifest path; a tarball
    // that drops it ships a bundle the host cannot discover.
    'adapters/copilot/plugin.json',
    'adapters/copilot/hooks/hooks.json',
    // #79: Qoder is a rules-only exit. Its rule file and install manual are
    // required in the tarball; a hook map would be a defect, not a requirement.
    'adapters/qoder/rules/jiahao.md',
    'adapters/qoder/README.md',
    '.claude-plugin/marketplace.json',
    // #85: the write side of adjudication went missing from the repo once, and
    // a tarball without it fails only on a user's machine.
    'scripts/resolve.js',
  ]) {
    expect(REQUIRED_PACK_FILES).toContain(rel);
  }
  expect(REQUIRED_PACK_FILES).not.toContain('adapters/qoder/hooks/hooks.json');
  expect(REQUIRED_PACK_FILES).not.toContain('adapters/qoder/.claude-plugin/plugin.json');
  expect(FORBIDDEN_PACK_PREFIXES).toEqual(expect.arrayContaining(['private/', 'bench/', 'docs/research/']));
});

test('the Qoder rules-only exit is packed as exactly its rule and README', () => {
  // Exact set, not just "contains": adapters/ is whitelisted wholesale, so an
  // untracked adapters/qoder/hooks/hooks.json would ship without this check.
  expect(packed.filter((p) => p.startsWith('adapters/qoder/')).sort()).toEqual([
    'adapters/qoder/README.md',
    'adapters/qoder/rules/jiahao.md',
  ]);
});

test('the packed version is the package version the tag will be checked against', () => {
  expect(packMeta.name).toBe(pkg.name);
  expect(packMeta.version).toBe(pkg.version);
});

// npmjs rewrites relative URLs in the published README only when
// package.repository parses, so both language-switch links need the field.
test('repository.url is set for npmjs URL rewriting', () => {
  expect(pkg.repository?.url).toMatch(/github\.com\/Xxx91n\/jiahao/);
  const read = (n) => fs.readFileSync(path.join(root, n), 'utf8');
  expect(read('README.md')).toContain('href="README-zh-CN.md"');
  expect(read('README-zh-CN.md')).toContain('href="README.md"');
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
