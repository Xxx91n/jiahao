# grill-t16 decision ledger

Authoritative record. Every user-confirmed substantive conclusion appends a
D-xxx entry here immediately: ID, original question, verbatim answer,
normalized requirement, explicit constraints/negative requirements, status.
## D-001 — round boundary: fix + mechanism round

- 原问题: Q1 轮界——audit-passed-with-findings 后下一轮绑定哪些线（a 窄修复 / b 修复+机制 / c 全域）
- 原回答原文: "b"
- 规范化需求: 本轮=修复+机制轮，议程：(1) F-A/F-B/F-C 实现束（R2 面=实现轮属地非 doc 轮豁免）；(2) F-D 裁决（披露 vs 修法）；(3) F-E nits 清扫；(4) verified_by 出口语义惯例（一行一验证器/按行选择器——杀灭多行腿并集求值类）；(5) 机制产出物在分类法中的位置（instrument-state.json/replay-*.json 第四类或 R2 内命名惯例）；(6) 轮报告数字陈旧类处置（收官重算惯例 vs as-of 标注）；(7) 常驻 cadence（defer-0060 季度、sunset 1/6、SLA 行）consent 清点；(8) 栈 landing 状态知情议程（owner 域动作非烤题）。
- 显式约束/负向需求: 战略评审不开启（sunset 1/6 未触发）；promotion 评审不开启（organic=0 无语料）；禁改 G1/G3/G4 阈值；grill 期间不改源码；三个 audit patch（tq/nl/xu）永不提交；F-A 修复不得把 defer0026 腿检查删掉（独立断言仍在 wiring 层存活，只是出口语义归位）；栈 landing 不是本轮自决项。
- 状态: current
## D-002 — F-A fix shape: exit keyed to live consuming row + crash-path exit-2 + convention

- 原问题: Q2 check-ci-jobs 出口码合流修复形态（a 键定活行 / b 按行选择器 / c registry 派生 / d 拆脚本）
- 原回答原文: "采纳"（对 a′ 三束同构修正版推荐）
- 规范化需求: **B1 实现束**（R2 实现轮属地，carve_out_used 不递增）：check-ci-jobs.js——exit=res.predicates.defer0004.satisfied?0:1；defer0026 腿保留计算+打进 stdout tag 行（诊断层非出口驱动）；头注释重写杀 F-B（multi-job 死谓词描述）；main() 包 catch→exit 2+stderr 行（crash masquerade=同类缺陷同束修，Nagios UNKNOWN catch-all 镜像）；注释块载惯例行+销账重指条款（defer-0004 销账时出口键须重指或退役于同一 registry 提交）。adr-0058-wiring fixtures 钉三方向（0004 满足→exit0/0004 未满足→exit1/0004 满足且0026腿退化→exit0且stdout含defer0026=unmet）+crash→exit2 fixture+0026 腿既有断言保留。**B2 惯例束**：账本载惯例原文——"verified_by 脚本的出口码只反映当前消费行的腿；多行报告是诊断，永不驱动出口"，措辞用"currently consuming"；CONTEXT 加一行惯例词条（兼作 F-C registry 编辑的耦合锚）。**B3 F-C 束**：defer-0004 rationale 补 "ADR-0058 D-C" 显式引，与 B2 同提交（ADR-0027/0033 D4 coupling guard）。
- 显式约束/负向需求: 惯例极=一行一验证器（exit keyed to consuming row）；(b) --row 选择器登记为预注册升级路径——第二个活消费者出现时激活，非现行形态（n=1 选择器=永久死代码）；否决 (c) registry 派生（循环依赖：check-deferred 跑验证器、验证器读 registry；出口码变 registry 格式函数=masquerade 类）；否决 (d) 拆脚本（0026 已 actioned 其 verified_by 永不执行=无消费者机器=decorative-assertion theatre 明拒）；defer0026 可观测性残余如实披露——evalSuggestions 丢弃验证器 stdout，0026 运行时降至 wiring 层，轮报告必须写明（summary job 另有 check-ci-wiring 覆盖非全孤儿）；atomcode 六搜七全文确认 (a) 高置信，crash→exit2 与残余披露两锐化采纳。
- 状态: current
## D-003 — F-D: mechanism-output artifact convention (R2-internal closed enumeration, ADR-0077)

