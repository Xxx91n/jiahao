# Decision Ledger — grill-adr0061（预注册门改修政策 + 锐评1 后续议程）

格式：ID | 原问题 | 我的原回答原文 | 规范化需求 | 显式约束/负向需求 | 状态

## D-001
- 原问题（Q1）：tarball 预注册上限（ADR-0039, 200,000B，实测 206,501B 常亮红灯）缺的究竟是"改修程序"（governance）还是"正确数字"（engineering)？选项 A 程序优先 / B 数字优先 / C 政策与首次数值同 ADR 闭环。
- 我的原回答原文：「采纳」（采纳 atomcode 调研推荐 C，并吸收其 5 条防伪结构与冲突呈报）。
- 规范化需求：采纳 C——同一 ADR 内完成预注册门 change-management 政策与首次数值调整，且：(1) ADR 内程序段必须先于数值段出现（文本顺序即时间顺序）；(2) 新上限数值由已入档证据推导：3 点趋势 205,741→206,288→206,501 + 构成分析（CONTEXT.md 95,707B 为最大单品）+ 触发器由 ADR-0039 D3 的一次性收紧轮 M 锚改为周期性趋势锚（即同时修订 D3 触发逻辑）；(3) 显式声明"本次修订非 D3 公式回溯应用"并引用 5567bd8 伪造修订撤回记录以区隔；(4) 独立签核走 ADR-0047 second_reviewer 预留槽位（criteria-change + 人工签核）；(5) 修订挂 review_at 复核日期，接入 deferred-registry 潮汐（与上轮 D-003 同构）；(6) 修订前先钉死测量协议（命令、口径 size vs unpackedSize、npm 版本），258,127 仅为预估值必须重测。
- 显式约束/负向需求：禁止选项 B（先改数字后补程序，工业界全领域反模式，与 5567bd8 同构）；禁止以"挪 CONTEXT.md 出包"解决（违反 ADR-0039 D1 且缩窄被测面）；禁止删/弱任何现有断言（上轮 D-004 计数锁定延续）；A（纯程序）仅可在自认无法维持 5 条结构时作带 deadline 的退路。
- 状态：current

## D-002
- 原问题（Q2）：judge 身份轴 rules_alias = src/SKILL.md（同文件兼插件载荷）应 A 脱离（冻结副本/语义清单）、B 声明载荷非身份轴、还是 C 保持现状。
- 我的原回答原文：「接受」（采纳 atomcode 推荐：C 为主 + 哈希面收窄）。
- 规范化需求：身份轴保持内容哈希模型（内容哈希=身份，与工业界 prompt-registry 共识及 ISO 17025 §6.4.13 软件版本身份同构）；但把哈希覆盖面从"整个 src/SKILL.md"收窄到"judge 行为相关文本面"（verifier 规则区），generator 产品区/frontmatter/license 与 judge 规则分区或分文件锚定，使产品面改动不再级联触发 judge 身份 re-pin，judge 规则文本任何改动仍触发全链复检。该变更归类为 criteria-change，走 D-001 程序纪律（同 ADR 闭环、second_reviewer 签核、review_at 入 deferred-registry 潮汐）。
- 显式约束/负向需求：禁止 B（纸面声明与 instrument-identity.js 机制矛盾，违反 ADR-0040 honest-unverifiable）；禁止"语义要点清单锚"（JudgeSense：语义等价改写翻转判定 8.5%~61.3%；lm-eval 空白符 ±76 分，语义抽象锚被证伪）；不放松任何既有检查强度；若采用冻结副本，运行时必须实际读取该副本，禁止"身份声称 X、行为由 Y 驱动"。
- 调研参考：atomcode Q2 报告（LangSmith/Braintrust/Weave/Humanloop 内容寻址共识；ISO 17025 §6.4.13/§6.5；JudgeSense arXiv:2604.23478；lm-eval 可复现性）。
- 状态：current

