# grill-t15 decision ledger

Round: post-audit-land disposition / next-decisions round (grill-t15).
Source of truth for the doc closeout. Append on each confirmed answer.
## D-001 — round boundary: disposition + mechanism round

- 原问题: Q1 轮界——audit-landed 后下一轮绑定哪些线（a 窄处置 / b 处置+机制 / c 全域）
- 原回答原文: "b"
- 规范化需求: 本轮=处置+机制轮，议程：(1) F-1..F-5+nits 裁决框架（审计发现项结构化呈请 owner 裁决）；(2) defer-0004+defer-0026 激活评审——check-ci-jobs 报 SATISFIED，ADR-0035 D6 人审，耦合同轮评估；(3) Ask A（seq-24 签核）+Ask B（defer-0051 ratification）再呈请；(4) sunset 计数器持久归宿机制题（ledger-borne vs registry 字段 vs 工件）；(5) spec-sync 检查提案——披露的生成器修复必须配 spec diff hunk 的 lint/wiring 门；(6) "源码改动"边界条款——doc 轮内改 package.json files[] 内门禁脚本的定性+zero_product_diff 语义收紧；(7) CI on main 连续红（t10..t14）立题裁决——standing topic vs 显式接受；(8) 常驻 cadence（defer-0053/0055/0057/0058+O-E）consent 清点。
- 显式约束/负向需求: 战略评审不开启——t14 D-004 sunset 触发器未激活（计数器 1/6），即兴开启=绕过自立的预注册机制；promotion 评审不开启（organic=0，N/M 限定词无语料可评）；禁改 G1/G3/G4 阈值；grill 期间不改源码；F-1 实质裁决权归 owner（Ask B accept/reject），本轮只做结构化呈请不代决；两个 audit patch（tq/nl）永不提交。
- 状态: current
## D-002 — sunset counter durable home: governance artifact in anchors chain

- 原问题: Q2 sunset 计数器持久归宿（a ledger-borne 现状 / c 独立 registry 行 defer-0060 / e 治理锚区工件）
- 原回答原文: "采纳"（对 e′ 修正版推荐）
- 规范化需求: 计数器落 docs/governance/sunset-counter.json——git 追踪专用工件纳入 ADR-0061 anchors regen-and-diff 摘要链（13→14 件），享受 sha256 防篡改；账本降级为逐次检查点追加式审计轨迹而非状态宿主；不开 defer-0060 行；defer-0055 保持 pointer-only（可允一句指针注记）。五条硬性条款：(1) schema=trigger_ref/n_target=6/consecutive_zeros/observations[{check_in_date,organic_events,evidence_ref,ledger_ref}]/reset_events[]/activation 单向闩/verified_by=telemetry checkpoint，单写者=轮次处置，telemetry 只产证据不写状态（测量/状态分离）；(2) reset 语义：organic>0→清零且追加 reset_event（禁静默覆盖），**缺季≠零**——未执行 check-in 不推进计数，记 missed_check_in 并冻结；(3) 激活先记账本再写 JSON activation，ledger_ref 互指，仅 SUGGEST（ADR-0035 D6）；(4) anchors 纳管+adr-0075-wiring 补 coherence 断言（存在性/n_target=6/observations 尾与账本一致）；(5) ADR-0075 D-C 补一行落地指针。
- 显式约束/负向需求: 否决 (c) 独立 registry 行——行仍受 registry 生命周期机械（cadence/closes_if/check-deferred 催办），是把被否决的依赖反转从 0055 平移到 0060，形式合规实质同险；否决 (a) 账本宿主——与轮次簿记同失败域，漏写即连续性不可证伪断裂；否决 telemetry/instrument 工件——混淆测量与记账；"缺季冻结非视为零"是 D-C 操作化收紧（tighten-only 合规）须显式写出；激活不产生处置权（stays human）。
- 状态: current
## D-003 — defer-0004/0026 human activation review: 0026=actioned, 0004=re-defer narrowed

