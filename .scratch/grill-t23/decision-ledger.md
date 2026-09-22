# grill-t23 decision ledger

## D-001
- 原问题：Q1 — 轮对象与 cap 约束的咬合形状（a. cap 感知门面轮[README.md 净 delta<=0] / b. cap 修订先行轮[ADR-0062 D-A 通道] / c. 同轮 cap+门面[驳回] / d. 纯包外轮[驳回]）
- 原回答原文："a+b"
- 规范化需求：t23 同轮携带两条工作流且顺序受 defer-0067 强制——(1) 先执行 cap 修订预注册通道（ADR-0062 D-A：政策 ADR → 钉协议重测 → 定值 → second_reviewer 会签），修订 ADR 落地；(2) 门面工作在恢复余量下展开（README 双语重构 + 视觉系统 + 包外资产 + repo 元数据 + .github 模板）。defer-0067 经修订分支销项。t22 审计工件 setup 吸收，T3-C-1/2/3 三 nit 按类处置，C-7 回看 tick 2/2 登记。
- 显式约束/负向需求：cap 修订必须走完整预注册通道（policy-before-value——先政策 ADR 后定值，禁止直接改数）；second_reviewer 会签须真独立（与被否的 c 方案之分野：c 是同轮自封修订，a+b 是通道全步骤照常执行的两段式同轮）；任何增面提交须待修订 ADR 落地后；通道未落地前 README.md 侧仍受净非增长约束。
- 状态：current

## D-002（约束条"纯 SVG 为唯一视觉实现路径"经 D-005 部分修订）
- 原问题：Q2 — 门面范围构成（a. 全谱：README 双语重构+视觉系统+纯 SVG 品牌资产+repo 元数据+.github 模板 / b. 视觉主线减模板 / c. 仅 README / d. 仅资产[驳回]）
- 原回答原文："a"
- 规范化需求：t23 门面工作流为全谱五件——① README.md 视觉重构（beautify README 模式：hero/图示/结构收紧/徽章）；⑤ README-zh-CN.md 镜像同步（ADR-0079 强制随动）；② 品牌资产走纯 SVG 路径（logo.svg/hero.svg/social-preview.png，repo-logo 栅格管线因本环境无通用生图模型不可用而禁用）；③ repo 元数据（topics/About/social preview）；④ .github/ 模板（ISSUE/PR template）。
- 显式约束/负向需求：纯 SVG 为唯一视觉实现路径（无栅格生图）；③属 GitHub 库设置外部副作用，授权粒度另题定夺；④模板语种属执行面；README 重构仍守 readme-crafter 质量条（更短更清晰，不虚构证据）。
- 状态：current

## D-003
- 原问题：Q3 — 修订值推导规则（a. 沿用钉死公式 ceil_to_10_000(M×1.10)→380,000 / b. 加宽边际[驳回] / c. 只压缩不修订[驳回，违背 D-001]）
- 原回答原文："a"
- 规范化需求：修订 ADR-0082 先行落地于门面工作之前——政策陈述沿用钉死惯例公式 cap=ceil_to_10_000(M_latest×1.10)；M=修订时按钉协议（npm pack --dry-run --json size field）重测当前值 ~339,408；推导新 cap 380,000；second_reviewer 槽按 0066/0071 先例 deferred 入 tide（下轮二审窗销，新 defer 行登记 review_at）；defer-0067 经修订分支销项；修订动面全在包外（docs/adr/ + ADR-0039 D3 文本）零 cap 成本。
- 显式约束/负向需求：禁止偏离钉死公式自定边际；修订落地前 README.md 侧仍禁增面提交；若门面实际增长超 ~40KB 余量则触发新一轮修订而非压缩搪塞；修订 ADR 须携带 not-a-retro-application 声明（通道条款 c）。
- 状态：current

## D-004
- 原问题：Q4 — README 重构深度与重型节处置（a. 视觉刷新+保留式瘦身 / b. 全重构[驳回] / c. 纯视觉层[驳回]）
- 原回答原文："a"
- 规范化需求：README.md 信息架构不动——失败判定保持首屏显著位（身份信号不埋）；新增 hero/视觉层；measurement record 压缩为可扫读表（verdict/date/corpus/链接），保留全部判定事实；architecture 压为一张图+摘要，深文链 docs/（包外）；README-zh-CN.md 同构镜像。
- 显式约束/负向需求：禁止把诚实前置结构磨成常规产品页序；压缩零事实丢失（页内或一跳可达）；若移出内容落 docs/ 须按 ADR-0076 面分类登记披露；双语文案同步非后补。
- 状态：current

