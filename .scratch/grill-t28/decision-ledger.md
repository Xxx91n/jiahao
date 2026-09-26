# grill-t28 decision ledger

数据源纪律：本文件为 grill 结论唯一载体。

## D-001 — 轮对象：约定漂移处置轮 + 前置 git 考古 + 钉死顺序（a′）

- **原问题**: Q1′ — t28 边界取形：a′ 约定漂移处置轮（①ADR批准面/②restack盲点/③审计工件居所/④delegation触发文本+⑤defer-0070销账，前置git考古定性①，执行序1→3→4→2→0070，human项列清单不代行，新发现超容则拆轮）/ b 窄轮（⑤+③）/ c 其他。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**:
  (i) scope=V7①②③④ 的 agent 面 + defer-0070 七字段销账（run 36142965743 已客观满足触发）；
  (ii) 前置 git 考古：定性 ADR countersign 槽位丢失是「有意简化→新 ADR」还是「意外剥离→勘误+恢复」，考古结果决定①的载体形态；
  (iii) 执行序钉死 1→3→4→2→0070（①的批准形态定义是③④裁决语义前件）；
  (iv) waiver 路径若被采用须写明不可续期；
  (v) human-only：ratification 恢复、seq-13 续期/撤销裁决、adjudicated/grill-t27 tag push、棘轮四判据采纳——agent 起草文书不代行；
  (vi) 若本轮新发现超容（>6 决策线）主动拆 t28a/t28b 不硬塞。
- **显式约束/负向需求**:
  - 禁静默改向（调研与账本冲突时走 revised+新记录程序）
  - 禁把 audit handoff 嵌 findings 表当 ③ 的正解（双权威源问题）——首选 nc-001 精确例外
  - 人类权威事项不代行
- **状态**: current
## D-002 — ADR 批准面漂移：errata 恢复 + 队列并入 + 边界行背书 + 定性留审（a′-hybrid）

- **原问题**: Q2′ — 0076-0085 裸 Status 形（countersign 槽消失、无决策记录）的处置：a′-hybrid errata 恢复+队列并入+registry 边界行+定性留审 / b 立 ADR 追认新形 / c 其他。
- **原回答原文**: 「采纳」（采纳 a′-hybrid）
- **规范化需求**:
  (i) 考古定性：裸形自 ADR-0076（t15, e03324e3）诞生即如此，系 ADR-FORMAT.md 极简模板采纳事故——**无决策记录**（t15/t16 账本、spec、报告、审计报告、PR 史全文检索零命中）；
  (ii) agent 起草一条总 errata 记录 + 0076-0085 各加一行 append-only 指针注记（措辞标 pending-confirmation：「second_reviewer countersign 义务推定存续——t15 起裸形为未注册漂移，待实体级裁决」，不断言事故定性为既判事实）；
  (iii) 0076-0085 并入既有 countersign 队列（10 项→随 2026-12-15 实体级 tide 一并裁决）；
  (iv) registry/账本行标两批准形边界，本账本记录作轻量裁决背书；
  (v) 不立 ADR——考古已证「无人决定」；唯一翻转路径=owner 或后续考古翻出共识证据→升级为补登记型轻量 ADR（预注册）。
- **显式约束/负向需求**:
  - 「意外剥离」定性本身需有权方副签（owner/verifier），agent 不得单方定性——errata 措辞必须 pending-confirmation
  - audit-PASS（一线自检）不得在语义上被表述为替代 countersign（二线签认）——IIA 三线模型
  - errata 采纳是否需要原批准层级同等程序=人类决定，agent 不预设
  - 禁 drift-then-ratify 先例：不为未注册漂移立追认 ADR
- **状态**: current

## D-003 — 审计工件居所：reports/ 复位 + 指针 + 写作规约 + 判定权留人（a′′）