- 原问题: Q3 SUGGEST 双行人审——defer-0026（actioned / closed / 保持 deferred）与 defer-0004（activate / re-defer 收窄 / close）
- 原回答原文: "采纳"（对 0026=actioned + 0004=re-defer 收窄修正版推荐）
- 规范化需求: defer-0026 → status=actioned——工作本体已由 ADR-0058 D-F/D-G 执行（ci.yml 活验 gate-all+test(JIAHAO_TEST_TIER=public)+summary(always(), success-only seen==expected guard)，四谓词 SATISFIED）；actioned_at=本轮日期；actioned_via 引 ADR-0058 + 谓词验证 + same-commit ledger note（t13/t14 T-2 先例）；**附带 limitation 字段**：branch-protection required-check 部署仍是仓库管理员动作（平台 403）+ CI 绿是环境条件（R10），均非延期工作本体——防 actioned 被误读为对承载问题整体的背书。defer-0004 → re-defer 收窄：新 unfreeze_if=ci.yml 跨多 workflow 文件 OR 任一 job 声明 matrix OR job 数 >3；status 保持 deferred+verified_by=check-ci-jobs.js（谓词同步重写）；rationale 更新记录"multi-job 已至（ADR-0058）且未构成渲染器充分理由"。处置记录显式引 ADR-0058 D-C 保持链条。
- 显式约束/负向需求: 禁 activate defer-0004——原 rationale 双腿未被撼动（渲染器藏意图漂移 ADR-0032 D2 + 文件未挣到渲染层）；禁 close defer-0004——real-options 框架下标的已升值（1→3 jobs ~56→~130 行），close=销毁活期权+tripwire；禁把 re-defer 写成散文触发——无 verified_by 会被 ADR-0033 D3 强制降级 pending-evaluation，丢机器绊线；check-ci-jobs 谓词重写是源码改，必须排进实现相并与 registry 编辑同提交（grill 相不做）；permanently-SATISFIED 活信号=告警疲劳反模式必须消灭。
- 状态: current
## D-004 — spec-sync check: bidirectional token assertions in adr-0074 wiring test

- 原问题: Q4 spec-sync 检查机制形态（a 内容断言 / b diff-pairing 耦合门 / c 通用 token 注册表 / d 仅纪律）
- 原回答原文: "采纳"（对 a′ 修正版推荐）
- 规范化需求: 扩展 test/adr-0074-wiring.test.js 现有 companion-docs describe 块（spec fixture 已在读）：spec 侧钉机制词汇——Inputs 节须含 `git ls-files`+`ls-tree -r HEAD` 近邻共现+`untracked` 约定词；生成器侧反向钉 `ls-tree`/`ls-files` 调用点存在性——双向钉使任一侧单边漂移测试红。不开新 gate 条目（wiring 测试已随 gate:all 进 CI，gates.json 注册=违反比例原则）。F-2 的 Inputs 文案修订（补 union 枚举语义）与断言同提交完成。落地 ADR/账本记一行惯例："权威 spec 治理生成器时，其 wiring 测试双向钉语义契约点"——为第二对 spec-code 对预答。
- 显式约束/负向需求: 禁钉散文/行号/节序/整句/SHA（断言脆性→snapshot 疲劳→盲批链）；只钉机制词汇（枚举源语义变=spec 本就必须改，断言红是预期拖拽）；否决 diff-pairing 门（拦不住 F-2 半落地形态+与 ADR-0027 coupling 词汇撞车）；否决通用注册表（n=1 过度设计）；残余洞如实接受——断言只覆盖预期内维度，未断言维度漂移不可见（executable-spec 语料同级残余）。
- 状态: current
## D-005 — edit-surface taxonomy + zero_product_diff semantics (F-4 resolution)

