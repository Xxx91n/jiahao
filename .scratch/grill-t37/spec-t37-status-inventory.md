# spec-t37-status-inventory — Derived Status Inventory Contract (grill-t37)

来源纪律：本 spec 唯一数据源是 `decision-ledger.md`（同目录）。每条规范末尾括注其账本条款出处；账本无载的内容不在此文档中。

## S-1 轮对象与裁定 [D-001.1, D-001.10]

轮对象原文："A hand-written status surface cannot be the authority on its own accuracy — and the correct repair for an untrue claim depends on whether the prose or the mechanism is wrong."

权威归属：claim↔mechanism 分歧时**机制为权威**（v1/v2/v3 三次皆机制对叙述错）；机械化答案 = M-D（可查引用）+ M-E（查不了的登记）= ADR-0091 "generator never co-signs" 向叙述面的延伸。

成员表构成 [D-001.2~.7]：主体 = M-A（派生状态清单）+ C-1（UNVERIFIABLE 原因码分桶，共用清单工件与注册通道）；M-D 窄化并入（经 D-004 扩容）；M-E 随行惯例；M-B/M-C 延期；wave-time 记为已命名残余。

## S-2 M-A：派生状态清单 [D-002.1~.8; D-001.2]

- **枚举单位** [D-002.1]：{gate leg} ∪ {jest suite} ∪ {jest test}——CI 失败单位全对齐；jest 级红名 verbatim 点名。
- **只枚举失败/不可验证行** [D-002.2]：不枚举绿行；绿面归 committed manifest（t34-D-002 分工）、红面归 per-run 清单。
- **行形** [D-002.3 + D-003.6 + D-001.2]：{unit_kind, command, exit, judged_surface, evidence_ref} + append-only 扩展 reason_code（非绿行）/declared_reason（腿自报参考）。jest 行=test job leg 的展开成员（unit_kind=jest-test，command/judged_surface 指回该 leg）；合并走归一化行形+单一 join 键（CTRF 先例：name+suite+filepath）。
- **居所** [D-002.4]：per-run 发射（emitted），非 committed 名称键控基线；报告按 run_id+路径引用。
- **消费面 assert 形** [D-002.5]：报告状态列附机读哨兵块；断言腿成员级对账「最新报告哨兵块==派生清单」；机器抓不一致、人做裁决（t28-D-003(iv)）。
- **instrument-failure 行** [D-002.6]：junit 缺失（fail-fast/静默 collection 失败）→产 unit_kind=instrument-failure 行——空红集必须可区分于「未运行」。
- **v1 边界** [D-002.7]：不入 flaky/retry 判定、不收 skip 行、不建名称键控基线。
- **evidence_ref** [D-002.8]：必须指向已提交或可再生物件（fresh-clone 可重放）。
- **预期红注册** [D-001.2]：合法预期红=结构化注册（闭集原因码+deadline+owner 批准指针）；机械测试=「已注册∧未过期∧码在集内」。
- **t33-D-002(vi) 收窄声明** [D-002 负向需求]：本轮 ADR 显式声明——旧条款防计数叙述裁决权，M-A 立状态判权=前向收窄，经 Declaration 通道非账本改写。

## S-3 C-1：UNVERIFIABLE 原因码机制 [D-003.1~.8; D-001.3]

- **闭集** [D-001.3]：{registered-absence, timeout, instrument-failure}（≥3）。
- **混合归因** [D-003.1]：runner 推断定三类归属；腿 MAY 发 declared_reason 供类内细分，经闭集校验，out-of-set=registry violation（capability 命名纪律同构）。
- **双字段** [D-003.2]：reason_code（runner 裁决权威）≠ declared_reason（腿自报参考，永不覆盖）。
- **互斥判定链** [D-003.3]：missing[] 非空→registered-absence→超时标记→timeout→exit-2 无归因→instrument-failure 残差桶。
- **timeout_s** [D-003.4 + D-006.7 精化]：gates.json 逐腿字段（Δ2），未写者按 tier 派生默认——**tier 默认 T-0 后生效（占位→填充）**。
- **升级钩** [D-003.5]：N 挂 deferred-registry 行（per-row N，K8s failureThreshold 同构）；reason_code 记事实、连续-N 属消费面。
- **关闭行扩展** [D-003.6]：append reason_code_breakdown（{code:count}，t27-D-007(ii) append-only）；reason_code 只挂非绿行。
- **mismatch** [D-003.7]：declared-vs-inferred mismatch=审计信号进 evidence_ref 面，记录非阻断，首个真实病例再裁。
- **b0 否决在案** [D-003.8]：无检测的 timeout 码=死码。

