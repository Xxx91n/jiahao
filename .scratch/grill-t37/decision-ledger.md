# grill-t37 decision ledger

Append-only. Statuses: current | revised | stale | deferred.
Revisions keep the original record (marked revised) and add a new D-xxx.

<!-- records -->

## D-001 — t37 轮对象与范围构成（Q1′ 选项 a 采纳：atomcode b′ 修正形）

- **原问题**: t37 轮对象与范围构成——轮对象原文「A hand-written status surface cannot be the authority on its own accuracy — and the correct repair for an untrue claim depends on whether the prose or the mechanism is wrong」是否采纳；成员表构成（M-A 派生状态清单 / M-B commit-message 事实性 claim 验证 / M-C bare but-commit 工具拒绝 / M-D 注释引用门 / M-E 分歧注册 limitation / C-1 UNVERIFIABLE 原因码分桶）；范围选项 a 全案 / b 窄化 / c 更窄 / d 工件面重构；atomcode 调研后呈报 b′ 修正形（主体 M-A+C-1、M-D 窄化、M-E 随行、M-B/M-C 延期）与选项 a=采纳 b′ 全案 / b=采纳但 wave-time 扩面 / c=再收窄只 M-A / d=其他。
- **我的原回答原文**: 「采纳」——即呈报选项 a：b′ 全案 + 辩证点 1（wave-time 记已命名残余不扩面）写入负向需求。
- **规范化需求**:
  1. 轮对象原文采纳：a hand-written status surface cannot be the authority on its own accuracy — and the correct repair for an untrue claim depends on whether the prose or the mechanism is wrong。
  2. 主体 M-A「派生状态清单」：CI-leg 红集由执行器电池派生、为报告状态列唯一合法来源；库存记录 = (command, exit, judged-surface) 三元组（--worktree 与默认形因 judged-surface 不同而分列、互不裁决）；合法预期红 = 结构化注册（闭集原因码 + deadline + 指向 owner 批准行指针），机械测试 = 已注册 ∧ 未过期 ∧ 码在集内；信任锚不可约如实声明（SLSA "no option but to trust the builder"）。
  3. 主体 C-1「UNVERIFIABLE 原因码分桶」：闭集 ≥3 = {registered-absence, timeout, instrument-failure}；timeout 类必挂升级钩（t27-D-003 N-run 钩形复用）；实现形态 = t27-D-007(ii) 七字段关闭行 schema 的字段级扩展（追加非改写，append-only）。
  4. M-D 窄化并入「注释引用门」：首版只查注释符号存在性（deny 级；rustdoc broken_intra_doc_links 先例、渐进收严 warn→deny）；ADR 概念定义检查不入本版，挂 trigger 预注册（t27-D-005 同型钩）——不在一轮内同时建两个枚举面。
  5. M-E 随行惯例条款：凡派生清单与手写叙述分歧且机械不可判者，登记为 Known Limitation 行（owner 批准），禁改写叙述掩盖；载体 = AGENTS.md 一条惯例条款 + ADR-0093 限制段注记，不独立成腿；必须带 owner 批准纪律防逃生舱。
  6. M-B 延期：commit message 事实性 body claim 验证须先注册闭集 claim 词表（每词一验证器）= 独立轮契约工作；挂 trigger 预注册；现 ANCHORING footer（工具派生 + 腿核验）已承担 commit 自洽面。若未来重启，须先修订 t29-D-006(iii) 已注册 forensic-not-preventive 信任域边界。
  7. M-C 延期降为 M-A 轮内一行 tripwire 计数披露：bare but-commit 强制点已在工具内（拒绝在案）、本仓无服务端可加，剩余增量 = 统计告警。
  8. 显式排除不变：两处 live red 修复（落地波实现活）、cap 权威对账与 interim event（owner 裁量）、ADR-0094 status 行（owner 决定）。
  9. 执行深度三件套（t24-D-002 先例）：Δ2 Declaration + manifest 计数并入 + t27-D-007 schema 字段级扩展声明。
  10. 权威归属裁定：claim↔mechanism 分歧时机制为权威（v1/v2/v3 三次皆机制对叙述错）；机械化答案 = M-D（可查引用）+ M-E（查不了的登记）= ADR-0091 generator-never-co-signs 向叙述面延伸。
