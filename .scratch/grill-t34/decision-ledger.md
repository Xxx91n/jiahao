# grill-t34 decision ledger

Round object: OPEN (grill Q1).

Conventions: each ratified substantive conclusion appends one record:
ID (D-001 up), 原问题, 原回答原文, 规范化需求, 显式约束/负向需求,
状态 (current/revised/stale/deferred). No conclusion lives only in
conversation; before any compaction/handoff the ledger must be current.

## Records

## D-001 — 轮对象：derive-from-source 契约轮（α′′）

- **原问题**: t34 轮对象按哪种划分——α derive-from-source 契约轮（a+b+d 内嵌）/ β D-001 字面契约轮（a+c）/ γ handoff 头号（b 独轮）？调研（OpenAPI SSOT 一执行形 N 派生件单机制内分相、generate-and-diff CI 单不变 job 覆盖多输出、OreStudio codegen 零漂不变量、ISO APG/8D 同质批量边界、t33-D-001 批量规则）裁决：**注册字面=地板、同质性=准入测试、偏离必须走注册**；(iii) skip 归因 off-shape（新增测量面非"声明→派生"转换）出局；reject-branch 必须留轮内（移出=静默丢弃=D-002 缺陷类）；β 被 defer-0076 注册钟打死（review 2026-10-15 而 count 生成器不入轮=行实质不解冻）；γ 违 E-25/D-001 地板。
- **原回答原文**: 「采纳」
- **规范化需求**:
  (i) 轮对象=derive-from-source 契约轮，单契约形：手写声明/审计面→源派生工件+弱自洽；
  (ii) 三体：(a) 审计再执行清单生成器——ci.yml 机械派生含 CI test-job 全命令面，**同轮退役** t33-D-004(i) 人工条款（不留共存窗）；(b) 声明计数生成器——README 四处声明点+ci.yml `--expected-suites` 同源派生，断言改"==派生工件"，计数校验脱离 jest fail-fast 遮蔽；(c) reject-branch 预注册——ADR-0089/0086 return-by 出口语义+追认窗口到期失效，**预注册非实现**；
  (iii) 显式移交：skip 归因测量协议→t35/独立候选注册；claim-commit map pairing 配方→登记（随轮边或 t35）；t32 四候选→t35+；owner-side（t27 tag/潮汐拆包/0089 采签）不变；
  (iv) 轮内附带义务：修正 audit-handoff 候选清单补 reject-branch 行（注册面不对称=缺陷类非编辑自由）；
  (v) 若轮程滑过 2026-10-15，须**在该日前** amend defer-0076 review_at 登记滑移；
  (vi) t34 工件中显式命名对 t33-D-004(iii)①（手写同步双写残余形态）的前向取代。
- **显式约束/负向需求**:
  - 注册字面=地板：已注册移交项禁静默丢弃；同质性=准入测试：新收项须同变更类+同执行权威（regenerate-and-diff + D-008 弱自洽）；
  - 生成器弱自洽=派生工件+--check+手验 seed（D-008 模式）；禁在 mutation interval 内评估（F-6 仪式）；
  - 枚举完备性：派生清单 vs landed set 纪律（anchoring-footer 同型），禁手打清单；
  - 双语镜像：README.md+README-zh-CN.md 同 commit（ADR-0079）；
  - reject-branch 只预注册出口语义，不实现回滚；
  - skip 归因不混入本轮（off-shape）。
- **状态**: current



## D-002 — (b) 计数事实源：committed manifest+生成区 全单源（α′′）

- **原问题**: 声明计数的派生事实源取哪种形态——α 全单源 committed manifest+README 生成区 / β 活派生无工件 / γ 混合半单源？调研（lockfile 提交派生+严格一致性检范式、OpenAPI codegen、golden-file、两条独立派生通道对账）确认 α：工业默认=提交派生工件+regen-and-diff，非门时重算；独立性正解=枚举通道≠收集通道。
- **原回答原文**: 「采纳」
- **规范化需求**:
  (i) `docs/test-manifest.json` 为计数事实源——`suites`=jest --listTests 文件枚举派生（**禁 JUnit 派生**，循环自证红线）；`tests`/`skipped`=生成时 JUnit 派生（blessed enumeration）；
  (ii) README 两处英文声明句+README-zh-CN 两处镜像句改为 **marker-sentinel 生成区**（ADR-0043 D-B spliceRegion 先例：哨兵缺失/倒置/重复 fail-closed），计数从此无人手编辑；
  (iii) `--expected-suites` argv 整死——manifest 路径硬编码，ci.yml 调用行退化为裸 `node scripts/run-test-gate.js`；
  (iv) 静态腿=独立 `check-test-manifest.js` 注册 gates.json（README 块==manifest 派生文本 + manifest 新鲜度 regen-and-diff），脱离 jest fail-fast——遮蔽类消灭；腿名不得暗示电池状态；
  (v) `run-test-gate.js` 不再读 README；post-jest 保留 `collected==manifest`（抓"加测试未 regen"漂移）；
  (vi) 六个 wiring pin 同轮重锚（adr-0057/0058 形状 pin 改写、adr-0080/0081/0082 字面 pin 重锚、adr-0083:194 glob==argv pin 迁为 manifest.suites==glob——argv 独立性守护本就靠文件枚举对账，重锚非新机制）；gates.json 条目 params 面随 ADR-0036 D4 同步；
  (vii) manifest **禁入 package.json files**（ADR-0039 D3 pack 余量曾仅 57B；ADR-0079 D5 豁免模式+wiring 断言缺席）；
  (viii) 授权模式引 **ADR-0043 Cluster-1**（manifest 权威=注册+生成器+新鲜度检，不新立权威类）；t34 工件显式命名对 t33-D-004(iii)① 的前向取代；
  (ix) ADR-0079 D6 重钉税：每次计数 regen 随 closeout 序预算 zh-CN re-pin。
