# grill-t38 decision ledger

Append-only. Statuses: current | revised | stale | deferred.
Revisions keep the original record (marked revised) and add a new D-xxx.

<!-- records -->

## D-002 — 锚的消费契约（Q2 选项 a 采纳：双断言分离+a1=①+a2 嵌腿内共享分类器+a3 只铺 status-inventory)

- **原问题**: 断言锚定轮下探一题——status-inventory 断言腿在锚定语义下的消费契约（判什么、工件选谁、新鲜度义务居所、覆盖面）。主选项 a) 双断言分离（对账域=块rows==锚树complete工件；新鲜度=(anchor,carrier.parent]无claim面突变+锚须载体parent祖先；prefer-HEAD废除）/ b) 双层强形（+worktree重跑）/ c) 温和形（prefer-HEAD+漂移降黄）/ d) 其他；子问 a1 同锚多工件（①自身run/②最近complete/③任一存在）、a2 新鲜度居所（嵌腿内/独立wave-close腿/仪式句）、a3 覆盖面（只status-inventory/哨兵族全铺）。atomcode 呈报 a 全案后选项 a=采纳 / b=a2改独立腿 / c=调整子问 / d=退回。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案（含三子问裁决与三处 Declaration 精化句）。
- **规范化需求**:
  1. 双断言分离（主选项 a）：成员对账域=「块 rows==锚树 complete 工件成员集」（转录忠实性=真伪域）；新鲜度独立断言=「(anchor,carrier.parent] 区间内无 claim-surface 突变」+「anchor 须为载体 parent 祖先」（日期域=L-1 机械面）。stale 是新鲜度属性不是真伪属性（K8s observedGeneration 同构：out-of-date≠false）。
  2. a1=①块自身 run 工件：对账对象=block.run_id 三元组唯一指认的发射工件；②锚树最近 complete 工件降级为**漂移观测面**（成员差=flaky/环境差非转录错，判红=冤案；同 tree_sha 多工件互 diff=flaky 探测器、披露面非判定面）；③任一存在即过=presence-check 否决（t37-D-005.4 security.txt 反例）。
  3. a2=嵌断言腿内+共享分类器：新鲜度断言为腿内第二断言（与成员对账并列、独立判定、独立报错行+独立 reason）；lastClaimMutation 分类器从 check-post-land.js 提升为 scripts/shared/ 共享实现、两调用方（ADR-0092 D-M1：两份扫描器是一份太少——t34 escape byte 接缝先例）。否独立 wave-close 腿（E-25 双通道病）、否仪式句（security.txt 反例+棘轮义务须为机械断言）。与 last-leg 相容：新鲜度断言读 git log+角色注册表、不读 mid-run 工件、不属 observer 排除域。
  4. a3=v1 只铺 status-inventory：audit-coverage/post-land-verify 锚定语义收编=下一轮独立枚举面工作，挂 deferred-registry 行（t37-D-006.5 形）；统一锚字段形已立法故铺开零 schema 变更；依据=「一轮不建两个枚举面」先例（t37-D-001 M-D）。
  5. prefer-HEAD 废除：HEAD 树工件退出断言域、退居漂移观测面——存在且与块成员集 diff 非空时 ::warning 黄级披露非红（c 的披露机制收编为观测面，防 stale-but-honest 堆积 F-A1）。resolvable-commit 宽容保留并升格为 L-1 边界载体。UNVERIFIABLE(exit 2) 保留：锚树无 complete 工件=underivable（C-1 诚实通道）。
  6. 载体未定降级：pre-commit 跑腿时 carrier.parent 不可判定→区间上界退化「运行时 HEAD」+输出披露「carrier 未定，区间=(anchor,HEAD@run]」；E-19 仪式保证 declare 前 settled 树复核。
  7. restack 接缝：restack 重写 sha→锚 sha 失解析=黄级披露非红（否则 restack 即冤红，重演 D-PRE 修复前病）——ADR 明写。
  8. 新鲜度红不入 C-1 闭集（verdict≠行级 reason；t37-D-003 双字段分离精神）——此为立法建议、由 owner 在 ADR-0096 节内显式裁。两断言独立 reason 词表。
  9. 三处 Declaration 精化句随 ADR-0096 入文：①a1=①是 D-005(revised)「锚树重推导」的精化（锚树工件=重推导已捕获证据；worktree 重跑降为工件缺失时的手动强验证、非腿内常态）；②新鲜度红词表归属划界；③restack 锚失解析黄级处理。
  10. 测试面（实现草图所列）：锚=HEAD / 锚=祖先+区间干净 / 区间内有突变(红) / restack 后锚失解析(黄) / 同锚双工件(①选中②仅披露) / pre-commit 载体未定(披露降级)。
