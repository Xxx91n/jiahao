# grill-t26 decision ledger

数据源纪律：本文件为 grill 结论唯一载体。

## D-001 — 轮对象：两轮分治，语义先行

- **原问题**: Q1′ — 轮对象终稿：两个活口子（锚定语义跑步机 + CI 红腿三套件）取形为何。候选 a′两轮分治 / b 单轮两相 / c CI 先行 / d 其他。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**: grill-t26 = 锚定语义轮——重设 captured-at-head 绑定语义，主候选为「双层语义：轮内时序绑定 + 终末封存界」（TUF timestamp/snapshot 角色分离 + 事件溯源 checkpoint + SOC2 覆盖期同构）；grill-t27 = CI 红腿分诊轮，兼作新语义收敛成本的首燃实测场；t26 期间 defer-0070 按 quarantine 模式如实挂账（仍执行、不阻塞断言面之外、owner+到期日）。
- **显式约束/负向需求**: 
  - 分治不合并——不变量变更与机械分诊不同轮（t25 合并轴字面优先；atomcode：用未验证机制压测自身成本是自指）
  - 反棘轮登记：新语义须登记其退役对象 = 「跨轮递归 invalidate 不变式」及其重捕获波次
  - per-round 命名空间与「绑捕获时点自身锚」各自不充分（atomcode 结论 4：前者只隔离不消波次，后者丢新鲜度可检性 stale≠invalid）
  - 审计报告自毒化无直接业界同构——语义须自定义，SOC2 bridge letter 仅作类比引用
  - 无在线密钥设施——终末封存界背书机制需仓内轻量替代（候选：evidence-log hash 链 / 既有 adjudicated tag 人类动作）
  - 人类权威事项不可由 agent 代行
- **状态**: current

## D-002 — 封存界载体：声明承重 + tag 同册背书（γ′ 五精化）

- **原问题**: Q2′ — 封存界（seal boundary）载体：α tag 独任 / β 提交内声明独任 / γ 声明承重+tag 同册背书 / δ 其他。
- **原回答原文**: 「采纳」（采纳 γ′）
- **规范化需求**: SEAL 机械载体 = 轮目录提交内声明（候选形如 .scratch/grill-tNN/SEAL，钉『最后一笔 anchoring 提交』sha，声明提交注册为非锚定类）；权威背书 = adjudicated/<round> annotated tag co-name 同一 sha（tag message 钉裸 sha）；套件封存后逻辑 = anchor := 声明 sha 替代 BASE..HEAD 活游走。
- **显式约束/负向需求**:
  - 声明 sha ≠ tag sha = 显式漂移码（呼应 Anchor Failure Tri-State expected_missing/unreadable 语义），非静默降级
  - tag 缺失 = 降级为声明独任 + 状态记录（SCT-before-inclusion 同构），非 fail-closed
  - 历史无 tag 轮不回填（ADR-0050 Forward Sealing：不回填、不重写）
  - SEAL→tag push 滞后上限显式化（MMD 同构；取值仓内自定）
  - 退役对象登记 = 现行活 HEAD 游走不变式（走既有治理流程）
  - γ 形态在 ADR 中明示为三先例（TUF/checkpoint/SCT）结构类比而非逐字引用
  - 声明落盘时『无在途 anchoring 提交』须可被机械核验
- **审计裁决补记** (2026-09-25，maintainer xxx91n 授权): 「钉最后一笔 anchoring 提交」的规范化措辞以 ADR-0085 D-A.2 为准——seal 钉 last substantive（claim 计入），否则承载报告/handoff 的 claim 提交自身落在封存界外，与 D-E 尾序自洽。分歧为措辞层，实现不返工。
- **状态**: current

## D-003 — 轮内新鲜度粒度：认领点钉扎（ii′ 三补偿）

- **原问题**: Q3′ — 轮内捕获追锚的时点：i 全程追锚 / ii′ 认领点钉扎+三补偿 / iii 仅终末 / iv 其他。
- **原回答原文**: 「采纳」（采纳 ii′）
- **规范化需求**: 新鲜度强制粒度从『HEAD 求值、全程追锚』改为『每个 claim 提交求值』——claim-surface（reports/审计报告/handoff 等绿色声明承载提交类）注册白名单；claim 提交落地时其时点证据集逐条核 header >= 该点前最新 anchoring；中间态捕获允许标 stale 留存（stale=元数据降级非失效）；封存点核验独立于 claim 点核验（双点不合并）。
- **显式约束/负向需求**:
  - claim-surface 穷举注册 + 核验器对未注册的声明类文件输出告警（fail-closed 信号，非静默通过）——Mastra 教训先例
  - 终末封存界第二波强制不可省——claim 点新鲜 != 封存点新鲜（Red Hat/Miasma 反向失效先例）
  - stale 标注不阻断——只有 claim 时点逐条 header 核验是阻断性检查
  - 否决 i（无工业先例、成本实证）与 iii（声明点失护栏=IETF 点名最大缺口）
  - 语义定位：时点有效非持续有效（Sigstore RFC3161 同构）；声明钉证据，证据不追锚
- **状态**: current

## D-004 — 遗留轮处置：双套件补登记封存（α′）

- **原问题**: Q4′ — 现存 t24/t25 套件在活 HEAD 游走下的处置：α′ 双套件补登记封存 / β 半封半退 / γ 永续活游走 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**: t26 为 .scratch/grill-t24/SEAL 与 .scratch/grill-t25/SEAL 各写封存声明，双字段 seal:8e177d24 + recorded_at:<落笔日>；声明提交注册非锚定类且即时生效于本轮；两套件逻辑改为有 SEAL 则 anchor:=声明值，冻结为回归哨兵（characterization-test 角色：既往证据字节被改写→红）。
- **显式约束/负向需求**:
  - 声明是 back-registration 非 back-dating——recorded_at+seal 双字段为诚实性机械载体，禁止读起来像当时声明的歧义
  - 声明提交的非锚定注册即时生效于本轮，否则本轮封存提交自毒化回归
  - 退役对象=跨轮递归 invalidate 不变式整体，非部分（β 分裂否决理由）
  - 不改写任何历史提交字节
  - 声明 sha 由套件当前求值机械得出（8e177d24），非人为挑选
- **状态**: current

## D-005 — 实现拓扑：共享核验器 + 中央注册（α′ 四对冲）

- **原问题**: Q5′ — 不变式实现形态：α′ 共享核验器+中央注册+四对冲 / γ 只共享原语 / β 第三份重滚 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**: 新鲜度语义算法单源实现为共享核验器（落位避开 src/shared 的 R1 require-chain——入 scripts/ R2 机械面）；轮级套件只载 {BASE,EVD,SEAL} 配置+断言；surface-taxonomy.json 扩 claim_surfaces 闭枚举（范围=轮目录 reports/+handoffs/）+ SEAL 声明类注册；0083/0084 两套件迁移到共享核验器（非原地留副本）。
- **显式约束/负向需求**:
  - 四对冲：核验器自带 fixture 单测；核验器变更必跑全部轮级套件=全量回归即 dry-run；Metz 回退条款（真不同语义的轮声明偏离+就地内联，禁止条件分支堆进共享核验器）；claim_surfaces 闭枚举+未注册声明告警
  - claim 成本落在声明者：claim 面提交触发时点核验；决策文档面（ledger/spec/GOAL）不入 claim_surfaces
  - 共享 bug=correlated 风险的披露承认，以单测+全量回归对冲
- **状态**: current

