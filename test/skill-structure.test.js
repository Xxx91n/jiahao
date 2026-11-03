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

// #134: a correction the user types while a turn is still running was being
// treated as the end of the task - one receipt, then the turn closed. The rule
// has to name the ways a turn may end early and require the model to
// restate the opening task before stopping, because the observed failure was a
// silently narrowed goal that then counted itself as done.
test('a mid-task correction does not end the task (#134)', () => {
  const start = content.indexOf('### Surface Signal Rules');
  const end = content.indexOf('### Intensity Levels');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const section = content.slice(start, end);
  const lines = section.split('\n');

  const ruleAt = lines.findIndex((line) => line.startsWith('- **R6 (Correction Mid-Task)'));
  expect(ruleAt).toBeGreaterThan(0);

  // The gsr header is the structural latch the generator validates; it has to
  // sit above the bullet on the nearest non-blank line (hooks/jiahao-profile.js).
  let headerAt = ruleAt - 1;
  while (headerAt >= 0 && lines[headerAt].trim() === '') headerAt--;
  expect(lines[headerAt]).toBe('<!-- gsr:9 | signal-domain: task-continuation | status: active -->');

  const rule = lines[ruleAt];
  // The correction is a change of plan, not the arrival of the goal.
  expect(rule).toMatch(/does not end the task/i);
  expect(rule).toMatch(/change to the plan/i);
  // The legitimate early exits. R5 is one of them: a failed check stops the
  // turn regardless of what the user's correction asked for.
  expect(rule).toMatch(/only when the user cancels/i);
  expect(rule).toMatch(/original goal is really done/i);
  expect(rule).toMatch(/blocked on something only the user can clear/i);
  expect(rule).toMatch(/R5 stops you on red/i);
  // A model that narrowed the goal must say which task it started with and what
  // is left before it stops - the receipt alone is what #134 shows going wrong.
  expect(rule).toMatch(/restate the task you started with/i);
  expect(rule).toMatch(/what is still left/i);
  expect(rule).toMatch(/not just a receipt/i);

  // The rule instructs the executing agent, so the audit profile must not carry
  // it; the commit for #134 says the verifier section is unchanged.
  const verifier = content.slice(content.indexOf('## Verifier Profile'), content.indexOf('## Boundaries'));
  expect(verifier).not.toContain('Correction Mid-Task');
});

// #138: the model kept naming machine artifacts - file paths, symbols, ticket
// numbers, internal labels - as if the name were the explanation, and the user
// had to ask for plain words. R4 has to cover every user-facing message, allow
// the evidence segment to lead with its command, and still demand the
// plain-words meaning; the output format must say the labels are not a
// substitute for that explanation.
test('plain words explain machine names instead of replacing them (#138)', () => {
  const { TEMPLATE } = require('./helpers/output-lock-contract');
  const start = content.indexOf('### Surface Signal Rules');
  const end = content.indexOf('### Intensity Levels');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const lines = content.slice(start, end).split('\n');

  const ruleAt = lines.findIndex((line) => line.startsWith('- **R4 (Plain Language Discipline)'));
  expect(ruleAt).toBeGreaterThan(0);
  const rule = lines[ruleAt];

  // The rule is not confined to the final report; narration between tool calls
  // is where #138's longest jargon sentence lives.
  expect(rule).toMatch(/every user-facing message/i);
  expect(rule).toMatch(/including narration between tool calls/i);
  // A name may never stand in for the plain-words meaning.
  expect(rule).toMatch(/give the plain-words meaning of every name/i);
  expect(rule).toMatch(/never let a file path, symbol, ticket number, or internal shorthand stand in for it/i);
  expect(rule).toMatch(/a name is never the explanation/i);
  // The conclusion leads with plain words; the evidence may lead with the
  // command, but the explanation of what it proves must follow. This is the
  // arbitration that keeps R4 from colliding with the required evidence shape.
  expect(rule).toMatch(/conclusion states the result and the reason in ordinary words/i);
  expect(rule).toMatch(/evidence segment may start with the command/i);
  expect(rule).toMatch(/must then say what it proves in plain words/i);
  // "长难句" is a named symptom, not just obscure vocabulary.
  expect(rule).toMatch(/long, hard-to-follow sentences/i);
  // The old rule said to delete the explanation, which is the omission #138
  // reports. Brevity must not be bought by dropping the explanation.
  expect(rule).not.toMatch(/delete the explanation/i);
  expect(rule).toMatch(/never by dropping the explanation/i);

  // The three labels are a format, not a substitute for saying what happened.
  const lockStart = content.indexOf('### Output Lock Format');
  const lockEnd = content.indexOf('## Verifier Profile');
  const lock = content.slice(lockStart, lockEnd);
  expect(lock).toMatch(/not a substitute for explanation/i);
  expect(lock).toMatch(/pass R4/i);
  expect(lock).toMatch(/reader who has not opened any file/i);
  expect(lock).toMatch(/what happened, what it means, and what is still at risk/i);

  // The template the model copies has to demand the plain-words meaning too,
  // not just the command and its exit code - #138's failing evidence segment.
  const segments = TEMPLATE.split('\n\n');
  expect(segments).toHaveLength(3);
  expect(segments[0]).toMatch(/in plain words/i);
  expect(segments[0]).toMatch(/what it means/i);
  expect(segments[1]).toMatch(/what that proves in plain words/i);
  expect(segments[2]).toMatch(/in plain words/i);

  // R4 is in the generator profile; the verifier is the absent-file default,
  // so the shared boundary has to carry the same rule into both profiles.
  const boundaries = content.slice(content.indexOf('## Boundaries'));
  expect(boundaries).toMatch(/Plain language is not generator-only/i);
  expect(boundaries).toMatch(/the name never replaces the explanation/i);
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