- 原问题: Q3 governance_tooling_diff.files[] 语义（a 披露性补注 / b 立法命名惯例 / c 全覆盖+recompute）
- 原回答原文: "采纳"（对 b′ 修正版推荐）
- 规范化需求: **新 ADR-0077 显式修订**（不静默改写 ADR-0076 D-B(2)——被审计钉的字面句 "which R2 files the round touched" 必须在 ADR-0076 指针行 + surface-taxonomy diff_semantics 两处同时显式取代，防矛盾文本并立）。**mechanism_outputs 块**进 surface-taxonomy.json：R2 内子类封闭枚举（非残留，同 R1 闭包纪律），每项 {file, generator, replay_verified}——成员含 src/instrument-state.json、bench/research/out/g6-publish-replay.json、anchors.json、rewrite-map.json、taxonomy R1 快照、pack 记录等；wiring 断言每项归类 R2+生成器存在+未列文件不得声称豁免。**diff_semantics 重措辞**：files[] 管辖域=机器源手改；产出物豁免条件=忠实再生（faithful="diff 等于在该提交重跑注册生成器的产出"，Go 生成文件惯例 verbatim：非正典源、删掉重跑 diff 为零）；手改产出物=独立更重违例（伪造计量边缘）且必须进 files[] 披露。**可选 sibling 标记** mechanism_output_diff:{files,reason}——溯源可见不喂烧率，checker 验清单文件∈mechanism_outputs，裸标记硬失败（镜像 carve_out_used=1 校验）。**t15 行 additive-only 补注**（两个触碰归产出物类，历史布尔不动，carve_out_used:1 保持）。replay_verified:true 者重跑比对=审计升级工具（初期非 blocking gate）；非幂等生成器（时间戳）记 replay_verified:false 为登记欠账。
- 显式约束/负向需求: D-001 议程 5 的极裁决=**R2 内惯例**（第四类破 D-A 三选一不变量+产出物逃出 R2 管辖，否决）；否决 (a) 仅披露（类不命名则每轮换件复发）；否决 (c) 全覆盖清单（复制 git+误读证据范围+再生噪声淹死烧率信号）；无新 registry 行、无新 gate（比例先例）；豁免是 checker 验枚举非自声明布尔（recomputed-not-trusted 不破）；防游戏四守卫：具名违例类/replay 机械裁决/git 考古威慑/生成器幂等钉；动机漂移不可技术根除如实记；atomcode 确认 (b)，锐化（ADR-0077 显式取代+封闭枚举+replay_verified 属性+裸标记硬失败）采纳。
- 状态: current
## D-004 — round-report staleness class: facts-artifact canon + close-regen carrier

- 原问题: Q4 轮报告数字陈旧类处置（a 收官重算 / b as-of 标注 / c 事实工件 / d 维持现状）
- 原回答原文: "采纳"（对 c′ 修正版推荐）
- 规范化需求: **主形态=facts 工件 canon**：scripts/build-round-facts.js 收官时（T-2 尾步）重生成 .scratch/grill-<tN>/round-facts.json——schema：suites/passed/skipped、pack_bytes、instrument_entries、rewrite_map_citations、registry_entries、anchors_count、battery_as_of_commit、**report_commit:null**（自指以诚实 null 化解）、not_run 通道数组。报告 facts 节由脚本确定性内嵌渲染，**正文禁裸数字**（wiring 可钉 facts 节外不得复现 schema 键值）。**承载步=收官重算**（a 降为步骤非形态）。**as-of/addendum 收窄为窄通道**：仅承载真期后事件（owner 批准、T-3 签核）与自指披露——ASC 855 类比：陈旧数字是调整性事件必须重述非标注；t15 T-3 addendum 模式保留但不再承担修正正文数字职能，t16 轮报告显式记一句收窄防审计误读为删减。ADR-0077 载惯例行+CONTEXT 词条（同 D-002 惯例词条通道）；**显式裁决性偏离**：facts 工件不入 anchors 链（每轮再生 churn 摘要链，anchors 服务慢变工件）——理由一行写进 ADR-0077（披露不盲从先例）。工件落点按 D-003 枚举纪律对齐归类（.scratch=R3 工件属地 / docs/governance=R3 前缀但可入 mechanism_outputs 讨论）。
- 显式约束/负向需求: 否决 (b) 为主形态（把已知陈旧合法化，调整性事件应重述）；否决 (d) 现状（连续两轮实证失效）；无新 gate、无新 registry 行（比例先例+sunset 计数器判词同构）；散文判词："报告是叙述，永远不是数字宿主"（平移 D-002 "账本非状态宿主"）；自指不得用伪值填补——report_commit:null 是设计非缺漏；atomcode 八搜五全文确认 c 主+a 承载，锐化（ASC 855 二分/addendum 收窄/report_commit:null/不入 anchors 显式理由）采纳。
- 状态: current
## D-005 — closeout form: light close + clean R1/R2 split + consent-sweep residuals + zero asks