## D-005
- 原问题：Q5 — 视觉方向与动画（a. 机制即图腾·全静态 / b. a+GIF / c. 人格化 / d. 极简排印[驳回]）
- 原回答原文："a，但是我们其实是想生成一个jiahao的品牌logo，让gpt image 2.5生成出来（主要需要提示词给我）主要图标风格是现在网络上流行的嘉豪口罩的形象，简笔画风格参考https://github.com/DietrichGebert/ponytail/blob/main/README.md的图标资产 ， 嘉豪，网络流行词，原指对特定穿搭和行为的调侃：穿黑色卫衣、戴黑色口罩、做出一些中二的动作。常见模仿电子音乐表演动作、雨中漫步等行为。随着传播范围的扩大，它迅速脱离了原初的指涉对象，被贴上了年轻男性故作神秘、装腔作势、用力过猛的负面标签。 [5] 该词起源于2024年抖音名政阳不是羊的学生在教室模仿Alan Walker表演的事件，其伴随《The Spectre》音乐完成虚空打碟动作的视频意外走红；其内涵源于青少年表演欲的具象化表达。网友通过该词自嘲青春期的装酷行为，形成圈层认同。"
- 规范化需求：品牌 logo = 嘉豪 meme 本体形象（黑卫衣连帽+黑色口罩的神秘人，简笔画/一线画风格，对标 ponytail 仓 README 图标资产）；生成通道=用户侧 GPT Image 2.5（本 agent 产出结构化提示词，用户在仓外跑生图并回传成品）；生成产物按 repo-logo Phase 5-9 管线处理（≥2048 原图→1024 母本→light-theme 变体→派生矩阵→social-preview）；其余视觉资产（hero/图示/badges）仍走 D-002 纯 SVG 确定性路径；静态为默认。
- 显式约束/负向需求：修订 D-002 约束条“纯 SVG 为唯一视觉实现路径”——品牌 logo 一件走外部栅格通道，其余资产不变；生图须守 repo-logo 硬规则（透明背景声明/禁文字或文字逐字母/禁魔法词/16px 可读性核验/双色底核验）；logo 图元须映射仓库真实语义（嘉豪=反自以为是的人格化讽刺对象，非装饰）；视觉核验清单逐项过后才许入仓。
- 状态：current

## D-006
- 原问题：Q6 — repo 元数据与发布授权（a. 全权：gh 直改 topics/description+social-preview 产图指引 / b. 半授权[只出清单] / c. 零外部动作）
- 原回答原文："a，一个初始的资产刚刚已经生成就位：D:\NDM\generated-image.png"
- 规范化需求：执行轮内获授权以 gh 直改公开库元数据（topics/description 用 gh repo edit；social-preview 无 API——agent 产图+操作指引由用户网页执行）；分支 push 仍按仓规等用户指令；附带事实：初版 logo 栅格稿已生成于 D:\NDM\generated-image.png，待 Phase 6 核验与迭代。
- 显式约束/负向需求：push 不在授权内；social-preview 上传不伪造 API 路径；外部副作用仅限库设置写操作。
- 状态：current

## D-007
- 原问题：整理对账呈报——账本外结论清单（1. 资产落位 docs/assets/**[R3] vs assets/[R2+carve-out]；2. .github/ 模板=R2 必走声明 carve-out；3. 深色版 logo=白色贴纸轮廓程序派生；4. defer-0068 充任 ADR-0082 会签槽行；5. 初版稿 Phase 6 核验三缺陷为执行输入）
- 原回答原文："采纳"
- 规范化需求：(1) 品牌/门面资产落 docs/assets/**（R3 前缀免 carve-out，语义=文档资产）；(2) .github/ 模板触碰按 ADR-0076 D-B 声明 carve-out（carve_out_used:1 + governance_tooling_diff.files 逐件登记 + necessity 理由）；(3) 深色 logo 变体以白色贴纸轮廓程序派生（ponytail 实测先例），非再生图；(4) defer-0068 充任 ADR-0082 的 second_reviewer 槽行（deferred 入 tide，下轮二审窗销）；(5) 初版稿核验结论入执行输入：白底待程序抠图/favicon 走胸像裁切/深色版走 halo 派生。
- 显式约束/负向需求：禁止把资产落 R2 根目录以规避披露语义之外的动因；carve-out 守三闸（necessity/disclosure/burn-rate）；burn-rate 连续告警如实披露不阻断。
- 状态：current
