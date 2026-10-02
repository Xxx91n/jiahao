# grill-t36 decision ledger

Append-only. Statuses: current | revised | stale | deferred.
Revisions keep the original record (marked revised) and add a new D-xxx.

<!-- records -->

## D-001 — t36 轮对象与构成（Q1′ 选项 a′ 采纳）

- **原问题**: t36 轮对象与范围构成——是否采纳「观察者是被观察对象的一部分——断言它」为轮对象；成员 M1 字节面等价 / M2 仪器无侵入 / M3 角色分离 claim 面 / C1 class-vs-sample 升 AGENTS.md / C2 自指命名入下 ADR / C3 371 个未提交 audit-evidence 处置 / grill-t35-impl 落地归属（入 t36 T-0 vs 轮外立即 vs 推后）。
- **我的原回答原文**: 「采纳」——即 Q1′ 选项 a′，atomcode 裁决的改良全收（d）全案。
- **规范化需求**:
  1. 轮对象原文采纳：the observer is part of the observed — assert it。
  2. ADR-0093 载体成员：M1（字节面等价=全部受跟踪文本字节扫面 + mid-file U+FEFF 入签名集 + committed ratchet baseline 防 src/** 一次性噪声把腿变 always-green）；M2（仪器无侵入，主选「比较而非覆写」；次选「忽略路径+独立断言已提交值」且独立断言必须读已提交值）；M3（角色分离=注册表枚举形，CODEOWNERS 同族，注册表自身为被断言对象）；C1（class-vs-sample 规则升 AGENTS.md 常驻证据条款）；C2（自指命名一句话：post-land-verify 块永远无法描述覆盖它的 rewrite-map，同族「commit 不含自身 sha」）。
  3. 落地轮外立即执行：grill-t35-impl 落地+推送+post_land 转绿=t35 验收证据，在 t35 账本闭环内完成，不入 t36 任何成员/T-0；t36 T-0 首轮照跑 check-post-land 于已绿树上（t35-D-004 语义不变）。
  4. C3 拆出：371 文件处置为独立 owner 裁量决议，不入 ADR-0093（实质项不得伪装机械项，t35-D-008 反向适用）。
- **显式约束/负向需求**:
  - 三处必须履行的既有义务：Δ2 声明通道×2（M1 扫面/签名集变更 + M3 枚举面变更各设 Declaration N of M，f-2 标签计数测试同步扩）；defer-0030 从属再强化（新枚举面入审计范围，否则构成对 t35-D-005 静默削弱）；M1 闭盲点后 ADR-0092 D-M1 句须同波 amendment（ADR-0083 D-003 dual-reading 禁令）。
  - M1 收尾句式克制：known instances are repaired, never closed 同形——不得宣称字节腐蚀类闭合（哥德尔残余：自断言永差一步，兜底=defer-0030 非自指断言）。
  - M2 次选形细则：忽略路径写入不得计入「波内最后 claim mutation」时戳核算（防反向 masking，t35-D-007）；忽略路径工件不入 split-form 证据计数。
  - M3 形态序：注册表枚举 > front-matter > 目录约定（目录约定=现行缺陷换装；front-matter 元数据面易腐且扩枚举面）。
  - 四红线与 owner 专属裁量表不变；公开绿仍以 corpus 刷新（2026-12-15 截止）为条件。
  - 正式否决项：「落地推后」与 t35 验收语义冲突（closeout 证据晚于 t36 spec 定稿=跨轮借用），点名反对成立。
  - 残余风险登记：M1 全扫面噪声→ratchet baseline；M3 注册表自腐→机械核对入 gate+自指声明；自指残余被误读为可修 bug→C2 明文防「修」必然漂移的数。
- **状态**: revised——成员表被 D-003 增补（+M4）；D-001 其余各款（对象原文、落地轮外处置及已执行的落地史实、C3 拆出、全部约束）保持现行，修订面仅限成员表
- **调研凭据**: atomcode run 2026-10-02（ctx source=atomcode）；信源含 OCLint dogfooding 官方文档、NetEvolve analyzer 实录、super-linter、GitHub CODEOWNERS、Unicode BOM guidance (L2/21038)、Myreen verified bootstrapping (CPP 2021)、CodeChecker 静态分析边界文献。

## D-002 — 落地残局处置（Q2′ 选项 a′ 采纳）

- **原问题**: grill-t35-impl 落地后公开 CI 仍红（209 rewrite-map-published 幻影行 / 231 post-land-sentinel 记录红块 / 196 pack-smoke 申报内 / 8 corpus UNVERIFIABLE 条件性）——处置选 a 完成落地闭环波 / b 最小公开修复（unapply docs lane 纯公开树 regen）/ c 推后作 t36 T-0 基线 / d 其他。
- **我的原回答原文**: 「采纳」——即 Q2′ 选项 a′，atomcode 裁决的 a 细化案。
- **规范化需求**:
  1. 完成落地闭环波：map regen commit 上 grill-t35-docs → 写 .scratch/grill-t35/reports/2026-10-02-landing-closeout.md（落地披露 23ca68eb + 两清单红腿 + phantom-rows 以 Documented-Decision Closure「defer+reason」登记为 t36 议题）→ 生成锚定落地 tip 的 post_land=绿新哨兵块 → map LAST 再 regen → commit → but land grill-t35-docs → check-post-land --post-only 验证。
  2. t35 closeout 在 t35 账本闭环内完整闭合；哨兵首个真实绿 post_land 块落地=仪式端到端实证。
  3. phantom-rows 仪器缺口（合并 workspace 生成的派生物描述了从未公开存在的树）本波**只登记不修复**——修复=枚举面/工具契约变更须 ADR 声明，归 t36 轮内处理；它是 t36 对象的一手活例。
- **显式约束/负向需求**:
  - closeout 工件必须命名两清单：本波消除的红（209/231）vs 存续的申报内红（196 pack-smoke + 8 corpus UNVERIFIABLE）——后者已在 §7 owner-action 居所，不得重复登记。
  - 不得宣称 t35 closeout 把公开 CI 变绿——196/corpus 存续使公开绿仍不可宣称（corpus 刷新为条件）。
  - 波序=E-17/E-19 硬序：claim 内容→电池→块入 carrier commit→派生物→map LAST→落地后 settled 树重验。
  - 哨兵红判别式入档：能被新合法块消除=设计内失效模式；须改历史才能消除=异常。231 本案=设计内失效+异常持续态叠加，closeout 记「首个绿块=本波闭环 commit」。
  - 残红分层双速：异常红当波清（修复波豁免停摆令）；申报内红登记可过夜但带 deadline+errata 通道（merge-queue 停摆先例 + lockfile/SBOM false-attestation 当下阻断先例支持）。
  - b（unapply docs lane 迁就公开树 regen）被正式否决——重演「check 验证对象≠落地对象」病根镜像 + t35 closeout 证据链分裂；c 被 D-001 显式约束第 6 条封死（落地推后=违账）。
- **状态**: current
- **调研凭据**: atomcode run 2026-10-02 batch=atomcode-t36-q2；工业先例=merge-queue 停摆学派（openclaw #87473、trunk.io 2026-04 复盘）、lockfile/SBOM 一致性学派（sbomify、npm ci --frozen-lockfile）。

## D-003 — phantom-rows 归属：M4「生成面等价」入列（对 D-001 成员表的 scope amendment）

- **原问题**: t35 落地闭环波暴露 phantom-rows——build-rewrite-map.js 在含未落地 docs lane 的合并 workspace 树上枚举引文（git ls-files 并 ls-tree HEAD），把未落地文件引文烘进落地 map（公开腿 209 检出）。归属候选：a 独立成员 M4（生成器读作用域==断言目标对象）/ b 并入 M1 泛化枚举面 / c housekeeping 立项 / d 其他。
- **我的原回答原文**: 「采纳」——即 Q3′ 选项 a′，atomcode 裁决的 M4 独立成员细化案。
- **规范化需求**:
  1. M4「生成面等价」入 ADR-0093 第四成员：生成器的读作用域必须等于其断言目标对象（D-PRE「对象由断言语境命名」原则的生成器侧延伸）。
  2. 修复方向组合：枚举面绑定断言对象为主（生成路径改走 scanDocTokensAt 式 tree-internal 形——同文件内既有两套读纪律，统一到树内形）+ 派生物携带 generated_from:{tree-ish, mode} 溯源字段为辅（buildinfo 形态，使「这 map 描述哪棵树」成 --published-only 可机器断言的自证钩子）；lane 隔离降为可选纪律不独立成方案。
  3. 账本法形态：D-001 标 revised（仅状态行，正文不动）+本记录 D-003 记增补；phantom-rows 修复义务履行的是 D-002 已登记的 defer+reason，非新开账。
  4. ADR-0093 侧：M4 独立成员小节 + 增补一条 numbered Declaration（枚举面/工具契约变更，Δ2 通道）+ f-2 标签计数测试同步扩。
- **显式约束/负向需求**:
  - 与 C2 显式划界：phantom-rows 是普通可修生成缺陷，非自指残余——C2「结构性漂移数不得修」条款禁止援引于 map 生成器。
  - 与 M1 可闭性划界：M1 钉死「repaired, never closed」（哥德尔残余）；M4 绑定断言机器可判定、可真闭——ADR-0093 行文须写明两者可闭性不同质，禁止互套句式。
  - Δ2 强制：枚举面/工具契约变更必须 ADR 内显式 Declaration，不得静默（t35-D-003）。
  - 合法性边界判据入 spec：树无绝对合法性——断言对象合法性=断言语境的函数（消费者被授权在哪个对象上判定）；pre_land 读合并树合法、map 生成读合并树非法，是同一棵树在不同断言域的边界。
  - ratchet 形态不适用：phantom-rows 是 false-positive 红腿非 always-green 噪声，M1 的 ratchet 基线机制不得移植到 M4。
  - lane 隔离生成不得作为独立修复（纪律非契约，可旁路——ADR-0083 D-C 同类）。
- **状态**: current
- **调研凭据**: atomcode run 2026-10-02 batch=atomcode-t36-q3；工业先例=Bazel hermeticity 官方文档（沙箱挡写不挡读）、beza1e1 hermetic builds 批评文、SLSA provenance v0.1（completeness.materials）、Quarkus CycloneDX（dependency vs distribution SBOM 按断言目的分清单）、reproducible-builds.org recording（buildinfo 溯源字段）、Atlassian Clover pollution protection（M2 先例）、xcover 测试对象==发布对象。信息缺口：GitHub merge-queue 文档未重开、tup/fabricate 读作用域追踪工具未深挖、SLSA v1 resolvedDependencies 未逐字核验。

## D-004 — M1「字节面等价」机制边界（Q4′ 选项 a′ 分波案采纳）

- **原问题**: M1 三机制分叉——枚举面（全量受跟踪文本 vs 定向扩容 vs 维持 caller-selected）、签名集（FEFF only vs 不可见字节族 vs 封闭集）、豁免通道与 ratchet 居所、断言腿居所与 blocking 层级。
- **我的原回答原文**: 「采纳」——即 Q4′ 选项 a′，atomcode 裁决的分波改良形：同一 ADR-0093 两条 Δ2 Declaration、实现分两波。
- **规范化需求**:
  1. 波①（Declaration 1）：闭扫面盲点——枚举面=gitattributes text 属性主判据+NUL 嗅探兜底+oversized 披露型 skip；shared lib 单实现 trackedTextFiles(root)，caller 只传 root 不得缩面；底座=git ls-files 的 index∪tree 联合；committed ratchet 基线（docs/governance/ JSON，条目型注册例外）吸收存量违规——--write 一次生成，此后每波 --check 重验证（diff 基线不覆盖基线）。
  2. 波②（Declaration 2）：签名集——mid-file U+FEFF 入集（byte 层 EF BB BF 三元组断言，不在 decoded string 层）+显式 declared widening 到 any-offset；bidi 方向控制族（U+202A-202E、U+2066-2069、U+200E/U+200F、U+061C）同 Declaration 主动收编（Trojan Source 类；本仓治理文档渲染形态即断言载体，bidi 可重排断言句式=实语义威胁）；zero-width 族/U+00A0/U+00AD 不收（双语仓合法用途违 measured 判据，留 defer-registry）；注册制开放集保留。
  3. 断言腿居所=扩现有面不开新腿：jest wiring pin 枚举正则换 trackedTextFiles()，check-post-land 子集同换，post-land-sentinel.test.js 补 FEFF/bidi 正负 fixture（byte-offset 断言延续 p-3 回归锁形）。
- **显式约束/负向需求**:
  - 收尾句式双句分离（最高危）：盲点是有限枚举的洞可「closed by declaration」；字节腐蚀类仍是「repaired, never closed」——任何合并句式违账。
  - trackedTextFiles 底座与 M4 生成面共享 ls-files 枚举——Declaration 必须显式写明共享底座与两侧消费面，否则 M4 静默受益=违 Δ2+弱化 defer-0030。
  - 三处加宽各独立 declared widening（any-offset FEFF / bidi 族 / 全量扫面），防 dual-reading（ADR-0083 D-003）。
  - ADR-0092 D-M1 声明段（55-67 行）须同波改写为已闭态——波内必做项非可延后项。
  - 新 Declaration 挂 ADR-0093 独立 N of M 计数，不动 0092 既有「1 of 3」编号（f-2 计数测试按此扩）。
  - defer-0030 从属二次重申：scripts/** 入断言面=扫描器扫自身所在目录类，自指面再扩须显式留痕。
  - 否决项：扩展名集枚举、纯嗅探枚举、路径 carve-out 豁免、code 内 allowlist、新开 gates.json 腿（可见性诉求时备选 order 232 附近腿+ADR-0076 D-B carve-out）、blocking 降 advisory、ratchet 每波重生、zero-width 族收编。
- **状态**: current
- **调研凭据**: atomcode run 2026-10-02 batch=atomcode-t36-q4；工业先例=ESLint unicode-bom/no-irregular-whitespace 双规则与 eslint#5502、UTS #55（r55-5，取代已稳定化的 UTR-36）、CVE-2021-42574/GCC -Wbidi-chars/Rust 编译器拒收、CMake 上游 pre-commit git check-attr 枚举惯例、ruff/fortitude force-exclude、readme-pairing-baseline/orphan-ancestry errata/secret-scan oversized 三本仓先例。

## D-005 — M3「角色分离 claim 面」机制形态（Q5′ 选项 a′ 加固形采纳）

- **原问题**: M3 机制分叉——角色归因通道选注册枚举/front-matter/目录分裂/文件名 token；及权威源、注册表治理类、存量回填、迁移后约束解除等子问。
- **我的原回答原文**: 「采纳」——即 Q5′ 选项 a′，atomcode 裁决的注册表加固形。
- **规范化需求**:
  1. 注册角色枚举表：committed JSON 于 docs/governance/，path 到 role 枚举 {examiner, implementer, mechanical}；check-audit-surface（229）与 check-post-land-sentinel（CLOSEOUT_RE）改消费注册表；未注册 claim 面工件=红（fail-closed 反向断言，防伪边界在消费面）；新工件与注册行同 commit。
  2. 防自贴：examiner 类行入 exception-channel 生命周期（requested_by/expires_at/owner-ratify——agent 可申请不可自证）；生效门可挂 countersign 完成（第二只眼成行生效前提）；注册行携 declared_by+落盘通道双承载面（git author/committer 同构）。
  3. 治理类字段级拆分：path→role 映射=fenced；examiner 行增删=exception-channel；_doc/source_adr/schema_version=editorial；注册表=declared-facts 面非派生物（禁加 generated_from 冒充派生）；规则变更走 Declaration、同角色行追加走 exception-channel+潮汐——两层显式分开。
  4. 存量回填：一次性 backfill commit 全量注册 implementer/mechanical（语义登记非赦免，commit-date effectiveness 不溯及）；吸 ratchet 单调性——行只增不删，删行=owner+Δ2。
  5. 迁移：regex 与注册表腿同 commit 退休（no coexistence window）；ADR-0093 编号解除句点名 ADR-0091 D-E 与 ADR-0092 D-S1 的选择器被注册表消费取代；CLAIM_RE 路径枚举保留（范围断言≠角色断言）；文件名自由恢复。
  6. 混合角色工件拆分义务写入 ADR-0093（SOC2 证据分离原则）。
  7. 注册表自身为被断言对象：新腿或并入 221 同族——每注册 path 存在树中、每 claim 面工件有行、role 值在封闭枚举内；行可 archived 不删（honest history）。
- **显式约束/负向需求**:
  - 封闭集扩容须 ADR 通道（owner 裁量决议、second_reviewer 会签记录等潜在类预登记预期），开放集无边界不得放开。
  - 否决项：front-matter 自声明（自贴标签漏洞+扩枚举面）、目录分裂（病灶换装+CLAIM_RE 硬编码迁移成本）、文件名 token 强化（t35 已证伪）、祖父豁免（229 对全历史失明+通配豁免违例）、ratchet 回填形（M3 问题是选样错误非噪声，与 M1 baseline 异质）。
  - examiner 行写权=owner 裁量（exception-channel），实施者永不持 examiner 写权。
  - defer-0030 覆盖重申：注册表=新枚举面入审计范围；examiner 工件与二方审计耦合变紧方向一致。
  - 行文划界：M1 baseline/M3 注册表/M4 生成面三者可闭性与机制不同质——防读者把 M3 backfill 误读为第三处 ratchet。
- **状态**: current
- **调研凭据**: atomcode run 2026-10-02 batch=atomcode-t36-q5；工业先例=CODEOWNERS 声明式归属+required review（GitHub 官文「注册表自身须 owner」+GitLab enableImplicitApprovals 自批准失效模式）、SLSA builder.id 与 Mini-Shai-Hulud 消费面防伪、SOC2 workpaper ownership/PBC 双轨（AU-C 分责、AICPA AU315.16）、git author/committer 双字段、ADR-0086 三类治理与 exception-channel 直接套用。

## D-006 — M2「仪器无侵入」断言形态（Q6′ 选项 a′/a+ 采纳）

- **原问题**: M2 断言层级分叉——a 点对点修 g6-publish 为 compare 形+立类断言腿（gate:all 外包装 tracked 树快照比对）；b 仅点对点修；c 改写 ignored 输出位置；d 其他。子问：快照粒度、预存脏面基线、红语义。
- **我的原回答原文**: 「采纳」——即 Q6′ 选项 a′（=调研 a+ 形）。
- **规范化需求**:
  1. 点对点修：check-g6-publish.js 覆写改 compare 形——默认路径只算不写（生成到内存/临时面与 committed 工件 diff，不一致 exit 1）+显式 --write-log 写模（与 --freeze 同族的验证/写分离双模）。
  2. 工件语义裁断：g6-publish-replay.json=派生证据日志非锁定基线（锁定基线=g6-publish-fixture.json ADR-0050 append-only）；compare 红=证据过期警报（committed 日志不再描述当前回放→显式再生+commit），非回放漂移（回放正确性归 tier a/c 对 fixture 断言）。
  3. 类断言腿：居所=run-gates.js wrapper 级 instrumentation（非 gates.json 新腿——腿结构性无法观测其他腿，观测点错位与 D-L1 同构）；逐腿 tracked-hash 检查点（每腿执行后重算，归因到腿号+文件）；快照对象=全 tracked 树（ls-files index∪tree 底座+内容 hash，与 M1 trackedTextFiles 共享枚举底座）；untracked 面天然排除；合成结果行 [- tracked-surface] PASS/FAIL 入 results 表，blocking=confirmatory 级不降 advisory。
  4. 预存脏面处理：基线在 gate:all 入口对当前工作树内容取 hash（零点=进入时状态）——断言「本次运行未变异 tracked 文件」非「树须净」；预存脏面零点原样登记，不罚不吞（与不得盲 discard 义务兼容）。
  5. 失败归因粒度=腿+文件双层（changed-path 清单不展开全量 diff）；无「合法 tracked 写入」豁免通道（合法出路=ignored 路径或 compare 形）。
- **显式约束/负向需求**:
  - Δ2 通道两处：①点对点修变更 ADR-0065 D-B.3 登记的工件契约（Persist the replay log→compare/explicit regen）——ADR-0093 numbered Declaration+gates.json 中 g6 _doc 同 commit 更新（防 gates-coupling/alignment 腿因文本失配红=修病灶红别腿的自指纠缠）；②wrapper 契约变更+与 M1 共享枚举底座的显式声明。
  - ADR-0093 须写明「本 Declaration 是 E-19 settled 树评估可满足性的前置条件」。
  - D-001 次选形条款不删（forward-only），ADR-0093 声明「M2 以主选形落地，次选形条款未被激活」。
  - 与 D-004「不开 gates.json 新腿」否决项同形不同质——观测点论证 vs 可见性论证，行文分写防混同。
  - defer-0030 重申：wrapper 断言面（全 tracked 树×门编排窗）入审计范围。
  - 当前脏 g6-publish-replay.json=R2-3 物证——处置=显式 regen commit 或随修复 commit 定稿，禁止 discard/留着悬空。
  - 残余披露：wrapper 断言窗内无变异不断言窗外——F-6「narrowing not closing」句式同构写入。
  - 实施波落点（claim 波前或随同）=owner 裁量点。
  - check-test-git-hermetic(222) 为姊妹腿先例（jest hermeticity vs 门编排 hermeticity，不同观测点互不取代）；实施波先读其内部实现再定 wrapper 形（可能可复用底座）。
- **状态**: current
- **调研凭据**: atomcode run 2026-10-02 batch=atomcode-t36-q6；工业先例=Jest --ci 不写 snapshot（jestjs.io 官方）、go generate+git diff --exit-code（Classi/mcp-go PR#258/codegen-guard，含 untracked 新文件漏检坑）、prettier --check/--write 双模、Terraform plan 只读漂移检测、lint-staged --fail-on-changes、QASkills disposable regen job 分离纪律。信息缺口：check-test-git-hermetic 内部未逐行读、tj-actions/verify-changed-files 未重开、Go 官方对惯例沉默。

## D-007 — 顺带项 C1/C2 居所与形态（Q7′ 双 a 采纳）

- **原问题**: C1 class-vs-sample 常驻条款居所（AGENTS.md bullet vs 独立小节）；C2 自指失明注记载体（ADR-0093 限制段 vs CONTEXT.md 新词）。
- **我的原回答原文**: 「采纳」——即 Q7′ 双 a 形。
- **规范化需求**:
  1. C1：AGENTS.md Working agreement 段新增 bullet，位置=t34 audit-coverage 条款之后（证据簇第二位）。句式含机械义务半句「name the enumeration surface or register the residual」（ISA 530/PCAOB AS 2315 原型：结论只准外推到被命名 population）+双句分离纪律（有限枚举洞 closed by declaration / 开放字节类 repaired never closed）+精确复盘指针（t35 report 的 three-instances-same-shape 段，不写四轮都有此根）+「暂不机械化，机械化须走 Δ2/Declaration」声明+bare-SHA 软约束先例同型+cross-ref Evidence-Tiered Readiness。
  2. C2：注记入 ADR-0093 已知限制段——「post-land-verify 块永远无法描述覆盖它的 rewrite-map，同族于 commit 不能含自身 sha」；显式边界重申（仅及块↔map 这一对，M4 生成器缺陷可修必修——D-003 划界防反套）；限制段末写 forward pointer（出现第二个自覆盖实例时方考虑升 CONTEXT 词条）。
- **显式约束/负向需求**:
  - C1 禁止纯口号形（无枚举面义务半句则成下一位执行者的 oracle 歧义=R2-1/R2-2 复发形状）。
  - C2 禁止词条化（去语境正典化放大误读为可修 bug=D-001 已点名的 C2 防面）；仓史先例全部在 ADR 限制段（sentinel 从属/TSA 披露/F-6 收窄无一词条化）。
  - 此刻改提小节形/词条形构成对 D-001 的静默偏离，须走账本修订不得直接改文件绕账。
- **状态**: current
- **调研凭据**: atomcode run 2026-10-02 batch=atomcode-t36-q7；工业先例=ISA 530/PCAOB AS 2315（sampling vs named population）、PCAOB 2024-06 technology-assisted analysis 全群测试纳标、Dijkstra 1969 与 Marick coverage 批评（格言层饱和证机械义务必要）、git-notes known-limitation/checksum 外置 oracle/SBOM 自 digest 降 predicate 字段。信息缺口：PCAOB 官网 403 已双源交叉、ANSI/ASQ Z1.4 未逐字核。

## D-008 — C3：audit-evidence 残渍处置（Q8′ 选项 a′ 采纳）

- **原问题**: .scratch/grill-t13..t35 下 audit*-evidence 目录 ~316 个未跟踪捕获文件的处置——a .gitignore 收编 / b 提交 / c 删除 / d 树外归档 / e 注册 mechanical 面。核心溯源问：这些文件本质为何产生。
- **我的原回答原文**: 「采纳」——即 Q8′ 选项 a′ 加固形。
- **溯源结论**（子代理取证，父代复核暂存态/提交史/gitignore 现状）: 审计窗用 capture.cjs/capture-battery.cjs（spawnSync+writeFileSync）逐字落盘命令输出；never-commit=刻意治理非遗漏——双动因=内容毒性（patch 携带触发 secret-scan/doc-hygiene 的 fixture 字节）+真实事故（裸 but commit 扫入 1c58786 推上 origin→owner 批准 force-push→2026-09-23 ADR-0083 注册 nc-001 正则 ^.scratch/[^/]+/auditd*-evidence/，adr-0083-wiring LEGACY 闭集机械化）。盘上 ~316 件（371 数为 GitButler status 行计数失真）；零 staged；t35 池报告宣称 61 实存 3=已自发塌陷。
- **规范化需求**:
  1. .gitignore 收编 .scratch/*/audit*-evidence/（覆盖 audit-evidence/audit2/audit3，t22 拓宽正则同族）+ .scratch/*/audit-backup/（同台残渍）——never-commit 约定机械化，status/diff 噪声清零且通道级防误提交。
  2. nc-001 reason/AGENTS.md 补「ignored-by-design」叙事句（约定语义=never committed 非必须可见）。
  3. 4 件 tracked LEGACY（t12 round-commits/round-diff、t13 reverify json、t15 audit-report）保持——gitignore 对已跟踪文件构造性不生效，adr-0074-wiring 运行时仍可读。
  4. t35 池 61→3 缺失如实写入 t36 closeout 披露面。
  5. .scratch/grill-t6/audit/b7ccbeb/ 整仓快照单列登记为独立残渍类（非 nc 覆盖，jest-haste-map 命名冲突史=真实污染旁证），不并入本 pattern。
  6. 本项为 owner 裁量项（D-001 拆出登记）——处置经本记录生效。
- **显式约束/负向需求**:
  - 否决 b（提交）：违 nc-001+t28 D-003+t31 D-006；adr-0083-wiring LEGACY 断言即红；patch 毒性原始动因仍在。
  - 否决 e（注册 mechanical）：audit-evidence=examiner 产物非 claim 面，与 D-005 role 注册表职责界冲突。
  - c（直接删除）留作 owner 备选未采纳：机械安全（零 gate 依赖）但不可逆，部分捕获绑定不可重现树态（t31 orphan-decay、t33 preamend map）；~120 处 tracked 文档 path/count 指针成死引。
  - 残余披露：ignored≠保护——clean 型命令仍可误杀证据面；未来审计新写证据不再现于 status（clean-tree 负向判定不受影响已核）。
  - 邻近残渍 ref-assets(3)=nc-004 已注册不动；gen-docs.template.cjs、atomcode-q1-out.txt 不属本项。
- **状态**: current
- **调研凭据**: 子代理取证 run（只读，agent_id 1be3834c）2026-10-02；一手锚点=never-commit.json:6-11、adr-0083-wiring.test.js:115-148、adr-0085-wiring.test.js:131-141、AGENTS.md:53、t14 audit-passed handoff L70-78（force-push 事故）、t22 ledger L18/27（正则拓宽）、t28 ledger D-003（居所复位）、t34 report L123-128（amend 事故）、t35 r4 report L87（61 宣称 vs 3 实存）。

## D-009 — owner 裁量面处置（Q9′ 三项全按裁决采纳）

- **原问题**: t35 遗留三 owner 裁量项——(a) pack-cap 修订（实测 476,450 超注册 470,000，派生候选 530,000）；(b) corpus tarball 刷新（mr-probes.jsonl 缺席密件，deadline 2026-12-15）；(c) spec §9「四处显式声明」vs ADR-0092 三编号标签的文义歧义。
- **我的原回答原文**: 「采纳」——即 Q9′ 三项全按裁决。
- **规范化需求**:
  1. (a) 现裁：owner 批准修订 ADR（独立成文不入 ADR-0093，照 ADR-0082 骨架：政策节先于值节=text order=time order；npm pack --dry-run 的 size 字段测量协议钉死；ceil_to_10_000(476,450*1.10)=530,000；D-D 显式声明不追认 476,450 与此前超帽读数=repaired history not excused measurement；second_reviewer 槽 OPEN+新 defer-id、review_at 骑 2026-12-15 潮汐——owner 现批不必等会签，ADR-0066/0082 accept-now-countersign-later 先例）；修订只改 ADR-0039 D3 字面量，不另设常数。
  2. (b) 维持注册 deadline 不改注册——执行时点是 owner 自由非裁决分支；owner-action 清单加非约束句「earlier refresh welcome; deadline unchanged」；若提前刷新落地，条件解除须凭据显式登记（新 tarball+manifest 对上），agent 不得推断解除。
  3. (c) 裁定=四主题三标签：spec §9 的「四处显式声明」是四个斜杠列举主题非编号标签计数——ADR-0092 D-M2 审计注记为在先同题裁定（defer-0030 从属强化是 D-M2 内散文非第四标签）；f-4 一行 editorial erratum 修订 spec 措辞对齐在先裁定，引注记为据防 dual-reading。
- **显式约束/负向需求**:
  - 修订≠公开绿：196 转绿后 8 条 corpus UNVERIFIABLE 仍封锁公开绿宣称——任何把 cap 修订表述为恢复公开绿的行文违 D-001。
  - 裁「四标签」被拒：与 D-004（新 Declaration 挂 0093 独立 N of M、不动 0092 既有 1 of 3）正面冲突。
  - cap 修订 ADR 不得折入 ADR-0093 主体（独立小 ADR 先例 0066/0071/0082 各约百行）。
  - corpus 密件刷新=owner-only 动作，agent 只报告状态；deadline=上限非排程（NIST 800-63B 风险基轮换同构）。
  - 无对冲机制的维持红被否决：t35 未注册 armed-band watch，维持=红腿裸挂无触发器（补注册比直接裁更贵）。
- **状态**: current
- **调研凭据**: atomcode run 2026-10-02 batch=atomcode-t36-q9；一手锚点=ADR-0062 D-A 修订政策前置逐项核验表、ADR-0082 D-D/D-E 先例、ADR-0092 D-M2 审计注记原文、t35 报告 R2-5 六测量表；工业先例=RFC errata Verified 级（枚举体控散文总结）、NIST 800-63B 轮换上限语义、IESG errata 分态。
