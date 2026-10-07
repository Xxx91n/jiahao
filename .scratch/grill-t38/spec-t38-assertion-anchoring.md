# spec-t38-assertion-anchoring — grill-t38 裁决合并稿（唯一数据源：decision-ledger.md）

> 数据源纪律：本文每条括注 D-xxx 出处；账本未载结论不入此文。日期一律绝对日期（2026-10-06 起草）。

## S-0 载体
- 主载体：**ADR-0096**（新立，不 amend 0091/0092/0093——跨 force-field 分节原则；§P-1 发射侧 / §P-2 测试面 / §N-3 emit 契约，每节可独立修订）（D-001.12, t37-D-006 bundling 防线）。
- 关联载体：ADR-0095（t37 轮契约，含 D-006 结转登记内容）；AGENTS.md E-19 注记级修订（docs lane）（D-001.6）。

## S-1 轮对象与裁定
- 轮对象=断言锚定（assertion-anchoring）：每个对树态的 committed claim 必须声明评测锚，核验机制按所声明的锚而非当下世界判定（D-001.1）。
- 本体论=双时制：valid-time=所测树（锚）、transaction-time=载体 commit；载体移树不构成说谎，声称锚与实际测量锚不符才是缺陷（D-001.1）。
- P-1=claim 面缺锚；P-2=测试面缺锚；同缺陷形两投影合并为「评测锚」主命题（D-001.2）。

## S-2 统一锚字段契约
- `anchor={tree_sha, ref_context, mode}`（additive v1.1）（D-001.3）。
- ref_context 枚举：{lane-tip, merge-base, origin/main, workspace-merge, **live-set**}（live-set 由 D-003.7 additive 增值）。
- mode 枚举闭集：{tree-internal read, working-tree read}（ADR-0093 D-6 双字段纪律：哪棵树≠哪种读法；D-001.3/D-004.3）。
- 两类锚划界句（ADR 必须显式写）：tip 锚（map coverage、pairing scan——authority 语义对 tip 求值）vs 快照锚（status-inventory 块、run 证据——historical claim 语义）；防「全锚化=可不追 tip」误读（D-001.4）。
- L-1 同族自指边界：块不得描述覆盖其自身载体的树——锚命名被测树，报告落地在 claim 之外（D-001.13）。

## S-3 消费契约（断言腿）
- 双断言分离：①成员对账域=块 rows == **块自身 run_id 工件的锚树** complete 成员集（转录忠实性，真伪域）；②新鲜度独立断言=(anchor, carrier.parent] 区间无 claim-surface 突变+锚须为载体 parent 祖先（日期域）（D-002.1/.2/.5）。
- 工件选择权威=块自身 run_id 工件；同树他 run 工件=漂移观测面（黄级 diff 披露非红）；prefer-HEAD 废除出断言域（D-002）。
- 分类器居所：`lastClaimMutation` 从 check-post-land.js 提升 shared/ 一实现两调用方（D-M1）；嵌断言腿内非独立 wave-close 腿（D-002）。
- 载体未定降级：区间上界退化 HEAD@run+披露降级+E-19 兜底（D-002.7 形）；restack 锚失解析=黄级非红（D-002.7）。
- 锚工件不可用/不完整→`UNVERIFIABLE`（exit 2 诚实通道），非红非绿（D-002.5）。
- 新鲜度红 verdict 级不入 C-1 行级闭集（ADR-0096 节内显式）（D-002.8）。
- v1 覆盖面：只 status-inventory；audit-coverage/post-land-verify 锚定收编=下一轮独立枚举面挂 deferred（D-002.4 a3）。

