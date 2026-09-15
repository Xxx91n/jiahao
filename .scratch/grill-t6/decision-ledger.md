# Decision Ledger — grill-t6（T-6 产品轮烤前轮）

数据源纪律：本账本是文档整理的唯一事实源。记录格式：ID / 原问题 / 用户原回答原文 / 规范化需求 / 显式约束·负向需求 / 状态。

## D-001 — T-6 产品轮成功判据 = 预注册 MDE 停损闸（A′）

- 原问题（Q1）：T-6 产品轮的"成功"预注册成什么粒度？A=归因报告即完成（零移动如实记录且无下限）；B=预注册绝对目标值（如 recall>=50%）不达即失败；C=先单独一轮定义"可用"。
- 用户原回答原文："OK"（对呈报的 A′ 推荐拍板采纳，2026-09-13）。
- 规范化需求：
  1. T-6 预注册交付物 =《特征族归因报告》：对 TF-IDF 族各候选特征子集，在当前 bench corpus 上报告 task-disjoint recall@FP=0 及相对基线 34.7% 的绝对增量，同报 P/R 曲线与 per-class 分解。
  2. 预注册 MDE 闸（示例 >=5 绝对百分点）：具体数值须由 n=26 corpus 先验变异在执行轮前本地计算并冻结；达闸=过闸；非零未达=零移动如实记录；完全零移动=停损信号，第二次未达触发 CAPA 切换下一特征族。
  3. Guardrail 非劣：human-review budget / flag-rate 不得较基线劣化超过预注册 margin（Spotify 语义）。
  4. 全量报告纪律：探索空间在报告前列出，阴性结果必须报告（Vaccaro 规则）。
  5. Goodhart 防护四件套：task-disjoint 口径；判定面维持 D-002 的 SKILL.md verifier-rules 文本哈希，bench corpus 任何修改=预注册修订须字段级记录；报告含对抗性审计节；n=26<min_n(100) 期间维持 conditional certification，bench 数字仅作 research benchmark 不得用于部署主张（MLCommons 语义）。
  6. "可用"定义写入归因报告度量协议一节：可用 = 在真实仓库规模语料上 P/R 曲线存在可调阈值工作点且满足部署闸成本（FP <= 团队 review 预算，参考 Sadowski 10–15% 弃用阈值），作为 ADR-0060 conditional->full certification 未来判定规则预注册，不单独成轮（C 并入，不插队）。
- 显式约束/负向需求：
  - 禁止 B 形：不设绝对 recall 目标值（n=26 + 可改判定面 = 结构性 bench-hack 激励；且与 ADR-0059 D-C "研究轮无指标承诺" 正面冲突无修订路径）。
  - 禁止 C 形独立轮：不与 D-006 C′ 排序冲突、不稀释 D-004 收敛判据。
  - 显式修订 ADR-0059 D-C 一般性表述：研究轮自 T-6 起带 MDE 停损闸承诺（非绝对目标值）。
  - 豁免语义继承 D-004：豁免轮显式登记、不计入零移动 N、连续 3 次豁免告警。
- 状态：revised（2026-09-13 同轮修订：原记录第 5 条把 n=26/min_n=100 误措为本 bench 的产品检定 corpus；实为 judge 一致性语料。bench 本体=外部冻结 polygraph-bench @994bdeb，396 项（176 lie/220 honest），统计功效足以支撑绝对目标，"n=26 撑不起绝对值"论证不适用于 bench；D-001 其他条款不变，修订主体见 D-003。）
- 外部依据（atomcode 2026-09-13，12 sections 已索引 source: atomcode-batch）：FDA NI margin（M1/M2）；Spotify 2024 四类指标决策引擎；Vaccaro arXiv:2606.11217；MLCommons 2026-08 基准信任七问；Advani arXiv:2606.09863（TF-IDF task-disjoint AUROC 0.83/0.95 vs judge <=0.65）；Sadowski et al. CACM 2018（FP 10–15% 弃用带）。

