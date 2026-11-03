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
  expect(section).toMatch(/Each segment is one line/i);
  // Angle brackets are parsed as an HTML tag by GFM, which drops the segment
  // body from the rendered example - the very failure #135 reports.
  expect(TEMPLATE).not.toContain('<');
  // No line of the contract may itself demonstrate the merged shape: every
  // adjacent label pair is checked, not just the first one.
  const labels = ['[以上运行后的结论]', '[电脑内的证据]', '[没做完的风险漏洞]'];
  const labelsOn = (line) => labels.filter((label) => line.includes(label)).length;
  expect(section.split('\n').every((line) => labelsOn(line) < 2)).toBe(true);

  // Rung 5 is where the original wording lived; it has to keep pointing at the
  // detailed format and preserve the at-most-three ceiling.
  const rung = content.split('\n').find((line) => line.startsWith('5. **Three-Line Output Lock'));
  expect(rung).toBeDefined();
  expect(rung).toContain('Output Lock Format');
  expect(rung).toMatch(/at most three segments/i);
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

test('three-line output lock labels are the plain-word ones, in ticket order', () => {
  const start = content.indexOf('### Output Lock Format');
  const end = content.indexOf('\n## ', start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const section = content.slice(start, end);
  const live = ['[以上运行后的结论]', '[电脑内的证据]', '[没做完的风险漏洞]'];
  const retired = ['[行动结论]', '[机器凭证]', '[残留风险]'];
  // #135 把阶梯第 5 级改成指向本段的指针，标签只在格式段出现一处；
  // 上一轮「两处都钉」的前提由那次重构取消，缺席断言仍管全文。
  live.forEach(label => expect(section).toContain(label));
  const at = live.map(label => section.indexOf(label));
  expect(at).toEqual([...at].sort((a, b) => a - b));
  retired.forEach(label => expect(content).not.toContain(label));
});

test('has boundaries section', () => {
  expect(content).toContain('## Boundaries');
  expect(content).toContain('Self-validation provides coherence evidence only, not independence evidence');
  expect(content.toLowerCase()).toContain('freeze');
});
