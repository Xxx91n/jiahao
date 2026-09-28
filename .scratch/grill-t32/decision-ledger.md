# grill-t32 decision ledger

Round object: TBD (D-001 will fix it; inputs = V7 critique residuals + t31 carry-over set).
Anti-loss rule: every confirmed substantive conclusion appends a record here before further descent.

## Records

## D-001 — 轮对象：D-011 rewrite-map 分类器契约单对象轮（α′）

- **原问题**: 下一轮按 (A) D-011 分类器契约单对象轮 / (B) D-011+claim-duplicated 双对象轮 / (C) 含 settle-window 腿和 advisory 批的广清扫轮组织，哪种划分方法论上最健全？
- **原回答原文**: 「采纳」（α′ 单对象轮）
- **规范化需求**:
  (i) 轮对象唯一：rewrite-map 分类器契约——(b) 按已声明结构性事实集分类+volatile 可达性降 qualifier、(a) errata 注册表作分类输入发稳定终态类、(c) 新 prose 裸 SHA 直引软约束——三者是一个原子契约变更，同轮落地不拆开；
  (ii) D-011 五隐患纳入本轮设计域：errata key 物化（intrinsic 内容哈希+摘要非裸 SHA）、errata 双职分离（披露文档 vs 分类输入）、孤儿可达时快照+successor 对应物化进 append-only 记录、复活升级规则（append-only 加新条目不改旧类）、change-id 预留首日存续契约；
  (iii) 显式排除清单：claim-duplicated 边界裁决（维持 repair2-report「判定为不修」登记，理由：解耦实测确认+无真实纠偏需求+修法属 ADR-0088 面属另一规范面）、settle-window 腿、bypass hardening（等真实 bypass 数据）、polygraph appendix、trial-results disposition（等 owner 回报）、advisory leftovers 批（t33 修复轮）、全部 owner-side 项（tag push/2026-12-15 tide 裁决/ratchet-brake 采纳）。
- **显式约束/负向需求**:
  - 禁把等待外部输入项挂进轮内——轮必须结构可闭合；
  - 禁把 owner-side 项当作本轮交付——agent 只建机制不代行；
  - 调研条件条款已实测失效：claim-duplicated 与分类器零共享代码/测试基建/lib，(B) 的合并理由不成立；
  - (c) 只做软约束——硬禁裸 SHA 直引会把披露完整性与链接稳定性两个正交目标绑死。
- **状态**: current

## D-002 — 分类契约：四事实输入 + qualifier 分层 + 存在性时间戳护栏（α′）

- **原问题**: rewrite-map 分类器按哪种分类基底重构最健全——α′ 四声明事实+qualifier 分层 / β 纯登记制 / γ ref 拓扑钉快照？对象存在性作输入是否有残余隐患？qualifier 与分类列分离有何先例？
- **原回答原文**: 「采纳」（α′ 并采纳调研修正）
- **规范化需求**:
  (i) 分类输入四事实={map 自有 pair/removed 表 + pinned published_tip 祖先集 + cat-file -e 对象存在 + orphan registry 成员}；--all/oldRefs 派生的 ref 拓扑集退出分类路径；
  (ii) 类目集：rewritten/published-unchanged 不动；local-only 系重构——old-side removed=removed 表命中、local commit/local object=存在性判定、pre-purge object 消亡为 qualifier；新增终态类 orphaned-cite；unresolved hex literal 收窄=对象不在库且未登记（真死引用仍红，fail-closed 保持）；
  (iii) 存在性时间戳化：写 exists_at + 对象 mtime + reachable_via 进 qualifier 列（照写照显不判）；--check 对超合理 gc 窗口的 local object 出黄/UNVERIFIABLE 语义（ADR-0040 三态复用），真死引用红；
  (iv) orphan registry 条目 schema 至少含 {sha, reason, registered_at, carried_log, 内容快照/successor 对应}；
  (v) qualifier 列记对象 type/size——防恶意植入孤儿被洗白为正常类的人审面。
- **显式约束/负向需求**:
  - 禁 ref 拓扑进分类路径——reachable_via 是只写不判字段；
  - 禁分类依赖 I/O 快照——分类函数对声明事实集为纯函数；
  - 黄降级只对「超 gc 窗口的 local object」——对象不在库且未登记仍硬红，登记是唯一出口；
  - registry 条目须带 reason+registered_at 防 append-only 失控膨胀。
- **状态**: current

