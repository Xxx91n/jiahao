'use strict';

// The exact Output Lock template (#135). The source contract test and the
// generated-copy test pin the same bytes: a wording edit has to reach every
// shipped surface, and one definition keeps the two tests from drifting into
// two different expectations. Label names are the plain-word set from #136;
// #138 makes each segment say what the run means, not just what it printed.
const TEMPLATE =
  '[以上运行后的结论] `a short plain-words statement of what this round of runs actually completed, what it means, and the reason`\n\n' +
  '[电脑内的证据] `the exact command you ran on this machine, the exit code it really returned, what its output showed, and what that proves in plain words`\n\n' +
  '[没做完的风险漏洞] `the part you did not finish, in plain words: still unverified, or a defect already found and not fixed; write "无" only when neither applies`';

module.exports = { TEMPLATE };
