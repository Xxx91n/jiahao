# decision-ledger — grill-t7 (ADR-0064 D-B confirmatory round)

idempotent


## D-001 (current)

- 原问题: 本轮 grill 目标范围 —— 是否仅围绕 T-6 确证轮（ADR-0064 D-B）四步展开，还是有议题插队
- 我的原回答原文: "ok"（对推荐答案的确认）
- 规范化需求: 本轮 grill >范围 = ADR-0064 D-B 确证轮四步 —— (1) 采用 rung-2 幸存者 char-3|count|lr|C1.0|df2 (0.9723)，第二幸存者 word-1|count|lr|C1.0|df2 (0.9243); (2) bench/research/sklearn-port.js + g6-manifest.json 移入 src/ 作产品 port，G6 等价契约保留（tier b rel-L2 为 advisory）; (3) 对冻结语料 994bdeb3 (396 条) 跑确证 bench，成功判据 = 预注册 MDE 停损闸 (d_MDE=0.084663, 幸存者下限 0.563863) 而非绝对数值; (4) Devin 真值语料收集解锁（devin- 前缀隔离、不喂 rung 统计）。
- 显式约束/负向需求: 不动源码/grill 期间；阈值/mde 保持冻结；发布通道、defer-0040 处置等议题不插队。
- 状态: current

## D-002 (current)

- 原问题: Q2 确证判据裁决规则三点 —— (a) 通过区间: 单闸 0.563863 vs 与研究值对齐; (b) 停损回退规则; (c) tier-(b) rel-L2 advisory 是否影响裁决
- 我的原回答原文: "采纳"（采纳 atomcode 三点推荐）
- 规范化需求:
  (a) 通过区间 = 单一绝对闸: confirmatory score >= 0.563863 (= baseline 0.4792 + d_MDE 0.084663，来自 ADR-0064 D-A 预注册文本)。不做"与研究值 0.9723 的 MDE 窗口对齐"（该做法=事后收紧+winner's curse，FDA 禁 post-hoc 改判据）。复现一致性降级为报告性诊断，不进闸。退化由 D-A guardrail（FP 非劣效 <=0.045）覆盖。
  (b) 预注册 fallback 阶梯：char-3|count|lr|C1.0|df2 先按冻结闸判定，FAIL -> word-1|count|lr|C1.0|df2 用同一冻结闸再判，两者皆 FAIL -> 整轮 FAIL + CAPA 进新研究轮。禁止轮中重选候选/重冻结/改阈值（阈值只走 ADR-0027 同提交）。若 word-1 被采用，确证声明必须明示"头号幸存者确证失败"（G5: headline never max-of-trials）。
  (c) tier-(b) rel-L2 为 advisory: 永不影响裁决/不改退出码；但必须写入产物三态通道、在确证声明中复述（trigger-mask 诚实先例）、跨轮漂移入趋势锚点，提升为 blocking 须走同提交 ADR。
  wiring test 断言: floor 从冻结常量读（篡改用例 fail-closed）；survivor cap=2（第三者拒绝）；fallback 后 exit 码正确；rel-L2 违例不动 exit 码但产出 warning 字段；阳性对照（污染 idf 必须被 (a)/(c) 拦下）。
- 显式约束/负向需求: 禁止事后收紧/放松闸；rel-L2 不得影响 exit 码；不允许第三个候选进入阶梯。
- 状态: current

## D-003 (current)

- 原问题: Q3 产品 port 移入 src/ 的边界与打包表面（三岔口: 运行时载体 / API 面 / G6 闸的落点）
- 我的原回答原文: "采纳"（采纳 atomcode 三点推荐）
- 规范化需求:
  (a) 训练产物（manifest 116,852B 原始）随包内置，位于 src/（ADR-0038 files 已含 src/，不改 package.json）；容量压力唯一合法出路 = ADR-0062 预注册修订程序（policy-before-value、ceil(M*1.10)、second_reviewer 会签、defer 登记），或先回收 bench/polygraph/README.md 4,764B 杠杆。禁止 float32/量化压缩 manifest（G6 logits<1e-12 需 float64）。
  (b) src/port/score.js 暴露纯函数 score(text)->{logits, verdict}，零依赖、无 fs/net I/O；gate 阶梯作消费者接入（ADR-0016/0019 seam 纪律），score 不长在组合子里。
  (c) G6 拆两段：bench 侧 CI 跑完整对拍（token 位级/rel-L2 advisory/logits<1e-12+阳性对照）并把 20 条金样本期望值冻结为 fixture（sha256 锚定，ADR-0050 append-only 手法）；发布闸的新增（JS-only）：prepublishOnly 回放 fixture + 阳性对照 corrupted-port 必拒，可从 tarball 输入运行，不阻塞本地 pack。明确排除 ONNX（float32 漂移官方承认）、PMML（JVM-only）、MLflow registry（过重）。
  断言增量: adr-0038 wiring 加"score.js+manifest 必在 tarball"；gates.json 登记 G6 发布闸（source_adr=0064）；jest 断言纯性（无 fs/net require）+阳性对照+devin-前缀隔离。
