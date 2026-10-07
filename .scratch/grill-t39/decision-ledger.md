# grill-t39 decision ledger

Append-only. Statuses: current | revised | stale | deferred.
Revisions keep the original record (marked revised) and add a new D-xxx.

<!-- records -->

## D-001 — t39 轮对象与范围构成（Q1 选项 c 采纳：双痛点 + 全部结转）

- **原问题**: grill-t39 轮对象与范围边界——a) 纯双痛点（P-A ponytail 借鉴收割 + P-B 第五语义「装腔式输出」，结转全出范围）/ b) 双痛点 + §7 leg-224 可变 claim 面缺陷一条 / c) 双痛点 + 全部结转（含 Q-t39 处置-证据闭合三支与 owner 项跟进）/ d) 其他。子问（P-B 候选规范名 Grandiosity/虚张声势输出）标注为随 Q1 定边界后起草。
- **我的原回答原文**: 「C」——即选项 c：双痛点 + 全部结转。
- **规范化需求**:
  1. 轮对象五线并列：P-A（ponytail 近期重大更新借鉴收割）、P-B（心智模型第五语义：总爱使用莫名创造的复杂词语和句式输出装作很高大上）、S-224（交接 §7 可变 claim 面缺陷二选一裁处）、Q-t39 处置-证据闭合候选支、owner 未闭项跟进。
  2. S-224 裁处候选（交接 §7 原文两出路）：①常驻任务书改每轮新建/旧文冻结（append-only 面）；②给腿 224 加已登记漂移通道（覆写来源提交须登记）。该缺陷当前使 `check-map-freshness` 持续红 8 行，且任何「重算地图→落地」循环在落地瞬间令腿 208 复红。
  3. Q-t39 候选支按两份交接合枚举：(a) 登记声称↔registry 行反向核验（活例：ADR-0096:51 虚报登记已修，修形为正面样本）；(b) 有界断言承接无界义务的形状识别（D-001.7 棘轮范例 vs defer-0088 反例）；(c) 仪器自述一致性（54 vs 53 两口径错报）/ 一审交接版的 (c') lane 单飞契约可达性机械化（须先查 ADR-0095 D-B 是否已覆盖以免重复立法）。
  4. owner 未闭项跟进集：pack cap 签署前重推导（size+entryCount 同报）、post-land-sentinel 刷新时点、audit-surface 红两出路（CI 面跑齐后具名贴块 vs 「部分覆盖声明」立法）、F-5/F-11 `review_at` 偏离裁处、N4 `git update-index` 逃生舱是否追认为合法+「GitButler 索引惰性写缺口」是否立案。烤侧义务=备齐呈报材料与选项，裁量权属 owner 不代办。
  5. `grill-t39-prep` lane（`2df61d4e`，刻意未落：重算 rewrite-map + orphan-cites 登记 + 交接 §7-8）的处置随 S-224 裁决联动，本轮须给去向下文。
- **显式约束/负向需求**:
  - grill 全程不动源码、不设新目标；每结论当场落账。
  - 结转项烤完须逐项有去向（spec/任务/范围外+理由），不允许「全收了就默认都做」的隐性扩张——范围=烤的对象集，非落地承诺集。
  - owner 项只产呈报材料与选项，agent 不代签、不追认、不替他人在制品下结论。
  - P-B 的判定对象与机制面未被 D-001 预设：词表名、挂载配置（generator/verifier/新层）、检测器形全留待后续问题。
  - 本地事实底稿（枚举非记忆）：ponytail=v4.13.0/311 commits/命令族+债务账本+诚实基准（caveman 为对照臂）；本机已装 lazy-senior-dev（=ponytail AGENTS.md 上游副本）与 caveman（简洁沟通模式）两心智模型工件。
- **状态**: current

## D-002 — S-224 可变 claim 面缺陷裁处（Q2 atomcode c′ 采纳：a append-only 面 + b′ 声明事实注册表，同 commit 原子落地）

- **原问题**: S-224 裁处——a) 引用面改 append-only（任务书轮名冻结+指针退化一行）/ b) 腿 224 加'已登记漂移'豁免通道 / c) 混合 / d) 其他；子问 1=append-only 覆盖面、子问 2=补洞登记载体。atomcode 呈报 c′（a+b′）全案后选项 a=采纳 / b=只 a 半边洞挂 deferred / c=调整 / d=退回。
- **我的原回答原文**: 「采纳」——即呈报 c′ 全案。
- **规范化需求**:
  1. **a 半边（结构根治）**：常驻任务书改轮名冻结（每轮新建、旧文不再改写），固定名文件退化为单行指针（W3C dated-version/latest-version 双 URL 同构）；Event Sourcing 判词=物化视图不得覆盖事件史。覆盖面=最小即 `next-round.md` 固定名面（spec/报告/日期化 handoff 已是唯一名）。
  2. **fenced 枚举成本**：按轮冻结的任务书文件进 claim 面、例外收窄到指针行=ADR-0085 `claim_surfaces` fenced 枚举收窄，须经 ADR-0086 场域（ADR+可能 countersign），不得以任务书约定直接改。
  3. **b′ 半边（存量清创，非豁免）**：append-only 行级漂移声明注册表——置**分类器输入侧**（声明事实数据）非腿判定侧（旁路）；条目 append-only、`registered_at` 取代 `expires_at`、无 TTL 无自动失效；逐条写**覆写来源 commit** 与恢复行原文进 `cite_locations`；措辞法定为「登记的行级漂移声明、由分类器作第四类声明事实消费」（扩 ADR-0089 D-A declared-facts 集），**禁用「豁免/waiver」措辞**（ADR-0093 D-4）。
  4. **关闸条件预注册**：(a) 落地 commit 之后注册表新增任何条目=红级信号，指向 append-only 纪律被违——无此条款则 b′ 静默退化为常设通道。
  5. **同 commit 原子落地**：按 ADR-0089 D-G（backfill→classifier→regen）+ADR-0095 D-B 同 commit 律单 commit 完成 a+b′ 双半边；拆两次提交会在落地瞬间重演腿 208 复红 treadmill。
  6. **存量 8 行处置**：已实测可恢复（`32af9b5f` 版 `next-round.md` :45/:86 原文俱在，覆写 commit=`fa654a05`）；8 行逐条登记；另 `fe190b65` orphan-cite 走既有登记通道属独立机械事不入本裁决。
  7. **划界句（ADR 用）**：登记判的是「观测时点行级事实」（行因已声明的覆写消失），非给违约发执照——与 t38-D-003.6 残留窗「yellow+预注册重开非 errata」划界同构，明文写入防误读为自我翻案。
  8. **grill-t39-prep lane 联动**：地图重算+orphan-cites 登记+交接更新在其上刻意未落；本裁决落地时一并收编或废弃，去向须点名。
