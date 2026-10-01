# grill-t35 decision ledger

Source of truth for this round's confirmed decisions. Append on each
confirmed answer: ID (D-001+), original question, verbatim answer,
normalized requirement, explicit constraints/negative requirements,
status (current/revised/stale/deferred).

## Records

## D-001 — 调研门处置：等 5h 额度窗重置后同会话续跑（选项 a）

- 原问题：atomcode 调研（Q1 轮对象界定）在仓内回读完成后、工业界调研
  中途触发 5h rate-limit 窗口（resets around 01:50）。选项：a 等重置后
  resume 续跑 / b 跳过外部调研直接拍板 Q1 / c 换调研面（Perplexity/exa）。
- 原回答原文：采纳
- 规范化需求：不跳过调研门、不换调研面；5h 窗口重置后以同会话续跑
  atomcode（resume anchor 79045536-e489-4242-9186-8d3ecc3bbbdd），拿到
  完整调研结论后回到 Q1 呈终稿供拍板；续跑前 Q1 暂停在途。
- 显式约束/负向需求：不杀 atomcode 进程（skill 硬护栏）；不发起第二个
  并行调研（串行共享配额）；续跑用同问题同超时（单变量续跑）。
- 状态：current


## D-002 — 轮对象：公开树等价契约轮（α′′ 收窄版）

- **原问题（Q1′）**：t35 轮对象界定。候选：α′′ 公开树等价契约轮（收窄——四根束中 (d) 密件供给漂移拆出契约核心；修复 (a)(b)(c)+post-land 验证义务+lane-sha 引文卫生腿+末次变更电池覆盖+E-27 注册；defer-0078 顺延）；β defer-0078 按计划上烤、红束轮外 hotfix；γ 纯修复轮不立契约；δ 其他。
- **原回答原文**：「采纳」
- **规范化需求**：t35 = 公开树等价契约轮，契约形="被验证对象 == 公开对象"。轮内第一腿=修复三等价根（R-A handoff 0x08 字节修复+披露、R-B ADR-0079 D3/D6 改钉 restack 存活锚或公开 sha 重钉+披露、R-C rewrite-map 按落地树重生覆盖）；契约三腿=post-land 验证义务（landing 波未观察到公开 tip 绿不算 closeout）+ lane-sha 引文卫生腿（提交文本禁引公开历史不可解析对象，display-form 豁免沿用）+ 末次变更电池覆盖（最后 claim 面 mutation 后必重跑电池或 doc-surface pins）；E-27 注册四根束；R-D 拆出记为独立腿披露+owner 行动登记；defer-0078 记顺延 check-in；新腿走 ADR-0076 D-B carve-out 并入 manifest 计数面。
- **显式约束/负向需求**：(d) 不混入契约核心（异质——供给/fixture 完整性）；引文卫生腿必须走棘轮腿/carve-out 注册通道不得平行自建；post-land 义务在 spec 中显式引 F-6 暴露窗定义（推广非新发明）；不得顺手改 t34-D-002 事实源条款；closeout 语义如实承认公开面绿以密件恢复为条件（owner-gated，不可自宣绿）；forward-only 不改写历史；grill 阶段不动源码；defer-0078 仅顺延 check-in 不立新条目。
- **状态**：current（其中「post-land 验证义务（landing 波未观察到公开 tip 绿不算 closeout）」句经 D-003 revised-精化：blocking 对象改为本地落地树重验，公开 CI 观察回 baseline-CI 下轮入口——原句保留于上文本）
- **调研**：atomcode-t35-q1（本会话，置信度 0.7）——五工业模型收敛；(d) 拆出是同质性条件；与账本零冲突。**附注**：并行会话的第二份独立调研（.scratch/grill-t35/atomcode-q1-out.txt，同题 verdict α′）含五条加宽建议与一项 defer-0079 吸收注册要求——与本记录主文呈述存在绑定点/构造面差异，待 owner 裁决吸收与否（见呈报）。

## D-003 — 四处置裁决：Δ1 混合 / Δ2 扩枚举面 / Δ3 轮内独立腿 / Δ4 显式部分吸收（a 全采纳）