- **显式约束/负向需求**:
  - blessed-enumeration 信任：钉生成器调用 tier 一致性（作者环境≠CI 环境时新鲜度 --check 门时重算立红）；
  - manifest 陈旧窗由双腿断言闭合（静态新鲜度+post-jest 相等），非同窗；
  - 静态腿必须独立于 jest 结果可跑（遮蔽类正是红期不可见）；
  - 调研最强反驳如实登记：manifest=blessed artifact，其真以生成器之诚为真——反驳答复=argv 本只能抓手打数且生成块已灭此类，陈旧由断言闭合非开窗。
- **状态**: current

## D-003 — reject-branch 预注册：ADR-0090 处置契约+棘轮齿（α′′）

- **原问题**: return-by 出口语义预注册的内容形态——α ADR-0090 处置契约+过期棘轮齿 / β 毯式通用条款 / γ 只注册程序？调研（ADR-0084 在队自指循环论证、ADR-0089 scoped-succession 先例、工业界 owner-owned 队列 alert-vs-gate 分裂、ADR-0076 Ask-B 双出口先例）裁决 A 带两项修订：菜单=地板非天花板（owner 覆盖走 errata 偏差登记）；棘轮齿按仓库自有三阶段阶梯成形（grace 内 SUGGEST/过 grace FAIL declared-drift 形）。
- **原回答原文**: 「采纳」
- **规范化需求**:
  (i) 载体=**ADR-0090** "countersign rejection disposition contract"（0084 在队不可自指改；0089 scoped-succession 先例=新 ADR+scoped 指针）；
  (ii) 通用拒绝语义三条款：非追溯（0086 规则6 镜像——拒绝对生效期内已落 commit 不回溯定罪）+ 处置菜单=默认地板（owner 裁决时指认非菜单分支须 errata 偏差记录；on-site 发明变注册偏差而非静默即兴）+ 状态转换（拒绝→status amend "Rejected at 2026-12-15 tide"+出队）；
  (iii) 逐条具体化强制范围=**引入可执行机制的在队成员**（派生类规则非任意切分）——本轮=0086-0089 四份（对 D-001 点名 0086/0089 的**加宽登记**）；0089 处置=分类器回退三类枚举+[225]腿降 advisory+orphan-cites.json 留档 append-only 不删；label-only 成员（old-form 十+E-13 裸形九）按类走 supersession 默认；
  (iv) 0090 自指行显式写入：0090 被拒→自觉回 pre-0090 态（批评指认的缺陷态知情恢复，非静默）；其处置在自身权威下执行仅当熬过潮汐；
  (v) `countersign-overdue` 腿=三阶段：grace 内（return-by..return-by+30d）SUGGEST/advisory，过 grace FAIL 且红输出点名 rebuild/re-seal/declared-drift 三出口（腿断言"未裁决成员不得静默永存"，非"owner 必须按期"）；grace=30d 登记**理由**（覆盖潮汐后一次 owner 工作窗≈潮汐周期 1/3）非裸数；
  (vi) 腿=R2 治理机械→ADR-0076 D-B carve-out（注册+计数+trend-row）；套件计入 D-002 manifest 派生面；t34 审计再执行表在人工条款存续期含此腿命令面；
  (vii) 处置防腐：tide-eve disposition re-verification 入 closeout 序——处置陈旧=errata 非静默执行；0087/0088 具体化可注册延迟至潮汐内跟进项（类规则本轮先立）；
  (viii) ADR-0090 散文禁写计数行（t33-D-002(vii)）；owner 无行为能力残值诚实命名于 ADR（红时 agent 无合法自助，出口=owner 回归或 declared drift）。
