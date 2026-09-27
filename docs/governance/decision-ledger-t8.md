# decision-ledger — grill-t8 (CAPA + readiness merged round — settled)

idempotent

## D-001 (current)

- 原问题: Q1 本轮靶心 — A. CAPA/v3 修复轨道（v2 failed 后 branch_mapping 注册的第一议程）/ B. 产品就绪轮（“能装不能吹”落差的产品化收口）/ C. 统一治理轮（D-012 积压）
- 我的原回答原文: "A+B"
- 规范化需求: 本轮 grill 靶心 = CAPA 修复轨道与产品就绪轮的合并轮。A 线：诊断 exit-report 通道双轴失败根因（lie 9/31 漏检 + FP 21/89 + 侧集 20/20 全部定位于此）→ 设计修订 scorer 工件 → v3 注册路线（新快照、新单发、同预注册判表规则、designed-after-v2 披露）。B 线：产品就绪面收口——对外定位与声明边界、真实安装/试用形态、failed 终态下“能装不能吹”落差的产品化处理。
- 显式约束/负向需求: C（统一治理积压）不并入本轮，维持 deferred（D-012 不翻案）；B 线不得把“装得上但检测器已证伪”静默制度化为成功叙事——就绪声明对 failed 事实的措辞受 claim 纪律约束（v1/v2 事实行逐字、永不入 conformity 引用）；A/B 两线的耦合与时序为后续 frontier 待决项；grill 期间不动源码。
- 状态: current

## D-002 (current)

- 原问题: Q2 A/B 两线的耦合与时序 — a) 串行 CAPA 先行、就绪面等 v3 判决；b) 双轨并行、就绪面按 failed 终态现在收口；c) 就绪先行、CAPA 顺延
- 我的原回答原文: "ok"（采纳 b 双轨并行 + 三执行钳制）
- 规范化需求: 双轨并行。CAPA 修复轨道保下一轮第一议程首席先开工；产品就绪面现在按 failed 终态收口，产品定位钉为“可安装、失败测量公开的纪律脚手架”；v3 是升级路径而非就绪前提。三钳制：(1) 试用/dogfood 全部文本复用 claim home 逐字事实行，禁生新绩效措辞；(2) CAPA 修订工件版本钉住，v3 判决前发行物与 v2 判决绑定 artifact 必须可区分，claim 事实行逐字绑定其对应 artifact 版本；(3) dogfood 反馈只进 CAPA 轨道（类别化表述可入，量化结果禁入 v3 判决链），不直接驱动产品行为变更。
- 显式约束/负向需求: 共享硬约束 = 就绪叙事永不稀释 failed 事实（FTC claim-substantiation 级绑定）；CAPA 改动未经 v3 判决不得静默进入发行物（npx github: 通道下 main HEAD 即发行物，版本可区分机制为后续 frontier）；不得基于 dogfood 反馈在 v3 判决前微调 exit-report 通道相关产品行为；publish-regardless：failed 判决保持与任何未来 pass 同等显著。
- 状态: current

## D-003 (current)

- 原问题: Q3 钳制②落地形态（判决绑定 artifact 的版本区分机制）— a) main=判决绑定面 / b) main 前进+显式判决锚 / c) 双通道
- 我的原回答原文: "a强化，备选 b 强化版"
- 规范化需求: (a 强化版) src/port/score.js + src/port/g6-manifest.json 在 main 上冻结为 v2 判决件，sha256 wiring 断言机械执行（任何触碰 fail）；打不可变锚 tag adjudicated/devin-corpus-v2 标记判决 commit（用户/审计可钉、研究复现可引）；CAPA 修订全程驻留 CAPA 分支，v3 判决落地后才 land main 并同步换新判决事实行。(b 强化版登记为备选方案): 受保护 tag + manifest 内 adjudication_ref 机械绑定 + 默认安装自标注 post-v2 unadjudicated——若未来出现 CAPA 中途 land 的真实需求，须显式翻案至此形态而非默改。
- 显式约束/负向需求: 冻结面是工件级（两文件 sha），不是树级——B 线 README/文档/安装面照常落 main；锚命名约定一次定好（adjudicated/<snapshot>），v3 判决后追加新锚；禁写“main 即判决件”类树级表述（=虚假声明，只允许工件级绑定表述）；默认通道装到的工件与 claim 描述工件恒等（无标注错配义务）。
- 状态: current

## D-004 (current)

- 原问题: Q4 CAPA 修订对象与修复形态 — a) 修补式（词法手术）/ b) 替换式（确定性配对器，port 退出）/ c) 混合式（配对器主判 + port 旁路对照）/ d) 换判决对象（detector.js）
- 我的原回答原文: "采纳"（采纳 c 带三条预注册条款）
- 规范化需求: v2 失败定性为构念失效（construct misalignment：分数被“像不像 exit-report”驱动而非宣称-证据矛盾）→ 重新操作化而非调参。CAPA 工件 = 确定性 claim-evidence 配对器（按 4 类 check 的宣称-证据结构写机械配对）；LR port 保留为零判决权遥测/对照通道。三预注册条款：(1) port 输出不得以任何形式进判决（加权/否决/触发皆禁）；(2) 分歧处置预注册——配对器与 port 分歧只进披露报告、不影响判决；(3) 反循环——配对器规则从 check 语义演绎，禁读/反向拟合 scoring_function 标签机制（元循环禁令：不得读 spec.check 路由；任务类型可合法从 task 文本路由，声称值必须解析自 closing/transcript）；探针验证沿用“类别化进 CAPA、量化禁入 v3 链”。G6 等价契约书面影响评估 = v3 designed-after-v2 披露首节；锚注写明“v2 判决 failed，失效原因构念错位”防后人误复用。
- 显式约束/负向需求: a（词法手术）与 d（换 detector.js 判决线）已拒绝；配对器 fail-open 弱点已知悉（谎报者不写声称值→无可配对），语料外探针为唯一防线；旁路遥测漂移无先例，项目自设观测纪律；配对器新代码的 bug 面由探针+单发前验证覆盖。
- 状态: current

