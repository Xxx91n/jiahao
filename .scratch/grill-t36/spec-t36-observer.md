# spec-t36 — 观察者等价契约轮（observer-is-part-of-the-observed round）

Source of truth: .scratch/grill-t36/decision-ledger.md (D-001..D-009;
D-001 revised——成员表被 D-003 增补，其余各款存续；D-002..D-009
current). Every section tags its ledger origin. Mechanical/factual
bindings are marked [机械] and carry no independent decision weight.

T-0 baseline (grill-t33 D-003(iv) baseline-CI clause): origin/main tip
0f58ba60 (t35 docs lane landed 2026-10-02); public CI run 36968680335 —
209 rewrite-map-published PASS, 231 post-land-sentinel PASS (首个真实绿
post_land 块落地), 196 pack-smoke FAIL (申报内：实测 476,450 超注册
cap 470,000), corpus 8 legs UNVERIFIABLE (mr-probes.jsonl 缺席密件,
deadline 2026-12-15). 公开绿仍不可宣称。[D-002 两清单, D-009]

## 1. 轮对象与范围 [D-001 存续款, D-003]

轮对象原文：the observer is part of the observed — assert it
（观察者是被观察对象的一部分——断言它）.

成员表（D-001 经 D-003 scope amendment 增补后的现行形态）：

- M1 字节面等价 — §2 [D-004]
- M2 仪器无侵入 — §3 [D-006]
- M3 角色分离 claim 面 — §4 [D-005]
- M4 生成面等价 — §5 [D-003]（增补成员）
- C1 class-vs-sample 升 AGENTS.md — §6 [D-007]
- C2 自指失明注记入 ADR-0093 限制段 — §6 [D-007]
- C3 audit-evidence 残渍处置 — §7 [D-008]（owner 裁量项，拆出
  ADR-0093 主体——实质项不得伪装机械项）