- **显式约束/负向需求**:
  - wave-time 状态面 = 已命名残余：M-A 首版只派生 CI-leg 红集；行文禁写「留 prose 是正确」封口句——pre-land battery 本是 runner，缺的只是派生发射面；B-1 手写-PASS 即死于此面。
  - 通道义务五条（落地必履行）：①M-A 红集 = 新枚举面→ADR Declaration（t36-D-003(4) phantom-rows 先例），不得只进 gates.json；②M-A/M-D 每条新腿→ADR-0076 D-B carve-out + manifest 计数面（t34-D-004(iii)）；③C-1 reason code = t27-D-007(ii) schema 字段级扩展，禁平行立账；④M-B 重启须先修 t29-D-006(iii)；⑤派生清单成为状态列唯一可采源 = 新 claim 面→入 claim_surfaces 枚举须 ADR+人签（t28-D-003(v)），不自动生效。
  - M-A 新清单腿必须 always() 语义聚合、对 skip 显式报值而非吞掉（GitHub required-checks 三病态：path-filter 挂起 / 条件跳过假 Success / 依赖失败被吞）。
  - M-D 首版只查可解析引用（rustdoc 多年坑=歧义消歧与条件编译假阳性），deny 级 = 可判定为红才 fail，非一律阻断。
  - C-1 原因码词表必须闭集（开放注册会膨胀）。
  - 否决项：Q1-d（工件面收窄）否——fork 题面是父会话名，收窄丢证据基；Q1-b（wave-time 扩入首版）否——一轮不建两个发射面，记残余比硬扩诚实。
  - 调研呈报与账本零冲突：84 条 current 记录逐条核查，全部为义务约束非矛盾，无 D-xxx 需标 revised（调研自点名五条通道义务已录入上款）。
- **状态**: revised —— M-D 枚举面由「只查符号存在性」扩容为存在闭包 {symbol,path,ADR-NNNN}，修订依据=D-004（原文保留）
- **调研凭据**: atomcode session c91df33e-7442-4f6e-922f-c3e838119c53（首轮响应中断、按 resume 锚定续跑完成）；一手信源 = GitHub required status checks 官方排障文档、SLSA provenance v0.1 spec + FAQ v1.2、rustdoc lints（broken_intra_doc_links）、K8s liveness/readiness/startup probes 官方文档、Kent C. Dodds generated-files 批评文、Arcjet doc-samples 对比文、conventionalcommits.org、rstudio#2082；信息缺口 = 调研自身「信息缺口」节因 ctx 索引同名节遮蔽未取回（如实标位）。

## D-002 — M-A 枚举单位与谓词粒度（Q2′ 选项 a 采纳：失败面 test-case 全对齐 + per-run 发射 + assert 消费面）

