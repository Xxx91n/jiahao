# grill-t39 — STATUS（常驻目标卡）

## 轮对象
两个新痛点围剿：
- **P-A**：上游锚定项目 ponytail（DietrichGebert/ponytail）近期重大更新的借鉴收割。
- **P-B**：心智模型新增第五语义——"总爱使用莫名创造的复杂词语和句式输出装作很高大上"（pretentious/jargon-loaded output）。

## 数据源纪律（最高优先）
- 整理阶段的唯一数据源 = `.scratch/grill-t39/decision-ledger.md`；禁止从对话回忆补结论。
- 每个被确认的实质性结论当场落账：ID（D-001 起）、原问题、原回答原文、规范化需求、显式约束/负向需求、状态。
- 压缩/compact/handoff 前必须先确认账本落盘到最新。

## 边界
- grill 中不动源码、不设其他目标。
- 一次一个问题；调研充分后才提问。
- VCS 写一律走 `but`，显式 id 允许列表，禁止裸扫。
- 新 lane 命名 `grill-t39-*`；`grill-t39-prep` lane（`2df61d4e`，刻意未落）是上一轮遗留，处置待烤。
- 工作区他人未提交项不动：`.scratch/grill-t23|t27|t28|t36` 残留、`docs/adr/0094`、`test/post-land-sentinel.test.js`。

## 退出条件
账本条目数 + 覆盖率自评 → 问"是否可以定稿"，不自行宣布结束。

## 当前阶段（2026-10-07 更新）
- grill 已获 owner 定稿许可；账本 D-001~D-008 全 current。
- 当前环节=整理文档：spec-t39 起草 + `handoffs/next-round.md` 任务书 + but 提交防丢。
- 数据源=decision-ledger.md 唯一；对账：每条 current 记录须标去向（spec 节 / 任务号 / 范围外+理由），无去向清单非空则停。