- **原问题（Q2′）**：第二份独立调研（并行会话 atomcode-q1-out.txt）与本会话调研（atomcode-t35-q1）在四处机制形态上的分歧/加宽裁决：Δ1 post-land 验证义务绑定点（blocking-closeout / seal-bound trailing / 混合）；Δ2 lane-sha 引文卫生构造（新门腿 carve-out / 扩展既有 --published-only+orphan-ancestry 枚举面+豁免）；Δ3 R-D 供给漂移居所（轮内独立腿披露 / deferred-registry pending-evaluation 行）；Δ4 defer-0079 部分吸收声明义务。
- **原回答原文**：「采纳」（对应选项 a=四项全采纳）
- **规范化需求**：Δ1=混合——post-land 本地公开树重验腿（fetch origin/main 后对落地 tip 重跑 sha 锚定腿子集）作 wave blocking；公开 CI 观察保持 baseline-CI 下一轮入口形态（trailing）。Δ2=引文卫生不走新腿权威类：扩写 rewrite-map --published-only / orphan-ancestry 既有枚举面到全部 committed 文档引文+注册豁免面（orphan-cites.json 形态），枚举面契约变更在本轮 ADR 显式声明。Δ3=R-D 轮内独立腿披露+owner-action 清单（可带 refresh deadline 字段），不进 deferred-registry（断供事件非待评估项）。Δ4=spec 显式声明对 defer-0079 的部分吸收+残余范围重述（判据：问题域重叠即声明）。残余约束采纳：监控自指失明→轮外第二方审计兜底（defer-0030 通道）；机械化优于人步（defer-0025 教训）。
- **显式约束/负向需求**：可用性/基础设施侧红在契约外（equivalence 只管树内容等价）；Δ2 不得静默改 rewrite-map 工具契约（ADR 内显式声明）；Δ4 是部分吸收非整体取代；R-D 断供事实必须落 claim 面一等披露不可埋进 defer 队列语义。
- **状态**：current
- **调研**：atomcode-t35-q2（置信度 Δ1=0.78 / Δ2=0.72 / Δ3=0.70 / Δ4=0.85）——merge-queue 事故处方（写路径正确性检查非可用性监控）、SLSA upload-time RECOMMENDED、canary blocking-promotion 三层收敛；与账本零冲突。

## D-004 — post-land 重验载体：(a) 修正版全条款（采纳）

- **原问题（Q3′）**：post-land 本地公开树重验的载体形态——新脚本+每波必跑+closeout 工件 sentinel 块+doc-scan 断言扩展（α′）/ 脚本+AGENTS.md 条款即止（β）/ gates.json CI 腿（γ）；atomcode-t35-q3 裁决 (a) 修正版并加两修正一披露。
- **原回答原文**：「采纳」（对应选项 a=采纳 (a) 修正版全部条款）
- **规范化需求**：新脚本 check-post-land.js——fetch origin/main→临时 worktree→跑波界有界子集（last-verified-tip..origin/main 内新落地 commit 的 map-freshness 覆盖 + tip 树 doc-hygiene[docHygiene 抽 shared lib] + 锚/pin 解析），输出机读块；每个 land/push 波后必跑、绿才算波次完；closeout 工件必带 <!-- post-land-verify v1 --> 块（锚最后被执行验证的波，declared≠tip-verified）；末波残余窗显式注册为 owner-action 带 refresh deadline、逾期升级=erratum 通道；下一轮 T-0 序内首轮跑本脚本（闭环自愈）；doc-scan 腿扩枚举断言块在（anchoring-footer/audit-surface 同族，前瞻生效）；ADR 内显式声明 sentinel 块断言对 defer-0030 二方审计是**从属非替代**（审计范围收窄为断言块+抽查）；全历史走查留轮边界。
- **显式约束/负向需求**：定位=检测性非预防性（自指观察防不了伪造，伪造防线=F-7+defer-0030）；不进 gates.json 为 CI 腿（观察点错位）；(b) 散文形若过渡使用须登记断言面债务（E-25 同类）；子集漂移由 Δ2 注册豁免+ADR 显式声明覆盖。
- **状态**：current
- **调研**：atomcode-t35-q3——Argo postPromotionAnalysis（验证绑补偿性决策非落地动作；finality 推迟到验证完成）、in-toto attestation（工件携带证明+消费侧策略检查双层）、rekor-monitor（独立监控者）、smoke-test 命名断言边界；与账本零指名冲突。

## D-005 — map-freshness 不变式语义：(c) 混合（tip-map 升 authority + per-commit 降 advisory）

- **原问题（Q4′）**：R-C 修复处置——check-map-freshness 的 per-commit 内嵌 map 不变式在 GitButler 多 lane 落地重排下结构性失效（内嵌 map 冻结不可修），(a) 纯 tip-map / (b) 保内嵌+钉名豁免+regen 波 / (c) 混合；atomcode-t35-q4 裁决 (c) 高置信。
- **原回答原文**：「采纳」（对应选项 a=采纳 (c) 混合全部条款）
- **规范化需求**：tip-map 覆盖语义升为 authority（blocking）——断言=已发布线 tip 的 rewrite-map ⊇ 线上每个 claim commit 的引文集∪；per-commit 内嵌检查降为 audit-time advisory 且编入 build-audit-checklist 派生清单（ADR-0091 机制，审计员 attest 其状态防 advisory 腐烂）；D-003 Δ2 的枚举面扩展改挂到该 advisory 腿；本轮 ADR 显式声明=对 ADR-0087/0089 覆盖语义的修订 + defer-0030 从属强化（tip-map authority 化后自指面变大，二方审计优先级升）；确定性 regen 双跑（E-17）从配套纪律升为 authority 成立前提；四破损 commit 经 tip-map 重生自愈、零豁免条目。
- **显式约束/负向需求**：否定断言（"引文不在 map"）只能由确定性重生背书、不得由消极缺席背书（Rekor v1 反指）；不引入豁免通道条目；不回溯修历史 commit。
- **状态**：current
- **调研**：atomcode-t35-q4——TUF snapshot/Rekor checkpoint/CRL 快照三链收敛"活体登记表+当前 checkpoint"；OCSP stapling 退役=per-artifact 通道先例；squash/rebase 下 per-commit 检查工业界一律重锚未来 tip。

