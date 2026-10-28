// Shape conformance for the rules-version directory, against the two limits
// the Agent Skills spec puts on frontmatter (name <= 64 chars, description
// <= 1024) and the one limit the installing CLI enforces on discovery
// (`npx skills add` skips a SKILL.md whose name/description are missing or
// non-string).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skillDir = path.join(root, 'skills', 'jiahao');
const skillPath = path.join(skillDir, 'SKILL.md');

// Reads the block between the first pair of `---` fences. Supports `key: value`
// and the folded `key: >` block src/SKILL.md uses; nothing else is in frontmatter.
function readFrontmatter(text, label) {
  const block = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!block) throw new Error('no frontmatter block in ' + label);
  const lines = block[1].split('\n');
  const data = {};
  for (let i = 0; i < lines.length; i++) {
    const entry = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(lines[i]);
    if (!entry) continue;
    const marker = entry[2].trim();
    if (/^[|>][-+]?$/.test(marker)) {
      const folded = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1] === '')) {
        folded.push(lines[++i].trim());
      }
      data[entry[1]] = folded.join(marker[0] === '|' ? '\n' : ' ').trim();
    } else {
      data[entry[1]] = marker.replace(/^["'](.*)["']$/, '$1');
    }
  }
  return data;
}

const { SKILL_DIR, SOURCE_NAME } = require('../scripts/build-adapters');
const { listTrackedPaths } = require('../src/shared/tracked-surface');
const emitted = fs.readFileSync(skillPath, 'utf8');
const source = fs.readFileSync(path.join(root, 'src', 'SKILL.md'), 'utf8');
const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, '');

test('the skill directory is <skill-name>/SKILL.md', () => {
  expect(fs.existsSync(skillPath)).toBe(true);
  expect(fs.statSync(skillDir).isDirectory()).toBe(true);
});

test('the rule file is the single source with the source-only keys dropped', () => {
  expect(body(emitted)).toBe(body(source));
  expect(Object.keys(readFrontmatter(emitted, skillPath))).toEqual(['name', 'description', 'argument-hint', 'license']);
});

test('the source hides itself from discovery and the shipped file does not', () => {
  expect(source).toContain('name: ' + SOURCE_NAME + '\n');
  expect(source).toContain('metadata:\n  internal: true\n');
  expect(emitted).not.toContain('internal: true');
});

// Asking for a skill by name makes the CLI include internal skills, so a second
// file named `jiahao` would win the lookup and install the directory it sits in -
// `src/`, runtime JS and all. Measured on skills 1.7.4 before the source got its
// own name. This lists tracked paths rather than reading their contents: another
// suite regenerates those files while jest runs, and a mid-write read is a flake,
// not a finding.
test('no SKILL.md outside the known set can claim the shipped skill name', () => {
  const claimants = listTrackedPaths(root)
    .filter((rel) => rel.endsWith('/SKILL.md'))
    .filter((rel) => rel !== SKILL_DIR + '/SKILL.md')
    .sort();
  expect(claimants).toEqual(['adapters/codebuddy/src/SKILL.md', 'src/SKILL.md']);
});

test('name matches the directory name and fits the spec shape', () => {
  const name = readFrontmatter(emitted, skillPath).name;
  expect(name).toBe(path.basename(skillDir));
  expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(name.length).toBeLessThanOrEqual(64);
});

test('description is one string of 1-1024 characters', () => {
  const description = readFrontmatter(emitted, skillPath).description;
  expect(typeof description).toBe('string');
  expect(description.length).toBeGreaterThan(0);
  expect(description.length).toBeLessThanOrEqual(1024);
});