- **显式约束/负向需求**:
  - 失效模式对策随裁决立法：F-A1 旧块堆积→棘轮+漂移观测面；F-A2 载体未定→降级+披露；F-A3 时戳可伪造→forensic 非 preventive 原样继承（D-PRE 披露句，no-TSA、armed trigger 预注册）；F-A4 选择漂移→a1=①立法进 ADR；F-A5 退出码混淆→独立报错行独立 reason。
  - 否决项：b 双层强形的 worktree 重跑入腿内常态路径（成本未实测超 CI 预算风险；降级为手动强验证预案）；c 温和形（黄级降权放走真漂移）；③任一存在即过。
  - 精化而非改向声明：①是「锚树重推导」的已捕获形非废止——工件在=重推导已发生；工件缺=UNVERIFIABLE 而非自动降级为工件外推导。
  - 信息缺口如实登记：锚树重推导成本仍移出常态路径未关闭（worktree 强验证触发条件与预算实现期测量）；PCAOB AS 3110 主文 403 沿用标位；restack 下引用稳定性待实测；merge queue 事故复盘未获第二信源复核。
  - 调研呈报与账本零 revised：27 行冲突核查全部通过（3 处 ⚠️=Declaration 精化句非矛盾）。
- **状态**: current
- **调研凭据**: atomcode Q2 run 2026-10-05 session fd33b25c（单次跑通；searches 11=AnySearch9+Tavily1+Exa1，full reads 8=Codecov/kpt/SLSA provenance/SLSA VSA/Prometheus staleness/GitHub required-checks/ASA 560/K8s API 参考项）；一手核心=K8s observedGeneration「out of date 非 false」消费语义、SLSA provenance transcription 核验、Codecov failed-CI 三假设、ASA 560 dual-dating（二手层）、Prometheus staleness 正交属性；信息缺口=五项已入负向需求。


## D-001 — t38 轮对象与范围构成（Q1 选项 a 采纳：atomcode a′ 精化形）