- **显式约束/负向需求**:
  - 否决项：纯 b（腿内豁免通道=常设逃生舱，撞 D-4+重演被拒生命周期）；「一次性」无机械收口条件的 c；措辞为豁免的任何成形。
  - 精化声明：与 D-001.2 的「二选一」框架是精化关系非翻案（D-001 只枚举未裁决），落账防账本双读法。
  - 诚实缺口：W3C persistence policy 条款号未一手核（搜索级）、betterer 二手层；8 行中 2 行已实测恢复、余 6 同类待实现期逐条核。
  - 调研呈报与账本零 revised：五处冲突点全为精化/划界级。
- **状态**: current
- **调研凭据**: atomcode Q2 run 2026-10-07 session e488c62c（单次跑通；一手=docs.rubocop.org、docs.gitlab.com、detekt.dev、docs.semgrep.dev/defectdojo、w3.org 搜索级、learn.microsoft.com event-sourcing）；本地补证=`check-map-freshness.js` 复跑 8 行缺+fe190b65 orphan 实红、git 历史可恢复性实测通过。


## D-003 — P-A ponytail 借鉴收割处置矩阵（Q3 atomcode 改判表采纳：四处实质改判 + 数字禁引禁则）

- **原问题**: P-A 十项 delta 处置矩阵（1 行内上限注释 adapt / 2 注释收割 adapt / 3-4 defer / 5、7 adopt / 8 已有等价 / 9-10 reject；载体=ADR-0097/deferred/词目）。atomcode 呈报改判表后选项 a=全案采纳（#6 按 generator 侧装、verifier 侧不装强度档）/ b=全案但 #6 整体 defer / c=调整某行 / d=退回。
- **我的原回答原文**: 「采纳」——即呈报选项 a：改判表全案 + #6 子裁「generator 侧装强度档、verifier 侧不装」。
- **规范化需求**:
  1. **#1 adopt（标记名 adapt）**：行内上限注释惯例入本仓工程代码（scripts/、hooks/），标记名换本仓命名空间（候选 `jiahao-debt:`）；两段式 `<上限>, <升级触发>` 法定不可分割——减一段即撞上游 `no-trigger` 腐烂类与本仓 deferred-registry trigger 纪律；不属 claim surface，与 D-002 append-only 面无冲突。
  2. **#2 adopt + 落点强约束**：禁止新建平行账本文件（E-25 双通道病）；收割落 `docs/deferred-registry.json` 既有通道或 ADR-0091 derive-from-source 形（标记=源、账本=派生工件+freshness leg --check regen+diff）；标记扫描=新枚举面须自带 ADR 载体不与其他项捆绑（t37-D-001 M-D）；收割器须断言 trigger 完整性。**落点选型（registry 行 vs 派生工件）=owner 裁**，agent 只备两案。
  3. **#3 defer（真实理由=利益冲突）**：上游产品立场是「删掉检查」，本仓产品是检查本身——`yagni:`/`delete:` 标签指向本仓=拆治理武器。defer 行预登记解冻条件+范围栅栏：治理棘轮/claim 面/fenced 枚举**永不**入 `yagni:` 目标集；caller-check 半边本仓已有机械等价无需借。
  4. **#4 拆分**：诚实边界半边 **adopt-now**——禁发明 per-repo 收益数、反事实不存在、数字只挂测量面（落点=effectiveness 类文案披露句纪律，README/ADR 效果句，不入 gate）；scoreboard 本体 defer（须对照臂实验+预算）。
  5. **#5 adopt 方法结构非水位**：真 agent×真仓、对照臂（含 caveman 式措辞控制臂——ACES/SkillBenchmark 双源支持）、safe 轴单列、纠偏姿态；**n=4 描述统计不作本仓测量标准**——本仓水位 ADR-0067/0068+ADR-0029 D3 n≥30，n=4 只配 smoke 披露。
  6. **#6 adopt + 子裁**：intensity≠role 两轴正交（install-time 选 role、runtime 持久 intensity）；上游三类事故抄作验收标准（#1037 项目态碰撞→状态按项目命名空间隔离；#687/#676 off 语义泄漏→off 真静默全部注入点；#677 非法参数保模式）；**verifier 侧不装运行时强度档**（blocking 审计不得被被审方调弱——强度档只入 generator 侧）；禁漂向 runtime role detection（词表否决维持）。
  7. **#7 adopt 两面**：verifier 配置 Boundaries 节扩显式排除域（不用于生成辅导、不用于无 hook 能力宿主常驻注入、不用于非审计任务——防 Generator-Verifier Gap 被 scope creep 蚀）；description 负面域「Do NOT use for…」形。
  8. **#8 半边**：编号连续性 adopt 为编辑约定（新审计报告 findings 全报告连续编号、可被后续轮次按号引用）；六标签词表（delete/stdlib/native/reuse/yagni/shrink）缺但随 #3 defer。
  9. **#9/10 reject + 收获行**：矩阵本体不借（本仓 ADR-0028+0087+host-contracts golden 已更成熟）；真信号入 deferred——宿主日落/降级通道缺口（有准入无移除）、hook 四类事故作本仓自查清单。
  10. **数字禁引禁则（立法）**：上游基准数字永远不得引用为 jiahao 有效性证据（ADR-0087 D-D polygraph 附录探针地位延伸）；borrow 的是方法学非数字。
