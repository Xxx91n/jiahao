'use strict';

// The exact three-part reply template (#135). The source contract test and the
// generated-copy test pin the same bytes: a wording edit has to reach every
// shipped copy, and one definition keeps the two tests from drifting into
// two different expectations. Label names are the plain-word set from #136;
// #138 makes each segment say what the run means, not just what it printed.
const TEMPLATE =
  '[以上运行后的结论] `a short plain-words statement of what this round of runs actually completed, what it means, why it matters, and the cause when there is one`\n\n' +
  '[电脑内的证据] `the exact command you ran on this machine, the exit code it really returned, what its output showed, and what that proves in plain words`\n\n' +
  '[没做完的风险漏洞] `the part you did not finish, in plain words: still unverified, or a defect already found and not fixed; write "无" only when neither applies`';

// The list shape #166 adds: a segment with three or more items puts its label
// on its own line and gives each item its own line. Pinned as bytes so the
// source contract and every shipped copy cannot drift into two shapes.
const LIST_TEMPLATE =
  '[电脑内的证据]\n' +
  '- `python tests/test_translate_contract.py`：11 项全过，退出码 0。\n' +
  '- `python tests/test_check_readme.py`：原有 118 项全过。\n' +
  '- `git diff --check`：退出码 0，工作区干净。\n' +
  '- CodeRabbit 最近一轮审查通过，写明“没有可处理的评论”。\n' +
  '- Semgrep 扫描通过。';

module.exports = { TEMPLATE, LIST_TEMPLATE };
