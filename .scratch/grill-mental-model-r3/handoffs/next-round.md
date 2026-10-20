# Handoff — grill-mental-model-r3 收口 (2026-10-19)

上一轮（r2）：审计收口轮，产出 ADR-0103（受控词表+退役+avoid 档阻断）+ T1'~T5' 任务书。  
r3 账本（唯一数据源，封存于 `.scratch/archive/2026-10-19-grill-mental-model-r3/decision-ledger.md`）：D-001~D-007 共 7 条（6 current + D-002 revised by D-005）。  
r3 性质：围剿核查轮——零 tracked 面改动，全部决策为收口后施工序列。痛点 2（ponytail）零动作封存；痛点 1 落为注记级登记包。  
施工总序（D-006，不得重排）：**T-1 → T-2 → T-3（可与 T-2 并窗）→ T-4**。

## 去向对账表

| D | 去向 |
| --- | --- |
| D-001 | T-3（#2 复合面注记落点定案）+ 约束节（不重开分类学、不立第六语义） |
| D-002 | T-3 步骤1（plan.json 语义③注记）；步骤2 → 未定项（P1 后分离度验证，须证与 FM-2.6 可分） |
| D-003 | T-2（gate+0103 D-E 修订票+BK-08 同票）+ T-3（四口子文档修订并窗） |
| D-004 | T-3（登记包一次变更票，五项） |
| D-005 | T-3（①③并入登记包；②已完成入账）+ 约束节（2606.19544 禁令） |
| D-006 | T-1 + T-2 + T-4 + 本序次声明 |
| D-007 | 约束节（ponytail 封存，无信号不重开） |

## 任务清单

### T-1 — BK-10 修验证仪表（前置依赖，阻塞一切验证）

-   覆盖：D-006 第一。
-   做什么：账本处方 `--quarantine; npm run reverify; npm run judge:bias` 跑通至 `instrument --check` rc 归零。**注意**：处方有身份级副作用（改写 `src/instrument-state.json` 与 reverify 台账）。先判 `model UNRESOLVED` 是否 public-tier 必然态——若是，替代路径见 r2 closeout §2 BK-10 行（gates 注册表显式登记不适用条件），不硬修。
-   验收：`instrument.js --check` rc=0，或注册表显式登记不适用条件。
-   Suggested skills: diagnosing-bugs（若开查身份 mismatch）；$but（提交前）。

### T-2 — D-003 avoid-tier CI gate 施工 + BK-08 词表再评估（同一张 0103 变更票）

-   覆盖：D-003（gate 升序+0103 D-E 修订票）、D-006 第二（BK-08 与 gate 同票评估）。
-   做什么：① 0103 D-E 修订登记（avoid-tier gate 从 "later round" 升为收口后第一件施工任务——append-only 变更票，不静默改向）；② gate 编码（coinage-triage avoid 档 exit≠0 挂 CI）；③ BK-08 词表再评估（avoid 档现仅剩豁免阀 1 词，9 个退役词 condition=null——扩不扩、回不回按 0103 D-A/D-B 程序走，**不预判结果**；词表现状/判据指针 r2 closeout §2 + r2 backlog）；④ gate 上线前核当前树全净（防开门红，r1 T1' 纪律：挂门前先跑 coinage-triage 确认无存量命中，有则先经变更票登记存量豁免）。
-   验收：coinage-triage rc=0；avoid 档成员与登记逐条一致；无 condition=null 的 avoid-unless 行；CI gate 生效（exit≠0 可复现）。
-   Suggested skills: khazix/neat-freak（改 scripts 前读）；grill/engineering/domain-modeling（变更票格式）。

### T-3 — D-004+D-005 证据注记登记包 + D-003 四口子文档修订（与 T-2 并窗，一次变更票）