## S-4 M-D：注释引用门 [D-004.1~.10; 修订 D-001.4]

- **枚举面=存在闭包** [D-004.1]：{代码符号, repo 路径, ADR-NNNN}——同属无解释可判定存在性类。
- **符号域 s2** [D-004.2]：{同文件声明 ∪ imports ∪ repo-wide 导出表}；s3（JSON contract 字段名符号表）明确排除。
- **contract-vocabulary 黄级豁免** [D-004.3]：未解析反引号 span 命中已注册字段名/枚举值集合（枚举源=本轮实测 44 个同族集、禁静默扩列）→黄级披露非红——降级非解析。
- **deny 级** [D-004.4]：引入纪律=「带已填 ignore 清单进 strict」。
- **修订链** [D-004.5]：D-001「只查符号存在性」→本闭包扩容，D-001 标 revised 原文保留。
- **防反套句** [D-004.6]：「ADR-NNNN 存在门不得被解读为概念面 thaw 先例」。
- **span 边界** [D-004.7]：doc-hygiene 的 verbatim 豁免不构成 M-D 豁免——M-D 恰以该 span 为锚；正交职责显式注册。
- **s2 导出表** [D-004.8]：新枚举面→Δ2 + M4 绑定生成源。
- **引入纪律** [D-004.9]：引入日悬空逐条 disposition 或 expected-red 注册；path 面悬空率引入前实测；JSDoc 死面不收。
- **v1 范围** [D-004.10]：scripts/src/test 注释（205 文件）；.md 引用面归 ADR-0093 M3；外部 URL 检查排除。

## S-5 工件契约 [D-005.1~.9]

- **发射** [D-005.1]：规范化 JSON 落既有 per-run artifact 目录（junit.xml 同族 gitignored、ADR-0027 D4 家族），文件名含 run_id；runner 新增写盘点（run-gates.js/run-test-gate.js 首次引入 mkdirSync+writeFileSync）。
- **run_id** [D-005.2]：{judged_surface, tree_sha, runner_ctx}；CI=GITHUB_RUN_ID.RUN_ATTEMPT.{job/matrix 维}；local=HEAD.{dirty|clean}.{起始时戳}；工件级 header 不进行内。
- **哨兵** [D-005.3]：`<!-- status-inventory v1 -->`，字段 {run_id, emitted_at, normalized_join_key_version, rows:[全成员快照], rows_digest}；快照承重、digest 仅自洽校验。
- **自述新鲜度** [D-005.4]：emitted_at 必带；断言腿查「块 vs 重推导」非「块是否存在」。
- **归一化** [D-005.5]：canonical 行序+剥 duration/时戳/绝对路径；join 键=name+suite+filepath；normalized_join_key_version 预置跨版本钩。
- **断言腿** [D-005.6]：新 leg 入 gates.json（manifest 计数+carve-out 同轮）；「最新报告哨兵块成员集==当次重推导失败清单成员集」，成员级。
- **哨兵家族注册** [D-005.7]：同列 audit-coverage v1/post-land-verify v1/status-inventory v1 三件套（第四次收敛同形态）。
- **ADR 三披露句** [D-005.8]：哨兵=claim 面/树=re-derivation truth 面；时戳自填=forensic 非 preventive；信任锚=runner 不可约（SLSA 句照抄）。
- **t28-D-003 边界句** [D-005.9]：「哨兵块=机读自述面，不受 (iii) prose 指针纪律约束，理由=成员级对账需成员本体在场」。

## S-6 M-E 随行惯例条款 [D-001.5]

凡派生清单与手写叙述分歧且机械不可判者，登记为 Known Limitation 行（owner 批准），禁改写叙述掩盖。载体=AGENTS.md 一条惯例条款+ADR-0093 限制段注记，不独立成腿；owner 批准纪律防逃生舱。**措辞起草归实现期**（S-7 T-8）。

## S-7 执行包 [D-006.1~.9; D-001.9]

