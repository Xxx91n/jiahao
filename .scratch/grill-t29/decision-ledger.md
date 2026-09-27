# grill-t29 decision ledger

Round object: t28-audit disposition (rework spec + enum-subfield fence ruling + owner-adjudication drafting).
Anti-loss rule: every confirmed substantive conclusion appends a record here before further descent.

## Records


## D-001 — 轮对象：审计处置轮 + 裁决先于规范 + 机械修复并行（a′）

- **原问题**: Q1′ — t29 轮对象取形：a′ 审计处置轮（F-1..F-13 返工规范 + F-8/F-12 裁决书起草 + fence-inheritance 元裁决 + fixture-portability 登记 + advisory 记录排期；账本先产 meta-ruling→依赖它的 spec 节引用；机械修复不等待）/ b 纯返工轮（元问题留 owner 直裁）/ c 纯元问题轮（返工另开）/ d 其他。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**:
  (i) scope=t28 审计全部 findings（F-1..F-13）的 disposition + F-8/F-12 owner 裁决书起草 + 元问题（注册枚举子字段的 ADR+人签栅栏继承层位）+ fixture env-portability 登记 + advisory（carve-out burn-rate/ADR streak/tide sizing）记录排期；
  (ii) 内部钉序：账本先产 meta-ruling，依赖它的 spec 节（F-6/F-7/F-8 通道）引用裁决；F-1..F-5 与 fixture-portability 的修复规范不依赖裁决、照常进入任务书；
  (iii) 元裁决限宽：只回答「fence 继承到哪一层」，禁止顺手重构整个 enum schema；
  (iv) F-8 性质认定：agent 侧已落地的 exceptions += 属「先斩后奏的例外」，须轮内显式裁决（追认或回滚），裁决结果写成 ledger-level 规则；
  (v) F-12 倾向 errata-record 而非 re-seal（re-amend post-declaration 本身是 freeze violation，append-only errata 是唯一自洽路径）——终裁仍 owner；
  (vi) advisory 只「记录+排期」不本轮改规则；burn-rate 警告的推论=本轮任务书必须含执行性工作（返工轮是 implementation round 非第 6 个文档轮）；
  (vii) human-only：F-8 追认/回滚终裁、F-12 errata-vs-reseal 终裁、adjudicated/grill-t27 tag push、seq-13 三选一、棘轮采纳、α分类副签——agent 起草不代行。
- **显式约束/负向需求**:
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
  - 禁把元裁决扩张为 enum schema 重构
  - 禁处置轮内顺手改 advisory 触发的规则本体
  - findings 不得无 disposition 记录（单一账本单一任务书，CAPA 形态）
  - 人类权威事项不代行
- **状态**: current

## D-002 — 栅栏继承层位：消费测试 + 机查分类块 + 登记即生效限期例外通道（α′）

- **原问题**: Q2′ — 注册枚举哪个子字段继承 ADR+人签栅栏：α′ 消费测试+机查分类块+登记即生效限期例外通道 / β 整对象栅栏 / γ 仅 exceptions 字段 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) surface-taxonomy.json 新增机器可查分类块：每个子字段标 fenced（语义承载——被 gate 腿/verifier 消费以判定结果：closed_enum/seal.fields/non_anchoring_classes/unregistered_signal/scope/tag_convention/orphan_ancestry 各键 等）/ exception-channel / editorial（簿记：rounds/_doc/source_adr/mechanism_outputs.entries）；分类块本体 fenced；
  (ii) 例外通道语义：登记即生效（verifier 必须接受 pending-confirmation 状态放行对应场景）+ 每条必含 status/requested_by/reason/expires_at/scope（窄范围禁通配）+ 到期未裁自动失效 + ratify/revoke 仅 owner 签名 + 删除/收窄例外条目同须 owner 动作；
  (iii) CI 两腿：例外字段完整性校验（缺 expires_at/scope 即 fail）+ 消费面↔分类表一致性检查（gate 代码引用的每个注册表路径必须已分类——防消费漂移）；
  (iv) F-8 处置：reports/audit-report.md 例外条目补登记为 pending-confirmation 形态（expires_at=2026-12-15 tide）+ errata 记程序瑕疵 + owner tide 追认——定性为「程序改进项（启用通道）」非「冻结违约」；
  (v) human-only：分类表初版批准、F-8 追认/撤销终裁、例外 ratify/revoke、删除/收窄裁决。
- **显式约束/负向需求**:
  - 禁整对象栅栏（β 为生态证伪的失败模式：过严检查被绕过/关闭）
  - 禁按字段名打补丁（γ 漏同类豁免字段，消费测试对新字段自动适用）
  - 例外条目禁无 expires_at（无过期日的例外=未走流程的政策变更）
  - 禁通配 scope；pending 例外逾期未裁不得静默转永久
  - 禁 agent 单方删除/收窄已登记例外（状态翻转防护）
  - 分类块本身 fenced——改分类需 ADR+人签
- **状态**: current

## D-003 — 例外通道规范载体：立 ADR-0086 + 自审行 + fence 迁入 standing 面（α′）

- **原问题**: Q3′ — pending-confirmation 例外通道（全域新状态机）的规范载体：α′ 立 ADR-0086（附 streak 自审行+D-003(v) fence 迁入）/ β ADR-0085 amendment 块承载 / γ 账本+registry 层不立 ADR / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) 立 ADR-0086：「registry field governance: fenced/editorial/exception-channel 分类学 + pending-confirmation 生命周期（登记即生效、expires_at 强制、逾期自动失效、owner 独占 ratify/revoke/delete/narrow）」；
  (ii) 正文含自审行直面 ADR-streak 批评——「本 ADR 注册了 N 项新语义」逐条列明（新法律状态/registry 级适用/难回退——移除须裁决全部在途例外/敏捷豁免 vs 治理刚性的真权衡）；
  (iii) 附带迁移：t28 D-003(v) 的 claim_surfaces fence 规则从账本迁入 ADR-0086 standing 面（修复 F-6/F-7 同型的「决策只住账本」病）；
  (iv) ADR-0085 加 append-only 指针行指向 0086（例外数组的治理通道在 0086）；
  (v) trend-inventory 记 kind:fix + governance_tooling_diff；wiring 测试钉分类块结构存在性。
