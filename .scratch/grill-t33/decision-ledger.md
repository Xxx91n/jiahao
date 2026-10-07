# grill-t33 decision ledger

Round object: 止血+披露轮（correction track），D-001 已钉。
Anti-loss rule: every confirmed substantive conclusion appends a record
here before further descent.

## Records

## D-001 — 轮对象：V8 止血+披露轮（correction track 分轨制，α′′）

- **原问题**: grill-t33 轮对象按哪种划分最健全——α V8 处方 agent 面整轮承接 / β 最小修红轮 / γ 全景轮？调研（ISO 9001 APG correction-cause analysis-corrective action 三部分分离、8D D3/D4、GitHub Blog 同质批量边界、msspsecurity quick-wins 流水线、CIS 修复后验证）裁决 correction 与 corrective action 分轨、批量边界=同质性非同源、止血先行有独立价值、全景轮被点名否定、t28 整轮承接因 V7 同质性不可外推至 V8。
- **原回答原文**: 「采纳」（α′′ 分轨制：t33=止血+披露轮）
- **规范化需求**:
  (i) 轮对象=correction track 四项：
    ① README 修红——声明计数 1511/87→1571/89 共 4 处声明点（README.md:337/356 + README-zh-CN.md:280/295），中英文同 commit（ADR-0079 双语镜像 + ADR-0056/0057 声明-实际对账）；附带核验 "skips 7 corpus-bound tests" 声明面（公开克隆实测 skipped=11，差额 4 属 bench/ci-mode 能力负 skip——声明域核验不偷偷改语义）；
    ② E-25 注册——公开 CI 红 ×5 未披露（五连 failure 覆盖 a92efdf5（grill-t31 closeout tail, 2026-09-28）→754e53c2（grill-t32 post-land rewrite-map regen, 2026-09-29，审计窗 origin/main tip），唯一红为 test job README 计数断言）+ 三轮二方审计再执行面缺 run-test-gate.js 的 surface gap；T-0 baseline recon 增「公开 CI 状态」项；
    ③ 队列双通道收口紧随 ②——E-25 注册本身踩 countersign 队列注册通道（E-13 计数通道 vs ADR status 行自注册通道），先定边界再写 E-25，否则产生双写窗口；
    ④ 登记「计数单一来源」known-drift 桥接条款挂到 t34 契约轮——裸修数字不机制化计数来源=必然复发（correction 无 CA 支撑），桥接使复发风险有账；
  (ii) 显式移交清单：
    - t34 契约轮：审计再执行面 ⊇ CI test job 面机械化（清单从 ci.yml 生成）——生成器自身须带弱自洽（D-008 模式复用）；ADR-0089/0086 pending-confirmation reject 分支预注册——须含追认窗口到期失效语义（防棘轮惰性成默认）；
    - 小项 disposition：cap 第 5 次修正的分发形式成本→观察项登记不入轮；audit finding-vs-note 标尺→随审计面机械化项；README "7 skips" 精确化→并入 ①；
    - owner-side 开轮前预注册移交项：t27 adjudicated tag push（欠 3 轮）、潮汐拆包/中间检查点、0089 entity countersign——agent 只登记提醒不代行；
    - t32 handoff 四候选（R2-F4 exists_at sanity-bound 腿、F-11 generator/facade dedupe+build-rewrite-map refactor、settle-window 腿+advisory leftovers 批、t27/t28 audit-handoff 不对称+errata_exemptions bare-sha drift）→ t34+ 候选登记不静默吞并。
- **显式约束/负向需求**:
  - 禁把契约设计项（审计面机械化/reject 分支）绑进止血轮——止血轮闭合不得被契约争议阻塞（ISO APG/8D 分轨原则）；
  - 禁裸修 README 不建桥接登记——「计数单一来源」须有账；
  - 禁 ⑥ 并入契约轮——E-25 注册先踩通道边界，双写窗口必须在建仓前关闭；
  - owner-side 项只能预注册移交，不得列为轮交付；
  - "7 skips" 只核验声明面，发现声明为真但误导时属措辞精确化而非数字修正。
