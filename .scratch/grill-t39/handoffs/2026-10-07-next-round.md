# grill-t39 任务书（next-round）— 四 ADR 落地波 + 双探测族实现

唯一事实源：`D:\Aworker\jiahao\.scratch\grill-t39\decision-ledger.md`（D-001~D-008 全 current）。
起草规范：`D:\Aworker\jiahao\.scratch\grill-t39\spec-t39.md`（sole drafting spec，非权威源）。
调研题面存档：`.scratch/grill-t39/research/`（q2~q8-brief.md + p-b-census-brief.md）。

## T-0 硬序（违规=漂移窗复发）

1. 基线侦察：`but status -fv` + `npx jest --ci` 基线 + `git show --name-only` 习惯自检 + **公共 CI 状态检查**（origin/main tip 最新 run 结论+失败步具名，ADR-0083 基线-CI 条款）。
2. **红窗预注册**：腿 224（check-map-freshness）的 8 行缺失红窗在 D-002 落地前持续存在——轮中间态可红、报告披露不修（D-008.4）。报告须显式写「预注册红窗」字样。
3. 落地序纪律（D-008.3）：**ADR-0100 先于其实施**（立法文本与机制同 commit——ADR-0095 D-B）；立法载体先落、机制载体后落；D-002 三件套（任务书 append-only 改造+漂移注册表+224 分类器输入）**单 commit 原子**。
4. 「先叙事后派生」=commit 内步骤序+紧邻 commit 序，**不许拆原子 commit**（D-007.2）。
5. 每次 `but commit` 用显式 id 允许列表；提交后 `git show --name-only <sha>` 核对落地集=意图集。

## 任务表

| # | 任务 | 覆盖 D-xxx | lane 建议 |
|---|---|---|---|
| T-1 | 起草 **ADR-0097「上游借鉴收编」**：行内上限注释两段式惯例（`jiahao-debt:` 候选名）、收割器落点两案备 owner、诚实边界披露句纪律、方法学四件套（n=4 只 smoke 水位）、强度档 generator 侧（verifier 不装）+上游三事故验收标准、排除域两面、编号连续性约定、数字禁引禁则 | D-003.1~.10 | docs |
| T-2 | 起草 **ADR-0098「Grandiosity（虚饰输出）」**：语义本体+债务形定义三轴判据、收词分诊通道（advisory/generator 侧/双语/五扫描面/owner 二选一）、棘轮形（新增零容忍+存量只降+goal 锁 0）、句式面计数型信号第二探测族、判定域分层、prose-density 尾行披露+三设防、双枚举面边界论证节 | D-004 全条, D-005 全条, D-008.5 | docs |
| T-3 | 起草 **ADR-0099「处置-证据闭合」**：§P-A defer-0089 兑现（声称登记引 row id+存在性腿）/§P-B `check_channel` 可选字段+三选一枚举+扩枚举预注册+存量黄披露/§P-C prose 三元（值+run_id+仪器口径名）+口径差黄披露+一致性腿否决记录；三节可独立修订 | D-006.1~.5 | docs |
| T-4 | 起草 **ADR-0100「可变 claim 面治理」**：append-only 常驻任务书（轮名冻结+固定名指针退化）、scoped-supersession 指针（对 ADR-0085 `claim_surfaces` fenced 收窄）+ADR-0086 countersign 通道、漂移声明注册表规范（append-only/registered_at/覆写来源 commit+恢复行原文/输入侧定位/措辞法定）、关闸条件（落地后新增条目=红）、划界句（观测时点行级事实）、双枚举面边界论证节 | D-002 全条, D-008.2/.5 | docs |
| T-5 | CONTEXT.md 词目同步：Grandiosity（虚饰输出）/Unregistered Coinage（收词分诊通道）/prose-density/漂移声明注册表（Drift-Declaration Registry）+`Jiahao-style Behavior` 第五条目 | D-004.1, D-008.7 | docs |
| T-6 | AGENTS.md 条款：声称登记须引 row id（D-006.1 prose 半边）、prose 三元括注（D-006.4）、prose-density 报告尾行约定（D-005.3/.4 含「不设目标值+不改写既有文本」）、强度档 generator 侧约定+排除域（D-003.6/.7）、审计 findings 连续编号（D-003.8） | D-003.6/.7/.8, D-005.3/.4, D-006.1/.4 | docs |
| T-7 | deferred-registry.json 落行族：#3 审查族（范围栅栏+解冻条件）、#4 scoreboard 半边、#9 宿主日落通道、#10 hook 自查清单、#2 收割器落点 owner 裁、D-004 存量分批（trigger+deadline）、D-006 存量迁移降级条件行；audit-surface 两出路 trigger 行（T-15 联动） | D-003.2/.3/.4/.9, D-004.4, D-006.3, D-007.3③ | docs |
| T-8 | **D-002 原子落地**（单 commit）：常驻任务书 append-only 改造+漂移注册表文件建立+腿 224 分类器输入改造+存量 8 行登记（`32af9b5f` 版 :45/:86 恢复行原文、覆写 commit `fa654a05`）+`fe190b65` orphan `register` 重登记+`rewrite-map.json` 收尾重生成（最后） | D-002.1~.6, D-007.1/.2 | impl |
| T-9 | prep lane 处置：`loop-handoff.md` §7/§8 落地（文末加「resolved by grill-t39 D-002」指针行）；`rewrite-map.json`/`orphan-cites.json` hunk 丢弃（后者经 T-8 `register` 重执行） | D-007.1 | impl |
| T-10 | 收词分诊器实现：词频扫描（双语、五面）+句式计数族（句长分布/构式密度/符号密写/长句占比，**只计数不评分**）→ advisory 输出清单；入 generator 侧工具面不入 verifier 腿 | D-004.3/.5, D-005.1 | impl |
| T-11 | `check_channel` schema 落地：可选字段+check-deferred.js 验证（缺失=黄非红）+存量标注+wiring test **同 commit**；存量迁移一次走（dry-run→清单→owner 确认→单 commit）或预注册降级形 | D-006.2/.3 | impl |
| T-12 | defer-0089 兑现腿：prose 声称登记的 row id 存在性检查（claim 锚 commit 内可解析） | D-006.1 | impl |
| T-13 | 文档波-实现波间衔接验收：四 ADR claim commit 各守 E-17 波序（证据 pin→派生工件→map 最后→--check 双净→declare） | D-008.3/.4 | impl |
| T-14 | owner 移交清单呈报（agent 只呈报不裁）：①pack cap 重推导（size+entryCount 同报+同 commit ADR-0039 D3）；②post-land 「波已 settle」时点；③audit-surface 两出路并列写代价（具名贴块 vs 立法部分覆盖声明）+trigger 行已备；④F-5/F-11 `review_at`+P1-9 `runner_ctx` 清单指针；⑤收割器落点两案（T-7 联动） | D-007.3/.4, D-001.4 | — |
| T-15 | 落地波验收+红窗解除核验：224 复绿实测（8 行登记被分类器消费）、map-freshness 双净、漂移注册表关闸条件旁证（无新增条目）、treadmill 不复燃核验 | D-002.4/.5, D-008.4 | impl |

