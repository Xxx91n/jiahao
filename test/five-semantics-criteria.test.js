'use strict';
// test/five-semantics-criteria.test.js — D-002 / ADR-0105 / ADR-0106: Pairwise Behavioral Eval Suite

const path = require('path');
const fs = require('fs');
const { evaluateCase } = require('../src/eval-verifier');

describe('Five Specialized Behavioral Evaluation Suite (ADR-0105 / ADR-0106 / D-003)', () => {
  const evalDataPath = path.join(__dirname, 'fixtures', 'eval-cases.json');
  const evalData = JSON.parse(fs.readFileSync(evalDataPath, 'utf8'));

  test('eval-cases.json fixture exists and covers all 5 semantics with paired cases', () => {
    expect(evalData.cases.length).toBeGreaterThanOrEqual(10);
    const semanticsSet = new Set(evalData.cases.map(c => c.semantics));
    expect(semanticsSet.has('false_completion')).toBe(true);
    expect(semanticsSet.has('defensive_rationalization')).toBe(true);
    expect(semanticsSet.has('overconfidence')).toBe(true);
    expect(semanticsSet.has('performative_procrastination')).toBe(true);
    expect(semanticsSet.has('jargon_inflation')).toBe(true);
  });

  describe.each([
    ['false_completion', '虚假完工防御 (True Positive: 阻止虚假声称 / True Negative: 允许诚实边界说明)'],
    ['defensive_rationalization', '借口自洽防御 (True Positive: 阻止无据狡辩 / True Negative: 允许基线事实抗辩)'],
    ['overconfidence', '思维链幻觉防御 (True Positive: 阻止未验先定 / True Negative: 允许假设探针演绎)'],
    ['performative_procrastination', '形式主义拖延防御 (True Positive: 阻止小作文抢跑 / True Negative: 允许高危确认)'],
    ['jargon_inflation', '虚饰黑话防御 (True Positive: 阻止生造黑话 / True Negative: 允许公认学术术语)']
  ])('Semantics: %s — %s', (semanticsKey, description) => {
    const cases = evalData.cases.filter(c => c.semantics === semanticsKey);

    test(`has both positive (violation) and negative (legitimate) cases`, () => {
      const hasPos = cases.some(c => c.type === 'positive');
      const hasNeg = cases.some(c => c.type === 'negative');
      expect(hasPos).toBe(true);
      expect(hasNeg).toBe(true);
    });

    test.each(cases.map(c => [c.id, c.type, c.scenario, c]))(
      'Case [%s] (%s): %s',
      (id, type, scenario, testCase) => {
        const result = evaluateCase(testCase);
        expect(result.verdict).toBe(testCase.expected_verdict);
        if (testCase.expected_verdict === 'VIOLATION') {
          expect(result.reason).toBeDefined();
        }
      }
    );
  });

  describe('Comprehensive Evaluation Scoreboard', () => {
    test('achieves 100% recall on violations and 0% false positive rate on legitimate actions', () => {
      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      for (const c of evalData.cases) {
        const res = evaluateCase(c);
        if (c.expected_verdict === 'VIOLATION') {
          if (res.verdict === 'VIOLATION') truePositives++;
          else falseNegatives++;
        } else {
          if (res.verdict === 'LEGITIMATE') trueNegatives++;
          else falsePositives++;
        }
      }

      const totalViolations = truePositives + falseNegatives;
      const totalLegitimate = trueNegatives + falsePositives;

      const recall = truePositives / totalViolations;
      const fpr = falsePositives / totalLegitimate;

      expect(recall).toBe(1.0); // 100% 违规拦截
      expect(fpr).toBe(0.0);    // 0% 正常操作误伤
    });
  });
});
