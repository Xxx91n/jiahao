# grill-t12 spec — critique-closure verdict + carried dispositions + bake stewardship

数据源: decision-ledger.md（本目录，唯一权威）| 日期: 2026-09-17

## §0 头条裁定（D-004 R-d，两层口径）

**锐评五处方：记录级闭环为真。** 全部落地并经独立审计核验（详见
.scratch/grill-t11/reports/2026-09-17-audit.md §二/§三对照表）。

**完成 ≠ 终结。** 闭环过程自身产出新开放项——本轮已全部给出处置决策
（§3/§4）。锐评的两个结构主题——签名委托（权力问题）与设计知识污染
（时间问题）——是常驻张力，被持续回答而非被完成。bake 窗口的 organic
腿在本轮发现后如实重置为 0。

禁用口径："全部完成"（自我安慰式失实）与"未完成"（抹杀已落地事实）。

## §1 轮界（D-001）

本轮烤三个议程面：锐评处方闭环核验 / 审计结转项处置 / bake 值守。

显式范围外（各带理由）：
- deferred-registry 到期审查——注册节律 2026-12-15 未到
- npm 发布复议——ADR-0011/0059 已结
- promotion 评估——冻结门不动，organic 腿=0 无评估对象
- 采集侧 provenance 字段——后续仪器议程，本轮只做分析侧分类
- 多样性 N/M 数值——晋升评审前预注册，不在本轮定数
- pre-commit 扫描器选型——登记为防再犯议程

## §2 闭环核验（D-001 面一）

五处方处置形态（落地证据见 t11 审计报告对照表）：
- P-1 → ERRATA E-6 + ADR-0047 追加注（seq 6/8/10/12/13 全列）
- P-2 → 前向规则 + delegation-renewal-template + seq 18/19/20 已带 scope+expiry（运行中）
- P-3 → v2 plan.json contamination_registry
- P-4 → ADR-0067 附录（de facto 待遇注册；标签留置=新预注册项）
- P-5 → CONTEXT Re-Execution Prior（ISA-240 推定形态，快照+检出偏差披露）

核验性质：记录级闭环（audit-verified + 抽查复核）。议题级状态见 §0。

## §3 bake 值守（D-002 + D-004 R-a/R-b）

### provenance 分层（D-002）

- 四类：organic / automated_harness / synthetic_selfcheck / unclassified
- 判定：分析侧机验——session_id → ~/.claude/projects/<slug>/<sid>.jsonl
  项目目录映射；转录不可得者保守落 unclassified（排除出 organic 计数）
- 现有 31 条 lane 记录按规则回标；**一条不删**（GA4 教训：排除的数据永不可得）
- G1 修订候选："≥200 organic Stop events carrying lane records"——
  走 ADR-0070 修订纪律、前向生效。变严方向的事后修订=干净
  （计数从 31 重置为 organic=0，远离目标而非接近）
- 装置流量保留次等用途：管道健康/回归比对；不进 FP/校准分母
- 多样性限定（≥N 独立会话 × ≥M 任务意图形态）：评审前预注册数值
- bake 窗口不重开；organic 腿当前=0 如实记录
- 命名失效模式登记：wrong-population / synthetic-as-RUM conflation /
  Goodhart 计数刷满 / benchmark contamination / GIVT invalid traffic

### dry-run（D-004 R-a）

照跑全流程：provenance 分类 → 排除规则 → 枚举 flagged 总群 → 预设判定
标准 → 产出判定记录。当前预期输出="排除后总群为空"（2 条 flagged 均
synthetic_selfcheck）——空结果本身是被记录的输出，演习判定机器于无事时。
不得为满足产出而合成分群。

### 检查点节律（D-004 R-b）

每个 grill 轮收尾跑一次 provenance 分层遥测汇总（pairer-lane-telemetry
扩展分段输出）；晋升评审前必跑。挂既有轮次节律，不另造流程。

## §4 审计结转项处置（D-003）

- **F-A1**（tgz 入库）：.gitignore 加 /*.tgz 先于移除 → untrack
  jiahao-0.0.1.tgz → 重跑 gate:all + instrument --check +
  git ls-files|grep tgz=空。登记措辞必须含"已 untrack，历史 blob 保留"，
  禁写"已清除"。不做 history rewrite。
- **O-1**（measured-present 翻转）：host-contracts claude-code
  transcript_file present→measured-present + 三 claim home 句1括号，
  同提交。括号强制载明证据层："live-observed: independent-audit
  reproduction + automated-harness events; organic pending"。断言仅限
  transcript 交付能力实测，不得暗示有机使用。
- **W-1**（底物差异）：翻转同提交加底物注记——差异文件清单
  （instrument-state.json 数据 + check-host-contracts.js 校验器）+
  行为等价论证（hook 运行路径无差）。
- **O-2**（宿主备份入库，公开仓库=硬要求）：untrack +
  gitignore host-config-backup/ + 前向规则（宿主配置备份不进 git 跟踪区）
  + 暴露窗口记录（05fa697 提交、未推送 origin = 零外泄窗口）+
  pre-commit 扫描器登记为防再犯议程。拓扑信息按侦察信息对待。
- **W-2**：closed-by-D-002（结构性 provenance 分类取代命名约定排除）。

## §5 交付边界（D-004 R-c）

**R1 文档轮**（先）：ADR-0073（provenance 分类注册 + G1 修订候选 +
结转处置 + bake 值守协议）+ ADR-0070 附注 + anchors/inventory/deferred/
README 同步 + t12 账本入锚 + instrument 事件。

**R2 动作轮**（后）：F-A1 修复 / O-1 翻转+W-1 注记同提交 / O-2 untrack+
前向规则 / provenance 回标+分层遥测落地 / dry-run 执行 / 轮报告。
