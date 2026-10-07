# grill-t39 Q6 调研题面 — Q-t39 处置-证据闭合三活例裁处

派发时间：2026-10-07。`cd repo && atomcode -p "<问题 verbatim>"`（ctx_batch_execute, concurrency=1；cd 钉 cwd 防上轮本地不可读）。

## 问题 verbatim

调研裁决题：「处置-证据闭合」三活例的裁处——prose 声称面与机制面之间的反向核验通道。本仓 D:\Aworker\jiahao 是反虚假完成的 agent 心智模型系统。请先回顾：.scratch/grill-t39/decision-ledger.md 全部 current 记录（D-001~D-005）、.scratch/grill-t38/decision-ledger.md、docs/adr（重点 0027/0048/0083/0086/0089/0091/0095/0096）、CONTEXT.md、AGENTS.md、docs/deferred-registry.json、docs/governance/orphan-cites.json、scripts/ 下腿实现面（check-map-freshness.js、build-audit-checklist.js、run-gates.js 及 evaluateRound 相关）。三活例（来自 t38 LOOP 交接 §5）：(a) 登记声称反向核验——ADR-0096:51 曾虚报「已挂 deferred 行」实际没有，返工才落；(b) 有界断言承接无界义务——defer-0088/F-9 类「登记了但没测」反模式；(c) 仪器自述一致性——run-gates 摘要头 54 行 vs 腿级 53 行 ±1 错报，报告引数不声明仪器口径。候选处置：(a) prose 约定「声称登记须引 row id」+机械存在性检查（row id 在 claim 锚 commit 存在）；(b) deferred-registry schema 加必填「检查通道」字段（gate leg / owner-only 标记 / 机械 trigger 之一）+存量批处理回填；(c) prose 锚条款扩展为「值+run_id+仪器口径名」三元+summary==legs 计数一致性腿。载体候选：独立 ADR-0099 / 并入 ADR-0098 / 拆 AGENTS.md+schema 变更。重点调研工业界成熟做法：审计轨迹中「声称-记录」交叉核验（financial audit 的 completeness vs occurrence 断言方向、SOX control evidence 惯例）、配置管理 registry-schema 必填字段演化（Terraform/Kubernetes CRD required-field 演化、向后兼容策略）、监控系统 counter reconciliation（Prometheus recording rules 一致性、双计数器偏差告警）、技术债工具「登记≠处置」闭环要求。给出推荐与理由，辩证指出呈报倾向（a/b/c 三处置+独立 ADR-0099+存量批处理回填）的问题。若与本仓 current 决策冲突，明确指出不迁就。

## 裁决点

- 三例各自处置形
- 载体：ADR-0099 独立 / 并入 0098 / 拆分
- (b) 存量回填形