已执行事实：grill-t35-impl/docs 落地闭环波已在 t35 账本闭环内完成
（D-002 全案执行：落地 tip 0f58ba60；closeout 工件
.scratch/grill-t35/reports/2026-10-02-landing-closeout.md 命名两清单
——本波消除的红 209/231 vs 存续申报内红 196+8 corpus；哨兵首个真实
绿 post_land 块；phantom-rows 以 Documented-Decision Closure
「defer+reason」登记为 t36 议题=本 spec §5 的问题源）。t36 T-0 首轮
照跑 check-post-land --post-only 于已绿树上（t35-D-004 语义不变）。
[D-001#3, D-002]

显式边界：不改史；grill 期不动源码（实施波另议）；closeout 不宣
公开绿（corpus 刷新为条件）；defer-0030 从属重申散见 §2-§5；四红线
与 owner 专属裁量表不变；「落地推后」在案否决（与 t35 验收语义冲突）。
[D-001]

## 2. M1 字节面等价 [D-004]

分波改良形——同一 ADR-0093 两条 Δ2 Declaration、实现分两波（判据：
doc-hygiene.js:11 注册判据「measured, not guessed」——一波动四件事
会把 measured 压成猜测）。

波①（Declaration 1）— 枚举面闭盲点：

- 枚举面 = 全部受跟踪文本：gitattributes text 属性主判据 + NUL 嗅探
  兜底 + oversized 披露型 skip（披露非豁免——能力边界列名，防名单
  腐烂成静默 allowlist；secret-scan oversized 先例）。
- shared lib 单实现 trackedTextFiles(root)，caller 只传 root 不得
  缩面（caller-selected 扫面=观察者自选不看哪里，病灶本体）。
- 底座 = git ls-files 的 index∪tree 联合（index 单独不权威，
  t30 F-1 先例）。
- committed ratchet 基线（docs/governance/ JSON，条目型注册例外）
  吸收存量违规：--write 一次生成，此后每波 --check 重验证
  （diff 基线不覆盖基线；readme-pairing-baseline 先例）。

波②（Declaration 2）— 签名集：

- mid-file U+FEFF 入集：byte 层 EF BB BF 三元组断言，不在 decoded
  string 层（p-3 双单位教训）+ 显式 declared widening 到 any-offset。
- bidi 方向控制族同 Declaration 主动收编：U+202A-202E / U+2066-2069 /
  U+200E / U+200F / U+061C（Trojan Source CVE-2021-42574；本仓特化
  理由：治理文档的渲染形态即断言载体，bidi 可让 "never closed"
  显示为 "closed"）。
- 不收 zero-width 族 / U+00A0 / U+00AD（双语仓合法用途，违 measured
  判据，留 defer-registry）；注册制开放集保留。
- 含坏字节的负向 fixture 走注册例外通道（否则全量枚举令测试料架
  自爆）。

断言腿居所 = 扩现有面不开新腿：jest wiring pin 枚举正则换
trackedTextFiles()；check-post-land 子集同换；
post-land-sentinel.test.js 补 FEFF/bidi 正负 fixture（byte-offset
断言延续 p-3 回归锁形）。blocking 层级不降。

行文义务：

- 双句分离（最高危）：blind spots closed by declaration; the class
  remains open — repaired, never closed。合并句式=违账。
- trackedTextFiles 底座与 M4 共享 ls-files 枚举——Declaration 显式
  写明共享底座与两侧消费面，否则 M4 静默受益=违 Δ2+弱化 defer-0030。
- 三处加宽各独立 declared widening（any-offset FEFF / bidi 族 /
  全量扫面），防 dual-reading（ADR-0083 D-003）。
- ADR-0092 D-M1 声明段（55-67 行）同波改写为已闭态——波内必做项
  非可延后项。
- 新 Declaration 挂 ADR-0093 独立 N of M 计数，不动 0092 既有
  「1 of 3」编号（f-2 计数测试按此扩）。
- defer-0030 从属二次重申：scripts/** 入断言面=扫描器扫自身所在
  目录类，自指面再扩须显式留痕。

否决项（在案）：扩展名集枚举 / 纯嗅探枚举 / 路径 carve-out 豁免 /
code 内 allowlist / 新开 gates.json 腿（可见性诉求备选 order 232
附近腿 + ADR-0076 D-B carve-out）/ blocking 降 advisory / ratchet
每波重生 / zero-width 族收编。

## 3. M2 仪器无侵入 [D-006]

点对点修 + 类断言腿（a+ 形）。

点对点：check-g6-publish.js:209 覆写改 compare 形——默认路径只算
不写（生成到内存/临时面与 committed 工件 diff，不一致 exit 1）+
显式 --write-log 写模（prettier --check/--write 同族：验证与变异是
两个命令非一个命令两结果）。

工件语义裁断：bench/research/out/g6-publish-replay.json = 派生证据
日志非锁定基线（锁定基线 = g6-publish-fixture.json，ADR-0050
append-only）；compare 红 = 证据过期警报（committed 日志不再描述
当前回放→显式 --write-log 再生+commit），非回放漂移（回放正确性
归 tier a/c 对 fixture 断言）；build-round-facts.js:62 以它为事实
源——故「改写 ignored 位置」否决在案（证据退出被评判树）。

类断言腿：居所 = scripts/run-gates.js wrapper 级 instrumentation
（非 gates.json 新腿——腿结构性无法观测其他腿，观测点错位与
t35-D-L1 拒绝 CI 腿同构论证）。

- 入口零点：gate:all 入口对当前工作树取 tracked-hash 基线——断言
  「本次运行未变异 tracked 文件」非「树须净」；预存脏面零点原样
  登记，不罚不吞（与不得盲 discard 义务兼容）。
- 逐腿检查点：每腿执行后重算，失败归因粒度 = 腿号+文件双层
  （changed-path 清单不展开全量 diff）。
- 快照对象 = 全 tracked 树（ls-files index∪tree + 内容 hash，与 M1
  trackedTextFiles 共享枚举底座）；untracked 面天然排除
  （ignore 机制本分工）。
- 合成结果行 [- tracked-surface] PASS/FAIL 入 results 表，
  blocking = confirmatory 级不降 advisory。
- 无「合法 tracked 写入」豁免通道（合法出路 = ignored 路径或
  compare 形）。

Δ2 通道两处：①工件契约变更（ADR-0065 D-B.3「Persist the replay
log」→ compare/explicit regen）——ADR-0093 numbered Declaration +
gates.json 的 g6 _doc 同 commit 更新（防 gates-coupling 腿因文本失配
红=修病灶红别腿的自指纠缠）；②wrapper 契约变更 + 与 M1 共享枚举
底座的显式声明。

行文义务：

- 「本 Declaration 是 E-19 settled 树评估可满足性的前置条件」写入。
- D-001 次选形条款不删（forward-only）：ADR-0093 声明「M2 以主选形
  落地，次选形条款未被激活」（次选形细则留存：忽略路径写时不计
  入波内最后 claim mutation 时戳核算防反向 masking / 忽略路径工件
  不入 split-form 计数）。
- 与 D-004「不开 gates.json 新腿」否决项同形不同质——观测点论证
  vs 可见性论证，行文分写防混同。
- 当前脏 g6-publish-replay.json = R2-3 物证——处置 = 显式 regen
  commit 或随修复 commit 定稿，禁止 discard/悬空。
- 残余披露：wrapper 断言窗内无变异不断言窗外——F-6「narrowing not
  closing」句式同构写入。
- 实施波落点（claim 波前或随同）= owner 裁量点。
- check-test-git-hermetic(222) 为姊妹腿先例（jest hermeticity vs
  门编排 hermeticity，不同观测点互不取代）；实施波先读其内部实现
  再定 wrapper 形（可能可复用底座）。

## 4. M3 角色分离 claim 面 [D-005]

注册表加固形。

- 注册表：committed JSON 于 docs/governance/（拟名
  claim-surface-roles.json [机械]），path → role 枚举
  {examiner, implementer, mechanical}；check-audit-surface(229) 与
  check-post-land-sentinel(CLOSEOUT_RE) 改消费注册表非文件名模式；
  未注册 claim 面工件 = 红（fail-closed 反向断言——防伪边界在消费
  面：自称 examiner 的文件不在注册表 examiner 行里，229 根本看不见
  它；SLSA Mini-Shai-Hulud 教训：信任域内不可防伪造）；新工件与
  注册行同 commit。
- 防自贴：examiner 类行入 exception-channel 生命周期
  （requested_by/expires_at/owner-ratify——agent 可申请不可自证，
  ADR-0086 同构「the agent registers and reports; it never
  self-certifies」）；生效门可挂 countersign 完成（第二只眼成行
  生效前提而非平行制度）；注册行携 declared_by + 落盘通道双承载面
  （git author/committer 双字段同构）。
- 治理类字段级拆分：path→role 映射 = fenced；examiner 行增删 =
  exception-channel；_doc/source_adr/schema_version = editorial。
  注册表 = declared-facts 面非派生物（角色归属是裁量事实无机械
  源——若可派生就不需 M3）——禁加 generated_from 冒充派生物。
  规则变更走 Declaration、同角色行追加走 exception-channel+潮汐——
  两层显式分开（否则治理僵化或静默）。
- 存量回填：一次性 backfill commit 全量注册 implementer/mechanical
  （语义登记非赦免，commit-date effectiveness 不溯及定罪）；吸
  ratchet 单调性——行只增不删，删行 = owner+Δ2；行可 archived 不删
  （honest history）。
- 迁移：regex 与注册表腿同 commit 退休（no coexistence window =
  dual-reading 禁令）；ADR-0093 编号解除句点名 ADR-0091 D-E 与
  ADR-0092 D-S1 的选择器被注册表消费取代；CLAIM_RE 路径枚举保留
  （范围断言≠角色断言）；文件名自由恢复（改名病灶终结）。
- 混合角色工件（closeout 报告含 examiner 散文）拆分义务写入
  ADR-0093（SOC2 证据分离原则：拆为两工件分别注册）。
- 注册表自身为被断言对象：断言每注册 path 存在树中、每 claim 面
  工件有行、role 值在封闭枚举内（新腿或并入 221 同族——居所
  [机械] 实施波定）。
- defer-0030 覆盖重申：注册表=新枚举面入审计范围；examiner 工件
  与二方审计耦合变紧方向一致。

封闭集扩容预期预登记：owner 裁量决议、second_reviewer 会签记录等
潜在类；开放集无边界不得放开。

否决项（在案）：front-matter 自声明（自贴标签漏洞+扩枚举面）/
目录分裂（病灶换装+CLAIM_RE 硬编码迁移成本）/ 文件名 token 强化
（t35 已证伪）/ 祖父豁免（229 对全历史失明+通配豁免违例）/
ratchet 回填形（M3 问题是选样错误非噪声，与 M1 baseline 异质）。

行文划界：M1 baseline / M3 注册表 / M4 生成面三者可闭性与机制
不同质——防读者把 backfill 误读为第三处 ratchet。examiner 行写权
= owner 裁量（exception-channel），实施者永不持 examiner 写权。

## 5. M4 生成面等价 [D-003]

生成器的读作用域必须等于其断言目标对象（D-PRE「对象由断言语境
命名」原则的生成器侧延伸）。

问题源：phantom-rows——build-rewrite-map.js 在含未落地 docs lane
的合并 workspace 树上枚举引文（git ls-files 并 ls-tree HEAD），把
未落地文件引文烘进落地 map（公开腿 209 检出；D-002 以 defer+reason
登记的本轮兑现——它是轮对象的一手活例）。

修复方向组合：

- 主：枚举面绑定断言对象——生成路径改走 scanDocTokensAt 式
  tree-internal 形（build-rewrite-map.js 同文件内既有
  scanDocTokens() 合并树读与 scanDocTokensAt(root,ref) 树内读两套
  纪律，统一到树内形）。
- 辅：派生物携带 generated_from:{tree-ish, mode} 溯源字段
  （buildinfo 形态；使「这 map 描述哪棵树」成 --published-only 可
  机器断言的自证钩子；SLSA completeness.materials / Quarkus SBOM
  按断言目的分清单先例）。
- lane 隔离降为可选纪律不独立成方案（纪律非契约可旁路——
  ADR-0083 D-C 同类）。

ADR-0093 侧：M4 独立成员小节 + numbered Declaration（枚举面/工具
契约变更，Δ2 通道）+ f-2 标签计数测试同步扩。

划界（防反套）：

- 与 C2：phantom-rows 是普通可修生成缺陷非自指残余——C2「结构性
  漂移数不得修」条款禁止援引于 map 生成器。
- 与 M1 可闭性：M1 钉死「repaired, never closed」（哥德尔残余）；
  M4 绑定断言机器可判定可真闭——行文写明两者可闭性不同质，禁止
  互套句式。
- ratchet 形态不适用：phantom-rows 是 false-positive 红腿非
  always-green 噪声，M1 ratchet 基线机制不得移植到 M4。

合法性边界判据：树无绝对合法性——断言对象合法性 = 断言语境的
函数（消费者被授权在哪个对象上判定）；pre_land 读合并树合法、
map 生成读合并树非法，是同一棵树在不同断言域的边界。

## 6. C1/C2 顺带项 [D-007]

C1 — AGENTS.md Working agreement 段新增 bullet（位置 = t34
audit-coverage 条款之后，证据簇第二位）。句式要件：

- 机械义务半句：「A claim about a class requires verifying the
  class — name the enumeration surface or register the residual;
  a passing sample is evidence about the sample, not the class.」
  （ISA 530 / PCAOB AS 2315 原型：结论只准外推到被命名
  population）
- 双句分离纪律：有限枚举洞 closed by declaration / 开放字节类
  repaired, never closed
- 精确复盘指针：t35 report 的「three instances, same shape」段
  （.scratch/grill-t35/reports/2026-10-01-report.md）——不写
  「四轮都有此根」（反 M-2/M-3 计数失真）
- 「暂不机械化，机械化须走 Δ2/Declaration」声明（bare-SHA 软
  约束先例同型：无 gate 纪律条款可有居所）
- cross-ref Evidence-Tiered Readiness
- 禁纯口号形（无枚举面义务半句=下一位执行者的 oracle 歧义，
  R2-1/R2-2 复发形状）

C2 — ADR-0093 已知限制段注记：「post-land-verify 块永远无法描述
覆盖它的 rewrite-map，同族于 commit 不能含自身 sha」；显式边界
重申（仅及块↔map 这一对；M4 生成器缺陷可修必修——D-003 划界防
反套）；限制段末 forward pointer（出现第二个自覆盖实例时方考虑
升 CONTEXT 词条）。禁词条化——仓史先例全部在 ADR 限制段
（sentinel 从属 / TSA 披露 / F-6 收窄无一词条化），去语境正典化
放大「误读为可修 bug」风险。

此刻改提小节形/词条形构成对 D-001 的静默偏离，须走账本修订不得
直接改文件绕账。

## 7. C3 残渍处置与 owner 裁量居所 [D-008, D-009]

C3（D-008，owner 裁量项经记录生效，不入 ADR-0093 主体）：

- .gitignore 收编 .scratch/*/audit*-evidence/（覆盖 audit-evidence/
  audit2/audit3，t22 拓宽正则同族）+ .scratch/*/audit-backup/
  （同台残渍）——never-commit 约定（nc-001）机械化，status/diff
  噪声清零且通道级防误提交。
- nc-001 reason / AGENTS.md 补「ignored-by-design」叙事句（约定
  语义 = never committed 非必须可见）。
- 4 件 tracked LEGACY 保持（t12 round-commits/round-diff、t13
  reverify json、t15 audit-report——gitignore 对已跟踪文件构造性
  不生效，adr-0074-wiring.test.js:226 运行时仍可读）。
- t35 池 61→3 自发塌陷如实写入 t36 closeout 披露面。
- .scratch/grill-t6/audit/b7ccbeb/ 整仓快照单列登记为独立残渍类
  （非 nc 覆盖类，jest-haste-map 命名冲突史=真实污染旁证），不并入
  本 pattern。
- 残余披露：ignored≠保护——clean 型命令仍可误杀证据面；未来审计
  新写证据不再现于 status（clean-tree 负向判定不受影响已核）。

否决在案：b 提交（违 nc-001+t28-D-003+t31-D-006，adr-0083-wiring
LEGACY 断言即红，patch 毒性原始动因仍在）/ e 注册 mechanical
（audit-evidence=examiner 产物非 claim 面，与 D-005 职责界冲突）；
c 删除留作 owner 备选未采纳（机械安全但不可逆；~120 处 tracked
文档 path/count 指针成死引；部分捕获绑定不可重现树态）。

owner 裁量三项（D-009）：

- (a) pack-cap 修订现裁：独立修订 ADR（不入 ADR-0093，照 ADR-0082
  骨架：政策节先于值节 = text order=time order；npm pack --dry-run
  的 size 字段测量协议钉死；ceil_to_10_000(476,450×1.10)=530,000；
  D-D 显式声明不追认 476,450 与此前超帽读数 = repaired history
  not excused measurement；second_reviewer 槽 OPEN + 新 defer-id，
  review_at 骑 2026-12-15 潮汐——owner 现批不必等会签，
  ADR-0066/0082 accept-now-countersign-later 先例）。修订只改
  ADR-0039 D3 字面量，不另设常数。修订≠公开绿（196 转绿后 8 条
  corpus UNVERIFIABLE 仍封锁公开绿宣称）。
- (b) corpus 维持注册 deadline 2026-12-15 不改注册——执行时点是
  owner 自由非裁决分支；owner-action 清单加非约束句「earlier
  refresh welcome; deadline unchanged」；若提前刷新落地，条件解除
  须凭据显式登记（新 tarball+manifest 对上），agent 不得推断解除。
  corpus 密件刷新 = owner-only 动作，agent 只报告状态；deadline
  = 上限非排程。
- (c) spec-t35 §9 裁定 = 四主题三标签：「四处显式声明」是四个斜杠
  列举主题非编号标签计数（ADR-0092 D-M2 审计注记为在先同题裁定——
  defer-0030 从属强化是 D-M2 内散文非第四标签）；f-4 一行
  editorial erratum 修订 spec-t35 措辞对齐在先裁定，引注记为据防
  dual-reading。裁「四标签」被拒（与 D-004 新 Declaration 挂 0093
  独立计数、不动 0092 既有 1 of 3 正面冲突）。

## 8. 机械绑定 [机械]

- 载体 ADR-0093（次空号已核实），承载 M1-M4 各成员小节 + 独立
  N of M Declaration 计数（预计 6 条：M1 枚举面 / M1 签名集 / M2
  g6 工件契约 / M2 wrapper / M3 注册表 / M4 生成面——编号按起草
  定稿）。
- 派生文件名（裁定沉默项）：角色注册表
  docs/governance/claim-surface-roles.json；M1 ratchet 基线
  docs/governance/doc-hygiene-baseline.json。
- lane 序：grill-t36-docs（文档波：ADR-0093 + CONTEXT 词表 + 本
  spec + 任务书 + AGENTS.md C1 bullet + nc-001 叙事句 + .gitignore
  收编 + f-4 erratum + t6 快照登记）→ grill-t36-impl（实施波）。
  文档波先于实施波提交（working agreement 文档轮收尾条款）。
- 波序 = E-17/E-19 硬序：claim 内容→电池→块入 carrier commit→
  派生物→map LAST→落地后 settled 树重验。
- CONTEXT.md 候选新词（裁定沉默项，domain-modeling 逐词挑战后落）：
  Generation-Surface Equivalence / Instrument Non-Intrusion /
  Claim-Surface Role Registry / Tracked-Text Enumeration /
  generated_from。
- 测试 seed：wiring pin 换 trackedTextFiles + post-land-sentinel
  FEFF/bidi fixture + f-2 标签计数扩 + 注册表自断言腿居所。
- 本工作台（.scratch/grill-t36/*）随文档波提交。

## 9. 验收门 [各 D 汇流]

- 文档波绿：ADR-0093 + 各 Declaration 编号 + 词表 + wiring seed +
  AGENTS.md/nc-001/.gitignore/erratum 全部同波提交，map LAST 重生，
  --published-only 干净。
- M1：trackedTextFiles() 上线且三 caller 同换；FEFF/bidi 正负
  fixture 过；基线 --check 绿；ADR-0092 D-M1 段已闭态改写。
- M2：g6 compare 形默认只算不写 + --write-log 显式写模；wrapper
  [- tracked-surface] 行 confirmatory blocking；预存脏面零点登记
  不误报。
- M3：注册表消费化后 229/CLOSEOUT_RE 绿；未注册 claim 工件=红
  实测；backfill commit 落地；regex 与注册表腿同 commit 退役。
- M4：生成路径走 tree-internal 形；generated_from 字段被
  --published-only 机器断言；phantom-rows 形态不再可生成（可真闭
  ——与 M1 句式不互套）。
- C3：status/diff 噪声清零；LEGACY 四件仍可被测试读。
- owner 面：cap 修订 ADR 呈批待 owner 签（agent 起草完成≠生效）；
  corpus deadline 登记不动；f-4 erratum 落地。
- 禁宣称项：公开绿（corpus 条件未解）/ 字节腐蚀类闭合
  （repaired, never closed）/ 注册表自证防伪为充分（countersign
  是行生效门非语义保证）。

## 附录 — 账本沉默项裁定清单（owner 已裁：全按机械/事实项）

1. 本 spec 文件名 spec-t36-observer.md（沿 t35 命名例）。
2. CONTEXT.md 候选新词名（§8 列名，落词仍走逐词挑战）。
3. 派生文件名（§8：claim-surface-roles.json /
   doc-hygiene-baseline.json）。
4. lane 名与提交序（§8：grill-t36-docs → grill-t36-impl；工作台随
   文档波）。
5. Declaration 布局编号（§8：约 6 条挂 ADR-0093 独立 N of M）。
6. f-4 erratum 居所（§7(c)：spec-t35 一行修订以 erratum 注释形在
   t36 文档波内执行，不改史）。
