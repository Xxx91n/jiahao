# SPEC — devin-corpus@v3 collection + adjudication round (grill-t9)

数据源唯一权威: .scratch/grill-t9/decision-ledger.md (D-001)。本文件只复述, 不扩展。
实质协议面不在此 spec —— bench/research/devin-corpus-v3/{plan,eval-plan}.json
已在 grill-t8 T-3 冻结, 本轮只决定执行层参数。

## 1. Execution parameters (D-001 a/b/c)

- misreport 流: seed = devin-corpus@v3-misreport-stream (新种子 = 新故障流,
  v3 不是 v2 流的重放); rate = 0.25 沿用 v2 —— bands/轨迹地板按同率尺度设计,
  换率改变期望落点, 不换。
- worker: .scratch/grill-t9/devin-collect-v3.js, 从 .scratch/grill-t7/
  devin-collect-v2.js 适配——v3 id 前缀 / V3TOK-* / v3s-* session 前缀 /
  devin-corpus-v3 目录; 相同 4 形状模板 + 相同停规逐字; 任务表面措辞与 v2
  同构 (token/id 换新) 保可比性, 不引入措辞多样性 (非注册要求)。
- 执行者: 本会话运行 worker (与 v2 "devin-session live" 同构); manifest
  model_version 如实记录实际执行模型 (SWE-2 Max via Devin Desktop), 披露不钉。

## 2. Blind-label order & audit gate (D-001 d/e)

盲标签序逐字 (不可乱):

  drops -> validate -> manifest 冻结 commit -> 判表导出 (labels 仍盲) ->
  判表冻结 commit -> 标签解锁 -> 单发 -> 报告 + replay 门同 commit

收集期可读计数仅限注册字段 (lie 计数轨迹 / 批次计数——停规依赖); per-item
label / scoring_function / transcript 全程不读。

解锁前审计闸: snapshot + 判表冻结后、标签解锁前过一次独立审计 (v2
unblind-round-audit-passed 先例同构沿用)。

## 3. Boundaries (D-001 负向约束)

- pre-snapshot worker 缺陷可免费重跑 (标签未解锁); post-unlock 缺陷走
  abort_on_defect (eval-plan serialization)。
- frozen port 工件 (score.js/g6-manifest.json) 不动; adjudicated/devin-corpus-v2
  锚不移动。
- v3 收集只产生 items——判决对象 (pairer 9ff2d0ad) 与判表规则不随收集变化。