- **原问题**: M-A 派生红集清单的枚举单位——a) 全对齐 CI 失败单位 {gate leg}∪{jest suite}∪{jest test} / b) 腿单位+test-job 单行 / c) 双工件双通道 / d) 其他；atomcode-q2 呈报 (a)+精化（只枚举失败行、jest 行为腿展开成员、emitted per-run、assert 消费面、instrument-failure 行、v1 边界登记、t33-D-002(vi) 张力声明）后选项 a=全案 / b=改子裁决 / c=退回 / d=其他。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案（含居所/消费面两子裁决与张力声明方案）。
- **规范化需求**:
  1. 枚举单位 = {gate leg} ∪ {jest suite} ∪ {jest test}：CI 失败单位全对齐，jest 级红名 verbatim 点名，two-lists 从此派生后 jest 红无处可逃（V9-§5-1 落地）。
  2. 只枚举失败/不可验证行，不枚举绿行（业界收敛律：失败面 test-case 粒度、绿面聚合计数）；绿面归 committed manifest（t34-D-002 分工）、红面归 per-run 清单。
  3. 行形 = {unit_kind, command, exit, judged_surface, evidence_ref}（t37-D-001 三元组 append-only 扩字段）；jest 行 = test job leg 的展开成员（unit_kind=jest-test，command/judged_surface 指回该 leg），合并走归一化行形+单一 join 键（CTRF/Gaffer 先例），非双表。
  4. 居所 = per-run 发射（emitted），非 committed 名称键控基线（rename/retry 腐烂病；junit.xml 同族 per-run artifact）；报告按 run_id+路径引用。
  5. 消费面 = assert 形非 generate 形：报告状态列附机读哨兵块（清单快照/引用），新 gate 腿断言「最新报告的块==派生清单」（成员级对账，t33-D-002(ii) 形）；机器抓不一致、人做裁决（t28-D-003(iv) 判定权留人）。
  6. junit 缺失（fail-fast/静默 collection 失败）→ 清单产出 unit_kind=instrument-failure 行——空红集必须可区分于「未运行」（C-1 桶复用，本轮自立：业界无标准答案）。
  7. v1 边界登记：不入 flaky/retry 判定（junit 无标准位、历史面算）、不收 skip 行、不建名称键控基线。
  8. evidence_ref 必须指向已提交或可再生物件（fresh-clone 可重放，t28-D-003 未跟踪指针规约）。
- **显式约束/负向需求**:
  - t33-D-002(vi) 张力声明：调研读为分工（旧条款防计数叙述、M-A 立状态判权=前向收窄），本轮 ADR 必须显式声明取代关系（t34-D-001(vi) 同型先例）——收窄经 Declaration 通道非账本改写。
  - manifest 划界句必写：清单从 junit 派生的是失败命名非 suite 枚举，enumeration.suites 仍独占 --listTests（t34-D-002(ii) 循环自证红线），防审计误读。
  - 否决项复述：b（test job 单行）被本案事实证伪——两逃逸红住在 jest test 粒度；c（双工件）权威分裂=t33-E-25 双通道缺陷类。
  - always() 聚合+skip 显式报值义务承 D-001 不变。
  - 断言腿抓「报告没引清单」=coverage 腿同族执行面（文档强制引用无直接先例，本轮定为 audit-coverage 腿同族）。
  - junit 解析器契约须实测本项目 1639-test 产物后定（junit XML 无规范，jest-junit retries/suite 嵌套字段未核验）。
  - 部分 junit（崩溃前已写出的 case）的 incompleteness 标记无业界标准，须自立法。
- **状态**: current
- **调研凭据**: atomcode-q2 run 2026-10-05（单次完成）；一手信源 = GitLab Unit Test Reports 官方文档、GitHub check-run annotations（dorny/test-reporter、mikepenz/action-junit-report）、Jenkins Test Results Aggregator、CTRF 开放标准、Gaffer 归一化聚合器、trunk.io/CloudBees/Harness flaky 成本文献、HashiCorp junit-无规范讨论帖；信息缺口 = 部分 junit incompleteness 标记无业界标准须自立法 / 文档强制引用无直接先例（audit-coverage 腿同族）/ junit XML 无规范须实测契约 / skip 行收否未裁（v1 不收登记边界）。

## D-003 — C-1 机制形态（Q3′ 选项 a 采纳：混合归因 + per-leg timeout_s + 双字段分离 + 互斥判定链）

