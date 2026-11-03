const fs = require('fs');
const path = require('path');

const skillPath = path.join(__dirname, '..', 'src', 'SKILL.md');
const content = fs.readFileSync(skillPath, 'utf8');

test('SKILL.md exists and is non-empty', () => {
  expect(content.length).toBeGreaterThan(500);
});

test('has YAML frontmatter with name and description', () => {
  expect(content).toMatch(/^---\nname: jiahao-source/);
  expect(content).toMatch(/description:/);
});

test('has all 6 verification ladder rungs', () => {
  for (let i = 1; i <= 6; i++) {
    expect(content).toContain(`${i}. **`);
  }
});

test('has all 7 anti-false-completion iron laws', () => {
  const laws = [
    'judge cannot be the author',
    'Errors are found, not felt',
    'Distrust confident language',
    'Not verified',
    'Verify side effects',
    'No showing off',
    'No self-comforting',
  ];
  laws.forEach(law => {
    expect(content.toLowerCase()).toContain(law.toLowerCase());
  });
});

test('has output format with verdict pattern', () => {
  expect(content).toContain('PASS');
  expect(content).toContain('FAIL');
  expect(content).toContain('NOT VERIFIED');
  expect(content).toContain('verdict');
});

test('output lock keeps the three labels on separate, blank-line-separated lines (#135)', () => {
  const { TEMPLATE } = require('./helpers/output-lock-contract');
  const start = content.indexOf('### Output Lock Format');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = content.indexOf('## Verifier Profile');
  expect(end).toBeGreaterThan(start);
  const section = content.slice(start, end);

  // The template pins the blank line between sections: a single newline is
  // rendered as a space by Markdown, which is how the three labels collapsed
  // into one paragraph (#135).
  expect(section).toContain(TEMPLATE);
  expect(section).toMatch(/blank line/i);
  expect(section).toMatch(/format failure/i);
  // No line of the contract may itself demonstrate the merged shape.
  expect(section.split('\n').some((line) => /\[行动结论\].*\[机器凭证\]/.test(line))).toBe(false);

  // Rung 5 is where the original wording lived; it has to keep pointing at the
  // detailed format and keep the merge prohibition, or a revert there would
  // pass every other assertion in this file.
  const rung = content.split('\n').find((line) => line.startsWith('5. **Three-Line Output Lock'));
  expect(rung).toBeDefined();
  expect(rung).toContain('Output Lock Format');
  expect(rung).toMatch(/never merge/i);
});

test('has bias guards section', () => {
  expect(content).toContain('## Bias guards');
  expect(content).toContain('rubric');
  expect(content).toContain('blind the order');
});

test('has intensity levels', () => {
  expect(content).toContain('lite');
  expect(content).toContain('full');
  expect(content).toContain('ultra');
});

test('has boundaries section', () => {
  expect(content).toContain('## Boundaries');
  expect(content).toContain('Self-validation provides coherence evidence only, not independence evidence');
  expect(content.toLowerCase()).toContain('freeze');
});
