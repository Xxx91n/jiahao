# grill-t25 decision ledger

Round: V6 critique response (shape TBD). Grill rules: one question at a time; every confirmed decision appended immediately; ledger current before any compaction/handoff.

## D-001 — 轮对象初答：公开克隆坐标 + 全处方清扫（a+b）

- **原问题**：Q1 — V6 锐评响应的轮对象取形（a 公开克隆坐标轮 / b 纯处方清扫轮 / c 只修红 / d 其他）
- **我的原回答原文**：「a+b，将当前问题提交 atomcode-research 深度调研……」（同消息附带调研指令）
- **规范化需求**：公开克隆坐标工作与六处方清扫均入范围；拓扑形态待 atomcode 调研辩证后定
- **状态**：revised —— 调研裁决为三轮制（坐标/清扫/人类权威不可单轮混装），由 D-002 承载修正形态

## D-002 — 轮拓扑：三轮制（坐标轮 → 清扫轮 → 人类权威轮）

- **原问题**：Q1′ — atomcode 修正形态裁决（a′ 三轮制 / b 坚持 a+b 单轮 / c 其他拆法）
- **我的原回答原文**：「采纳」
- **规范化需求**：
  1. **轮 1 = 公开克隆坐标轮**：tip evidence-only re-capture 波（captured-at-head 指向落地 tip）+ push 锚定 tag（annotated，ADR-0069 D-C；tag 与 commit SHA 同册——tag 可变 digest 不可变）+ rewrite-map 克隆可降级（capability probe：旧侧 refs 缺失则 exit-2 UNVERIFIABLE + --published-only 模式验内部一致性）+ ADR-0083 D-E 第四强制审计线「public-clone jest + gate:all green at tip”；**验收必须从公开克隆实跑**，非本地 object store
  2. **轮 2 = 清扫合并轮**：五条克隆红修复余项 + CI 残红入册 + secret-scan 第四枚举面（commit message）+ Re-Execution Prior 对 bbf5259 的分诊登记 + countersign 队列**降级标注**（机械部分——ID-level-only 如实标注）
  3. **轮 3 = 人类权威轮**：renew-or-expire 显式决断（执行或**带到期日**的登记豁免）+ countersign 队列实体级签字或正式降级 + 棘轮制动四判据采纳为元规则；agent 在此轮的角色=最小批准包起草者，非决断者
  4. 轮 1 是后续一切证明的宇宙定义，轮 2 须紧贴轮 1（上轮验证点未闭环的账目不拖延恶化）
  5. 棘轮制动判据（入册为元规则，轮 3 议程）：(i) 新装置登记时须登记其消除的旧装置/检查；(ii) 新规则须声明适用域；(iii) 「停用此装置上轮同类事故会漏吗」为降级判据；(iv) **修复产洞比率本身入册为指标**，连续不降触发装置清算议程
- **显式约束/负向需求**：
  - C3 renew-or-expire 与 C4 实体级签字**不得由 agent 代行**（HITL：提议+暂停或显式登记降级；禁勘误注记式静默豁免——豁免须显式+到期日）
  - 合并判据：不变量是否改变 / 是否共享验证面 / 是否需人类权威——三轴定轮界，不按报告同源合并
  - push（tag/分支）为外部副作用，须显式授权点
  - 清扫轮的登记动作不发明新装置（登记是记账，不是新棘轮齿）
- **状态**：revised —— 条目 1 的「ADR-0083 D-E 第四强制审计线」载体被调研判为规范扩展非 errata：0083 仅可原地加指针行，条款正文在 ADR-0084。三轮拓扑与其余条目不受影响，修正由 D-003 承载## D-003 — 轮 1 形态终稿：两段式（止血提交先行）+ 载体修正（待拍板）

- **原问题**：Q2 — 轮 1 边界与载体形状（α 全包 / β 拆两半 / γ 直改 0083），提交 atomcode 辩证后呈报
- **调研裁决**（置信高，四判据均 ≥2 独立源或知识库+联网双路）：
  1. **止血与机制同轮两段、提交隔离**：evidence-only 重捕获提交先合（公开 tip 归绿，可独立 cherry-pick/revert），机制面后续独立提交——SRE「先止血后根因」的弱化版（非活跃 incident 不需跨轮分离）
  2. **载体修正（与 D-002 冲突点）**：克隆可降级契约 / 第四强制审计线 / 落地尾惯例三条款=新规范内容，开 **ADR-0084**；旧 ADR-0083 只允许**原地加指针行**（「audit line added by ADR-0084」一类）——RFC errata 先例：errata 永不并入原文，规范扩展非勘误；与仓内 ADR append-only 惯例（atomcode-r6-28：白名单=错字/死链/状态字段/指向新记录的链接）一致
  3. **轮级不变量测试本轮重滚副本**（t25 自己的 BASE/EVD），泛化持续监控显式记 deferred——fitness function 惯例：先钉最小可自动化不变量，泛化非验收轮 critical path
  4. **验收证据须第三方可复验**：干净 `git clone` 实跑 jest+gate:all，捕获三件套（命令/输出/环境）归档——SLSA provenance 模型：证据价值在消费者可重建
  5. **轮 1 内部落地顺序**：(a) 重捕获止血提交 → (b) 验证器降级+机制提交 → (c) ADR-0084+0083 指针行 → (d) push adjudicated tag+SHA 同册 → (e) 干净克隆实跑验收