- 原问题: Q5 边界条款——面分类法（三面）/ doc 轮编辑许可（b1 绝对线 / b2 分类豁免 / b3 仅修指标）/ zero_product_diff 语义（c1 布尔重定义+补字段 / c2 三态）
- 原回答原文: "采纳"（对 b2′+c1′ 修正版推荐）
- 规范化需求: 新 ADR 立三面分类：R1 runtime=bin require-chain 闭包（install.js+resolve.js+src/shared/paths+src/evidence-log/**，hooks/ 与 thresholds.json 待闭包扫描定类）；R2 governance=check-*/build-*/run-*/collect-*/derive-*/eval-*/instrument.js/pairer-lane-telemetry/bench/等；R3 docs=docs/**、CONTEXT、README、AGENTS、.scratch、trend-inventory。面清单落机器可读文件 docs/governance/surface-taxonomy.json，wiring 测试扫 install.js require 闭包断言每文件归类+runtime 闭包完整（防清单漂移）。b2 carve-out 三闸门：(1) 必要性——justification 引触发工件（仅限本轮工件真实性必需）；(2) 披露——台账行必填 governance_tooling_diff:{files,reason} 且当轮 ADR Decision 段点名；(3) burn-rate——carve_out_used 标记入台账，连续两轮 carve-out 即 advisory。c1：zero_product_diff 重定义=未碰 R1 面（历史语义保持），新增 governance_tooling_diff 布尔（独立维度可同真），check-governance-inventory 加 recomputed-not-trusted 断言，adr-0064-t1-wiring 加两测试（schema 收新字段+runtime 面文件现于 doc-round diff 时报错）。CONTEXT 收词条 Round Edit Surface；AGENTS.md 仅一行指向 ADR。t14 台账行按新语义如实补注 governance_tooling_diff。
- 显式约束/负向需求: 细则不写 AGENTS.md 本体（绕过 ADR 修订纪律）；carve-out 只覆盖 R2，R1 永远实现轮专属；动机漂移风险无法技术根除——burn-rate 监控是控制非根除，如实记录；taxonomy 枚举禁手写维护（wiring 闭包扫描为权威）；否决 c2 三态（历史 5 行迁移语义+advisory 逻辑无中间态消费者）；否决 b1（合法但不诚实僵局：F-4 修复是工件真实性必要条件）。
- 状态: current
## D-006 — permanently-red CI channel: register defer-0060 tracked row

- 原问题: Q6 CI 连续红处置（a 注册 tracked 行 / b ADR 散文现状 / c corpus-free 子集 / d expected-fail）
- 原回答原文: "采纳"（对 a′ 修正版推荐）
- 规范化需求: 新开 defer-0060 登记行——subject=CI gate-all 通道永久红：JIAHAO_BENCH_CORPUS_B64 重生成（tarball 须暴露 bench-corpus/mr-probes.jsonl）+同源 403 required-check 部署，皆仓库管理员专属动作；type=external-event、status=pending-evaluation、cadence_tier=quarterly、review_at=2026-12-15（对齐既有潮汐）；**verified_by 不填**（external-event 不可机器求值，填了=decorative-assertion theatre）；unfreeze_if=owner 重生成 secret 且 R13 诊断输出绿 和/或 部署 summary required check；closes_if=main 上 CI run 经 summary 聚合转绿 OR owner 以同提交 ADR 修订明示退役该通道；rationale 引 ADR-0058 R10/R13+折叠 403 carrier（同凭据类同干预面）+写明"defer-0026 limitation 是历史记录，本行是 403 问题唯一活追踪者"+id note 披露（defer-0060 曾为 D-002 被否的 sunset 行占位名、从未落地，id 归先落地者）。**同提交**给 ADR-0058 R10/R13 节尾加指针行（ADR-0033 D4 锚定+ADR-0027 coupling guard 一行解两门）。实现相落地。
- 显式约束/负向需求: 否决 (b) 散文方案（GOV-12 Level-1 不作为式默认接受；红两天即常态化+破窗实证）；否决 (c) corpus-free 子集（CI 绿变语义不同的绿，制造新歧义）；否决 (d) expected-fail（fail-closed→fail-silent，违 quarantine 三件套）；owner-action 行的 check-in 诚实语义="问 owner 动了没"非机器探测；pending-evaluation 滞留 SLA（min 2 周期/12 月）即反常态化第二道闸，不得豁免。
- 状态: current
## D-007 — closeout form: light close + two asks + R1/R2 corrected split + consent-sweep residuals

- 原问题: Q7 收尾形态（a 审计与否 / b owner 呈请 / c R1-R2 切分 / d 残留归并）
- 原回答原文: "采纳"（对 a1′+修正表 最终推荐）
- 规范化需求: **a1′ 轻收尾**：ADR-0074 D-F 三触发无一响（无外部宣称/无清洗区/无风险阈值越线，与 t14 同类面）——自检电池 + owner 批准闭轮 + 处置列下次审计常设复核面；电池须显式含新机械三项（taxonomy 闭包测试绿、anchors 新计数同步、D-004 双向断言过），只跑旧电池的绿色边界会掩盖 D-002/D-004/D-005 半落地。**carve-out 首援引工件级可证**：check-ci-jobs.js 谓词重写是 D-005 豁免首次使用——necessity 引触发工件（defer-0004 收窄必须谓词匹配否则 SATISFIED-forever 告警疲劳=D-003 明禁）、台账 governance_tooling_diff:{files:[check-ci-jobs.js],reason}+ADR Decision 段点名、carve_out_used:1 且显式记 baseline（连续计数由此起算）。**两 ask 不打包**：Ask A=seq-24 签核（记录性）、Ask B=defer-0051 ratification（判断性，销 F-1，保留拒绝即重开出口）；ADR-0075 countersign 与 defer-0060 只做事实注记非 ask。**R1/R2 修正切分**：R1=ADR-0076、registry 文档编辑（0026 actioned、0060+ADR-0058 指针、0055 纯指针、台账行补注）、两新工件（sunset-counter.json 1/6+evidence_ref→t14 检查点且 1/6 痕迹 R1 exit 对账、surface-taxonomy.json）、CONTEXT、README 索引、spec Inputs 修+D-004 断言同提交、各 wiring、anchors regen、defer-0061 tally、台账行+schema 字段；R2=defer-0004 registry+predicate 重写+谓词 wiring 三元组同提交（D-003）、nits 四项、telemetry 检查点、WORKFLOW.md、轮报告、asks 簿记。defer-0060 实质归 R1（行+指针皆文档面，registry 编辑按 t14 惯例归 doc 轮；D-006 实现相=烤后阶段非专指 R2——歧义落地时写清）。**残留归并**：F-1→Ask B；F-2→R1 同提交；F-3→R1 纯指针；F-5→每 cadence/O-E 项（defer-0053/0055/0057/0058+O-E backlog）随各处置时点增量写一行 ledger disposition，R2 只验证；nits→R2；两 patch 永不提交且轮报告重述 but-commit-显式-ID 教训。
- 显式约束/负向需求: **措辞守卫**：F-5 各行与复核面披露表述为 consent-sweep+standing-review-surface，永不表述为 audit response（否则本轮读起来像自我审计=看着比实际多审了）；countersign 注记同守卫；轮报告不得把 owner ratification 描述为审计闭合；Ask B 拒绝即重开出口必须保留；defer-0060 id note 原文随行进 registry 不得被轮报告压掉；否决 a2 窄域审计（触发未响惯例性审计=自立规矩自破）；dialectical 记录：atomcode 六搜六全文确认 a1+b+c+d，放置修正三条采纳（F-5 增量写/spec+断言同提交/负向 fixture 归 R2 前置），defer-0060 归位按实质改 R1（研究按 D-006 字面放 R2——披露不盲从）。
- 状态: current

## T-1 dispositions (R1 documentation round, 2026-09-18)

Executed per handoffs/next-round.md T-1. Each row names its evidence; this section is the same-commit ledger note for the R1 registry edits.

- sunset counter (ADR-0075 D-C path A) — durable home landed: docs/governance/sunset-counter.json holds the count (1/6 after the t14 2026-09-17 observation; evidence_ref=telemetry-checkpoint-2026-09-17.json); admitted to the anchors chain; the ledger is the audit trail, never the state host. defer-0055 stays pointer-only.
- defer-0026 (independent CI test job + always() summary) — ACTIONED via ADR-0058 D-F/D-G: all four check-ci-jobs predicates SATISFIED; the limitation field records that the required-check deployment is a repository-admin action (403) and CI green is environmental - neither is the deferred work.
- defer-0060 (CI gate-all permanently-red channel) — REGISTERED pending-evaluation, quarterly cadence, external-event (no verified_by); sole live tracker of the 403 carrier; ADR-0058 R10/R13 pointer line same commit; id note: defer-0060 was the rejected D-002 placeholder name, never landed.
- defer-0055 — sunset_trigger_pointer tightened to a pure pointer (audit F-3).
- defer-0061 — net-addition tally row registered (+1 ADR-0076).
- defer-0004 — stays deferred here; the narrowed re-defer + check-ci-jobs predicate rewrite bundle lands in R2 (D-003; the carve-out first use, D-007).
- edit-surface taxonomy — ADR-0076 registers R1/R2/R3; docs/governance/surface-taxonomy.json is the machine-readable classification (closure-scan authority, never hand-maintained); scripts/check-governance-inventory.js recomputes governance_tooling_diff and counts carve_out_used for the burn-rate advisory; t14 row annotated retroactively. R1 runtime surface untouched this round.
- CONTEXT.md — Round Edit Surface + Governance Carve-Out terms and the amended Sunset Trigger (absence is not zero) landed in the settle commit.
- README index rebuilt (76 records); AGENTS.md single pointer line; anchors 15 artifacts with the t15 ledger copy; ci.yml suite-count parity 73 (bootstrap disclosure per ADR-0076 D-B).
- R1 exit battery: taxonomy closure test green + anchors in sync + D-004 bidirectional assertions green + 1/6 trail reconciled.

## T-2 dispositions (R2 action round, 2026-09-18)

Executed under the R1 stage gate (kym on grill-t15-docs; boundary green on the self-check battery). Each row names its evidence; this section is the same-commit ledger note closing defer-0061 and recording the consent-sweep for the standing cadence.

- defer-0004 — RE-DEFERRED, narrowed. unfreeze_if now `ci.yml spans multiple workflow files OR any job declares a matrix OR job count > 3` (verified_by unchanged: scripts/check-ci-jobs.js, predicate rewritten in the same commit); the live shape reports defer0004=unmet (1 workflow, 3 jobs, no matrix) - the deferral remains valid and the permanently-firing SUGGEST is dead. First registered D-B carve-out use; trend row records governance_tooling_diff + carve_out_used:1 with the baseline.
- defer-0061 (t15 doc-round net-addition tally) — CLOSED via this same-commit ledger note. The grill-t15 row exists in docs/governance/trend-inventory.json (+1 ADR-0076; zero_product_diff=true AND governance_tooling_diff set - both true on the F-4 shape) and the ADR is registered; nothing left to disposition.
- defer-0058 (standing per-round net-increment review) — EXECUTED for grill-t15: net registry increment +2 (defer-0060 and defer-0061 added; defer-0026 actioned - terminal, count unchanged; defer-0004 re-deferred - row count unchanged).
- defer-0055 — stays pending-evaluation on quarterly cadence; sunset_trigger_pointer is now a pure pointer (F-3 settled). Sunset counter stays 1/6: this checkpoint observed organic=0 across all provenance classes (telemetry checkpoint .scratch/grill-t15/telemetry-checkpoint-2026-09-18.{txt,json}); a mid-quarter checkpoint is cadence evidence for the watch, not a quarterly sunset observation - the next counter observation is due at the 2026-12-15 tide.
- defer-0053 — stays deferred (unfreeze_frozen).
- defer-0054 — stays actioned; scanner live (3 rules).
- defer-0057 — stays pending-evaluation (t13 tally row; closes at the next trend-anchor evaluation).
- O-E backlog (telemetry export breadth) — stays deferred as an observation on the standing consent-sweep; low-priority backlog, no failure driver.
- WORKFLOW.md — disposition: register permanent absence. The file never existed in this repo history; the working conventions it would carry live in the $but skill, the task-book handoffs (next-round.md), and the AGENTS.md working agreement. Absence is registered, not silently tolerated.
- Audit nits executed: stale FAIL message now describes the anchored discovery rule; corrupt-prior-map read hard-fails loudly (ENOENT-only fallback, no silent tip-only degrade); gen-docs.cjs ROOT derived from __dirname; adr-0075-wiring defer-0059 closed-status assertion lives solely in the R2 boundary describe; path.join(ROOT,OUT_REL) deduplicated; docs/rewrite-map.json regenerated (1403 doc citations classified, in sync).
- Owner asks (unbundled, still open): Ask A - instrument seq-24 sign-off (record-type, open since t13); Ask B - defer-0051 evidence-packet ratification (judgmental; a rejection reopens the row). Frozen packet texts live in ADR-0076 D-E. Bookkeeping annotations only: the ADR-0075 second_reviewer countersign lands when the owner ratifies the t14 audit outcome; defer-0060 is a tracked row (owner action = its unfreeze_if), not a decision ask.

## T-3 dispositions (owner asks, 2026-09-18)

Owner approval utterance exercised verbatim: 批准，给你权限 (2026-09-18). The two asks were kept unbundled per D-007 - each recorded as its own act with its own evidence.

- Ask A (record-type) — EXECUTED: `node scripts/instrument.js --record-signoff --record-seq 24 --reviewer Euiop1 --attestation approve` appended a record_signoff entry certifying instrument record seq-24 (the t13 T-3 fix-round record_only_change). No verdict content adjudicated by the signature.
- Ask B (judgmental, own accept/reject exit) — EXECUTED as accept: `.scratch/grill-t14/evidence/defer-0051-evidence-packet.json` signatures.owner_ratification = {verdict:ratified, signer:Euiop1, signed_at:2026-09-18}; the pinned-protocol re-measurement + weak-independent countersign stands as the discharge basis. defer-0051 stays closed discharged-by-trigger; grill-t14 audit F-1 settles.
- ADR-0075 second_reviewer countersign — LANDED: the Status line now records the 2026-09-18 countersign; the t14 audit outcome stands owner-ratified once its last judgmental item (F-1 / Ask B) was ratified.
- defer-0060 — remains a tracked row (pending-evaluation, quarterly); the owner actions are its unfreeze_if (secret regen + required-check deployment), not a decision ask - no bookkeeping change this approval.
- Sunset counter: unchanged at 1/6; next quarterly observation 2026-12-15.