## D-003 — orphan registry：独立 append-only JSON + 显式 register 动词 + 双职分离（α′）

- **原问题**: orphan registry 的居所、条目 schema、写入通道如何设计——α 独立工件+显式动词+双职分离 / β 复用 expires_at 豁免通道 / γ 人读文档内嵌机读块？schema 先例、职责分离、successor 验证、被低估风险各为何？
- **原回答原文**: 「采纳」（α′ 并采纳全部调研精化）
- **规范化需求**:
  (i) 居所=docs/governance/orphan-cites.json，独立 append-only JSON（与 map 派生工件结构性分离——regen 不覆盖手写登记）；首日以 fenced 类注册进 ADR-0086 field_governance.classification（被分类器消费=语义承载面）；
  (ii) 单一条目类型+纯声明字段（Rekor v1 十类型爆炸教训）；只登记终态断言不登记事件流（event-sourcing 诱惑拒绝）；
  (iii) schema：{cited_sha, object_type, size, snapshot:{subject,author,committer_ts,parents}, last_reachable_via, successor_sha|null, cite_locations[], registered_at, reason, carried_log[], object_purged_at?}；object_purged_at 为追加式观察字段——登记孤儿被 gc 物理删除后条目仍在但 cat-file 失败，审计不误报；
  (iv) 写入=显式动词 orphan-cites.js register <sha> [--successor <sha>]——登记前机器验证：successor 在库可达 + snapshot 字段与 successor 对象一致性比对（snapshot 是引用快照非身份保证，验证前置非事后审）；可选 --replace-ref 物化 refs/replace/；
  (v) 复活规则预定义：同 cited_sha 多条目按 registered_at 最新裁决，旧条目留历史（CT SCT 去重对偶）；
  (vi) 双职分离：registry=机读分类输入面；ERRATA.md=人读披露面；两通道独立演化；
  (vii) 触发点：reachable_via 转空且对象在库时物化登记（post-restack ritual/E-19 settled-tree 流程挂点）。
- **显式约束/负向需求**:
  - 分类器永不写 registry（NIST AU-9：产生被审计事实的一方不得写审计记录）；
  - 禁复用 errata_exemptions/expires_at 通道——豁免是政策性判断，登记是历史性事实，混并=政策可争议性传染事实可信度+TTL 到期退化回 unresolved；
  - 禁 ERRATA.md 内嵌机读块——散文修订可静默破坏解析，声明不可验证（Rekor v2 删 search API 同构）；
  - 若物化 refs/replace/：分类器读对象必须 GIT_NO_REPLACE_OBJECTS=1 隔离，防 replace 语义把易变性从侧门带回；
  - schema 禁塞旁路语义（临时豁免等）——单一终态断言类型。
- **状态**: current

## D-004 — 生命周期与 --check 语义：三段升级梯 + 比对域豁免 + 显式 backfill（α′）

- **原问题**: orphan 窗口的严重度分级（α 两段制/β 硬红/γ 纯懒）、--check 比对域是否豁免 qualifier、transient 孤儿处置、历史孤儿批量迁移形态各应如何？
- **原回答原文**: 「采纳」（α′ 并采纳全部调研精化）
- **规范化需求**:
  (i) 信号三段升级梯：reachable_via=∅ 且未超龄=静默（transient 容忍，对齐 gc.pruneExpire 年龄条件）；∅ 且超龄未登记=黄/note·review 级提示「趁在库登记物化」；∅ 且超龄未登记且逾宽限期=独立 orphan-registration 腿出红（义务到期断言，与 map --check 分离——比对腿保持纯声明事实 hermetic）；对象不在库∧未登记=map --check 内 unresolved 硬红；
  (ii) --check 比对域=class/pair/resolved_to/counts；qualifier 列（exists_at/reachable_via/object_type/size）豁免相等性比对，但保留弱自洽校验（如 reachable_via 非空⟺class 断言可达——豁免相等≠豁免一致）；
  (iii) 复活：append revived 条目、registered_at 最新裁决（D-003v）；
  (iv) 迁移=orphan-cites.js backfill 显式子命令：幂等、dry-run 先报、已死对象降级登记（object_purged 标记+ERRATA 反指）；--check 发现积压只提示不代跑；
  (v) 黄转红宽限期与年龄门参数注册为可调常数（对齐 gc.pruneExpire 量级）。