## S-4 发射侧契约（块字段）
- 块 append `anchor:{tree_sha,ref_context,mode}` 字段（additive v1.1）；run_id 保留寻址职能（D-004.1）。
- **双权威源消歧三规则**：①anchor.tree_sha=锚权威、run_id=寻址权威，消费腿禁从 run_id 反解树做锚判定；②anchor.tree_sha≠run_id 第二段→FAIL `anchor_run_id_tree_mismatch`；③注册 commit 前旧块走 legacy run_id 路径+::warning 黄级，注册后缺 anchor=malformed（D-004.2）。
- dirty 语义：mode=working-tree read 诚实命名「锚指血统 commit、rows 测该 commit 之上工作树」；dirty 度记 runner_ctx 禁入 mode 枚举（D-004.3）。
- ref_context=观测上下文记录（发射时 HEAD 解析实体名），**非判定输入**——评测域仍 D-003 集合锚（D-004.4）。
- prose 中间形：承载机械可判数值的 prose 句 MUST 括注 run_id 回指；叙述句不承重；括注存在性机械兜底挂 deferred（D-004.5）。
- 对账对象=anchor.tree_sha+run_id 联合指认（D-004.7 承接 D-002.5）。

## S-5 P-2 集合锚
- 评测锚=评测时点可解析的 refs/heads/* ∪ refs/gitbutler/* 活分支集合；pin 须为任一有分子支祖先；workspace merge commit 结构性排除（D-003.1）。
- 实现=orphanAncestry 共享实现内默认值改向（显式传 ref 尊重=fixture 逃生舱；缺省派生集合）；live 调用点全集四处：check-orphan-ancestry.js、check-classification-consistency.js、adr-0085-wiring.test.js、adr-0086-wiring.test.js（D-003.2）。
- 树读/lineage 双 ref 分离：lastSealRecord 树读保持 HEAD/workspace_ref，lineage 评测用集合（D-003.3）。
- 集合空/不可解析→UNVERIFIABLE（D-003.4）。
- 残留窗（churn-during-apply）=仪器瞬态黄级披露；预注册重开条件=同 tree_sha 连续 N 次门检残留红超阈值→errata 题重开（D-003.6，deferred 行载体）。
- ADR-0085「ancestor of HEAD」精化句入 §P-2：standing leg 对锚集合求值、claim-point 处 HEAD 语义不变（D-003.8）。
- 失效模式：F-α 死 lane 假绿（收窄升级路径预登记）；F-β→.6；F-γ 对象缺失=pre-existing 披露（D-003.9）。

## S-6 N-3 emit 契约
- emit 直打完整可贴块（`<!-- audit-coverage v1 -->`+json fence+裸数组）；extractCoverage 零变更（D-005.1）。
- advisories 独立 `--advisories` 子命令+持久文件权威源（D-005.2）。
- 立法句「emit 输出形即注册契约，改形走 Declaration」+co-signs 界限句「标记与 fence=块语法载体非 claim 内容；generator never co-signs 界限于 result truth」（D-005.3）。
- 回环 pinning test 并入既有 test/audit-checklist.test.js 或 audit-surface.test.js：emit stdout→extractCoverage 必绿（D-005.4）。
- 同 commit 义务：emit 改形+test+ADR 节+_doc/AGENTS.md 措辞同步单 commit（D-005.5）。
- 零历史追溯：已提交块全裸数组（t34/t36/t37 实测）（D-005.6）。

## S-7 生效语义与过渡
- forward-only：锚定自注册 commit 生效不追溯定罪；锚字段 MUST 非后补；stale-但-锚正确=带日期 claim 非谎言（D-001.8）。
- 旧块过渡：firstCommitMs 版本判定（非运行时逃生舱）；旧载体改写重渲染即升级（F-1 棘轮）（D-004.6）。

## S-8 deferred 登记清单（落地波 T-9 落盘到 docs/deferred-registry.json）
| 行 | trigger | review_at | 出处 |
|---|---|---|---|
| N-4 落地通道契约义务 | deadline+§9 事实引用；选型=owner act | 落地波后 | D-001.11 |
| HEAD-绑 live-eval 测试全量枚举 | 历史枚举形划界句已入 ADR | 下轮 | D-003.5 |
| 残留窗实测 | 同 tree_sha 连续 N 次残留红→errata 重开 | 实现期首测 | D-003.6 |
| prose 括注存在性机械兜底（M-D 第 4 类候选） | 括注退化实证 | 下轮 | D-004.5 |
| F-5 run_id 矩阵维（只登记实现缺口+注释过度声明，禁再立法） | 任一 workflow 出现 matrix: | 2026-04-30 | D-006.1/.6 |
| F-11 mismatch 预计算 | 首个真实 declared-vs-inferred mismatch 病例或 gate 电池超时（与 t37-D-003.7 同 anchor） | 2026-04-30 | D-006.1 |

## S-9 结转分诊登记项（ADR-0095 起草内容——登记=载体+设计双交付）
- source_adr=单值指 ADR-0095+0095 正文声明「status-inventory 腿权威源=0095+0096」；数组扩形本轮禁走（fenced 字段须 countersign）；重开条件=第三共权威 ADR 或逐权威 content-anchor 机校（D-006.2）。
- 同 commit 普遍条款：「立法文本段落与其所治理的机制/值同 commit 落地；分离=该机制该 commit 内不得 blocking」——涵盖 ADR-0027 D2(b)/D-005.5/F-9（D-006.3）。
- F-6 s2 域谓词边界、F-8 identity 谓词精化句（引用 t37-D-005.5 非改写）写入 ADR-0095 §M-D（D-006.1/.4）。
- F-10 活违规消解：contract-vocab 基座扩宽登记（理由+剩余域残量），不追溯定罪只补注册（D-006.5）。

## S-10 否决项与失效模式（合并账本各 NEG）
- 否决项汇总：P-2 errata 执照/流程-only/merge-base 单锚/单一瞬态 ref/run_id 隐式锚/双写冗余/合成 measurement commit/dirty=UNVERIFIABLE/消费腿放宽收对象/emit 裸数组半截修复/emit 自测/伪居所新 test 文件/source_adr 数组本轮走（账本各 NEG 段逐字承接）。
- 锚定防逃生舱三件套：forward-only+MUST 非后补+棘轮显式重落（D-001.NEG）。
- 失效模式登记：D-003.9（F-α/β/γ）、D-004.8（F-1~F-6）、D-005.8（F-emit-1~4）原文承接。
- 先例引用纪律：Prometheus staleness、审计 as-of/dual-dating 引用标 analogy（类比级非同构级）；ACCA/AICPA 双日期层标二手位（D-001.NEG/D-006.NEG）。

## S-11 修订承接链（Declaration 通道逐条）
- t37-D-005 revised：比较域改「所声明锚树重推导」（D-001.5）。
- AGENTS.md E-19 注记级修订：tip 锚面不变、快照锚面改「确认锚断言成立」（D-001.6）。
- D-001.9 单常量→D-003.7 集合形承接（原文保留）；D-001.10 裸数组→D-005.7 完整块承接（fence 内容层义务不变）（D-003.7/D-005.7）。
- ADR-0085「ancestor of HEAD」精化句（D-003.8）；ADR-0091 D-E emit 契约精化（D-005.3）；D-002.5 联合指认精化（D-004.7）。

## S-12 实现期登记缺口（诚实自报，起草期→实现期裁决点）
- GitButler ref_context/lane ref 取值在 restack 抖动下稳定性未实测（D-001.NEG/D-004.NEG/D-006.NEG 同源缺口）。
- 锚树重推导成本未实测（若超 CI 预算需分层：gates 腿锚处重推导+test 腿仅锚校验）（D-001.NEG）。
- D-005 遗留 dirty-树重推导语义在锚定下原样移植未立法（D-001.NEG）。
- pack cap entryCount 未随报（owner 重推导前须补）（D-006.NEG）。
- F-9 泛化句可判性起草期实测（D-006.NEG）。