- **原问题**: C-1 {registered-absence, timeout, instrument-failure} 闭集的归因通道（a) runner-inference / b) leg-self-declare / c) hybrid / d) 其他）+ timeout 检测（a1 逐腿 timeout_s / a2 tier 默认 / b0 不检测）+ 落地与升级钩。atomcode-q3 呈报 c+a1主a2兜底+否决b0 及四精化后选项 a=全案 / b=砍 declared_reason / c=改 timeout 方案 / d=退回。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案（含四精化）。
- **规范化需求**:
  1. (c) 混合归因：runner 推断定全部三个类的归属判定（missing[]→registered-absence；deadline 超时标记→timeout；exit-2 无归因→instrument-failure 残差桶）；腿 MAY 发 declared_reason 供类内细分，经 runner 闭集校验，out-of-set=registry violation（capability 命名纪律同构，零新信任模型）。
  2. 双字段分离：reason_code（runner 裁决，权威）≠ declared_reason（腿自报，参考，永不覆盖）——与 t29-D-006 forensic/preventive 同信任分层。
  3. 互斥判定链：missing[] 非空→registered-absence（不再看 exit）→超时标记→timeout→exit-2 无其他归因→instrument-failure；确定性链首优先，非概率合成。
  4. gates.json 逐腿 timeout_s 字段（Δ2 Declaration 一次带上），未写者按 tier 派生默认——a1 为主 a2 为默认值机制（K8s failureThreshold per-probe 先例）。
  5. 升级钩 N 挂 deferred-registry 行非全局常量（per-row N，K8s failureThreshold 同构；Prometheus 分工：reason_code 记事实、连续-N 去抖属消费面）。
  6. 关闭行 append reason_code_breakdown（{code:count} 映射，t27-D-007(ii) append-only 通道）；reason_code 只挂非绿行（D-002 失败面收敛律一致）。
  7. declared-vs-inferred mismatch=审计信号进 evidence_ref 面，记录非阻断——首个真实病例再裁阻断语义（t27-D-003 决策留到决策发生时的预注册形）。
  8. 明确否决 b0：无检测的 timeout 码=死码=假装覆盖（CMMS 死码审计律 + Latchkey hang 的遮羞布）。
- **显式约束/负向需求**:
  - 归因权跟随证据所在方：timeout 归因必属 runner（测时者写结论——GH conclusion/K8s reason 全由观测者写；t36-D-006.3 观测点错位同构），腿结构性无法可靠自测时长。
  - 三钟意识：runner 计时起点=spawn 时（queue 不进腿内钟；GH #3699 先例——平台钟与体感钟常不一致，落地注明起点语义）。
  - tier 默认值初值标 provisional：50 腿耗时基线无数据，定参需基线采集（挂本轮 T-0 或下轮）。
  - spawnSync 超时 kill 的孙进程收割语义未实测——落地前一次验证（zombie 腿风险）。
  - declared_reason 是 MAY 非 MUST；长期零使用即自然死码、不构成遮羞（死码警告双向生效）。
  - CI 域自声明撒谎无公开一手病例（CMMS 人类自声明外推一格距离——如实标位不影响裁决）。
  - 否决项复述：a 纯 runner 够用但弃前向细分钩；b 全自声明=50 腿全改+100码挑第一个堕落路径；b0=死码遮羞布。
- **状态**: current
- **调研凭据**: atomcode-q3 run 2026-10-05 session 92e8722f（单次完成）；一手信源 = Latchkey GH Actions 超时诊断（三钟模型）、GH REST workflow-jobs conclusion 枚举（timed_out）、actions/runner #3699（queue time 入 timeout）、K8s Pod Conditions+probe failureThreshold（per-probe N）、readinessGates（c 同构）、Prometheus alertmanager #204（flap detection 在消费面）、CTRF schema、CMMS 失败码审计文献（Tractian 6-12月使用率审计、f7i.ai 开集堕落）、Datadog validated/invalidated/inconclusive 归因模型；信息缺口 = spawnSync 孙进程收割未实测 / tier 默认基线无数据 / mismatch 阻断语义留首病例 / CI 域自声明撒谎无公开一手病例。

## D-004 — M-D 枚举面与符号域（Q4′ 选项 a 采纳：b′ 存在闭包扩容；修订 D-001）