- **显式约束/负向需求**:
  - 载体：P-B/借鉴收编主 ADR=ADR-0097 候选；deferred 行=#3（含范围栅栏+解冻条件）、#4 scoreboard 半边、#9 日落通道、#10 hook 自查清单、#2 落点 owner 裁。
  - 否决项：平行账本；n=4 水位入测量标准；verifier 侧强度档；runtime role detection。
  - 诚实缺口：AnySearch 当日不可用（两引擎+一手源覆盖）；issue #126 只读转述层；safe 轴 6 任务明细未读（落地时补 `benchmarks/results/` 原文）；ponytail hooks/ 源码未逐文件读（#10 四缺陷类从 release notes 归纳）。
  - 调研呈报与账本零 revised。
- **状态**: current
- **调研凭据**: atomcode Q3 run 2026-10-07 session a5c67d8f（单次跑通+一次续跑补截断行；一手=ponytail README/INSTALL/releases/四个 SKILL.md raw 全文、Potdar&Shihab SATD 谱系 EMSE2021 摘要层、SkillBenchmark、ACES 论文摘要层、LaunchDarkly/Flagsmith/Unleash/GrowthBook flag 治理惯例×4）。


## D-004 — P-B 第五语义定义与判定边界（Q4 atomcode 修正版采纳：a 形修正+三轴判据+棘轮+双名倒置）