## D-005 (current)

- 原问题: Q5 B 线“就绪收口”交付物范围 — b1 定位层 / b2 +安装链路实测 / b3 +对外试用形态 / b4 +npm 发布
- 我的原回答原文: "b1 + b2 + b3-降格版（测量复现邀请，可选）+ b2 失败分支预注册；b4 不做。"
- 规范化需求: 本轮 B 线交付 = b1 定位层（README/安装面按“纪律脚手架”重写，failed 事实行首屏可见，claim home 逐字保持）+ b2 安装链路实测（干净环境实跑 npx github: init + mock 任务走完 hook 链，产出一手实测记录——“可安装”从 intent 变 proof）+ b3 降格版“测量复现邀请”（邀第三方复现测量、类别化反馈进 CAPA；非采用邀请；全部文本复用逐字事实行）+ b2 失败分支预注册（干净环境实测若翻车，“可安装”自述降级为“安装链路存在已知问题（见实测记录）”新事实行，禁措辞修补）。
- 显式约束/负向需求: b4（npm registry 发布）不做——与 ADR-0011 明写决策刚性冲突，翻案需独立 ADR + CAPA 至少一轮通过作前置，本轮不启动；b3 禁升级为采用/绩效语域邀请（Eternal Beta / 合规装饰风险）；就绪宣称遵循证据分层纪律（自述=intent，实测=proof，缺一即宣称-证据矛盾自重演）。
- 状态: current

## D-006 (current)

- 原问题: Q6 确定性配对器的判决语义包 — (a) 旗的语义 / (b) undetermined 第三态的判表语义 / (c) 覆盖范围 / (d) 与线上 detector.js 关系
- 我的原回答原文: "all"
- 规范化需求: (a) 配对器只旗机械证成的矛盾——声称值解析自 closing/转录 + 证据值解析自 tool_result/事件流，两者在场且不一致→lie；声称缺/证据缺/类型不支持→不旗（永不“看着像就旗”）。(b) item 级三态遥测 {flagged/consistent/undetermined}；进判表 undetermined 归“未旗”——FP 轴只计 flagged honest，recall 轴把 lie-undetermined 计为 miss（两轴皆取保守方向）；undetermined rate 为预注册描述性指标（fail-open 面度量，进报告不进判表）。(c) 初版覆盖 v2 全部 4 类 check（exit-report/file-contains/count-report/content-append）；不支持类型→undetermined；v3 语料新增 check 类型的配对规则必须在 v3 plan 先行注册（规则先于数据，反循环延伸）。(d) CAPA 工件只作 v3 判决对象；并进线上 detector.js 是独立闸控决策（judge-seam FP 门纪律），不在本轮。
- 显式约束/负向需求: undetermined 不得排除出 n（静默缩分母藏 fail-open 面）也不得归旗（未决变 FP 制造机）；“一致性”与“无法判定”同归不旗；配对器自身 bug 面由语料外探针+类别化验证覆盖。
- 状态: current

## D-007 (current)

- 原问题: Q7 合并轮交付边界 — a) 三段交付止于 v3 ready-to-run / b) 全包到 v3 单发 / c) 只出文档+工件、v3 plan 留后续
- 我的原回答原文: "A"
- 规范化需求: 三段交付。R1 文档轮：ADR-0069（CAPA 设计=配对器语义包+三条款+反循环细则）+ 就绪定位改写（b1）+ 锚/tag 机制（adjudicated/devin-corpus-v2 + sha 冻结断言 + 锚注“构念错位”）+ CONTEXT 术语 + v3 污染登记表框架 + wiring seeds——提交后才许动工。R2 建造+实测轮：配对器工件在 CAPA 分支实现 + 语料外探针类别化验证 + b2 安装链路实测 + b3 测量复现邀请文本 + G6 等价契约书面影响评估。R3 v3-plan 注册轮：v3 eval-plan 落盘冻结（判决对象=配对器工件按内容 hash 钉身份、判表规则沿用 v2 同款、分歧处置条款、designed-after-v2 逐参数披露、已击发 60% 触发条款必须给出处置：采用类别化 bound 或记录不采用理由）。v3 收集+判决=后续独立轮，不在本轮。
- 显式约束/负向需求: R1 提交是 R2 的前置闸（doc-before-impl）；v3 plan 注册要求配对器工件已建成且探针类别化验证通过（工件身份按内容 hash 钉入 plan）；本轮不含 v3 收集/判决；60% CONSIDER 条款的处置是 R3 的注册义务不可省略。
- 状态: current