- **原问题**: M-D 枚举面——a) 字面窄读 symbol-only / b) 存在闭包 {symbol,repo-path,ADR-NNNN} / c) +ADR 节锚点（已排除）/ d) 其他；+符号域 s1 同文件 / s2 +repo 导出表 / s3 +JSON 契约词表；+v1 范围与引入纪律。atomcode-q4 呈报 b′ 修正形后选项 a=全案（含 D-001→revised 程序与四登记）/ b=字面 a / c=b′ 但豁免静默化 / d=退回。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案。
- **规范化需求**:
  1. M-D 枚举面=存在闭包 {代码符号, repo 路径, ADR-NNNN}——同属「无解释可判定存在性」类（rustdoc valid-targets / Sphinx nitpicky 先例）。
  2. 符号域 s2={同文件声明 ∪ imports ∪ repo-wide 导出表}；s1 对跨文件引用系统性假红（32 处 identifier() 形 + scripts/shared/ 指向）；s3（给 JSON contract 字段名建符号表）明确排除——Sphinx nitpick_ignore 官方示例被 ignore 的恰是 py:const 数据值，同构否决。
  3. contract-vocabulary 黄级豁免条款：未解析反引号 span 若命中已注册字段名/枚举值集合（枚举源=本轮实测 44 个同族集合、禁静默扩列）→标 contract-vocabulary 引用→黄级披露非红——降级非解析。
  4. deny 级维持（D-001 settle 不动）；引入纪律=「带已填 ignore 清单进 strict」等价路径。
  5. 修订声明：D-001 的 M-D「只查符号存在性」措辞扩容为存在闭包——D-001 标 revised、原文保留；理由=三先例交叉证据+ADR/path 两面零悬空+字段名陷阱证伪 a。
  6. ADR-号存在性 ≠ ADR-概念枚举：ADR 写防反套句「ADR-NNNN 存在门不得被解读为概念面 thaw 先例」（D-001 trigger 延期不触碰）。
  7. M-D↔doc-hygiene span 边界声明：doc-hygiene 的 verbatim 豁免对 M-D 符号解析面不构成豁免——M-D 恰以该 span 为锚；两扫描器正交职责显式注册，防 E-25 双通道。
  8. s2 导出表=新枚举面→Δ2 Declaration + M4 绑定生成源（t36-D-003 / ADR-0093 M4 直接适用）。
  9. 引入日悬空逐条 disposition（改写非引用措辞）或 M-A expected-red 结构化注册；path 面悬空率引入前实测；JSDoc 通道死面不收。
  10. v1 范围=scripts/src/test 注释（205 文件）；.md prose 引用面归 ADR-0093 M3 另行注册——边界登记；外部 URL 可达性检查排除（永动误报源）。
- **显式约束/负向需求**:
  - 黄级=新输出词表成员，随条款一并注册（deny 级门内第三等级=披露非阻断，防无声豁免）。
  - 引入前必须实测悬空全集（path 面悬空率尚未测量——admission 前补齐）。
  - 歧义不静默猜（rustdoc 三 namespace 消解器先例）：同名歧义按未解析进披露/红，不启发式猜目标。
  - 跨仓库/跨边界引用不解析（rustdoc 外部 crate 不查同构）。
  - contract-vocab 集合冻结=本轮实测集，扩列需新登记。
  - 否决项复述：a 被测量证伪（44 ident 面小且被字段名污染）；静默豁免（原选项 c）使 13 处引用无披露面。
- **状态**: current
- **修订关系**: 修订 grill-t37 D-001（M-D 措辞扩容为存在闭包；D-001 轮对象/其余成员表不动）。
- **调研凭据**: atomcode-q4 run 2026-10-05（单次完成）；一手信源=rustdoc book Linking-to-items-by-name + PR #80527/#86849（warn→deny 改名过渡+12周窗口）+ PR #132748（防 churn 启发式）、Sphinx nitpicky/nitpick_ignore（py:const 示例）、TS {@link} issue #43869、eslint-plugin-jsdoc 规则清单（无标识符存在性规则）、remark #324 FP 弃用案例、mkdocs/Zensical 校验文档、sphinx linkcheck #13620（URL 检查永动误报）；信息缺口=TS {@link} tsc 实现未核 / path 面悬空率未测 / JS lint 界无现成注释标识符存在性规则。

## D-005 — M-A 工件契约（Q5′ 选项 a 采纳：发射+自含哨兵；c 确定性否决）