- **原问题**: P-B 第五语义（「装腔式输出」）定义形与判定边界。子问1 定义形三选一（a 债务形/b 三要件形/c 文风整体判罚）；子问2 豁免阀机械面；子问3 判定域；子问4 规范名。atomcode 呈报修正版后选项 a=全案采纳 / b=调整子项 / c=其他。
- **我的原回答原文**: 「采纳」——即呈报选项 a：修正版全案。
- **规范化需求**:
  1. **主名 Grandiosity（虚饰输出）**：定义=「装饰性虚构承重，以术语密度与晦涩句式伪装深度」；「未注册」降为判据面之一不作行为名；`Unregistered Coinage` 降为收词分诊通道名。
  2. **定义形=a 修正版（债务形）**：造词合法（DDD：语言随领域演进）；违例=「未注册+三轴（频次+分布广度+承重语义）+生命周期未闭环」组合；**未注册本身是中性态**（Vale accept/reject 双列先例：注册=豁免、显式拒绝=红、未注册≠违例）；违例点钉在「高频承重词不进裁决」而非「未注册」；纯装饰堆砌归披露面不入违规。
  3. **收词分诊通道**（机械面）：词频扫描器=**分诊器 advisory 非 blocking**（守 ADR-0014 D1 词表分诊地位），generator 侧工具**不入 verifier 腿**（守 D-003.6 精神）；双语扫描（中英，treadmill 类英文逃逸已实证）；扫描面=台账/报告/ADR/AGENTS.md/CONTEXT.md；输出高频未注册承重词清单→**owner 二选一裁决**（注册入 CONTEXT.md / 改平实表达 / 登记 deferred 行）。
  4. **棘轮形（betterer 同构）**：新增未注册承重词零容忍；存量（~190 次跨 15+ 轮）只降不升、分批走 deferred-registry（带 trigger+deadline，守 t38-D-006.6）；**goal 达成不删行锁为 budget 0**（预注册 betterer issue #1181 失效修复——goal 达成→baseline 清除→恶化不报红的陷阱）。
  5. **判定域分层**：committed 面（台账/报告/ADR/AGENTS.md/CONTEXT.md）=机械分诊；chat 面=约定（generator 侧 advisory 自律，非机械测量）；DDD 先例「词表更新与变更同 PR」=注册义务绑 committed 变更面。
  6. **载体**：ADR-0098 候选（不 amend ADR-0014——跨 force-field 分节原则，t38-D-001.12 同构）。
  7. **禁止/负向**：c 形（文风整体判罚）否决——无工业先例且不可机械判定撞 ADR-0083 D-C；b 形否决——「有平实替代」须人裁不可判死；禁把扫描器主形做成纯词表 blocking 检测器；措辞禁「豁免阀」（守 D-002.3 措辞律），法定名=收词分诊通道。
