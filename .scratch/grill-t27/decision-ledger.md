# grill-t27 decision ledger

数据源纪律：本文件为 grill 结论唯一载体。

## D-001 — 轮对象：窄轮 + 审计残留清扫（b）

- **原问题**: Q1 — 轮对象确认：t27 边界取形。a 按既定窄轮（6 腿分诊+defer-0070 销账+收敛成本首测）/ b a+t26 审计 judgement-call 残留清扫 / c a+泛化监控机制层（激活 defer-0071）/ d 其他。
- **原回答原文**: 「b」
- **规范化需求**: grill-t27 = CI 红腿分诊轮——处置公开克隆宇宙残余 6 腿（gate-all 4 腿 corpus-leak/corpus-freshness/corpus-classes/mr-probes 共享根因 JIAHAO_CORPUS_DIR 指向不存在目录；test 2 腿 sentinel-ownership D2b inode 断言 + adr-0079-wiring D5 npm-cli 路径解析）+ defer-0070 于首个绿 origin/main run 销账（记 run id）+ ADR-0085 双层语义收敛成本首燃实测（waves-per-round vs t25 20+ 基线，记入本轮账本）+ t26 审计 judgement-call 残留清扫（provenance 逐字孪生腿、装饰性面、identifier nits——如实记为相对审计交接既定窄轮的扩 scope）。
- **显式约束/负向需求**:
  - human-only 项不入 scope：renew-or-expire 模板事件、countersign 队列 forced-binary×10、ratchet-brake charter 条款、t25 seal/tag drift 裁决——全部已注册 return-by 2026-12-15 tide
  - 不激活 defer-0071 泛化监控（既定策略=等同型违规重复再建）
  - 本轮为 fix 轮性质（ADR-0078 披露义务适用）；预计零新 ADR——破"每轮 1 ADR"棘轮形态与 V6 ⑤ 同向
- **状态**: current

## D-002 — corpus 腿处置：secret 刷新 + manifest 校验 + 原子解包 + 警报升级（a′）

- **原问题**: Q2′ — corpus 4 门（corpus-leak/corpus-freshness/corpus-classes/mr-probes）在公开 CI 失败的处置取形。a′ secret 刷新+manifest 校验+原子解包+警报升级 / b 仅刷新 secret / c 永久 UNVERIFIABLE / d 其他。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**:
  (i) secret 刷新=human 执行——agent 备好 `private/bench-corpus/` 全量 tarball（含 mr-probes.jsonl）+ `gh secret set JIAHAO_BENCH_CORPUS_B64` 命令，写密文动作留 owner；
  (ii) 公开侧 repo 放 corpus manifest（文件名清单+sha256/计数，**语料内容不进 git**——ADR-0036 D2 不冲突，进 git 的是清单）；restore step 解包→对 manifest 校验→不符则**删目录**→capability 探针判 absent→四门 UNVERIFIABLE（exit 2 非阻断）+ `::error` 级注解（可见非静默）；
  (iii) 解包原子化：临时目录→manifest 校验通过→`mv` 就位（防半途失败留半拉目录再造 present-but-incomplete）；
  (iv) 台账登记复查触发器——UNVERIFIABLE 连续 N run 升级为 fail（防降级被日常性吞掉，R1）；base64 tarball→OIDC 受控通道记 deferred-registry（R3，不本轮做）；
  (v) O3 分族降级（按语料族粒度）冻结为未来 ADR 修订话题，本轮不动。
- **显式约束/负向需求**:
  - capability 探针分工不动（ADR-0040 D2：探针只判存在性，文件名/指纹归各门）——修复落在 restore step 原子性+完整性（C1）
  - 降级必须伴随警报（Sigstore explode-timestamp 教训）——UNVERIFIABLE 不许静默吞掉刷新信号
  - manifest 期望态版本化进 git（GitOps declarative+versioned 模型），语料加族=改公开 manifest 走正常 PR——禁硬编码文件集清单进 restore step（b 方案同根因复发）
  - c 否决理由记档：永久 UNVERIFIABLE=无复查期豁免单，且把"语料陈旧"检测信号连同失败一起扔出公开宇宙
- **状态**: current

## D-003 — 规范载体：零 ADR，fix 披露三通道 + 触发器台账行预注册升级钩（α′）

- **原问题**: Q3′ — "部分语料→显式降级+复查触发"新行为的规范载体：α 零 ADR 走 fix 披露+registry 行 / β 立小 ADR-0086 / γ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**: 本轮零新 ADR。披露三通道：(i) trend-inventory `kind:fix` 行 + `governance_tooling_diff`（reason 首行逐字引 ADR-0040/0061 D-F 锚条文：deterministic negative→exit 2 UNVERIFIABLE, stale/partial corpus restore degrades honestly）；(ii) deferred-registry 台账行载复查触发器「UNVERIFIABLE 连续 N run→升级 fail」，行内**预注册升级钩**：该触发器首次真实触发→按 ADR-0061 同款程序补立修订 ADR（决策留到决策发生时）；(iii) base64→OIDC 受控通道另行 deferred 登记（D-002 项 iv）。
- **显式约束/负向需求**:
  - 定性锚：FAIL→UNVERIFIABLE = 已注册语义（ADR-0040/0061 D-F + 0084 capability 契约）的**违约实例修复**，patch 级非语义变更——锚条文在披露行逐字引用
  - retroactive ADR 禁止：为既有契约重立档=空壳 ADR（无被排除备选、无难逆承诺）
  - 零新 ADR 如实记为反棘轮实证（V6 ⑤"每轮 1 ADR"形态的对照数据点），非为破而破——若本轮后续出现真语义变更则如实立 ADR 不硬撑
