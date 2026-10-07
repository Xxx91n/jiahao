# spec-t39 — grill-t39 裁决总谱（sole drafting specification）

> 本文件是**起草规范（sole drafting specification），不是权威源**。权威 = docs/adr/* + `.scratch/grill-t39/decision-ledger.md`；spec 只钉总谱与序次（D-008.6）。

## S-0 元信息

- 轮名：grill-t39；账本：`.scratch/grill-t39/decision-ledger.md`（D-001~D-008 全 current）。
- 范围（D-001.1）：P-A（ponytail v4.13.0 借鉴收割）+ P-B（第五语义 Grandiosity）+ S-224（可变 claim 面）+ Q-t39 处置-证据闭合 + owner 未闭项跟进。
- 四 ADR 分域（D-008.1）：ADR-0097 借鉴收编 / ADR-0098 Grandiosity / ADR-0099 处置-证据闭合 / ADR-0100 可变 claim 面治理。

## S-1 轮对象与范围构成（D-001）

- 五线并列：P-A、P-B、S-224、Q-t39 候选支、owner 未闭项。
- 烤对象集 ≠ 落地承诺集：结转项逐项有去向（本谱即对账面）。
- owner 项只产呈报材料与选项，agent 不代签（D-001.4）。

## S-2 D-002 → ADR-0100「可变 claim 面治理」起草清单

- S-2.1 append-only 面：常驻任务书轮名冻结（每轮新建、旧文不改写）；固定名 `next-round.md` 退化为单行指针（W3C dated/latest-version 同构）；覆盖面最小=仅此固定名面（D-002.1）。
- S-2.2 fenced 收窄：按轮冻结文件进 claim 面+例外收窄到指针行=对 ADR-0085 `claim_surfaces` 的 scoped-supersession 指针 + ADR-0086 fenced 通道（ADR+countersign）（D-002.2, D-008.2）。
- S-2.3 漂移声明注册表：append-only、`registered_at` 代 `expires_at`、无 TTL；逐条写覆写来源 commit+恢复行原文入 `cite_locations`；置**分类器输入侧**（第四类声明事实，扩 ADR-0089 D-A）；法定措辞=「登记的行级漂移声明」，**禁豁免/waiver 措辞**（ADR-0093 D-4）（D-002.3）。
- S-2.4 关闸条件：落地 commit 后注册表新增条目=红级信号（D-002.4）。
- S-2.5 原子落地：a+b′ 双半边按 ADR-0089 D-G + ADR-0095 D-B **同 commit**（D-002.5, D-008.3）。
- S-2.6 存量 8 行：`32af9b5f` 版 next-round.md :45/:86 已实测可恢复、覆写 commit=`fa654a05`；逐条登记；`fe190b65` orphan 走既有通道独立机械事（D-002.6）。
- S-2.7 划界句（落 ADR-0100 正文不落 spec，D-008.6）：登记判「观测时点行级事实」，非给违约发执照——与 t38-D-003.6 残留窗划界同构。
- S-2.8 双枚举面边界论证句（落 ADR-0100 边界节）：漂移注册表（claim 面治理域）与收词分诊通道（文风分诊域）不同 force-field（D-008.5）。

## S-3 D-003 → ADR-0097「上游借鉴收编」起草清单

- S-3.1 #1 行内上限注释：入 scripts/hooks，本仓命名空间（候选 `jiahao-debt:`），两段式 `<上限>, <升级触发>` 不可分割（D-003.1）。
- S-3.2 #2 收割器：禁平行账本；落点=deferred-registry 既有通道 vs derive-from-source 派生工件+ freshness leg——**落点选型=owner 裁**；新枚举面自带 ADR 载体不捆绑（t37-D-001 M-D）；收割器断言 trigger 完整性（D-003.2）。
- S-3.3 #3 defer（利益冲突理由）：defer 行预登记解冻条件+范围栅栏（治理棘轮/claim 面/fenced 枚举永不入 `yagni:` 目标集）（D-003.3）。
- S-3.4 #4 拆分：诚实边界 adopt-now（禁发明 per-repo 收益数、数字只挂测量面；落点=effectiveness 文案披露句纪律不入 gate）；scoreboard 本体 defer（D-003.4）。
- S-3.5 #5 方法结构 adopt 非水位：对照臂（caveman 式措辞控制臂）+safe 轴单列+纠偏姿态；n=4 只配 smoke 披露，本仓水位 ADR-0067/68+ADR-0029 D3 n≥30（D-003.5）。
- S-3.6 #6 强度档：intensity≠role 两轴正交；**verifier 侧不装运行时强度档**（blocking 审计不得被被审方调弱）；上游三事故抄为验收标准（#1037 命名空间隔离/#687·676 off 真静默/#677 非法参保模式）；禁 runtime role detection（D-003.6）。
- S-3.7 #7 排除域两面：verifier Boundaries 节扩显式排除域（不用于生成辅导/无 hook 宿主常驻注入/非审计任务）；description 负面域「Do NOT use for…」（D-003.7）。
- S-3.8 #8 编号连续性编辑约定：新审计报告 findings 全报告连续编号可跨轮引用；六标签词表随 #3 defer（D-003.8）。
- S-3.9 #9/10 reject+收获行：宿主日落/降级通道缺口+hook 四类事故自查清单入 deferred（D-003.9）。
- S-3.10 **数字禁引禁则**：上游基准数字永远不得引为 jiahao 有效性证据（ADR-0087 D-D 延伸）；借方法学非数字（D-003.10）。

## S-4 D-004+D-005 → ADR-0098「Grandiosity（虚饰输出）」起草清单

- S-4.1 语义本体：**Grandiosity（虚饰输出）**=「装饰性虚构承重，以术语密度与晦涩句式伪装深度」；入 CONTEXT.md 词目 + `Jiahao-style Behavior` 第五条（D-004.1, D-008.7）。
- S-4.2 债务形定义：造词合法；违例=「未注册+三轴（频次+分布广度+承重语义）+生命周期未闭环」；未注册=中性态（Vale 双列先例）；违例点=高频承重词不进裁决非「未注册」本身（D-004.2）。
- S-4.3 收词分诊通道（Unregistered Coinage）：advisory 分诊非 blocking（ADR-0014 D1）；generator 侧不入 verifier 腿；双语扫描五面（台账/报告/ADR/AGENTS.md/CONTEXT.md）；输出→owner 二选一（注册/改平/登记 deferred）（D-004.3）。
- S-4.4 棘轮形：新增未注册承重词零容忍+存量（~190 次跨 15+ 轮）只降不升分批 deferred（trigger+deadline）+goal 达成锁 budget 0 不删行（防 betterer #1181）（D-004.4）。
- S-4.5 句式面：计数型信号（句长分布/构式密度/符号密写频率/长句占比，**只计数不评分**——中文无可信可读性公式）作第二探测族；「承裁决句一遍可读」约定条款（D-005.1/.5）。
- S-4.6 判定域分层：报告/handoff=强约束；ADR/CONTEXT=弱约束（承重句式合法但逐条声明用途——禁整类豁免牌照）；台账=参考级；词面不分层（D-005.2, D-004.5）。
- S-4.7 披露面：报告固定尾行 `prose-density`（Lexi 形）；数字来自确定性计数器、模型只解读不生成；只披露不设目标值+「不为计数改写既有文本」条款；计数禁入生成指令（D-005.3/.4）。
- S-4.8 双枚举面边界论证句（落 ADR-0098 边界节）：与漂移注册表不同 force-field（D-008.5）。

## S-5 D-006 → ADR-0099「处置-证据闭合」起草清单（三节可独立修订）

- S-5.1 §P-A（defer-0089 兑现，非新枚举面）：prose 约定「声称登记须引 row id」+存在性腿（row id 在 claim 锚 commit 内可解析）；`source_adr`→0099（ADR-0058 R3 形）（D-006.1）。
- S-5.2 §P-B（check_channel 可选字段）：expand-contract additive；三选一枚举（gate leg/owner-only/机械 trigger）+扩枚举预注册（第四通道须 countersign）；存量缺失=黄披露非红；editorial/fenced 分类=owner 裁；schema+check-deferred.js+存量标注+wiring test 同 commit（D-006.2）。
- S-5.3 §P-C（prose 三元+口径披露）：prose 锚条款扩为「值+run_id+仪器口径名」（ADR-0096 §P-1 精化）+摘要头与腿级口径差黄级披露义务；**一致性腿本轮否决**（双口径各自为真+禁双计数器+成本未实测），挂 defer-0091/F-11 同 anchor 等首病例（D-006.4）。
- S-5.4 存量迁移=一次性（dry-run→清单→owner 确认→单 commit；禁周期回填、禁 partial backfill）；成本超预算降级形=「新行必填+存量黄披露+trigger 侧棘轮」预注册（D-006.3）。

## S-6 载体与落地序（D-008）

- 落地序：ADR-0100 先于其实施（ADR-0095 D-B 同 commit 律）；立法载体先落、机制载体后落（t38 0095→0096 兄弟序先例）；D-002 三件套单 commit 原子。
- 红窗预注册：腿 224 八行红窗在 D-002 落地前持续——中间态可红、披露不修（D-008.4）。
- spec 总谱定位句：本文件 §0 已载（D-008.6）。
- verifier 零新增确认（D-008.7）：blocking 面不进强度档、不收 advisory 探测族。
- 精化声明：「0099+0100 兄弟载体」=对 D-006.5 精化非改向；D-001.2「二选一」由 D-002 承接（D-008.8）。

## S-7 prep lane（`grill-t39-prep` @ 2df61d4e）处置（D-007.1/.2）

- `loop-handoff.md` §7/§8 **落地**（文末加指针行「resolved by grill-t39 D-002」——未提交文本编辑不涉 committed-prose 纪律）。
- `rewrite-map.json` **丢弃 hunk**，D-002 落地收尾时最后重生成。
- `orphan-cites.json` **丢弃 hunk**，fe190b65 经 `register` 显式动词在 D-002 原子 commit 内重登记（**禁当派生工件重生成**，ADR-0089 D-D）。
- 序次：「先叙事后派生」=commit 内步骤序+紧邻 commit 序，不许拆原子 commit（D-007.2）。

## S-8 owner 移交清单（D-007.3/.4）

| 项 | 载体 | 内容 |
|---|---|---|
| pack cap 签署 | 清单 | 重推导（size+entryCount 同报，以最终 settled 树实测为准）+同 commit ADR-0039 D3 |
| post-land 刷新时点 | 清单 | 「波已 settle」判定=owner act |
| audit-surface 红两出路 | 清单具名两案+registry 行带 trigger | ①CI 面跑齐后具名贴 v1 块（机械 act）vs ②立法「部分覆盖声明」（立法级）——并列写代价，禁返工窗口代贴 |
| F-5/F-11 `review_at`+P1-9 `runner_ctx` | 清单指针 | 已在 ADR-0096 Registered transfers 注册待裁；新行=双计数器禁止 |
| D-003.2 收割器落点 | 清单 | registry 行 vs 派生工件两案备齐 |

## S-9 否决集（各 D-xxx.NEG 汇总）

- 纯 b 豁免通道 / 无收口「一次性」/ 豁免措辞（D-002）
- 平行账本 / n=4 水位入测量标准 / verifier 强度档 / runtime role detection（D-003）
- 文风整体判罚（c 形）/ 三要件当场即违（b 形）/ 词表 blocking 检测器 / 「豁免阀」措辞（D-004）
- 机械评分代理 / 目标值 / 整类豁免牌照 / 句式面 gate 化（D-005）
- 新建第 5 类枚举面绕开 defer-0089 / 必填字段形 / 一致性腿本轮 / partial 或周期回填（D-006）
- prep lane 整落或整弃 / 四项全清单或全 registry（D-007）
- amend Accepted ADR / 跨 force-field 并节 / spec 吸权 / 224 红窗静默 / 双枚举面同族化（D-008）

## S-10 诚实缺口与更正记录

- Q5 atomcode 未读本地仓（沙箱 cwd 失位），冲突核查由呈报方补做（D-005 凭据）。
- 「承重渗入 AGENTS.md:152」呈报错误已更正（原文为 load-bearing 注册态）（D-004 更正记录）。
- 上游 issue #126、safe 轴明细、ponytail hooks/ 源码仅转述层（D-003）。
- 存量分批注册成本、check_channel 补字段成本未实测——各有预注册降级条件（D-004.4, D-006.3）。
- W3C 条款号搜索级、betterer 二手层（D-002）。
- 呈报两次先例级措辞险被调研纠回（D-002 豁免措辞 / D-007 登记面误归派生面）。

## S-11 修订链

- D-001.2「S-224 二选一」→ D-002 c′ 精化承接（非翻案）。
- D-001.3 Q-t39 三支 → D-006 承接。
- D-001.5 prep lane 联动 → D-007 承接。
- D-006.5「载体=ADR-0099」→ D-008 精化（0099+0100 兄弟载体）。
- 全程零 revised 记录。
