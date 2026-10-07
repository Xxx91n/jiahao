# grill-t38 Q4 调研题面 — P-1 发射侧锚契约（块字段形 / dirty-tree 语义 / prose 边界）

## 你的任务
对 grill-t38 断言锚定轮的 P-1 发射侧契约给出推荐与理由：status-inventory 哨兵块该声明什么锚、如何声明、dirty 工作树语义如何立法、块外叙述句的锚定义务边界。先读必读工件再作答；逐条冲突核查。

## 必读工件
1. D:/Aworker/jiahao/.scratch/grill-t38/decision-ledger.md —— t38 账本全文（D-001 轮对象+范围 13 条含统一锚字段形 anchor={tree_sha,ref_context,mode} 与 dirty 语义未立法缺口；D-002 消费契约 10 条；D-003 测试面集合锚 10 条）
2. D:/Aworker/jiahao/src/shared/status-inventory.js —— renderSentinel/parseSentinels（块字段=run_id/emitted_at/normalized_join_key_version/rows，无显式 anchor）
3. D:/Aworker/jiahao/src/shared/run-id.js —— run_id={judged_surface,tree_sha,runner_ctx}；tree_sha=HEAD commit sha（第11/29行语义注释）
4. D:/Aworker/jiahao/scripts/check-status-inventory.js —— assert 腿（注释 121-122「dirty worktree shares HEAD's tree_sha, derivation selection is tree-anchored, never dirty/clean split」；15-16 现行新鲜度形「块 tree_sha 是 HEAD 或其祖先」；23-24 prefer-HEAD 派生选择）
5. D:/Aworker/jiahao/scripts/run-gates.js —— 工件发射面（payload 字段 234-246；status-inventory/leg-timing emit）
6. D:/Aworker/jiahao/scripts/build-status-sentinel.js —— 块渲染器（按 mtime 取最新工件，59 行全量可核）
7. D:/Aworker/jiahao/.scratch/grill-t37/decision-ledger.md —— t37 全账（D-002 枚举单位/D-003 原因码/D-005 revised 工件契约含 tree_sha 已在/D-006 载体与九面登记）
8. D:/Aworker/jiahao/docs/adr/0093 —— generated_from={tree-ish,mode} 双字段纪律（哪棵树+哪种读法是两个字段）
9. D:/Aworker/jiahao/docs/adr/0091、0092 —— audit-coverage/post-land 哨兵族契约、D-M1 一实现律、D-PRE 时间断言形
10. D:/Aworker/jiahao/AGENTS.md —— claim-surface 纪律与 facts canon as-of 通道

## 已实测事实
- 块 JSON 字段全集：run_id, emitted_at, normalized_join_key_version, rows；锚语义折进 run_id 字符串三元组
- run_id.tree_sha = HEAD commit sha（commit 血统标识，非工作树对象名）
- 工作树常态 dirty（本仓有持续 uncommitted 残留面），rows 测的是工作树执行结果而锚名 commit——gap 现由 leg 注释承重
- build-status-sentinel 按 mtime 取最新工件渲染；发射时刻锚=run 时刻 HEAD
- 工件已带 emitted_at（artifact transaction-time）与 tree_sha（valid-time 锚胚）
- 前瞻性范围语义已在 leg 中实现（registration commit 前无锚字段的旧块不入域）

## 待裁问题
主选项：
a) 块新增显式 anchor={tree_sha,ref_context,mode} 字段（additive v1.1，run_id 保留寻址职能）；旧块前瞻性豁免、注册后缺字段=malformed。
b) run_id 隐式锚（零 schema 变更，ADR 立法 run_id.tree_sha=锚）。
c) anchor 字段 + run_id 双写冗余（列出以否决）。
d) 其他。
子问：
1) dirty-tree 语义立法：①mode=working-tree read 诚实命名（锚名血统 commit，rows 测工作树的 gap 显式披露）/②合成 measurement commit 锚（refs/jiahao-measurement/*）/③dirty 则 UNVERIFIABLE（结构性永不可判，错形）。
2) ref_context 语义：发射时刻记录 HEAD 解析到的实体名（workspace-merge/lane-tip/main）=观测上下文记录非评测 ref（Q3 评测锚已裁集合）。
3) prose 边界：①块承重 prose 不承重 / ②prose 逐句带锚（枚举爆炸）/ ③中间形（prose 数值断言须括注 run_id 回指块）。

## 调研要求
1. 工业先例（自择一手）：SLSA/in-toto provenance 的 subject/materials 分离（工件寻址 vs 锚声明）；K8s status condition 的字段additive演进与旧对象缺字段处置；OpenTelemetry trace-context 字段在 span 内外的承载纪律；审计工作底稿「编制日期 vs 报告日期 vs 期间」三时间轴；语义化版本/schema registry 的 additive-only 演进律。
2. 冲突核查：t38-D-001/D-002/D-003 全部条款 + t37 全部 current + ADR-0091/0092/0093 + AGENTS.md。特别核查：①anchor 块字段与 run_id 内嵌 tree_sha 是否构成双权威源（若是，写消歧规则）；②「prose 不承重」是否与现实报告习惯冲突（数值句括注回指是否可行）；③mode 字段枚举值在 dirty 场景是否够表达。
3. 输出：推荐+子问答案 → 理由（先例引证） → 失效模式 → 冲突核查表 → 实现面草图 → 信息缺口。