## D-006 — R-B 处置：sha-free 配对扫描 + baseline 注释降 display-form（修正形 a+，采纳）

- **原问题（Q5′）**：translation-baseline pin 生存策略——sha-free 派生断言（原 zh-tip 边界形被调研证实有洗白窗口：README 未配对漂移后 zh 独立提交令 range 恒空、漂移永久洗白，严格弱于现状）vs 重钉公开 sha（Q4-β recurring 类）vs advisory 降级；atomcode-t35-q5 裁决修正形 (a+)。
- **原回答原文**：「采纳」（对应选项 a=采纳修正形 (a+)）
- **规范化需求**：D6 断言改为公开线**历史配对扫描**——枚举已发布线上每个触 README.md 的 commit，断言其 changed-files 同触 README-zh-CN.md（零 sha 名、restack 免疫、无洗白窗、强度不低于钉值形且堵"README 单动→zh 补→re-pin 漂白"三步合法漂白）；D3 的"存在+祖先"断言降 advisory/删除，translation-baseline 注释降 display-form 溯源行（sha 更新到 816e7bf3 作时点记录、非断言对象）；ADR-0079 必须 amendment（ADR-0083 D-003 禁 dual-reading——注释语义降级须 ADR 文本同步声明）；613a2471 等孤儿 sha 引文走 Δ2 豁免/重映射注册；配对扫描列入 check-post-land 波界子集；合法拆分情形走显式豁免面注册。
- **显式约束/负向需求**：禁止 zh-tip 边界形（已证伪）；内容级漂移仍不可测（与钉值形同、无强度退让，骨架断言已部分覆盖）；不测指针外语义。
- **状态**：current
- **调研**：atomcode-t35-q5（机制层高置信）——Crowdin/Weblate/Lokalise 均不把源 sha 钉进翻译工件（string identity+内容比对）；lockfile 两层模型=契约层做断言、记录层做溯源；ADR-0085 认领时点语义支持 display-form 保留。

## D-007 — 落地前电池覆盖载体：pre/post 双段 sentinel（(a) 修正版，采纳）

- **原问题（Q6′）**：末次变更电池覆盖（F-6 窗 lane 侧）的载体——pre+post 双绑同块（α′）/ AGENTS.md 序条款（β）/ 只靠 post-land（γ）；atomcode-t35-q6 裁决 (a) 修正版。
- **原回答原文**：「采纳」（对应选项 a）
- **规范化需求**：<!-- post-land-verify v1 --> 块扩为双段——pre_land 段（断言对象=workspace 合成合并树即 will-land 对象，merge-group 语义的本地模拟；记[波内最后 claim-mutation sha, 断言运行时戳, 子集范围]）+ post_land 段（落地树重验结果）；每波一块/段、块锚波不锚轮；断言腿机械校验 pre 时戳≥波内最后 claim mutation 时戳且两段独立读（pre 红不被 post 绿豁免，ADR-0091 D-D 反 masking）；走 authority 腿层不写 hook（hook=fast-feedback 可旁路）；ADR 必写三披露：时戳自填=forensic 非 preventive（防遗忘不防伪造）、伪造检测权威=git show 级 replay、不引入 TSA（信任域未分离）+armed trigger 预登记（伪造型病例→升独立信任域）；措辞=F-6 窗收窄非消除（mutation→pre-run 分钟级），残余窗裁决属 post-land+F-6 ritual。
- **显式约束/负向需求**：不断言"运行后树未变"（收窄非关闭）；pre/post 断言同类对象防对象漂移；不把 sentinel 块锚到轮粒度。
- **状态**：current
- **调研**：atomcode-t35-q6——GitHub strict mode/stale-status-reuse 命名、merge-queue 合成提交重跑、Argo pre/post-promotion 双段、Rekor v1→TSA 自填时戳先例；与账本零冲突，两处 ADR 衔接声明（反 masking/F-6 收窄）。

## D-008 — 沉默项处置裁定：1-8 全部按机械/事实项进 spec（选项 a）

- **原问题**：文档整理对账时列出的八项账本沉默内容（载体编号绑定 ADR-0092/order-230+/脚本名/sentinel 名；R-A 字节 fix-forward 机械形；R-C 落地重生执行动作；defer-0078 check-in 与 defer-0079 吸收声明注册行文；audit-checklist 居所裁定=非 CI job 入 sentinel 腿非清单面；CONTEXT 候选新词；E-27 与 owner-action 注册位置；交接声明含 defer-0084 与条件绿约束）——按机械/事实项进 spec 还是须先升账。
- **原回答原文**：「a」
- **规范化需求**：八项全部以机械/事实注记身份进入 spec-t35 文档，不构成新实质决策条目；其内容面以 spec 为准。
- **显式约束/负向需求**：同 t34-D-005 先例——机械项不伪造为"已拍板的实质决策"；若整理中发现它们需要实质裁断则回炉提问。
- **状态**：current
