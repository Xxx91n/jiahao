# grill-t38 任务书（next-round）— 断言锚定落地波

> 数据源：decision-ledger.md（D-001~D-006 全 current）+ spec-t38-assertion-anchoring.md（S-0~S-12）。每项声明覆盖的 D-xxx；括号外事项勿做。起草日 2026-10-06。

## T-0 硬序（违规=漂移窗复发）
1. ADR-0095 起草落地（含 S-9 登记内容）→ 2. ADR-0096 起草落地 → 3. 机制实现（T-3~T-7）→ 4. gates.json 三腿注册（assert 腿最后，防 source_adr 悬空——ADR-0058 R3 先例）→ 5. deferred 行落盘（T-9）→ 6. E-19/AGENTS.md 注记（T-10）。

## 任务表

| # | 任务 | 覆盖 D-xxx | lane 建议 |
|---|---|---|---|
| T-1 | 起草 ADR-0096（§P-1 发射侧/§P-2 测试面/§N-3 emit 三节，每节可独立修订；含消歧三规则、双时制披露句、co-signs 界限句、两类锚划界句、L-1 边界、forward-only 三条款、修订承接链 S-11） | D-001.12, D-002, D-003, D-004, D-005 | docs |
| T-2 | 起草 ADR-0095（t37 轮契约 + D-006 结转登记：source_adr 双权威声明句、同 commit 普遍条款、F-6 域谓词、F-8 identity 精化句、F-10 扩宽登记） | D-006.2/.3/.4/.5, t37-D-006 | docs |
| T-3 | 发射侧实现：run-gates.js/run-test-gate.js 补 ref_context 派生（复用 T-6 liveAnchors 探测，不改 run_id 语法）+ payload 带 anchor 字段；build-status-sentinel.js 透传工件 anchor（缺则渲染无锚块+stderr 黄级提示） | D-004.1/.4/.9 | impl |
| T-4 | 断言腿改造 check-status-inventory.js：双断言分离（成员对账读 anchor.tree_sha+自身 run_id 工件 / 新鲜度区间断言嵌腿内）+消歧三规则（禁 run_id 反解/mismatch 红行/legacy 路径+::warning）+prefer-HEAD 废除改漂移观测面 | D-002.1~.9, D-004.2/.6/.7 | impl |
| T-5 | lastClaimMutation 提升 shared/（check-post-land.js→shared，一实现两调用方） | D-002, D-001.7 | impl |
| T-6 | P-2 集合锚：evidence-freshness.js orphanAncestry 默认 ref 改向派生活分支集合（refs/heads/*∪refs/gitbutler/*；显式传 ref=fixture 逃生舱）+树读/lineage 分离+集合空→UNVERIFIABLE；fixture 回归 freshness-checker.test.js 合成仓语义验证 | D-003.1~.4, D-003.9/.10 | impl |
| T-7 | N-3 单 commit：emit 改打完整可贴块+`--advisories` 子命令+回环 pinning test（并入 test/audit-checklist.test.js 或 audit-surface.test.js）+_doc/AGENTS.md 措辞同步 | D-005.1~.5 | impl |
| T-8 | gates.json 三腿注册（status-inventory/expected-red/comment-refs；source_adr 单值指 0095；assert 腿最后落地） | D-006.1/.2 | impl |
| T-9 | deferred-registry.json 落六行：N-4 义务、HEAD-绑枚举、残留窗实测、prose 兜底、F-5（trigger=matrix: 出现/review 2026-04-30）、F-11（trigger 与 t37-D-003.7 同 anchor/review 2026-04-30） | D-001.11, D-003.5/.6, D-004.5, D-006.1/.6 | docs |
| T-10 | AGENTS.md 更新：E-19 注记级修订（快照锚面语义）、emit 措辞、prose 括注义务条款 | D-001.6, D-004.5, D-005.5 | docs |
| T-11 | owner 移交清单（非 agent 裁量，只呈报）：①pack cap（ADR-0094 签署前按 pinned 公式重推导+entryCount 补齐+同 commit 改 ADR-0039 D3）；②post-land-sentinel pre_land 刷新时点确认（「波已 settle」判定属 owner） | D-006.7/.8 | — |
| T-12 | 落地波验收：漂移观测面就位确认+残留窗实测首样本登记+F-9 普遍条款可判性验证 | D-003.6, D-006.3 | impl |

## suggested skills
- `domain-modeling`（T-1/T-2 起草期——CONTEXT.md 词目对齐、ADR-FORMAT）
- `tdd`（T-3~T-7 实现期——pinning/fixture 回归先行）
- `grilling`（落地期若出新悬案——单题烤透不批量拍脑袋）
- `neat-freak`（落地波知识收尾）

## 范围外声明（勿做）
- pack cap 签署/包体瘦身=owner act；post-land 刷新时点=owner 判定
- source_adr 数组扩形（fenced 字段，须 countersign——重开条件见 D-006.2）
- audit-coverage/post-land-verify 锚定收编（下一轮独立枚举面）
- HEAD-绑 live-eval 测试全量枚举（deferred 行登记即可）
- t23/t27/t28/t36 残留、ADR-0094 status 行、post-land-sentinel.test.js 未跟踪文件

## 实现期登记缺口（先测后写）
- GitButler restack 抖动下 ref_context/lane ref 稳定性（T-3/T-6 前置实测）
- 锚树重推导成本（超 CI 预算则分层：gates 腿锚处重推导+test 腿仅锚校验）
- 全红日快照+anchor 体积增量（常量级预计可忽略，实测）