- **显式约束/负向需求**:
  - 禁把全域机制塞回单一枚举家族 ADR（β=作用域错配，损害可发现性+supersession 链）
  - 禁只落账本/registry 不立 ADR（γ=把刚修的病灶再种一遍）
  - ADR-0086 须经 owner 签署程序（含 countersign 队列——自身适用栅栏语义）
- **状态**: current

## D-004 — fixture env-portability：共享 hermetic helper + 机械门禁双层（δ′）

- **原问题**: Q4′ — test fixture 依赖 ambient git config（global ident）的事故类登记形态：δ′ 共享 hermetic helper+lint 门禁双层 / α 仅 lint 腿 / β 仅 helper / γ 仅惯例文本 / ε 其他。
- **原回答原文**: 「采纳」（采纳 δ′）
- **规范化需求**:
  (i) 建 test/helpers/ 共享 hermetic git helper——注入 -c user.email/-c user.name + GIT_CONFIG_NOSYSTEM/GIT_CONFIG_GLOBAL 全量 ambient config 隔离（不止 identity 一类）；迁移 freshness-checker/adr-0084-wiring 等 temp-repo 写操作调用点；
  (ii) wiring/gate lint 腿：test/**.js 中非经 helper 的 git 写操作 argv（commit-tree/commit/tag/merge）→红；
  (iii) 惯例文本入 AGENTS.md；
  (iv) 验收电池含此腿（静态分析，本地/CI 同构，无环境依赖）；
  (v) 该发现属审计 post-merge addendum 的候选 finding——入 F 编号与否 owner 裁，agent 按「F-14 候选」登记处置。
- **显式约束/负向需求**:
  - 禁纯约定文本（γ=刚失效的形态）
  - 禁仅 helper 无门禁（防新局部 helper 绕过）
  - 禁仅 lint 无 helper（留结构缺口+逐 argv 匹配易绕）
  - 测试对真仓 ROOT 的 git 写操作本就非法——「测试内一切 git 写 argv 必经 helper」无歧义
- **状态**: current

## D-005 — advisory 处置：记录 + 自包含 tide 裁决包 + 诚实默认纪律（α′）

- **原问题**: Q5′ — carve-out burn-rate（连5文档轮）/ADR streak 15/24+ 决策压单一 2026-12-15 tide 的处置：α′ 记录+自包含 tide 裁决包+诚实默认纪律 / β 纯记录 / γ 建议拆 tide（降格为建议行）/ δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) 本轮产出 tide 裁决包（human-authority-package 形态）——每项含：自包含背景段（owner 无需回读历史即可裁决）、选项表（不预选）、agent 推荐+理由、双向后果、签名行；
  (ii) 包结构分层：19 项 countersign=routine bulk 段（整体核签但记录留痕为 bulk），F-8 追认/seq-13 三选一/ratchet 采纳/F-12 errata-vs-reseal/tag 决定五项实质裁决排会话前段（决策疲劳：高裁量靠前）；burn-rate 作为 context 项入包呈 owner；
  (iii) deferred-registry 加 tide-capacity 观察行（建议 owner 可在前序 interim 权威事件提前批签 routine 段，adjudication 留 12-15 tide）；
  (iv) ADR streak disposition 记 mitigated/closed（D-003 自审行已覆盖）。
- **显式约束/负向需求**:
  - 禁预选/预勾选项——「同意推荐」必须是 owner 的真实动作非默认态（橡皮图章防线）
  - 批量批准按批量记录——bulk ratify 与逐项细读留痕可区分
  - 包必须自包含——行内术语不得假定 reader 持有本会话上下文
  - 禁越权改 tide 日期（仅建议行+容量观察行）
- **状态**: current

## D-006 — ANCHORING footer：注册必选 + 腿核验 + 工具派生 + 诚实边界（α′）

- **原问题**: Q6′ — [ANCHORING] file-allowlist footer（t27 携带、t28 0/18 未注册的漂移惯例）处置：α′ 注册必选+footer==落地集腿核验+工具派生+诚实边界 / β advisory / γ 正式弃置 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) AGENTS.md 工作协定注册：轮内 lane 非 merge/workspace 提交的消息须含 [ANCHORING] <file list> footer——由提交动作当场把 but-commit allowlist 解析为路径**派生**写入，禁手抄（DCO -s 同型自动化）；
  (ii) wiring 腿核验：footer 文件集 == git show --name-only 落地集；适用范围=注册生效起的新提交，历史不回溯（append-only 纪律）；merge/workspace commit 显式豁免（无自主 allowlist）；
  (iii) 规约内写明诚实边界：footer=自描述可重放声明，committer 与写手同信任域，**不构成防伪造**——其价值是 forensic（审计时刻核验提交内自洽）非 preventive（实时防护仍靠 git show --name-only 核验）；
  (iv) 两条腿查不同东西不构成冗余：live 核验=外部意图↔落地集；footer 腿=提交内声明↔落地集（审计时可重放）。
- **显式约束/负向需求**:
  - 禁 advisory 形态（把已观测失败制度化）
  - 禁手工誊写 footer（手写 trailer 的摩擦成本实证）
  - 禁把 footer 表述为安全控制/防伪造机制
  - 历史提交不回溯加 footer（append-only）
- **状态**: current