- **显式约束/负向需求**: 句式面（晦涩句式、结构层）另开题裁，不与词面混裁；装饰堆砌披露面形待裁；三轴中「承重语义」轴的机器化判形留实现期裁（owner 裁可。
- **更正记录**: 呈报证据错误一处——「承重已渗入 AGENTS.md:152」不成立：原文为英文 `load-bearing` 且在章程层属注册生效态，非逃逸证据。由 atomcode 调研纠出，如实更正。
- **状态**: current
- **调研凭据**: atomcode Q4 run 2026-10-07 session d48b5914（单次跑通；12 searches Exa+AnySearch 双引擎（Tavily 配额尽）、8 篇一手全文=docs.vale.sh vocabularies、LWN Vale 深读、betterer 官网+introduction+issue #1181、DebtLens、martinfowler.com UbiquitousLanguage、milanjovanovic.tech、Merriam-Webster 收词三判据经 NBC/BBC/WaPo/WBALTV 四源转述交叉）；前置普查 atomcode run 同日（412 文件全量扫描：b 类未注册承重词 ~190 次跨 15+ 轮台账、纯装饰词 <10%、棘轮 50+/承重 27/潮汐 21/落账 7/烤透 4/下探 5）。


## D-005 — P-B 句式面裁处（Q5 atomcode 呈报采纳：c 形+分层+披露①+三设防）

- **原问题**: P-B 句式面——晦涩句式/结构层装腔的判定形（a 机械代理 advisory / b 纯约定 / c 混合）、判定域分层、披露面成形。atomcode 呈报 c 形+三设防后选项 a=全案采纳 / b=调整 / c=其他。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案。
- **规范化需求**:
  1. **判定形=c 混合**：确定性计数器产出**计数型信号**（句长分布、X面/域/形构式密度、:=/→ 符号密写频率、长句占比——**只计数不评分**，中文无可信可读性公式）作收词分诊通道**第二探测族**；「承裁决的句子须一遍可读」约定条款钉人判义务；裁决在 owner 不在信号。
  2. **判定域分层**（GitLab error/warning/suggestion 对应）：报告/handoff=**强约束**（面向忙碌读者，一次可读性=硬需求）；ADR/CONTEXT=**弱约束**（承重句式合法）；台账=**参考级**（仅披露不判）。
  3. **披露面成形**：报告固定尾行 `prose-density`（Lexi PR 尾表先例——纯披露不阻断），数字必须来自**确定性计数器**（正则/分句规则），模型只解读不生成数字。
  4. **三设防（立法级负向）**：①尾行**只披露不设目标值** + 「不为计数改写既有文本」条款（dekobon 措辞）——防 Goodhart/uniformity slop；②承重句式豁免**逐条声明用途**（长句须点名承载哪个裁决点），禁给文档类型发整体豁免牌照；③**计数禁入生成指令**（documentstats：生成时注入活指标诱发 metric gaming）。
  5. **负向**：禁机械评分代理（中文无公式，机械层只计数）；禁目标值；禁整类豁免；禁 blocking/gate 化（ASD-STE100 40 年=规则+人判裁量，非裸计数）。
- **显式约束/负向需求**: 与 D-004 词面同属 Grandiosity（虚饰输出）语义的两面：词面=未注册承重词生命周期未闭环、句式面=结构层晦涩计数披露；同属收词分诊通道的两个探测族；载体同归 ADR-0098 候选。
- **状态**: current
- **调研凭据**: atomcode Q5 run 2026-10-07（单次跑通；10 searches Exa+AnySearch 双引擎（Tavily 尽）、7 篇一手全文=asd-ste100.org about+Issue 9 目录、Rebilly/lexi 仓库、docs.vale.sh、platform.claude.com Fable 5.1、DHK《Just say no to STE-100》全文、developers.google.com sentence-structure、STE 执法成本研究；中文可读性=西南大学句法易读性研究+对外汉语公式摘要）。**⚠️ 本轮 atomcode 未读到本地仓**（沙箱 cwd 不在 D:\Aworker\jiahao——其 §0 本地证据面声明如实披露），current 冲突核查由呈报方对照账本补做，结论=零 revised。


