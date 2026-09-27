# grill-t26 GOAL

## 痛点（原文，永存）
我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## 本轮驱动输入
- 审计交接（.scratch/grill-t25/handoffs/2026-09-24-audit-handoff.md）Next grill direction：
  泛化排序不变式要求每个 anchoring 提交后重捕获每轮证据目录——t25 一轮付出 20+ 波非锚定重捕获，
  且审计报告提交本身 anchoring、自毒化锚点。候选：captured-at-head 绑定捕获时点自身锚 vs 追最新锚；或 per-round anchor namespace。
- 实测公开态（2026-09-24）：origin/main @ bde0570b（t25 已落地，tag adjudicated/grill-t25 已 push——上轮人类动作完成其一）；
  但 CI 在落地 tip 仍红：0069-wiring x2 exit-128 / sentinel-ownership / 0079-wiring 三套件在真公开克隆失败（defer-0070 未销）。
  t25 审计的本地 --no-local 克隆未暴露此三腿——本地克隆 ≠ GitHub runner 宇宙。
- 锐评1.md 仍为 V6（mtime 2026-09-23，无新版）；V7 验证点已在该文件尾部列出。

## 约束
- grill 中不动源码；一次一个问题；用户确认的实质性结论当场落 decision-ledger.md。
- 版本控制走 but；本轮文档提交前需对账通过（账本为唯一数据源）。
- 人类权威事项（human-authority-package 三项、countersign 实体级签字）不可由 agent 代行。

