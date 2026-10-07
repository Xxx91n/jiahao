# grill-t38 Q3 调研题面 — P-2 测试面评测锚（pin-ancestry 稳定 ref 选型）

## 你的任务
对 grill-t38 断言锚定轮（t38-D-001/D-002 已 current）的 P-2 投影给出推荐与理由：live-state 测试的评测锚选型与声明形。先读必读工件再作答；逐条冲突核查。

## 必读工件
1. D:/Aworker/jiahao/.scratch/grill-t38/decision-ledger.md —— t38 账本（D-001 轮对象+范围；D-002 锚消费契约——含 lastClaimMutation 共享分类器、漂移观测面黄级、resolvable-commit 宽容等已立法条款）
2. D:/Aworker/jiahao/scripts/evidence-freshness.js —— orphanAncestry(root,f,{ref}) 实现（ref 参数已在；pin_patterns/errata_exemptions/workspace_ref 注册字段；non-ff trigger）
3. D:/Aworker/jiahao/scripts/check-orphan-ancestry.js —— gate 腿调用点（orphanAncestry(root,cfg,{})→HEAD）
4. D:/Aworker/jiahao/test/adr-0085-wiring.test.js —— 「live leg state」测试（orphanAncestry(ROOT,f,{})→HEAD，同 flake 面）
5. D:/Aworker/jiahao/.scratch/grill-t38/handoffs/next-round.md —— P-2 原文（observed 2红/3+绿 同树；章程三选项 a稳定ref/b errata类/c 当真信号；post-landing 注：lane 全并入后残留窗=churn-during-apply）
6. D:/Aworker/jiahao/.scratch/grill-t37/decision-ledger.md —— 全账（D-002/D-003/D-005revised/D-006）
7. D:/Aworker/jiahao/docs/adr/0085-anchor-semantics-claim-point-seal-boundary.md —— pin 祖先契约原文
8. D:/Aworker/jiahao/docs/adr/0092 —— D-M1 一实现两调用方纪律；D-PRE 时间断言形
9. D:/Aworker/jiahao/docs/surface-taxonomy.json —— freshness.orphan_ancestry 注册块（workspace_ref/errata_exemptions/pin_patterns/artifact_scope）
10. D:/Aworker/jiahao/test/helpers/git-hermetic.js —— hermetic fixture 先例（写操作隔离）

## 已实测事实
- orphanAncestry(root,f,o) 第520行 ref=o.ref||'HEAD'；531 行 merge-base --is-ancestor pin.sha ref；两调用点（gate leg+jest test）都传 {} → HEAD
- workspace_ref=refs/heads/gitbutler/workspace 只用于 non-ff trigger（539行），不用于祖先评测
- 本仓当前 refs：仅 refs/heads/main；无 refs/gitbutler/*（无 applied lane 时 GitButler 不建 lane ref；lane tip 现身位置=refs/heads/<lane>，apply 期间存在）
- flake 机械路径：workspace merge commit 每次 apply 重建；pin sha 在 lane-only lineage 时瞬态掉出 HEAD 祖先集
- 其他 is-ancestor/orphanAncestry 引用测试文件：adr-0068/0069/0086/freshness-checker（面宽待裁；freshness-checker 多为 hermetic fixture）
- 章程 post-landing 注：全 lane 并入 main 后 pin 永为 main 祖先，flake 窗缩至 churn-during-apply

## 待裁问题
主选项：
a) 锚=全部 refs/heads/* ∪ refs/gitbutler/* 活分支集合：pin 须为任一有分子支祖先；workspace merge commit 结构性排除；集合为空/锚不可解析→UNVERIFIABLE（C-1）非红。
b) 锚=merge-base(workspace,origin/main) 单锚（lane-only pin 结构性冤红——列出以否决，若你有翻盘证据呈报）。
c) 锚=注册常量 ref（taxonomy 新字段 pin_anchor_ref）——显式但引入「谁更新它」漂移面。
d) 其他。
子问：
1) 调用对称：gate leg 与 jest test 同锚强制（orphanAncestry 的 ref 默认从 HEAD 改为派生锚？还是调用方显式传？默认值改向是否破坏其他调用方）
2) 面宽：本轮只修 pin-ancestry 两调用点 / 枚举全部 HEAD-绑 live-eval 测试（区分锚缺陷形 vs 历史枚举形的划界句）
3) landed 后退化与残留窗：churn-during-apply 假红残留接受为真信号 vs 注册 transient-topology errata 类（errata 化已被 D-001.9 方向性否决「给非封闭测试发执照」，但若实测证明残留窗不可消除须如实呈报该张力）

## 调研要求
1. 工业先例（自择一手）：Bazel hermeticity 对「评测输入声明」的要求；GitHub required checks/status 对 ref 解析的语义；GitButler 官方文档/源码对 lane ref 生命周期与 apply 原子性的定义（branch ref 更新与 workspace merge commit 重建的顺序——这决定残留窗是否真实存在）；K8s observedGeneration 在 controller 读多资源的语义； flaky test 处置的工业先例（不豁免而是修环境绑定的案例）。
2. 冲突核查：t38-D-001（13条）+t38-D-002（10条）+t37 全部 current + ADR-0085/0091/0092/0093 + AGENTS.md（post-restack ritual、hermetic test repos 协定）。特别核查：①orphanAncestry 默认 ref 改向是否破坏 walk()/其他 freshness 求值（同一文件内多函数）；②「pin 须为任一分支祖先」与 pin 契约原文（ADR-0085「resolve to an ancestor of HEAD」措辞）是否构成该 ADR 措辞的语义修订需求——若是，标出需 Declaration 精化句；③errata 化残留窗与 D-001.9 否决的张力如何处理。
3. 输出：推荐选项+子问答案 → 理由（先例引证） → 失效模式 → 冲突核查表 → 实现面草图 → 信息缺口。