- **原问题**: Q3′ — t26/t27 审计报告住进 never-commit 类（audit-evidence/）的处置：a′′ reports/ 居所复位+untracked 指针+写作规约+verdict 签发留 owner / b nc-001 精确例外 / c handoff 嵌表 / d 其他。
- **原回答原文**: 「采纳」（采纳 a′′）
- **规范化需求**:
  (i) t26/t27 的 audit-evidence/audit-report.md 逐字节移入各自 reports/ 目录并提交（居所迁移非字节改写）；
  (ii) 原址留 untracked 两行指针 README（verdict 居所路径 + captures per nc-001 untracked）；
  (iii) 写作规约入审计侧文档：报告只 claim 提交面可达依据，对 untracked captures 只做路径/计数指针，不复制内容；
  (iv) verdict 判定权属 owner——迁的是居所非判定权；报告措辞注明此区分；
  (v) nc-001 一字不动；claim_surfaces 枚举（reports/+handoffs/）任何后续改动走 ADR+人签。
- **显式约束/负向需求**:
  - workpaper/report 制度性分离不可违（AS 1215/SEC 2-06 模型）：报告不得归底稿范畴
  - 禁 handoff 嵌 findings 全表（SSOT/双权威源）
  - 禁借迁移把 untracked captures 内容复制进提交面
- **状态**: current

## D-004 — delegation 触发器 + seq-13 到期：双修复 + 修正理由内化 + pending-confirmation（a′）

- **原问题**: Q4′ — delegation-renewal-template 触发文本失效 + seq-13 无默认到期的处置：a′ 双修复（append-only 修正指针+seq-13 默认到期注记 pending-confirmation）/ b 纯豁免登记 / c expired-by-default 泛化 / d 其他。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**:
  (i) 模板触发文本 append-only 修正：re-point 至「人类权威轮内首个 signoff-class 事件 / 2026-12-15 tide」，修正注记写明原触发器按原义不可满足之由（signoff-class 收窄至人类权威轮的约定史）；ADR-0072 记 amendment 指针行（ADR-0070 Amended-by 先例）；test/adr-0072-wiring.test.js 同步；
  (ii) seq-13 加默认到期注记（**非改授权本体**——已注册授权不原位改，POA 纪律）：「2026-12-15 tide 未裁决 → 对该日之后事件 inert；冻结历史事件不受影响」，措辞 pending-confirmation 待 owner 背书；
  (iii) human-only 四件入清单：seq-13 renew/expire/exemption 三选一裁决、修正指针接受、expired-by-default 泛化裁决（留 tide）、seq-13 本体任何修改。
- **显式约束/负向需求**:
  - 禁原位改写已注册授权/规则文本（Nolo POA 实务同构）——只走 append-only 指针
  - 禁以豁免条目盖「规则已实质失效」的事实分歧（豁免为「规则有效但本例不适用」设计）
  - 禁 agent 单方宣布 seq-13 失效或泛化 expired-by-default 至 instrument 链（criteria-change 级，需 second_reviewer+review_at）
  - 自动 inert 语义是安全工程约定非普遍法理（durable POA 反例），故必须 pending-confirmation
- **状态**: current

## D-005 — restack 盲点：孤儿祖先性 wiring 腿 + 机械化仪式触发（a′′）

- **原问题**: Q5′ — restack 孤儿化盲点的注册处置：a′′ 孤儿祖先性检测腿+机械化仪式触发 / b lane-ownership 预防腿 / c 纯 waiver 登记 / d 其他。
- **原回答原文**: 「采纳」（采纳 a′′）
- **规范化需求**:
  (i) 常设 wiring 腿：committed 轮工件内全部 pinned/captured-at-head sha 逐一 `git merge-base --is-ancestor <sha> HEAD`，任一失败→腿红（红灯语义=禁止新 claim/禁止 seal）；豁免须注册 errata 清单；
  (ii) 仪式触发机械化：`gitbutler/workspace` HEAD 相对上次 seal 锚记录非 fast-forward→腿自动红——「记得执行仪式」降级为「看见红灯」；
  (iii) 仪式规程注册（AGENTS.md 工作协定）：任何对含 claim commit 的 lane 做 move/restack/undo 后→重跑全量 evaluateRound→检出的 orphan 走 errata→方可恢复 claim/seal；
  (iv) 登记内容含：残余窗口（restack→下次 eval 间隙）、触发器、红灯语义、human-only 裁决点、明示拒绝 b/c 的理由。
