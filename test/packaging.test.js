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
test('the pack contract names the rules file, every plugin manifest and hook map, the Qoder rules exit, and both marketplaces', () => {
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
    // #77: Codex ships its own manifest location and the second marketplace.
    'adapters/codex/.codex-plugin/plugin.json',
    'adapters/codex/hooks/hooks.json',
    '.agents/plugins/marketplace.json',
    // #79 shipped Qoder as rules-only; #109 turned it into a Desktop plugin
    // row and kept the rule file for the IDE/CLI line, so both halves have to
    // be in the tarball.
    'adapters/qoder/rules/jiahao.md',
    'adapters/qoder/README.md',
    'adapters/qoder/.qoder-plugin/plugin.json',
    'adapters/qoder/hooks/hooks.json',
    '.claude-plugin/marketplace.json',
    // #85: the write side of adjudication went missing from the repo once, and
    // a tarball without it fails only on a user's machine.
    'scripts/resolve.js',
  ]) {
    expect(REQUIRED_PACK_FILES).toContain(rel);
  }
  // The Qoder bundle is a Desktop plugin: its manifest is `.qoder-plugin/`, and
  // a Claude-shaped path in the contract would be a file no host reads.
  expect(REQUIRED_PACK_FILES).not.toContain('adapters/qoder/.claude-plugin/plugin.json');
  expect(FORBIDDEN_PACK_PREFIXES).toEqual(expect.arrayContaining(['private/', 'bench/', 'docs/research/']));
});

test('the Qoder exit ships exactly the files the generator emits for it', () => {
  // Exact set, not just "contains": adapters/ is whitelisted wholesale, so a
  // hand-dropped vendored file or an untracked extra would be invisible to a
  // contains-only assertion. The expectation is read from the generator, so it
  // tracks the require() closure instead of a hand-copied list that rots.
  const { buildAdapters } = require('../scripts/build-adapters');
  const expected = Object.keys(buildAdapters())
    .filter((rel) => rel.startsWith('adapters/qoder/')).sort();
  expect(expected).toContain('adapters/qoder/hooks/hooks.json');
  expect(packed.filter((p) => p.startsWith('adapters/qoder/')).sort()).toEqual(expected);
});

// #77: the required list must grow with the generator, not sit one marketplace
// behind it. Restated as a fixpoint over what the generator emits, so a third
// marketplace (or a renamed one) cannot be produced and left out of the tarball.
test('every generated marketplace manifest is a required pack file', () => {
  const { buildAdapters } = require('../scripts/build-adapters');
  const marketplaces = Object.keys(buildAdapters()).filter((rel) => rel.endsWith('/marketplace.json'));
  expect(marketplaces.length).toBeGreaterThanOrEqual(2);
  for (const rel of marketplaces) expect(REQUIRED_PACK_FILES).toContain(rel);
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
