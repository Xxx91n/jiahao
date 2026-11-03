'use strict';

// The exact Output Lock template (#135). The source contract test and the
// generated-copy test pin the same bytes: a wording edit has to reach every
// shipped surface, and one definition keeps the two tests from drifting into
// two different expectations. Label names are the plain-word set from #136.
const TEMPLATE =
  '[以上运行后的结论] `one sentence stating what this round of runs actually completed`\n\n' +
  '[电脑内的证据] `the exact command you ran on this machine, the exit code it really returned, and what its output showed`\n\n' +
  '[没做完的风险漏洞] `name what is still unverified and where it can still break, or 无`';

module.exports = { TEMPLATE };
