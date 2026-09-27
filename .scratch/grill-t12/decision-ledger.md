# Decision Ledger - grill-t12

格式: ID（D-001 起）/ 原问题 / 我的原回答原文 / 规范化需求 / 显式约束或负向需求 / 状态（current|revised|stale|deferred）

状态: 尚未开始 - 等待第一个被确认的答案。

## D-001

- 原问题: 本轮轮界——a) 仅闭环核验+呈报开放项 b) 核验+审计结转项处置（F-A1/O-1/W-1/W-2/O-2） c) b + bake 值守（undetermined-100% 处置、flagged dry-run、G1 计数节律/语料多样性）
- 我的原回答原文: "c"
- 规范化需求: 本轮烤三个议程面——(1) 锐评五处方闭环的辩证核验（是否所有完成）；(2) 审计结转项处置决策：F-A1 修复、O-1 measured-present 翻转、W-1 底物一致性说明、W-2 合成记录结构性标记、O-2 宿主备份处置；(3) bake 值守议程：真实流量 100% undetermined 现象的处置、flagged 判定标准 dry-run、G1 计数检查点节律与语料多样性标准。
- 显式约束/负向需求: grill 期间不改源码；不开 promotion 评估（冻结门不动）；不合成 bake 流量；单操作员流量不支撑群体 FP 宣称；VCS 只用 but、不推送；结转项若涉冻结面（如 G4）须走 ADR 修订纪律，不得因已观测数据而事后挪门槛。
- 状态: current

## D-002

- 原问题: bake 语料 provenance 处置——a) 分层语料 b) 只有机计数 c) 现状照计 d) rig 算狗食；atomcode 调研后改为 (a) 修订版
- 我的原回答原文: "采纳"（针对 (a) 修订版）
- 规范化需求: (1) 注册 provenance 分类——organic / automated_harness / synthetic_selfcheck / unclassified，分析侧经 session→project-dir（~/.claude/projects/<slug>/<sid>.jsonl）映射机验判定，转录不可得者保守落 unclassified；现有 31 条记录按规则回标，一条不删；(2) G1 门槛修订候选："≥200 organic Stop events carrying lane records"——走 ADR-0070 修订纪律、前向生效；(3) 装置流量保留用途=管道健康/回归比对，不进 FP/校准分母；(4) 语料充分性多样性限定（≥N 独立会话 × ≥M 任务意图形态）在晋升评审前预注册数值；(5) 窗口不重开，organic 腿当前=0 如实记录。
- 显式约束/负向需求: 不得因已观测数据把门槛往目标方向挪（本修订使计数变严=干净方向）；采集侧 provenance 字段属后续仪器议程非本轮；分类必须结构性机验、非命名约定（吸收审计 W-2）；禁止删除任何链上记录（GA4 式数据灭失教训）；measured-present 翻转判定不受本决策影响（装置记录仍证明 lane 在真实宿主事件上实测活着）。
- 状态: current

## D-003

- 原问题: 审计结转项处置包——F-A1 / O-1 / W-1 / O-2 逐项拍板；atomcode 调研后 O-1 改三选（b 等 organic / c 带证据层括号翻 / a 裸翻），O-2 升级为公开仓库硬要求
- 我的原回答原文: "采纳"（针对更新后推荐包：F-A1=a、O-1=c、W-1=a、O-2=a强化版）
- 规范化需求: (1) F-A1：执行——gitignore 加 /*.tgz 先于移除、untrack jiahao-0.0.1.tgz、重跑清单（gate:all / instrument --check / git ls-files|grep tgz=空）；登记措辞必须含"已 untrack，历史 blob 保留"，禁写"已清除"；不抹历史。(2) O-1：执行翻转（host-contracts claude-code transcript_file present→measured-present + 三 claim home 句1括号，同提交），括号强制载明证据层——"live-observed: independent-audit reproduction + automated-harness events; organic pending"。(3) W-1：翻转同提交加底物注记——含差异文件清单（instrument-state.json 数据 + check-host-contracts.js 校验器）与行为等价论证（hook 路径无差）。(4) O-2：untrack + gitignore host-config-backup/ + 前向规则（宿主配置备份不进 git 跟踪区）+ 暴露窗口记录（05fa697 提交、未推送 origin = 零外泄窗口）+ pre-commit 扫描器（gitleaks 类）登记为防再犯议程。(5) W-2 记为 closed-by-D-002（结构性 provenance 分类取代命名约定排除），不单独立项。
- 显式约束/负向需求: O-2 在公开仓库语境下 untrack 是硬要求非可选（保留为记录不成立）；O-1 证据层括号不可省（防"方便时不一致"指控：计数时排除装置事件、升级时采纳装置事件）；F-A1 不做 history rewrite；拓扑信息按侦察信息对待（无活密钥不等于无披露义务）；翻转断言仅限"transcript 交付能力实测"，不得暗示有机使用。
- 状态: current

## D-004

- 原问题: 收尾包——R-a flagged dry-run / R-b G1 检查点节律 / R-c 交付边界 / R-d "是否所有完成"裁定口径
- 我的原回答原文: "a"（全 a）
- 规范化需求: (1) R-a：照跑 dry-run——provenance 分类→排除规则→枚举总群→预设标准→判定记录全流程，"排除后为空"作为被记录的输出，在无关紧要时先演习判定机器；(2) R-b：注册轻量节律——每个 grill 轮收尾跑 provenance 分层遥测汇总（pairer-lane-telemetry 扩展分段输出），晋升评审前必跑；(3) R-c：两段制——R1 文档轮（ADR-0073：provenance 分类注册+G1 修订候选+结转处置+bake 值守协议；ADR-0070 附注；CONTEXT 新术语；anchors/inventory/deferred/README 同步）先于 R2 动作轮（F-A1 修复 / O-1 翻转+W-1 注记同提交 / O-2 untrack+前向规则 / provenance 回标+分层遥测 / dry-run / 轮报告）；(4) R-d：两层裁定口径进 spec 首节——"五处方记录级闭环（审计核验+抽查复核）；完成≠终结：闭环产出新开放项本轮已处置/登记，锐评两结构主题（签名委托=权力、设计污染=时间）为常驻张力非可完成项，bake organic 腿重置为 0"。
- 显式约束/负向需求: 禁 b/c 平铺口径（"全部完成"=自我安慰失实、"未完成"=否认已落地事实）；dry-run 不得为满足产出而合成分群；检查点节律挂既有轮次不另造流程；R1 必须先于 R2（doc-before-impl）；deferred 到期审查/npm/promotion 维持范围外。
- 状态: current