- **显式约束/负向需求**:
  - 黄级必须带限期——无期限 warning 稳态=被抑制（FSE 2025/Quieting the Static 实证），限期升级而非永远 warning；
  - 禁 --check 顺带静默修复——登记动作永远显式，check 只给 run --backfill 提示；
  - 禁瞬态即罚——ref 操作中途态不红不黄，年龄门先行；
  - 义务腿与比对腿分离——「工件一致」与「义务到期」是两类断言不混跑。
- **状态**: current

## D-005 — 载体与衔接：ADR-0089 新立 + 0074 范围化承接 + 双轨采签 + 一次性 regen 迁移（α′）

- **原问题**: 新契约载体（α 立新 ADR/β 就地修订 0074/γ 仅登记）、cutover 形态（a 整体 regen/b 双版本/c 逐条迁移）、countersign 如何诚实延续？
- **原回答原文**: 「采纳」（α′ 并采纳范围化承接修正）
- **规范化需求**:
  (i) ADR-0089 新立，MADR 式结构载全契约：声明事实集/qualifier 分层/orphan registry/orphan-registration 腿+三段升级梯/backfill 显式动词/--check 比对域豁免；「被考虑选项」段收录载体三选与调研论据；
  (ii) 0074 加范围化承接注记——只钉被承接条款（分类输入面+类枚举），map 工件/append-only 纪律/完整性不变量存续；非整体 supersede；
  (iii) 采签双轨：0089 走完整 countersign 流程入队列；0074 旧签名留原文不修饰、不复制进 0089、不补签追认；
  (iv) 机械登记批：field_governance.classification 注册 orphan-cites.json 为 fenced；CLASSES enum+orphaned-cite；gates.json 新腿 orphan-registration；CONTEXT.md 只收结晶名词；wiring/suite-count 同步；
  (v) cutover：backfill 显式跑→新语义 regen 同提交→迁移 diff 为披露工件（漂移行逐条可见）+schema_version bump；
  (vi) clone 面声明 reshape：published-side 分类与 registry 一致性 clone 可全算（--published-only 验证面扩大）；existence 断言仍 maintainer-scoped。
- **显式约束/负向需求**:
  - 禁就地重写 0074 已批准语义——批准面静默换形即 V7 锐评①同类；
  - 禁复制旧 countersign 行进 0089「继承」批准；禁在 0074 补签追认新语义；
  - 禁藏 diff——迁移漂移本身是审计可见事实，不许只说「重新生成了」；
  - 禁逐条迁移/双版本共存——在线服务迁移模式不适用可再生派生工件。
- **状态**: current

## D-006 — 验收电池：真 git fixture 主干 + ~5% 故障注入窄层 + 注入式时钟（α′）

- **原问题**: 验收电池形态（α 真 git fixture/β mock git 层/γ 快照回放）与对抗件取舍？
- **原回答原文**: 「采纳」
- **规范化需求**:
  (i) fixture 经 test/helpers/git-hermetic.js 建真仓真 ref——删 ref 造真孤儿、真 gc --prune=now 造真死对象、git replace 造真 replace、partial clone 造真降级面；
  (ii) 六终态正反+registry 操作全路径（register 机验/revived 裁决/purged 降级/backfill 幂等 dry-run/--check 只提示不代跑）；
  (iii) 比对面双层：class/事实四元组逐字节 golden（禁 -u 回写，登记型工件纪律）；qualifier/时间戳走 property-matcher 或白名单弱自洽断言；
  (iv) 时钟注入：分类器+升级梯接受 now() 参数，fixture 条目带历史 registered_at——三段梯三档断言零 sleep 零 patch；
  (v) 对抗件红 6：registry 篡改检出（append-only 真义）/登记后真删→purged/截断 SHA 歧义 fail-closed/replace-ref 隔离断言/复活裁决/幂等 dry-run；外加 partial-clone 窄用例（存在性失败→降级不误报）；
  (vi) mock 仅留故障注入窄层：cat-file 非零退出/rev-list 崩溃/registry I/O 错——git 调面收敛薄 facade 才可注入；
  (vii) qualifier 漂移不红降为普通回归断言一条。
- **显式约束/负向需求**:
  - 弃 γ（快照回放建仓无收益）；竞态并发与 packfile 模糊弃（单进程不可确定性制造/测 git 非测我）；
  - 禁真 sleep 与系统时钟 patch 作为年龄门测试手段；
  - mock 不得越过故障注入边界测业务语义（git-auto-commit 失败实证）；
  - golden 禁 -u 回写（漂移须走 errata 非快照刷新）。
- **状态**: current