- **状态**: current

## D-002 — countersign 队列权威通道：per-ADR 声明面=唯一权威 + 成员级对账（α′′）

- **原问题**: 队列成员身份的权威通道如何收口——α 各 ADR 自身声明面=权威+队列机械派生 / β E-13 计数枚举=权威+0087/0088 补账 / γ 新登记工件=权威？调研（alint ADR-0001 散文永不可再生为事实源、Oath-lang 计数对账抵消盲区、Abstractopedia 权威在事实诞生地、Azure/Fowler Event Sourcing 投影非权威、GSD/terraform-docs generate-and-diff CI 门）五源一致压 α。
- **原回答原文**: 「采纳」（α′′ 并采纳全部调研精化）
- **规范化需求**:
  (i) 权威=各 ADR 自身声明面，三种已注册声明形并立：old-form "ID-level-only, awaiting entity-level" 标签（10 份，ADR-0064..0074 子集）/ E-13 指针注记行（9 份裸形 0076..0081,0083..0085）/ new-form "awaiting entity-level countersign" status 行（0086+）；
  (ii) 队列=对三声明形的机械扫描派生集；wiring 做**成员级对账非总数相等**——每份 ADR 声明归封闭类别集 {awaiting×3形 / countersigned-or-final / 注册豁免}，undeclared=fail（Oath-lang：一进一出抵消只有成员级对账能抓）；
  (iii) 手写计数叙述全退役为展示文字（ADR-0084 "10 entries" 枚举、E-13 10->19、E-16 "19 rows"、新 ADR "N->N+1" bump 行——字节不动按 append-only 留史），**新 ADR 禁写计数行**；
  (iv) 0087/0088 不补账——它们是计数通道已失权的证据，非待修债务；
  (v) 前置子任务：三声明形格式归一核验（历史 status 措辞规整度未实测，扫描器落地先决条件）；
  (vi) 可选物化 derived JSON 仅作 --check 缓存产物，永不承载裁决权（γ 正确内核的吸收形态）；
  (vii) 惯例一句注册（AGENTS.md 工作规约或 ADR-0086 指针注记）："队列成员身份以各 ADR 声明面为准，队列=派生集，计数叙述为展示"——语义面小不立新 ADR。
- **显式约束/负向需求**:
  - 禁总数相等断言（"扫描数==N"）——计数既退役无权威可等，且抵消盲区复现；
  - 禁 retro-fix 0087/0088——补账会把失权证据涂改成正常史；
  - 禁新工件升格权威——derived JSON 只做 --check 缓存；
  - 队列对账须在 E-25 注册前收口（D-001(iii) 序）——E-25 若涉队列语义先踩边界。
- **状态**: current

## D-003 — E-25 注册形态：单条目三子项（终态快照）+ defer-0076 桥接 + 约定存在性 Bound-by（α′′）

