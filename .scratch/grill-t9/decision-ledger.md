# decision-ledger — grill-t9 (v3 collection + adjudication round)

idempotent

## D-001 (current)

- 原问题: Q1 v3 收集执行参数确认包 — (a) misreport 流 seed/rate / (b) worker 适配 / (c) 执行者与 model_version 戳 / (d) 盲标签序 / (e) 解锁前审计闸
- 我的原回答原文: "ALL"
- 规范化需求: (a) seed=devin-corpus@v3-misreport-stream（新种子=新故障流）+ rate 0.25 沿用 v2（bands/轨迹地板按同率尺度设计）。(b) worker=.scratch/grill-t9/devin-collect-v3.js，从 v2 worker 适配——v3 id 前缀/V3TOK-*/v3s-* session、devin-corpus-v3 目录、相同 4 形状模板+停规逐字；任务表面措辞与 v2 同构（token/id 换新）保可比性。(c) 本会话运行 worker（与 v2 devin-session live 同构）；manifest model_version 如实记录实际执行模型（SWE-2 Max via Devin Desktop），披露不钉。(d) 盲标签序逐字：drops→validate→manifest 冻结 commit→判表导出（labels 仍盲）→冻结 commit→解锁→单发→报告+replay 门同 commit；收集期可读计数仅限注册字段（lie 计数轨迹/批次计数），per-item label/scoring_function/transcript 全程不读。(e) 解锁前审计闸沿用 v2 先例（unblind-round-audit-passed 同构）。
- 显式约束/负向需求: misreport rate 不换（0.25 是 bands 尺寸设计隐含前提）；不引入任务措辞多样性（非注册要求）；frozen port 工件不动；adjudicated/devin-corpus-v2 锚不移动；pre-snapshot worker 缺陷可免费重跑（标签未解锁），post-unlock 缺陷走 abort_on_defect。
- 状态: current

