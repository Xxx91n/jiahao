# grill-t38 Q1 调研题面 — 轮对象与范围构成（assertion-anchoring)

## 你的任务
对本仓新一轮治理轮（grill-t38）的「轮对象命题 + 范围切分」给出推荐与理由。先读必读工件再作答；结论必须能与仓内既有决策对账。

## 必读工件（按序读，至少读前 6 个）
1. D:/Aworker/jiahao/.scratch/grill-t38/handoffs/next-round.md —— t38 章程（P-1/P-2/P-3 问题面原文）
2. D:/Aworker/jiahao/.scratch/grill-t37/decision-ledger.md —— 上轮账本 D-001~D-006（D-001 已 revised、由 D-004 承接）；t38 任何裁决不得静默矛盾
3. D:/Aworker/jiahao/.scratch/grill-t37/reports/2026-10-05-audit-loop2.md 的 §9 —— emit↔consumer 漂移与 but land 绕过 PR/CI 的过程事实原文
4. D:/Aworker/jiahao/docs/adr/0092-public-object-equivalence-and-post-land-verification-contract.md —— post-land-verify v1 双段哨兵契约（pre_land/post_land）
5. D:/Aworker/jiahao/docs/adr/0091-derive-from-source-mechanism-contract.md —— generator-never-co-signs 派生契约
6. D:/Aworker/jiahao/CONTEXT.md —— 词表（重点词目：Public-Object Equivalence、Post-Land Verification、Wave-Bounded Subset、Pre-Land Battery、Generation-Surface Equivalence、generated_from、Audit Coverage Block、Claim-Surface Role Registry、Declared-vs-Actual Drift、Meta-Sentinel、Deviation Cursor、Class-vs-sample 相关条目）
7. D:/Aworker/jiahao/AGENTS.md —— 工作协定（wave-closeout order、post-restack ritual、ANCHORING footer、audit-coverage 契约）
8. D:/Aworker/jiahao/.codex-tmp/rui.md —— V9 锐评（历史输入，核销参照用）
9. D:/Aworker/jiahao/docs/adr/0093-observer-equivalence-contract.md —— observer-equivalence 与 doc-hygiene ratchet 先例

## 背景速览（细节以上述工件为准）
本仓是 prompt-as-mental-model 项目（jiahao）：primary agent 生成+声称，second-party agent 独立核验。历轮已建：审计重跑清单派生（ADR-0091）、audit-coverage v1 哨兵、post-land-verify v1 双段哨兵（ADR-0092）、observer-equivalence（ADR-0093）、status-inventory v1 派生红集清单+断言腿（t37，ADR-0095 待起草）、claim-surface 角色注册表、deferred-registry、ERRATA、ANCHORING footer 等。公共纪律：手写面不能自证权威；机制与叙述分歧时机制为权威；哨兵=claim 面非 truth 面；时间戳自述 forensic 非 preventive；pre-convention 不追溯定罪。

## t38 候选问题面（章程 + 本轮新发现）
- P-1 自指报告：committed report 的哨兵块声称 pre-commit 快照，载体 commit 改变世界 → 落地即 stale。本轮三连发作（impl report 落地时 stale→审计抓→rework report 在自己的 closeout commit 又 stale）。loop-3 收敛只靠 quiescent re-run（漂移行本身 transient）。章程候选解：a) 声明快照窗（断言腿把 members-as-of-run-X 当作 claim 而非 members-now）；b) 两段式 closeout（先落代码→测量→再落报告，接受报告 commit 移树）。loop-2 的 regenerate+recommit 处方已被证明会重开窗口。
- P-2 live-state 测试绑动境：test/adr-0085-wiring.test.js 对 HEAD 评测 pin ancestry；GitButler 每次 apply 重建 workspace merge commit → 同树实测 2 红 / 3+ 绿。与本轮已修的 orphan-cites 墙钟 pin 同缺陷形（绑动境），只是这次绑的是工作区拓扑。章程候选：a) 对稳定 ref 评测（lane tip/merge-base）；b) 注册 transient-topology errata 类；c) 当真信号收。post-landing 注：全 lane 并入 main 后 flake 缩到 churn-during-apply 窗口。
- P-3 结转裁决群（多为 owner/docs 面）：pack cap 权威对账（armed-band 已 fire vs owner-action 分类不一致）、ADR-0095+gates.json 注册落地、F-5 run_id 缺 matrix 维、F-6 s2 域宽度、F-8 成员身份排除 command/exit、F-9 T-0 tier-fill 未同 commit 立法、F-10 contract-vocab 基面加宽、F-11 mismatch 预计算未实现、post-land-sentinel pre_land 段刷新。
- N-3 新发现：build-audit-checklist.js emit 输出 {commands, advisories} 对象壳，check-audit-surface.js 要求 audit-coverage v1 块为非空裸数组——生成器与消费腿漂移（波 B 手工对齐过）。
- N-4 新发现：but land 直落 origin/main 绕过 PR/review/CI——§9 记为「recorded, not ratified」。

## 待裁问题
轮对象候选命题：「断言锚定」——每个对树态的 committed claim 必须声明其评测锚（as-of 快照窗/lane-tip ref/等），核验机制对照所声明的锚而非对照当下世界；P-1 与 P-2 是同缺陷形（evaluation context 未钉住）的两个投影。

范围选项：
a) 轮对象=断言锚定整轮：P-1+P-2+N-3(emit 输出契约裁决)+P-3 逐项分诊（登记/deferred/owner 移交）+N-4(落地通道是否需契约)
b) 窄化：只烤 P-1；P-2 errata 化；其余推 owner/落地波
c) 再窄：P-1+P-2 合并为「评测锚」一题烤透；N-3/N-4/P-3 全登记不烤
d) 其他切法

## 调研要求
1. 工业界成熟落地的心智模型（重点）：自行选取——如 bitemporal/temporal DB 的 valid-time vs transaction-time、K8s observedGeneration/status-vs-spec、CI commit status 绑 SHA 的断言对象、SLSA/in-toto subject 绑定、coverage-as-of-commit 模型、财务审计报告的 as-of 日期语义、merge queue/batch 测试、hermetic test 纪律、Prometheus staleness/lookback delta、event sourcing 的事件时间vs记录时间等。找真实落地先例而非泛泛概念。
2. 辩证：推荐须带理由与代价；指出每个选项的失效模式。
3. 冲突核查：对照必读工件 2/4/5/6/7 中全部现行决策，逐条判定「无冲突 / 需 revised（说明动哪条、为什么）」。特别核查：断言锚定是否与 t37-D-005 哨兵契约（fresh 重推导断言模型）、ADR-0092 post-land 双段、ADR-0093 observer-equivalence、t36-D-007 class-vs-sample 矛盾或顺承。
4. 输出结构：推荐选项 → 理由（含工业先例引证）→ 各选项失效模式 → 冲突核查表 → 实现面草图（若 a 采纳，P-1/P-2/N-3/N-4 各是什么机制形）→ 信息缺口。