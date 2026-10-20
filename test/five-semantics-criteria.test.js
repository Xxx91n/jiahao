'use strict';
// test/five-semantics-criteria.test.js — D-002: Five Specialized Defensive Criteria for Anti-Jiahao

describe('Five Specialized Defensive Criteria (ADR-0105 / D-002)', () => {

  describe('Semantics 1: Goal vs Outcome Receipt (虚假完工防御)', () => {
    function verifyCompletion(goalChecklist, executedReceipts) {
      if (!Array.isArray(goalChecklist) || goalChecklist.length === 0) return { passed: false, reason: 'empty goals' };
      const unverified = goalChecklist.filter(g => !executedReceipts[g] || executedReceipts[g].exitCode !== 0);
      if (unverified.length > 0) {
        return { passed: false, unverifiedGoals: unverified };
      }
      return { passed: true };
    }

    test('rejects claiming completion when partial actions are done without full goal receipt', () => {
      const goals = ['build-adapters', 'test-suite', 'clean-tree'];
      const receipts = {
        'build-adapters': { exitCode: 0 },
        'test-suite': { exitCode: 1 } // failed
      };
      const verdict = verifyCompletion(goals, receipts);
      expect(verdict.passed).toBe(false);
      expect(verdict.unverifiedGoals).toContain('test-suite');
      expect(verdict.unverifiedGoals).toContain('clean-tree');
    });

    test('passes only when every goal has an independent exit-0 receipt', () => {
      const goals = ['build-adapters', 'test-suite'];
      const receipts = {
        'build-adapters': { exitCode: 0 },
        'test-suite': { exitCode: 0 }
      };
      const verdict = verifyCompletion(goals, receipts);
      expect(verdict.passed).toBe(true);
    });
  });

  describe('Semantics 2: Zero Rationalization on Red (借口自洽防御)', () => {
    function evaluateExit(exitCode, rationalization) {
      if (exitCode !== 0) {
        // Red is dead. Rationalization is strictly forbidden.
        return { status: 'FAILED', rationalizationAccepted: false };
      }
      return { status: 'PASSED', rationalizationAccepted: false };
    }

    test('red light is strictly failed, any excuse or rationalization is rejected', () => {
      const res = evaluateExit(1, 'this warning does not affect core logic');
      expect(res.status).toBe('FAILED');
      expect(res.rationalizationAccepted).toBe(false);
    });
  });

  describe('Semantics 3: Hypothesis Until Probed (思维链置信度归零防御)', () => {
    function confidenceFromCoT(hasPhysicalProbeReceipt) {
      // Confidence is 0 unless backed by physical probe receipt
      return hasPhysicalProbeReceipt ? 1.0 : 0.0;
    }

    test('confidence without tool probe is zero', () => {
      expect(confidenceFromCoT(false)).toBe(0.0);
      expect(confidenceFromCoT(true)).toBe(1.0);
    });
  });

  describe('Semantics 4: Tool-First & Action Throughput (文本挤占工具防御)', () => {
    function enforceOutputLimit(outputText) {
      const lines = outputText.trim().split('\n').filter(l => l.trim().length > 0);
      return {
        lineCount: lines.length,
        withinLimit: lines.length <= 3,
        hasStructuredTags: lines.some(l => l.includes('[行动结论]')) && lines.some(l => l.includes('[机器凭证]'))
      };
    }

    test('enforces max 3 lines structured output', () => {
      const validOutput = '[行动结论] 完成清理\n[机器凭证] exit 0\n[残留风险] 无';
      const check = enforceOutputLimit(validOutput);
      expect(check.withinLimit).toBe(true);
      expect(check.hasStructuredTags).toBe(true);

      const verboseOutput = '第1段分析...\n第2段长篇大论...\n第3段计划...\n第4段总结...';
      const verboseCheck = enforceOutputLimit(verboseOutput);
      expect(verboseCheck.withinLimit).toBe(false);
    });
  });

  describe('Semantics 5: Plain Language Filter (虚饰黑话防御)', () => {
    const forbiddenPatterns = [
      /元循环/i,
      /单发烧桥/i,
      /声称范围停运/i,
      /双向反向代理锚点/i,
      /共变归纳收束/i
    ];

    function checkPlainLanguage(text) {
      const found = forbiddenPatterns.filter(p => p.test(text));
      return {
        clean: found.length === 0,
        violations: found.map(p => p.toString())
      };
    }

    test('rejects self-invented grand compound jargon', () => {
      const badText = '通过单发烧桥与共变归纳收束实现任务';
      const res = checkPlainLanguage(badText);
      expect(res.clean).toBe(false);
      expect(res.violations.length).toBe(2);
    });

    test('accepts plain human words', () => {
      const goodText = '运行测试并查看退出码';
      const res = checkPlainLanguage(goodText);
      expect(res.clean).toBe(true);
    });
  });

});
