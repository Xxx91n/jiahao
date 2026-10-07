# grill-t38 Q2 调研题面 — 锚的消费契约（断言腿语义+新鲜度义务居所）

## 你的任务
对 grill-t38 已采纳轮对象「断言锚定」（t38-D-001 current）的第一个下探裁决给出推荐与理由：status-inventory 断言腿在锚定语义下怎么判、新鲜度义务挂在哪、锚字段覆盖面。先读必读工件再作答；逐条做冲突核查。

## 必读工件（按序）
1. D:/Aworker/jiahao/.scratch/grill-t38/decision-ledger.md —— t38 账本（D-001 current=轮对象+范围，含锚字段形/双类锚划界/棘轮重落/forward-only 等 13 条规范化需求）
2. D:/Aworker/jiahao/scripts/check-status-inventory.js —— 已落地的断言腿（重点：pickDerivation prefer-HEAD→fallback 声称树、observer-row 排除、last-leg 强制、bootstrap 前瞻范围、UNVERIFIABLE 分支、run_id={surface}.{tree_sha}.{ctx} 解析）
3. D:/Aworker/jiahao/src/shared/status-inventory.js —— 哨兵块 schema/extract/diffMemberSets/sentinelSelfConsistent
4. D:/Aworker/jiahao/scripts/build-status-sentinel.js —— 报告哨兵块生成器
5. D:/Aworker/jiahao/scripts/check-post-land.js —— throwaway worktree 机制（mkdtemp+git worktree add --detach）与双段哨兵消费
6. D:/Aworker/jiahao/.scratch/grill-t37/decision-ledger.md —— t37 全账（D-005 已标 revised=断言域改锚树重推导；D-002 行形/D-003 reason_code/D-006 载体包）
7. D:/Aworker/jiahao/docs/adr/0092-public-object-equivalence-and-post-land-verification-contract.md —— D-PRE 时间断言形（pre_land.ran_at≥最后claim突变committer-date）
8. D:/Aworker/jiahao/docs/adr/0093-observer-equivalence-contract.md —— L-1 自指边界（块不得描述覆盖它自己的 map）
9. D:/Aworker/jiahao/docs/gates.json + D:/Aworker/jiahao/scripts/shared/claim-surface-roles.js —— 腿注册与角色注册表现状（status-inventory 腿未注册、bootstrap warning 预期态）
10. D:/Aworker/jiahao/CONTEXT.md —— 词表（Anchor 族、Wave-Bounded Subset、Declared-vs-Actual Drift、Meta-Sentinel、Deviation Cursor、generated_from）

## 已实测事实（勿凭记忆）
- 断言腿真值源=发射工件查找（test-artifacts/status-inventory/<run_id>.json，complete:true 才算），非当场重跑
- 工件选择 pickDerivation：prefer tree_sha==HEAD 的工件，否则 tree_sha==块声称树的工件；两者皆无→UNVERIFIABLE(exit 2)
- P-1 三发作机械路径：报告 commit 落地→后续电池重跑→HEAD 树工件成员集变→prefer-HEAD 选中→块失配→红
- run_id={judged_surface}.{tree_sha}.{runner_ctx}；块 rows 可多 surface；同 tree_sha 可有多次发射工件（重跑）
- gates.json 无 status-inventory 腿条目（注册挂账中）；check-post-land.js 有现成 throwaway worktree

## 待裁问题（含子问）
主选项：
a) 双断言分离——成员对账域=「块 rows==锚树 complete 工件成员集」（断言块是锚树实测的忠实转录）；新鲜度独立断言=(anchor,carrier.parent] 区间内无 claim-surface 突变（git log 区间×角色注册表路径集，D-PRE 形的等价机械化）+anchor 须为载体 parent 祖先（L-1 边界）。prefer-HEAD 废除，HEAD 工件退居漂移观测面。
b) 双层强形——a + 锚≠HEAD 时 throwaway worktree 内重跑锚树电池（真独立重测）。
c) 温和形——保 prefer-HEAD；锚树工件存在且对账通过时 HEAD 漂移降黄级披露。
d) 其他。
子问：
a1 同锚多工件选谁：①块自身 run 工件（纯转录核验，防「块由另一工件渲染却锚名此树」）②锚树最近 complete 工件（最新独立重测，但环境差重跑冤枉诚实块）③任一存在即过。
a2 新鲜度断言居所：嵌断言腿内 / 独立 wave-close 腿 / AGENTS.md 仪式句。
a3 锚定覆盖面 v1：只 status-inventory v1.1 / 哨兵族全铺（audit-coverage、post-land-verify 已自带 tip/ref 字段）。

## 调研要求
1. 工业先例重点（自择，找一手）：K8s observedGeneration 消费方如何处理「旧 generation condition」（判 stale 不判错——与锚定断言同构？）；bitemporal as-of 查询的断言语义；SLSA/in-toto 验证是 transcription check 还是 re-execution；CI status/required check 对「旧 commit 的 status」的消费语义；coverage-as-of-commit（Codecov）如何处理 commit 后的新 commit；财务审计 dual-dating 何时必须双签；Bazel/test hermeticity 对评测上下文声明的要求；deferred/hysteresis（Prometheus for:）对「新鲜度义务居所」（同腿 vs 独立腿 vs 仪式）的启示。
2. 逐条冲突核查：t38-D-001 全部 13 条 + t37-D-002/D-003/D-005(revised)/D-006 + ADR-0091/0092/0093 + AGENTS.md 协定（wave-closeout order、post-restack ritual、E-19）。特别核查：a2 居所选择是否撞 last-leg 强制与 E-19；a3 是否违反「一轮不建两个枚举面」（t37-D-001 M-D 先例）；b 的 worktree 重跑与 check-post-land 既有机制的复用关系。
3. 输出：推荐选项+子问答案 → 理由（先例引证）→ 失效模式 → 冲突核查表 → 实现面草图 → 信息缺口。