## D-002 — T-6 研究轮与 thresholds.json 确证闸分轮处置（A）

- 原问题（Q2）：T-6 归因报告与既成 thresholds.json（ADR-0015/0018/0019 预注册的绝对 floor/target：recall>0.46 target 0.635、FP<=0.045、score>0.385 target 0.8；check-bench-thresholds.js 机器强制）的关系？A=分轮（rought/confirmatory 分离）；B=同轮一条龙；C=顺手把 B 形遗留 target 改为 MDE 形态。
- 用户原回答原文："OK"（未点名选项；按当轮呈报默认最强选项 A 记述，已明确邀请异议；2026-09-13）。注：若后续用户拍"非 A"则本条立即记 revised，不静默改向。
- 规范化需求：
  1. T-6 产品轮不改 thresholds.json；floor/target（ADR-0015/0018/0019 预注册）继续由 check-bench-thresholds.js 机器守护、以原确认级语义存在。
  2. T-6 交付物仅《特征族归因报告》（D-001 定义），含 task-disjoint 口径 + 相对 detector v2 core recall 47.92%@FP 4.29%（README Run 2 实测，score 0.265 低于 floor 0.385 的事实须如实记录为本轮起点）的增量归因。
  3. 若归因报告过 D-001 MDE 闸 → 另起一轮（走 ADR 程序）改 thresholds.json 并随 detector v3 重跑 bench:gate；不在 T-6 同批 commit 内变更确证面。
  4. 口径钉死：T-6 报告的主指标 = core split recall，不允许与 overall/v1 口径（34.7%）混写；v1 34.7% 仅作历史参照条目。
- 显式约束/负向需求：不得在 T-6 内改 thresholds.json；不得把 score<floor 的现存红灯包装为"预注册目标未达"以外的说法；不得用 v1 34.7% 与 v2 47.92% 互替作"提升"论据。
- 状态：current。

## D-003 — D-001 第 5 条 corpus 前提纠正（修订落点）

- 原问题：呈报的 corpus 前提错误（n=26 vs 396）如何入账。
- 用户原回答原文：同上"OK"（在含此修订呈报的消息上拍板）。
- 规范化需求：D-001 Goodhart 防护第 4 条的"n=26<min_n(100)"表述修正为两类资产分开陈述——(a) 产品 bench = 外部冻结 396 项（sha256 指纹钉死，ADR-0015/0027），统计功效足支撑绝对目标，Goodhart 断点不在样本量，而在口径替换与 bench 修订条款（须走 ADR + 字段级记录）；(b) judge 一致性语料 n=26 < min_n=100（ADR-0060 采样功效闸），该资产维持 conditional certification、不得 full certify。D-001 其余条款（MDE 停损闸、guardrail 非劣、全量报告、task-disjoint、ADR-0059 D-C 修订）不变。
- 状态：current。

## D-004 — T-6 探索空间 = C 两阶段收缩（ASHA 人工化）

