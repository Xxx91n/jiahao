# grill-t39 Q7 调研题面 — owner 裁量项打包 + grill-t39-prep lane 处置

派发时间：2026-10-07。`cd repo && atomcode -p "<问题 verbatim>"`（ctx_batch_execute, concurrency=1）。

## 问题 verbatim

调研裁决题：grill-t39 收尾打包两题。本仓 D:\Aworker\jiahao 是反虚假完成的 agent 心智模型系统。请先回顾：.scratch/grill-t39/decision-ledger.md 全部 current 记录（D-001~D-006）、.scratch/grill-t38/decision-ledger.md、.scratch/grill-t38/handoffs/next-round.md T-11（owner 移交清单先例）、docs/adr（重点 0039/0083/0089/0091/0094/0095/0096）、CONTEXT.md、AGENTS.md、docs/deferred-registry.json。题一：待落 lane `grill-t39-prep`（commit 2df61d4e）载三文件——`docs/rewrite-map.json`（派生地图）、`docs/governance/orphan-cites.json`（orphan 披露行）、`.scratch/grill-t38/handoffs/2026-10-07-loop-handoff.md` §7/§8（可变 claim 面缺陷叙事）。D-002 已立：任务书改 append-only+漂移声明注册表，落地后派生面须重算。候选：a) 拆解——叙事文字落地、两派生文件丢弃（D-002 新面下重生成）；b) 整 lane 原样落地（落即过期）；c) 整 lane 丢弃。题二：owner 四项裁量（pack cap 签署前重推导+entryCount+同 commit ADR-0039 D3；post-land 刷新时点「波已 settle」判定；audit-surface 红两出路——具名贴 v1 块 vs 立法部分覆盖声明；F-5/F-11 review_at 偏离+P1-9 runner_ctx 残量）的打包形：i) handoff owner 移交清单段（t38 T-11 先例）；ii) deferred-registry 行；iii) 混合。重点调研工业界成熟做法：派生工件的 land/discard 处置惯例（generated artifacts 的 staleness 处理、bazel/nix 派生面纪律）、owner-decision 待办 vs 技术债 registry 的语义边界（pending-decision log / decision queue 实践、issue tracker 的「needs-decision」标签惯例）、迁移动作的「先落叙事再落派生」序次先例。给出推荐与理由，辩证指出呈报倾向（a+i）的问题。若与本仓 current 决策冲突，明确指出不迁就。

## 裁决点

- prep lane：拆解落地 / 整 lane 落 / 整 lane 弃
- owner 四项打包：清单段 / registry 行 / 混合