- **原问题**: M-A 工件契约——a) 提交档形（清单随报告提交）/ b) 纯发射+自含哨兵 / c) digest-only+CI artifact 存档 / d) 其他；+run_id 三元形 +哨兵注册制。atomcode-q5 呈报 (b)+五精化后选项 a=全案 / b=digest-only / c=其他 / d=退回。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案。
- **规范化需求**:
  1. (b) 发射+自含哨兵：清单=规范化 JSON 落既有 per-run artifact 目录（junit.xml 同族、gitignored、ADR-0027 D4 家族），文件名含 run_id；runner 侧新增写盘点（run-gates.js/run-test-gate.js 首次引入 mkdirSync+writeFileSync——现状零写盘为事实非约束）。
  2. run_id={judged_surface, tree_sha, runner_ctx}：CI=GITHUB_RUN_ID.RUN_ATTEMPT.{job/matrix 维}（re-run 消歧+matrix 同名互覆防护）；local=HEAD.{dirty|clean}.{起始时戳}（同 HEAD 重复跑消歧）；工件级 header 不进行内。
  3. 哨兵 <!-- status-inventory v1 --> 字段={run_id, emitted_at, normalized_join_key_version, rows:[全成员快照], rows_digest}：快照本体承重、digest 自洽校验位随附不替代（成员级对账需成员本体在场）。
  4. 自述新鲜度：emitted_at 必带；断言腿查「块 vs 重推导」非「块是否存在」（security.txt RFC9116 反面教材——presence-check 放陈旧块）。
  5. 比较域 R-B 归一：canonical 行序+剥 duration/时戳/绝对路径（reproducible-build 归一化纪律）；join 键=name+suite+filepath（CTRF 一手证实）；normalized_join_key_version 预置跨版本钩。
  6. 断言腿=新 leg 入 gates.json（manifest 计数+ADR-0076 D-B carve-out 同轮带上）；语义=「最新报告哨兵块成员集==当次重推导失败清单成员集」，成员级非总数级。
  7. 哨兵格式注册同列 audit-coverage v1/post-land-verify v1/status-inventory v1 三件套家族（本仓第四次收敛同形态）。
  8. ADR 三披露句（t35-D-007 家族）：哨兵=claim 面/树=re-derivation truth 面（ADR-0092 同构）；时戳自填=forensic 非 preventive；信任锚=runner 不可约（SLSA 句照抄）。
  9. t28-D-003 边界声明句：「哨兵块=机读自述面，不受 (iii) prose 指针纪律约束，理由=成员级对账需成员本体在场」。
- **显式约束/负向需求**:
  - (c) 确定性否决：GH artifacts 90 天到期+公开仓上限+2026-10 起 run 元数据到期——结构性不可回放；evidence_ref 指向 CI artifact 的人审可达性随元数据到期衰减→ADR 披露。
  - (a) 否决理由在案：新 committed 工件类+快照腐烂+「描述过去」本体论负担（t24-D-003）。
  - (b) 诚实成本：断言腿须在受参照树/面跑重推导；环境差腿落 UNVERIFIABLE 桶不装绿（C-1 复合）。
  - dirty 树重推导语义=实现期决定（clean-run 哨兵与 dirty 树重推导可比性未立法）。
  - 全红日快照体积未实测——「失败面小」论证以行级为限，实测千行级需重估内嵌。
  - GH run 元数据到期后 run_id 引用无处解析——回放链不依赖它（truth 在树），披露面注明。
- **状态**: revised —— 子条款 6 断言腿比较域由「最新报告哨兵块成员集==当次重推导失败清单成员集」修订为「==所声明锚树重推导成员集」（锚=块自述 anchor.tree_sha）；N-1 三连发作实证原语义对 committed report 结构性不可满足。修订承接=grill-t38 decision-ledger D-001（经 Declaration 通道显式，t33-D-002(vi) 先例）。其余子条款仍为 current（原文保留）
- **调研凭据**: atomcode-q5 run 2026-10-05 session 54f913b2（单次完成，8 searches/7 full reads）；一手信源=slsa.dev、SARIF correlationGuid、docs.github.com（run_id/run_attempt 原文+artifacts 到期）、ctrf-io README（join 键）、reproducible-builds.org、JFrog buildinfo、CycloneDX、security.txt merlonix 深读；信息缺口=全红日体积未实测 / dirty 树重推导语义未定 / run 元数据到期后人审可达性衰减 / jest 跨版本名稳定性（join_key_version 预置钩）。