- **原问题**: t38 轮对象与范围构成——轮对象候选命题「断言锚定(assertion-anchoring)：每个对树态的 committed claim 必须声明其评测锚，核验机制按所声明的锚而非按当下世界判定」是否采纳；范围选项 a) 整轮烤 P-1 报告自指+P-2 测试评测锚+N-3 emit 输出契约+P-3 结转分诊+N-4 落地通道裁决 / b) 只烤 P-1 / c) P-1+P-2 合并、其余登记不烤 / d) 其他。atomcode 调研呈报 a′ 精化形（含 t37-D-005 revised 程序含义+E-19 注记）后选项 a=采纳 a′ 全案 / b=采纳范围但拒 D-005 修订（=P-1 无落地路径） / c=调整 / d=退回。
- **我的原回答原文**: 「采纳」——即呈报选项 a：a′ 全案，含修订程序执行。
- **规范化需求**:
  1. 轮对象=断言锚定：P-1 是 claim 面缺锚（报告块 run_id.tree_sha≠载体 commit 树而消费腿按当下判）、P-2 是测试面缺锚（pin ancestry 评测绑瞬态 HEAD），同缺陷形两投影；本体论解=双时制：valid-time=所测树（锚）、transaction-time=载体 commit，载体移树不构成说谎——只有声称锚与实际测量锚不符才是缺陷。
  2. 范围构成 a′：P-1+P-2 合并为「评测锚」主命题（ADR 主体）；N-3 emit 输出契约并入（同 force-field=消费腿按什么契约解析发射的 claim 块，修复=单 commit+emit→parse 回环 pinning test）；P-3 逐项三出口分诊（登记/deferred/owner 移交——本就是 wave-closeout 义务，纳入叙事不增量）；N-4 只立义务不裁决。
  3. 统一锚字段形（additive，v1.1）：anchor={tree_sha, ref_context, mode}；ref_context∈{lane-tip, merge-base, origin/main, workspace-merge}；mode∈{tree-internal read, working-tree read}——继承 ADR-0093 D-6「哪棵树与哪种读法是两个字段」纪律；schema 演进只增不改+版本 bump。
  4. 两类锚并存划界句（ADR 必须显式写）：tip 锚（map coverage、pairing scan——authority 语义必须对 tip 求值）vs 快照锚（status-inventory 块、run 证据——historical claim 语义）；防「全部锚化=全部可以不追 tip」误读。
  5. t37-D-005 修订承接（已执行账本标记）：断言腿比较域由「当次重推导」改为「所声明锚树重推导」；run_id.tree_sha 字段已在、消费语义改；修订经 Declaration 通道显式（t33-D-002(vi) 先例：收窄经 Declaration 非账本改写）；锚树重推导用 throwaway worktree（check-post-land.js materialize 机制复用——实现期验证）。
  6. AGENTS.md E-19 条款注记级修订（docs lane 落地）：tip 锚面（map/manifest）settled-tree --check 维持不变；快照锚面语义改写为「确认最新报告锚断言成立」而非「再生块至当下」。
  7. 新鲜度棘轮显式重落（最重失效模式对策）：旧「块==当下重推导」棘轮消失后，wave-close 义务换形为 D-PRE 形时间断言——最新报告锚树的 last-claim-mutation ≤ emitted_at；漂移检测义务不得凭空消失（ADR-0092 波界有界子集原话警告适用：恰好把真缺陷划出窗外的子集是藏身所）。
  8. forward-only 三条款：锚定自注册 commit 起生效不追溯定罪（pre-convention 律）；锚字段 MUST 非后补（防逃生舱）；stale-但-锚声明正确的块不是谎言是带日期 claim（Facts Canon as-of 通道的机械形——corrigendum 更便宜）。
  9. P-2 修法定向：test/adr-0085-wiring.test.js 与 evidence-freshness.js 的 pin ancestry 评测 ref 从 HEAD 改为已声明稳定 ref 常量（merge-base(workspace,origin/main) 或 lane-tip——实现期二选一，须实测 GitButler restack/apply 下引用稳定性）；该 ref 即测试的锚声明、写入测试与 ADR 同 commit。
  10. N-3 修法定向：emit 输出对齐消费腿解析的裸数组形；ADR 一节登记「emit 输出形即注册契约，改形走 Declaration」。
  11. N-4 通道义务：立法「存在落地通道契约义务」deferred 行+deadline+§9 过程事实引用；PR/CI 通道 vs 批准式直落的选型=owner act（landing ruling 先例均 owner 裁决），agent 预拟两案不入裁。
  12. 载体：新 ADR-0096（不 amend 0092/0093——跨 force-field 分节原则，同 t37-D-006 bundling 防线：一张 ADR 多节但每节须可独立修订）。
  13. L-1 同族自指边界写入 ADR：报告块不得试图描述覆盖它自己的 map/自己的载体 commit——锚命名被测树，报告自身落地在其 claim 之外；锚定语义天然化解 P-1 悖论而不触碰 L-1。
- **显式约束/负向需求**:
  - 否决项：P-2 errata-类豁免（给已发作的非封闭测试发执照；撞「registered-absence 可区分」精神与 Bazel 封闭性律）；流程-only 方案（ADR-0083 D-C：a discipline can be bypassed, a contract cannot）；(b) 窄化（P-2 留旧语义=契约与首个消费者脱节，重演 V9「机制修一层披露惯例落后一层」）；(c) 的 N-3 排除（同 force-field 劈两轮）。
  - 锚定防逃生舱三件套：forward-only+MUST 非后补+棘轮义务显式重落——缺一即 anchoring 沦为 stale 块的追授执照。
  - ADR 引用 Prometheus staleness/财务审计 as-of 日期两先例须标 analogy（类比级非同构级——ADR-0092 D-PRE「analogy named as analogy」纪律）。
  - 实现期登记裁决点（诚实缺口）：锚树重推导成本未实测（若超 CI 预算需分层=gates 腿锚处重推导+test 腿仅锚校验，此分层未设计）；GitButler merge-base/lane-tip 引用稳定性未验证（P-2 锚常量选型依赖）；D-005 遗留 dirty-树重推导语义在锚定下原样移植未立法；全红日快照体积继续承重未实测。
  - PCAOB AS 3110 主文 403 未读——审计报告日期语义停留在摘要级+ACCA/ISA315 二手层，ADR 引用须按此标位。
