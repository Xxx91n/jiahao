# spec — grill-t10 pairer product-seam lane (judge-seam FP gate decision)

数据源：.scratch/grill-t10/decision-ledger.md（唯一权威）。本文件只复述账本，不补对话回忆。

## §1 Scope（D-001）

- 本轮靶心：settlement.branch_policy 注册的"配对器→产品在线路径闸控决策"（judge-seam FP gate）。
- 并行小议程：F-A1（v3 md 细节段重渲）/F-A3（manifest durable-ref 前向规则）/F-A4（措辞 errata）。F-A2 备案。
- 范围外：deferred backlog（统一治理积压）、b4 npm（ADR-0011 不复议）——cadence 管，gate:all 绿证明无到期。

## §2 Lane locus（D-002）

- 配对器走 **hook 侧定罪通道**：Stop/SubagentStop 路径读 transcript_path→适配 {task,events,closing}→pairItem→flag 写 suspicious detector 记录进证据链→走 severity×profile 矩阵（enforce 稳态）。agent 不可跳过。
- 条款① flag 记录带 source:pairer-instrument 独立来源标记，append-only，与 agent 自写记录分命名空间。
- 条款② undetermined=不旗不阻、描述性上报（ABSTAIN 只取"不作放行依据"，绝不取"阻断"）。
- 条款③ 人工 override 终审走 jiahao resolve（已有通道，例外留痕）。
- 条款④ v3 语料转配对器持续回归门。
- 淘汰/禁止：agent 侧自跑自记（fail-open）；强占 judge seam（救援/定罪契约互斥）；eval-only 终态（shadow 是过渡不是终态）。
- 不动：judge seam 三契约（honest_only/suspicious-only/概率形态）；L1-L3 detector 不顺势上线（未被判决）。

## §3 Promotion gate（D-003 + D-007 数值）

- v3 判决=进 shadow 的资格证（necessary gate），非执法资格。
- shadow 期 flag 写遥测记录（source 标记+shadow 位），**不进 severity 矩阵**。
- 预注册晋升门（部署前冻结，全部满足才翻 enforce）：
  - ≥200 真实 Stop 事件且跨 ≥1 完整使用周期；
  - 全部 flag 项 owner 复核 FP=0（仲裁规则预写：复核分歧按 FP 计——保守向）；
  - undetermined 率 ≤90% 且无异常上升趋势（防死通道）；
  - 通道 p99 延迟 ≤1s（Stop hook 预算 10s 内）。
- shadow 期确认 FP→回隔离（CAPA/仪器隔离纪律）；enforce 后保留 kill switch（通道级 flag 文件，回滚=一行 diff）。
- shadow/enforce 产出 FP 与边界案例回填真实语料回归集；逐族晋升=仲裁规则允许的细化路径。

## §4 Product shape（D-004）

- (a1) capa-pairer.js 单源移到 src/：内容 hash 不变→pin 身份不变；bench import 路径+eval-plan.instrument.pairer.path 同 commit 修正。禁双拷贝。
- (b) transcript→{task,events,closing} 适配器=通道组件非判决仪器：合同测试+shadow 观测，不进判决 pin；自带构造转录→断言提取验证面。
- (c) 通道声明 requires:transcript-file（ADR-0040 三态）：host 无 transcript_path→absent/UNVERIFIABLE，绝不记 coverage:partial（partial 对 verifier=ESCALATE=无转录 host 每轮升级不可用）。逐 host 可达性进 Host Contract 核查。
- (d) flag→suspicious:true+severity high；记录扩 source:pairer-instrument+pairer:{family,state,claim,evidence,reason}+shadow 位（schema 演进纪律注册）；undetermined 仅遥测字段；consistent 不落可疑记录——定罪仪器不兼职救援。

## §5 Claims（D-005）

- 描述性存在声明三句式：①存在与状态句（shadow/enforce 修饰语强制）②覆盖边界句（声称值+证据值在场可解析且不等才旗；不可解析/证据缺席/语义矛盾不在覆盖）③不背书句（语料判决描述语料表现，不构成真实流量召回声明；晋升门只验证 FP/覆盖率/延迟）。
- 三句进 per-mention binding registry（adr-0067-wiring F-4 机制钉住）。
- 晋升翻转只改第①句状态值，②③不动；测量复现邀请条款覆盖新通道。
- v3 fact line 原样不动；通道 claims 构念边界=mechanically-proven contradiction on parseable claims。

## §6 Carry-over dispositions（D-006）

- F-A1 corrigendum 专用 commit：从 report.json 重渲 md 细节段（confusion/FP/侧集/会话/批次/诚实比/分类分解），message 声明更正性质；冻结件不动、绝不重跑。
- F-A4 errata 搭车：worker v2 自指注释修 + Sessions:20 主集口径括注。
- F-A3 前向规则：未来冻结 manifest 钉 durable ref（branch/tag 或 SHA+tag 双钉），workspace sha 仅备注；v3 manifest 不回写。
- F-A2 documented decision 行："备案，无需行动"。

## §7 Delivery boundary（D-007）

- R1 文档轮：ADR-0070+CONTEXT 术语+本 spec+wiring seeds（doc-before-impl）。
- R2 建造轮：pairer 移动+适配器+hook 接线（shadow）+schema 演进+能力声明+corrigendum+门绿。
- 轮止点：shadow 装船+晋升门冻结在册。晋升翻转=bake window 后独立注册动作，不在本轮。