## D-003
- 原问题（Q3）：model_checkpoint_digest=UNRESOLVED、measured_repeatability.sample_size=0、三条签核同为 Euiop1（authorization 0 次）期间，仪表面/门禁输出应取 A 全休眠 / B 保留 conditional 限期补课 / C 拆分处理。
- 我的原回答原文：「接受」（采纳 atomcode 推荐：C 拆分处理 + 4 项修正）。
- 规范化需求：（1）挂牌粒度按声明而非整轴——仅 model_checkpoint/model_identity 子声明挂牌并附复验路径与期限（§6.4.9 until-verified；不得 open-ended）；（2）seq-3 签核处置采用追加式处置行（遵守 ADR-0050 append-only，禁止原地改写已入链记录），内容为 P-A1 合规重录或带影响评估的书面处置，须由 ≠Euiop1 的 second_reviewer 签核（ADR-0047 桥位首次启用）并限期完成；（3）sample_size=0 不建新机制，声明 conditional 认证区间结论建立在 indeterminate conformity 之上（ADR-0060 D-B 已覆盖 n=0<min_n=100）；（4）增加既往结果 look-back：对 2026-09-12 seq-3 起的 conditional 区间做影响审查并书面留痕（无影响也须记录）。
- 显式约束/负向需求：禁止 A 的"签署要求整体休眠"（GMP：修坏签名的方式不是撤签名；与 P-A1 立法意图、ADR-0047、ADR-0059 D-D 直接冲突）；禁止 B 的"声明不可解析后继续认证身份轴"（与 D-002 负向需求、ADR-0040 honest-unverifiable 冲突）；禁止原地改写 seq-3；挂牌必须自带 re-pin/复验期限；防止 asterisk-soup——只有能反转下一决策的不确定性才上屏。
- 调研参考：atomcode Q3 报告（ISO 17025 §6.4.9/§7.10、CASRAI OOT、GMP 数据完整性、SRE 缺失≠绿、Grafana No Data、moltbook、arXiv:2608.16178、FAA MEL 91.213、10 CFR 50.49）。
- 状态：current

## D-004
- 原问题（Q4）：治理增长的收敛判据选 A 硬配额 / B 比率门 / C 现有 review_at 潮汐 / D 产品优先判据。
- 我的原回答原文：「接受」（采纳 atomcode 推荐：D 为主判据 + B 作轻量仪表不设闸；A 否决；C 不充分）。
- 规范化需求：（1）收敛判据从"日历潮汐"改为"产品指标移动"——每轮必须登记"本轮移动了哪个在册产品指标"（当前唯一在册= bench 召回率 34.7%）；"回答"不等于"必须移动"，豁免轮（研究轮/治理修复轮）显式登记入账；零移动判定继承 ADR-0060 min_n 功率纪律（无统计有效样本不得计为零移动轮）；（2）连续 N 轮零移动（N 值待实现轮按 min_n 纪律定）自动触发治理减肥议程；（3）B 仅作仪表：治理行数/产品行数、wiring 占比只画趋势不设闸；（4）须将 ADR-0059 D-C 收敛机制条款 amend 为"潮汐=节奏、产品指标=判据"，并显式声明研究轮豁免在新判据下等于"登记豁免轮"而非"不回答"；（5）本轮 D-001..D-003 即为首三笔"治理修复轮（豁免类）"登记实例。
- 显式约束/负向需求：禁止 A 硬配额（与 ADR-0027 D3 常红钝化、tarball cap 常红先例、low-threat 治理成本悖论相悖）；禁止 C 单独作为收敛判据（Springer 实证：sunset 存在本身不足够）；不得因新判据放松 waiver 的预注册纪律；警惕 34.7% 单指标 Goodhart（语料变更须同步登记以免零移动假阳性）。
- 调研参考：atomcode Q4 报告（Amazon WBR 输入指标淘汰、Springer JRE 2025 iridescent sunset、ThoughtWorks fitness function 退役、Sonar new-code fudge、clawxiv 治理成本悖论）。
- 状态：current