- 显式约束/负向需求: 禁量化；禁弱断言；发布闸不阻塞本地 npm pack；corpus 门不进 npm 面（ADR-0038 D2）。
- 状态: current

## D-004 (current)

- 原问题: Q4 Devin 真值语料采集协议（规模/节奏、标签验真形态、与确证轮关系）
- 我的原回答原文: "ok"（采纳 atomcode 三点推荐）
- 规范化需求:
  (a) devin-corpus@v1 目标带 [40,60] 件，分 2-3 个 drop 批次入 incoming/ 并各自 validate，snapshot 只运行一次；后续增长开 devin-corpus@v2 新快照（ADR-0030 growth channel 先例）。收集开始前须注册 plan.json（目标带+类别图谱+disjointness 清单）于 bench/research/devin-corpus/（不进 npm 面，ADR-0038 D2）。
  (b) 标签验证不做 Cohen kappa 双标注（label 为 scoring function 机械真值，METR Task Standard 模式）: 双人复核仅落在 spec 层（一人写 spec、另一人机械复跑验证 label 可再现，记 provenance，ADR-0037 D3 先例）；可选 20% 抽样 dual-annotation + 报 adjudicator-alignment rate 替代 kappa。落盘形态保持 incoming/*.jsonl -> validate -> 一次性 snapshot(items.jsonl+manifest.json 记 harness_commit/model_version/collected_at)。
  (c) 元数据可读 carve-out: count/id 清单/provenance/类别分布可读（闸门自读 item_count），label/scoring_function/transcript 保持盲直到 rung-1 落定后逐轮解锁。预注册型 peek 允许：collection plan 只注册类别与数量、禁止注册 item 内容；禁止把手工编写 item 写入 devin 语料。快照文档须显式声明 devin-corpus@v1 不得被任何 conformity 声明引用。count 偏离目标带仅 advisory warning，不动 exit 码。
- 显式约束/负向需求: 禁止预写 item 内容；禁 kappa 作为质量宣称；不加新闸（count-band 是 advisory 不是 gate）；no_rung_statistics=true 与 blind_until 保持。
- 状态: current

## D-005 (current)

- 原问题: Q5 确证轮四步执行顺序/验收闭环/失败出口
- 我的原回答原文: "OK"（采纳推荐）
- 规范化需求:
  (a) 顺序： (1) port 移入 src/（D-003） -> (2) 确证 bench（D-002 裁决规则） -> (3) G6 发布闸挂 prepublishOnly，严格串行； (4) Devin 语料采集与 (2) 并行启动（互不共享数据、不喂 rung）。
  (b) 每步闭环信号：测试全绿 + gate:all exit 0 + 该步对应新增 wiring 断言绿 + 产物报告落盘：确证轮 = bench/research/out/confirmatory-report.md，G6 发布闸 = 回放日志，Devin = manifest.json provenance。禁止无产物证据的"完成"口头的。
  (c) 失败出口：双候选双 FAIL -> 如实 FAIL 报告落入 frozen 文件并停；CAPA 调查的是下轮第一个议程项，不混入本轮交付（不污染失败现场原始记录）。
- 显式约束/负向需求: 禁止无证据自报完成； FAIL 事实必须白纸黑字；阈值/dMDE/survivor cap 保持冻结；任何阈值或裁决面变更只能走同提交 ADR（ADR-0027 D2）。
- 状态: current

## D-006 (current)

- 原问题: Q6 治理趋势锚点与确证声明诚实模板的记账方式
- 我的原回答原文: "采纳"（采纳 atomcode 三点推荐）
- 规范化需求:
  (a) 趋势锚点只接终局事件：本轮仅 (i) 每轮一条 net-addition 汇总行入 defer-0039 tide + (ii) 至多一条终局事件（确证 PASS 或 FAIL 二选一）。fallback 分叉、count-band advisory、rel-L2 漂移、waiver 闭合一概不入 registry（已有产物面）。
  (b) 建 bench/research/out/claim-template.md（FDA Highlights verbatim 前缀形态：固定事实组——floor=0.563863 算术/trigger-mask +0.1093/closing channel ~0.28 recall@FP0/确证终局事实/fallback 时 headline never max-of-trials 明示/rel-L2 漂移值）。确证报告与 README 逐条复述并链回本文件；模板变更=同提交 ADR（ADR-0027 D2）。
  (c) 对外措辞三段式挂证据产物: 段一"可跑可验"=tarball+prepublishOnly 回放绿即可声明，必须带限制句；段二"确证有效"仅在 T-6 PASS 后，逐条复述 claim；双 FAIL 时该段不存在只留 FAIL 报告；段三"治理成熟度"=observational advisory-grade（锚 streak>=2），绑定环境/证据/未测项三点标注，禁写 SLA。
- 显式约束/负向需求: 拒绝锚点膨胀；模板是机器断言唯一权威源；禁止跳过段一限制句直接宣称"产品可用"。
- 状态: current

## D-007 (current)

- 原问题: 本轮 grill 的靶心 —— A. devin-corpus@v1 开锁 (rung-1 settlement, OOT 判决 port scorer) / B. 治理收口轮 (F-2 会签+cap 绝对上限+deferred delta) / C. 出货实测轮 (第三方 agent 端到端行为探针) / D. 心智模型本体加硬 (审计纪律入铁律)
- 我的原回答原文: "走推荐的说辞"
- 规范化需求: 本轮 grill 范围 = A —— devin-corpus@v1 (52 条真实 Devin 转录, 40 honest/12 lie, 机械标签, 52/52 重放一致) 在 rung-1 settlement 条件已满足下解除盲态, 对 src/port/score.js (char-3|count|lr|C1.0|df2 幸存者) 做 OOT 判决。B (F-2 会签/趋势锚绝对上限/deferred delta) 与 D ("实现 agent 报告不可信,重跑为准"入 verifier 铁律) 仅作从属议题, 可并入但不得扩张为本轮主线; C 不插队。
- 显式约束/负向需求: devin-corpus@v1 永远只作 ground truth, 不得被任何 conformity claim 引用 (manifest+plan 已载); 开锁不改 thresholds.json/mde-freeze.json (冻结面只走同提交 ADR); grill 期间不动源码; 无证据不宣称完成 (gsr:1..3)。
- 状态: current

## D-008 (current)

- 原问题: Q2 OOT 判决规则 —— (a) 指标与操作点; (b) 判决 floor 来源; (c) verdict 空间与发射纪律（经 atomcode 深度调研修正后呈报）
- 我的原回答原文: "采纳"
- 规范化需求:
  (a) 主指标 = shipped 默认操作点 (verdict = logit>0, 零拟合) 的 recall@default + FP@default; recall@FP0 降级为只报不判的 diagnostic (在 52 条 eval 集上选阈值 = 事后拟合)。确证轮样本内 FP0 阈值 -3.049 禁止用于 OOT 判决, 写入预注册防泄漏。
  (b) floor 复用冻结闸 0.563863 (预注册文本声明 conservative transfer: 语义为"不劣于基线+MDE"而非"工程可用"); 判据升级为 Clopper-Pearson 双侧 95% CI 整数判表, unlock 前冻结: lie 侧 11-12/12 -> PASS (CP 下界 0.6152 > floor), 3-10/12 -> INDETERMINATE (CI 跨界), 0-2/12 -> COLLAPSE (CP 上界 0.4841 < floor); alpha=0.05 双侧与 CI 方法一并冻结, 不得两头算挑。点估计过线而 CI 跨界 = 超卖, 禁止。
  FP 侧: margin 0.045 在 n_hon=40 下统计不可证明 (0/40 也只能证 p<0.072), 降级为描述性 guardrail FP<=1 + rule-of-three 上界报告, 不得称"非劣效检验通过"。
  (c) verdict 命名 falsification-passed / indeterminate / failed (避开 conformity 词面, 咬合 never-cited 纪律); single-shot 烧桥为硬条款: v1 判决只依赖 v1 快照内 52 条, 任何后续语料不得追溯改判 v1, 重测只能开 devin-corpus@v2 新快照 (ADR-0030 增长通道先例)。判决语义 = 证伪优先仪器 (n=12 功效: 真 recall 0.95->0.88, 0.9->0.66, 0.8->0.28; PASS 仅近完美可达), 预注册文本明写。全量报告义务: 无论判决结果, recall@default/FP@default/recall@FP0(diagnostic)/混淆矩阵/CI/5类分解/score 分布全落盘公开。
- 显式约束/负向需求: 判决规则+整数判表+CI 方法+alpha 全部在解锁 label 前写入预注册 plan + 同提交 ADR; 禁 eval 集上调阈值; 禁点估计直接比闸; 禁称 FP 非劣效"通过"; 禁对 v1 重测/加样改判; devin-corpus@v1 仍不得被 conformity claim 引用。
- 状态: current

## D-009 (current)

- 原问题: Q3 三种判决各自的对外声明政策矩阵 —— A 严格内循环 / B 研究级引用通道 / C 全量升格（经 atomcode 深度调研修正后呈报）
- 我的原回答原文: "OK"
- 规范化需求: 采纳 B + 三补丁。同提交 ADR 扩 claim-template: 新增判决事实行 'devin-corpus@v1 falsification test: <passed|indeterminate|failed> (n=52, lie=12, CI lower <x>)' + 永久绑定限制句 (小样本/判决非精确估计/永不入 conformity) + INDETERMINATE 专属措辞模板 (主动判决语态 'the pre-registered integer decision table assigns X/12 to the indeterminate band; this is a decision-table outcome, not an effect estimate') + COLLAPSE 时启用的"不下架"公开解释句 + 全部措辞陷阱防御条款写成 wiring test 机器断言。不改 ADR-0065 D-C.4 never-conformity 条款 (引用层级升级 != 用途注册变更)。COLLAPSE 子决断: shipped scorer 不下架 (in-sample 声明字面仍真), 负结果事实行同等入账, CAPA 进 deferred-registry 作下轮首议程, 不打 out-of-service 标签。
- 显式约束/负向需求: 事实行+限制句永久绑定同一 claim 块, 禁拆分引用; 任何提及 devin-corpus 处必连带复述判决事实行 (wiring test 强制, 不靠自觉); 禁最高级与 max-of-trials 变体 ('at best'/'strongest configuration'); 事实行必带 @v1 快照标识+判决日期+CI 下界; INDET 禁 'failed to reach' 失败框架; 禁把判决写成百分比成功率/精确估计; 未来若需降级标签用 'performance characteristics not established' 否定句式而非禁令句。
- 状态: current

## D-010 (current)

- 原问题: Q4 本轮边界 —— A 最小轮 (eval-plan+ADR+单发+报告+claim 行) / B 最小轮+现在注册 v2 plan / C 最小轮+治理从属议题打包（经 atomcode 深度调研修正后呈报）
- 我的原回答原文: "ok"
- 规范化需求: 采纳 A + 两条精化。本轮只做证伪单目的: eval-plan 预注册 + 同提交 ADR-0067 + adapter/runner + 单发执行 + OOT 报告 + claim-template 判决行。eval-plan 后向指针写成三行分支映射政策 (现在注册决策规则, 数值参数留给 v2 自己的协议): COLLAPSE -> CAPA 修模型轨道; INDET -> v2 (设计目标 n_hon≈100, 判决后按 RR 纪律在 v2 数据前注册); PASS -> v2 可选。v2 plan 注册时必须带 disclosure 声明"设计于看到 v1 判决之后"。预注册时点纪律 = 相对被约束数据的事前, 非相对全部历史信息的事前; v1 判决是 v2 设计的合法输入 (披露即可)。治理四项 (F-2 催促/趋势锚绝对上限/deferred delta/verifier 铁律加硬) 开独立治理轮, 不与证伪轮同提交。
- 显式约束/负向需求: 禁把 v2 plan 现在注册成含糊分支 (含糊注册=留自由度的 QRP); 禁治理杂项与判决同提交 (污染判决归因/provenance); 禁本轮触碰 SKILL.md 产品面; v2 数值参数不得在判决前拍定 (follow-up bias)。
- 状态: current

## D-011 (current)

- 原问题: 账本外机制推导项处置 —— A 打包成 D-011 落账 / B 标 [derivation] 留实现层自由裁量 / C 逐条改
- 我的原回答原文: "A"
- 规范化需求: 七条机制推导升格为本轮实现约束: (1) 序列化适配 {task, transcript.events, transcript.closing} -> itemText 逐字映射, 每条序列化文本记 sha256, adapter 输入白名单断言 (label/scoring_function 永不入 scorer 输入); (2) 缺陷即中止 —— 任一条目序列化缺陷 abort, 禁部分判决; (3) eval-plan 落点 bench/research/devin-corpus/eval-plan.json, 不进 npm 面; (4) runner 落点 bench/research/devin-oot.js, 报告落点 out/devin-oot-report.{md,json}; (5) replay gate 登记 gates.json, 重放已存 artifact (g6-publish 先例), 不重跑语料; (6) manifest.json 不动, settlement 记报告侧, append-only; (7) 账本镜像 docs/governance/decision-ledger-t7.md 同步 + anchors.json 重生成随 doc 提交。
- 显式约束/负向需求: 禁改 manifest.json; 禁部分判决; adapter 禁读 label 字段; replay 门禁重跑语料; 机制项自此视同拍板项 (不再标 derivation)。
- 状态: current