## suggested skills

- `domain-modeling`（T-1~T-5 起草期——CONTEXT.md 词目对齐、ADR-FORMAT、双枚举面边界句措辞）
- `tdd`（T-8~T-12 实现期——pinning/fixture 先行；224 分类器输入改造须有回红/复绿双侧 fixture）
- `grilling`（落地期出新悬案——单题烤透不批量拍脑袋）
- `neat-freak`（落地波知识收尾）
- `code-review`（T-8 原子 commit 前——核对落地集=意图集）

## 范围外声明（勿做）

- pack cap 签署、post-land 时点判定、audit-surface 出路选择、`check_channel` editorial/fenced 分类、收割器落点选型=**owner 裁量**，agent 只备材料（D-001.4, D-003.2, D-006.2, D-007.3）
- verifier 侧强度档 / runtime role detection（D-003.6 否决）
- summary==legs 一致性腿（D-006.4 本轮否决，挂 defer-0091 同 anchor）
- 上游基准数字引用为 jiahao 有效性证据（D-003.10 立法禁则）
- t23/t27/t28/t36 残留、`docs/adr/0094` status 行、`test/post-land-sentinel.test.js` 未跟踪文件（他人/他轮在制品）

## 实现期登记缺口（先测后写）

- 收词分诊器三轴判据的「承重语义」轴机器化判形（D-004 显式留实现期裁）
- 存量 ~190 次未注册词分批注册的成本实测（D-004.4 预注册降级条件兜底）
- 90+ deferred 行补 `check_channel` 的成本实测（D-006.3 预注册降级条件兜底）
- 上游 `benchmarks/results/` safe 轴明细与 issue #126 一手补读（D-003 缺口）
- 句式计数器的中文分句规则实测（D-005 计数器须确定性产出）