## D-006 — Q-t39 处置-证据闭合三活例裁处（Q6 atomcode 改形版采纳：(a) defer-0089 兑现 / (b) 可选字段+一次迁移 / (c) prose 三元+腿否决）

- **原问题**: t38 LOOP 交接 §5 三活例——(a) 登记声称反向核验（ADR-0096:51 虚报 deferred 行）、(b) 有界断言承接无界义务（defer-0088/F-9 登记未测）、(c) 仪器自述一致性（run-gates 摘要头 54 vs 腿级 53 ±1 错报）；处置形+载体+存量回填。atomcode 呈报改形版后选项 a=全案采纳 / b=调整某例 / c=其他。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案。
- **规范化需求**:
  1. **(a) 落点=defer-0089 兑现**（非新枚举面，t37-D-001 一轮不建两个枚举面直接适用）：prose 约定「声称登记须引 row id」+机械存在性检查（row id 在 claim 锚 commit 内可解析）；ISA 315/AS 1105 先例=声称与记录双向可对账，本仓缺 prose→registry 单向机械前推。落 ADR-0099 §P-A，`source_adr` 指 0099（ADR-0058 R3 形先例）。
  2. **(b) `check_channel` 可选字段**（非必填）：expand-contract additive（K8s CRD 先例——required 只保写入完整性）；存量行缺失=**黄披露非红**（防 90+ 行全体打红=alarm-fatigue/ADR-0064）；通道三选一枚举（gate leg / owner-only 标记 / 机械 trigger），**扩枚举规则须预注册**（第四通道出现须 countersign，ADR-0086 fenced）；字段 editorial/fenced 分类=**owner 裁**；schema+check-deferred.js 验证+存量标注+wiring test **同 commit 原子落地**（ADR-0089 D-G 同族）；落 ADR-0099 §P-B。
  3. **存量回填=一次性迁移非常设通道**：`backfill --dry-run`→清单→owner 确认→单 commit；禁 agent 周期回填（ADR-0089「classifier NEVER writes」同律）；**禁 partial backfill**（部分回填=schema complete 声称 vs 实际数据自指复发）；成本超预算预注册降级形=「新行必填+存量缺失黄披露+trigger 侧棘轮（缺失行不再获新 trigger 权）」，禁砍成本砍义务。
  4. **(c) 拆裁**：prose 锚条款扩展为**三元**（值+run_id+**仪器口径名**，ADR-0096 §P-1 精化非改向，t38-D-003.7 精化句先例；Prometheus `level:metric:operations` 口径入名/K8s observedGeneration 同构）+**摘要头与腿级口径差的黄级披露义务**；落 ADR-0099 §P-C。**summary==legs 计数一致性腿本轮否决**：双口径各自为真（非聚合上下级）、撞 t38-D-006.8 禁双计数器、成本未实测；挂 **defer-0091/F-11 同 anchor** 等首真实 declared-vs-inferred mismatch 病例再议。
  5. **载体=独立 ADR-0099「处置-证据闭合」**，三节（§P-A/§P-B/§P-C）每节可独立修订（t37-D-006 bundling 防线）；否决「拆 AGENTS.md+schema 变更」载体（convention 面装 contract 面违 ADR-0083 D-C）。
- **显式约束/负向需求**: 禁新建第 5 类枚举面绕开 defer-0089；禁必填字段形；禁一致性腿本轮立法；禁 partial/周期回填。precedent 记录：「处置的正确载体是兑现既有 deferred 行而非新建」本轮第二次出现（首次=Q4 defer-0091 同 anchor 合并）。
- **状态**: current
- **调研凭据**: atomcode Q6 run 2026-10-07（单次跑通，本地仓读取恢复成功；9 searches Exa+AnySearch（Tavily 尽）、6 篇一手=PCAOB AS 1105、ACCA ISA 315 assertions、kubernetes.io api-concepts+CRD versioning、prometheus.io recording rules、developer.hashicorp.com 字段迁移、ByteLedger 债务登记批判 + 本地 ADR/registry/scripts 全核）。缺口如实：SOX 404 实务层仅二手；存量 90+ 行补字段成本未实测（预注册降级条件兜底）。