-   覆盖：D-003①②③④、D-004 #1~#5、D-005①③、D-002 步骤1、D-001（#2 落点定案）。
-   做什么（注记级动作，**不得升级为改向**——D-004 约束①）：
    1.  D-003① 原则 2 解释层补两句："隐喻要么定义要么弃用；缩写首现即展开"（解释层，不破三原则硬顶）；
    2.  D-003② 替代表加"同 token 双定义"检查项（检测面，非新原则）；
    3.  D-003③ [CONTEXT.md](http://CONTEXT.md) 四准则加第五项："带数字的词条必须带来源（标题+URL）"；
    4.  D-003④ 诚实化改字：语言纪律文档 "enforced" → "legislated, gate pending"（不等待 gate 施工完成即可先行；**还原 enforced 的前置 = gate 落地**，见 T-2）；
    5.  D-004#1 overreach/persistence out-of-scope 声明 → [CONTEXT.md](http://CONTEXT.md) 词条 + ADR-0101 勘误注记（引 Anthropic 2026-10-09 两维度；dishonesty 为语义①自述不可靠面的第三方背书）；
    6.  D-004#2 + D-001 "显摆不做事"=语义①×③复合面注记 → plan.json + [CONTEXT.md](http://CONTEXT.md)（未走裁决通道、未立新语义面，只是既有语义复合行为的归属注记）；
    7.  D-004#3 ADR-0101 D-B 补两行：SDF 式接种无效（Shallow Beliefs）+ leaky backdoors 可抑制接种（SPAR）；
    8.  D-004#4 ADR-0101 D-D 补 MonitorBench、Strategic Obfuscation 两处 URL；
    9.  D-004#5 MonitoringBench 数字补归一条件注记（Opus 4.5、直接引出 vs 最优精炼攻击）；
    10.  D-005① plan.json 语义④注记收窄版：Saito 2310.10076（judge 侧偏差）+ s44163-026-01980-z（综述）+ 生成者侧四邻区（YapBench 2601.00624 / BenchOverflow 2601.08490 / Prompt-Induced Waste 2608.01347 / Behavioral Drift Zenodo 2026-03）+ 划界句 + 2606.19544 禁令（见约束节）；
    11.  D-002 步骤1 plan.json 语义③条目注记：候选扩展面 = 输出/工具调用配比失衡（"用说替代做"的频次维度），含可测指标候选（轮次比、单轮信息获取增量）；不改定义文本；**步骤1 落地前不得出现"语义③已含配比失衡"表述**；
    12.  D-005③ `.scratch/grill-mental-model-r3/atomcode-report-pain2.md` 顶部勘误头注（标注两处结论已被 followup 推翻，以 [atomcode-report-pain2-followup.md](http://atomcode-report-pain2-followup.md) 为准）；
    13.  D-003 约束③ B17 类 [SKILL.md:52](http://SKILL.md:52) "prose-density supervision" 自造计量词在原则面的处理随检查项（第 2 件）一并评审，不单独开新法。
-   验收：plan.json 动文走冻结语料纪律（勘误窗，注意 pin 面）；全部动作完成后 language-discipline / [CONTEXT.md](http://CONTEXT.md) / 0101 与账本逐条对得上。
-   Suggested skills: grill/engineering/domain-modeling（变更票/词条落地）；khazix/neat-freak。

### T-4 — BK-09 收尾

-   覆盖：D-006 第三。
-   做什么：`eval-plan.json:161` gate\_prerequisite 措辞与 semantics\_extension.status 对齐；重算 sha256 → `devin-oot-v3-report.json:9` + `report.md:248` 双处重 pin + superseded 注记；**一次动作窗完成，禁拆两次提交两次搅动字节**（r2 closeout 判据）。
-   验收：`devin-oot --replay` v1/v2/v3 全绿；`corrigendum-v3 --check` 绿；pin 双向齐。
-   Suggested skills: 无特殊；本仓 scripts 工程面。

## 未定项 / 约束（不进施工窗）

-   **D-002 步骤2**：P1 时测"输出/工具调用配比失衡"扩展面与③④分离度 + 须证与 MAST FM-2.6 可分（D-005② 降级后）——P1 后的下轮 grill 必议项。
-   **D-001 约束**：五语义分类学维持既有立法，不为行为清单重开；"显摆不做事"不立第六语义（复合面归属注记已定，见 T-3 第 6 件）。
-   **D-007 封存**：ponytail 调查口子封存至下一个明确版本信号（新发版公告或机制级变更）；无信号不重开；重开时须先补基准调查工件。
-   **D-005③ 禁令**：2606.19544（实测 bias<0.011 且作者明示不可外推）**全仓禁作 verbosity bias 正面证据**。
-   **r2 backlog 工程卫生项**（BL-05/08/11/12/13/15/17/18 等）：非本轮账本范围，指针 `.scratch/grill-mental-model-r2/backlog.md`。

## 封账注记

r3 账本（D-001~D-007）封存于 `.scratch/archive/2026-10-19-grill-mental-model-r3/decision-ledger.md`。atomcode 调研工件（prompt×2 + report×2）留在 `.scratch/grill-mental-model-r3/` 原地；verbosity 证据以 `atomcode-report-pain2-followup.md` 为准（[pain2.md](http://pain2.md) 两处结论已被推翻，勘误头注为 T-3 第 12 件施工项）。r2 账本仍封存于 `.scratch/archive/2026-10-18-grill-mental-model-r2/decision-ledger.md`。

## 环境坑（继承 r2 closeout §5，指针）

-   `cmd; echo rc=$?` 经 cmd.exe 会假失败——验收一律用工具直接回显退出码；
-   主干推送只能 `git push origin main`（`but push` 不认 trunk）；本仓纪律：never push without explicit instruction；
-   GitButler 工作区勿用 `git reset --hard main` 硬追（会逼 teardown）；`.githooks` 勿装（`but setup` 会污染 git status）；
-   "绿"必须写明哪棵树；并行 flake 证据 = ≥10 次并行全量 npx jest 留 log。

## Suggested skills（工具型）

-   **$but**（GitButler）：任何提交/分支操作前必读；
-   **khazix/neat-freak**：动 scripts/docs 口径前；
-   **grill/engineering/domain-modeling**：变更票/词条落地格式；
-   **diagnosing-bugs**：T-1 若开查 instrument 身份 mismatch。