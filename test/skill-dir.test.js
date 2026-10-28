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
// and the folded `key: >` block src/SKILL.md uses - nothing else is in frontmatter.
function readFrontmatter(text, label) {
  const block = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!block) throw new Error('no frontmatter block in ' + label);
  const lines = block[1].split('\n');
  const data = {};
  for (let i = 0; i < lines.length; i++) {
    const entry = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(lines[i]);
    if (!entry) continue;
    const marker = entry[2].trim();
    if (marker === '>') {
      const folded = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1] === '')) {
        folded.push(lines[++i].trim());
      }
      data[entry[1]] = folded.join(' ').trim();
    } else {
      data[entry[1]] = marker.replace(/^["'](.*)["']$/, '$1');
    }
  }
  return data;
}

const { buildAdapters, SKILL_DIR, SOURCE_NAME } = require('../scripts/build-adapters');
const { listTrackedPaths } = require('../src/shared/tracked-surface');
// The generated text, not the file on disk: another suite reruns the generator
// while jest works, and a read landing in writeFileSync's truncate window gets a
// partial file (measured: 38 truncated reads across 51 rebuilds). That the file
// on disk equals this text is --check's job, already asserted in adapters.test.js.
const emitted = buildAdapters()[SKILL_DIR + '/SKILL.md'];
const source = fs.readFileSync(path.join(root, 'src', 'SKILL.md'), 'utf8');
const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, '');

test('the skill directory is <skill-name>/SKILL.md', () => {
  expect(fs.existsSync(skillPath)).toBe(true);
  expect(fs.statSync(skillDir).isDirectory()).toBe(true);
});

// Only the keys the Agent Skills spec defines ship: the reference validator
// (agentskills/agentskills, skills-ref) rejects a file carrying anything else,
// and the looser `skills` CLI does not, so this pin is what keeps AC2 honest.
test('the rule file is the single source with the source-only keys dropped', () => {
  expect(body(emitted)).toBe(body(source));
  const keys = Object.keys(readFrontmatter(emitted, SKILL_DIR)).sort();
  expect(keys).toEqual(['description', 'license', 'name']);
});

test('the source keeps the keys that only it can carry', () => {
  expect(source).toContain('name: ' + SOURCE_NAME + '\n');
  expect(source).toContain('metadata:\n  internal: true\n');
  expect(source).toContain('argument-hint: ');
  expect(emitted).not.toContain('internal: true');
  expect(emitted).not.toContain('argument-hint');
});

// Paths, not contents, for the reason given at the read above. A new SKILL.md
// anywhere in the repo has to be acknowledged here: the skills CLI scans the
// root's child directories, and toShippedSkill says what a second claimant costs.
test('the tracked SKILL.md set stays exactly the known three', () => {
  const claimants = listTrackedPaths(root)
    .filter((rel) => rel.endsWith('/SKILL.md'))
    .filter((rel) => rel !== SKILL_DIR + '/SKILL.md')
    .sort();
  expect(claimants).toEqual(['adapters/codebuddy/src/SKILL.md', 'src/SKILL.md']);
});

test('name matches the directory name and fits the spec shape', () => {
  const name = readFrontmatter(emitted, SKILL_DIR).name;
  expect(name).toBe(path.basename(skillDir));
  expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(name.length).toBeLessThanOrEqual(64);
});

test('description reaches the CLI as one string of 1-1024 characters', () => {
  // The helper reads any single line as a string, so a flow list would satisfy the
  // length checks below while the CLI parses it as an array and skips the whole
  // skill. Reject that shape from the raw line, and leave legal scalar forms alone.
  const raw = /^description:[ \t]*(.*)$/m.exec(emitted)[1].trim();
  expect(/^[{[]/.test(raw)).toBe(false);
  const description = readFrontmatter(emitted, SKILL_DIR).description;
  expect(typeof description).toBe('string');
  expect(description.length).toBeGreaterThan(0);
  expect(description.length).toBeLessThanOrEqual(1024);
});
