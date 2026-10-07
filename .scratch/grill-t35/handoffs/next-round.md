# grill-t35 → next-round task book

常驻任务书。任何子 Agent 可依赖本文件 + 账本执行。每任务声明覆盖的
D-xxx。数据源：.scratch/grill-t35/decision-ledger.md（8 条 current）+
spec-t35-equivalence.md（唯一实现规格）。

Round object（D-002）：被验证对象 == 公开对象。T-0 基线=origin/main tip
78d8a14c 公开 CI 红（run 36743467940；run-test-gate 3 套件 4 测红 +
gate:all map-freshness+corpus 8 腿 UNVERIFIABLE）。

## Tasks

T-0 baseline recon [D-002]：复核公开 tip CI 状态与失败步名（baseline-CI
条款）；跑 scripts/check-post-land.js（若本轮已建）作 T-0 首轮动作
（D-004 闭环自愈条款）。产出：baseline 事实进轮报告。

T-1 R-A 字节修复 [D-002, D-008#2]：重写
.scratch/grill-t34/handoffs/2026-09-30-reaudit-handoff.md 的正文本
（0x08 吞字复原：but land / trend-inventory / bench 等），display-form
引用原 commit 71f3d4df；写后回读+字节核验（windows_file_integrity）。
交付=新 commit，披露进 E-27。

T-2 R-B pin 重构 [D-006]：ADR-0079 amendment（baseline 注释降
display-form、sha 更新为 816e7bf3、同 commit 配对纪律条文改写）+
test/adr-0079-wiring.test.js D3/D6 改写为历史配对扫描（每触 README.md
的公开线 commit 必同触 README-zh-CN.md）+ 613a2471 等孤儿引文走 Δ2
豁免/重映射注册。禁 zh-tip 边界形（洗白窗已证伪）。

T-3 R-C map 语义重构 [D-005]：check-map-freshness.js 改 tip-map 覆盖语义
（tip map ⊇ 已发布线 claim commit 引文∪，authority/blocking）；per-commit
内嵌检查拆为 audit-time advisory 函数并编入 build-audit-checklist 派生面；
build-rewrite-map.js 对落地树重生（四破损 commit 自愈）；确定性 regen
双跑纪律文档化（E-17 升前提级）。ADR-0092 声明对 ADR-0087/0089 的修订。

T-4 Δ2 枚举面扩容 [D-003 Δ2, D-005]：--published-only + orphan-ancestry
枚举面扩到全部 committed 文档引文 + orphan-cites.json 形态豁免面；
挂到降级后的 advisory 腿（D-005 居所修订）。

T-5 check-post-land.js [D-004, D-007]：fetch→worktree→波界有界子集
（map-freshness 波界段 + tip 树 doc-hygiene[lib] + 锚/pin + 配对扫描）→
<!-- post-land-verify v1 --> 双段机读块（pre_land: workspace 合并树断言
+[最后 claim-mutation sha, 时戳, 子集]；post_land: 落地树结果）。
requires repo-tree+network。docHygiene 抽 shared lib 供两侧共用。

T-6 sentinel 断言腿 [D-004, D-007]：doc-scan 腿扩枚举断言 closeout 工件
带块+两段独立读（反 masking, ADR-0091 D-D）+ pre 时戳≥波内最后 claim
mutation 时戳；走 authority 腿层非 hook；前瞻生效不追溯。[机械：order
次空 230 起，走 ADR-0076 R2 carve-out+trend-row]

T-7 ADR-0092 契约本体 [D-002..D-007]：四处显式声明（Δ2 枚举面契约变更 /
defer-0030 从属强化 / 反 masking 双段独立读 / TSA 不引入理由+armed
trigger）+ F-6 收窄非消除措辞 + merge-group 本地模拟定位 + 末波残余窗
owner-action+refresh deadline+erratum 升级路径。

T-8 注册批 [D-003 Δ3Δ4, D-008#4#7#8]：E-27 errata（四根束+17h 检出滞后）；
defer-0078 check-in 顺延注记；defer-0079 部分吸收声明（吸收面+残余重述）；
defer-0084 不动；R-D owner-action（corpus 密件刷新+refresh deadline）入
轮报告面非 registry。

T-9 CONTEXT.md 词表 [D-008#6]：Public-Object Equivalence /
Post-Land Verification / Wave-Bounded Subset / Pre-Land Battery——
domain-modeling 惯例整理，逐词挑战现有 225 词条后落。

T-10 closeout [D-004, D-007]：最后 claim 面变更后跑 pre_land 段→每波
land/push 后跑 check-post-land→closeout 工件带双段块→公开绿以密件
恢复为条件，不达成按 owner-action+refresh deadline 登记不宣称绿。

## Suggested skills

- implement（spec-t35-equivalence.md 为唯一规格；波序=E-17/E-19）
- domain-modeling（T-9 词表整理）
- neat-freak（收尾前件清洁度）
- handoff（下轮交接）
- atomcode-research（仅在实质分歧需外部佐证时，串行唯一在途）
- gitbutler（全部 VCS 操作；but commit 显式 allowlist+ANCHORING 派生尾标）

## Standing reminders

- 四红线：不改史 / 不静默改工具契约（ADR 声明通道）/ 不自宣公开绿 /
  sentinel 断言从属 defer-0030 不替代。
- owner 专属面：密件刷新、errata 裁决、waiver、潮汐处置——agent 报状态。
- 断言对象恒等式：pre=workspace 合并树（will-land），post=落地公开树，
  两者同类不可漂移。