- **状态**: current
- **调研凭据**: atomcode Q1 run 2026-10-05（单次跑通；searches 9=Exa1+Tavily5+AnySearch3，full reads 8=mergify/xtdb/fowler/bazel-test-encyclopedia/slsa-provenance/kpt-crd-convention/ACCA/K8s-condition 定义）；一手先例=K8s observedGeneration（kubectl wait 对照 condition 自声明 generation）、bitemporal valid/tx-time（Snodgrass/SQL:2011/XTDB/Fowler）、SLSA provenance subject+materials、merge queue「the commit you tested is the commit you land」（含 2026-04-23 GH merge queue 事故复盘）、Bazel hermeticity（RFC 2119 强制语「非封闭测试价值 diminished」）、Codecov --sha 必填、Prometheus staleness+lookback delta、审计报告 as-of 日期（AS 3110 摘要级）；信息缺口=锚树重推导成本/GitButler 稳定 ref/PCAOB 主文/dirty-树语义/全红日体积（五项已入负向需求）。


---

## D-003 — P-2 测试面评测锚：pin-ancestry 集合锚形与残留窗处置

- **原问题**：Q3 — live-state pin-ancestry 评测绑瞬态 HEAD（同树 2红/3+绿），稳定 ref 选型与声明形如何裁
- **原回答原文**：采纳（选项 a 全案，含调研精化）
- **规范化需求**：
  1. pin-ancestry 评测锚 = 评测时点可解析的 refs/heads/* ∪ refs/gitbutler/* 活分支集合；pin 须为**任一**有名分支祖先即判绿；workspace merge commit 结构性排除出锚集。
  2. 同锚强制经**共享实现内默认值改向**：orphanAncestry 的默认 ref 从 HEAD 改为「显式传则尊重（fixture 逃生舱保留）、缺省则派生活分支集合」；live 调用点全集为四处（check-orphan-ancestry.js、check-classification-consistency.js、adr-0085-wiring.test.js、adr-0086-wiring.test.js，均传 {}），默认值改向一次全修、调用方零改动（ADR-0092 D-M1 执行形）。
  3. 树读/lineage 双 ref 分离：lastSealRecord 等树读取面保持 HEAD/workspace_ref 不变，lineage 评测用集合——ADR-0093 D-6 双字段纪律的机械落点，ADR-0096 双写明防混淆（F-delta）。
  4. 集合空/全部不可解析 → verdict 级 UNVERIFIABLE（exit 2 诚实通道实例），非红非绿。
  5. 面宽：本轮只修 pin-ancestry 族四调用点；其余 HEAD-绑 live-eval 测试的全量枚举挂 deferred 行。划界句入 ADR-0096：锚缺陷形=祖先断言绑瞬态拓扑求值；历史枚举形=其他 HEAD 绑读法（时间断言/树读取等）。
  6. 残留窗（churn-during-apply）= 仪器瞬态：黄级披露（复用 D-002 漂移观测面），不注册 errata 类、不当真信号。预注册重开条件（deferred 行载体）：同 tree_sha 连续 N 次门检残留红超噪声阈值 → errata 题按预注册条件重开（t27-D-003 形；不构成对 D-001.9 否决的自我翻案——errata 否决针对 claim 违约发执照，此处判的是观测时点）。
  7. anchor.ref_context 枚举 additive 增值 live-set（append-only 演进）；D-001.9「单常量」由集合形承接——原文保留，载体形变更为 Declaration 精化句入 ADR-0096。
  8. ADR-0085「ancestor of HEAD」措辞精化句入 ADR-0096 §P-2：standing leg 对声明锚集合求值；claim-point 处 HEAD 语义不变（触发其自带 promotion hook，精化非改向）。
  9. 失效模式随裁决登记：F-alpha 死 lane 假绿（缓解=评测时点可解析；长期滞留→收窄升级路径预登记）；F-beta 残留红→本条 .6；F-gamma 公共 clone 对象缺失=pre-existing 如实披露不扩大。
  10. fixture 回归：共享默认改向后 freshness-checker.test.js 等合成仓派生集合={fixture 自身分支}，绿/红语义保持——实现期回归验证项一条。
- **显式约束/负向需求**：
  - 禁止调用方各自传锚（D-M1：两调用点漂移即重演 t34 接缝）；锚派生必须下沉共享实现。
  - 禁止 merge-base 单锚（lane-only pin 结构性冤红）；禁止绑定任何单一瞬态 ref（GH merge queue #46757 事故形）。
  - 禁止把集合 ref 用于树读取面（F-delta）。
  - 禁止残留窗直接 errata 化或当真信号——只能黄级披露+预注册重开条件。
  - 本轮不枚举 pin-ancestry 族以外的 HEAD-绑测试（t37-D-001 一轮不建两个枚举面）。
  - fixture 显式 ref 逃生舱不许堵死（freshness-checker 合成仓语义保持）。
- **状态**：current

---

## D-004 — P-1 发射侧锚契约：anchor 块字段、dirty 语义与 prose 边界

- **原问题**：Q4 — status-inventory 哨兵块的发射侧锚声明形（块字段选型 / dirty-tree 语义立法 / ref_context 语义 / prose 边界）。
- **原回答原文**：采纳（选项 a 全案，含调研精化）
- **规范化需求**：
  1. 块 append 显式 `anchor:{tree_sha, ref_context, mode}` 字段（additive v1.1）；`run_id` 保留工件寻址职能不变；块 schema 演进只增不改。
  2. **双权威源消歧三规则**（入 ADR-0096 §P-1）：①权威分工——anchor.tree_sha=锚权威（腿判锚只读它），run_id=寻址权威（唯一指认工件文件含 pickDerivation 匹配）；**消费腿禁止从 run_id 解析 tree_sha 做锚判定**；②不一致即红——anchor.tree_sha≠run_id 第二段=发射面自我矛盾，FAIL 独立 reason `anchor_run_id_tree_mismatch`，禁静默择一；③旧块过渡——注册 commit 前旧块无 anchor 走 legacy run_id 解析路径+::warning 黄级披露，注册 commit 后缺 anchor=malformed。
  3. dirty-tree 语义立法：mode∈{tree-internal read, working-tree read} 闭集；working-tree read 语义=「锚指认血统 commit（valid-time），rows 是该 commit 之上当时工作树的一次 read（transaction-time）」；dirty 程度记 runner_ctx.dirty（t37-D-005.2 已有），**禁入 mode 枚举**；禁未来给 mode 加 dirty 度量值（枚举闭集纪律）。
  4. ref_context=观测上下文记录（发射时刻 HEAD 解析到的实体名，枚举含 live-set），**非判定输入**——消费腿评测域仍按 D-003 集合锚；字段语义句入 ADR 防 F-4。
  5. prose 边界（中间形）：承载机械可判数值的 prose 句 MUST 括注 run_id 回指（AS 3110 dual-dating 形——局部标锚只挂具体数值条目）；叙述句不承重；prose 括注的机械兜底（run_id 引用存在性检查=M-D 同族第 4 类候选）挂 deferred 行，本轮不扩枚举面。
  6. 过渡语义：旧块前瞻豁免经版本判定实现（firstCommitMs 机制已在 check-status-inventory.js），非运行时逃生舱；旧载体改写重渲染即升级（F-1 棘轮）。
  7. D-002.5 精化承接：对账对象精化为「anchor.tree_sha+run_id 联合指认」——run_id 指认工件文件、anchor 指认测量树。
  8. 失效模式登记：F-1 旧块堆积（黄级+棘轮）；F-2 双写漂移（mismatch 红行）；F-3 dirty-gap 误读（ADR 双时制披露句）；F-4 ref_context 变隐性评测 ref（语义句）；F-5 mode 枚举膨胀（闭集）；F-6 prose 括注退化仪式句（机械兜底 deferred）。
  9. 实现面登记（起草期指引非源码）：renderSentinel append anchor；发射器补 ref_context 派生（复用 D-003 liveAnchors 探测，不改 run_id 语法）；build-status-sentinel 透传工件 anchor；check-status-inventory 三路径（新块严判/旧块 legacy+warning/mismatch 红）。
- **显式约束/负向需求**：
  - 否决项：run_id 隐式锚（锚语义埋拼接字符串+未来加段静默移位）；anchor+run_id 双写冗余（跨版本语义恒等义务无收益）；合成 measurement commit 锚（事后制造锚形式匹配=D-001.1 缺陷定义的制造型违例）；dirty 则 UNVERIFIABLE（结构性死码）。
  - 消费腿禁从 run_id 反解树做锚判定（消歧规则 1）。
  - prose 括注义务不许退化为仪式句；其机械兜底本轮不建枚举面。
  - 缺口登记：ref_context 取值在 restack 抖动下稳定性未实测；ACCA/AICPA 双日期层仅二手；anchor 字段体积增量未测（常量级预计可忽略）。
- **状态**：current

---

## D-005 — N-3 emit 契约：emit=完整可贴块 + advisories 子命令 + 回环 pinning test

- **原问题**：Q5 — build-audit-checklist emit 对象壳 ↔ check-audit-surface 裸数组消费的合一修法（生成器输出形 / advisories 去向 / 契约注册+test 居所 / 历史块追溯义务）。
- **原回答原文**：采纳（选项 a=调研呈报的 c′ 全案）
- **规范化需求**：
  1. `emit` 直打完整可贴块：`<!-- audit-coverage v1 -->` + json fence + 裸 commands 数组一体——emit 输出=可贴工件逐字同形（build-status-sentinel renderSentinel 同族收敛形）；消费腿 `extractCoverage` 零变更（fence 内容仍是裸数组）。
  2. advisories 剥离 emit 通道：独立 `--advisories` 子命令打文本清单（人类通道）；`docs/governance/audit-checklist.json` 的 advisories 字段保留为权威源；报告 prose 披露段照常（块只承载命令清单）。
  3. ADR-0096 §N-3 立法句：「emit 输出形即注册契约，改形走 Declaration」+ **co-signs 界限句**：「sentinel 标记与 fence 是块语法载体（format carrier），非 claim 内容；claim 内容（命令清单）与 attest 行为（贴入+具名）仍属审计人；generator never co-signs 界限于 result truth，不扩及格式载体」（ADR-0091 D-E+t34-D-004(ii) 原文支撑）。
  4. 回环 pinning test 并入既有 `test/audit-checklist.test.js` 或 `audit-surface.test.js`（wiring 家族既有面非新枚举面）：emit stdout→extractCoverage 必绿；断言 fence 内容=非空字符串数组且元素对齐 checklist.commands。
  5. **同 commit 义务**：emit 改形 + pinning test + ADR 节 + _doc/AGENTS.md 措辞同步，单 commit 落地（D-001.10「修复=单 commit」逐字履行）。
  6. **零历史追溯义务**：实测 t34/t36/t37 已提交块全部裸数组、对象壳块从未入已提交报告——漂移只在 emit 输出↔消费腿之间，修 emit 即闭环；无 forward-only 豁免条款需要，无 corrigendum。
  7. D-001.10「emit 对齐裸数组」承接：fence 内容层义务不变，输出包装精化为完整块——**精化非改向**（Declaration 精化句入 ADR-0096，D-001.10 原文保留；与 D-003.7 集合形承接 D-001.9 同型）。
  8. 失效模式登记：F-emit-1 输出形再漂移（立法句+回环 test 同 commit）；F-emit-2 误贴非 fence 位（adjacent-fence binding 先例，fail-closed 抓住）；F-emit-3 advisories 披露退化（独立子命令防死码）；F-emit-4 co-signs 误读（界限句防线）。
- **显式约束/负向需求**：
  - 否决项：消费腿放宽收对象壳（fail-closed 削弱+双读合法化，ADR-0083 D-003 dual reading 禁）；emit 裸数组半截修复（残余手工包壳面=N-3 病灶重现点）；emit 自测为 pinning（自证非独立断言面）；新建 adr-0091-wiring.test.js（该文件不存在，伪居所）。
  - stdout 单一契约：emit 通道禁混 advisories（一个通道两种载荷=本病灶结构）；advisories 禁进 stderr（披露面非诊断，D-M2 持久可见义务）。
  - emit 输出形漂移须同 commit 双改（emit+test），分 commit=漂移窗复发。
- **状态**：current

---

## D-006 — P-3 结转分诊：九项三出口裁处 + source_adr 单值双权威立法

- **原问题**：Q6 — 九项 t37 结转裁决的三出口裁处（登记/deferred/owner 移交）+ source_adr 多值解析句是否本轮立法。
- **原回答原文**：采纳（选项 a=调研呈报全案）
- **规范化需求**：
  1. 裁处表：pack cap=owner 移交（agent 可预计算候选值供复核不可代签；owner 重推导须 size+entryCount 同报）；ADR-0095+三腿注册=登记（t37-D-006 执行面；assert 腿最后落地防悬空）；F-5=deferred（trigger=任一 workflow 出现 matrix:；review_at=2026-04-30）；F-6/F-8/F-10=登记（写入 ADR-0095 起草内容）；F-9=登记并入普遍条款；F-11=deferred（trigger 与 t37-D-003.7「首病例」钩同 anchor——首个真实 declared-vs-inferred mismatch 病例或 gate 电池实测超时；review_at=2026-04-30）；post-land-sentinel 刷新=owner 移交仅时点层（机械 regen 已由 E-17/E-19 立法，零新立法）。
  2. **source_adr 本轮立法=单值+双权威声明句**：gates.json/deferred-registry.json 的 source_adr 保单值指 ADR-0095（轮契约=主权威）；ADR-0095 正文显式声明「status-inventory 腿权威源=0095+0096 双 ADR」（expand-contract additive 形：声明先行、物理 schema 不动）。**禁数组扩形本轮走**——source_adr 属 fenced 治理字段（surface-taxonomy field_governance 实测），改形须 ADR+countersign 超重。预注册重开条件：第三共权威 ADR 出现或需机器校验逐权威 content-anchor 时重开数组裁。
  3. **F-9 升格为普遍条款**（ADR-0095 起草）：「立法文本段落（或其修订）与其所治理的机制/值同 commit 落地；治理段落晚于机制落地=该机制在该 commit 内不得 blocking」——涵盖 ADR-0027 D2(b)、t38-D-005.5、F-9 三投影，禁止三处各自为政。
  4. **登记出口=载体+设计内容双交付**：item 2′（单值双权威句）、F-6（s2 域谓词边界）、F-8（identity 谓词精化句引用 t37-D-005.5 非改写）、F-9（泛化条款措辞）四项的设计内容随裁处写明进 ADR-0095 起草——三出口只回答「放哪」，设计内容不写=起草期新悬案回弹。
  5. **F-10 活违规消解**：contract-vocab 枚举基座扩宽已发生未登记=t37-D-004.3「禁静默扩列」的活冲突，本轮登记（含扩宽裁定理由+剩余域残量）即消解——不追溯定罪只补注册。
  6. F-5 deferred 行纪律：t37-D-005.2 已立法矩阵维，defer 行**禁再立法**——只登记实现缺口+注释过度声明（防平行立账）；事实修正登记：run_id 已含 GITHUB_JOB，真缺陷=GH matrix 腿共名碰撞+注释过度声明，ci.yml 实测零 matrix。
  7. post-land 刷新兜底：刷新迟到=stale-但-锚诚实=黄级披露非红（D-002 新鲜度语义）；agent 禁在 wave 未 settle 时抢跑刷新（P-1 三连发重演）；「波已 settle」判定权在 owner。
  8. pack cap 移交纪律：ADR-0094 Rejected 节「Narrowing the tarball instead of amending」=no-hedge 禁；195/196 腿漂红噪声化=alarm-fatigue（ADR-0064 立法打击的病），owner 签署前须按 pinned 公式重推导+修正值写回草案+同 commit 改 ADR-0039 D3 字面量。
- **显式约束/负向需求**：
  - source_adr 禁数组扩形本轮走（fenced 字段改形须 countersign）；未来若走数组须带 countersign 且防「部分读合法化」（ADR-0083 D-003 dual-reading 禁）。
  - F-5/F-11 defer 行只登记缺口不重复立法；F-11 trigger 与 D-003.7 首病例钩同 anchor 禁双计数器。
  - 登记出口不许只路由不写内容（四项设计内容随裁写明）。
  - pack cap 禁 agent 代签、禁静默追认新基线、禁削包体绕行、禁噪声化。
  - 缺口登记：pack cap entryCount 未随报（owner 重推导前须补齐）；F-9 泛化句可判性起草期实测。
- **状态**：current
