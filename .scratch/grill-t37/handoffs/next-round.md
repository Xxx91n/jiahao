# next-round — grill-t37 落地波任务书（derived status inventory）

本任务书供任意子 Agent 接续执行。**一切裁决的唯一来源是 `.scratch/grill-t37/decision-ledger.md`（D-001 revised、D-002~D-006 current）+ `.scratch/grill-t37/spec-t37-status-inventory.md`（S-1~S-11 节、逐条带账本出处）**。对话记忆不构成依据；与账本无载内容冲突时停下问 owner。

## 轮对象 [D-001.1]

"A hand-written status surface cannot be the authority on its own accuracy — and the correct repair for an untrue claim depends on whether the prose or the mechanism is wrong." 权威归属=机制。

## Lane 结构 [D-006.3, D-006.9]

三 lane（t36 拓扑）：`grill-t37-docs` / `grill-t37-impl` / `grill-t37-fixes`。lane drift 防线：ADR-0095 每条机制性声明必指 gates.json 腿或 deferred 行，无落点=owner-action。

## T-0 序（impl lane 硬序第一步）[D-006.6, D-006.8]

1. `check-post-land` 首跑（t35-D-002 接缝）；
2. 计时测量腿：50 腿 per-leg p50/p95 发射入 per-run artifact 目录——**只发射不门控**；分布落盘后 ADR-0095 tier 默认占位按 measured p95 填充，同 commit 立法；测量前 timeout 腿不发 blocking。

## 任务表

| # | 任务 | 覆盖 D-xxx | lane |
|---|---|---|---|
| T-1 | 起草 ADR-0095 轮契约（D-1..D-n 节）：单 Declaration 条+九编号小节（spec S-10 派生枚举逐面回指）；三披露句；t28-D-003 边界句；ADR-NNNN≠概念防反套句；t33-D-002(vi) 收窄声明 | D-006.1/.2/.9, D-005.7~.9, D-004.6, D-002 负向需求 | docs |
| T-2 | T-0 计时测量腿落地（发射分布，不门控） | D-006.6, D-006.8 | impl |
| T-3 | 清单发射器：run-gates/run-test-gate 新增写盘点（首次 mkdirSync+writeFileSync），规范化 JSON 落 per-run artifacts 目录、文件名含 run_id={judged_surface,tree_sha,runner_ctx}（CI=RUN_ID.ATTEMPT.{job/matrix}；local=HEAD.{dirty|clean}.{起始时戳}）；jest 行=test leg 展开成员、join 键=name+suite+filepath | D-005.1/.2/.5, D-002.1~.4, D-002.6 | impl |
| T-4 | C-1 归因引擎：互斥判定链（missing[]→registered-absence→超时标记→timeout→残差 instrument-failure）；双字段 reason_code/declared_reason（out-of-set=registry violation）；gates.json timeout_s 逐腿字段+T-0 后生效 tier 默认；关闭行 append reason_code_breakdown；N-run 升级钩挂 deferred 行 | D-003.1~.8 | impl |
| T-5 | 哨兵+断言腿：报告 `<!-- status-inventory v1 -->` 块（run_id/emitted_at/normalized_join_key_version/rows 全快照/rows_digest）；断言腿成员级对账「哨兵 vs 同树同面重推导清单」；查块vs重推导非查块存在；比较域 R-B 归一（canonical 序+剥 duration/时戳/绝对路径） | D-005.3~.6, D-002.5 | impl |
| T-6 | M-D 注释引用门：存在闭包 {符号,path,ADR-NNNN}、符号域 s2（同文件∪imports∪导出表）、contract-vocab 黄级豁免（冻结集=实测 44 同族集）、deny 级、doc-hygiene span 边界声明、引入日悬空逐条 disposition/expected-red、**path 面悬空率引入前实测**、v1=scripts/src/test | D-004.1~.10 | impl |
| T-7 | expected-red 注册通道：闭集码+deadline+owner 批准指针结构化注册；机械测试=已注册∧未过期∧码在集内；deferred-registry 关闭行 schema 字段级扩展 | D-001.2/.3, D-003.5/.6 | impl |
| T-8 | M-E 惯例措辞落盘：AGENTS.md 一条+ADR-0093 Known-Limitations 注记+owner 批准纪律 | D-001.5 | docs |
| T-9 | wave-time 残余入 deferred-registry 行（cadence_tier+review_at+unfreeze_if） | D-006.5, D-001 | docs |
| T-10 | 延期登记：M-B trigger（闭集 claim 词表）+M-C tripwire 一行+ADR-概念枚举 trigger | D-001.6/.7, D-004.6 | docs |
| T-11 | 实现期缺口实测包：junit 解析器契约（1639-test 产物）、spawnSync 孙进程收割、部分 junit incompleteness 立法、全红日快照体积、dirty 树重推导语义 | D-002/D-003/D-005 负向需求 | impl |
| T-12 | manifest 计数并入+七字段关闭行 schema 字段级扩展声明+九面 Δ2 登记（三件套） | D-001.9, D-006.2 | docs+impl |

## 范围外 [D-001.8, spec S-9]

- pin resync / orphan-cites 两处 live red 修复=落地波实现活（本任务书不负责其方案，但 T-11 缺口实测可能与之同行）
- cap 权威对账/interim event/ADR-0094 status 行=owner 裁量，agent 不动

## 落地铁律（承账本负向需求）

- 阈值在 T-0 分布前不写死值（ADR-0078 事故形态禁重演）
- 提交纪律：but commit 显式 id+-m+derive-anchoring-footer，落地后 git show --name-only 验集
- UNVERIFIABLE 三态诚实：环境差腿落桶不装绿；skip 显式报值
- CONTEXT.md 只进词汇不进实现细节（domain-modeling）；同步属 docs lane

## Suggested skills

- `$domain-modeling`（grill/engineering）——ADR-0095 起草与 CONTEXT.md 词汇同步
- `$to-spec`/`$to-tickets`/`$implement`（mattpocock 系）——任务表转工单与实现
- `$handoff`（grill/productivity）——再压缩续跑
- `atomcode-research`——实现期遇到新裁决点时按账本原协议复调研
- `gitbutler` skill——全部 VCS 写操作（显式 id、-m、ANCHORING footer）

## 凭据

- 账本 `.scratch/grill-t37/decision-ledger.md`（6 记录：1 revised+5 current）
- spec `.scratch/grill-t37/spec-t37-status-inventory.md`
- atomcode sessions：c91df33e / 92e8722f / 54f913b2（q1/q3/q5），q2/q4/q6 单次完成