- **状态**: current

## D-004 — test 两腿修复形态：rename-over + node+npmCli 双布局探测（a′）

- **原问题**: Q4′ — sentinel-ownership D2b 与 adr-0079-wiring D5 的修复形态。a′ rename-over+node+npmCli / b 另指形态 / c 某腿 degrade。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**:
  - D2b：写临时名文件→`fs.rename` 覆盖目标路径复现"同名新 inode 植入"——POSIX rename(2) 原子替换语义保证新 inode（临时文件创建时已持并存 inode，不赌 ext4 分配器）；Windows 上映射 MoveFileEx(REPLACE_EXISTING) 同效——跨平台双稳，且比 unlink+create（有路径不存在窗口）更忠实于并行植入场景。断言本体（sameFile(s0,s1)===false）与 src/sentinel.js 机制零改动。
  - D5：`spawnSync(process.execPath, [npmCli, 'pack', '--dry-run'])`——npmCli 双布局探测（`dirname(execPath)/node_modules/npm/bin/npm-cli.js` Windows 布局 + `dirname(execPath)/../lib/node_modules/npm/bin/npm-cli.js` Unix 布局）+ PATH spawn 兜底；断言本体（files 白名单+tarball 无 zh-CN 行）零改动。
- **显式约束/负向需求**:
  - 否决 degrade-to-skip 与放宽断言：两腿被测原语在 Linux 上工作正常（对比判据=cowork-harness 案例：原语本身在目标文件系统失效才配 LOUD skip）；坏的只是测试 setup
  - 否决裸 `spawnSync('npm.cmd')`：现代 Node（CVE-2024-27980 硬化）不带 shell 直接 EINVAL；不用 `spawn+shell:true+args数组`（DEP0190 弃用）
  - 两腿红因定性=测试断言的平台假设错误，非机制缺陷——修测试不修机制
- **状态**: current

## D-005 — 残余范围处置：修账登记 + 终态维持 + reopen-trigger 补强（α′）

- **原问题**: Q5′ — 审计 judgement-call 残留清扫分量发现已由 t26 findings pack 提前满足的处置：α′ 修账登记+终态维持+reopen-trigger / β 指认残余 / γ 重开某条。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) D-001 清扫分量登记 `satisfied-by-bccdef06/9455aa18`（t26 findings pack），引审计 disposition 表两条目为证——原文表述不动（改状态不改表述，Jira Done/Resolved+NCR 记录保留惯例；FDA 反例：闭环不留证据引用本身是缺陷）；
  (ii) 两条 ACCEPTED-AS-IS 维持终态，各补 `reopen-trigger:` 行：cx/evd/rr 命名→『该机械面因其他理由解封』或『命名差造成实际缺陷的证据』；report evidence-index wave-1 歧义→『索引错误致声明不可验证』，届时处置=追加勘误条目指向终末波，非编辑 pinned 原文；
  (iii) 后续补正一律走追加勘误/append-only 修正记录模型，不动 pinned claim 工件与已封存机械面。
- **显式约束/负向需求**:
  - 无新信息/条件变化不得重开任何已处置发现（重开是一等转移但前置条件硬性）
  - satisfied-by 登记必须带证据引用，不许裸"已完成"
- **D-001 注记**: 清扫分量 → `satisfied-by-bccdef06/9455aa18`（处置证据=t26 审计 disposition 表）
- **状态**: current

## D-006 — 收敛成本度量：双轨 + 锚定式波定义 + 基线同口径 + shadow 计数 + n=1 效度限定（α′）

- **原问题**: Q6′ — 收敛成本首测的度量装置取形。α′ 双轨+锚定波定义+基线同口径+shadow+n=1 限定 / β 单轨 / γ 更细 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  - 主指标=捕获波次：正式定义=**"在同一语义锚定状态下、由同一次重捕获需要触发的全部 non-anchoring 捕获提交（无论几次工具运行、几件提交）"**——锚定外部语义事件，工具运行边界为主、提交间距仅退化回退；本轮沿用 t25 旧口径保基线可比（20+ 波），新口径计数作 shadow 指标并行记录
  - 诊断轨=每 claim 提交的新鲜度判定明细（首过/需重捕获/stale 留存分布）+ 总提交数——Goodhart 张力结构（波次不可单独成目标）
  - 效度限定（Runeson & Höst）：只主张机制可行性+方向性信号+成本结构定性刻画+仪表标定；不主张因果归因/泛化/稳态成本（过渡轮含迁移成本，混淆变量如实列）
  - 记录分层：事实文件（round-facts.json）载原始数据（波归属+claim 判定明细，非 claim 面允许 stale）；账本载度量定义决议+判定结论（走 claim 通道）；报告载效度声明+威胁清单+shadow 计数+基线对照表