- **原问题**: CI 红×5 未披露+审计面缺口的注册形态——α 单条目 E-25+defer 桥接+存在性绑定 / β 拆两条 / γ 只记红不记缺口？调研（RFC draft-rpc-errata-process-02 分立判据=验证权威不同非条数、Google SRE postmortem+bug-tracker 双账本、incident.io 行动项四大死因、release-notes known-issue 纪律、CAPA 单记录挂行动项）高置信压 α。
- **原回答原文**: 「采纳」（α′′ 并采纳全部调研精化）
- **规范化需求**:
  (i) E-25 单条目三子项：子项1=事件终态快照（连续 5 次 failure、败步同为 run-test-gate README 计数断言、README 1511/87 漂移区间）；子项2=审计面缺口事实（t32 三轮审计 Hard acceptance 表无 run-test-gate 行——钉可核实事实行，"surface gap" 外评定性不代签）；子项3=处置边界声明（correction 本轮落 README 修红+队列收口；机制修复归 t34 契约轮——errata 记事实与去向不代立项）；
  (ii) defer-0076 桥接行：subject=「test/suite 声明计数无单一生成源——README 手写声明、gate 只断言相等、无计数合成；复发风险已注册待 t34 契约轮裁机制形态」；unfreeze_if=**机械可核验 presence-condition**（注册工件或 ADR 声明审计再执行清单由 ci.yml 派生/CI test-job 命令已进入审计再执行表），review_at=具体日期锚点（spec 钉值，建议对齐 t34 开轮窗）——禁事件型措辞防桥接行腐烂；
  (iii) Bound-by=约定存在性 wiring（断言 defer-0076 行+baseline-CI 条款在册）+**条目内一句自证措辞选择**（首个非数值绑定形态，防误读为数值核验；RFC Notes 字段惯例）；1511/87↔1571/89 仅作一次性证据文本，不复活计数断言；
  (iv) baseline-CI 条款居所=**AGENTS.md standing 工作规约**：每轮 T-0 baseline recon 必含公开 CI 状态核验（origin/main tip 最近 run conclusion+败步命名）——盲区连续两轮非偶发，standing 义务须挂 standing 面（handoff 是逐轮产出物）；
  (v) factual registration 无 pending-confirmation（事实全机械可核，E-13 式 pending 只用于有争议定性）。
- **显式约束/负向需求**:
  - E-25=终态快照非事件流——禁逐 run 罗列（t32 D-003 终态断言先例同构）；
  - 禁事件型 unfreeze_if（"下轮完成时"类）——defer 行必须机械可解；
  - 禁把历史计数证据转写为断言模式；
  - β 不满足 RFC 分立判据（两事实同验证权威同根因链）；γ 违 known-issue 披露完整性。
- **状态**: current

## D-004 — 账本沉默项处置：②升账+③居所惯例条款化+四项机械绑定（α′′）

- **原问题**: 六项账本沉默项各属机械绑定（可直接进 spec 事实注记）还是须升账决策？调研（AWS/Microsoft/Google/ADR-org 四源判据：账本记 why/选项取舍、spec 记 what+how-to-verify；spec 事实注记合法但一含论证成分即泄漏成决策须回账）逐项裁决。
- **原回答原文**: 「采纳」
- **规范化需求**:
  (i) **升账项②** standing 审计自洽条款：在 t34 审计面机械化落地前，每轮二方审计再执行表必须人工含入 CI test job 全部命令面（当前=`run-test-gate.js --expected-suites N`）——居所述 AGENTS.md standing 规约，机制落地后人工条款自然退役；t33 自身审计同样适用（自食其果）；
  (ii) **升账项③** 观察项居所惯例：不入轮的成本/治理观察项的 canonical 居所=deferred-registry `pending-evaluation` 行——cap 第 5 次修正的分发形式成本照此落 defer-0077；
  (iii) **机械绑定四项**（spec 事实注记，不含论证成分）：
    ① ci.yml `--expected-suites` 随 suite 变更同 commit bump + README 计数写波尾实测终值（定性为一次性实测记录，非"手写计数"永久惯例）；
    ④ 公开 CI 归绿核验=owner-side push 后观测项（非 agent 交付物）；
    ⑤ 队列对账测试=独立测试文件（跨 ADR 属性非单 ADR wiring），文件头列 Bound-by ADR 清单；
    ⑥ defer-0076 review_at 由 spec 钉值并标注钉值时点（钉出的值仍须满足机械可核验约束）。
- **显式约束/负向需求**:
  - spec 注记禁含"应当/因为/而不是 X"论证成分——论证成分泄漏成决策须回账；
  - ②③ 不升账的失败模式=下一轮对账发现 spec 里有无法回溯到任何 D 的指引；
  - ① 的手工同步双写本身是 D-002 要退役病灶的残余形态——措辞不得把它固化成惯例。
- **状态**: current