- **冲突说明**：D-002 条目 1 原文「ADR-0083 D-E 第四强制审计线」按字面读=把审计线正文写进 0083——调研判为规范扩展（旧 ADR 发布时该线不存在），须改为指针行；D-002 三轮拓扑与其余条目不受此修正影响
- **我的原回答原文**：「采纳」
- **状态**：current

## D-004 — 落地通道与授权粒度：分通道 + 例外狭窄声明（β′）

- **原问题**：Q3/Q3′ — 轮 1 落地通道（α 全 PR / β 止血直推+机制 PR / γ 全直推），提交 atomcode 辩证后呈报
- **我的原回答原文**：「采纳」（对 atomcode 修正形态 β′）
- **规范化需求**：
  1. **止血类直推 main**（evidence-only 重捕获波 + 克隆红修复必需的验证器降级代码）：由用户执行 push，commit message 带轮标识（break-glass audit log 等价物）；满足 hotfix 三要件=紧急/面小/后置审（clean-clone 验收兜底）
  2. **规范面走 PR**：ADR-0084 + ADR-0083 指针行 + 记账类提交——规范承诺恰是最需 review surface 的 diff；evidence-only 走 PR 实测不破绿，速度论据不成立
  3. **tag 始终人类 push**：merge/直推落地后执行；annotation 由用户手写=最小审查动作；tag=独立权限档（GitHub Maintain/Admin 惯例），不复用不下放
  4. **例外狭窄声明进 ADR-0084**：直推仅限「止血类重捕获/克隆红修复提交」，逐轮披露，不泛化（NIST：例外通道不得漂移成常态——棘轮风险只能靠披露纪律挡）
  5. **tag push 时限声明**：同轮内落地，接受其依赖用户在线的事实（无行业基准，自定义约定）
- **显式约束/负向需求**：
  - 机制变更与捕获不得塞同一提交（锚定提交会让捕获戳落后锚=红）——顺序：机制 commit 先、捕获 commit 后；中间红态如实披露
  - merge 权限与 tag push 权限均为用户显式动作，agent 不代行（gh-aw 形态：agent 起草/推分支，人类 merge/tag）
  - 禁橡皮图章化：规范面不经 PR 即落入=批处理式机械放行（γ 驳回理由）
- **状态**：current

## D-005 — 轮 2/3 槽位与登记清单终稿（a′ 全采纳+四精化）

- **原问题**：Q4/Q4′ — 轮 2 清扫槽位与轮 3 人类权威包形（a′ 全采纳 / b 分诊判机械故障 / c 其他），提交 atomcode 辩证后呈报
- **我的原回答原文**：「采纳」
- **规范化需求**：
  1. **轮 2 清扫包按 a→c→d→b 序**：
     - (a) CI 红史入册：deferred-registry 条目+discharged 注记+登记日期，**带 owner+复核日期**（防登记册腐化）；不改任何已发布快照（SEC 4310.17：补登记=标准动作）
     - (c) Re-Execution Prior 分诊：`bbf5259` 判**方向性事件，单独登记**（首个内部披露通道案例；先验 n=19 不动）；边界规则入 ADR-0084：**按首次披露通道归类，事后独立复证不复判，机械故障主张须举证提交不含对先前声明的否定**
     - (d) countersign 队列 10 项加 "ID-level-only, awaiting entity-level" 标注，**附回头条件/到期日**（防降级变永久豁免）
     - (b) secret-scan 第 4 枚举面=commit message，排末位；如实注明 GitHub 官方枚举面不含 commit message 本体（增量依据）
     - 泛化不变量监控登记新 defer 条目
  2. **轮 3 人类权威包**：renew-or-expire 三选项模板（续期带到期日/到期注销/带到期日豁免登记=accept-with-expiry 惯例）；countersign 队列签字或正式降级二选一强制化；**棘轮制动四判据进章程层**（CONTEXT.md/AGENTS.md 元规则区）+评审议程引用——禁进指标层（dashboard 调整可静默稀释）
  3. **轮 kind**：轮 1/2=fix（R2 手改须带 governance_tooling_diff，ADR-0078）；轮 3 无代码 diff
- **显式约束/负向需求**：
  - 先验计数永不原地改数（v2 快照不动，方向性事件走单独登记）
  - 降级标注不得被后续轮引为「已处置」证据（须附回头条件才有语义）
  - 元规则放指标层=禁（修订门槛是唯一保险）
  - 登记册新条目必带 owner+复核日期
- **状态**：current