## D-007 — 收尾打包：prep lane 三动词处置 + owner 四项逐项分诊（Q7 atomcode 修正版采纳）

- **原问题**: 题一 `grill-t39-prep` lane（2df61d4e 三文件：rewrite-map/orphan-cites/loop-handoff §7-8）处置三选一；题二 owner 四项裁量打包形（i 清单 / ii registry / iii 混合）。atomcode 呈报修正版后选项 a=全案采纳 / b=调整 / c=其他。
- **我的原回答原文**: 「采纳」——即呈报选项 a：修正版全案。
- **规范化需求**:
  1. **prep lane 三文件三动词**：`.scratch/grill-t38/handoffs/2026-10-07-loop-handoff.md` §7/§8 **落地**（叙事=D-002 事实底稿，文末可加一行指针「resolved by grill-t39 D-002」——未提交文本编辑不涉 committed-prose 纪律）；`docs/rewrite-map.json` **丢弃 hunk**，D-002 落地收尾时**最后重生成**（E-17 波序+ADR-0089 D-G 可再生产物地位）；`docs/governance/orphan-cites.json` **丢弃 hunk 但经 `register` 显式动词重登记**（fe190b65 登记仍有效必要）——**严禁**把登记面当派生工件「重生成」（ADR-0089 D-D：append-only 声明面、classifier NEVER writes、登记是 deliberate act）。
  2. **落地序次立法级写明**：叙事/机制先落、map 最后重算、`--check`+`--published-only` 双净后声明；D-002.5 同 commit 原子律=「先叙事后派生」是 **commit 内步骤序+紧邻 commit 序**，不许拆原子 commit。
  3. **owner 四项逐项分诊（iii 混合）**：①pack cap 重推导（size+entryCount+同 commit ADR-0039 D3）=**清单行**（一次性 owner 签署 act，新 registry 行=双计数器）；②post-land 「波已 settle」时点=**清单行**（常设裁量权非 pending decision，塞 registry=错发 review date，t35 Δ3 评估型 vs 断供型语义边界）；③audit-surface 两出路=**混合**（清单具名两案并列写代价——机械 act vs 立法级 + registry 行带 trigger——唯一真 pending decision；只清单=无期限警告=抑制债务 ADR-0089 D-E 阶段2；只 registry=阻断性决策埋进按季轮询队列）；④F-5/F-11 `review_at` 偏离+P1-9 `runner_ctx` 残量=**清单指针**（ADR-0096 Registered transfers 已注册待 owner 裁，新行=对 defer-0090/0091 双计数器）。
  4. **呈报义务**：owner 裁量点呈报须备齐选项+冲突+代价（D-001.4「只产呈报材料与选项，agent 不代签」）；audit-surface 两条出路差异是立法级 vs 机械级，清单里须并列代价不可默认倾向。
- **显式约束/负向需求**: 禁整 lane 原样落地（落即过期）；禁整 lane 丢弃（证据链断档）；禁四项全走清单（第 3 项欠登记）；禁四项全走 registry（一次性项错发 review date+双计数器）。呈报记录：本次呈报被调研纠出 ADR-0089 D-D 分类错误（登记面误归派生面）——本轮第二次先例级措辞险，如实入账。
- **状态**: current
- **调研凭据**: atomcode Q7 run 2026-10-07（单次跑通，本地仓读取成功含 lane diff 全量；外部一手=GoodTurn rebase 工作流、Gallery upstream-rebase 流程、agent-config 派生合并惯例、Read the Docs `Needed: design decision` 语义；反流披露=golang/protobuf 刻意提交生成物派——本仓地图属「committed claim 面带 freshness leg」，适用纪律=绝不提交过期生成物）。


## D-008 — 载体收口：四 ADR 分域 + spec-t39 总谱 + 落地序与红窗预注册（Q8 atomcode 呈报采纳）