- **显式约束/负向需求**:
  - γ 否决：stale-header 文件计数/claim 重试迭代=同问题更贵仪表，采集成本超首轮可解释信息量（推迟到双轨暴露盲区再启用）
  - 报告措辞=analytic generalization 非 statistical generalization + 威胁清单（单轮/无对照/过渡成本混入/聚类口径依赖人工边界）
  - 度量定义是新定义的首次显式声明——记账本，不得当既成惯例引用
- **状态**: current

## D-007 — 绿态语义：成分披露式销账 + 七字段关闭行 + 独立降级跟踪行（a′）

- **原问题**: Q7′ — defer-0070 在"降级绿"（corpus 4 门+rewrite-map UNVERIFIABLE、其余全真）下的销账处置：a′ 成分披露销账+独立跟踪行 / b 全真绿才销账 / c 其他。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**:
  (i) defer-0070 于首个 conclusion=success 的 origin/main run 销账（按注册条件字面执行，不改条件——红史账记事件终结）；
  (ii) 关闭行载七字段：run_id / conclusion / verifiable_composition（全真腿数+UNVERIFIABLE 腿 id 逐字清单）/ degradation_semantics（exit2 非阻断，引 ADR-0040 原文）/ degradation_cause（私有语料 secret 陈旧=human 动作项）/ successor_defer_id（新跟踪行 id+deadline）/ closure_rule_verbatim（销账条件原文+按字面执行声明）；
  (iii) deferred-registry 新开跟踪行挂"corpus 门公开面 UNVERIFIABLE 降级 pending secret 刷新"——owner=Xxx91n+deadline+D-003 的 N-run 升级钩落在此行；
  (iv) 登记等级区分：降级绿=黄级（销账但降级标记），非无保留绿——两本账分离（红史账/覆盖缺口账互不吞并）。
- **显式约束/负向需求**:
  - 禁事后改写销账条件（sysroot：悄悄改条件=false comfort 镜像）；若未来要"全真绿销账"须先修条件再执行
  - 降级态存在即预算消耗（SRE burn-rate 精神）——conclusion=success 不得记为零成本成功
  - UNVERIFIABLE 腿仍执行仍上传结果（quarantine 惯例：豁免不可隐身），显式登记态非 Skip
- **状态**: current

## D-008 — 复查触发器定参：双闸 OR + 强制裁决时刻

- **原问题**: Q8 — corpus 降级跟踪行的复查触发器形态：a 双闸 OR（review_at=2026-10-15 或连续 10 run）/ b 纯 run 计数 / c 纯日期 / d 其他。
- **原回答原文**: 「a」
- **规范化需求**:
  (i) 触发条件=`UNVERIFIABLE 连续 10 run` **或** `review_at=2026-10-15`，先到先触发（日期闸兜"久无人动"，run 闸兜"高频期降级惯性"）；
  (ii) 触发事件=**强制裁决时刻**——owner 三选一：刷新 secret / 正式接受永久降级 / 批准翻转为 fail；
  (iii) 首次真触发→按 D-003 预注册钩补立 ADR-0061 同款修订 ADR；
  (iv) 参数落在 deferred-registry 新跟踪行（D-007 successor_defer_id 所指行）。
- **显式约束/负向需求**:
  - 触发≠自动改语义——UNVERIFIABLE→fail 翻转是受保护语义变更，须过 owner 裁决
  - run 计数限"连续 UNVERIFIABLE"——间有真绿 run 则计数清零
- **状态**: current


## D-009 - convergence measurement: definitions + verdict (T-5 closeout record)

**Definitions (verbatim contract, decided before numbers were read):**

- *t25-legacy wave grouping*: every capture-battery invocation counts as one
  wave, whether or not its output is ever committed.
- *anchored capture event* (ADR-0085 refined): a capture event counts iff its
  files are committed inside a claim commit - only then do their
  captured-at-head headers constrain the claim-point floor.
- *anchored shadow*: a committed capture whose at-head is strictly older than
  the claim commit's floor anchor (would-be-stale evidence retained in the
  claim).
- *claim freshness outcome per claim commit*: first-pass (all its committed
  captures name at-head >= floor), recapture (some captures re-taken after a
  floor move), stale-retained (committed captures older than floor kept
  anyway - always a defect).

**Verdict (raw data in round-facts.json):** this round ran the battery 4
times (waves at 9c733e13, 74654ce8, e7285086, a1776dde); each of waves 1-3
surfaced a real red leg that drove the next fix commit - the machinery paid
for itself in diagnostics, not ceremony. Under the anchored definition,
exactly ONE capture event feeds the round's single claim commit (the
terminal wave at a1776dde), with 0 anchored shadows and a first-pass
freshness outcome. Total landed commits on the grill-t27 lane: 10
(incl. claim commit + SEAL + post-seal regen), plus 1 disclosed undone sweep
commit. n=1 single-round observation - measured, not generalized.
