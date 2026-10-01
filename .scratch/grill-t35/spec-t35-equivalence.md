# spec-t35 — 公开树等价契约轮（public-tree equivalence contract round）

Source of truth: .scratch/grill-t35/decision-ledger.md (D-001..D-008, all
current). Every section tags its ledger origin. Mechanical/factual bindings
(D-008) are marked [机械] and carry no independent decision weight.

T-0 baseline (grill-t33 D-003(iv) baseline-CI clause, executed 2026-10-01):
origin/main tip 78d8a14c public CI RED — run 36743467940, failing steps
"Run node scripts/run-test-gate.js" (3 suites/4 tests) + "npm run
gate:all" (map-freshness + corpus manifest → 8 legs UNVERIFIABLE). Never
green since t34 landed. This round exists because of it.

## 1. 轮对象与范围 [D-002, D-001]

本轮契约形：被验证对象 == 公开对象（public-object equivalence）。
D-001 沿革：调研门处置（等 5h 额度窗同会话续跑）已消费，产出第二份独立
调研 atomcode-q1-out.txt；其建议经 Q2 裁决入 D-003，procedural 记录不进
契约条款。

轮内第一腿（修复三公开等价根，全部 forward-only 不改史）：

- R-A：reaudit-handoff 0x08 腐蚀字节 fix-forward——新 commit 写正文本
  （被吃字复原：but land / trend-inventory / bench 等），原文以 display-form
  引用原 commit 71f3d4df 保留取证链；披露进 E-27。[机械=D-008#2]
- R-B：translation-baseline pin 重构——见 §5。[D-006]
- R-C：rewrite-map 对落地树重生 + 不变式语义重构——见 §4。[D-005]

轮内契约腿（四门，§2-§6 展开）：post-land 验证义务；lane-sha 引文卫生；
末次变更电池覆盖；E-27 事实注册。

显式拆出：R-D corpus 密件供给漂移不进契约核心（供给事件非等价性事件），
走 §7 披露居所。[D-003 Δ3]

显式边界：不改写历史；不重开 t34-D-002 派生面；grill 期不动源码；
closeout 不得自宣公开绿（以密件恢复为条件绿）；defer-0078 顺延记
check-in；defer-0084 随 2026-12-15 潮汐不变。[D-002, D-008#8]

## 2. 契约四处置 [D-003]

本轮 ADR（[机械] 编号 ADR-0092，D-008#1）承载以下声明：

- Δ1 post-land 验证义务绑点=混合：blocking 对象是本地落地树重验
  （fetch origin/main → 临时 worktree → 落地 tip 上跑波界有界子集）；
  公开 CI 观察保持 baseline-CI 条款的下一轮 T-0 入口形态（trailing）。
  D-002 原句"未观察到公开 tip 绿不算 closeout"经本裁决语义精化
  （账本内已标 revised-精化注记，原句保留）。
- Δ2 lane-sha 引文卫生：不立新权威类——扩写既有
  build-rewrite-map.js --published-only 与 check-orphan-ancestry.js 的
  枚举面至全部 committed 文档引文 + 注册豁免面（orphan-cites.json
  形态）；枚举面契约变更在本轮 ADR 显式声明，不静默改工具契约。
  [居所修订=D-005：扩展挂在降级后的 advisory 腿上]
- Δ3 R-D corpus 断供：轮内独立腿披露 + owner-action 清单（可带 refresh
  deadline 字段），不进 deferred-registry pending-evaluation（断供事件
  非待评估项，语义不匹配）。
- Δ4 defer-0079（claim-commit map pairing 配方）显式部分吸收声明：
  spec 写明吸收哪部分（引文覆盖/map 与 claim commit 的配对面）+ 残余
  范围重述；判据固化为"问题域重叠即声明"。不是整体前向取代。
- 残余约束采纳：监控自指失明→轮外第二方审计兜底（defer-0030 通道，
  从属非替代且优先级升——见 §4）；机械化优于人步（defer-0025）。
- 可用性/基础设施侧红在契约外（equivalence 只管树内容等价）。

## 3. post-land 重验载体 [D-004]

- 新脚本 [机械] scripts/check-post-land.js：git fetch origin/main →
  git worktree add 临时目录于公开 tip → 对落地树跑波界有界子集
  （本波 last-verified-tip..origin/main 内新落地 commit 的 map-freshness
  覆盖 + tip 树 doc-hygiene [docHygiene 抽 shared lib，机械=D-008#2 注]
  + 锚/pin 解析 + D-006 配对扫描），输出机读块。requires 记
  repo-tree+network（fetch）。
- 每个 land/push 波后必跑，绿才算该波完——不只末波（末波恰是 R-A 案发点）。
- closeout 工件必带 <!-- post-land-verify v1 --> 机读块，锚定最后被执行
  验证的波；declared 语义="锚定最后已验证波"，非 tip-verified。
- 末波残余窗显式注册为 owner-action（带 refresh deadline，逾期升级=
  erratum 通道）；下一轮 T-0 序内首轮跑本脚本（闭环自愈）。
- doc-scan 腿扩枚举断言块在（anchoring-footer / audit-surface 同族
  sentinel 形，前瞻生效不追溯）。[机械：断言腿 order 次空，D-008#1]
- ADR 内显式声明：sentinel 断言对 defer-0030 二方审计是从属非替代
  （审计范围收窄为断言块+块内容抽查）。
- 定位=检测性非预防性（自指观察防不了伪造，伪造防线=F-7+defer-0030）；
  不进 gates.json 为 CI 腿（观察点错位）；全历史走查留轮边界。

## 4. map-freshness 不变式语义重构 [D-005]

- tip-map 覆盖升为 authority（blocking）：断言=已发布线 tip 的
  rewrite-map ⊇ 线上每个 claim commit 的引文集 ∪（map=活体登记表恒在
  最前端，restack 免疫）。
- per-commit 内嵌检查降为 audit-time advisory，编入
  build-audit-checklist 派生清单（ADR-0091 机制，审计员 attest 其状态防
  advisory 腐烂）；D-003 Δ2 的枚举面扩展挂到该 advisory 腿。
- 本轮 ADR 显式声明：这是对 ADR-0087/0089 覆盖语义的修订 + defer-0030
  从属强化（tip-map authority 化后自指面变大，二方审计优先级升）。
- 确定性 regen 双跑（E-17）从配套纪律升为 authority 成立前提
  （Rekor v1 反指：否定断言只能由确定性重生背书，不得由消极缺席背书）。
- 四破损 commit（71f3d4df/a0008b3f/c0195aaf/6d57f16d）经 tip-map 重生
  自愈、零豁免条目；不回溯修历史 commit。
- 真根记录（供 E-27）：树组合漂移——lane 时代 commit 内嵌 map 对其
  lane 树正确，docs 分支线性化落地后同 commit 树长出文档面，内嵌 map
  冻结失效。per-commit 自洽在 GitButler 多 lane 落地模型下结构性不成立。

## 5. translation-baseline pin 重构 [D-006]

- D6 断言改为公开线历史配对扫描：枚举已发布线上每个触 README.md 的
  commit，断言其 changed-files 同触 README-zh-CN.md。零 sha 名、restack
  免疫、无洗白窗、堵"README 单动→zh 补→re-pin 漂白"三步合法漂白。
- D3 的"存在+祖先"断言降 advisory/删除；translation-baseline 注释降
  display-form 溯源行——sha 更新到 816e7bf3 作时点记录、非断言对象。
- ADR-0079 必须 amendment：注释语义降级须 ADR 文本同步声明
  （ADR-0083 D-003 禁 dual-reading）。
- 613a2471 等孤儿 sha 引文走 Δ2 豁免/重映射注册；配对扫描列入
  check-post-land 波界子集；合法拆分情形走显式豁免面注册。
- 负向：禁止 zh-tip 边界形（洗白窗口已证伪：zh 独立提交令 range 恒空、
  既有漂移永久洗白）；内容级漂移仍不可测（与钉值形同、无强度退让）。

## 6. 落地前电池覆盖 [D-007]

- sentinel 块扩双段：pre_land 段（断言对象=workspace 合成合并树即
  will-land 对象——merge-group 语义的本地模拟，ADR 注明类比非工业标准；
  记[波内最后 claim-mutation sha, 断言运行时戳, 子集范围]）+
  post_land 段（§3 落地树重验结果）。
- 每波一段、块锚波不锚轮；断言腿机械校验 pre 时戳 ≥ 波内最后 claim
  mutation 时戳（"最后变更后必跑过"=可断言字段，merge-queue
  "check SHA==merge group SHA"同构）。
- 两段独立读：pre 红不被 post 绿豁免（ADR-0091 D-D 反 masking）。
- 走 authority 腿层不写 hook（hook=fast-feedback 可旁路，ADR-0083 D-C）。
- ADR 必写三披露：时戳自填=forensic 非 preventive（防遗忘不防伪造）；
  伪造检测权威=git show 级 replay；不引入 TSA（信任域未分离）+armed
  trigger 预登记（伪造型病例→升独立信任域）。
- 措辞约束：F-6 窗收窄非消除（mutation→pre-run 分钟级）；残余窗裁决属
  post-land+F-6 ritual；不断言"运行后树未变"。

## 7. 披露与注册批 [D-003 Δ3, D-008]

- E-27 事实注册：落地 tip 红束四根（0x08 字节 / 613a2471 孤儿 pin /
  map 覆盖对落地树陈旧×4 commit / corpus manifest 缺 mr-probes.jsonl）+
  ~17h 检出滞后类（被下一轮 T-0 baseline-CI 捕获）。
- R-D owner-action 清单入轮报告面：corpus 密件 tarball 刷新（补
  mr-probes.jsonl vs 版本化 manifest）带 refresh deadline 字段；公开面绿
  =条件绿（密件刷新为前提），此条件性写进轮报告不进 registry。
  [机械：居所=轮报告 owner-action 段，D-008#7]
- defer-0078 check-in 注记+defer-0079 部分吸收声明（D-003 Δ4 行文）。
  [机械=D-008#4]
- defer-0084 随 12-15 潮汐不并入本轮。[D-008#8]

## 8. 机械绑定清单（全部 [机械]=D-008 裁定，非新决策）

- ADR-0092 = 本轮契约载体；sentinel 断言腿 order 取次空（230 起）；
  脚本名 check-post-land.js；sentinel 名 post-land-verify v1。
- docHygiene 自 test/adr-0076-wiring.test.js:551 抽 shared lib，测试与
  check-post-land 共用。
- check-post-land 非 CI job：不入 build-audit-checklist 的 ci.yml 派生面，
  断言经 sentinel 腿居所（D-008#5）。
- CONTEXT.md 候选新词（domain-modeling 整理时定夺）：Public-Object
  Equivalence / Post-Land Verification / Wave-Bounded Subset /
  Pre-Land Battery（D-008#6）。
- 波序=E-17/E-19 现行规约：机制→注册→生成面末波；每波后跑
  check-post-land（D-004），最后波后跑 pre+post 双段（D-007）。
- ADR-0076 分类：脚本/腿=governance machinery 走 R2 carve-out
  注册+trend-row；ADR/文档=R3 文档面自由；套件增量入 manifest 派生面。

## 9. 验收门（本 spec 的完成判据）

- 三修腿落地且本地 check-post-land 对落地 tip 绿（树内容等价恢复）；
- ADR-0092 含四处显式声明（Δ2 契约变更 / defer-0030 从属强化 /
  反 masking / TSA 不引入+armed trigger）+ F-6 收窄措辞；
- ADR-0079 amendment 落地（注释 display-form 声明+配对扫描断言）；
- E-27 + defer-0078/0079 注册行文落地；
- closeout 工件带双段 sentinel 块；公开 CI 绿以密件恢复为条件——
  不达成则按 owner-action+refresh deadline 登记而非宣称绿。