- **ADR-0095** 轮契约（D-1..D-n 节，ADR-0093 同形）[D-006.1]；各节须可独立修订；跨 force-field 成员不入此 ADR。
- **九 Δ2 面=单 Declaration 条+九编号小节** [D-006.2]（每面：schema、消费腿、相邻面边界声明）；M-D 的 s2/黄级节显式引 D-004 修订链。
- **三 lane**（docs/impl/fixes，t36 拓扑）[D-006.3]；**lane drift 防线** [D-006.9]：每条机制性声明必指 gates.json 腿或 deferred 行，无落点=owner-action。
- **spec 文件**=本文件 [D-006.4]；M-E 措辞起草归实现期。
- **wave-time 残余**入 deferred-registry 行 [D-006.5]（cadence_tier+review_at；三出口 activate/re-defer/remove）。
- **T-0 三段序** [D-006.6]：impl lane 第一腿=50 腿计时测量（per-leg p50/p95 发射）→分布落盘→tier 默认按 measured p95 填充→同 commit 立法；ADR 写占位值+填充规则；测量前 timeout 腿不发 blocking。
- **D-003 精化句** [D-006.7]：tier 默认=T-0 后生效（ADR-0078 教训防冲突）。
- **T-0 序枚举** [D-006.8]：check-post-land 首跑+计时测量两腿（t35-D-002 接缝声明）。
- **三件套** [D-001.9]：Δ2 Declaration+manifest 计数并入+t27-D-007 schema 字段级扩展声明。

## S-8 延期与残余登记

| 项 | 处置 | 出处 |
|---|---|---|
| M-B commit 事实性验证 | 延期；trigger=闭集 claim 词表先注册（独立轮契约）；重启须先修订 t29-D-006 forensic 边界 | D-001.6 |
| M-C bare but-commit | 延期降为 M-A 轮内一行 tripwire 计数披露 | D-001.7 |
| wave-time 面 | 已命名残余→deferred-registry 行 | D-001.8精神+D-006.5 |
| ADR 概念枚举 | trigger 预注册（t27-D-005 同型钩） | D-001.4+D-004.6 |
| skip 行/flaky 判定/名称键控基线 | v1 边界，登记不收 | D-002.7 |
| dirty 树重推导语义 | 实现期决定 | D-005 负向需求 |
| mismatch 阻断语义 | 首个真实病例再裁 | D-003.7 |

## S-9 范围外声明 [D-001.8]

- 两处 live red 修复（pin resync/orphan-cites）=落地波实现活，非本轮裁决面。
- cap 权威对账与 interim event=owner 裁量。
- ADR-0094 status 行=owner 决定（已挂账）。

## S-10 九 Δ2 面派生枚举（逐面回指条款）

| # | 面 | 账本出处 |
|---|---|---|
| 1 | 清单工件 schema | D-002.3+D-005.1 |
| 2 | status-inventory v1 哨兵格式 | D-005.3+D-005.7 |
| 3 | s2 repo 导出表 | D-004.2+D-004.8 |
| 4 | timeout_s 字段 | D-003.4+D-006.7 |
| 5 | reason_code/declared_reason 字段 | D-003.1+D-003.2 |
| 6 | contract-vocab 冻结集 | D-004.3 |
| 7 | 黄级等级 | D-004.3 |
| 8 | 断言腿 | D-002.5+D-005.6 |
| 9 | M-D 腿 | D-004.1~.10 |

## S-11 已登记实现期缺口（账本负向需求汇总）

- spawnSync 超时 kill 孙进程收割语义未实测 [D-003]
- tier 默认值基线无数据→T-0 前置 [D-003+D-006.6]
- junit 解析器契约须实测本项目产物后定 [D-002 负向需求]
- 部分 junit incompleteness 标记自立法 [D-002 负向需求]
- 全红日快照体积未实测 [D-005]
- GH run 元数据到期后人审可达性衰减→ADR 披露 [D-005]
- 断言腿抓「报告没引清单」=coverage 腿同族执行面 [D-002 负向需求]
- CI 域自声明撒谎无公开一手病例（CMMS 外推一格距离）[D-003]

---

调研凭据汇总：atomcode q1 session c91df33e / q3 session 92e8722f / q5 session 54f913b2；q2/q4/q6 单次完成。账本：.scratch/grill-t37/decision-ledger.md（D-001 revised，D-002~D-006 current）。