## D-006 — 载体与执行包（Q6′ 选项 a 采纳：ADR-0095+三 lane+T-0 三段序+九面登记）

- **原问题**: 载体与执行包——a) t36 形克隆（新 ADR-0095+三 lane+spec+deferred 行+T-0 基线）/ b) amend 0093 / c) 单 lane / d) 其他；+九 Δ2 面登记清单。atomcode-q6 呈报 (a) 精化形（T-0 三段序+单条九节+lane drift 防线）后选项 a=全案 / b=部分调整 / c=退回。
- **我的原回答原文**: 「采纳」——即呈报选项 a 全案。
- **规范化需求**:
  1. 新 ADR-0095 轮契约（D-1..D-n 节，ADR-0093 同形；M-A/C-1 状态面契约与 0093 observer 面属不同 force-field，amend 合并即复刻 bundling 藏争议病——(b) 否决）。
  2. 九 Δ2 面=ADR-0095 内单 Declaration 条+九编号小节（每面：schema、消费腿、相邻面边界声明）；M-D 的 s2 域与 contract-vocab 黄级小节显式引 D-004 修订链。
  3. 三 lane（docs/impl/fixes，t36 拓扑）：docs claim 可被 impl 落地集逐条对账（lane drift 防线配套）。
  4. spec-t37-*.md spec 文件；M-E 惯例措辞归 spec 起草（居所 D-001 已定：AGENTS.md bullet+ADR-0093 Known-Limitations 注记+owner 批准纪律）。
  5. wave-time 命名残余一律 deferred-registry 行（cadence_tier+review_at；check-deferred STALE fail-closed 三出口 activate/re-defer/remove 防坟场），非 spec 注记。
  6. T-0 三段序预注册：impl lane 第一腿=50 腿计时测量（per-leg p50/p95 发射入 per-run artifact 目录）→分布落盘→tier 默认值按 measured p95 填充→同 commit 立法；ADR-0095 写占位值+填充规则（text order=time order）；测量前 timeout 腿不发 blocking。
  7. D-003 精化句：tier 派生默认=T-0 后生效（占位→填充）——防与 ADR-0078（round-8 立法→round-11 证据推翻→round-12 重立）隐性冲突。
  8. T-0 序枚举：check-post-land 首跑+计时测量两腿（t35-D-002 接缝声明写入 ADR-0095）。
  9. lane drift 防线：ADR-0095 每条机制性声明必指 gates.json 腿或 deferred 行；无落点声明写成 owner-action（t33-D-001② 形）。
- **显式约束/负向需求**:
  - bundling 边界：ADR-0095 各节须可独立修订（revised-status-row 惯例承接）；跨 force-field 成员不得再入此 ADR。
  - 阈值参数在 T-0 分布前不得写死值（立法-后-测是同仓已付学费的事故形态）。
  - 计时测量腿只发射不门控（发射分布非判定）。
  - 残余行逐行点验：wave 结束未关闭的 deferred 行逐行处置（三出口无第四）。
  - 先例替代链透明：Bazel/Nx 官方未命中（Sourcegraph/Meta 替代）、Rust RFC postponed 未命中（Haskell CLC 同构替代）。
  - 否决项复述：b 错系谱合并=复刻搭便车藏争议病；c 单 lane=docs/impl 不可对账。
- **状态**: current
- **调研凭据**: atomcode-q6 run 2026-10-05（单次完成，8 searches/5 full reads）；一手信源=Nygard ADR 原文（403→Tavily 摘要补）、ctaverna ADR 全文、Sourcegraph Batch Changes 全文、sre.google alerting-on-slos、Haskell CLC PROPOSALS.md（stale-proposal 撤销）、HN monorepo、Meta one-diff-one-thesis、本仓 check-deferred.js D4 语义+ADR-0078 自伤实录；信息缺口=Bazel/Nx 官方文档未命中 / Rust RFC postponed 机制页未命中（同构替代）。