- 原问题: Q5 收尾形态（a 审计与否 / b 阶段结构 / c 残留归并 / d owner 呈请）
- 原回答原文: "采纳"（对 a1+b+c+d 全包推荐）
- 规范化需求: **a1 轻收尾**：ADR-0074 D-F 三触发无一响（面小于 t15）——自检电池+owner 批准闭轮+处置列下审复核面；电池显式含新机械（adr-0058-wiring 三方向+crash fixture、mechanism_outputs 枚举断言、facts 工件渲染钉）。**阶段结构（carve-out 不援引——文档束全 R3、实现束全 R2，burn-rate streak 自然归零）**：R1 文档束=ADR-0077（F-D 惯例修订+facts canon+不入 anchors 理由行+addendum 收窄）+CONTEXT 词条×2+diff_semantics 重措辞+mechanism_outputs 封闭枚举+t15 行补注+defer-0004 rationale F-C 引注（B2+B3 同提交解耦合守卫）+账本 T 段 consent 行+defer-0062 tally+README 索引 77；R2 实现束=check-ci-jobs 出口归位+头注释+crash→exit2+惯例注释块+adr-0058-wiring fixtures（脚本与钉它的测试同一实现提交）+build-round-facts.js+模板渲染钉+F-E nits 六项+轮报告（facts 节工件渲染）。时序 R1 先行 spec-first，R2 收尾出报告。**残留归并**：F-A/F-B→B1；F-C/F-D→R1；F-E→R2；cadence 项（defer-0060 季度 12-15、sunset 1/6、SLA 行、O-E）处置时点各落一行 ledger disposition（consent-sweep 措辞非 audit response）；栈 landing 知情行非决策项；三 patch（tq/nl/xu）永不提交+轮报告重述显式 ID 教训。**零 owner ask**：T-3 全销，defer-0060 是登记行非 ask，栈 landing 仅知情注记。
- 显式约束/负向需求: 否决 a2 惯例性审计；措辞守卫延续（consent-sweep/standing-review-surface 永不称 audit response）；fixtures 与脚本同提交（tests with behavior they verify）；R1 全程不碰 R1/R2 文件（本轮无 carve-out 需要）；dialectical 记录：Q5 未走 atomcode（先例直接适用，non-contested），其余四题全部经 atomcode 且零冲突。
- 状态: current
## T-1 dispositions (R1 documentation round, 2026-09-18)

Executed per handoffs/next-round.md T-1. Each row names its evidence; this section is the same-commit ledger note for the R1 registry edits and records the consent-sweep for the standing cadence (consent-sweep framing - never "audit response").

- Convention verbatim (D-002 B2): "a verified_by script's exit code reflects only the legs of the row(s) currently consuming it; multi-row reporting is diagnostic, never exit-driving." Worded "currently consuming" so the per-row selector stays a pre-registered upgrade path, not a contradiction, when a second live consumer appears. CONTEXT.md carries the Consuming-Row Exit term (settle commit) and the Facts Canon term; the discharge re-point clause lives in ADR-0077 D-A.
- defer-0004 — rationale gained the explicit "ADR-0058 D-C" citation (settles audit F-C): the narrowed re-defer is one of the three exits ADR-0058 D-C pre-registers (activate / re-defer + update rationale / close). Same commit as the CONTEXT carve-out gloss touch per the coupling guard (B3 anchor).
- defer-0062 (t16 doc-round net-addition tally) — CLOSED via this same-commit ledger note. The grill-t16 row exists in docs/governance/trend-inventory.json (+1 ADR-0077; zero_product_diff=true; carve_out_used:0 - the carve-out is not invoked this round, burn-rate streak resets) and the ADR is registered; nothing left to disposition (defer-0059/0061 precedent).
- defer-0058 (standing per-round net-increment review) — EXECUTED for grill-t16: net registry increment +1 (defer-0062 added and closed; defer-0004 stays deferred; no actioned/closed transitions otherwise).
- defer-0060 (CI gate-all permanently-red channel) — stays pending-evaluation on quarterly cadence (review_at 2026-12-15); a tracked row, not an ask - the owner actions (secret regen + required-check deployment) are its unfreeze_if.
- defer-0055 + sunset counter — stays pending-evaluation on quarterly cadence; the counter stays 1/6 (missed check-in is not a zero; organic=0 across provenance classes at the last observation); the next quarterly observation is the 2026-12-15 tide.
- defer-0053 — stays pending-evaluation (unfreeze_frozen).
- defer-0057 — stays pending-evaluation (t13 tally row; closes at the next trend-anchor evaluation).
- O-E backlog (telemetry export breadth) — stays deferred as an observation on the standing consent-sweep; low-priority backlog, no failure driver.
- Stack landing (grill-t15-docs, unlanded commits incl. the t16 settle commit) — awareness line only: landing is owner-domain, not a decision item this round.
- Mechanism surface — ADR-0077 lands D-A (exit convention) + D-B (mechanism_outputs closed enumeration: src/instrument-state.json replay_verified:false, g6-publish-replay.json replay_verified:true; diff_semantics reworded to machinery-source hand-edits jurisdiction; mechanism_output_diff sibling marker registered) + D-C (facts canon; the artifact deliberately does NOT join the anchors chain - per-round regeneration would churn the digest chain) + D-D (registrations). ADR-0076 D-B(2) is amended via pointer line, never silently rewritten - the flagged phrase is superseded in both places.
- t15 trend row — annotated additively (mechanism_output_diff lists the two output-class touches); historical booleans untouched. The t16 row carries the first mechanism_output_diff marker use: g6-publish-replay.json refreshed by the gate during the R1 battery (faithful regeneration, not a machinery-source edit).
- R1 exit battery: taxonomy closure test green + anchors in sync + inventory/deferred green + the new adr-0076-wiring assertions green; boundary commit must be green.
- WORKFLOW.md — permanent absence stands (registered at t15); the version-control conventions live in the but skill, the task-book handoffs, and the AGENTS.md working agreement.
- The three audit patches (tq/nl/xu) stay untracked forever; but commits use explicit change IDs only.