- 原问题（Q3）：T-6 预注册的探索空间全集如何界定？A=窄正交核 12–16 子集；B=宽网格 30–60 子集；C=两阶段收缩（A 为第 1 rung，MDE 闸过者入精修第 2 rung）。
- 用户原回答原文："OK"（对呈报的 C > A > B 推荐拍板，2026-09-13）。
- 规范化需求：
  1. 第 1 rung 空间 = A 网格：粒度 {word-1/2gram, char-3/4gram} × 特征 {count, tfidf(sublinear)} × 模型 {LR-L2 class-balanced, NB}，按 Advani 配方 min_df=2 / max 30k tokens 为默认；预计 8–16 子集 × 5 seeds，task-disjoint = GroupShuffleSplit over task_id（与 Advani "cleanest generalization evaluation" 同构）。
  2. 精修第 2 rung 五条闸（写进 T-6 预注册 ADR 逐字条款）：G1 幸存者判据 = mean recall >= 0.4792 + Δ_MDE 且 FP <= 0.045，Δ_MDE = max(0.03, 1.64 × SE_5seed)（公式即日起预注册；数值执行轮冻结）；G2 幸存者封顶 2（score=recall-5·FP 取下者，其余入阴性档案）；G3 幸存者为 0 → 阴性闭合为合法结果、不动 thresholds.json；G4 第 2 轮空间仅限幸存者 × {LR C∈{0.25,1,4}; NB α∈{0.1,0.5,1}} × {min_df∈{2,5}} <= 12 配置，禁引入第 1 轮未出现的新特征族；G5(结算) 动 thresholds.json 须走独立 ADR + confirmatory 一次结算，全部 trial 记录 append-only，headline 禁止 max-of-trials。
  3. 额外 Goodhart 义务二条（源自 Advani Appendix 阴性对照模板）：(a) 打标签 regex 触发词屏蔽重测（差 <0.001 属健康）；(b) 非 closing-message 通道单训对照。
  4. 语料分列：judge 一致性语料 n=26 不进入 T-6 任何 rung 的任何统计量（D-003 纪律延续）。
  5. **waiver 处置（真分叉闭合）**：T-6 不援引 ADR-0059 D-C "no metric commitment" waiver——D-001 修订已使研究轮带 MDE 承诺；T-6 因此属于研究轮但非豁免轮，豁免语义仅指 D-004（grill-adr0061 ledger）"豁免轮不计入零移动 N"的登记条目，不指"无指标承诺"。该分叉由本条显式关闭。
- 显式约束/负向需求：禁 B 宽网格（评审轮稀缺下不可经济、选择性报告面 60 次假设检验取 max）；禁在第 2 rung 引入 rung-1 未覆盖的规则叠加/通道分解新族（须另开 ADR）；headline 禁 max-of-trials。
- 状态：current。
- 外部依据（atomcode 第 2 批，source: atomcode-batch 2026-09-13）：ASHA/Hyperband（MLSys 2020 + ICAIDES 2025 对比研究）；Google Rules of ML Rule #16/#41（Phase II/III 分期）；ChaLearn/AMLB blind-test/Tweakathon 分段；Advani arXiv:2606.09863 全文（word-bigram TF-IDF + L2-LR 0.849 task-disjoint AUROC > DeBERTa 0.827；规则仅作标签器）。

## D-005 — T-6 实验基质 = C+加固（sklearn 归因 + 三级金样本闸 G6 + Devin 真值语料）

- 原问题（Q4）：TF-IDF 探索在哪个基质、成功后如何回产品？A=sklearn→JS 移植（m2cgen 工具链）；B=纯 JS 实验即产品；C=sklearn 归因+预注册权重 dump→JS 等价性金样本闸；附加 Devin.exe（本机无限 token agent）角色定位。
- 用户原回答原文："接受"（对 C ≻ B ≻ A + 加固建议 + Devin 限定角色呈报拍板，2026-09-14）。
- 规范化需求：
  1. T-6 rung 1 在 Python sklearn 复刻 Advani 配方（TfidfVectorizer + LR/NB），sklearn 诊断工具链完整保留；矢量化层（tokenizer/TfidfVectorizer 语义）终态均为手写 JS（A/B/C 皆是，skl2onnx 官方证明此层不可自动转译：tokenizer 断层可致预测翻转）。
  2. LR 层可由 m2cgen export_to_javascript 生成或按权重 dump 手写点积（两者等价，优先 m2cgen 防抄写错）；sklearn-porter 禁用（钉死 sklearn<=0.22 已停更）；ONNX 通道禁用（onnxruntime-web 数值漂移 + char_wb 未实现）。
  3. 加固一（三级等价闸，fail-closed）：token 多重集位级相等 → tfidf 向量 rel-L2 <1e-9（诊断信号） → logits 差 <1e-12（放行条件，20 frozen items）。
  4. 加固二（闸门自检阳性对照）：一份故意污染的 JS 移植（如翻转一个 idf 值）必须被闸拒绝；阳性对照通过 = 闸门失效 = fail-closed。
  5. 新增 G6 结算闸：金样本闸插入 rung 1 与 JS 移植之间；其阈值作为"新阈值类"在 JS 移植动土 **之前** 预注册写入 thresholds.json（D-002 纪律延伸，不得移植后补写）；两级修复失败 → 回退 B（沿用同一金样本纪律）。
  6. Devin 角色 = METR Task Standard 式真值语料收集器（任务+setup+确定性 scoring function；标签机械可复现）；次角色 = 外部验证面 + 部署后漂移 sanity roll-out；禁止角色 = 训练/调参语料、judge 替身。
  7. Devin corpus 为第四类资产（D-003 分列扩展）：冻结快照 devin-corpus@v1（harness commit+模型版本+日期），rung 1 全程盲（只在 rung 1 结算后外部验证解锁）；Devin 任务与 polygraph 396 项、gold 20 项显式不相交清单入账。
