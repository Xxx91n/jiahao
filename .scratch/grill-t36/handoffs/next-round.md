# grill-t36 → next-round task book

常驻任务书。任何子 Agent 可依赖本文件 + 账本执行。每任务声明覆盖的
D-xxx。数据源：.scratch/grill-t36/decision-ledger.md（9 条：D-001
revised 成员表被 D-003 增补其余存续，D-002..D-009 current）+
spec-t36-observer.md（唯一实现规格）。

Round object（D-001）：the observer is part of the observed — assert
it（观察者是被观察对象的一部分——断言它）。T-0 基线=origin/main tip
0f58ba60，公开 CI run 36968680335：209/231 PASS（哨兵首个真实绿
post_land 块），196 pack-smoke FAIL 申报内，corpus 8 腿 UNVERIFIABLE
（deadline 2026-12-15）。公开绿不可宣称。

## Tasks

T-0 baseline recon [D-001#3, D-002]：复核公开 tip CI 状态与失败步名
（baseline-CI 条款）；跑 node scripts/check-post-land.js --post-only
于已绿树上（t35-D-004 语义不变）。产出：baseline 事实进轮报告；
残红双清单核对（196+corpus 申报内 vs 其他红=异常须即清）。

T-1 ADR-0093 契约本体 [D-003..D-007]：次空号载体；M1-M4 各成员小节
+ 独立 N of M Declaration 计数（预计 6 条：M1 枚举面/M1 签名集/M2
g6 工件契约/M2 wrapper/M3 注册表/M4 生成面）+ 已知限制段收 C2 注记
（含边界重申+forward pointer）+ M2「E-19 可满足性前置条件」句 +
M2 次选形「未被激活」声明 + M1/M4 可闭性不同质划界 + M3 治理类三
层与混合角色拆分义务 + defer-0030 覆盖重申×N + ADR-0091 D-E /
ADR-0092 D-S1 选择器解除句。f-2 标签计数测试同步扩。

T-2 CONTEXT.md 词表 + wiring seeds [spec §8 沉默项]：候选词
Generation-Surface Equivalence / Instrument Non-Intrusion /
Claim-Surface Role Registry / Tracked-Text Enumeration /
generated_from——domain-modeling 逐词挑战现有词条后落。

T-3 侧文档批 [D-007, D-008, D-009(c)]：AGENTS.md Working agreement
C1 bullet（句式要件见 spec §6，位置=t34 audit-coverage 条款后）；
nc-001 reason/AGENTS.md 补「ignored-by-design」叙事句；f-4 一行
editorial erratum 修订 spec-t35 §9 措辞（四主题三标签，引 ADR-0092
D-M2 审计注记为据）；.scratch/grill-t6/audit/b7ccbeb/ 整仓快照单列
登记为独立残渍类（不并入 nc pattern）。

T-4 M1 波① 枚举面 [D-004]：shared lib trackedTextFiles(root)
（gitattributes text 主判据+NUL 嗅探兜底+ls-files index∪tree 底座，
caller 只传 root 不得缩面）；oversized 披露型 skip；committed
ratchet 基线 docs/governance/doc-hygiene-baseline.json --write 一次
生成后每波 --check；jest wiring pin/check-post-land 子集换消费。

T-5 M1 波② 签名集 [D-004]：mid-file U+FEFF 入集（byte 层 EF BB BF
三元组）+any-offset declared widening；bidi 族 U+202A-202E/
U+2066-2069/U+200E/U+200F/U+061C 收编；zero-width/NBSP/软连字符
不收；负向 fixture 走注册例外；post-land-sentinel.test.js 补正负
fixture；ADR-0092 D-M1 段（55-67 行）同波改写已闭态（必做）。

T-6 M2 [D-006]：check-g6-publish.js:209 改 compare 形（默认只算不写
+显式 --write-log 写模）；run-gates.js wrapper 逐腿 tracked-hash
断言（入口零点取基线、腿号+文件归因、[- tracked-surface] 结果行
confirmatory blocking、untracked 排除、无豁免通道）；gates.json g6
_doc 同 commit 更新；当前脏 g6-publish-replay.json=显式 regen commit
或随修复定稿（禁 discard）；实施前先读 check-test-git-hermetic(222)
内部实现评估底座复用。

T-7 M3 [D-005]：docs/governance/claim-surface-roles.json 注册表
（path→role 三值封闭枚举+declared_by+治理类字段级拆分）；一次性
backfill 全量注册 implementer/mechanical（行只增不删，删行=
owner+Δ2，可 archived）；229 与 CLOSEOUT_RE 改消费注册表；未注册
claim 工件=红 fail-closed；examiner 行走 exception-channel
（requested_by/expires_at/owner-ratify）可挂 countersign 生效门；
regex 与注册表腿同 commit 退休（no coexistence window）；CLAIM_RE
路径枚举保留；注册表自断言（每 path 存在/每工件有行/role 封闭枚举
——新腿或并入 221 同族）。

T-8 M4 [D-003]：build-rewrite-map.js 生成路径改走 scanDocTokensAt
式 tree-internal 形；rewrite-map 携带 generated_from:{tree-ish,
mode} 溯源字段；--published-only 对该字段机器断言；phantom-rows
形态不再可生成=真闭（与 M1 never-closed 句式不互套）。

T-9 owner 裁量批 [D-009]：(a) pack-cap 修订 ADR 起草（独立小 ADR
照 ADR-0082 骨架：政策先于值/npm pack --dry-run size 协议/
530,000=ceil_to_10_000(476,450×1.10)/D-D 不追认声明/second_reviewer
OPEN+新 defer-id 骑 12-15 潮汐）——呈 owner 批，起草≠生效；
(b) corpus 不动，owner-action 清单补「earlier refresh welcome;
deadline unchanged」+提前解除须凭据登记句；(c) 已并入 T-3 erratum。

T-10 closeout [D-002 同形, D-008#4]：波序 E-17/E-19 硬序；closeout
披露面含 t35 池 61→3 塌陷、M2 窗外残余披露、cap 修订批签状态；
二方审计覆盖新枚举面（defer-0030：trackedTextFiles/注册表/wrapper
断言面/generated_from）；handoff 续轮。

## Suggested skills

- implement（spec-t36-observer.md 为唯一规格；波序=E-17/E-19）
- domain-modeling（T-2 词表整理）
- neat-freak（收尾前件清洁度）
- handoff（下轮交接）
- atomcode-research（仅在实质分歧需外部佐证时，串行唯一在途）
- gitbutler（全部 VCS 操作；but commit 显式 allowlist+ANCHORING
  派生尾标）

## Standing reminders

- 四红线：不改史 / 不静默改工具契约（Δ2 Declaration 通道）/ 不自宣
  公开绿（corpus 为条件）/ defer-0030 从属非替代。
- M1 句式：repaired, never closed；M4 可真闭——互套即违账。
- examiner 行写权=owner 裁量，agent 只注册不自证。
- 账本为唯一数据源：对话回忆不入账者不写进文档。
