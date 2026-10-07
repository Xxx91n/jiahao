# grill-t39 Q2 调研题面 — S-224 可变 claim 面缺陷裁处

派发时间：2026-10-07。派发命令：`atomcode -p "<下方问题 verbatim>"`（ctx_batch_execute, concurrency=1, timeout=600000）。

## 问题 verbatim

调研裁决题：可变 claim 引用面与机械完整性检查的冲突处置。背景（请先读本地文件核实）：本仓 D:\Aworker\jiahao 的 docs/rewrite-map.json 派生自活体文档，门检腿 check-map-freshness(224) 要求 tip 地图覆盖历史 claim 提交引用过的全部行；常驻任务书 .scratch/*/handoffs/next-round.md 每轮就地覆写，旧行及其被引用 token 消失，地图永远产不出 8 行缺口（实测仍在）。请先回顾：.scratch/grill-t39/decision-ledger.md 全部 current 记录、.scratch/grill-t38/decision-ledger.md、docs/adr/（重点 0085/0089/0091/0092/0093/0095/0096 与 deferred-registry 惯例）、CONTEXT.md 词表、.scratch/grill-t38/handoffs/2026-10-07-loop-handoff.md §7、docs/governance/orphan-cites.json 的 row 结构。候选出路：a) 引用面改 append-only（任务书轮名限定+旧文冻结，指针文件退化为一行）；b) 检查腿加"已登记漂移"豁免通道（引用行因已声明的面覆写消失时登记豁免，登记须写明覆写来源提交）；c) 混合（未来 append-only + 现存洞一次性登记豁免）。请重点调研工业界成熟心智模型：append-only/不可变记录惯例（ADR/MADR、W3C /TR 日期快照、不可改 SQL 迁移、audit log）、引用稳定性（permalink、content-addressing、Cool URI）、CI 基线/豁免注册表模式（RuboCop todo、ESLint/betterer 基线、detekt baseline、Chromium 测试抑制与过期机制、semgrep nosemgrep 审计迹）、"登记豁免 vs 结构性修复"的取舍先例与失效模式。给出推荐（a/b/c 或其他形）与理由，并辩证指出我呈报倾向（c）的潜在问题。若你的结论与本仓账本中任何 current 决策冲突，明确指出冲突点而不是迁就。

## 裁决点

- 主选项：a / b / c / 其他
- 子问 1：append-only 覆盖面——只约束 `next-round.md` 固定名面，还是枚举所有会被 claim 引用的固定路径活文档
- 子问 2：补洞登记载体——orphan-cites.json 加 row kind 复用生命周期，还是新建 registry
