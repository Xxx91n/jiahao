# grill-t38 Q6 调研题面 — P-3 结转分诊（八项结转裁决的三出口裁处）

## 你的任务
对 grill-t38 的 P-3 结转分诊给出逐项推荐与理由：八项 t37 结转裁决各自应走「登记（spec/ADR 落笔裁毕）/deferred（deferred-registry 行+review_at）/owner 移交」哪一出口。先读必读工件再作答；逐项冲突核查。

## 必读工件
1. D:/Aworker/jiahao/.scratch/grill-t38/decision-ledger.md —— t38 账本（D-001~D-005 全 current；D-001.2 定 P-3=逐项三出口分诊、D-001.11 定 N-4 只立义务）
2. D:/Aworker/jiahao/.scratch/grill-t38/handoffs/next-round.md —— P-3 原文（60-80 行，八项结转描述）
3. D:/Aworker/jiahao/.scratch/grill-t37/decision-ledger.md —— t37 全账（F-1~F-11 缺陷返回记录出处；D-005 revised；D-006 载体）
4. D:/Aworker/jiahao/.scratch/grill-t37/spec-t37-status-inventory.md —— spec 现有条目（F-5/F-6/F-8/F-9/F-10/F-11 是 spec 起草期发现的裁决悬案）
5. D:/Aworker/jiahao/docs/adr/0094-*.md —— 草拟 cap 上限原文（530,000 草拟值；status 行 owner 未决）
6. D:/Aworker/jiahao/.github/workflows/ci.yml 或仓内 CI 配置 —— 实测是否存在同 job 矩阵并发发射场景（F-5 事实依据）
7. D:/Aworker/jiahao/src/shared/run-id.js —— run_id 三元组现状（F-5 的矩阵维度缺位面）
8. D:/Aworker/jiahao/docs/gates.json 或 gates 配置 —— source_adr 字段形现状（单值还是数组）
9. D:/Aworker/jiahao/docs/surface-taxonomy.json —— 相关注册字段形
10. D:/Aworker/jiahao/AGENTS.md —— wave-closeout/post-land 刷新惯例条款

## 已实测事实（呈报方预查）
- Pack cap：committed cap=470,000；实测包体 530,570 B——超 ADR-0094 草拟上限 530,000 已 570 B
- ADR-0095 未创建（t37 轮契约 ADR 待起草）；status-inventory/expected-red/comment-refs 腿待注册为 gates.json 条目，source_adr 须解析到落地 ADR
- 本轮新增交互点：anchor 字段经 ADR-0096 演进后 status-inventory 腿权威源=0095+0096 双 ADR——source_adr 单值/数组形须裁决
- F-5：run_id={judged_surface,tree_sha,runner_ctx} 无 CI matrix 维度；spec 句「same-job matrix runs must not collide」
- F-6：s2 export-domain 广度——member-access tails+string literals 当前算 same-file 成员，vs 声明的 declared-symbols 域
- F-8：member identity 排 command/exit——spec 只点了易变字段名
- F-9：T-0 tier-fill 段落未立法同 commit（与 D-005.5 同 commit 义务同型教训）
- F-10：contract-vocab 枚举基座从「44 同族」扩宽到全 docs JSON+枚举——裁决或记录
- F-11：mismatch 预计算未实现——性能优化非契约义务？
- post-land-sentinel：pre_land 段落地波 settle 后刷新（机械 regen 属落地波惯例）

## 待裁问题
逐项裁：九项（pack cap / ADR-0095+gates 注册 / F-5 / F-6 / F-8 / F-9 / F-10 / F-11 / post-land-sentinel 刷新）各自的出口=登记/deferred/owner 移交，含理由与（若 deferred）review_at/trigger 预注册条件。
子问：item 2 的 source_adr 多值解析句是否本轮立法（ADR-0096 落地后 status-inventory 腿权威源即双 ADR）。

## 调研要求
1. 工业先例（自择一手）：deferred/backlog 分诊的成熟框架（ADR 生命周期 supersede/deferred、RFC 流程的 deferred 状态、Kubernetes sig-release 的 deferred/milestone 治理、ISO 9001 CAPA correction-vs-corrective-action 分层）；「同 commit 原子性」先例（schema migration 与代码部署同版本纪律、DB expand-contract 模式）；owner-vs-agent 决策权边界先例（SLSA/RFC human-approval gate）。
2. 冲突核查：t38-D-001~D-005 全部条款 + t37 全部 current + AGENTS.md + 已立法 deferred-registry 形。特别核查：①F-9「同 commit 立法」是否与 D-005.5 同 commit 义务构成同一普遍条款应合并立法；②item 2 的 source_adr 双值与现有注册字段形是否冲突（须实测字段形）；③哪些项表面是「分诊」实质是「设计裁决」不应走三出口该另烤（若发现，如实呈报）。
3. 输出：逐项裁处表 → 理由（先例引证） → 失效模式 → 冲突核查表 → 信息缺口。