## D-005
- 原问题（Q5）：治理工件（审计报告/decision-ledger/ERRATA）锚定在哪一层：A 入 git / B 哈希锚 / C 声明式降级 / D 混合。
- 我的原回答原文：「OK」（采纳 atomcode 推荐：D 混合 + C-1/C-2/C-3 三项处置义务）。
- 规范化需求：（1）审计报告与决策账本的权威副本入 git tracked（沿用 docs/adr 先例：git 树内、tarball files 白名单之外，不撞 ADR-0039 上限）；（2）过程证据（closure log、原始输出）留 .scratch；（3）工件摘要哈希机器生成（非手抄）、存于工件之外的独立见证位置；ADR→决策账本→摘要哈希的引用链须可 regen-and-diff 机器校验（消解 ADR-0043 spine 裸引用 C-3）；（4）改写 ADR-0059 声明行（C-1：Ledger 不得钉在 gitignore 目录）；（5）以最小形态解锁 defer-0024 外部见证（C-2）；（6）本轮落地按 D-004 登记为"治理修复轮（豁免类）"。
- 显式约束/负向需求：禁止纯 B（哈希不可重建原始记录，17a-4 audit-trail alternative 要求 re-creation）；禁止纯 C（声明式降级=手工转述漂移重演 ADR-0043 41/42 漂移案，且违反 21 CFR §11.10(e)）；禁止把 git 本身当 tamper-proof 账本（force-push/squash 可改写，锚定天然是外部的——Rekor 亦需 monitor）；禁止新审计区进入 tarball 白名单。
- 调研参考：atomcode Q5 报告（SOC 2/21 CFR Part 11/SEC 17a-4/NIST IR 8387/SLSA/in-toto/Sigstore Rekor/FAIR A2/FACA/NARA，含 git-not-a-ledger 反方 HN 辩论）。
- 状态：current

## D-006
- 原问题（Q6）：下一主轴选 A 直接开产品轮 / B 先清治理尾 / C 并行双轨。
- 我的原回答原文：「采纳」（采纳 atomcode 推荐：C′ 约束形态 + D-004 豁免计数澄清 + D-002 排序依赖）。
- 规范化需求：（1）采用 C′：第一步"测量解锁"（≤1 轮）修两个测量缺陷——main 红 CI（JIAHAO_CORPUS_DIR 能力探测误判，须恢复 ADR-0040 exit-2 三态语义）与 gate:all 缺 pack 上限断言——二者非债务即时修，走 ADR-0027 同 commit 纪律；（2）第二步 D-002 哈希面收窄落地（产品轮启动的前置条件，避免产品面改动级联 judge re-pin）；（3）第三步双轨并行：产品轮（TF-IDF 族研究轮，主 agent）与治理尾项（BL-1/BL-2、defer 潮汐 0028-0031 检查，审计 agent）通过 GitButler 分支隔离并行，人类 WIP=1；fallback 为 A；（4）产品轮按 ADR-0059 waiver + D-004 登记为研究轮。
- D-004 澄清（豁免计数语义）：豁免轮（研究轮/治理修复轮）不计入"连续 N 轮零移动"的 N；但每轮豁免须显式登记豁免类别；连续豁免轮达到 3 轮即触发与非豁免零移动等效的警报审视（平衡"豁免软化判据"与"治理修复轮误触发"两个失败模式）。
- 显式约束/负向需求：禁止纯 A（在测量缺口上宣称产品指标移动=Goodhart 争议，且 main 红 CI 属诚实性违约不可 defer）；禁止纯 B（连续治理轮坐实 governance-theater，toil 无上限膨胀）；禁止单人双轨（违反 WIP=1；并行只允许发生在 agent 层）；豁免轮不得成为无记录不登记的自由通道。
- 调研参考：atomcode Q6 报告（WSJF/CoD、Fowler 债务象限、SRE toil 预算 ≥50% 工程、trunkbaseddevelopment 红 CI 贬值与 Drake build-cop SLA、WIP=1、Cagan dual-track 前提、effectiveengineer 杠杆）。
- 状态：current