- **显式约束/负向需求**:
  - 拒绝判定=owner 专属；本轮只预注册出口语义，**不实现任何回滚**；
  - 菜单非 owner 裁量天花板；
  - 红腿非"机器惩罚 owner"——grace 窗是 alert 相，FAIL 断的是"静默永存"非"迟裁决"；
  - audit-handoff 候选清单补 reject-branch 行（D-001(iv) 同轮）。
- **状态**: current

## D-004 — 审计面执行深度：清单工件+报告机读覆盖块+coverage 腿（α′）

- **原问题**: "audit re-run surface ⊇ CI surface"的执行深度——α′ 清单工件+报告侧 sentinel 机读覆盖块+新 gate 腿断言最新审计报告覆盖清单 / β 工件+条款即止（仍靠自觉）/ γ 散文 grep？仓内先例：check-secret-scan 扫 .scratch 报告 sha256、map-freshness 扫 claim 面引用、ADR-0043 spliceRegion sentinel、commit-date effectiveness 时间作用域——报告面被机械断言有先例。V8 诊断：靠审计员自觉不成立，β=病灶只修一半。
- **原回答原文**: 「采纳」
- **规范化需求**:
  (i) `docs/governance/audit-checklist.json` 生成器：复用 check-ci-jobs/check-ci-wiring 的零依赖解析法抽 ci.yml 全 job run 行→命令面清单；`--check` 模式 assert committed==再生成（D-008 弱自洽）；
  (ii) 审计报告合同新面：Hard-acceptance 表后携带 sentinel 机读块 `<!-- audit-coverage v1 -->`+JSON 数组=审计员实际再执行的命令清单（生成器 emit 输出供审计员粘入并具名——审计员写"我跑了哪些"，非生成器代签）；
  (iii) 新腿 `audit-surface`（gates.json 注册）：断言最新审计报告的 coverage 块 ⊇ 当前 checklist；缺块/缺项=FAIL；时间作用域=只断 convention 注册日后署名的报告（commit-date effectiveness 镜像，t33 报告不追溯定罪）；
  (iv) R2 治理机械→ADR-0076 D-B carve-out（注册+计数+trend-row）；套件计入 D-002 manifest 派生面；
  (v) 清单落地即同轮退役 AGENTS.md "Audit self-consistency (interim)" 条款（D-001(ii)a——不留共存窗）；
  (vi) t34 自身审计=第一份带块报告（同日 bootstrap）。
- **显式约束/负向需求**:
  - 覆盖块断言的是"审计员声明跑了哪些命令"，不代签结果真值——verdict 权仍在审计程序；
  - 禁散文 grep 断言（断言对象必须是契约块非文本格式）；
  - checklist 的 --check 与 audit-surface 腿是两条不同断言（工件新鲜度 vs 报告覆盖），可同 suite 不同 leg 注册；
  - defer-0076 unfreeze_if 在清单+声明落地时机械满足——status 翻 actioned+check-in 注记为注册面操作（presence-condition 断言非人裁）。
- **状态**: current

## D-005 — 账本沉默项处置：三项机械/事实项进 spec（无升账）

- **原问题**: 对账后列出的三项账本沉默项（S1 移交项注册居所=deferred-registry pending-evaluation 行[推导自 t33-D-004(ii) 跨账本惯例]；S2 audit-handoff 漏列 reject-branch 注册 E-26 errata；S3 CONTEXT.md 候选新词 Test Manifest/Audit Checklist/Audit Coverage Block/Countersign Overdue/Rejection Disposition）属机械绑定还是须升账？
- **原回答原文**: 「a」（全部按机械/事实项进 spec，无升账）
- **规范化需求**:
  (i) S1：移交观察项居所沿用 t33-D-004(ii) 惯例——deferred-registry `pending-evaluation` 行（defer-0078..0083：skip 归因协议/map pairing 配方/R2-F4/F-11/settle-window+advisory/t27-t28 不对称+errata_exemptions drift）；
  (ii) S2：audit-handoff 候选清单漏列 reject-branch 行=E-26 事实注册（注册面不对称缺陷类实例，同 t27/t28 不对称同类）+同轮修正该文档；
  (iii) S3：CONTEXT.md 新词按 domain-modeling 惯例在 spec/ADR 落地时定夺写入（词条=术语面更新非决策）。
- **显式约束/负向需求**:
  - 三项均事实/机械层，禁在 spec 中携带论证成分冒充决策（t33-D-004 纪律）；
  - S1 的居所推导跨账本引用须在 spec 中显式注明出处为 t33-D-004(ii)，不伪装为本轮新裁。
- **状态**: current