- **显式约束/负向需求**:
  - waiver 只给不可检测残余（纪律第一原则）——孤儿化可全机械检测，不得走 waiver
  - lane-ownership 预防腿不走（GitButler lane/ownership 不在 git 数据库，机械不可移植——官方文档+GB 开发者确认）
  - human-only：errata 裁决与重 seal 授权（断 pin 证据效力是判断非机械）；ritual 触发解释（restack 是否实质影响该 claim 链）；waiver 签发（若未来确需）
- **状态**: current

## D-006 — ②注册载体：零新 ADR + 推导明示 + 晋升钩 + 分类留人签（α′）

- **原问题**: Q6′ — 孤儿祖先性腿+机械化仪式的规范载体：α′ 零新 ADR（gates.json+wiring 测试+trend fix 行+ADR-0085 指针注记含推导+晋升钩+AGENTS.md 仪式）/ β 小 ADR-0086 / γ 仅 registry 行 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) wiring 腿入 gates.json+测试；trend-inventory `kind:fix` 行+`governance_tooling_diff`；
  (ii) ADR-0085 加 append-only 指针注记——**逐字含推导**：「pinned-sha ancestry assertion mechanized - violation-instance of the existing claim-point contract; the non-ff trigger maps to the existing post-seal-edit red state, no new normative state introduced」+晋升钩子句「若祖先性契约现第二种独立违约形态或断言语义偏离 claim-point walk→届时立一等 ADR」；
  (iii) 仪式规程入 AGENTS.md 工作协定；α 分类定性入账本待 owner 签（不自证）；
  (iv) 本轮保持零新 ADR（①降 errata/③复位/④amendment 指针/②既有契约机械化）——反棘轮实证如实记，非为零 ADR 连击硬撑。
- **显式约束/负向需求**:
  - 分类必须是带推理的披露事实（t19 D-001 教训），禁裸断言喂零 ADR 连击
  - 晋升钩预注册（bool.dev Anti-Pattern-4 推论检验：今与 0085 无独立生命周期）
  - human-only：α 分类批准、晋升裁决、仪式红灯响应裁决（重建/重 seal/declared drift）、errata 提起
- **状态**: current


## Round addendum (2026-09-26 - alpha classification logged, pending owner sign)

The orphan-ancestry leg's carrier classification (D-006 α): the pinned-sha
ancestry assertion is a **violation-instance of the existing claim-point
contract** (ADR-0085), and the gitbutler/workspace non-fast-forward
trigger maps to the existing post-seal-edit red state - zero new
normative state, so the carrier is machinery (gates.json + wiring
tests + trend row + append-only ADR-0085 pointer), not a new ADR.
Logged here for the owner countersign; the agent does not self-certify
the classification. Promotion hook stands registered on the ADR-0085
pointer line.

### defer-0070 closure record (2026-09-26, T-5 - ledger note for closed_via)

Registered trigger fired: run `36142965743` on `origin/main` @
`c8613f55c8ac3d83486437703e5bb36964e80ab8` concluded `success` - the
first green run after the 40-failure streak (t27 audit-handoff verified,
re-verified via `gh run view 36142965743` + `gh run view --log` this
round). The closure executes the registered condition literally; grade
is **yellow** (degraded green, never unqualified): the closing run
carried 8 UNVERIFIABLE legs (7 requiring `bench-corpus` + `rewrite-map`
requiring `old-side-refs`), whose coverage gap stays open under
successor defer-0072. The seven-field row sits on the registry entry;
the red-history ledger is closed, the corpus-coverage ledger is not.