- 显式约束/负向需求：禁 ONNX.js 通道；禁对 Devin corpus 偷看调参；禁金样本阈值后补；judge corpus n=26 与 Devin corpus 不得合并计数（D-003）。
- 状态：current。
- 外部依据（atomcode 第 3 批，2026-09-14）：TFX InfraValidator blessing；skl2onnx 官方 plot_tfidfvectorizer 反例；m2cgen FAQ；sklearn-porter README；onnxruntime-web #21275/#4883；METR Task Standard；Cognition SWE-bench 技术报告（故障模式学）。

## D-006 — 治理体量闸 = C 趋势锚点 + A 事件补强 + 结构自证闸（ADR-0064 条款源）

- 原问题（Q5）：锐评处方 5（冻结 ADR 数量、63+K 写进 gates.json 机器守）是否采纳？A=事件触发替代 review_at；B=机器硬上限无豁免；C=趋势锚点不硬闸。
- 用户原回答原文："采纳"（2026-09-14，对 C 为主 + A 补强 + 拒绝 B + 结构自证闸呈报的拍板）。
- 规范化需求：
  1. 条款 1（confirmatory 结构闸 governance-inventory，新 gates.json entry order ~198）：每家 entry.source_adr 存在且 Status ∈ {Accepted, Amended-by}；同 command 不重注册（冗余沉鉴）；supersede/updated-by 双向闭合。守的是账本自证性，与 ADR 数量无关。
  2. 条款 2（observational 趋势锚点）：净增量 = 文档轮新增 −（superseded + 闭合）ADR；预注册锚点 = 63 (K=2)；连续 2 文档轮净增 >0 → 单行 advisory "::warning::"（ADR-0027 D3 同构），永不 block；修订锚点 = 同 commit ADR。
  3. 条款 3（A 事件触发）："零产品 diff（src/、bench/ 未变）却开新 ADR"→ 写 deferred registry 强制处置，零新闸。
  4. 豁免 = 锚点修订、同 commit ADR，与 D-001 tariff 修订同构；不设 waiver 文件。
  5. 条款 2 轮定义写死为 **文档轮**（D-002 研究/确证轮产 ADR 不计入增长窗口）；净增量公式把闭合/superseded 记为负项。
  6. 对锐评处方 5 显式部分采纳（结构闭合+事件化）、显式拒绝（数量硬上限）——写进闭库 ADR，不是打折。
- 显式约束/负向需求：禁硬上限；禁 waiver 文件；趋势锚点永不 block；先决条件 = 清掉 tarball 闸常红（ADR-0038 206,501 cap）才允许叠加新治理信号。
- 状态：current。
- 外部依据（atomcode 第 4 批，2026-09-14）：MADR（9,999 软界）、IETF RFC 生命周期、Fowler bliki、SRE Workbook《Alerting on SLOs》静态阈值不可行、Antimetal 2026-08 报警疲劳、TWFitness function、Zalando deprecation/sunet。