- **原问题**: 载体收口——D-002 载体三选（①独立 ADR-0100 / ②并入 0099 §P-D / ③ amend 0085 或 0089）+ 四域分案确认 + 落地盘点核查。atomcode 呈报后选项 a=全案采纳 / b=调整 / c=其他。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案。
- **规范化需求**:
  1. **四 ADR 分域**（各管一 force-field，每节可独立修订 t37-D-006）：**ADR-0097**「上游借鉴收编」（D-003 十项）；**ADR-0098**「Grandiosity（虚饰输出）第五语义」（D-004/D-005，词面+句式面双探测族+收词分诊通道+排除域+披露尾行）；**ADR-0099**「处置-证据闭合」（D-006 §P-A/§P-B/§P-C）；**ADR-0100**「可变 claim 面治理」（D-002 append-only+漂移注册表+腿 224 分类器输入改造）。
  2. **D-002 归 ADR-0100**：对 ADR-0085 `claim_surfaces` fenced 枚举收窄走 **scoped-supersession 指针**（ADR-0089 对 0074 先例形：「Supersedes (scoped): …only」新 ADR 内声明不改旧文）+ ADR-0086 fenced 通道（ADR+countersign）；候选②（并 0099 §P-D）否决=跨 force-field bundling；候选③（amend）否决=Accepted 记录不可原地改。
  3. **落地序**：ADR-0100 先于其实施（ADR-0095 D-B 同 commit 普遍条款）；兄弟载体序照 t38 先例（立法载体先落、机制载体后落）；D-002 三件套（任务书 append-only 改造+漂移注册表+224 分类器输入）**单 commit 原子**。
  4. **红窗预注册**：腿 224 的 8 行缺失红窗在 D-002 落地前持续存在——预注册「轮中间态可红、披露不修」（intermediate commits may be red, disclosed not amended）；四个 ADR 的各自 claim commit 均守 E-17 波序。
  5. **双枚举面边界论证预注册**：漂移注册表（claim 面治理域）与收词分诊通道（文风分诊域）是同轮两个**不同 force-field** 的新枚举面——论证句分落 ADR-0098 与 ADR-0100 边界声明节，防事后被判 t37-D-001 bundling。
  6. **spec-t39 总谱定位**：sole drafting specification 非权威源（权威=ADR+账本）——spec 内须显式写此句；D-002 划界句落 ADR-0100 正文不落 spec。
  7. **落地盘点**（随 spec 起草期逐项钉）：文档波=四 ADR+CONTEXT.md 词目（Grandiosity/Unregistered Coinage/收词分诊通道/prose-density+Jiahao-style Behavior 第五条）+AGENTS.md 条款（声称登记引 row id、prose 三元括注、prose-density 尾行、强度档 generator 侧约定）+deferred 行族；实现波=收词分诊器（词频+句式双探测族）+check-deferred.js `check_channel` 验证+defer-0089 兑现存在性腿+D-002 三件套原子改造；**verifier 零新增**；owner 移交清单按 D-007.3 四项分诊。
  8. **精化非改向声明**：「ADR-0099+ADR-0100 兄弟载体」=对 D-006.5 的精化（0099 收编的是 D-006 三活例，不含 D-002）；D-001.2「二选一」由 D-002 承接已在 D-002 声明。
- **显式约束/负向需求**: 禁 amend Accepted ADR；禁跨 force-field 并节；禁 spec 吸权成第二立法面；禁 224 红窗静默（须预注册）；禁两枚举面同族化陈述。
- **状态**: current
- **调研凭据**: atomcode Q8 run 2026-10-07 session a33d43a6（单次跑通，本地仓全读成功；外部一手=learn.microsoft.com ADR 组织惯例、martinfowler.com、docs.cloud.google.com、learn.openapis.org、adr.github.io/Nygard 派、nntp.perl.org 伞形 RFC 讨论、incan.io；缺口：伞形 RFC 无主流组织成文规范——本仓 spec-总谱惯例已内化五轮，不影响裁决）。
